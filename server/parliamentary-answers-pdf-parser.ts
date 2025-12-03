/**
 * Copyright by Calmic Sdn Bhd
 *
 * Parliamentary Oral Answers PDF Parser
 * Parses jawapan lisan PDFs to extract question details, questioner constituency, ministry, etc.
 */

import { Mp } from '@shared/schema';

interface ParsedOralAnswer {
  questionNumber?: string;
  questionText?: string;
  answerText?: string;
  questionerName?: string;
  questionerConstituency?: string;
  questionerMpId?: string;
  answererName?: string;
  answererMinistry?: string;
  dateAsked?: string;
  sessionInfo?: string;
}

export class ParliamentaryAnswersPdfParser {
  private allMps: Mp[];

  constructor(allMps: Mp[]) {
    this.allMps = allMps;
  }

  async parsePdf(pdfBuffer: Buffer, filename?: string): Promise<ParsedOralAnswer | null> {
    console.log('📄 Starting Parliamentary Oral Answer PDF parsing...');
    if (filename) {
      console.log(`📄 Filename: ${filename}`);
    }

    try {
      // Extract text from PDF using dynamic import
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: pdfBuffer });
      const result = await parser.getText();
      const fullText = result.text;

      console.log(`📄 Extracted ${fullText.length} characters from PDF`);

      // Extract session info first to validate it's Parlimen 15
      const sessionInfo = this.extractSessionInfo(fullText);

      // Validate it's from Parlimen 15
      if (!this.isParlimen15(sessionInfo, fullText)) {
        console.log('⚠️  Skipping - Not from Parlimen 15');
        console.log(`   - Session Info: ${sessionInfo || 'N/A'}`);
        return null;
      }

      // Parse the components
      const parsed: ParsedOralAnswer = {
        questionNumber: this.extractQuestionNumber(fullText),
        questionText: this.extractQuestionText(fullText),
        answerText: this.extractAnswerText(fullText),
        sessionInfo,
        dateAsked: this.extractDate(fullText),
      };

      // Extract questioner information
      const questioner = this.extractQuestioner(fullText);
      parsed.questionerName = questioner.name;
      parsed.questionerConstituency = questioner.constituency;
      parsed.questionerMpId = questioner.mpId;

      // Extract answerer information
      const answerer = this.extractAnswerer(fullText);
      parsed.answererName = answerer.name;
      parsed.answererMinistry = answerer.ministry;

      console.log('✅ Parliamentary Oral Answer parsing complete (Parlimen 15)');
      console.log(`   - Session: ${parsed.sessionInfo || 'N/A'}`);
      console.log(`   - Question Number: ${parsed.questionNumber || 'N/A'}`);
      console.log(`   - Questioner: ${parsed.questionerName || 'N/A'} (${parsed.questionerConstituency || 'N/A'})`);
      console.log(`   - Answerer: ${parsed.answererName || 'N/A'} (${parsed.answererMinistry || 'N/A'})`);
      console.log(`   - Date: ${parsed.dateAsked || 'N/A'}`);

