import axios from 'axios';
import * as cheerio from 'cheerio';

const pdfParse = require('pdf-parse');

interface HansardMetadata {
  sessionNumber: string;
  sessionDate: Date;
  parliamentTerm: string;
  sitting: string;
  pdfUrl: string;
}

export class HansardScraper {
  private readonly baseUrl = 'https://www.parlimen.gov.my';
  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  async getHansardListForParliament15(maxRecords: number = 100): Promise<HansardMetadata[]> {
    const allHansards: HansardMetadata[] = [];
    let pageNum = 1;
    
    try {
      while (allHansards.length < maxRecords) {
        const url = pageNum === 1 
          ? `${this.baseUrl}/hansard-dewan-rakyat.html?uweb=dr&lang=bm`
          : `${this.baseUrl}/hansard-dewan-rakyat.html?uweb=dr&lang=bm&page=${pageNum}`;
        
        console.log(`Fetching page ${pageNum}...`);
        const response = await axios.get(url, { headers: this.headers, timeout: 30000 });
        const $ = cheerio.load(response.data);
        const pageHansards: HansardMetadata[] = [];
        
        $('a[href*=".pdf"]').each((_, element) => {
          const href = $(element).attr('href');
          if (href && href.includes('.pdf')) {
            const pdfUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
            const text = $(element).text().trim();
            
            const dateMatch = text.match(/(\d{1,2})\s+([\w]+)\s+(\d{4})/);
            if (dateMatch) {
              const sessionDate = this.parseMalayDate(text);
              if (sessionDate) {
                pageHansards.push({
                  sessionNumber: `DR.${sessionDate.getDate()}.${sessionDate.getMonth() + 1}.${sessionDate.getFullYear()}`,
                  sessionDate,
                  parliamentTerm: '15th Parliament',
                  sitting: this.determineSitting(sessionDate),
                  pdfUrl
                });
              }
            }
          }
        });
        
        if (pageHansards.length === 0) {
          console.log(`No more records found on page ${pageNum}`);
          break;
        }
        
        allHansards.push(...pageHansards);
        console.log(`Found ${pageHansards.length} records on page ${pageNum} (total: ${allHansards.length})`);
        
        if (allHansards.length >= maxRecords) {
          break;
        }
        
        pageNum++;
        await this.delay(2000);
      }
      
      return allHansards.slice(0, maxRecords);
    } catch (error) {
      console.error('Error fetching Hansard list:', error);
      return allHansards;
    }
  }

  async downloadAndExtractPdf(pdfUrl: string): Promise<string | null> {
    try {
      await this.delay(2000);
      
      const response = await axios.get(pdfUrl, {
        responseType: 'arraybuffer',
        headers: this.headers,
        timeout: 30000
      });
      
      const pdfBuffer = Buffer.from(response.data);
      const data = await pdfParse(pdfBuffer);
      
      return data.text;
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
}
