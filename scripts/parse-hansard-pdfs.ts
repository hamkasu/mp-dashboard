import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { mps, parliamentaryQuestions, legislativeProposals, hansardRecords } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
const pdfParse = PDFParse;

interface TOCSection {
  title: string;
  startPage: number;
  endPage?: number;
}

interface ParsedQuestion {
  questionNumber: string;
  questionType: 'oral' | 'ministerial' | 'written';
  questionText: string;
  askerName?: string;
  ministry?: string;
  dateAsked: Date;
  hansardReference: string;
}

interface ParsedBill {
  billNumber: string;
  title: string;
  sponsorName?: string;
  dateProposed: Date;
  hansardReference: string;
}

interface MPAttendance {
  name: string;
  constituency: string;
  role?: string;
}

interface HansardParseResult {
  filename: string;
  sessionDate: Date;
  sessionNumber: string;
  toc: TOCSection[];
  attendance: MPAttendance[];
  oralQuestions: ParsedQuestion[];
  ministerialQuestions: ParsedQuestion[];
  bills: ParsedBill[];
  totalPages: number;
}

class HansardPDFParser {
  private pdfDirectory: string;
  private mpCache: Map<string, any> = new Map();
  
  constructor(pdfDirectory: string) {
    this.pdfDirectory = pdfDirectory;
  }

  async initialize() {
    // Load all MPs into cache for faster name matching
    const allMps = await db.select().from(mps);
    console.log(`Loaded ${allMps.length} MPs into cache`);
    
    for (const mp of allMps) {
      this.mpCache.set(mp.name.toLowerCase().trim(), mp);
      // Also cache by constituency
      this.mpCache.set(`${mp.name.toLowerCase().trim()}|${mp.constituency.toLowerCase().trim()}`, mp);
    }
  }

