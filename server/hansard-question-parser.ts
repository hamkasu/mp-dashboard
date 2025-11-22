import { Mp } from '@shared/schema';

export interface ParsedQuestion {
  questionNumber?: string;
  mpId?: string;
  mpName?: string;
  constituency?: string;
  ministry: string;
  questionText: string;
  topic: string;
  answerText?: string;
  answerStatus: 'answered' | 'pending' | 'unknown';
  questionType: 'oral' | 'written' | 'minister';
  rawText: string;
}

export class HansardQuestionParser {
  private allMps: Mp[];

  constructor(allMps: Mp[]) {
    this.allMps = allMps;
  }

  parseQuestions(sectionContent: string, questionType: 'oral' | 'written' | 'minister'): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];

    const questionBlocks = this.splitIntoQuestionBlocks(sectionContent);
    
    console.log(`📝 Parsing ${questionBlocks.length} question blocks (type: ${questionType})`);

    for (const block of questionBlocks) {
      try {
        const question = this.parseQuestionBlock(block, questionType);
        if (question) {
          questions.push(question);
        }
      } catch (error) {
        console.error('Error parsing question block:', error);
      }
    }

    console.log(`✅ Successfully parsed ${questions.length} questions`);
    console.log(`   - With MP match: ${questions.filter(q => q.mpId).length}`);
    console.log(`   - Without MP match: ${questions.filter(q => !q.mpId).length}`);

    return questions;
  }

  private splitIntoQuestionBlocks(content: string): string[] {
    const blocks: string[] = [];
    
    const lines = content.split('\n');
    let currentBlock = '';
    let inQuestionBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const isQuestionStart = this.isQuestionStart(line);
      
      if (isQuestionStart && currentBlock.length > 50) {
        blocks.push(currentBlock.trim());
        currentBlock = line;
        inQuestionBlock = true;
      } else if (inQuestionBlock) {
        currentBlock += '\n' + line;
      } else if (isQuestionStart) {
        currentBlock = line;
        inQuestionBlock = true;
      }
    }

    if (currentBlock.length > 50) {
      blocks.push(currentBlock.trim());
    }

    return blocks;
  }

  private isQuestionStart(line: string): boolean {
    const patterns = [
      /^\d+\.\s+/,
      /^Soalan\s+\d+/i,
      /^Question\s+\d+/i,
      /^Tuan\s+[A-Z]/,
      /^Puan\s+[A-Z]/,
      /^Dato/i,
      /^Datuk/i,
      /^Dr\./,
      /^Yang\s+Berhormat/i
    ];

    return patterns.some(pattern => pattern.test(line));
  }

  private parseQuestionBlock(block: string, questionType: 'oral' | 'written' | 'minister'): ParsedQuestion | null {
    const questionNumberMatch = block.match(/(?:Soalan|Question)?\s*(\d+)[.:]/i);
    const questionNumber = questionNumberMatch ? questionNumberMatch[1] : undefined;

    // Try square brackets first [Constituency], then parentheses (Constituency)
    const mpPatternSquareBrackets = /(?:Tuan|Puan|Dato['']?|Datuk|Dr\.?|Yang Berhormat|Ir\.|Ts\.)\s+([^[\]:\n]+?)\s*\[([^\]]+)\](?:\s*:|\s+minta)/i;
    const mpPatternParentheses = /(?:Tuan|Puan|Dato['']?|Datuk|Dr\.?|Yang Berhormat|Ir\.|Ts\.)\s+([^(:\n]+?)(?:\s*\(([^)]+)\))?(?:\s*:|\s+minta)/i;
    const mpMatch = block.match(mpPatternSquareBrackets) || block.match(mpPatternParentheses);
    
    let mpId: string | undefined;
    let mpName: string | undefined;
    let constituency: string | undefined;

    if (mpMatch) {
      const extractedName = mpMatch[1].trim();
      const extractedConstituency = mpMatch[2]?.trim();
      
      const matchedMp = this.findMpByName(extractedName, extractedConstituency);
      if (matchedMp) {
        mpId = matchedMp.id;
        mpName = matchedMp.name;
        constituency = matchedMp.constituency;
      } else {
        mpName = extractedName;
        constituency = extractedConstituency;
      }
    }

    const ministryPattern = /(?:Menteri|Minister|Kementerian)\s+([^:\n.]+)/i;
    const ministryMatch = block.match(ministryPattern);
    const ministry = ministryMatch ? ministryMatch[1].trim() : 'Unknown Ministry';

    const questionTextPattern = /(?:minta|bertanya|meminta)[\s\S]*?(?=Jawapan|Menteri|$)/i;
    const questionTextMatch = block.match(questionTextPattern);
    const questionText = questionTextMatch ? questionTextMatch[0].trim() : block.substring(0, 500);

    const answerPattern = /(?:Jawapan|Answer)[\s\S]+/i;
    const answerMatch = block.match(answerPattern);
    const answerText = answerMatch ? answerMatch[0].trim() : undefined;
    const answerStatus = answerText ? 'answered' : 'pending';

    const topic = this.extractTopic(questionText);

    return {
      questionNumber,
      mpId,
      mpName,
      constituency,
      ministry,
      questionText: questionText.substring(0, 2000),
      topic,
      answerText: answerText?.substring(0, 5000),
      answerStatus: answerStatus as 'answered' | 'pending',
      questionType,
      rawText: block.substring(0, 3000)
    };
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

  private extractTopic(questionText: string): string {
    const firstSentence = questionText.split(/[.!?]/)[0];
    const words = firstSentence.split(/\s+/).slice(0, 10);
    const topic = words.join(' ').substring(0, 100);
    return topic || 'General Question';
  }
}
