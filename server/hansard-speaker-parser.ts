import { Mp, HansardSpeaker } from '@shared/schema';
import { MPNameMatcher } from './mp-name-matcher';
import { ConstituencyMatcher } from './constituency-matcher';

type SpeakerMatchResult = 
  | { kind: 'matched'; speaker: HansardSpeaker; constituency: string }
  | { kind: 'unmatched'; name: string; constituency?: string; failureReason: string; rawHeaderText: string; suggestedMpIds: string[] }
  | { kind: 'skip' };

interface SpeakingInstance {
  mpId: string;
  mpName: string;
  constituency: string;
  instanceNumber: number;
  lineNumber: number;
  headerPosition: number; // Absolute position in transcript where speaker header starts
  headerLength: number; // Length of the speaker header match
  capturedHeader: string; // The actual header text as it appeared in the transcript
  speechText?: string; // Actual speech content (populated after all headers are found)
}

export class HansardSpeakerParser {
  private mpNameMatcher: MPNameMatcher;
  private constituencyMatcher: ConstituencyMatcher;
  private allMps: Mp[];
  
  // Common speaker patterns in Malaysian Hansard
  // PRIORITY ORDER: Constituency-based patterns first (most reliable)
  private readonly SPEAKER_PATTERNS = [
    // Pattern 1: "Name [Constituency]:" - Most reliable, standardized format
    /([^[\n]+?)\s*\[([^\]]+)\]\s*:/gi,
    
    // Pattern 2: "Title Name (Constituency):" - Common format with parens
    /(?:Tuan|Puan|Yang Berhormat|Y\.Bhg\.|Datuk|Dato'|Tan Sri|Toh Puan|YB|Dr\.?|Senator|Kapten|Ir\.|Ts\.)\s+([^(:\[]+?)\s*\(([^)]+)\)\s*:/gi,
    
    // Pattern 3: "[Constituency - Name]:" or "[Name - Constituency]:"
    /^\[([^\]\n]{1,60})\s*[-–]\s*([^\]\n]{1,60})\]:/gm,
    
    // Pattern 4: Simple "Name (Constituency):" at line start
    /^([A-Z][^(:\[]+?)\s*\(([^)]+)\)\s*:/gm,
    
    // Pattern 5: "Title Name:" without constituency (lowest priority)
    /(?:Menteri|Timbalan Menteri|Datuk Seri|Dato' Sri|Datuk|Dato'|Tan Sri|Toh Puan|Tuan|Puan|Dr\.?|Yang Berhormat|Y\.Bhg\.|YB)\s+(?:Haji|Hajjah)?\s*([^:]{10,80}):\s+/gi,
  ];

