/**
 * Alternative script: Parse MP contact info from saved HTML
 *
 * If you can access the site on Replit:
 * 1. Open https://www.parlimen.gov.my/ahli-dewan.html?uweb=dr&
 * 2. Right-click → "Save Page As" → save as mp-list.html
 * 3. Place mp-list.html in the scripts/ directory
 * 4. Run: node scripts/parse-mp-html.js
 */

import * as cheerio from 'cheerio';
import { readFile, writeFile } from 'fs/promises';

async function parseHTMLFile() {
  console.log('Reading saved HTML file...');

  try {
    // Read the saved HTML file
    const html = await readFile('./scripts/mp-list.html', 'utf-8');
    const $ = cheerio.load(html);

    console.log('Parsing MP information...\n');

    const mpContacts = [];

    // Strategy 1: Look for common table structures
    $('table tr').each((index, element) => {
      if (index === 0) return; // Skip header row

      const $row = $(element);
      const cells = $row.find('td');

      if (cells.length >= 3) {
        const name = $(cells[0]).text().trim();
        const constituency = $(cells[1]).text().trim();
        const party = $(cells[2]).text().trim();

        // Look for email links
        const emailLink = $row.find('a[href^="mailto:"]').attr('href');
        const email = emailLink ? emailLink.replace('mailto:', '').trim() : null;

        // Look for phone numbers (common patterns)
        const text = $row.text();
        const phoneMatch = text.match(/(?:Tel|Telefon|Phone)[\s:]*([0-9\s\-()]+)/i);
        const faxMatch = text.match(/(?:Fax|Faks)[\s:]*([0-9\s\-()]+)/i);
        const mobileMatch = text.match(/(?:Mobile|HP|Bimbit)[\s:]*([0-9\s\-()]+)/i);

        if (name && name.length > 3) {
          mpContacts.push({
            name,
            constituency: constituency || null,
            party: party || null,
            email,
            telephone: phoneMatch ? phoneMatch[1].trim() : null,
            fax: faxMatch ? faxMatch[1].trim() : null,
            mobileNumber: mobileMatch ? mobileMatch[1].trim() : null,
            contactAddress: null,
            socialMedia: null,
          });
        }
      }
    });

    // Strategy 2: Look for card-based layouts
    $('.mp-card, .ahli-card, .member-card').each((index, element) => {
      const $card = $(element);

      const name = $card.find('.name, .nama, h3, h4').first().text().trim();
      const constituency = $card.find('.constituency, .kawasan, .daerah').text().trim();
      const party = $card.find('.party, .parti').text().trim();

      const emailLink = $card.find('a[href^="mailto:"]').attr('href');
      const email = emailLink ? emailLink.replace('mailto:', '').trim() : null;

      // Extract all text and look for patterns
      const cardText = $card.text();
      const phoneMatch = cardText.match(/(?:Tel|Telefon|Phone)[\s:]*([0-9\s\-()]+)/i);
      const faxMatch = cardText.match(/(?:Fax|Faks)[\s:]*([0-9\s\-()]+)/i);
      const mobileMatch = cardText.match(/(?:Mobile|HP|Bimbit)[\s:]*([0-9\s\-()]+)/i);

      // Look for address
      const address = $card.find('.address, .alamat').text().trim();

      // Look for social media
      const socialLink = $card.find('a[href*="facebook"], a[href*="twitter"], a[href*="instagram"]').first().attr('href');

      if (name && name.length > 3) {
        mpContacts.push({
          name,
          constituency: constituency || null,
          party: party || null,
          email,
          telephone: phoneMatch ? phoneMatch[1].trim() : null,
          fax: faxMatch ? faxMatch[1].trim() : null,
          mobileNumber: mobileMatch ? mobileMatch[1].trim() : null,
          contactAddress: address || null,
          socialMedia: socialLink || null,
        });
      }
    });

    // Strategy 3: Look for list items
    $('li.mp-item, li.ahli-item, div.mp-entry').each((index, element) => {
      const $item = $(element);

      const name = $item.find('.name, .nama, strong, b').first().text().trim();
      const emailLink = $item.find('a[href^="mailto:"]').attr('href');
      const email = emailLink ? emailLink.replace('mailto:', '').trim() : null;

      const itemText = $item.text();
      const phoneMatch = itemText.match(/(?:Tel|Telefon|Phone)[\s:]*([0-9\s\-()]+)/i);

      if (name && name.length > 3) {
        mpContacts.push({
          name,
          constituency: null,
          party: null,
          email,
          telephone: phoneMatch ? phoneMatch[1].trim() : null,
          fax: null,
          mobileNumber: null,
          contactAddress: null,
          socialMedia: null,
        });
      }
    });

    console.log(`Found ${mpContacts.length} MP records\n`);

    if (mpContacts.length === 0) {
      console.log('⚠ No MP data found!');
      console.log('\nDebugging information:');
      console.log('1. Check if the HTML file contains the MP list');
      console.log('2. Inspect the HTML structure and update the selectors');
      console.log('\nHTML Preview (first 500 characters):');
      console.log(html.substring(0, 500));
      console.log('\n3. Looking for common elements:');
      console.log(`   - Tables found: ${$('table').length}`);
      console.log(`   - List items found: ${$('li').length}`);
      console.log(`   - Div elements: ${$('div').length}`);
      console.log(`   - Email links: ${$('a[href^="mailto:"]').length}`);
      return;
    }

    // Save results
    const outputPath = './mp-contacts-scraped.json';
    await writeFile(outputPath, JSON.stringify(mpContacts, null, 2));

    console.log(`✓ Data saved to: ${outputPath}`);
    console.log('\nSample data (first 3 entries):');
    console.log(JSON.stringify(mpContacts.slice(0, 3), null, 2));

    // Statistics
    const withEmail = mpContacts.filter(mp => mp.email).length;
    const withPhone = mpContacts.filter(mp => mp.telephone).length;
    const withFax = mpContacts.filter(mp => mp.fax).length;
    const withAddress = mpContacts.filter(mp => mp.contactAddress).length;

    console.log('\nStatistics:');
    console.log(`  Total MPs: ${mpContacts.length}`);
    console.log(`  With email: ${withEmail}`);
    console.log(`  With telephone: ${withPhone}`);
    console.log(`  With fax: ${withFax}`);
    console.log(`  With address: ${withAddress}`);

    console.log('\n✓ Parsing completed!');
    console.log('\nNext step: Run "tsx scripts/update-mp-contacts.ts" to update the database');

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('✗ Error: mp-list.html not found!');
      console.log('\nPlease:');
      console.log('1. Visit https://www.parlimen.gov.my/ahli-dewan.html?uweb=dr& on Replit');
      console.log('2. Save the page as "mp-list.html"');
      console.log('3. Place it in the scripts/ directory');
      console.log('4. Run this script again');
    } else {
      console.error('✗ Error parsing HTML:', error);
    }
  }
}

console.log('='.repeat(60));
console.log('MP Contact Information HTML Parser');
console.log('='.repeat(60));
console.log('');

parseHTMLFile();
