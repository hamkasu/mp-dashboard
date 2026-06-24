/**
 * Copyright by Calmic Sdn Bhd
 */

import { Mp } from '@shared/schema';
import { HansardSpeakerParser } from './hansard-speaker-parser';
import { HansardSectionParser } from './hansard-section-parser';
import { HansardQuestionParser, ParsedQuestion } from './hansard-question-parser';
import { HansardBillMotionParser, ParsedBillOrMotion } from './hansard-bill-motion-parser';
import { normalizeParliamentTerm } from '../shared/utils';

interface HansardMetadata {
  sessionNumber: string;
  sessionDate: Date;
  parliamentTerm: string;
  sitting: string;
}

interface AttendanceData {
  attendedMpIds: string[];
  absentMpIds: string[];
  attendedConstituencies: string[];
  absentConstituencies: string[];
}

interface SpeakerStatistics {
  totalUniqueSpeakers: number;
  speakingMpIds: string[];
  speakingConstituencies: string[];
  constituenciesAttended: number;
  constituenciesSpoke: number;
  constituenciesAttendedButSilent: string[];
  attendanceRate: number; // % of attendees who spoke
}

interface ParsedHansard {
  metadata: HansardMetadata;
  attendance: AttendanceData;
  speakers: Array<{
    mpId: string;
    mpName: string;
    constituency: string;
    speakingOrder: number;
  }>;
  allSpeakingInstances: Array<{
    mpId: string;
    mpName: string;
    constituency: string;
    instanceNumber: number;
    lineNumber: number;
    headerPosition: number;
    headerLength: number;
    capturedHeader: string;
    speechText?: string;
  }>;
  speakerStats: SpeakerStatistics;
  unmatchedSpeakers: string[];
  unmatchedSpeakersDetailed: Array<{
    extractedName: string;
    extractedConstituency?: string;
    failureReason: string;
    rawHeaderText: string;
    suggestedMpIds: string[];
    speakingOrder: number;
  }>;
  transcript: string;
  topics: string[];
  questions: ParsedQuestion[];
  bills: ParsedBillOrMotion[];
  motions: ParsedBillOrMotion[];
}

export class HansardPdfParser {
  private allMps: Mp[];
  private speakerParser: HansardSpeakerParser;
  private sectionParser: HansardSectionParser;
  private questionParser: HansardQuestionParser;
  private billMotionParser: HansardBillMotionParser;

  constructor(allMps: Mp[]) {
    this.allMps = allMps;
    this.speakerParser = new HansardSpeakerParser(allMps);
    this.sectionParser = new HansardSectionParser();
    this.questionParser = new HansardQuestionParser(allMps);
    this.billMotionParser = new HansardBillMotionParser(allMps);
  }

  async parseHansardPdf(pdfBuffer: Buffer, filename?: string): Promise<ParsedHansard> {
    console.log('📄 Starting Hansard PDF parsing...');
    if (filename) {
      console.log(`📄 Filename: ${filename}`);
    }
    
    // Extract text from PDF using dynamic import
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    const fullText = result.text;
    
    console.log(`📄 Extracted ${fullText.length} characters from PDF`);

    // Parse all components
    const metadata = this.parseMetadata(fullText, filename);
    const attendance = this.parseAttendance(fullText);
    const { speakers, allInstances, unmatched, unmatchedDetailed } = this.speakerParser.extractSpeakers(fullText);
    const topics = this.parseTopics(fullText);

    // Calculate speaker statistics
    const speakerStats = this.calculateSpeakerStatistics(speakers, attendance);

    // Parse questions, bills, and motions
    const questions = this.parseQuestions(fullText);
    const bills = this.parseBills(fullText);
    const motions = this.parseMotions(fullText);

    console.log('✅ Hansard parsing complete');
    console.log(`   - Session: ${metadata.sessionNumber}`);
    console.log(`   - Attended: ${attendance.attendedMpIds.length} MPs`);
    console.log(`   - Absent: ${attendance.absentMpIds.length} MPs`);
    console.log(`   - Speakers: ${speakers.length} unique MPs`);
    console.log(`   - Speaking constituencies: ${speakerStats.speakingConstituencies.length}`);
    console.log(`   - Constituencies attended but silent: ${speakerStats.constituenciesAttendedButSilent.length}`);
    console.log(`   - Attendance rate: ${speakerStats.attendanceRate.toFixed(1)}%`);
    console.log(`   - All speaking instances: ${allInstances.length} total`);
    console.log(`   - Unmatched: ${unmatched.length} speakers`);
    console.log(`   - Questions: ${questions.length} total`);
    console.log(`   - Bills: ${bills.length} total`);
    console.log(`   - Motions: ${motions.length} total`);

    return {
      metadata,
      attendance,
      speakers,
      allSpeakingInstances: allInstances,
      speakerStats,
      unmatchedSpeakers: unmatched,
      unmatchedSpeakersDetailed: unmatchedDetailed,
      transcript: fullText.substring(0, 10000), // Store first 10k chars for transcript
      topics,
      questions,
      bills,
      motions,
    };
  }

