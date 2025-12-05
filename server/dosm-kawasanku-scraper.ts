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

interface DosmApiResponse {
  data: {
    poverty_rate?: number;
    income_median?: number;
    gini?: number;
    unemployment_rate?: number;
    population?: number;
  };
}

export class DosmKawasankuScraper {
  private baseApiUrl = 'https://api.data.gov.my/dashboard';
  
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

  async fetchConstituencyData(constituencyCode: string, constituencyName: string): Promise<KawasankuData | null> {
    try {
      const encodedName = encodeURIComponent(`${constituencyCode} ${constituencyName}`);
      const url = `https://open.dosm.gov.my/ms-MY/dashboard/kawasanku/Sarawak/dun/${encodedName}`;
      
      console.log(`[DosmKawasankuScraper] Fetching data for ${constituencyCode} ${constituencyName}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 30000,
      });

      const html = response.data as string;
      
      const povertyMatch = html.match(/Kadar kemiskinan[^<]*<[^>]*>([0-9.]+)\s*%/i) ||
                          html.match(/poverty[^<]*rate[^<]*<[^>]*>([0-9.]+)\s*%/i) ||
                          html.match(/"poverty_rate":\s*([0-9.]+)/i);
      
      const incomeMatch = html.match(/Pendapatan isi rumah[^<]*<[^>]*>RM\s*([0-9,]+)/i) ||
                         html.match(/household[^<]*income[^<]*<[^>]*>RM\s*([0-9,]+)/i) ||
                         html.match(/"income_median":\s*([0-9.]+)/i);
      
      const giniMatch = html.match(/Pekali Gini[^<]*<[^>]*>([0-9.]+)/i) ||
                       html.match(/Gini[^<]*coefficient[^<]*<[^>]*>([0-9.]+)/i) ||
                       html.match(/"gini":\s*([0-9.]+)/i);
      
      const unemploymentMatch = html.match(/Kadar pengangguran[^<]*<[^>]*>([0-9.]+)\s*%/i) ||
                               html.match(/unemployment[^<]*rate[^<]*<[^>]*>([0-9.]+)\s*%/i) ||
                               html.match(/"unemployment_rate":\s*([0-9.]+)/i);
      
      const populationMatch = html.match(/Populasi[^<]*sebanyak\s*([0-9,]+)\s*penduduk/i) ||
                             html.match(/population[^<]*of\s*([0-9,]+)/i) ||
                             html.match(/"population":\s*([0-9]+)/i);

      const povertyRate = povertyMatch ? Math.round(parseFloat(povertyMatch[1]) * 10) : null;
      const householdIncome = incomeMatch ? parseInt(incomeMatch[1].replace(/,/g, '')) : null;
      const giniCoefficient = giniMatch ? Math.round(parseFloat(giniMatch[1]) * 1000) : null;
      const unemploymentRate = unemploymentMatch ? Math.round(parseFloat(unemploymentMatch[1]) * 10) : null;
      const population = populationMatch ? parseInt(populationMatch[1].replace(/,/g, '')) : null;

      return {
        constituencyCode: constituencyCode.replace('.', ''),
        constituencyName,
        povertyRate,
        householdIncome,
        giniCoefficient,
        unemploymentRate,
        population,
      };
    } catch (error) {
      console.error(`[DosmKawasankuScraper] Error fetching data for ${constituencyCode}:`, error);
      return null;
    }
  }

  async fetchAllSarawakDunData(): Promise<KawasankuData[]> {
    console.log('[DosmKawasankuScraper] Starting to fetch poverty data for all Sarawak DUN constituencies...');
    
    const results: KawasankuData[] = [];
    
    for (const constituency of this.sarawakDunConstituencies) {
      const data = await this.fetchConstituencyData(constituency.code, constituency.name);
      if (data) {
        results.push(data);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[DosmKawasankuScraper] Successfully fetched data for ${results.length} constituencies`);
    return results;
  }

  async fetchPovertyDataByDistrict(): Promise<Map<string, number>> {
    console.log('[DosmKawasankuScraper] Fetching district-level poverty data from DOSM API...');
    
    const districtPoverty = new Map<string, number>();
    
    try {
      const response = await axios.get('https://api.data.gov.my/data-catalogue?id=hh_poverty_district&limit=100', {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      if (response.data && Array.isArray(response.data)) {
        for (const record of response.data) {
          if (record.state === 'Sarawak' && record.district && record.incidence_abs !== undefined) {
            districtPoverty.set(record.district.toLowerCase(), record.incidence_abs);
          }
        }
      }
      
      console.log(`[DosmKawasankuScraper] Retrieved poverty data for ${districtPoverty.size} districts`);
    } catch (error) {
      console.error('[DosmKawasankuScraper] Error fetching district poverty data:', error);
    }
    
    return districtPoverty;
  }

  getSarawakConstituencies(): { code: string; name: string }[] {
    return this.sarawakDunConstituencies;
  }
}

export const dosmKawasankuScraper = new DosmKawasankuScraper();
