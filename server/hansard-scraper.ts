import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { PDFParse } from 'pdf-parse';

// SECURITY NOTE: The Malaysian Parliament website (parlimen.gov.my) has SSL certificate
// validation issues in some environments. Since we are ONLY READING public government data
// (not transmitting sensitive information), we disable certificate validation for this
// specific scraper. This is acceptable because:
// 1. We're only downloading publicly available PDFs and HTML
// 2. No user data or credentials are being transmitted
// 3. The data is already public on the parliament website
// DO NOT use this pattern when sending sensitive data or user credentials.
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

interface HansardMetadata {
  sessionNumber: string;
  sessionDate: Date;
  parliamentTerm: string;
  sitting: string;
  pdfUrl: string;
}

export interface AttendanceData {
  attendedNames: string[];
  absentNames: string[];
}

export class HansardScraper {
  private readonly baseUrl = 'https://www.parlimen.gov.my';
  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  async getHansardListForParliament15(maxRecords: number = 100): Promise<HansardMetadata[]> {
    const allHansards: Map<string, HansardMetadata> = new Map();
    let pageNum = 1;
    
    try {
      while (allHansards.size < maxRecords) {
        const url = pageNum === 1 
          ? `${this.baseUrl}/hansard-dewan-rakyat.html?uweb=dr&lang=bm&arkib=yes`
          : `${this.baseUrl}/hansard-dewan-rakyat.html?uweb=dr&lang=bm&arkib=yes&page=${pageNum}`;
        
        console.log(`Fetching page ${pageNum}...`);
        const response = await axios.get(url, { headers: this.headers, timeout: 30000, httpsAgent });
        const $ = cheerio.load(response.data);
        let pageCount = 0;
        
        $('a[href*=".pdf"], a[onclick*=".pdf"]').each((_, element) => {
          const $el = $(element);
          let pdfUrl = '';
          
          // Try to get from href
          let href = $el.attr('href');
          
          // If href is javascript, try to extract from onclick
          if (href && href.startsWith('javascript:')) {
            const onclick = $el.attr('onclick') || href;
            const match = onclick.match(/['"](\/files\/[^'"]+\.pdf)['"]/);
            if (match) {
              pdfUrl = `${this.baseUrl}${match[1]}`;
            }
          } else if (href && href.includes('.pdf')) {
            pdfUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
          }
          
          if (pdfUrl) {
            const text = $el.text().trim();
            const dateMatch = text.match(/(\d{1,2})\s+([\w]+)\s+(\d{4})/);
            if (dateMatch) {
              const sessionDate = this.parseMalayDate(text);
              if (sessionDate) {
                const sessionNumber = `DR.${sessionDate.getDate()}.${sessionDate.getMonth() + 1}.${sessionDate.getFullYear()}`;
                
                // Use session number as key to deduplicate (each date should have one record)
                if (!allHansards.has(sessionNumber)) {
                  allHansards.set(sessionNumber, {
                    sessionNumber,
                    sessionDate,
                    parliamentTerm: '15th Parliament',
                    sitting: this.determineSitting(sessionDate),
                    pdfUrl
                  });
                  pageCount++;
                }
              }
            }
          }
        });
        
        if (pageCount === 0) {
          console.log(`No more new records on page ${pageNum}`);
          break;
        }
        
        console.log(`Found ${pageCount} unique records on page ${pageNum} (total unique: ${allHansards.size})`);
        
        if (allHansards.size >= maxRecords) {
          break;
        }
        
        pageNum++;
        await this.delay(2000);
      }
      
      return Array.from(allHansards.values());
    } catch (error) {
      console.error('Error fetching Hansard list:', error);
      return Array.from(allHansards.values());
    }
  }

  async downloadAndExtractPdf(pdfUrl: string): Promise<string | null> {
    try {
      await this.delay(2000);
      
      const response = await axios.get(pdfUrl, {
        responseType: 'arraybuffer',
        headers: this.headers,
        timeout: 30000,
        httpsAgent
      });
      
      const pdfBuffer = Buffer.from(response.data);
      
      const parser = new PDFParse({ data: pdfBuffer });
      const result = await parser.getText();
      
      return result.text;
    } catch (error) {
      console.error(`Error downloading/extracting PDF ${pdfUrl}:`, error);
      return null;
    }
  }