  private calculateSpeakerStatistics(
    speakers: Array<{ mpId: string; mpName: string; constituency: string; speakingOrder: number }>,
    attendance: AttendanceData
  ): SpeakerStatistics {
    // Extract unique speaking MP IDs and constituencies (already normalized via MP lookup)
    const speakingMpIds = speakers.map(s => s.mpId);
    const speakingConstituenciesSet = new Set(speakers.map(s => s.constituency));
    const speakingConstituencies = Array.from(speakingConstituenciesSet);

    // Normalize attended constituencies to canonical MP names for accurate comparison
    // Map each raw PDF constituency string to its canonical MP constituency name
    const normalizedAttendedConstituencies = attendance.attendedConstituencies.map(rawConstituency => {
      const normalized = this.normalizeConstituency(rawConstituency);
      // Find MP with matching normalized constituency
      const mp = this.allMps.find(mp => 
        this.normalizeConstituency(mp.constituency) === normalized
      );
      // Return canonical MP constituency name if found, otherwise return normalized raw string
      return mp ? mp.constituency : rawConstituency.replace(/\s+/g, ' ').trim();
    });

    // Create normalized speaking constituencies set for fast lookup
    const normalizedSpeakingSet = new Set(
      speakingConstituencies.map(c => this.normalizeConstituency(c))
    );

    // Find constituencies that attended but didn't speak (using normalized comparison)
    const constituenciesAttendedButSilent = normalizedAttendedConstituencies.filter(
      constituency => !normalizedSpeakingSet.has(this.normalizeConstituency(constituency))
    );

    // Calculate participation rate
    const constituenciesAttended = normalizedAttendedConstituencies.length;
    const constituenciesSpoke = speakingConstituencies.length;
    const attendanceRate = constituenciesAttended > 0 
      ? (constituenciesSpoke / constituenciesAttended) * 100 
      : 0;

    return {
      totalUniqueSpeakers: speakers.length,
      speakingMpIds,
      speakingConstituencies,
      constituenciesAttended,
      constituenciesSpoke,
      constituenciesAttendedButSilent,
      attendanceRate
    };
  }

  private parseMetadata(text: string, filename?: string): HansardMetadata {
    let sessionNumber = '';
    let sessionDate = new Date();

    // PRIORITY 1: Extract date from filename (e.g., "DR-23102025.pdf" -> "DR.23.10.2025")
    if (filename) {
      const filenameMatch = filename.match(/DR-(\d{2})(\d{2})(\d{4})\.pdf/i);
      if (filenameMatch) {
        const [, day, month, year] = filenameMatch;
        sessionNumber = `DR.${day}.${month}.${year}`;
        sessionDate = new Date(`${year}-${month}-${day}`);
        console.log(`📅 Date from filename: ${sessionNumber}`);
      }
    }

    // FALLBACK: Extract from PDF content if filename didn't work
    if (!sessionNumber) {
      const sessionMatch = text.match(/(?:DR\.|Bil\.)\s*(\d+\.\d+\.\d+)/i);
      sessionNumber = sessionMatch 
        ? `DR.${sessionMatch[1]}` 
        : `DR.${new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}`;

      // Extract date from session number
      const dateMatch = sessionNumber.match(/(\d+)\.(\d+)\.(\d+)/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        sessionDate = new Date(`${year}-${month}-${day}`);
      }
      console.log(`📅 Date from PDF content: ${sessionNumber}`);
    }

    // Extract parliament term and normalize it to canonical format
    const termMatch = text.match(/PARLIMEN\s+([A-Z\s]+)/i);
    const rawParliamentTerm = termMatch ? termMatch[1].trim() : 'Unknown';
    const parliamentTerm = normalizeParliamentTerm(rawParliamentTerm);

    // Extract sitting info
    const sittingMatch = text.match(/PENGGAL\s+([^\n]+)/i);
    const sitting = sittingMatch ? sittingMatch[1].trim() : 'Unknown';

    return {
      sessionNumber,
      sessionDate,
      parliamentTerm,
      sitting,
    };
  }