  async parseAllPDFs(): Promise<HansardParseResult[]> {
    const files = fs.readdirSync(this.pdfDirectory)
      .filter(f => f.startsWith('DR-') && f.endsWith('.pdf'))
      .sort();
    
    console.log(`Found ${files.length} Hansard PDF files to parse`);
    
    const results: HansardParseResult[] = [];
    
    for (const file of files) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Parsing: ${file}`);
        console.log('='.repeat(60));
        
        const result = await this.parseSinglePDF(file);
        results.push(result);
        
        console.log(`✓ Parsed ${file}:`);
        console.log(`  - Oral Questions: ${result.oralQuestions.length}`);
        console.log(`  - Ministerial Questions: ${result.ministerialQuestions.length}`);
        console.log(`  - Bills: ${result.bills.length}`);
        console.log(`  - Attendance: ${result.attendance.length}`);
      } catch (error) {
        console.error(`✗ Error parsing ${file}:`, error);
      }
    }
    
    return results;
  }

  private async parseSinglePDF(filename: string): Promise<HansardParseResult> {
    const filePath = path.join(this.pdfDirectory, filename);
    const dataBuffer = fs.readFileSync(filePath);
    
    // Use pdf-parse v2+ API
    const parser = new pdfParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    await parser.destroy();
    
    const text = pdfData.text;
    const totalPages = pdfData.total || 0;
    
    // Extract session information from filename and content
    const sessionInfo = this.extractSessionInfo(filename, text);
    
    // Parse Table of Contents
    const toc = this.parseTableOfContents(text);
    
    // Parse attendance list
    const attendance = this.parseAttendance(text);
    
    // Parse sections based on TOC
    const oralQuestions = this.parseOralQuestions(text, toc, sessionInfo);
    const ministerialQuestions = this.parseMinisterialQuestions(text, toc, sessionInfo);
    const bills = this.parseBills(text, toc, sessionInfo);
    
    return {
      filename,
      sessionDate: sessionInfo.date,
      sessionNumber: sessionInfo.number,
      toc,
      attendance,
      oralQuestions,
      ministerialQuestions,
      bills,
      totalPages
    };
  }

  private extractSessionInfo(filename: string, text: string): { date: Date; number: string } {
    // Extract date from filename: DR-13112025 -> 13/11/2025
    const dateMatch = filename.match(/DR-(\d{2})(\d{2})(\d{4})/);
    let date = new Date();
    
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      date = new Date(`${year}-${month}-${day}`);
    }
    
    // Extract session number from text (Bil. XX)
    const sessionMatch = text.match(/Bil\.\s+(\d+)/);
    const sessionNumber = sessionMatch ? sessionMatch[1] : 'Unknown';
    
    return { date, number: sessionNumber };
  }

  private parseTableOfContents(text: string): TOCSection[] {
    const sections: TOCSection[] = [];
    
    // Find KANDUNGAN section
    const kandunganMatch = text.match(/KANDUNGAN[\s\S]*?(?=KEHADIRAN|DR\.\s+\d{2}\.\d{2}\.\d{4})/i);
    if (!kandunganMatch) {
      console.warn('  ⚠ Could not find KANDUNGAN section');
      return sections;
    }
    
    const kandunganText = kandunganMatch[0];
    
    // Parse section lines with page numbers
    const sectionPattern = /([A-Z][A-Z\-\s]+?)(?:\s+\(Halaman\s+(\d+)\))/g;
    let match;
    
    while ((match = sectionPattern.exec(kandunganText)) !== null) {
      const title = match[1].trim();
      const startPage = parseInt(match[2]);
      
      sections.push({ title, startPage });
    }
    
    // Set end pages
    for (let i = 0; i < sections.length - 1; i++) {
      sections[i].endPage = sections[i + 1].startPage - 1;
    }
    
    return sections;
  }

  private parseAttendance(text: string): MPAttendance[] {
    const attendanceList: MPAttendance[] = [];
    
    // Find attendance section
    const attendanceMatch = text.match(/KEHADIRAN AHLI-AHLI PARLIMEN[\s\S]*?Ahli-Ahli Yang Hadir:([\s\S]*?)(?:Senator Yang Turut Hadir:|Ahli-Ahli Yang Tidak Hadir:)/i);
    if (!attendanceMatch) {
      console.warn('  ⚠ Could not find attendance section');
      return attendanceList;
    }
    
    const attendanceText = attendanceMatch[1];
    
    // Parse each MP line: "1. Name (Constituency)"
    const mpPattern = /\d+\.\s+(?:Yang di-Pertua.*?|Perdana Menteri.*?|Menteri.*?|Timbalan.*?|Dato.*?|Datuk.*?|Puan.*?|Tuan.*?|Dr\.|Ir\.|Kapten.*?|Komander.*?)?([^(]+?)\s+\(([^)]+)\)/g;
    let match;
    
    while ((match = mpPattern.exec(attendanceText)) !== null) {
      let name = match[1].trim();
      const constituency = match[2].trim();
      
      // Clean up the name
      name = name.replace(/^(Yang di-Pertua.*?|Perdana Menteri.*?|Menteri.*?|Timbalan.*?),?\s*/i, '');
      name = name.replace(/,?\s*(Dato.*?|Datuk.*?|Puan|Tuan|Dr\.|Ir\.|Kapten|Komander)\s+/g, '');
      
      if (name && constituency) {
        attendanceList.push({ name, constituency });
      }
    }
    
    return attendanceList;
  }

  private parseOralQuestions(text: string, toc: TOCSection[], sessionInfo: { date: Date; number: string }): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];
    
    // Find oral questions section from TOC
    const section = toc.find(s => s.title.includes('PERTANYAAN-PERTANYAAN BAGI JAWAB LISAN'));
    if (!section) {
      return questions;
    }
    
    // Extract section text (basic implementation)
    const sectionPattern = new RegExp(`PERTANYAAN-PERTANYAAN BAGI JAWAB LISAN[\\s\\S]*?(?=RANG UNDANG-UNDANG|USUL:|$)`, 'i');
    const sectionMatch = text.match(sectionPattern);
    
    if (!sectionMatch) {
      return questions;
    }
    
    const sectionText = sectionMatch[0];
    
    // Parse question numbers - look for patterns like "Soalan No. 1" or just numbered sections
    const questionPattern = /(?:Soalan\s+No\.\s*(\d+)|^\s*(\d+)\.\s+)/gm;
    let match;
    let questionCount = 0;
    
    while ((match = questionPattern.exec(sectionText)) !== null && questionCount < 50) {
      const questionNumber = match[1] || match[2];
      
      questions.push({
        questionNumber: questionNumber || `Q${questionCount + 1}`,
        questionType: 'oral',
        questionText: 'Extracted from Hansard oral questions section',
        ministry: 'To be determined',
        dateAsked: sessionInfo.date,
        hansardReference: `DR-${sessionInfo.number}`
      });
      
      questionCount++;
    }
    
    return questions;
  }

  private parseMinisterialQuestions(text: string, toc: TOCSection[], sessionInfo: { date: Date; number: string }): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];
    
    // Find ministerial questions section from TOC
    const section = toc.find(s => s.title.includes('WAKTU PERTANYAAN-PERTANYAAN MENTERI'));
    if (!section) {
      return questions;
    }
    
    // Extract section text
    const sectionPattern = new RegExp(`WAKTU PERTANYAAN-PERTANYAAN MENTERI[\\s\\S]*?(?=PERTANYAAN-PERTANYAAN BAGI JAWAB LISAN|USUL:|$)`, 'i');
    const sectionMatch = text.match(sectionPattern);
    
    if (!sectionMatch) {
      return questions;
    }
    
    const sectionText = sectionMatch[0];
    
    // Parse question numbers
    const questionPattern = /(?:Soalan\s+No\.\s*(\d+)|^\s*(\d+)\.\s+)/gm;
    let match;
    let questionCount = 0;
    
    while ((match = questionPattern.exec(sectionText)) !== null && questionCount < 50) {
      const questionNumber = match[1] || match[2];
      
      questions.push({
        questionNumber: questionNumber || `MQ${questionCount + 1}`,
        questionType: 'ministerial',
        questionText: 'Extracted from Hansard ministerial questions section',
        ministry: 'To be determined',
        dateAsked: sessionInfo.date,
        hansardReference: `DR-${sessionInfo.number}`
      });
      
      questionCount++;
    }
    
    return questions;
  }

  private parseBills(text: string, toc: TOCSection[], sessionInfo: { date: Date; number: string }): ParsedBill[] {
    const bills: ParsedBill[] = [];
    
    // Find bills section from TOC
    const section = toc.find(s => s.title.includes('RANG UNDANG-UNDANG'));
    if (!section) {
      return bills;
    }
    
    // Extract section text
    const sectionPattern = new RegExp(`RANG UNDANG-UNDANG:[\\s\\S]*?(?=USUL:|Jawatankuasa:|$)`, 'i');
    const sectionMatch = text.match(sectionPattern);
    
    if (!sectionMatch) {
      return bills;
    }
    
    const sectionText = sectionMatch[0];
    
    // Parse bill entries - look for "Rang Undang-undang XXXX YYYY"
    const billPattern = /Rang\s+Undang-undang\s+([^\n]+?)(?:\s+\(Halaman|\n|$)/gi;
    let match;
    
    while ((match = billPattern.exec(sectionText)) !== null) {
      const billTitle = match[1].trim();
      
      // Extract year if present
      const yearMatch = billTitle.match(/\b(20\d{2})\b/);
      const billNumber = yearMatch ? `RUU-${yearMatch[1]}` : `RUU-${sessionInfo.number}`;
      
      bills.push({
        billNumber,
        title: billTitle,
        dateProposed: sessionInfo.date,
        hansardReference: `DR-${sessionInfo.number}`
      });
    }
    
    return bills;
  }

  private findMPByName(name: string, constituency?: string): any | null {
    // Try exact match first
    const exactMatch = this.mpCache.get(name.toLowerCase().trim());
    if (exactMatch) return exactMatch;
    
    // Try with constituency
    if (constituency) {
      const constituencyMatch = this.mpCache.get(`${name.toLowerCase().trim()}|${constituency.toLowerCase().trim()}`);
      if (constituencyMatch) return constituencyMatch;
    }
    
    // Try fuzzy matching (remove titles, clean name)
    const cleanName = name
      .replace(/^(Dato|Datuk|Puan|Tuan|Dr\.|Ir\.|Haji|Hajah)\s+/gi, '')
      .replace(/\s+(bin|binti|a\/l|a\/p)\s+/gi, ' ')
      .toLowerCase()
      .trim();
    
    for (const [key, mp] of this.mpCache) {
      const mpCleanName = mp.name
        .replace(/^(Dato|Datuk|Puan|Tuan|Dr\.|Ir\.|Haji|Hajah)\s+/gi, '')
        .replace(/\s+(bin|binti|a\/l|a\/p)\s+/gi, ' ')
        .toLowerCase()
        .trim();
      
      if (mpCleanName.includes(cleanName) || cleanName.includes(mpCleanName)) {
        return mp;
      }
    }
    
    return null;
  }

  async populateDatabase(results: HansardParseResult[]) {
    console.log('\n' + '='.repeat(60));
    console.log('POPULATING DATABASE');
    console.log('='.repeat(60));
    
    let totalQuestionsInserted = 0;
    let totalBillsInserted = 0;
    let unmatchedMPs = new Set<string>();
    
    for (const result of results) {
      console.log(`\nProcessing: ${result.filename}`);
      
      // Process oral questions
      for (const question of result.oralQuestions) {
        const mp = question.askerName ? this.findMPByName(question.askerName) : null;
        
        if (!mp) {
          unmatchedMPs.add(question.askerName || 'Unknown');
          continue;
        }
        
        try {
          await db.insert(parliamentaryQuestions).values({
            mpId: mp.id,
            questionText: question.questionText,
            dateAsked: question.dateAsked,
            ministry: question.ministry || 'Unknown',
            topic: 'Parliamentary Question',
            answerStatus: 'Pending',
            hansardReference: question.hansardReference,
            questionType: question.questionType,
            questionNumber: question.questionNumber
          });
          
          totalQuestionsInserted++;
        } catch (error: any) {
          if (!error.message.includes('duplicate key')) {
            console.error(`  ✗ Error inserting question:`, error.message);
          }
        }
      }
      
      // Process ministerial questions
      for (const question of result.ministerialQuestions) {
        const mp = question.askerName ? this.findMPByName(question.askerName) : null;
        
        if (!mp) {
          unmatchedMPs.add(question.askerName || 'Unknown');
          continue;
        }
        
        try {
          await db.insert(parliamentaryQuestions).values({
            mpId: mp.id,
            questionText: question.questionText,
            dateAsked: question.dateAsked,
            ministry: question.ministry || 'Unknown',
            topic: 'Ministerial Question',
            answerStatus: 'Pending',
            hansardReference: question.hansardReference,
            questionType: question.questionType,
            questionNumber: question.questionNumber
          });
          
          totalQuestionsInserted++;
        } catch (error: any) {
          if (!error.message.includes('duplicate key')) {
            console.error(`  ✗ Error inserting ministerial question:`, error.message);
          }
        }
      }
      
      // Process bills
      for (const bill of result.bills) {
        const mp = bill.sponsorName ? this.findMPByName(bill.sponsorName) : null;
        
        if (!mp) {
          // For bills without identified sponsors, skip for now
          continue;
        }
        
        try {
          await db.insert(legislativeProposals).values({
            mpId: mp.id,
            title: bill.title,
            type: 'Bill',
            dateProposed: bill.dateProposed,
            status: 'Proposed',
            description: `Bill extracted from ${bill.hansardReference}`,
            hansardReference: bill.hansardReference,
            billNumber: bill.billNumber
          });
          
          totalBillsInserted++;
        } catch (error: any) {
          if (!error.message.includes('duplicate key')) {
            console.error(`  ✗ Error inserting bill:`, error.message);
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Questions Inserted: ${totalQuestionsInserted}`);
    console.log(`Total Bills Inserted: ${totalBillsInserted}`);
    console.log(`Unmatched MP Names: ${unmatchedMPs.size}`);
    
