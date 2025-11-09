import type { Mp } from '@shared/schema';

export class MPNameMatcher {
  private mps: Mp[];
  private nameMap: Map<string, string>;

  constructor(mps: Mp[]) {
    this.mps = mps;
    this.nameMap = new Map();
    this.buildNameMap();
  }

  private buildNameMap() {
    for (const mp of this.mps) {
      const normalizedName = this.normalizeName(mp.name);
      this.nameMap.set(normalizedName, mp.id);
      
      const parts = mp.name.split(' ');
      if (parts.length > 1) {
        const lastName = parts[parts.length - 1];
        const firstNames = parts.slice(0, -1).join(' ');
        const reversed = `${lastName} ${firstNames}`;
        this.nameMap.set(this.normalizeName(reversed), mp.id);
      }
    }
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(yb|dato'|datuk|tan sri|tun|haji|hajjah|dr|tuan|puan)\b\.?\s*/gi, '')
      .replace(/\b(bin|binti)\b\s*/gi, ' ')
      .replace(/[.,\-()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  matchName(scrapedName: string): string | null {
    const normalized = this.normalizeName(scrapedName);
    if (normalized.length < 3) return null;
    
    const directMatch = this.nameMap.get(normalized);
    if (directMatch) {
      return directMatch;
    }

    const words = normalized.split(' ').filter((w: string) => w.length > 2);
    if (words.length === 0) return null;

    let bestMatch: { mpId: string; score: number } | null = null;

    for (const [mapName, mpId] of Array.from(this.nameMap.entries())) {
      const mapWords = mapName.split(' ').filter((w: string) => w.length > 2);
      
      const matchCount = words.filter((w: string) => mapWords.includes(w)).length;
      const score = matchCount / Math.max(words.length, mapWords.length);
      
      if (matchCount >= 2 && score > 0.5) {
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { mpId, score };
        }
      }
    }

    return bestMatch ? bestMatch.mpId : null;
  }

  matchNames(scrapedNames: string[]): string[] {
    const matchedIds: string[] = [];
    const uniqueIds = new Set<string>();

    for (const name of scrapedNames) {
      const mpId = this.matchName(name);
      if (mpId && !uniqueIds.has(mpId)) {
        matchedIds.push(mpId);
        uniqueIds.add(mpId);
      }
    }

    return matchedIds;
  }
}