  /**
   * Clean PDF-extracted section text for reliable regex matching.
   * PDF text extraction can insert page headers (e.g., "DR 5.2.2026  iii")
   * mid-entry when text spans page boundaries, breaking constituency
   * extraction regex.
   */
  private cleanSectionText(section: string): string {
    return section
      // Remove page headers like "DR 5.2.2026" or "DR.05.02.2026"
      .replace(/\bDR[\.\s]*\d+[\.\s]*\d+[\.\s]*\d+\b/gi, '')
      // Remove standalone Roman numeral page numbers (i, ii, iii, iv, v, etc.)
      .replace(/^\s*[ivxlcdm]+\s*$/gmi, '')
      // Replace Unicode smart quotes with ASCII equivalents
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      // Collapse newlines and multiple spaces to single space
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Extract constituency names from a section of the Hansard attendance list.
   * Uses entry-based parsing: splits on numbered entries (e.g., "1.", "2."),
   * then extracts the LAST parenthetical from each entry (the constituency).
   * This is resilient to page headers embedded mid-entry by PDF extraction.
   */
  private extractConstituenciesFromSection(section: string, excludeSpeaker: boolean = false): string[] {
    const constituencies: string[] = [];

    // Clean PDF artifacts (page headers, smart quotes, line breaks)
    const cleaned = this.cleanSectionText(section);

    // Remove Yang di-Pertua Dewan Rakyat (Speaker presides, not attending as MP)
    const text = excludeSpeaker
      ? cleaned.replace(/\d+\.\s*Yang di-Pertua Dewan Rakyat[^)]*\([^)]+\)/gi, '')
      : cleaned;

    // Split into individual numbered entries: "1. ...", "2. ...", etc.
    const entries = text.split(/(?=\d+\.\s+)/);

    for (const entry of entries) {
      if (!entry.trim() || !/^\d+\./.test(entry.trim())) continue;

      // Find ALL parenthetical groups in this entry using permissive [^)]+
      // This handles page headers embedded inside parens (digits, colons, etc.)
      const parens = [...entry.matchAll(/\(([^)]+)\)/g)];
      if (parens.length === 0) continue;

      // The LAST parenthetical is the constituency
      // (earlier ones may be ministerial portfolios like "(Undang-Undang dan Reformasi Institusi)")
      const rawConstituency = parens[parens.length - 1][1]
        .replace(/\s+/g, ' ')
        .trim();