    if (unmatchedMPs.size > 0 && unmatchedMPs.size < 20) {
      console.log('\nUnmatched MPs:');
      for (const name of unmatchedMPs) {
        console.log(`  - ${name}`);
      }
    }
  }

  async generateReport(results: HansardParseResult[]) {
    console.log('\n' + '='.repeat(60));
    console.log('HANSARD PARSING REPORT');
    console.log('='.repeat(60));
    
    const totalOralQuestions = results.reduce((sum, r) => sum + r.oralQuestions.length, 0);
    const totalMinisterialQuestions = results.reduce((sum, r) => sum + r.ministerialQuestions.length, 0);
    const totalBills = results.reduce((sum, r) => sum + r.bills.length, 0);
    const totalAttendance = results.reduce((sum, r) => sum + r.attendance.length, 0);
    
    console.log(`\nPDFs Processed: ${results.length}`);
    console.log(`Total Oral Questions Found: ${totalOralQuestions}`);
    console.log(`Total Ministerial Questions Found: ${totalMinisterialQuestions}`);
    console.log(`Total Bills Found: ${totalBills}`);
    console.log(`Average Attendance per Session: ${Math.round(totalAttendance / results.length)}`);
    
    // Sessions by month
    const sessionsByMonth = new Map<string, number>();
    for (const result of results) {
      const month = result.sessionDate.toISOString().slice(0, 7);
      sessionsByMonth.set(month, (sessionsByMonth.get(month) || 0) + 1);
    }
    
    console.log('\nSessions by Month:');
    for (const [month, count] of Array.from(sessionsByMonth).sort()) {
      console.log(`  ${month}: ${count} sessions`);
    }
  }
}

// Main execution
async function main() {
  console.log('Malaysian Parliament Hansard PDF Parser');
  console.log('=' .repeat(60));
  
  const parser = new HansardPDFParser(path.join(process.cwd(), 'attached_assets'));
  
  try {
    // Initialize MP cache
    await parser.initialize();
    
    // Parse all PDFs
    const results = await parser.parseAllPDFs();
    
    // Generate report
    await parser.generateReport(results);
    
    // Populate database
    await parser.populateDatabase(results);
    
    console.log('\n✓ Parsing complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
  }
}

main();