  constructor(allMps: Mp[]) {
    this.allMps = allMps;
    this.mpNameMatcher = new MPNameMatcher(allMps);
    this.constituencyMatcher = new ConstituencyMatcher(allMps);
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
    unmatched: string[];
    unmatchedDetailed: Array<{
      extractedName: string;
      extractedConstituency?: string;
      failureReason: string;
      rawHeaderText: string;
      suggestedMpIds: string[];
      speakingOrder: number;
    }>
  } {
    const speakerMap = new Map<string, { mpId: string; mpName: string; constituency: string; speakingOrder: number }>();
    const allInstances: SpeakingInstance[] = [];
    const unmatchedSpeakers: string[] = [];
    const unmatchedDetailed: Array<{
      extractedName: string;
      extractedConstituency?: string;
      failureReason: string;
      rawHeaderText: string;
      suggestedMpIds: string[];
      speakingOrder: number;
    }> = [];
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
        transcript,
        unmatchedDetailed
      );
    }

    // Dedupe instances by headerPosition to avoid duplicates from multiple pattern matches
    const uniqueInstancesMap = new Map<number, SpeakingInstance>();
    for (const instance of allInstances) {
      if (!uniqueInstancesMap.has(instance.headerPosition)) {
        uniqueInstancesMap.set(instance.headerPosition, instance);
      }
    }
    const dedupedInstances = Array.from(uniqueInstancesMap.values());
    
    // Sort instances by position to extract speech text sequentially
    const sortedInstances = dedupedInstances.sort((a, b) => a.headerPosition - b.headerPosition);
    
    // Reassign instance numbers after deduplication to ensure correct sequential numbering per MP
    const mpInstanceNumbers = new Map<string, number>();
    for (const instance of sortedInstances) {
      const currentCount = mpInstanceNumbers.get(instance.mpId) || 0;
      instance.instanceNumber = currentCount + 1;
      mpInstanceNumbers.set(instance.mpId, currentCount + 1);
    }
    
    // Extract speech text for each instance
    for (let i = 0; i < sortedInstances.length; i++) {
      const currentInstance = sortedInstances[i];
      const nextInstance = sortedInstances[i + 1];
      
      // Find where this speech starts (after the speaker header, using header length)
      const speechStart = currentInstance.headerPosition + currentInstance.headerLength;
      
      // Find where this speech ends (at the next speaker or end of transcript)
      const speechEnd = nextInstance ? nextInstance.headerPosition : transcript.length;
      
      // Extract just the speech content (header is already excluded by using headerLength)
      const rawSpeech = transcript.substring(speechStart, speechEnd);
      
      // Clean up the speech text
      const cleanedSpeech = rawSpeech
        .trim()
        .replace(/\s+\n/g, '\n') // Remove trailing spaces before newlines
        .replace(/\n{3,}/g, '\n\n'); // Collapse multiple blank lines
      
      // Attach to instance (only use fallback if truly empty after trim)
      currentInstance.speechText = cleanedSpeech.length > 0 ? cleanedSpeech : '(No speech content captured)';
    }

    // Convert map to array and sort by speaking order
    const speakers = Array.from(speakerMap.values()).sort(
      (a, b) => a.speakingOrder - b.speakingOrder
    );

    console.log(`✅ Extracted ${speakers.length} unique speakers from transcript`);
    console.log(`✅ Extracted speech text for ${sortedInstances.length} speaking instances`);
    if (unmatchedSpeakers.length > 0) {
      console.log(`⚠️  ${unmatchedSpeakers.length} speakers could not be matched to MPs`);
    }
    
    return { speakers, allInstances: sortedInstances, unmatched: unmatchedSpeakers, unmatchedDetailed };
  }

  private extractSpeakersFromChunk(
    chunk: string,
    speakerMap: Map<string, { mpId: string; mpName: string; constituency: string; speakingOrder: number }>,
    allInstances: SpeakingInstance[],
    instanceCountMap: Map<string, number>,
    speakingOrder: number,
    unmatchedSpeakers: string[],
    offset: number,
    fullTranscript: string,
    unmatchedDetailed?: Array<{
      extractedName: string;
      extractedConstituency?: string;
      failureReason: string;
      rawHeaderText: string;
      suggestedMpIds: string[];
      speakingOrder: number;
    }>
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
          
          // Calculate line number and position
          const position = offset + (match.index || 0);
          const lineNumber = this.calculateLineNumber(fullTranscript, position);
          const headerLength = match[0].length;
          const capturedHeader = match[0].trim(); // Store the actual captured header text
          
          // Always track this speaking instance with header position, length, and captured text
          allInstances.push({
            mpId: result.speaker.mpId,
            mpName: result.speaker.mpName,
            constituency: result.constituency,
            instanceNumber: currentInstanceCount + 1,
            lineNumber,
            headerPosition: position,
            headerLength,
            capturedHeader
          });
        } else if (result.kind === 'unmatched') {
          // Track unmatched speakers (avoid duplicates)
          const unmatchedKey = result.constituency 
            ? `${result.name} (${result.constituency})`
            : result.name;
          if (!unmatchedSpeakers.includes(unmatchedKey)) {
            unmatchedSpeakers.push(unmatchedKey);
            
            // Add detailed information for database storage
            if (unmatchedDetailed) {
              unmatchedDetailed.push({
                extractedName: result.name,
                extractedConstituency: result.constituency,
                failureReason: result.failureReason,
                rawHeaderText: result.rawHeaderText,
                suggestedMpIds: result.suggestedMpIds,
                speakingOrder
              });
            }
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
      // For bracket patterns like [Name - Constituency]: or [Name [Constituency]]:
      // Assume match[2] is ALWAYS the constituency (most reliable)
      const part1 = this.cleanText(match[1]);
      const part2 = this.cleanText(match[2]);
      
      // Filter out non-constituency roles from part2 (common case)
      if (this.isNonConstituencyRole(part2)) {
        // Part2 is a role, not a constituency - treat as name only
        name = part1;
        constituency = '';
      } else {
        // Check if part1 is definitively a constituency (swap case)
        const part1AsMp = this.constituencyMatcher.getMpByConstituency(part1);
        
        if (part1AsMp) {
          // Rare case: Part1 is constituency, Part2 is name (swap needed)
          constituency = part1;
          name = part2;
        } else {
          // Normal case: Part1 is name, Part2 is constituency
          name = part1;
          constituency = part2;
        }
      }
    } else if (match[1]) {
      // Only name captured
      name = this.cleanText(match[1]);
    }

    if (!name) return { kind: 'skip' };

    // Filter out parliamentary officials (Speaker/Deputy Speaker) - they are not MPs
    if (this.isParliamentaryOfficial(name)) {
      return { kind: 'skip' };
    }

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

    // Could not match - return unmatched with diagnostic info
    const failureReason = this.getMatchFailureReason(name, constituency);
    const suggestedMpIds = this.getSuggestedMatches(name, constituency);
    
    return {
      kind: 'unmatched',
      name,
      constituency: constituency || undefined,
      failureReason,
      rawHeaderText: match[0],
      suggestedMpIds
    };
  }

  private matchMp(name: string, constituency?: string): Mp | null {
    // PRIORITY 1: Match by constituency if provided (most reliable)
    // Constituencies are standardized and less prone to variations than names
    if (constituency) {
      const mp = this.constituencyMatcher.getMpByConstituency(constituency);
      if (mp) {
        return mp;
      }
    }

    // PRIORITY 2: Use MPNameMatcher for exact name matching
    const mpIds = this.mpNameMatcher.matchNames([name]);
    if (mpIds.length > 0) {
      return this.allMps.find(mp => mp.id === mpIds[0]) || null;
    }

    // PRIORITY 3: Fuzzy match on name (last resort)
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
      .replace(/^[:\-\s]+|[:\-\s]+$/g, '')
      .replace(/[\[\]()]+$/g, '')  // Strip trailing brackets and parentheses
      .replace(/^[\[\]()]+/g, '')  // Strip leading brackets and parentheses
      .trim();
  }

  private isNonConstituencyRole(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    
    // Filter out non-constituency roles that appear in place of constituencies
    const nonConstituencyRoles = [
      // Parliamentary officials
      'yang di-pertua',
      'timbalan yang di-pertua',
      'speaker',
      'deputy speaker',
      'pengerusi',
      'tuan pengerusi',
      'puan pengerusi',
      
      // Ministers and deputies
      'menteri',
      'timbalan menteri',
      'menteri besar',
      'ketua menteri',
      
      // Generic titles
      'tuan',
      'puan',
      'datuk',
      'dato\'',
      'senator',
    ];
    
    return nonConstituencyRoles.some(role => normalized.includes(role));
  }

  private isParliamentaryOfficial(name: string): boolean {
    const normalized = name.toLowerCase().trim();
    
    // Filter out Speaker and Deputy Speaker references
    const officialTitles = [
      'yang di-pertua',
      'timbalan yang di-pertua',
      'speaker',
      'deputy speaker',
      'pengerusi',
      'tuan pengerusi',
      'puan pengerusi',
      'yang amat berhormat',
      'ramli bin dato\' mohd nor',
      'ramli mohd nor',
      'dato\' dr. ramli',
      'alice lau kiong yieng'
    ];
    
    // Check if it's just "Pengerusi" or "Tuan Pengerusi" without other context
    if (normalized === 'pengerusi' || normalized === 'tuan pengerusi' || normalized === 'puan pengerusi') {
      return true;
    }
    
    // Check if name contains any official title
    return officialTitles.some(title => normalized.includes(title));
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

  private getMatchFailureReason(name: string, constituency?: string): string {
    if (constituency) {
      // Had constituency but couldn't match
      const mpByConstituency = this.constituencyMatcher.getMpByConstituency(constituency);
      if (!mpByConstituency) {
        return `Constituency not recognized: "${constituency}"`;
      }
      return `Constituency matched but name mismatch (expected: ${mpByConstituency.name}, got: ${name})`;
    }
    
    // No constituency provided
    const mpIds = this.mpNameMatcher.matchNames([name]);
    if (mpIds.length > 0) {
      // This shouldn't happen since matchMp would have found it
      return 'Name matched but verification failed';
    }
    
    return 'No constituency provided and name not found in database';
  }

  private getSuggestedMatches(name: string, constituency?: string): string[] {
    const suggestions: string[] = [];
    const normalizedName = this.normalizeName(name);
    
    // If constituency provided but not recognized, find similar constituencies
    if (constituency) {
      const mpByConstituency = this.constituencyMatcher.getMpByConstituency(constituency);
      if (mpByConstituency) {
        suggestions.push(mpByConstituency.id);
        return suggestions;
      }
    }
    
    // Fuzzy match on name using improved scoring
    const nameWords = normalizedName.split(' ').filter((w: string) => w.length > 2);
    const scoredMps: Array<{ mp: Mp; score: number }> = [];
    
    for (const mp of this.allMps) {
      const mpNormalized = this.normalizeName(mp.name);
      const mpWords = mpNormalized.split(' ').filter((w: string) => w.length > 2);
      
      const matchCount = nameWords.filter((w: string) => mpWords.includes(w)).length;
      const score = matchCount / Math.max(nameWords.length, mpWords.length);
      
      if (matchCount >= 1 && score >= 0.3) {
        scoredMps.push({ mp, score });
      }
    }
    
    // Sort by score and return top 3 suggestions
    scoredMps.sort((a, b) => b.score - a.score);
    return scoredMps.slice(0, 3).map(item => item.mp.id);
  }
}