      return parsed;
    } catch (error: any) {
      console.error('❌ Error parsing Parliamentary Oral Answer PDF:', error.message);
      throw error;
    }
  }

  /**
   * Extract question number (e.g., "S.1", "S.123", etc.)
   */
  private extractQuestionNumber(text: string): string | undefined {
    // Pattern: S.123 or Soalan No. 123 or similar
    const patterns = [
      /S\.?\s*(\d+)/i,
      /Soalan\s+No\.?\s*(\d+)/i,
      /Question\s+No\.?\s*(\d+)/i,
      /No\.?\s*Soalan\s*[:.]?\s*(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return `S.${match[1]}`;
      }
    }

    return undefined;
  }

  /**
   * Extract question text
   */
  private extractQuestionText(text: string): string | undefined {
    // Look for patterns like "Soalan:" or "Question:" followed by text
    const patterns = [
      /(?:Soalan|SOALAN|Question|QUESTION)\s*[:–-]\s*(.*?)(?=(?:Jawapan|JAWAPAN|Answer|ANSWER)\s*[:–-]|$)/is,
      /(?:bertanya|minta|tanya).*?(?=(?:Jawapan|Menteri|Minister))/is,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const questionText = match[1].trim();
        // Clean up the text
        if (questionText.length > 20 && questionText.length < 2000) {
          return questionText.substring(0, 1000); // Limit to 1000 chars
        }
      }
    }

    return undefined;
  }

  /**
   * Extract answer text
   */
  private extractAnswerText(text: string): string | undefined {
    // Look for patterns like "Jawapan:" or "Answer:" followed by text
    const patterns = [
      /(?:Jawapan|JAWAPAN|Answer|ANSWER)\s*[:–-]\s*(.*?)$/is,
      /(?:Menteri|Minister).*?(?:menjawab|menyatakan|berkata)[:–-]\s*(.*?)$/is,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const answerText = match[1].trim();
        // Clean up the text
        if (answerText.length > 20 && answerText.length < 5000) {
          return answerText.substring(0, 2000); // Limit to 2000 chars
        }
      }
    }

    return undefined;
  }

  /**
   * Extract questioner name and constituency
   */
  private extractQuestioner(text: string): { name?: string; constituency?: string; mpId?: string } {
    // Pattern: "Tuan [Name] [Constituency] bertanya" or similar
    const patterns = [
      /(?:Tuan|Puan|Dato'?|Datuk)\s+([A-Z][^[\n]+?)\s*\[([^\]]+)\]/i,
      /(?:Asked by|Ditanya oleh)\s*[:–-]?\s*([A-Z][^[\n]+?)\s*\[([^\]]+)\]/i,
      /([A-Z][A-Za-z\s.']+?)\s*\[([^\]]+)\]\s*(?:bertanya|minta)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const name = match[1].trim();
        const constituency = match[2].trim();

        // Try to match to an MP
        const mp = this.findMpByNameAndConstituency(name, constituency);

        return {
          name,
          constituency,
          mpId: mp?.id,
        };
      }
    }

    return {};
  }

  /**
   * Extract answerer name and ministry
   */
  private extractAnswerer(text: string): { name?: string; ministry?: string } {
    // Pattern: "Menteri [Ministry]", "Minister of [Ministry]", etc.
    const ministryPatterns = [
      /(?:Menteri|Minister)\s+([A-Z][^[\n]+?)(?:\[|bertangg?ungjawab|answered)/i,
      /(?:Jawapan|Answer)\s*[:–-]?\s*(?:Menteri|Minister)\s+([^[\n]+?)(?:\[|$)/i,
      /Kementerian\s+([A-Z][^[\n]+?)(?:\[|$)/i,
      /Ministry\s+of\s+([A-Z][^[\n]+?)(?:\[|$)/i,
    ];

    for (const pattern of ministryPatterns) {
      const match = text.match(pattern);
      if (match) {
        const ministry = match[1].trim();

        // Try to extract minister name
        const namePattern = /(?:Dato'?|Datuk|Y\.?B\.?)\s+([A-Z][A-Za-z\s.']+?)(?:\[|,|–|-|$)/i;
        const nameMatch = text.match(namePattern);

        return {
          ministry,
          name: nameMatch ? nameMatch[1].trim() : undefined,
        };
      }
    }

    return {};
  }

  /**
   * Extract session info (e.g., "Parlimen 15, Penggal 1, Mesyuarat 1")
   */
  private extractSessionInfo(text: string): string | undefined {
    const patterns = [
      /(Parlimen\s+\d+,?\s*Penggal\s+\d+,?\s*Mesyuarat\s+(?:Ke\s+)?\d+)/i,
      /(Parliament\s+\d+,?\s*Session\s+\d+,?\s*Meeting\s+\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Check if the document is from Parlimen 15 (15th Parliament)
   */
  private isParlimen15(sessionInfo: string | undefined, fullText: string): boolean {
    // Check session info first
    if (sessionInfo) {
      if (sessionInfo.match(/parlimen\s+15/i) || sessionInfo.match(/parliament\s+15/i)) {
        return true;
      }
      // If it explicitly mentions a different parliament number, reject it
      if (sessionInfo.match(/parlimen\s+(?!15)\d+/i) || sessionInfo.match(/parliament\s+(?!15)\d+/i)) {
        return false;
      }
    }

    // Check full text for Parlimen 15 mentions
    const parlimen15Patterns = [
      /parlimen\s+(?:ke[\s-]?)?15/i,
      /parliament\s+(?:ke[\s-]?)?15/i,
      /15th\s+parliament/i,
      /p\.?15/i, // Common abbreviation
    ];

    for (const pattern of parlimen15Patterns) {
      if (fullText.match(pattern)) {
        return true;
      }
    }

    // Check for other parliament numbers that would exclude this (1-14, 16-20)
    const otherParlimenPatterns = [
      /parlimen\s+(?:ke[\s-]?)?([1-9]|1[0-4]|1[6-9]|20)/i,
      /parliament\s+(?:ke[\s-]?)?([1-9]|1[0-4]|1[6-9]|20)/i,
    ];

    for (const pattern of otherParlimenPatterns) {
      if (fullText.match(pattern)) {
        return false;
      }
    }

    // If we can't determine, assume it's not Parlimen 15 (safer to exclude)
    return false;
  }

  /**
   * Extract date
   */
  private extractDate(text: string): string | undefined {
    // Look for date patterns in various formats
    const patterns = [
      /(\d{1,2}\s+(?:Jan(?:uari)?|Feb(?:ruari)?|Mac|Apr(?:il)?|Mei|Jun|Jul(?:ai)?|Og(?:os)?|Sep(?:tember)?|Okt(?:ober)?|Nov(?:ember)?|Dis(?:ember)?)\s+\d{4})/i,
      /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/,
      /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Find MP by constituency (primary) and name (fallback)
   * Prioritizes constituency matching as it's more reliable
   */
  private findMpByNameAndConstituency(name: string, constituency: string): Mp | undefined {
    const normalizedConstituency = this.normalizeConstituency(constituency);

    // Strategy 1: Exact constituency match (most reliable)
    const mpsByConstituency = this.allMps.filter(mp =>
      this.normalizeConstituency(mp.constituency) === normalizedConstituency
    );

    if (mpsByConstituency.length === 1) {
      // Perfect match - one MP per constituency
      return mpsByConstituency[0];
    }

    if (mpsByConstituency.length > 1) {
      // Multiple MPs in same constituency (rare) - use name as tiebreaker
      console.log(`   ⚠️  Multiple MPs found for constituency: ${constituency}`);
      const normalizedName = this.normalizeName(name);
      const mpByName = mpsByConstituency.find(mp =>
        this.normalizeName(mp.name).includes(normalizedName) ||
        normalizedName.includes(this.normalizeName(mp.name))
      );
      if (mpByName) return mpByName;
      // Return first match if name matching fails
      return mpsByConstituency[0];
    }

    // Strategy 2: Fuzzy constituency match (handle slight variations)
    const fuzzyConstituencyMatch = this.allMps.find(mp => {
      const mpNormalizedConstituency = this.normalizeConstituency(mp.constituency);
      // Check if constituencies are similar (allowing for minor differences)
      return (
        mpNormalizedConstituency.includes(normalizedConstituency) ||
        normalizedConstituency.includes(mpNormalizedConstituency) ||
        this.calculateSimilarity(mpNormalizedConstituency, normalizedConstituency) > 0.8
      );
    });

    if (fuzzyConstituencyMatch) {
      console.log(`   ℹ️  Fuzzy constituency match: "${constituency}" → "${fuzzyConstituencyMatch.constituency}"`);
      return fuzzyConstituencyMatch;
    }

    // Strategy 3: Name matching as last resort (least reliable)
    // Only use this if constituency matching completely failed
    console.log(`   ⚠️  No constituency match for: ${constituency}, trying name match as fallback`);
    const normalizedName = this.normalizeName(name);
    const mpByName = this.allMps.find(mp => {
      const mpNormalizedName = this.normalizeName(mp.name);
      return (
        mpNormalizedName.includes(normalizedName) ||
        normalizedName.includes(mpNormalizedName)
      );
    });

    if (mpByName) {
      console.log(`   ℹ️  Matched by name: "${name}" → ${mpByName.name} [${mpByName.constituency}]`);
    }

    return mpByName;
  }

  /**
   * Calculate string similarity using Levenshtein distance (normalized)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/dato'?|datuk|tan sri|tun|dr\.?|ir\.?|prof\.?|tuan|puan|y\.?b\.?/gi, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeConstituency(constituency: string): string {
    return constituency
      .toLowerCase()
      .replace(/\bp\.?\s*p\.?\s*/gi, '') // Remove "P.P." (Parlimen)
      .replace(/\bp\.\s*(\d+)/gi, '') // Remove "P.123" patterns
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
