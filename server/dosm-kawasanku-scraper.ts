import puppeteer, { Browser, Page } from 'puppeteer';
import { execSync } from 'child_process';

function getChromiumPath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  try {
    const chromiumPath = execSync('which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome 2>/dev/null', { encoding: 'utf-8' }).trim();
    if (chromiumPath) {
      console.log(`[DosmKawasankuScraper] Found Chromium at: ${chromiumPath}`);
      return chromiumPath;
    }
  } catch (error) {
    console.log('[DosmKawasankuScraper] Could not find system Chromium, will use Puppeteer default');
  }
  
  return undefined;
}

export interface KawasankuData {
  constituencyCode: string;
  constituencyName: string;
  povertyRate: number | null;
  householdIncome: number | null;
  giniCoefficient: number | null;
  unemploymentRate: number | null;
  population: number | null;
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

  async fetchConstituencyData(constituencyCode: string, constituencyName: string, browser: Browser): Promise<KawasankuData | null> {
    let page: Page | null = null;
    try {
      const encodedName = encodeURIComponent(`${constituencyCode} ${constituencyName}`);
      const url = `https://open.dosm.gov.my/ms-MY/dashboard/kawasanku/Sarawak/dun/${encodedName}`;
      
      console.log(`[DosmKawasankuScraper] Fetching data for ${constituencyCode} ${constituencyName}`);
      
      page = await browser.newPage();
      
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });
      
      await page.waitForFunction(() => {
        const text = document.body.innerText || '';
        return text.includes('Kadar kemiskinan') || 
               text.includes('poverty') || 
               text.includes('%');
      }, { timeout: 30000 }).catch(() => {
        console.log(`[DosmKawasankuScraper] Timeout waiting for content on ${constituencyCode}`);
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const data = await page.evaluate(() => {
        const getText = () => document.body.innerText || '';
        const text = getText();
        
        let povertyRate: number | null = null;
        let householdIncome: number | null = null;
        let giniCoefficient: number | null = null;
        let unemploymentRate: number | null = null;
        let population: number | null = null;
        
        const povertyMatch = text.match(/Kadar kemiskinan[\s\S]*?(\d+\.?\d*)\s*%/i) ||
                            text.match(/(\d+\.?\d*)\s*%[\s\S]*?kemiskinan/i);
        if (povertyMatch) {
          povertyRate = parseFloat(povertyMatch[1]);
        }
        
        const incomeMatch = text.match(/RM\s*([\d,]+)[\s\S]*?(?:pendapatan|income|median)/i) ||
                           text.match(/(?:pendapatan|income|median)[\s\S]*?RM\s*([\d,]+)/i);
        if (incomeMatch) {
          householdIncome = parseInt(incomeMatch[1].replace(/,/g, ''));
        }
        
        const giniMatch = text.match(/(?:Gini|pekali gini)[\s\S]*?(0\.\d+)/i) ||
                         text.match(/(0\.\d+)[\s\S]*?(?:Gini|pekali)/i);
        if (giniMatch) {
          giniCoefficient = parseFloat(giniMatch[1]);
        }
        
        const unemploymentMatch = text.match(/(?:pengangguran|unemployment)[\s\S]*?(\d+\.?\d*)\s*%/i) ||
                                 text.match(/(\d+\.?\d*)\s*%[\s\S]*?(?:pengangguran|unemployment)/i);
        if (unemploymentMatch) {
          unemploymentRate = parseFloat(unemploymentMatch[1]);
        }
        
        const populationMatch = text.match(/(?:populasi|population)[\s\S]*?([\d,]+)\s*(?:penduduk|orang|people)/i) ||
                               text.match(/([\d,]+)\s*(?:penduduk|orang)[\s\S]*?(?:populasi)/i);
        if (populationMatch) {
          population = parseInt(populationMatch[1].replace(/,/g, ''));
        }
        
        return { povertyRate, householdIncome, giniCoefficient, unemploymentRate, population };
      });
      
      await page.close();
      
      console.log(`[DosmKawasankuScraper] Extracted data for ${constituencyCode}: poverty=${data.povertyRate}%`);
      
      return {
        constituencyCode: constituencyCode.replace('.', ''),
        constituencyName,
        povertyRate: data.povertyRate !== null ? Math.round(data.povertyRate * 10) : null,
        householdIncome: data.householdIncome,
        giniCoefficient: data.giniCoefficient !== null ? Math.round(data.giniCoefficient * 1000) : null,
        unemploymentRate: data.unemploymentRate !== null ? Math.round(data.unemploymentRate * 10) : null,
        population: data.population,
      };
    } catch (error) {
      console.error(`[DosmKawasankuScraper] Error fetching data for ${constituencyCode}:`, error);
      if (page) {
        try {
          await page.close();
        } catch (closeError) {
          console.error(`[DosmKawasankuScraper] Error closing page:`, closeError);
        }
      }
      return null;
    }
  }

  async fetchAllSarawakDunData(): Promise<KawasankuData[]> {
    console.log('[DosmKawasankuScraper] Starting to fetch poverty data for all Sarawak DUN constituencies using headless browser...');
    
    const results: KawasankuData[] = [];
    let browser: Browser | null = null;
    
    try {
      const chromiumPath = getChromiumPath();
      browser = await puppeteer.launch({
        headless: true,
        ...(chromiumPath && { executablePath: chromiumPath }),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1280x800',
        ],
      });
      
      console.log('[DosmKawasankuScraper] Browser launched successfully');
      
      for (const constituency of this.sarawakDunConstituencies) {
        const data = await this.fetchConstituencyData(constituency.code, constituency.name, browser);
        if (data) {
          results.push(data);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      await browser.close();
      console.log(`[DosmKawasankuScraper] Successfully fetched data for ${results.length} constituencies`);
    } catch (error) {
      console.error('[DosmKawasankuScraper] Error during scraping:', error);
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('[DosmKawasankuScraper] Error closing browser:', closeError);
        }
      }
    }
    
    return results;
  }

  getSarawakConstituencies(): { code: string; name: string }[] {
    return this.sarawakDunConstituencies;
  }
}

export const dosmKawasankuScraper = new DosmKawasankuScraper();
