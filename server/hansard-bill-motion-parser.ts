/**
 * Copyright by Calmic Sdn Bhd
 */

import { Mp } from '@shared/schema';

export interface ParsedBillOrMotion {
  title: string;
  type: 'Bill' | 'Motion';
  mpId?: string;
  mpName?: string;
  constituency?: string;
  coSponsors: string[];
  description: string;
  status: string;
  billNumber?: string;
  rawText: string;
}

export class HansardBillMotionParser {
  private allMps: Mp[];

  constructor(allMps: Mp[]) {
    this.allMps = allMps;
  }

  parseBills(sectionContent: string): ParsedBillOrMotion[] {
    const bills: ParsedBillOrMotion[] = [];
    
    const billBlocks = this.splitIntoBillBlocks(sectionContent);
    console.log(`📜 Parsing ${billBlocks.length} bill blocks`);

    for (const block of billBlocks) {
      try {
        const bill = this.parseBillBlock(block);
        if (bill) {
          bills.push(bill);
        }
      } catch (error) {
        console.error('Error parsing bill block:', error);
      }
    }

    console.log(`✅ Successfully parsed ${bills.length} bills`);
    return bills;
  }

  parseMotions(sectionContent: string): ParsedBillOrMotion[] {
    const motions: ParsedBillOrMotion[] = [];
    
    const motionBlocks = this.splitIntoMotionBlocks(sectionContent);
    console.log(`📋 Parsing ${motionBlocks.length} motion blocks`);

    for (const block of motionBlocks) {
      try {
        const motion = this.parseMotionBlock(block);
        if (motion) {
          motions.push(motion);
        }
      } catch (error) {
        console.error('Error parsing motion block:', error);
      }
    }

    console.log(`✅ Successfully parsed ${motions.length} motions`);
    return motions;
  }

  private splitIntoBillBlocks(content: string): string[] {
    const blocks: string[] = [];
    
    const billTitlePattern = /Rang\s+Undang[- ]undang\s+[^\n]+/gi;
    const matches = Array.from(content.matchAll(billTitlePattern));

    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];
      
