export interface HansardSection {
  type: 'questions_oral' | 'questions_written' | 'questions_minister' | 'bill' | 'motion' | 'other';
  title: string;
  content: string;
  startPosition: number;
  endPosition: number;
}

export class HansardSectionParser {
  
  parseSections(fullText: string): HansardSection[] {
    const sections: HansardSection[] = [];
    
    const sectionPatterns = [
      {
        type: 'questions_minister' as const,
        pattern: /WAKTU\s+PERTANYAAN[- ]PERTANYAAN\s+MENTERI/i,
        title: 'WAKTU PERTANYAAN-PERTANYAAN MENTERI'
      },
      {
        type: 'questions_oral' as const,
        pattern: /PERTANYAAN[- ]PERTANYAAN\s+BAGI\s+JAWAB\s+LISAN/i,
        title: 'PERTANYAAN-PERTANYAAN BAGI JAWAB LISAN'
      },
      {
        type: 'questions_written' as const,
        pattern: /PERTANYAAN[- ]PERTANYAAN\s+BAGI\s+JAWAB\s+BERTULIS/i,
        title: 'PERTANYAAN-PERTANYAAN BAGI JAWAB BERTULIS'
      },
      {
        type: 'bill' as const,
        pattern: /RANG\s+UNDANG[- ]UNDANG/i,
        title: 'RANG UNDANG-UNDANG'
      },
      {
        type: 'motion' as const,
        pattern: /^USUL[:\s]/im,
        title: 'USUL'
      }
    ];

    const sectionMatches: Array<{
      type: HansardSection['type'];
      title: string;
      position: number;
      matchLength: number;
    }> = [];

    for (const { type, pattern, title } of sectionPatterns) {
      const matches = Array.from(fullText.matchAll(new RegExp(pattern, 'gi')));
      for (const match of matches) {
        if (match.index !== undefined) {
          sectionMatches.push({
            type,
            title,
            position: match.index,
            matchLength: match[0].length
          });
        }
      }
    }

    sectionMatches.sort((a, b) => a.position - b.position);

    for (let i = 0; i < sectionMatches.length; i++) {
      const currentMatch = sectionMatches[i];
      const nextMatch = sectionMatches[i + 1];
      
      const startPosition = currentMatch.position;
      const endPosition = nextMatch ? nextMatch.position : fullText.length;
      
      const content = fullText.substring(startPosition, endPosition).trim();

      if (content.length > currentMatch.matchLength + 100) {
        sections.push({
          type: currentMatch.type,
          title: currentMatch.title,
          content,
          startPosition,
          endPosition
        });
      }
    }

    console.log(`📑 Found ${sections.length} distinct sections in Hansard`);
    for (const section of sections) {
      console.log(`   - ${section.title} (${section.type}): ${section.content.length} chars`);
    }

    return sections;
  }

  extractQuestionsSections(fullText: string): HansardSection[] {
    const allSections = this.parseSections(fullText);
    return allSections.filter(s => 
      s.type === 'questions_oral' || 
      s.type === 'questions_written' || 
      s.type === 'questions_minister'
    );
  }

  extractBillsSections(fullText: string): HansardSection[] {
    const allSections = this.parseSections(fullText);
    return allSections.filter(s => s.type === 'bill');
  }

  extractMotionsSections(fullText: string): HansardSection[] {
    const allSections = this.parseSections(fullText);
    return allSections.filter(s => s.type === 'motion');
  }
}
