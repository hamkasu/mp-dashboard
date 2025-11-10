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

export interface ConstituencyAttendanceData {
  absentConstituencies: string[];
}

export interface ConstituencyAttendanceCounts {
  constituenciesPresent: number;
  constituenciesAbsent: number;
  constituenciesAbsentRule91: number;
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
      
      console.log(`  Downloading PDF from: ${pdfUrl}`);
      const response = await axios.get(pdfUrl, {
        responseType: 'arraybuffer',
        headers: this.headers,
        timeout: 30000,
        httpsAgent
      });
      
      console.log(`  PDF downloaded, size: ${response.data.byteLength} bytes`);
      const pdfBuffer = Buffer.from(response.data);
      
      console.log(`  Parsing PDF...`);
      const parser = new PDFParse({ data: pdfBuffer });
      const result = await parser.getText();
      
      console.log(`  Extracted ${result.text.length} characters`);
      return result.text;
    } catch (error: any) {
      if (error.response) {
        console.error(`  ✗ HTTP Error ${error.response.status} for ${pdfUrl}`);
        console.error(`  Response headers:`, error.response.headers);
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        console.error(`  ✗ Timeout downloading PDF: ${pdfUrl}`);
      } else {
        console.error(`  ✗ Error downloading/extracting PDF ${pdfUrl}:`, error.message);
      }
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
    const absentPattern = /Ahli[-\s]Ahli\s+Yang\s+Tidak\s+Hadir\s*:?/gi;
    
    const attendanceMatch = normalizedText.match(attendancePattern);

    if (attendanceMatch && attendanceMatch.index !== undefined) {
      const startIdx = attendanceMatch.index + attendanceMatch[0].length;
      let endIdx = normalizedText.length;
      
      const firstAbsentMatch = normalizedText.substring(startIdx).match(/Ahli[-\s]Ahli\s+Yang\s+Tidak\s+Hadir\s*:?/i);
      if (firstAbsentMatch && firstAbsentMatch.index !== undefined) {
        endIdx = startIdx + firstAbsentMatch.index;
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

    let match;
    while ((match = absentPattern.exec(normalizedText)) !== null) {
      const startIdx = match.index + match[0].length;
      
      const remainingText = normalizedText.substring(startIdx);
      const nextAbsentMatch = remainingText.match(/Ahli[-\s]Ahli\s+Yang\s+Tidak\s+Hadir/i);
      const nextMajorSectionMatch = remainingText.match(/\n\s*\n\s*[A-Z][A-Z][A-Z]/);
      
      let endIdx;
      if (nextAbsentMatch && nextAbsentMatch.index !== undefined) {
        endIdx = startIdx + nextAbsentMatch.index;
      } else if (nextMajorSectionMatch && nextMajorSectionMatch.index !== undefined) {
        endIdx = startIdx + nextMajorSectionMatch.index;
      } else {
        endIdx = Math.min(startIdx + 10000, normalizedText.length);
      }
      
      const absentSection = normalizedText.substring(startIdx, endIdx);
      const extractedAbsent = this.extractNamesFromSection(absentSection);
      absentNames.push(...extractedAbsent);
    }

    return { attendedNames, absentNames };
  }

  private extractNamesFromSection(sectionText: string): string[] {
    const names: string[] = [];
    
    const normalizedSection = sectionText.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    const numberedEntryPattern = /(\d+)\.\s+([^0-9]+?)(?=\s*\d+\.\s+|$)/g;
    
    let match;
    while ((match = numberedEntryPattern.exec(normalizedSection)) !== null) {
      const entryText = match[2].trim();
      
      if (!entryText.includes('(')) continue;
      
      if (entryText.includes(',')) {
        const afterComma = entryText.split(',').slice(1).join(',').trim();
        const nameText = afterComma.replace(/\s*\([^)]*\)\s*/g, '').trim();
        
        if (nameText.length > 3 && nameText.match(/^[A-Z]/i) && nameText.match(/[a-z]/i)) {
          names.push(nameText);
        }
      } else {
        const nameText = entryText
          .replace(/\s*\([^)]*\)\s*/g, '')
          .replace(/\s*\[[^\]]*\]\s*/g, '')
          .trim();
        
        if (nameText.length > 3 && nameText.match(/^[A-Z]/i) && nameText.match(/[a-z]/i)) {
          names.push(nameText);
        }
      }
    }
    
    return names;
  }

  extractAbsentConstituencies(pdfText: string): ConstituencyAttendanceData {
    const absentConstituencies: string[] = [];
    const normalizedText = pdfText.replace(/[ \t]+/g, ' ');
    
    // Pattern to find "Ahli-Ahli Yang Tidak Hadir" sections
    const absentPattern = /Ahli[-\s]Ahli\s+Yang\s+Tidak\s+Hadir[^:]*:?/gi;
    
    let match;
    while ((match = absentPattern.exec(normalizedText)) !== null) {
      const startIdx = match.index + match[0].length;
      
      // Find the end of this absent section
      const remainingText = normalizedText.substring(startIdx);
      const nextAbsentMatch = remainingText.match(/Ahli[-\s]Ahli\s+Yang\s+Tidak\s+Hadir/i);
      const nextMajorSectionMatch = remainingText.match(/\n\s*\n\s*[A-Z][A-Z][A-Z]/);
      
      let endIdx;
      if (nextAbsentMatch && nextAbsentMatch.index !== undefined) {
        endIdx = startIdx + nextAbsentMatch.index;
      } else if (nextMajorSectionMatch && nextMajorSectionMatch.index !== undefined) {
        endIdx = startIdx + nextMajorSectionMatch.index;
      } else {
        endIdx = Math.min(startIdx + 10000, normalizedText.length);
      }
      
      const absentSection = normalizedText.substring(startIdx, endIdx);
      const constituencies = this.extractConstituenciesFromSection(absentSection);
      absentConstituencies.push(...constituencies);
    }
    
    return { absentConstituencies };
  }

  private extractConstituenciesFromSection(sectionText: string): string[] {
    const constituencies: string[] = [];
    
    // Normalize the section text
    const normalizedSection = sectionText.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    
    // Pattern to match numbered entries with constituencies in parentheses
    // Format: "1. Title Name, (Constituency)"
    const numberedEntryPattern = /\d+\.\s+[^(]+\(([^)]+)\)/g;
    
    let match;
    while ((match = numberedEntryPattern.exec(normalizedSection)) !== null) {
      const constituency = match[1].trim();
      
      // Filter out non-constituency entries (like job titles)
      if (constituency && 
          constituency.length > 2 && 
          !constituency.toLowerCase().includes('menteri') &&
          !constituency.toLowerCase().includes('timbalan') &&
          !constituency.toLowerCase().includes('datuk') &&
          !constituency.toLowerCase().includes('dato')) {
        constituencies.push(constituency);
      }
    }
    
    return constituencies;
  }

  extractConstituencyAttendanceCounts(pdfText: string): ConstituencyAttendanceCounts {
    const normalizedText = pdfText.replace(/[ \t]+/g, ' ');
    
    let constituenciesPresent = 0;
    let constituenciesAbsent = 0;
    let constituenciesAbsentRule91 = 0;

    const presentPattern = /Ahli[-\s]Ahli\s+Yang\s+Hadir\s*:?/i;
    const presentMatch = normalizedText.match(presentPattern);
    
    if (presentMatch && presentMatch.index !== undefined) {
      const startIdx = presentMatch.index + presentMatch[0].length;
      
      const remainingText = normalizedText.substring(startIdx);
      const nextSectionMatch = remainingText.match(/Ahli[-\s]Ahli\s+Yang\s+Tidak\s+Hadir/i);
      
      const endIdx = nextSectionMatch && nextSectionMatch.index !== undefined
        ? startIdx + nextSectionMatch.index
        : Math.min(startIdx + 20000, normalizedText.length);
      
      const presentSection = normalizedText.substring(startIdx, endIdx);
      const numberedPattern = /\d+\.\s+/g;
      const matches = presentSection.match(numberedPattern);
      
      if (matches && matches.length > 0) {
        constituenciesPresent = matches.length;
      }
    }

    const absentPattern = /Ahli[-\s]Ahli\s+Yang\s+Tidak\s+Hadir\s*:?(?!\s*Di\s+Bawah)/i;
    const absentMatch = normalizedText.match(absentPattern);
    
    if (absentMatch && absentMatch.index !== undefined) {
      const startIdx = absentMatch.index + absentMatch[0].length;
      
      const remainingText = normalizedText.substring(startIdx);
      const rule91Match = remainingText.match(/Ahli[-\s]Ahli\s+Yang\s+Tidak\s+Hadir\s+Di\s+Bawah/i);
      const nextMajorSectionMatch = remainingText.match(/\n\s*\n\s*[A-Z][A-Z][A-Z]/);
      
      let endIdx;
      if (rule91Match && rule91Match.index !== undefined) {
        endIdx = startIdx + rule91Match.index;
      } else if (nextMajorSectionMatch && nextMajorSectionMatch.index !== undefined) {
        endIdx = startIdx + nextMajorSectionMatch.index;
      } else {
        endIdx = Math.min(startIdx + 10000, normalizedText.length);
      }
      
      const absentSection = normalizedText.substring(startIdx, endIdx);
      const numberedPattern = /\d+\.\s+/g;
      const matches = absentSection.match(numberedPattern);
      
      if (matches) {
        constituenciesAbsent = matches.length;
      }
    }

    const rule91Pattern = /Ahli[-\s]Ahli\s+Yang\s+Tidak\s+Hadir\s+Di\s+Bawah\s+Peraturan\s+Mesyuarat\s+91\s*:?/i;
    const rule91Match = normalizedText.match(rule91Pattern);
    
    if (rule91Match && rule91Match.index !== undefined) {
      const startIdx = rule91Match.index + rule91Match[0].length;
      
      const remainingText = normalizedText.substring(startIdx);
      const nextMajorSectionMatch = remainingText.match(/\n\s*\n\s*[A-Z][A-Z][A-Z]/);
      
      const endIdx = nextMajorSectionMatch && nextMajorSectionMatch.index !== undefined
        ? startIdx + nextMajorSectionMatch.index
        : Math.min(startIdx + 10000, normalizedText.length);
      
      const rule91Section = normalizedText.substring(startIdx, endIdx);
      const numberedPattern = /\d+\.\s+/g;
      const matches = rule91Section.match(numberedPattern);
      
      if (matches) {
        constituenciesAbsentRule91 = matches.length;
      }
    }

    const total = constituenciesPresent + constituenciesAbsent + constituenciesAbsentRule91;
    if (total > 0 && total !== 222) {
      console.warn(`Constituency count discrepancy: ${constituenciesPresent} present + ${constituenciesAbsent} absent + ${constituenciesAbsentRule91} absent (Rule 91) = ${total} (expected 222)`);
    }

    return {
      constituenciesPresent,
      constituenciesAbsent,
      constituenciesAbsentRule91
    };
  }
}
