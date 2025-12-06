import * as cheerio from 'cheerio';
import axios from 'axios';
import * as https from 'https';
import { InsertDunMember } from '@shared/schema';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

interface SelangorDunMemberRaw {
  constituencyCode: string;
  constituencyName: string;
  memberName: string;
  party?: string;
  photoUrl?: string;
  detailUrl?: string;
}

export class SelangorDunScraper {
  private baseUrl = 'https://dewan.selangor.gov.my';
  private mainPageUrl = 'https://dewan.selangor.gov.my/dewan-negeri-selangor/';

  async scrapeAllMembers(): Promise<InsertDunMember[]> {
    console.log('[SelangorDunScraper] Starting to scrape Selangor DUN members...');
    
    try {
      const response = await axios.get(this.mainPageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 30000,
        httpsAgent,
      });

      const $ = cheerio.load(response.data);
      const members: SelangorDunMemberRaw[] = [];

      console.log('[SelangorDunScraper] Page loaded successfully');

      $('table tbody tr').each((index, row) => {
        try {
          const $row = $(row);
          const cells = $row.find('td');
          
          if (cells.length >= 3) {
            const constituencyCell = $(cells[0]).text().trim();
            const nameCell = $(cells[1]).text().trim();
            const partyCell = $(cells[2]).text().trim();
            
            const constituencyMatch = constituencyCell.match(/^N\.?(\d+)\s+(.+)$/i) ||
                                      constituencyCell.match(/^N(\d+)\s*[-–]\s*(.+)$/i);
            
            if (constituencyMatch && nameCell) {
              const constituencyCode = `N${constituencyMatch[1].padStart(2, '0')}`;
              const constituencyName = constituencyMatch[2].trim();
              
              let photoUrl = '';
              const imgTag = $row.find('img').first();
              if (imgTag.length) {
                photoUrl = imgTag.attr('src') || '';
                if (photoUrl && !photoUrl.startsWith('http')) {
                  photoUrl = this.baseUrl + (photoUrl.startsWith('/') ? '' : '/') + photoUrl;
                }
              }
              
              let detailUrl = '';
              const linkTag = $row.find('a').first();
              if (linkTag.length) {
                detailUrl = linkTag.attr('href') || '';
                if (detailUrl && !detailUrl.startsWith('http')) {
                  detailUrl = this.baseUrl + (detailUrl.startsWith('/') ? '' : '/') + detailUrl;
                }
              }

              members.push({
                constituencyCode,
                constituencyName,
                memberName: this.cleanMemberName(nameCell),
                party: partyCell || undefined,
                photoUrl: photoUrl || undefined,
                detailUrl: detailUrl || undefined,
              });
            }
          }
        } catch (err) {
          console.error(`[SelangorDunScraper] Error parsing row ${index}:`, err);
        }
      });

      if (members.length === 0) {
        console.log('[SelangorDunScraper] Table parsing failed, trying card/grid layout...');
        
        $('.elementor-widget-container, .wp-block-group, .member-card, .adun-card, article').each((index, element) => {
          try {
            const $element = $(element);
            const text = $element.text();
            
            const constituencyMatch = text.match(/N\.?(\d+)\s*[-–:]\s*([A-Za-z\s]+?)(?:\n|YB|DATUK|DATO|$)/i);
            
            if (constituencyMatch) {
              const constituencyCode = `N${constituencyMatch[1].padStart(2, '0')}`;
              const constituencyName = constituencyMatch[2].trim();
              
              const nameMatch = text.match(/(YB|YAB|DATUK|DATO['']?|TAN SRI|DR\.?)\s*([A-Za-z\s@'.-]+?)(?:\n|$)/i);
              
              if (nameMatch) {
                let photoUrl = '';
                const imgTag = $element.find('img').first();
                if (imgTag.length) {
                  photoUrl = imgTag.attr('src') || '';
                  if (photoUrl && !photoUrl.startsWith('http')) {
                    photoUrl = this.baseUrl + (photoUrl.startsWith('/') ? '' : '/') + photoUrl;
                  }
                }
                
                members.push({
                  constituencyCode,
                  constituencyName,
                  memberName: this.cleanMemberName(nameMatch[0]),
                  photoUrl: photoUrl || undefined,
                });
              }
            }
          } catch (err) {
            console.error(`[SelangorDunScraper] Error in alternative parse ${index}:`, err);
          }
        });
      }

      if (members.length === 0) {
        console.log('[SelangorDunScraper] Trying regex pattern on full page...');
        
        const pageText = $('body').text();
        const patterns = pageText.match(/N\.?(\d+)\s*[-–:]\s*([A-Za-z\s]+?)\s+(YB|YAB|DATUK|DATO)/gi);
        
        if (patterns) {
          for (const pattern of patterns) {
            const match = pattern.match(/N\.?(\d+)\s*[-–:]\s*([A-Za-z\s]+?)\s+(YB|YAB|DATUK|DATO)/i);
            if (match) {
              members.push({
                constituencyCode: `N${match[1].padStart(2, '0')}`,
                constituencyName: match[2].trim(),
                memberName: match[3],
              });
            }
          }
        }
      }

      console.log(`[SelangorDunScraper] Found ${members.length} members from page`);
      
      const uniqueMembers = new Map<string, SelangorDunMemberRaw>();
      for (const member of members) {
        if (!uniqueMembers.has(member.constituencyCode)) {
          uniqueMembers.set(member.constituencyCode, member);
        }
      }

      console.log(`[SelangorDunScraper] After deduplication: ${uniqueMembers.size} unique members`);

      const dunMembers: InsertDunMember[] = Array.from(uniqueMembers.values()).map(member => ({
        state: 'Selangor',
        constituencyCode: member.constituencyCode,
        constituencyName: member.constituencyName,
        name: member.memberName,
        title: this.extractTitle(member.memberName),
        party: member.party || null,
        photoUrl: member.photoUrl || null,
        detailUrl: member.detailUrl || null,
      }));

      return dunMembers;
    } catch (error) {
      console.error('[SelangorDunScraper] Error scraping:', error);
      throw error;
    }
  }

  private cleanMemberName(name: string): string {
    return name
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]/g, '')
      .trim();
  }

  private extractTitle(name: string): string | null {
    const titlePatterns = [
      /^(YAB|YB|YANG BERHORMAT|YANG AMAT BERHORMAT)\s*/i,
      /^(TAN SRI|DATUK SERI|DATUK|DATO' SRI|DATO'|DATO)\s*/i,
      /^(DR\.?|PROF\.?|HAJI|HAJJAH|ENCIK|PUAN)\s*/i,
    ];

    let title = '';
    let workingName = name;

    for (const pattern of titlePatterns) {
      const match = workingName.match(pattern);
      if (match) {
        title += (title ? ' ' : '') + match[1].toUpperCase();
        workingName = workingName.replace(pattern, '');
      }
    }

    return title || null;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.head(this.mainPageUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        httpsAgent,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export const selangorDunScraper = new SelangorDunScraper();
