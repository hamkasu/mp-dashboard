import type { Mp } from '@shared/schema';

export class ConstituencyMatcher {
  private mps: Mp[];
  private constituencyMap: Map<string, string>;
  private constituencyOverrides: Map<string, string>;

  constructor(mps: Mp[]) {
    this.mps = mps;
    this.constituencyMap = new Map();
    this.constituencyOverrides = new Map();
    this.buildConstituencyMap();
    this.buildOverrides();
  }

  private buildOverrides() {
    // Handle common variations or alternative spellings of constituencies
    const overrideConstituencies: Record<string, string> = {
      'petra jaya': 'Petra Jaya',
      'kota raja': 'Kota Raja',
      'tanjong malim': 'Tanjong Malim',
      'bukit mertajam': 'Bukit Mertajam',
      'iskandar puteri': 'Iskandar Puteri',
      'cameron highlands': 'Cameron Highlands',
      'lembah pantai': 'Lembah Pantai',
      'nibong tebal': 'Nibong Tebal',
      'johor bahru': 'Johor Bahru',
      'alor gajah': 'Alor Gajah',
      'kota samarahan': 'Kota Samarahan',
      'parit sulong': 'Parit Sulong',
      'ipoh barat': 'Ipoh Barat',
      'sungai buloh': 'Sungai Buloh',
      'petaling jaya': 'Petaling Jaya',
      'wangsa maju': 'Wangsa Maju',
      'bukit gelugor': 'Bukit Gelugor',
      'bukit bintang': 'Bukit Bintang',
      'sri aman': 'Sri Aman',
      'tanjung piai': 'Tanjung Piai',
      'bandar kuching': 'Bandar Kuching',
      'puncak borneo': 'Puncak Borneo',
      'simpang renggam': 'Simpang Renggam',
      'sungai siput': 'Sungai Siput',
      'kota melaka': 'Kota Melaka',
      'bayan baru': 'Bayan Baru',
      'bandar tun razak': 'Bandar Tun Razak',
      'ayer hitam': 'Ayer Hitam',
      'paya besar': 'Paya Besar',
      'balik pulau': 'Balik Pulau',
      'padang besar': 'Padang Besar',
      'hulu langat': 'Hulu Langat',
      'shah alam': 'Shah Alam',
      'batu pahat': 'Batu Pahat',
      'batang lupar': 'Batang Lupar',
      'ipoh timor': 'Ipoh Timor',
      'sungai petani': 'Sungai Petani',
      'kuala kangsar': 'Kuala Kangsar',
      'bukit gantang': 'Bukit Gantang',
      'tanjong karang': 'Tanjong Karang',
      'gua musang': 'Gua Musang',
      'bagan serai': 'Bagan Serai',
      'indera mahkota': 'Indera Mahkota',
      'pokok sena': 'Pokok Sena',
      'sungai besar': 'Sungai Besar',
      'pengkalan chepa': 'Pengkalan Chepa',
      'rantau panjang': 'Rantau Panjang',
      'tasek gelugor': 'Tasek Gelugor',
      'parit buntar': 'Parit Buntar',
      'kuala langat': 'Kuala Langat',
      'kuala nerus': 'Kuala Nerus',
      'kuala kedah': 'Kuala Kedah',
      'kulim bandar baharu': 'Kulim Bandar Baharu',
      'kubang kerian': 'Kubang Kerian',
      'kota bharu': 'Kota Bharu',
      'masjid tanah': 'Masjid Tanah',
      'tanah merah': 'Tanah Merah',
      'pasir puteh': 'Pasir Puteh',
      'kuala terengganu': 'Kuala Terengganu',
      'kuala krai': 'Kuala Krai',
      'pasir mas': 'Pasir Mas',
      'kubang pasu': 'Kubang Pasu',
      'permatang pauh': 'Permatang Pauh',
      'padang serai': 'Padang Serai',
      'hulu selangor': 'Hulu Selangor',
      'bagan datuk': 'Bagan Datuk',
      'kota tinggi': 'Kota Tinggi',
      'kota kinabalu': 'Kota Kinabalu',
      'teluk intan': 'Teluk Intan',
      'kuala selangor': 'Kuala Selangor',
      'sri gading': 'Sri Gading',
      'lubok antu': 'Lubok Antu',
      'batang sadong': 'Batang Sadong',
      'alor setar': 'Alor Setar',
      'bukit bendera': 'Bukit Bendera',
    };

    for (const [normalized, actualName] of Object.entries(overrideConstituencies)) {
      const mp = this.mps.find(m => this.normalizeConstituency(m.constituency) === normalized);
      if (mp) {
        this.constituencyOverrides.set(normalized, mp.id);
      }
    }
  }

  private buildConstituencyMap() {
    for (const mp of this.mps) {
      const normalizedConstituency = this.normalizeConstituency(mp.constituency);
      this.constituencyMap.set(normalizedConstituency, mp.id);
    }
  }

  private normalizeConstituency(constituency: string): string {
    return constituency
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  matchConstituency(scrapedConstituency: string): string | null {
    const normalized = this.normalizeConstituency(scrapedConstituency);
    
    // Check overrides first
    if (this.constituencyOverrides.has(normalized)) {
      return this.constituencyOverrides.get(normalized)!;
    }
    
    // Try direct match
    if (this.constituencyMap.has(normalized)) {
      return this.constituencyMap.get(normalized)!;
    }
    
    // Log unmatched constituency for debugging
    console.log(`⚠️  Could not match constituency: "${scrapedConstituency}"`);
    return null;
  }

  matchConstituencies(scrapedConstituencies: string[]): string[] {
    const matchedIds: string[] = [];
    const uniqueIds = new Set<string>();

    for (const constituency of scrapedConstituencies) {
      const mpId = this.matchConstituency(constituency);
      if (mpId && !uniqueIds.has(mpId)) {
        matchedIds.push(mpId);
        uniqueIds.add(mpId);
      }
    }

    return matchedIds;
  }
}
