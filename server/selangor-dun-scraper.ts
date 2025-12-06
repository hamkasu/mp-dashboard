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

// NOTE: Party data is not available in the individual member popup blocks on the website.
// The party dropdown on the page is only for filtering, not per-member party data.
// Party field will remain null until the website provides this information per-member.

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

      $('.popup-block-adun').each((index, element) => {
        try {
          const $element = $(element);
          const elementId = $element.attr('id') || '';
          
          const codeMatch = elementId.match(/^n(\d+)$/i);
          if (!codeMatch) return;
          
          const constituencyCode = `N${codeMatch[1].padStart(2, '0')}`;
          
          const nameElement = $element.find('h4.mt-3').first();
          const memberName = nameElement.text().trim();
          
          if (!memberName) {
            console.log(`[SelangorDunScraper] No name found for ${constituencyCode}`);
            return;
          }
          
          let photoUrl = '';
          const imgTag = $element.find('.thumb img').first();
          if (imgTag.length) {
            photoUrl = imgTag.attr('src') || '';
          }
          
          let constituencyName = '';
          
          $element.find('p').each((_, pElement) => {
            const $p = $(pElement);
            const pHtml = $p.html() || '';
            const strongText = $p.find('strong').first().text();
            
            if (strongText.includes('Tempat')) {
              const fullText = $p.text().replace(/\s+/g, ' ').trim();
              const tempatMatch = fullText.match(/Tempat:\s*N\d+\s+(.+?)$/i);
              if (tempatMatch) {
                constituencyName = tempatMatch[1].trim();
              }
            }
          });
          
          if (!constituencyName) {
            const rawHtml = $element.html() || '';
            const htmlMatch = rawHtml.match(/Tempat:[^<]*N\d+\s+([A-Za-z\s'-]+?)(?:<|$)/i);
            if (htmlMatch) {
              constituencyName = htmlMatch[1].trim();
            }
          }
          
          if (!constituencyName) {
            console.warn(`[SelangorDunScraper] Could not extract constituency name for ${constituencyCode}, using fallback`);
            const constituencyDropdown = $(`option[value*="${elementId}"]`);
            if (constituencyDropdown.length) {
              const dropdownText = constituencyDropdown.text().trim();
              const dropdownMatch = dropdownText.match(/N\d+\s+(.+)/);
              if (dropdownMatch) {
                constituencyName = dropdownMatch[1].trim();
              }
            }
          }
          
          if (!constituencyName) {
            console.warn(`[SelangorDunScraper] Fallback failed for ${constituencyCode}, extracting from dropdown by code`);
            const codeNum = parseInt(codeMatch[1]);
            const dropdownOption = $(`option[value="n${codeNum}-"]`).first();
            if (!dropdownOption.length) {
              $('option').each((_, opt) => {
                const val = $(opt).attr('value') || '';
                if (val.startsWith(`n${codeNum}-`) || val.startsWith(`n${codeMatch[1].padStart(2, '0')}-`)) {
                  const text = $(opt).text().trim();
                  const match = text.match(/N\d+\s+(.+)/);
                  if (match) {
                    constituencyName = match[1].trim();
                    return false;
                  }
                }
              });
            }
          }
          
          if (!constituencyName) {
            constituencyName = `Unknown ${constituencyCode}`;
            console.error(`[SelangorDunScraper] FAILED to extract constituency name for ${constituencyCode}`);
          }

          members.push({
            constituencyCode,
            constituencyName,
            memberName: this.cleanMemberName(memberName),
            photoUrl: photoUrl || undefined,
          });
        } catch (err) {
          console.error(`[SelangorDunScraper] Error parsing popup ${index}:`, err);
        }
      });

      console.log(`[SelangorDunScraper] Found ${members.length} members from popup blocks`);

      if (members.length === 0) {
        console.log('[SelangorDunScraper] No members found in popup blocks, trying alternative parsing...');
        
        $('[id^="n"]').each((index, element) => {
          try {
            const $element = $(element);
            const elementId = $element.attr('id') || '';
            
            const codeMatch = elementId.match(/^n(\d+)$/i);
            if (!codeMatch) return;
            
            const constituencyCode = `N${codeMatch[1].padStart(2, '0')}`;
            
            const h4Text = $element.find('h4').first().text().trim();
            if (!h4Text) return;
            
            let photoUrl = '';
            const imgTag = $element.find('img').first();
            if (imgTag.length) {
              photoUrl = imgTag.attr('src') || '';
            }
            
            let constituencyName = '';
            $element.find('p').each((_, pElement) => {
              const $p = $(pElement);
              if ($p.find('strong').text().includes('Tempat')) {
                const match = $p.text().match(/N\d+\s+(.+?)$/);
                if (match) {
                  constituencyName = match[1].trim();
                  return false;
                }
              }
            });
            
            if (!constituencyName) {
              constituencyName = `Unknown ${constituencyCode}`;
            }

            if (!members.find(m => m.constituencyCode === constituencyCode)) {
              members.push({
                constituencyCode,
                constituencyName,
                memberName: this.cleanMemberName(h4Text),
                photoUrl: photoUrl || undefined,
              });
            }
          } catch (err) {
            console.error(`[SelangorDunScraper] Error in alternative parse ${index}:`, err);
          }
        });
        
        console.log(`[SelangorDunScraper] Found ${members.length} members after alternative parsing`);
      }

      members.sort((a, b) => {
        const numA = parseInt(a.constituencyCode.replace('N', ''));
        const numB = parseInt(b.constituencyCode.replace('N', ''));
        return numA - numB;
      });

      const unknownCount = members.filter(m => m.constituencyName.startsWith('Unknown')).length;
      if (unknownCount > 0) {
        console.warn(`[SelangorDunScraper] WARNING: ${unknownCount} members have unknown constituency names`);
      }

      console.log(`[SelangorDunScraper] After sorting: ${members.length} unique members`);

      const dunMembers: InsertDunMember[] = members.map(member => ({
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