      // Validate: must start with a letter and be a plausible constituency name
      if (rawConstituency && /^[A-Za-z]/.test(rawConstituency) && !constituencies.includes(rawConstituency)) {
        constituencies.push(rawConstituency);
      }
    }

    return constituencies;
  }

  private parseAttendance(text: string): AttendanceData {
    const attendedConstituencies: string[] = [];
    const absentConstituencies: string[] = [];

    // Find "Ahli-Ahli Yang Hadir" section
    const headerPos = text.indexOf('Ahli-Ahli Yang Hadir:');
    if (headerPos !== -1) {
      // PDF text extraction can place header text AFTER body entries from the same page.
      // E.g., entries 1-37 may appear BEFORE "Ahli-Ahli Yang Hadir:" in the extracted text,
      // with entries 38+ appearing after it. We need to scan backwards to find entries
      // that precede the header.
      let attendedStart = headerPos;
      const lookbackSize = 20000; // generous lookback for page 1 entries
      const textBefore = text.substring(Math.max(0, headerPos - lookbackSize), headerPos);
      // Find the first numbered entry (e.g., "1. Yang di-Pertua..." or "1. Perdana Menteri...")
      const firstEntryMatch = textBefore.match(/\b1\.\s+(?:Yang di-Pertua|Perdana|Menteri|Dato|Datuk|Tuan|Puan)/);
      if (firstEntryMatch && firstEntryMatch.index !== undefined) {
        attendedStart = Math.max(0, headerPos - lookbackSize) + firstEntryMatch.index;
        console.log(`📄 Attendance section: found ${headerPos - attendedStart} chars of entries before header (PDF extraction order issue)`);
      }

      const attendedEnd = Math.min(
        text.indexOf('Senator Yang Turut Hadir:', headerPos) !== -1
          ? text.indexOf('Senator Yang Turut Hadir:', headerPos)
          : Number.MAX_SAFE_INTEGER,
        text.indexOf('Ahli-Ahli Yang Tidak Hadir:', headerPos) !== -1
          ? text.indexOf('Ahli-Ahli Yang Tidak Hadir:', headerPos)
          : Number.MAX_SAFE_INTEGER
      );
      const rawAttendedSection = text.substring(attendedStart, attendedEnd === Number.MAX_SAFE_INTEGER ? undefined : attendedEnd);
      attendedConstituencies.push(...this.extractConstituenciesFromSection(rawAttendedSection, true));
    }

    // Find "Ahli-Ahli Yang Tidak Hadir" section
    const absentStart = text.indexOf('Ahli-Ahli Yang Tidak Hadir:');
    if (absentStart !== -1) {
      const absentEnd = Math.min(
        text.indexOf('PERTANYAAN', absentStart) !== -1
          ? text.indexOf('PERTANYAAN', absentStart)
          : Number.MAX_SAFE_INTEGER,
        text.indexOf('USUL:', absentStart) !== -1
          ? text.indexOf('USUL:', absentStart)
          : Number.MAX_SAFE_INTEGER,
        text.indexOf('RANG UNDANG-UNDANG', absentStart) !== -1
          ? text.indexOf('RANG UNDANG-UNDANG', absentStart)
          : Number.MAX_SAFE_INTEGER
      );
      const rawAbsentSection = text.substring(absentStart, absentEnd === Number.MAX_SAFE_INTEGER ? undefined : absentEnd);
      absentConstituencies.push(...this.extractConstituenciesFromSection(rawAbsentSection));
    }

    // Match constituencies to MP IDs
    const attendedMpIds = this.allMps
      .filter(mp => attendedConstituencies.some(c => 
        this.normalizeConstituency(c) === this.normalizeConstituency(mp.constituency)
      ))
      .map(mp => mp.id);

    const attendedSet = new Set(attendedMpIds);
    const absentMpIds = this.allMps
      .filter(mp => absentConstituencies.some(c =>
        this.normalizeConstituency(c) === this.normalizeConstituency(mp.constituency)
      ))
      .map(mp => mp.id)
      // Remove any MP that also appears in the attended list (PDF parsing overlap)
      .filter(id => !attendedSet.has(id));

    // Find unmatched constituencies for debugging
    const unmatchedAttended = attendedConstituencies.filter(c => 
      !this.allMps.some(mp => this.normalizeConstituency(c) === this.normalizeConstituency(mp.constituency))
    );
    const unmatchedAbsent = absentConstituencies.filter(c => 
      !this.allMps.some(mp => this.normalizeConstituency(c) === this.normalizeConstituency(mp.constituency))
    );

    // Detect overlap between attended and absent constituency lists from PDF
    const overlappingConstituencies = attendedConstituencies.filter(c =>
      absentConstituencies.some(a => this.normalizeConstituency(c) === this.normalizeConstituency(a))
    );

    console.log(`📊 Attendance parsed:`);
    console.log(`   - Found ${attendedConstituencies.length} attended constituencies`);
    console.log(`   - Found ${absentConstituencies.length} absent constituencies`);
    console.log(`   - Matched ${attendedMpIds.length} attended MPs`);
    console.log(`   - Matched ${absentMpIds.length} absent MPs`);
    if (overlappingConstituencies.length > 0) {
      console.log(`   - ⚠️ Overlap detected (resolved to attended): ${overlappingConstituencies.join(', ')}`);
    }
    if (unmatchedAttended.length > 0) {
      console.log(`   - ⚠️ Unmatched attended constituencies: ${unmatchedAttended.slice(0, 10).join(', ')}${unmatchedAttended.length > 10 ? '...' : ''}`);
    }
    if (unmatchedAbsent.length > 0) {
      console.log(`   - ⚠️ Unmatched absent constituencies: ${unmatchedAbsent.slice(0, 10).join(', ')}${unmatchedAbsent.length > 10 ? '...' : ''}`);
    }

    return {
      attendedMpIds,
      absentMpIds,
      attendedConstituencies,
      absentConstituencies,
    };
  }

  private parseTopics(text: string): string[] {
    const topics: string[] = [];

    // Extract from KANDUNGAN (table of contents)
    const kandunganStart = text.indexOf('KANDUNGAN');
    if (kandunganStart !== -1) {
      const kandunganEnd = Math.min(
        text.indexOf('KEHADIRAN', kandunganStart) !== -1 
          ? text.indexOf('KEHADIRAN', kandunganStart)
          : Number.MAX_SAFE_INTEGER,
        text.indexOf('DR.', kandunganStart) !== -1
          ? text.indexOf('DR.', kandunganStart)
          : Number.MAX_SAFE_INTEGER
      );
      const kandunganSection = text.substring(kandunganStart, kandunganEnd === Number.MAX_SAFE_INTEGER ? undefined : kandunganEnd);
      
      // Extract main topics (usually in caps or after line breaks)
      const topicRegex = /^([A-Z][A-Z\s\-]+):/gm;
      let match;
      while ((match = topicRegex.exec(kandunganSection)) !== null) {
        const topic = match[1].trim();
        if (topic.length > 3 && !topics.includes(topic)) {
          topics.push(topic);
        }
      }
    }

    // Look for common patterns
    const commonTopics = [
      'Supply Bill', 'Development Budget', 'Question Time',
      'Motion', 'Adjournment', 'Committee Stage'
    ];

    for (const topic of commonTopics) {
      if (text.toLowerCase().includes(topic.toLowerCase()) && !topics.includes(topic)) {
        topics.push(topic);
      }
    }

    return topics.slice(0, 10); // Limit to 10 topics
  }

  private normalizeConstituency(constituency: string): string {
    return constituency
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[\-'\.]/g, '')  // Remove hyphens, apostrophes, and periods
      .replace(/[^a-z]/g, '');
  }

  private parseQuestions(fullText: string): ParsedQuestion[] {
    const allQuestions: ParsedQuestion[] = [];
    
    const questionSections = this.sectionParser.extractQuestionsSections(fullText);
    
    for (const section of questionSections) {
      let questionType: 'oral' | 'written' | 'minister' = 'oral';
      if (section.type === 'questions_written') {
        questionType = 'written';
      } else if (section.type === 'questions_minister') {
        questionType = 'minister';
      }
      
      const questions = this.questionParser.parseQuestions(section.content, questionType);
      allQuestions.push(...questions);
    }
    
    return allQuestions;
  }

  private parseBills(fullText: string): ParsedBillOrMotion[] {
    const allBills: ParsedBillOrMotion[] = [];
    
    const billSections = this.sectionParser.extractBillsSections(fullText);
    
    for (const section of billSections) {
      const bills = this.billMotionParser.parseBills(section.content);
      allBills.push(...bills);
    }
    
    return allBills;
  }

  private parseMotions(fullText: string): ParsedBillOrMotion[] {
    const allMotions: ParsedBillOrMotion[] = [];
    
    const motionSections = this.sectionParser.extractMotionsSections(fullText);
    
    for (const section of motionSections) {
      const motions = this.billMotionParser.parseMotions(section.content);
      allMotions.push(...motions);
    }
    
    return allMotions;
  }
}
