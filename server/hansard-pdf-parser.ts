import { Mp } from '@shared/schema';
import { HansardSpeakerParser } from './hansard-speaker-parser';

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

interface ParsedHansard {
  metadata: HansardMetadata;
  attendance: AttendanceData;
  speakers: Array<{
    mpId: string;
    mpName: string;
    speakingOrder: number;
  }>;
  allSpeakingInstances: Array<{
    mpId: string;
    mpName: string;
    instanceNumber: number;
    lineNumber: number;
  }>;
  unmatchedSpeakers: string[];
  transcript: string;
  topics: string[];
}

export class HansardPdfParser {
  private allMps: Mp[];
  private speakerParser: HansardSpeakerParser;

  constructor(allMps: Mp[]) {
    this.allMps = allMps;
    this.speakerParser = new HansardSpeakerParser(allMps);
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
    const { speakers, allInstances, unmatched } = this.speakerParser.extractSpeakers(fullText);
    const topics = this.parseTopics(fullText);

    console.log('✅ Hansard parsing complete');
    console.log(`   - Session: ${metadata.sessionNumber}`);
    console.log(`   - Attended: ${attendance.attendedMpIds.length} MPs`);
    console.log(`   - Absent: ${attendance.absentMpIds.length} MPs`);
    console.log(`   - Speakers: ${speakers.length} unique MPs`);
    console.log(`   - All speaking instances: ${allInstances.length} total`);
    console.log(`   - Unmatched: ${unmatched.length} speakers`);

    return {
      metadata,
      attendance,
      speakers,
      allSpeakingInstances: allInstances,
      unmatchedSpeakers: unmatched,
      transcript: fullText.substring(0, 10000), // Store first 10k chars for transcript
      topics,
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

    // Extract parliament term
    const termMatch = text.match(/PARLIMEN\s+([A-Z\s]+)/i);
    const parliamentTerm = termMatch ? termMatch[1].trim() : 'Unknown';

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

  private parseAttendance(text: string): AttendanceData {
    const attendedConstituencies: string[] = [];
    const absentConstituencies: string[] = [];

    // Find "Ahli-Ahli Yang Hadir" section
    const attendedStart = text.indexOf('Ahli-Ahli Yang Hadir:');
    if (attendedStart !== -1) {
      const attendedEnd = Math.min(
        text.indexOf('Senator Yang Turut Hadir:', attendedStart) !== -1 
          ? text.indexOf('Senator Yang Turut Hadir:', attendedStart)
          : Number.MAX_SAFE_INTEGER,
        text.indexOf('Ahli-Ahli Yang Tidak Hadir:', attendedStart) !== -1
          ? text.indexOf('Ahli-Ahli Yang Tidak Hadir:', attendedStart)
          : Number.MAX_SAFE_INTEGER
      );
      const attendedSection = text.substring(attendedStart, attendedEnd === Number.MAX_SAFE_INTEGER ? undefined : attendedEnd);
      
      // Extract constituencies from entries like "Menteri..., Datuk ... (Constituency)"
      const constituencyRegex = /\(([A-Z][a-z\s]+(?:\s+[A-Z][a-z]+)*)\)/g;
      let match;
      while ((match = constituencyRegex.exec(attendedSection)) !== null) {
        const constituency = match[1].trim();
        if (constituency && !attendedConstituencies.includes(constituency)) {
          attendedConstituencies.push(constituency);
        }
      }
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
      const absentSection = text.substring(absentStart, absentEnd === Number.MAX_SAFE_INTEGER ? undefined : absentEnd);
      
      const constituencyRegex = /\(([A-Z][a-z\s]+(?:\s+[A-Z][a-z]+)*)\)/g;
      let match;
      while ((match = constituencyRegex.exec(absentSection)) !== null) {
        const constituency = match[1].trim();
        if (constituency && !absentConstituencies.includes(constituency)) {
          absentConstituencies.push(constituency);
        }
      }
    }

    // Match constituencies to MP IDs
    const attendedMpIds = this.allMps
      .filter(mp => attendedConstituencies.some(c => 
        this.normalizeConstituency(c) === this.normalizeConstituency(mp.constituency)
      ))
      .map(mp => mp.id);

    const absentMpIds = this.allMps
      .filter(mp => absentConstituencies.some(c => 
        this.normalizeConstituency(c) === this.normalizeConstituency(mp.constituency)
      ))
      .map(mp => mp.id);

    console.log(`📊 Attendance parsed:`);
    console.log(`   - Found ${attendedConstituencies.length} attended constituencies`);
    console.log(`   - Found ${absentConstituencies.length} absent constituencies`);
    console.log(`   - Matched ${attendedMpIds.length} attended MPs`);
    console.log(`   - Matched ${absentMpIds.length} absent MPs`);

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
      .replace(/[^a-z]/g, '');
  }
}
