import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { PDFParse } from 'pdf-parse';
import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';
import path from 'path';

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

interface TreeNode {
  id: string;
  text: string;
  hasChildren: boolean;
  level: number;
  myurl?: string;
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
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });
  private visitedNodes = new Set<string>();

  /**
   * Fetch XML tree data from parliament website archive
   * @param nodeId - Node ID to fetch children for (null for root)
   * @returns Array of tree nodes
   */
  private async fetchTreeLevel(nodeId: string | null = null): Promise<TreeNode[]> {
    const maxRetries = 3;
    const retryDelay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.delay(500); // Polite throttling

        const url = nodeId 
          ? `${this.baseUrl}/hansard-dewan-rakyat.html?uweb=dr&lang=bm&arkib=yes&ajx=1&id=${nodeId}`
          : `${this.baseUrl}/hansard-dewan-rakyat.html?uweb=dr&lang=bm&arkib=yes&ajx=0`;

        const response = await axios.get(url, {
          headers: this.headers,
          timeout: 30000,
          httpsAgent
        });

        const parsed = this.xmlParser.parse(response.data);
        
        if (!parsed.tree || !parsed.tree.item) {
          return [];
        }

        const items = Array.isArray(parsed.tree.item) ? parsed.tree.item : [parsed.tree.item];
        
        return items.map((item: any) => ({
          id: item['@_id'] || '',
          text: item['@_text'] || '',
          hasChildren: item['@_child'] === '1',
          level: this.getNodeLevel(item['@_id'] || ''),
          myurl: item.userdata?.['@_name'] === 'myurl' ? item.userdata['#text'] : undefined
        }));
      } catch (error: any) {
        if (attempt < maxRetries) {
          console.log(`  Retry ${attempt}/${maxRetries} for node ${nodeId || 'root'}...`);
          await this.delay(retryDelay);
        } else {
          console.error(`  Failed to fetch tree level for ${nodeId || 'root'}:`, error.message);
          return [];
        }
      }
    }
    return [];
  }

  /**
   * Calculate the level of a node based on its ID structure
   * Example: '0_15_4_11_0' has 5 segments = level 5
   */
  private getNodeLevel(nodeId: string): number {
    return nodeId.split('_').length;
  }

  /**
   * Extract PDF URL from the myurl javascript string
   * Example: "javascript:loadResult('/files/hindex/pdf/DR-05052025.pdf','DR-05052025.pdf')"
   */
  private extractPdfUrlFromMyurl(myurl: string): string | null {
    if (!myurl) return null;
    const match = myurl.match(/['"](\/files\/[^'"]+\.pdf)['"]/);
    if (match) {
      return `${this.baseUrl}${match[1]}`;
    }
    return null;
  }

  /**
   * Check if a parliament term is the 15th Parliament
   * Covers multiple naming variants to future-proof against site changes
   */
  private is15thParliament(parliamentText: string): boolean {
    const text = parliamentText.toLowerCase();
    return text.includes('kelima belas') || 
           text.includes('ke lima belas') ||
           text.includes('ke-15') || 
           text.includes('ke 15') ||
           text.includes('15th') ||
           text.includes('xv') ||
           text.includes('parlimen ke 15');
  }

  /**
   * Recursively traverse the archive tree and collect all Hansard records
   * Only processes 15th Parliament records
   * Collects ALL records without stopping early (no maxRecords limit during traversal)
   */
  private async traverseArchiveTree(
    nodeId: string | null,
    parliamentTerm: string,
    penggal: string,
    mesyuarat: string,
    collected: Map<string, HansardMetadata>
  ): Promise<void> {
    if (nodeId && this.visitedNodes.has(nodeId)) {
      return; // Avoid cycles
    }

    if (nodeId) {
      this.visitedNodes.add(nodeId);
    }

    const nodes = await this.fetchTreeLevel(nodeId);

    for (const node of nodes) {
      const level = node.level;

      // Level 1: Parliament (e.g., "Parlimen Kelima Belas (2022 - Sekarang)")
      if (level === 2) {
        // Only process 15th Parliament
        if (this.is15thParliament(node.text)) {
          console.log(`✅ Processing 15th Parliament: ${node.text}`);
          await this.traverseArchiveTree(node.id, node.text, '', '', collected);
        } else {
          console.log(`⏭️  Skipping non-15th Parliament: ${node.text}`);
        }
      }
      // Level 2: Penggal (e.g., "Penggal Pertama")
      else if (level === 3) {
        await this.traverseArchiveTree(node.id, parliamentTerm, node.text, '', collected);
      }
      // Level 3: Mesyuarat (e.g., "Mesyuarat Pertama (03/02/2025 - 06/03/2025)")
      else if (level === 4) {
        await this.traverseArchiveTree(node.id, parliamentTerm, penggal, node.text, collected);
      }
      // Level 4: Individual date (e.g., "05 Mei 2025") - This is where PDF links are
      else if (level === 5) {
        const pdfUrl = this.extractPdfUrlFromMyurl(node.myurl || '');
        if (pdfUrl) {
          const sessionDate = this.parseMalayDate(node.text);
          if (sessionDate) {
            const sessionNumber = `DR.${sessionDate.getDate()}.${sessionDate.getMonth() + 1}.${sessionDate.getFullYear()}`;
            
            if (!collected.has(sessionNumber)) {
              collected.set(sessionNumber, {
                sessionNumber,
                sessionDate,
                parliamentTerm,
                sitting: mesyuarat,
                pdfUrl
              });
              console.log(`  Found: ${sessionNumber} - ${node.text} (total: ${collected.size})`);
            }
          }
        }
      }
    }
  }

  /**
   * Get complete Hansard list by traversing the archive tree structure
   * Collects ALL records from the parliament website, then sorts by date (newest first)
   * @param maxRecords - Optional limit on number of records to return (after sorting)
   */
  async getHansardListFromArchiveTree(maxRecords: number = 1000): Promise<HansardMetadata[]> {
    console.log('🌳 Traversing archive tree structure to collect ALL records...');
    this.visitedNodes.clear();
    const collected = new Map<string, HansardMetadata>();

    try {
      await this.traverseArchiveTree(null, '', '', '', collected);
      console.log(`✅ Tree traversal complete. Found ${collected.size} unique records.`);
      
      // Sort by date (newest first) to prioritize recent records
      const allRecords = Array.from(collected.values()).sort((a, b) => 
        b.sessionDate.getTime() - a.sessionDate.getTime()
      );
      
      // Return up to maxRecords (newest records first)
      const records = allRecords.slice(0, maxRecords);
      console.log(`📊 Returning ${records.length} records (sorted by date, newest first)`);
      
      return records;
    } catch (error) {
      console.error('❌ Error traversing archive tree:', error);
      // Even on error, return what we collected, sorted
      const allRecords = Array.from(collected.values()).sort((a, b) => 
        b.sessionDate.getTime() - a.sessionDate.getTime()
      );
      return allRecords.slice(0, maxRecords);
    }
  }

  async getHansardListForParliament15(maxRecords: number = 100): Promise<HansardMetadata[]> {
    // Use the new tree-based approach instead of pagination
    return this.getHansardListFromArchiveTree(maxRecords);
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

  async downloadAndSavePdf(pdfUrl: string, sessionNumber: string): Promise<{ localPath: string; text: string } | null> {
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
      
      const assetsDir = path.join(process.cwd(), 'attached_assets');
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      
      const timestamp = Date.now();
      const filename = `${sessionNumber.replace(/\./g, '')}_${timestamp}.pdf`;
      const localPath = `attached_assets/${filename}`;
      const fullPath = path.join(process.cwd(), localPath);
      
      fs.writeFileSync(fullPath, pdfBuffer);
      console.log(`  Saved PDF to: ${localPath}`);
      
      console.log(`  Parsing PDF...`);
      const parser = new PDFParse({ data: pdfBuffer });
      const result = await parser.getText();
      
      console.log(`  Extracted ${result.text.length} characters`);
      return {
        localPath,
        text: result.text
      };
    } catch (error: any) {
      if (error.response) {
        console.error(`  ✗ HTTP Error ${error.response.status} for ${pdfUrl}`);
        console.error(`  Response headers:`, error.response.headers);
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        console.error(`  ✗ Timeout downloading PDF: ${pdfUrl}`);
      } else {
        console.error(`  ✗ Error downloading/saving PDF ${pdfUrl}:`, error.message);
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
      
      // Stop at senator section to avoid counting senators as MPs
      const senatorMatch = normalizedText.substring(startIdx).match(/Senator\s+Yang\s+Turut\s+Hadir\s*:?/i);
      if (senatorMatch && senatorMatch.index !== undefined) {
        endIdx = startIdx + senatorMatch.index;
      } else {
        // Otherwise stop at absent section
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
      
      // Stop at senator section to avoid counting senators as MPs
      const senatorMatch = remainingText.match(/Senator\s+Yang\s+Turut\s+Hadir\s*:?/i);
      const nextSectionMatch = remainingText.match(/Ahli[-\s]Ahli\s+Yang\s+Tidak\s+Hadir/i);
      
      let endIdx;
      if (senatorMatch && senatorMatch.index !== undefined) {
        endIdx = startIdx + senatorMatch.index;
      } else if (nextSectionMatch && nextSectionMatch.index !== undefined) {
        endIdx = startIdx + nextSectionMatch.index;
      } else {
        endIdx = Math.min(startIdx + 20000, normalizedText.length);
      }
      
      const presentSection = normalizedText.substring(startIdx, endIdx);
      // Count only entries with constituencies in parentheses to exclude non-MPs like Speaker
      const constituencyPattern = /\d+\.\s+[^(]+\([^)]+\)/g;
      const matches = presentSection.match(constituencyPattern);
      
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
      // Count only entries with constituencies in parentheses to exclude non-MPs
      const constituencyPattern = /\d+\.\s+[^(]+\([^)]+\)/g;
      const matches = absentSection.match(constituencyPattern);
      
      if (matches) {
        constituenciesAbsent = matches.length;
      }
    }

    const rule91Pattern = /Ahli[-\s]Ahli\s+Yang\s+Tidak\s+Hadir\s+Di\s+Bawah\s+Peraturan\s+Mesyuarat\s+91\s*:?/i;
    const rule91Match = normalizedText.match(rule91Pattern);
    
    if (rule91Match && rule91Match.index !== undefined) {
      const startIdx = rule91Match.index + rule91Match[0].length;
      
      const remainingText = normalizedText.substring(startIdx);
      
      // Stop at various section boundaries to avoid counting non-MPs
      const senatorMatch = remainingText.match(/Senator\s+Yang\s+Turut\s+Hadir\s*:?/i);
      const pageMarkerMatch = remainingText.match(/--\s+\d+\s+of\s+\d+\s+--/i);
      const drSectionMatch = remainingText.match(/DR\.\s+\d+\.\d+\.\d+/i);
      const nextMajorSectionMatch = remainingText.match(/\n\s*\n\s*[A-Z][A-Z][A-Z]/);
      
      let endIdx;
      // Use the earliest boundary we find
      const boundaries = [
        senatorMatch?.index,
        pageMarkerMatch?.index,
        drSectionMatch?.index,
        nextMajorSectionMatch?.index
      ].filter((idx): idx is number => idx !== undefined);
      
      if (boundaries.length > 0) {
        endIdx = startIdx + Math.min(...boundaries);
      } else {
        endIdx = Math.min(startIdx + 10000, normalizedText.length);
      }
      
      const rule91Section = normalizedText.substring(startIdx, endIdx);
      // Count only entries with constituencies in parentheses to exclude non-MPs
      const constituencyPattern = /\d+\.\s+[^(]+\([^)]+\)/g;
      const matches = rule91Section.match(constituencyPattern);
      
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
