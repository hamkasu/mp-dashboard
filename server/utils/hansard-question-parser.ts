export interface ParsedQuestion {
  mpName: string;
  constituency: string;
  questionText: string;
  questionNumber?: string;
  lineNumber: number;
}

export interface HansardParseResult {
  sessionDate: string;
  sessionNumber: string;
  parliamentTerm: string;
  sitting: string;
  questions: ParsedQuestion[];
  uniqueConstituencies: Set<string>;
  totalQuestions: number;
}

/**
 * Parses Hansard PDF to extract parliamentary questions and constituency information
 */
export class HansardQuestionParser {

  /**
   * Parse PDF buffer and extract questions
   */
  async parsePdf(pdfBuffer: Buffer): Promise<HansardParseResult> {
    // Use dynamic import for CommonJS module compatibility
    const pdfParse = await import('pdf-parse').then(m => m.default || m);
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    return this.parseText(text);
  }

  /**
   * Parse text content and extract questions
   */
  parseText(text: string): HansardParseResult {
    const lines = text.split('\n');
    
    // Extract session metadata
    const sessionInfo = this.extractSessionInfo(text);
    
    // Extract questions
    const questions = this.extractQuestions(lines);
    
    // Get unique constituencies
    const uniqueConstituencies = new Set(questions.map(q => q.constituency));
    
    return {
      ...sessionInfo,
      questions,
      uniqueConstituencies,
      totalQuestions: questions.length,
    };
  }

  /**
   * Extract session information from header
   */
  private extractSessionInfo(text: string): {
    sessionDate: string;
    sessionNumber: string;
    parliamentTerm: string;
    sitting: string;
  } {
    const lines = text.split('\n');
    
    // Look for session number pattern: "Bil. 67" or "Bil. 68"
    const sessionNumberMatch = text.match(/Bil\.\s+(\d+)/);
    const sessionNumber = sessionNumberMatch ? sessionNumberMatch[1] : 'Unknown';
    
    // Look for date pattern: "17 November 2025" or "18 November 2025"
    const dateMatch = text.match(/(\d{1,2}\s+\w+\s+\d{4})/);
    const sessionDate = dateMatch ? dateMatch[1] : 'Unknown';
    
    // Look for parliament term: "PARLIMEN KELIMA BELAS"
    const parliamentMatch = text.match(/PARLIMEN\s+(.*?)(?=\n|PENGGAL)/);
    const parliamentTerm = parliamentMatch ? parliamentMatch[1].trim() : '15';
    
    // Look for sitting: "PENGGAL KEEMPAT"
    const sittingMatch = text.match(/PENGGAL\s+(.*?)(?=\n|MESYUARAT)/);
    const sitting = sittingMatch ? sittingMatch[1].trim() : 'Unknown';
    
    return {
      sessionDate,
      sessionNumber,
      parliamentTerm,
      sitting,
    };
  }

  /**
   * Extract questions from text lines
   * Matches patterns like:
   * - "Tuan Haji Ahmad Fadhli bin Shaari [Pasir Mas]:"
   * - "Ir. Ts. Zahir bin Hassan [Wangsa Maju] minta Menteri..."
   */
  private extractQuestions(lines: string[]): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];
    
    // Pattern to match MP name and constituency
    // Matches: Honorific? Name [Constituency]: or Name [Constituency] minta...
    const mpPattern = /^(\d+\.?\s+)?(?:Tuan|Puan|Dato['']?|Datuk|Tan Sri|Dr\.|Ir\.|Ts\.|Kapten|Senator|Komander|Timbalan|Menteri|Perdana|Yang di-Pertua)\s+(.+?)\s+\[([^\]]+)\](?::|\s+minta)/i;
    
    let currentQuestion: ParsedQuestion | null = null;
    let questionText = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and page numbers
      if (!line || /^DR\.\s+\d{2}\.\d{2}\.\d{4}/.test(line) || /^\d+$/.test(line)) {
        continue;
      }
      
      const match = line.match(mpPattern);
      
      if (match) {
        // Save previous question if exists
        if (currentQuestion && questionText) {
          currentQuestion.questionText = this.cleanQuestionText(questionText);
          questions.push(currentQuestion);
        }
        
        // Start new question
        const questionNumber = match[1]?.trim();
        const mpName = match[2].trim();
        const constituency = match[3].trim();
        
        currentQuestion = {
          mpName: this.cleanMpName(mpName),
          constituency: this.cleanConstituency(constituency),
          questionNumber,
          questionText: '',
          lineNumber: i + 1,
        };
        
        // Start collecting question text from this line
        questionText = line.substring(match[0].length).trim();
      } else if (currentQuestion) {
        // Continue collecting question text
        // Stop if we hit certain markers
        if (line.match(/^(Timbalan Yang di-Pertua|Tuan Yang di-Pertua|Dato['']? Yang di-Pertua)/)) {
          // This is a response marker, save current question
          if (questionText) {
            currentQuestion.questionText = this.cleanQuestionText(questionText);
            questions.push(currentQuestion);
            currentQuestion = null;
            questionText = '';
          }
        } else {
          questionText += ' ' + line;
        }
      }
    }
    
    // Save last question if exists
    if (currentQuestion && questionText) {
      currentQuestion.questionText = this.cleanQuestionText(questionText);
      questions.push(currentQuestion);
    }
    
    return questions;
  }

  /**
   * Clean MP name by removing extra titles and formatting
   */
  private cleanMpName(name: string): string {
    return name
      .replace(/\s+/g, ' ')
      .replace(/^\d+\.\s+/, '') // Remove leading numbers
      .trim();
  }

  /**
   * Clean constituency name
   */
  private cleanConstituency(constituency: string): string {
    return constituency
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Clean question text
   */
  private cleanQuestionText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/■\d+/, '') // Remove time markers like ■1010
      .replace(/\[[^\]]+\]$/, '') // Remove trailing [Speaker name]
      .trim();
  }

  /**
   * Get constituency statistics from parse result
   */
  getConstituencyStats(result: HansardParseResult): Array<{
    constituency: string;
    questionCount: number;
    mpNames: string[];
  }> {
    const stats = new Map<string, { count: number; mps: Set<string> }>();
    
    result.questions.forEach(q => {
      if (!stats.has(q.constituency)) {
        stats.set(q.constituency, { count: 0, mps: new Set() });
      }
      const stat = stats.get(q.constituency)!;
      stat.count++;
      stat.mps.add(q.mpName);
    });
    
    return Array.from(stats.entries()).map(([constituency, data]) => ({
      constituency,
      questionCount: data.count,
      mpNames: Array.from(data.mps),
    })).sort((a, b) => b.questionCount - a.questionCount);
  }
}