  private parseMalayDate(dateStr: string): Date | null {
    const monthMap: { [key: string]: number } = {
      'januari': 0, 'februari': 1, 'mac': 2, 'april': 3,
      'mei': 4, 'jun': 5, 'julai': 6, 'ogos': 7,
      'september': 8, 'oktober': 9, 'november': 10, 'disember': 11
    };

    const match = dateStr.toLowerCase().match(/(\d{1,2})\s+(januari|februari|mac|april|mei|jun|julai|ogos|september|oktober|november|disember)\s+(\d{4})/);
    
    if (match) {
      const day = parseInt(match[1]);
      const month = monthMap[match[2]];
      const year = parseInt(match[3]);
      return new Date(year, month, day);
    }
    
    return null;
  }

  private determineSitting(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    if (year === 2025) {
      if (month >= 9) return 'Third Session';
      if (month >= 5) return 'Second Session';
      return 'First Session';
    }
    if (year === 2024) {
      if (month >= 9) return 'Third Session';
      if (month >= 5) return 'Second Session';
      return 'First Session';
    }
    
    return 'Regular Session';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  extractAttendanceFromText(pdfText: string): AttendanceData {
    const attendedNames: string[] = [];
    const absentNames: string[] = [];

    const normalizedText = pdfText.replace(/[ \t]+/g, ' ');
    
    const attendancePattern = /KEHADIRAN\s+AHLI[-\s]AHLI\s+PARLIMEN/i;
    const absentPattern = /Ahli[-\s]Ahli\s+Yang\s+Tidak\s+Hadir\s*:?/i;
    
    const attendanceMatch = normalizedText.match(attendancePattern);
    const absentMatch = normalizedText.match(absentPattern);

    if (attendanceMatch && attendanceMatch.index !== undefined) {
      const startIdx = attendanceMatch.index + attendanceMatch[0].length;
      let endIdx = normalizedText.length;
      
      if (absentMatch && absentMatch.index !== undefined && absentMatch.index > startIdx) {
        endIdx = absentMatch.index;
      } else {
        const nextSectionMatch = normalizedText.substring(startIdx).match(/\n\s*\n\s*[A-Z][A-Z]/);
        if (nextSectionMatch && nextSectionMatch.index !== undefined) {
          endIdx = startIdx + nextSectionMatch.index;
        } else {
          endIdx = Math.min(startIdx + 20000, normalizedText.length);
        }
      }
      
      const attendanceSection = normalizedText.substring(startIdx, endIdx);
      const extractedAttended = this.extractNamesFromSection(attendanceSection);
      attendedNames.push(...extractedAttended);
    }

    if (absentMatch && absentMatch.index !== undefined) {
      const startIdx = absentMatch.index + absentMatch[0].length;
      const nextSectionMatch = normalizedText.substring(startIdx).match(/\n\s*\n\s*[A-Z][A-Z]/);
      const endIdx = nextSectionMatch && nextSectionMatch.index !== undefined 
        ? startIdx + nextSectionMatch.index 
        : Math.min(startIdx + 10000, normalizedText.length);
      
      const absentSection = normalizedText.substring(startIdx, endIdx);
      const extractedAbsent = this.extractNamesFromSection(absentSection);
      absentNames.push(...extractedAbsent);
    }

    return { attendedNames, absentNames };
  }

  private extractNamesFromSection(sectionText: string): string[] {
    const names: string[] = [];
    const lines = sectionText.split('\n');
    
    for (const line of lines) {
      let trimmed = line.trim();
      if (!trimmed || trimmed.length < 5) continue;
      
      trimmed = trimmed
        .replace(/^\d+\.\s*/, '')
        .replace(/\s*\([^)]*\)\s*/g, '')
        .replace(/\s*\[[^\]]*\]\s*/g, '')
        .replace(/,.*$/, '')
        .trim();
      
      if (trimmed.length > 3 && trimmed.match(/^[A-Z]/i) && trimmed.match(/[a-z]/i)) {
        names.push(trimmed);
      }
    }
    
    return names;
  }
}
