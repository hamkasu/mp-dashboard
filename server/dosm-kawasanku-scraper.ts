import axios from 'axios';

export interface KawasankuData {
  constituencyCode: string;
  constituencyName: string;
  povertyRate: number | null;
  householdIncome: number | null;
  giniCoefficient: number | null;
  unemploymentRate: number | null;
  population: number | null;
}

interface AreaDataPoint {
  area: string;
  x: number;
  y: number;
  tooltip: number;
}

interface EconomyCategory {
  key: string;
  data: AreaDataPoint[];
}

interface NextDataPageProps {
  population_callout?: {
    total?: number;
  };
  jitterplot?: {
    data?: {
      economy?: EconomyCategory[];
    };
  };
}

interface NextData {
  props?: {
    pageProps?: NextDataPageProps;
  };
}

export class DosmKawasankuScraper {
  private sarawakDunConstituencies: { code: string; name: string }[] = [
    { code: 'N.01', name: 'Opar' },
    { code: 'N.02', name: 'Tasik Biru' },
    { code: 'N.03', name: 'Tanjung Datu' },
    { code: 'N.04', name: 'Pantai Damai' },
    { code: 'N.05', name: 'Demak Laut' },
    { code: 'N.06', name: 'Tupong' },
    { code: 'N.07', name: 'Samariang' },
    { code: 'N.08', name: 'Satok' },
    { code: 'N.09', name: 'Padungan' },
    { code: 'N.10', name: 'Pending' },
    { code: 'N.11', name: 'Batu Lintang' },
    { code: 'N.12', name: 'Kota Sentosa' },
    { code: 'N.13', name: 'Batu Kitang' },
    { code: 'N.14', name: 'Batu Kawah' },
    { code: 'N.15', name: 'Asajaya' },
    { code: 'N.16', name: 'Muara Tuang' },
    { code: 'N.17', name: 'Stakan' },
    { code: 'N.18', name: 'Serembu' },
    { code: 'N.19', name: 'Mambong' },
    { code: 'N.20', name: 'Tarat' },
    { code: 'N.21', name: 'Tebedu' },
    { code: 'N.22', name: 'Kedup' },
    { code: 'N.23', name: 'Bukit Semuja' },
    { code: 'N.24', name: 'Sadong Jaya' },
    { code: 'N.25', name: 'Simunjan' },
    { code: 'N.26', name: 'Gedong' },
    { code: 'N.27', name: 'Sebuyau' },
    { code: 'N.28', name: 'Lingga' },
    { code: 'N.29', name: 'Beting Maro' },
    { code: 'N.30', name: 'Balai Ringin' },
    { code: 'N.31', name: 'Bukit Begunan' },
    { code: 'N.32', name: 'Simanggang' },
    { code: 'N.33', name: 'Engkilili' },
    { code: 'N.34', name: 'Batang Ai' },
    { code: 'N.35', name: 'Saribas' },
    { code: 'N.36', name: 'Layar' },
    { code: 'N.37', name: 'Bukit Saban' },
    { code: 'N.38', name: 'Kalaka' },
    { code: 'N.39', name: 'Krian' },
    { code: 'N.40', name: 'Kabong' },
    { code: 'N.41', name: 'Kuala Rajang' },
    { code: 'N.42', name: 'Semop' },
    { code: 'N.43', name: 'Daro' },
    { code: 'N.44', name: 'Jemoreng' },
    { code: 'N.45', name: 'Repok' },
    { code: 'N.46', name: 'Meradong' },
    { code: 'N.47', name: 'Pakan' },
    { code: 'N.48', name: 'Meluan' },
    { code: 'N.49', name: 'Ngemah' },
    { code: 'N.50', name: 'Machan' },
    { code: 'N.51', name: 'Bukit Assek' },
    { code: 'N.52', name: 'Dudong' },
    { code: 'N.53', name: 'Bawang Assan' },
    { code: 'N.54', name: 'Pelawan' },
    { code: 'N.55', name: 'Nangka' },
    { code: 'N.56', name: 'Dalat' },
    { code: 'N.57', name: 'Tellian' },
    { code: 'N.58', name: 'Balingian' },
    { code: 'N.59', name: 'Tamin' },
    { code: 'N.60', name: 'Kakus' },
    { code: 'N.61', name: 'Pelagus' },
    { code: 'N.62', name: 'Katibas' },
    { code: 'N.63', name: 'Bukit Goram' },
    { code: 'N.64', name: 'Baleh' },
    { code: 'N.65', name: 'Belaga' },
    { code: 'N.66', name: 'Murum' },
    { code: 'N.67', name: 'Jepak' },
    { code: 'N.68', name: 'Tanjung Batu' },
    { code: 'N.69', name: 'Kemena' },
    { code: 'N.70', name: 'Samalaju' },
    { code: 'N.71', name: 'Bekenu' },
    { code: 'N.72', name: 'Lambir' },
    { code: 'N.73', name: 'Piasau' },
    { code: 'N.74', name: 'Pujut' },
    { code: 'N.75', name: 'Senadin' },
    { code: 'N.76', name: 'Marudi' },
    { code: 'N.77', name: 'Telang Usan' },
    { code: 'N.78', name: 'Mulu' },
    { code: 'N.79', name: 'Bukit Kota' },
    { code: 'N.80', name: 'Limbang' },
    { code: 'N.81', name: 'Batu Danau' },
    { code: 'N.82', name: 'Ba Kelalan' },
  ];