      if (currentMatch.index !== undefined) {
        const start = currentMatch.index;
        const end = nextMatch?.index ?? content.length;
        const block = content.substring(start, end).trim();
        
        if (block.length > 50) {
          blocks.push(block);
        }
      }
    }

    if (blocks.length === 0 && content.length > 100) {
      blocks.push(content);
    }

    return blocks;
  }

  private splitIntoMotionBlocks(content: string): string[] {
    const blocks: string[] = [];
    
    const lines = content.split('\n');
    let currentBlock = '';
    let inMotionBlock = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      const isMotionStart = this.isMotionStart(trimmedLine);
      
      if (isMotionStart && currentBlock.length > 50) {
        blocks.push(currentBlock.trim());
        currentBlock = line;
        inMotionBlock = true;
      } else if (inMotionBlock || isMotionStart) {
        currentBlock += '\n' + line;
        inMotionBlock = true;
      }
    }

    if (currentBlock.length > 50) {
      blocks.push(currentBlock.trim());
    }

    if (blocks.length === 0 && content.length > 100) {
      blocks.push(content);
    }

    return blocks;
  }

  private isMotionStart(line: string): boolean {
    const patterns = [
      /^Tuan\s+[A-Z]/,
      /^Puan\s+[A-Z]/,
      /^Dato/i,
      /^Datuk/i,
      /^Dr\./,
      /^Yang\s+Berhormat/i,
      /mencadangkan/i,
      /mengusulkan/i
    ];

    return patterns.some(pattern => pattern.test(line));
  }

  private parseBillBlock(block: string): ParsedBillOrMotion | null {
    const titlePattern = /Rang\s+Undang[- ]undang\s+([^\n]+)/i;
    const titleMatch = block.match(titlePattern);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Bill';

    const billNumberPattern = /(?:Rang\s+Undang[- ]undang|Bill|R\.U\.)\s+(\d+)/i;
    const billNumberMatch = block.match(billNumberPattern);
    const billNumber = billNumberMatch ? billNumberMatch[1] : undefined;

    const { mpId, mpName, constituency } = this.extractSponsor(block);

    const status = this.extractStatus(block);

    const description = block.substring(0, 1000).trim();

    return {
      title,
      type: 'Bill',
      mpId,
      mpName,
      constituency,
      coSponsors: [],
      description,
      status,
      billNumber,
      rawText: block.substring(0, 2000)
    };
  }

  private parseMotionBlock(block: string): ParsedBillOrMotion | null {
    const titlePattern = /(?:mencadangkan|mengusulkan|usul)[\s:]+([^\n]+)/i;
    const titleMatch = block.match(titlePattern);
    const title = titleMatch ? titleMatch[1].trim().substring(0, 200) : 'Motion';

    const { mpId, mpName, constituency } = this.extractSponsor(block);

    const status = this.extractStatus(block);

    const description = block.substring(0, 1000).trim();

    return {
      title,
      type: 'Motion',
      mpId,
      mpName,
      constituency,
      coSponsors: [],
      description,
      status,
      rawText: block.substring(0, 2000)
    };
  }

  private extractSponsor(block: string): { mpId?: string; mpName?: string; constituency?: string } {
    // Try square brackets first [Constituency], then parentheses (Constituency)
    const sponsorPatternSquareBrackets = /(?:Tuan|Puan|Dato['']?|Datuk|Dr\.?|Yang Berhormat|Ir\.|Ts\.)\s+([^[\]:\n]+?)\s*\[([^\]]+)\]/i;
    const sponsorPatternParentheses = /(?:Tuan|Puan|Dato['']?|Datuk|Dr\.?|Yang Berhormat|Ir\.|Ts\.)\s+([^(:\n]+?)(?:\s*\(([^)]+)\))?/i;
    const sponsorMatch = block.match(sponsorPatternSquareBrackets) || block.match(sponsorPatternParentheses);

    if (!sponsorMatch) {
      return {};
    }

    const extractedName = sponsorMatch[1].trim();
    const extractedConstituency = sponsorMatch[2]?.trim();
    
    const matchedMp = this.findMpByName(extractedName, extractedConstituency);
    
    if (matchedMp) {
      return {
        mpId: matchedMp.id,
        mpName: matchedMp.name,
        constituency: matchedMp.constituency
      };
    }

    return {
      mpName: extractedName,
      constituency: extractedConstituency
    };
  }

  private extractStatus(block: string): string {
    if (/diluluskan|approved|passed/i.test(block)) {
      return 'Passed';
    } else if (/ditolak|rejected/i.test(block)) {
      return 'Rejected';
    } else if (/dibincangkan|under discussion|jawatankuasa|committee/i.test(block)) {
      return 'Under Discussion';
    } else {
      return 'Proposed';
    }
  }

  private findMpByName(name: string, constituency?: string): Mp | undefined {
    const normalizedName = this.normalizeName(name);
    
    if (constituency) {
      const normalizedConstituency = this.normalizeConstituency(constituency);
      const exactMatch = this.allMps.find(mp => 
        this.normalizeConstituency(mp.constituency) === normalizedConstituency &&
        this.normalizeName(mp.name).includes(normalizedName)
      );
      if (exactMatch) return exactMatch;
    }

    const nameMatch = this.allMps.find(mp => {
      const mpNormalized = this.normalizeName(mp.name);
      return mpNormalized.includes(normalizedName) || normalizedName.includes(mpNormalized);
    });

    return nameMatch;
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/^(tuan|puan|dato|datuk|dr\.|dr|yang berhormat)\s+/gi, '')
      .replace(/\s+(bin|binti|a\/l|a\/p)\s+/gi, ' ')
      .trim();
  }

  private normalizeConstituency(constituency: string): string {
    return constituency
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }
}
