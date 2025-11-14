import { Mp, HansardSpeaker } from '@shared/schema';
import { MPNameMatcher } from './mp-name-matcher';

type SpeakerMatchResult = 
  | { kind: 'matched'; speaker: HansardSpeaker; constituency: string }
  | { kind: 'unmatched'; name: string; constituency?: string }
  | { kind: 'skip' };

interface SpeakingInstance {
  mpId: string;
  mpName: string;
  constituency: string;
  instanceNumber: number;
  lineNumber: number;
}

export class HansardSpeakerParser {
  private mpNameMatcher: MPNameMatcher;
  private allMps: Mp[];
  
  // Common speaker patterns in Malaysian Hansard
  private readonly SPEAKER_PATTERNS = [
    // Pattern: "Datuk/Dato'/Tuan/etc [Full Name]: " (without constituency)
    // This must come FIRST to catch ministerial titles without constituencies
    /(?:Menteri|Timbalan Menteri|Datuk Seri|Dato' Sri|Datuk|Dato'|Tan Sri|Toh Puan|Tuan|Puan|Dr\.?|Yang Berhormat|Y\.Bhg\.|YB)\s+(?:Haji|Hajjah)?\s*([^:]{10,80}):\s+/gi,
    
    // Pattern: "[P###] Constituency - Name" or "[Constituency - Name]"
    /\[(?:P\d{3}\s+)?([A-Za-z\s]+?)\s*[-–]\s*([^\]]+)\]/gi,
    