  private findValueForArea(economyData: EconomyCategory[], key: string, areaName: string): number | null {
    const category = economyData.find(cat => cat.key === key);
    if (!category || !category.data) return null;
    
    const areaData = category.data.find(d => d.area === areaName);
    if (!areaData) return null;
    
    return areaData.tooltip;
  }

  async fetchConstituencyData(constituencyCode: string, constituencyName: string): Promise<KawasankuData | null> {
    try {
      const encodedName = encodeURIComponent(`${constituencyCode} ${constituencyName}`);
      const url = `https://open.dosm.gov.my/ms-MY/dashboard/kawasanku/Sarawak/dun/${encodedName}`;
      
      console.log(`[DosmKawasankuScraper] Fetching data for ${constituencyCode} ${constituencyName} from ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 30000,
      });

      const html = response.data as string;
      
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (!nextDataMatch || !nextDataMatch[1]) {
        console.error(`[DosmKawasankuScraper] Could not find __NEXT_DATA__ for ${constituencyCode}`);
        return null;
      }

      let nextData: NextData;
      try {
        nextData = JSON.parse(nextDataMatch[1]);
      } catch (parseError) {
        console.error(`[DosmKawasankuScraper] Failed to parse __NEXT_DATA__ JSON for ${constituencyCode}:`, parseError);
        return null;
      }

      const pageProps = nextData.props?.pageProps;
      if (!pageProps) {
        console.error(`[DosmKawasankuScraper] No pageProps found for ${constituencyCode}`);
        return null;
      }

      const population = pageProps.population_callout?.total ?? null;
      const economyData = pageProps.jitterplot?.data?.economy ?? [];

      const areaName = `${constituencyCode} ${constituencyName}`;
      
      const povertyRate = this.findValueForArea(economyData, 'poverty', areaName);
      const householdIncome = this.findValueForArea(economyData, 'income_mean', areaName);
      const giniCoefficient = this.findValueForArea(economyData, 'gini', areaName);
      const unemploymentRate = this.findValueForArea(economyData, 'labour_urate', areaName);

      console.log(`[DosmKawasankuScraper] Extracted data for ${constituencyCode}: poverty=${povertyRate}%, income=${householdIncome}, gini=${giniCoefficient}, unemployment=${unemploymentRate}%, population=${population}`);
      
      return {
        constituencyCode: constituencyCode.replace('.', ''),
        constituencyName,
        povertyRate: povertyRate !== null ? Math.round(povertyRate * 10) : null,
        householdIncome: householdIncome !== null ? Math.round(householdIncome) : null,
        giniCoefficient: giniCoefficient !== null ? Math.round(giniCoefficient * 1000) : null,
        unemploymentRate: unemploymentRate !== null ? Math.round(unemploymentRate * 10) : null,
        population: population,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`[DosmKawasankuScraper] HTTP error fetching data for ${constituencyCode}: ${error.response?.status} - ${error.message}`);
      } else {
        console.error(`[DosmKawasankuScraper] Error fetching data for ${constituencyCode}:`, error);
      }
      return null;
    }
  }

  async fetchAllSarawakDunData(): Promise<KawasankuData[]> {
    console.log('[DosmKawasankuScraper] Starting to fetch poverty data for all Sarawak DUN constituencies...');
    
    const results: KawasankuData[] = [];
    let successCount = 0;
    let failCount = 0;
    
    for (const constituency of this.sarawakDunConstituencies) {
      const data = await this.fetchConstituencyData(constituency.code, constituency.name);
      if (data) {
        results.push(data);
        successCount++;
      } else {
        failCount++;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`[DosmKawasankuScraper] Completed: ${successCount} successful, ${failCount} failed out of ${this.sarawakDunConstituencies.length} constituencies`);
    
    return results;
  }

  getSarawakConstituencies(): { code: string; name: string }[] {
    return this.sarawakDunConstituencies;
  }
}

export const dosmKawasankuScraper = new DosmKawasankuScraper();
