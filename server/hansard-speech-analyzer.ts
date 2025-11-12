import { Mp, HansardSpeaker } from '@shared/schema';
import { HansardSpeakerParser } from './hansard-speaker-parser';
import { MPNameMatcher } from './mp-name-matcher';

export interface SpeechStatistics {
  mpId: string;
  mpName: string;
  totalSpeeches: number;
  speakingOrder: number | null;
}

export interface SessionSpeechStats {
  sessionNumber: string;
  sessionDate: Date;
  totalUniqueSpeakers: number;
  totalSpeechInstances: number;
  topSpeakers: SpeechStatistics[];
  speakerStats: Map<string, SpeechStatistics>;
}

export class HansardSpeechAnalyzer {
  private allMps: Mp[];
  private speakerParser: HansardSpeakerParser;
  private nameMatcher: MPNameMatcher;

  constructor(allMps: Mp[]) {
    this.allMps = allMps;
    this.speakerParser = new HansardSpeakerParser(allMps);
    this.nameMatcher = new MPNameMatcher(allMps);
  }

  /**
   * Analyze speech statistics from Hansard transcript
   * Uses speaker parser for unique speakers AND counts all speech instances
   */
  analyzeSpeeches(transcript: string, sessionNumber: string, sessionDate: Date): SessionSpeechStats {
    // Get unique speakers using the main parser
    const { speakers } = this.speakerParser.extractSpeakers(transcript);

    // Count ALL speech instances (not just unique speakers)
    const allSpeechInstances = this.countAllSpeechInstances(transcript);

    // Build speech statistics map
    const speakerStats = new Map<string, SpeechStatistics>();

    // Add unique speakers first
    speakers.forEach(speaker => {
      const speechCount = allSpeechInstances.get(speaker.mpId) || 1;
      speakerStats.set(speaker.mpId, {
        mpId: speaker.mpId,
        mpName: speaker.mpName,
        totalSpeeches: speechCount,
        speakingOrder: speaker.speakingOrder
      });
    });

    // Sort by speech count to get top speakers
    const topSpeakers = Array.from(speakerStats.values())
      .sort((a, b) => b.totalSpeeches - a.totalSpeeches)
      .slice(0, 10);

    const totalSpeechInstances = Array.from(allSpeechInstances.values())
      .reduce((sum, count) => sum + count, 0);

    return {
      sessionNumber,
      sessionDate,
      totalUniqueSpeakers: speakers.length,
      totalSpeechInstances,
      topSpeakers,
      speakerStats
    };
  }

  /**
   * Count ALL speaking instances for each MP (including multiple speeches)
   * This uses the same pattern matching as count-all-speeches.ts script
   */
  private countAllSpeechInstances(transcript: string): Map<string, number> {
    const speechCounts = new Map<string, number>();

    // Speaker pattern that matches ministerial titles without constituencies
    const speakerPattern = /(?:Menteri|Timbalan Menteri|Datuk Seri|Dato' Sri|Datuk|Dato'|Tan Sri|Toh Puan|Tuan|Puan|Dr\.?|Yang Berhormat|Y\.Bhg\.|YB)\s+(?:Haji|Hajjah)?\s*([^:]{10,80}):\s+/gi;

    let match;
    while ((match = speakerPattern.exec(transcript)) !== null) {
      const capturedName = match[1].trim();
      
      // Try to match this name to an MP
      const mpId = this.nameMatcher.matchName(capturedName);
      
      if (mpId) {
        const currentCount = speechCounts.get(mpId) || 0;
        speechCounts.set(mpId, currentCount + 1);
      }
    }

    return speechCounts;
  }

  /**
   * Get speech statistics for a specific MP from a transcript
   */
  getMpSpeechStats(mpId: string, transcript: string): {
    totalSpeeches: number;
    speakingOrder: number | null;
    spoke: boolean;
  } {
    const { speakers } = this.speakerParser.extractSpeakers(transcript);
    const speaker = speakers.find(s => s.mpId === mpId);
    
    if (!speaker) {
      return {
        totalSpeeches: 0,
        speakingOrder: null,
        spoke: false
      };
    }

    // Count all speech instances for this MP
    const allInstances = this.countAllSpeechInstances(transcript);
    const speechCount = allInstances.get(mpId) || 1;

    return {
      totalSpeeches: speechCount,
      speakingOrder: speaker.speakingOrder,
      spoke: true
    };
  }

  /**
   * Calculate aggregated speech statistics across multiple Hansard sessions
   */
  static aggregateMpStats(
    hansardRecords: Array<{
      speakers: HansardSpeaker[];
      sessionDate: Date;
    }>
  ): Map<string, {
    totalSessions: number;
    totalSpeeches: number;
    averageSpeeches: number;
    participationRate: number;
  }> {
    const mpStats = new Map<string, {
      totalSessions: number;
      totalSpeeches: number;
      averageSpeeches: number;
      participationRate: number;
    }>();

    const totalSessions = hansardRecords.length;

    hansardRecords.forEach(record => {
      record.speakers.forEach(speaker => {
        const current = mpStats.get(speaker.mpId) || {
          totalSessions: 0,
          totalSpeeches: 0,
          averageSpeeches: 0,
          participationRate: 0
        };

        current.totalSessions += 1;
        current.totalSpeeches += 1;
        mpStats.set(speaker.mpId, current);
      });
    });

    // Calculate averages and participation rates
    mpStats.forEach((stats, mpId) => {
      stats.averageSpeeches = stats.totalSpeeches / stats.totalSessions;
      stats.participationRate = (stats.totalSessions / totalSessions) * 100;
    });

    return mpStats;
  }
}