    // Pattern: "Tuan/Puan/YB/Datuk [Name] ([Constituency]):"
    /(?:Tuan|Puan|Yang Berhormat|Y\.Bhg\.|Datuk|Dato'|Tan Sri|Toh Puan|YB|Dr\.?)\s+([^(:\[]+?)\s*\(([^)]+)\)\s*:/gi,
    
    // Pattern: "Yang Berhormat Name [Constituency]:"
    /Yang Berhormat\s+([^[:(]+?)\s*\[([^\]]+)\]\s*:/gi,
    
    // Pattern: All caps NAME followed by constituency in parens
    /^([A-Z\s]{3,})\s*\(([^)]+)\)\s*:/gm,
    
    // Pattern: Simple "Name (Constituency):" at line start
    /^([A-Z][a-z]+(?:\s+[A-Z](?:[a-z]+|\.))(?:\s+[A-Z][a-z]+)*)\s*\(([^)]+)\)\s*:/gm
  ];

  constructor(allMps: Mp[]) {
    this.allMps = allMps;
    this.mpNameMatcher = new MPNameMatcher(allMps);
  }

  /**
   * Parse speaker information from Hansard transcript
   * Returns array of speakers in order of appearance
   */
  public extractSpeakers(transcript: string): { 
    speakers: Array<{
      mpId: string;
      mpName: string;
      constituency: string;
      speakingOrder: number;
    }>; 
    allInstances: SpeakingInstance[];
    unmatched: string[] 
  } {
    const speakerMap = new Map<string, { mpId: string; mpName: string; constituency: string; speakingOrder: number }>();
    const allInstances: SpeakingInstance[] = [];
    const unmatchedSpeakers: string[] = [];
    const instanceCountMap = new Map<string, number>(); // Track instance number per MP
    let speakingOrder = 1;

    // Process in chunks to manage memory
    const chunkSize = 50000;
    for (let i = 0; i < transcript.length; i += chunkSize) {
      const chunk = transcript.substring(i, i + chunkSize);
      const offset = i;
      speakingOrder = this.extractSpeakersFromChunk(
        chunk, 
        speakerMap, 
        allInstances,
        instanceCountMap,
        speakingOrder, 
        unmatchedSpeakers,
        offset,
        transcript
      );
    }

    // Convert map to array and sort by speaking order
    const speakers = Array.from(speakerMap.values()).sort(
      (a, b) => a.speakingOrder - b.speakingOrder
    );

    console.log(`✅ Extracted ${speakers.length} unique speakers from transcript`);
    if (unmatchedSpeakers.length > 0) {
      console.log(`⚠️  ${unmatchedSpeakers.length} speakers could not be matched to MPs`);
    }
    
    return { speakers, allInstances, unmatched: unmatchedSpeakers };
  }

  private extractSpeakersFromChunk(
    chunk: string,
    speakerMap: Map<string, { mpId: string; mpName: string; constituency: string; speakingOrder: number }>,
    allInstances: SpeakingInstance[],
    instanceCountMap: Map<string, number>,
    speakingOrder: number,
    unmatchedSpeakers: string[],
    offset: number,
    fullTranscript: string
  ): number {
    // Try each pattern
    for (const pattern of this.SPEAKER_PATTERNS) {
      // Create new regex instance to reset lastIndex
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      
      while ((match = regex.exec(chunk)) !== null) {
        const result = this.processSpeakerMatch(match, speakingOrder);
        
        if (result.kind === 'matched') {
          const mpId = result.speaker.mpId;
          const speakerWithConstituency = {
            ...result.speaker,
            constituency: result.constituency
          };
          
          // Add to unique speakers map if first occurrence
          if (!speakerMap.has(mpId)) {
            speakerMap.set(mpId, speakerWithConstituency);
            speakingOrder++;
          }
          
          // Track instance number for this MP
          const currentInstanceCount = instanceCountMap.get(mpId) || 0;
          instanceCountMap.set(mpId, currentInstanceCount + 1);
          
          // Calculate line number from position
          const position = offset + (match.index || 0);
          const lineNumber = this.calculateLineNumber(fullTranscript, position);
          
          // Always track this speaking instance
          allInstances.push({
            mpId: result.speaker.mpId,
            mpName: result.speaker.mpName,
            constituency: result.constituency,
            instanceNumber: currentInstanceCount + 1,
            lineNumber
          });
        } else if (result.kind === 'unmatched') {
          // Track unmatched speakers (avoid duplicates)
          const unmatchedKey = result.constituency 
            ? `${result.name} (${result.constituency})`
            : result.name;
          if (!unmatchedSpeakers.includes(unmatchedKey)) {
            unmatchedSpeakers.push(unmatchedKey);
          }
        }
      }
    }
    
    return speakingOrder;
  }

  private calculateLineNumber(transcript: string, position: number): number {
    // Count newlines up to the position
    let lineNumber = 1;
    for (let i = 0; i < Math.min(position, transcript.length); i++) {
      if (transcript[i] === '\n') {
        lineNumber++;
      }
    }
    return lineNumber;
  }

  private processSpeakerMatch(match: RegExpMatchArray, speakingOrder: number): SpeakerMatchResult {
    let name = '';
    let constituency = '';

    // Different patterns have different capture groups
    if (match[1] && match[2]) {
      // Could be [Name, Constituency] or [Constituency, Name]
      const part1 = this.cleanText(match[1]);
      const part2 = this.cleanText(match[2]);
      
      // Check if part1 looks like a constituency (usually shorter, title case)
      const part1IsConstituency = this.looksLikeConstituency(part1);
      
      if (part1IsConstituency) {
        constituency = part1;
        name = part2;
      } else {
        name = part1;
        constituency = part2;
      }
    } else if (match[1]) {
      // Only name captured
      name = this.cleanText(match[1]);
    }

    if (!name) return { kind: 'skip' };

    // Try to match MP
    const mp = this.matchMp(name, constituency);
    
    if (mp) {
      return {
        kind: 'matched',
        speaker: {
          mpId: mp.id,
          mpName: mp.name,
          speakingOrder
        },
        constituency: mp.constituency
      };
    }

    // Could not match - return unmatched
    return {
      kind: 'unmatched',
      name,
      constituency: constituency || undefined
    };
  }

  private matchMp(name: string, constituency?: string): Mp | null {
    // First try: Use MPNameMatcher
    const mpIds = this.mpNameMatcher.matchNames([name]);
    if (mpIds.length > 0) {
      return this.allMps.find(mp => mp.id === mpIds[0]) || null;
    }

    // Second try: Match by constituency if provided
    if (constituency) {
      const mpByConstituency = this.allMps.find(mp => 
        this.normalizeConstituency(mp.constituency) === this.normalizeConstituency(constituency)
      );
      if (mpByConstituency) {
        return mpByConstituency;
      }
    }

    // Third try: Fuzzy match on name
    const normalizedName = this.normalizeName(name);
    const mpByFuzzyName = this.allMps.find(mp => {
      const mpNormalized = this.normalizeName(mp.name);
      return mpNormalized.includes(normalizedName) || normalizedName.includes(mpNormalized);
    });

    if (mpByFuzzyName) {
      console.log(`  🔍 Fuzzy matched: "${name}" → ${mpByFuzzyName.name}`);
      return mpByFuzzyName;
    }

    // Log unmatched for manual review
    console.log(`  ❌ Could not match speaker: "${name}"${constituency ? ` (${constituency})` : ''}`);
    return null;
  }

  private cleanText(text: string): string {
    return text.trim()
      .replace(/\s+/g, ' ')
      .replace(/^[:\-\s]+|[:\-\s]+$/g, '');
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/^(tuan|puan|datuk|dato'|tan sri|yb|dr\.?)\s+/gi, '')
      .replace(/\s+(bin|binti|a\/l|a\/p)\s+/gi, ' ')
      .trim();
  }

  private normalizeConstituency(constituency: string): string {
    return constituency
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z]/g, '');
  }

  private looksLikeConstituency(text: string): boolean {
    // Constituencies are usually shorter and don't contain common name indicators
    const nameIndicators = ['bin', 'binti', 'a/l', 'a/p', '@'];
    const hasNameIndicator = nameIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    );
    
    // Constituencies are typically 1-3 words
    const wordCount = text.split(/\s+/).length;
    
    return !hasNameIndicator && wordCount <= 3;
  }
}
