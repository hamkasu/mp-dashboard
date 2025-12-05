import * as cheerio from 'cheerio';
import axios from 'axios';
import { InsertDunMember } from '@shared/schema';

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
      
      $('table.table tbody tr').each((index, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 3) {
          const bilNo = $(cells[0]).text().trim();
          
          const constituencyCell = $(cells[1]);
          const constituencyText = constituencyCell.text().trim();
          
          const memberCell = $(cells[2]);
          const memberName = memberCell.find('a').first().text().trim() || memberCell.text().trim();
          const detailLink = memberCell.find('a').first().attr('href');
          
          const imgTag = memberCell.find('img').first();
          let photoUrl = imgTag.attr('src') || imgTag.attr('data-src') || '';
          
          if (photoUrl && !photoUrl.startsWith('http')) {
            photoUrl = this.baseUrl + (photoUrl.startsWith('/') ? '' : '/') + photoUrl;
          }

          const constituencyMatch = constituencyText.match(/^(N\d+)\s*[\.\-\s]*\s*(.+)$/i);
          
          if (constituencyMatch && memberName) {
            const constituencyCode = constituencyMatch[1].toUpperCase();
            const constituencyName = constituencyMatch[2].trim();

            members.push({
              constituencyCode,
              constituencyName,
              memberName: this.cleanMemberName(memberName),
              photoUrl: photoUrl || undefined,
              detailUrl: detailLink ? (detailLink.startsWith('http') ? detailLink : this.baseUrl + detailLink) : undefined,
            });
          }
        }
      });

      if (members.length === 0) {
        console.log('[SarawakDunScraper] Table parsing failed, trying alternative patterns...');
        
        $('tr, .constituency-row, .member-row').each((index, row) => {
          const text = $(row).text();
          const match = text.match(/(N\d+)\s*[\.\-\s]*([A-Z][A-Za-z\s]+?)\s+(YB|DATUK|DATO|TAN SRI|DR|YAB|YANG)/i);
          
          if (match) {
            const constituencyCode = match[1].toUpperCase();
            const remainingText = text.substring(text.indexOf(match[2]));
            const nameMatch = remainingText.match(/^([A-Za-z\s]+(?:BIN|BINTI|A\/L|A\/P)?[A-Za-z\s]+)/i);
            
            if (nameMatch) {
              members.push({
                constituencyCode,
                constituencyName: match[2].trim(),
                memberName: this.cleanMemberName(nameMatch[1]),
              });
            }
          }
        });
      }

      console.log(`[SarawakDunScraper] Found ${members.length} members from page`);

      const dunMembers: InsertDunMember[] = members.map(member => ({
        state: 'Sarawak',
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
      /^(DR\.?|PROF\.?|HAJI|HAJJAH)\s*/i,
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
