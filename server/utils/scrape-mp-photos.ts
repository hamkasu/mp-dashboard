/**
 * Copyright by Calmic Sdn Bhd
 */

import * as cheerio from 'cheerio';
import axios from 'axios';
import https from 'https';

const BASE_URL = 'https://www.parlimen.gov.my';
const MP_LIST_URL = `${BASE_URL}/ahli-dewan.html?uweb=dr&`;

export async function scrapeMpPhotos(): Promise<Map<string, string>> {
  try {
    // Use axios with SSL verification disabled for the parliament website
    const response = await axios.get(MP_LIST_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      timeout: 15000
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    const photoMap = new Map<string, string>();
    
    // Find all list items that contain MP information
    $('li').each((_, element) => {
      const $li = $(element);
      
      // Look for images - they contain MP photos
      const $img = $li.find('img');
      
      if ($img.length > 0) {
        const photoUrl = $img.attr('src');
        const liText = $li.text();
        
        // Extract parliament code (format: P001, P002, etc.)
        const parliamentCodeMatch = liText.match(/P\d{3}/);
        
        if (photoUrl && parliamentCodeMatch) {
          const parliamentCode = parliamentCodeMatch[0];
          
          // Convert relative URLs to absolute URLs
          let fullPhotoUrl = photoUrl;
          if (!photoUrl.startsWith('http')) {
            fullPhotoUrl = photoUrl.startsWith('/') 
              ? `${BASE_URL}${photoUrl}` 
              : `${BASE_URL}/${photoUrl}`;
          }
          
          photoMap.set(parliamentCode, fullPhotoUrl);
        }
      }
    });
    
    console.log(`✅ Scraped ${photoMap.size} MP photos from parliament website`);
    
    // Log a few examples for debugging
    if (photoMap.size > 0) {
      const firstFive = Array.from(photoMap.entries()).slice(0, 5);
      console.log('Sample photo mappings:');
      firstFive.forEach(([code, url]) => {
        console.log(`  ${code}: ${url}`);
      });
    }
    
    return photoMap;
  } catch (error) {
    console.error('❌ Error scraping MP photos:', error);
    return new Map();
  }
}

export async function getMpPhotoUrl(parliamentCode: string): Promise<string | null> {
  const photoMap = await scrapeMpPhotos();
  return photoMap.get(parliamentCode) || null;
}
