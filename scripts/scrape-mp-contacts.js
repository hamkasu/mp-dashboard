/**
 * Script to scrape MP contact information from Malaysian Parliament website
 * Run this on Replit where you have access to the site
 *
 * Usage: node scripts/scrape-mp-contacts.js
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFile } from 'fs/promises';

const MP_LIST_URL = 'https://www.parlimen.gov.my/ahli-dewan.html?uweb=dr&';

async function scrapeMPContacts() {
  console.log('Fetching MP list from Malaysian Parliament website...');

  try {
    const response = await axios.get(MP_LIST_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const mpContacts = [];

    // Parse the MP list - adjust selectors based on actual HTML structure
    // You may need to inspect the page and update these selectors
    $('.mp-card, .ahli-item, tr').each((index, element) => {
      const $el = $(element);

      // Try to extract MP information
      // These selectors are guesses - inspect the actual HTML and adjust
      const name = $el.find('.mp-name, .nama, td:nth-child(1)').text().trim();
      const constituency = $el.find('.mp-constituency, .kawasan, td:nth-child(2)').text().trim();
      const party = $el.find('.mp-party, .parti, td:nth-child(3)').text().trim();
      const email = $el.find('.mp-email, .emel, a[href^="mailto:"]').attr('href')?.replace('mailto:', '').trim();
      const telephone = $el.find('.mp-tel, .telefon, .phone').text().trim();
      const fax = $el.find('.mp-fax, .faks').text().trim();
      const mobile = $el.find('.mp-mobile, .bimbit').text().trim();
      const address = $el.find('.mp-address, .alamat').text().trim();
      const socialMedia = $el.find('.mp-social, a[href*="facebook"], a[href*="twitter"], a[href*="instagram"]').attr('href')?.trim();

      // Only add if we have at least a name
      if (name && name.length > 3) {
        mpContacts.push({
          name,
          constituency,
          party,
          email: email || null,
          telephone: telephone || null,
          fax: fax || null,
          mobileNumber: mobile || null,
          contactAddress: address || null,
          socialMedia: socialMedia || null,
        });
      }
    });

    console.log(`Found ${mpContacts.length} MPs with contact information`);

    // Save to JSON file
    const outputPath = './mp-contacts-scraped.json';
    await writeFile(outputPath, JSON.stringify(mpContacts, null, 2));
    console.log(`\nData saved to: ${outputPath}`);
    console.log('\nSample data (first 3 entries):');
    console.log(JSON.stringify(mpContacts.slice(0, 3), null, 2));

    return mpContacts;
  } catch (error) {
    console.error('Error scraping MP contacts:', error);
    throw error;
  }
}

// Alternative: Try to fetch individual MP pages
async function scrapeMPDetailPage(mpUrl) {
  try {
    const response = await axios.get(mpUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract contact information from individual MP page
    // Adjust these selectors based on actual HTML structure
    return {
      email: $('.contact-email, .emel').text().trim() || null,
      telephone: $('.contact-phone, .telefon').text().trim() || null,
      fax: $('.contact-fax, .faks').text().trim() || null,
      mobileNumber: $('.contact-mobile, .bimbit').text().trim() || null,
      contactAddress: $('.contact-address, .alamat-pejabat').text().trim() || null,
      serviceAddress: $('.service-address, .alamat-khidmat').text().trim() || null,
      socialMedia: $('.social-media a').first().attr('href')?.trim() || null,
    };
  } catch (error) {
    console.error(`Error fetching MP detail page ${mpUrl}:`, error);
    return null;
  }
}

// Run the scraper
console.log('='.repeat(60));
console.log('MP Contact Information Scraper');
console.log('Malaysian Parliament Website');
console.log('='.repeat(60));
console.log('');

scrapeMPContacts()
  .then(() => {
    console.log('\n✓ Scraping completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Review the mp-contacts-scraped.json file');
    console.log('2. Update the database with this information');
    console.log('3. You can use the import script to update MP records');
  })
  .catch((error) => {
    console.error('\n✗ Scraping failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check if the website structure has changed');
    console.log('2. Inspect the HTML and update the CSS selectors');
    console.log('3. Try running this script on Replit where the site is accessible');
    process.exit(1);
  });
