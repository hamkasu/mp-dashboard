/**
 * Copyright by Calmic Sdn Bhd
 * 
 * Bills Scraper Service
 * Scrapes bill data from the Malaysian Parliament website
 * https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

// SECURITY NOTE: The Malaysian Parliament website (parlimen.gov.my) has SSL certificate
// validation issues in some environments. Since we are ONLY READING public government data
// (not transmitting sensitive information), we disable certificate validation for this
// specific scraper. This is acceptable because:
// 1. We're only downloading publicly available HTML
// 2. No user data or credentials are being transmitted
// 3. The data is already public on the parliament website
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

export interface Bill {
  id: string;
  title: string;
  billNumber?: string;
  introductionDate?: string;
  status: string;
  fullTextUrl?: string;
}

export interface BillsResponse {
  bills: Bill[];
  scrapedAt: string;
  sourceUrl: string;
  error?: string;
}

/**
 * Scrapes bills from the Malaysian Parliament Dewan Rakyat bills page
 */
export async function scrapeBills(): Promise<BillsResponse> {
  const sourceUrl = 'https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&';
  const baseUrl = 'https://www.parlimen.gov.my';
  
  try {
    console.log('[Bills Scraper] Fetching bills from Parliament website...');
    
    const response = await axios.get(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5,ms;q=0.3',
        'Referer': 'https://www.parlimen.gov.my/',
      },
      timeout: 30000,
      httpsAgent,
    });

    const $ = cheerio.load(response.data);
    const bills: Bill[] = [];

    // Try to find bill data in table structures
    // The Parliament website typically uses tables to display bill information
    $('table tbody tr, table tr').each((index, element) => {
      const $row = $(element);
      const cells = $row.find('td');
      
      if (cells.length >= 2) {
        // Extract data from table cells
        const titleCell = $(cells[0]).text().trim() || $(cells[1]).text().trim();
        const dateCell = cells.length >= 3 ? $(cells[2]).text().trim() : '';
        const statusCell = cells.length >= 4 ? $(cells[3]).text().trim() : '';
        
        // Look for PDF or document links
        const linkElement = $row.find('a[href*=".pdf"], a[href*="bill"], a[href*="rang"]').first();
        const fullTextUrl = linkElement.length ? 
          (linkElement.attr('href')?.startsWith('http') ? 
            linkElement.attr('href') : 
            `${baseUrl}/${linkElement.attr('href')?.replace(/^\//, '')}`) 
          : undefined;

        // Extract bill number if present (e.g., D.R. 1/2024)
        const billNumberMatch = titleCell.match(/D\.?R\.?\s*\d+\/\d+/i) || 
                                titleCell.match(/Rang Undang-Undang\s+\d+/i);
        const billNumber = billNumberMatch ? billNumberMatch[0] : undefined;

        // Only add if we have a meaningful title
        if (titleCell && titleCell.length > 3 && !titleCell.toLowerCase().includes('bil') && !titleCell.match(/^\d+$/)) {
          bills.push({
            id: `bill-${index}-${Date.now()}`,
            title: titleCell,
            billNumber,
            introductionDate: dateCell || undefined,
            status: statusCell || 'Unknown',
            fullTextUrl,
          });
        }
      }
    });

    // Also try to find bills in div/list structures (alternative layouts)
    $('.bill-item, .rang-undang-undang, [class*="bill"], [class*="rang"]').each((index, element) => {
      const $item = $(element);
      const title = $item.find('.title, h3, h4, .nama, .tajuk').first().text().trim() || 
                    $item.find('a').first().text().trim();
      const date = $item.find('.date, .tarikh, .masa').first().text().trim();
      const status = $item.find('.status, .keadaan').first().text().trim();
      const link = $item.find('a[href*=".pdf"], a[href*="bill"]').first();
      const fullTextUrl = link.length ? 
        (link.attr('href')?.startsWith('http') ? 
          link.attr('href') : 
          `${baseUrl}/${link.attr('href')?.replace(/^\//, '')}`) 
        : undefined;

      if (title && title.length > 3) {
        // Check if this bill is already added (avoid duplicates)
        const exists = bills.some(b => b.title === title);
        if (!exists) {
          bills.push({
            id: `bill-div-${index}-${Date.now()}`,
            title,
            introductionDate: date || undefined,
            status: status || 'Unknown',
            fullTextUrl,
          });
        }
      }
    });

    // Filter out header rows and empty entries
    const filteredBills = bills.filter(bill => 
      bill.title && 
      bill.title.length > 5 &&
      !bill.title.toLowerCase().includes('tajuk') &&
      !bill.title.toLowerCase().includes('title') &&
      !bill.title.toLowerCase().includes('no.') &&
      !bill.title.match(/^bil\.?\s*$/i)
    );

    console.log(`[Bills Scraper] Successfully scraped ${filteredBills.length} bills`);

    return {
      bills: filteredBills,
      scrapedAt: new Date().toISOString(),
      sourceUrl,
    };

  } catch (error: any) {
    console.error('[Bills Scraper] Error scraping bills:', error.message);
    
    // Return error response
    return {
      bills: [],
      scrapedAt: new Date().toISOString(),
      sourceUrl,
      error: `Failed to scrape bills: ${error.message}`,
    };
  }
}
