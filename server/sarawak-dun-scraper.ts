import * as cheerio from 'cheerio';
import axios from 'axios';
import { InsertDunMember } from '@shared/schema';
import { getCabinetMemberByConstituency, getCabinetAllowance } from './sarawak-cabinet-data';

interface SarawakDunMemberRaw {
  constituencyCode: string;
  constituencyName: string;
  memberName: string;
  party?: string;
  photoUrl?: string;
  detailUrl?: string;
}

export class SarawakDunScraper {
  private baseUrl = 'https://duns.sarawak.gov.my';
  private mainPageUrl = 'https://duns.sarawak.gov.my/web/subpage/webpage_view/150';

  async scrapeAllMembers(): Promise<InsertDunMember[]> {
    console.log('[SarawakDunScraper] Starting to scrape Sarawak DUN members...');
    
    try {
      const response = await axios.get(this.mainPageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);
      const members: SarawakDunMemberRaw[] = [];

      console.log('[SarawakDunScraper] Page loaded successfully');
      
      $('table.ahli-dun-table td.card-cell').each((index, cell) => {
        try {
          const $cell = $(cell);
          
          const nameSpan = $cell.find('.name-span');
          const memberName = nameSpan.text().trim();
          
          const strongTag = $cell.find('.info-div strong');
          const constituencyText = strongTag.text().trim();
          
          const constituencyMatch = constituencyText.match(/^N\.?(\d+)\s+(.+)$/i);
          
          const imgTag = $cell.find('img.profile-img');
          let photoUrl = imgTag.attr('src') || '';
          
          if (photoUrl && !photoUrl.startsWith('http')) {
            photoUrl = this.baseUrl + (photoUrl.startsWith('/') ? '' : '/') + photoUrl;
          }
          
          let detailLink = $cell.find('a[href*="attachment/show"]').first().attr('href') || '';
          if (detailLink && !detailLink.startsWith('http')) {
            detailLink = this.baseUrl + (detailLink.startsWith('/') ? '' : '/') + detailLink;
          }
          
          if (constituencyMatch && memberName) {
            const constituencyCode = `N${constituencyMatch[1]}`;
            const constituencyName = constituencyMatch[2].trim();

            members.push({
              constituencyCode,
              constituencyName,
              memberName: this.cleanMemberName(memberName),
              photoUrl: photoUrl || undefined,
              detailUrl: detailLink || undefined,
            });
          }
        } catch (err) {
          console.error(`[SarawakDunScraper] Error parsing cell ${index}:`, err);
        }
      });

      if (members.length === 0) {
        console.log('[SarawakDunScraper] Primary parsing failed, trying alternative pattern...');
        
        $('td.card-cell').each((index, cell) => {
          try {
            const $cell = $(cell);
            const text = $cell.text();
            
            const match = text.match(/N\.?(\d+)\s+([A-Z][A-Za-z\s]+?)\s+(YB|DATUK|DATO|TAN SRI|DR|YAB|ENCIK|PUAN)/i);
            
            if (match) {
              const constituencyCode = `N${match[1]}`;
              const constituencyName = match[2].trim();
              
              const nameMatch = text.match(/(YB|YAB)[\s\S]+?(DATUK|DATO['']?|TAN SRI|DR\.?|HAJI|HAJJAH|ENCIK|PUAN)?[\s\S]*?([A-Z][A-Za-z\s]+(?:BIN|BINTI|ANAK|A\/L|A\/P)?[\s\S]*?)(?:\n|$)/i);
              
              if (nameMatch) {
                const imgTag = $cell.find('img').first();
                let photoUrl = imgTag.attr('src') || '';
                
                if (photoUrl && !photoUrl.startsWith('http')) {
                  photoUrl = this.baseUrl + (photoUrl.startsWith('/') ? '' : '/') + photoUrl;
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
            console.error(`[SarawakDunScraper] Error in alternative parse ${index}:`, err);
          }
        });
      }

      console.log(`[SarawakDunScraper] Found ${members.length} members from page`);
      
      const uniqueMembers = new Map<string, SarawakDunMemberRaw>();
      for (const member of members) {
        if (!uniqueMembers.has(member.constituencyCode)) {
          uniqueMembers.set(member.constituencyCode, member);
        }
      }

      console.log(`[SarawakDunScraper] After deduplication: ${uniqueMembers.size} unique members`);

      let cabinetCount = 0;
      const dunMembers: InsertDunMember[] = Array.from(uniqueMembers.values()).map(member => {
        const cabinetData = getCabinetMemberByConstituency(member.constituencyCode);
        
        if (cabinetData) {
          cabinetCount++;
          const allowance = getCabinetAllowance(cabinetData.role);
          console.log(`[SarawakDunScraper] Cabinet member found: ${member.memberName} (${member.constituencyCode}) - ${cabinetData.role}`);
          
          return {
            state: 'Sarawak',
            constituencyCode: member.constituencyCode,
            constituencyName: member.constituencyName,
            name: member.memberName,
            title: this.extractTitle(member.memberName),
            party: member.party || null,
            photoUrl: member.photoUrl || null,
            detailUrl: member.detailUrl || null,
            cabinetRole: cabinetData.role,
            cabinetBaseSalary: allowance.baseSalary,
            cabinetEntertainment: allowance.entertainment,
            cabinetSpecialAllowance: allowance.specialAllowance,
            cabinetTotalSalary: allowance.total,
          };
        }
        
        return {
          state: 'Sarawak',
          constituencyCode: member.constituencyCode,
          constituencyName: member.constituencyName,
          name: member.memberName,
          title: this.extractTitle(member.memberName),
          party: member.party || null,
          photoUrl: member.photoUrl || null,
          detailUrl: member.detailUrl || null,
          cabinetRole: null,
          cabinetBaseSalary: null,
          cabinetEntertainment: null,
          cabinetSpecialAllowance: null,
          cabinetTotalSalary: null,
        };
      });

      console.log(`[SarawakDunScraper] Identified ${cabinetCount} cabinet members out of ${dunMembers.length} total members`);
      return dunMembers;
    } catch (error) {
      console.error('[SarawakDunScraper] Error scraping:', error);
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
      /^(TAN SRI|DATUK PATINGGI|DATUK AMAR|DATUK SRI|DATUK|DATO' SRI|DATO'|DATO)\s*/i,
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
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export const sarawakDunScraper = new SarawakDunScraper();
