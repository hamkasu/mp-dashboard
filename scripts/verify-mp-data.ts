import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import https from 'https';

interface MPData {
  name: string;
  fullName: string;
  party: string;
  parliamentCode: string;
  constituency: string;
  photoUrl: string;
  profileUrl: string;
}

async function scrapeAllMPs(): Promise<MPData[]> {
  console.log('Fetching MP data from Malaysian Parliament website...');
  
  const url = 'https://www.parlimen.gov.my/ahli-dewan.html?uweb=dr&';
  
  // Use same configuration as existing photo scraper
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    }),
    timeout: 15000
  });
  
  const $ = cheerio.load(response.data);
  
  const mps: MPData[] = [];
  const BASE_URL = 'https://www.parlimen.gov.my';
  
  // Find all MP entries - they are in list items with profile links
  $('li').each((_, element) => {
    const $li = $(element);
    const $link = $li.find('a[href*="profile-ahli"]');
    
    if ($link.length > 0) {
      // Get profile URL
      let profileUrl = $link.attr('href') || '';
      if (!profileUrl.startsWith('http')) {
        profileUrl = `${BASE_URL}${profileUrl.startsWith('/') ? '' : '/'}${profileUrl}`;
      }
      
      // Get photo URL from image
      const $img = $link.find('img');
      let photoUrl = $img.attr('src') || '';
      if (photoUrl && !photoUrl.startsWith('http')) {
        photoUrl = photoUrl.startsWith('/') 
          ? `${BASE_URL}${photoUrl}` 
          : `${BASE_URL}/${photoUrl}`;
      }
      
      // Get full MP name from link text (includes title)
      const fullName = $link.text().trim().replace(/\s+/g, ' ');
      
      // Extract clean name without titles
      let cleanName = fullName
        .replace(/^(YB|YAB|YBhg|Dato|Datuk|Tan Sri|Tun|Dr\.|Puan|Tuan|Hajah|Haji|Seri|Sri|bin|binti)\s+/gi, '')
        .trim();
      
      // Remove multiple title words
      cleanName = cleanName
        .replace(/(Dato|Datuk|Tan Sri|Tun|Dr\.|Seri|Sri|bin|binti|Haji|Hajah)\s+/gi, '')
        .trim();
      
      // Get the full list item text to extract party, code, and constituency
      const liText = $li.text();
      
      // Extract parliament code (P001-P222)
      const parliamentCodeMatch = liText.match(/P\d{3}/);
      const parliamentCode = parliamentCodeMatch ? parliamentCodeMatch[0] : '';
      
      // Extract party - look for common party abbreviations
      const partyMatch = liText.match(/\b(PH|BN|GPS|GRS|WARISAN|KDM|PBM|PN|MUDA|BEBAS|IND)\b/);
      const party = partyMatch ? partyMatch[0] : '';
      
      // Extract constituency - it's usually after the parliament code
      let constituency = '';
      if (parliamentCode) {
        const parts = liText.split(parliamentCode);
        if (parts.length > 1) {
          // Get text after parliament code
          const afterCode = parts[1].trim();
          // Take the first meaningful word(s) as constituency
          const constituencyMatch = afterCode.match(/^([A-Za-z\s]+)/);
          if (constituencyMatch) {
            constituency = constituencyMatch[1].trim();
          }
        }
      }
      
      // Only add if we have essential data
      if (cleanName && parliamentCode) {
        mps.push({
          name: cleanName,
          fullName: fullName,
          party: party || 'UNKNOWN',
          parliamentCode: parliamentCode,
          constituency: constituency || 'UNKNOWN',
          photoUrl: photoUrl,
          profileUrl: profileUrl
        });
      }
    }
  });
  
  console.log(`Scraped ${mps.length} MPs from the website`);
  return mps;
}

async function main() {
  try {
    const scrapedMPs = await scrapeAllMPs();
    
    // Save to JSON for inspection
    fs.writeFileSync(
      'scripts/scraped-mps.json',
      JSON.stringify(scrapedMPs, null, 2)
    );
    
    console.log('\nScraped MP data saved to scripts/scraped-mps.json');
    console.log(`\nTotal MPs found: ${scrapedMPs.length}`);
    
    // Show sample data
    console.log('\nSample MPs:');
    scrapedMPs.slice(0, 10).forEach(mp => {
      console.log(`- ${mp.name} (${mp.party}) - ${mp.parliamentCode} ${mp.constituency}`);
    });
    
    // Party breakdown
    const partyCount: Record<string, number> = {};
    scrapedMPs.forEach(mp => {
      partyCount[mp.party] = (partyCount[mp.party] || 0) + 1;
    });
    
    console.log('\nParty breakdown:');
    Object.entries(partyCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([party, count]) => {
        console.log(`  ${party}: ${count}`);
      });
    
  } catch (error) {
    console.error('Error scraping MP data:', error);
    process.exit(1);
  }
}

main();
