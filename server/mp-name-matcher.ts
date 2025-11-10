import type { Mp } from '@shared/schema';

export class MPNameMatcher {
  private mps: Mp[];
  private nameMap: Map<string, string>;
  private nameOverrides: Map<string, string>;

  constructor(mps: Mp[]) {
    this.mps = mps;
    this.nameMap = new Map();
    this.nameOverrides = new Map();
    this.buildNameMap();
    this.buildOverrides();
  }

  private buildOverrides() {
    const overrideNames: Record<string, string> = {
      'khairul firdaus akbar khan': 'Khairul Firdaus Akhbar Khan',
      'khairul firdaus akhbar khan': 'Khairul Firdaus Akhbar Khan',
      'yusof apdal': 'Yusof Apdal',
      'yusuf apdal': 'Yusof Apdal',
      'mohamad hasan': 'Mohamad Hasan',
      'mohammad hasan': 'Mohamad Hasan',
      'saifuddin murugan': 'Saifuddin Nasution Ismail',
      'chow kon yeow': 'Chow Kon Yeow',
      'aminuddin harun': 'Aminuddin Harun',
      'anuar shari': 'Anuar Musa',
      'bung moktar radin': 'Bung Moktar Radin',
      'isnaraissah munirah majilis': 'Isnaraissah Munirah Majilis',
      'bimol gading': 'Bimol Akem Kelulut',
      'lim lip eng': 'Lim Lip Eng',
      'verdon bahanda': 'Verdon Bahanda',
      'wetrom bahanda': 'Wetrom Bahanda',
      'muhammad ismi mat taib': 'Ismi Mat Taib',
      'ahmad samsuri mokhtar': 'Ahmad Samsuri Mokhtar',
      'hamzah zainudin': 'Hamzah Zainudin',
      'abdul hadi awang': 'Abdul Hadi Awang',
      'haji abdul hadi awang': 'Abdul Hadi Awang',
      'ronald kiandee': 'Ronald Kiandee',
      'tiong king sing': 'Tiong King Sing',
      'jonathan yasin': 'Jonathan Yasin',
      'matbali musah': 'Matbali Musah',
      'manndzri nasib': 'Manndzri Nasib',
      'adnan abu hassan': 'Adnan Abu Hassan',
      'ismail sabri yaakob': 'Ismail Sabri Yaakob',
      'hassan abdul karim': 'Hassan Abdul Karim',
      'yusuf abd wahab': 'Fadillah Yusof',
      'gapari katingan': 'Geoffrey Kitingan',
      'ali biju': 'Ali Biju',
    };

    for (const [normalized, actualName] of Object.entries(overrideNames)) {
      const mp = this.mps.find(m => m.name === actualName);
      if (mp) {
        this.nameOverrides.set(normalized, mp.id);
      }
    }
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
      .replace(/\([^)]*\)/g, '')
      .replace(/\b(yab|yb|yang berhormat|dato'|datuk|tan sri|tun|haji|hajjah|dr|ir|tuan|puan|menteri|perdana|timbalan|panglima|seri|sri|utama)\b\.?\s*/gi, ' ')
      .replace(/\b(bin|binti|a\/l)\b\s*/gi, ' ')
      .replace(/,/g, ' ')
      .replace(/[.\-@]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  matchName(scrapedName: string): string | null {
    const normalized = this.normalizeName(scrapedName);
    if (normalized.length < 3) return null;
    
    const overrideMatch = this.nameOverrides.get(normalized);
    if (overrideMatch) {
      return overrideMatch;
    }
    
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
      
      if (matchCount >= 2 && score >= 0.5) {
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
