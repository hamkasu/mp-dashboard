/**
 * Copyright by Calmic Sdn Bhd
 *
 * Script to scrape MP contact information from Parliament profile pages
 * SIMPLIFIED: Only extracts clean email addresses using regex
 * 
 * Run: NODE_TLS_REJECT_UNAUTHORIZED=0 tsx scripts/scrape-mp-profile-contacts.ts
 */

import { readFile, writeFile } from 'fs/promises';
import * as cheerio from 'cheerio';

// Disable SSL verification for Parliament website (has certificate issues)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface ScrapedMP {
  name: string;
  fullName: string;
  party: string;
  parliamentCode: string;
  constituency: string;
  photoUrl: string;
  profileUrl: string;
}

interface MPContactInfo {
  name: string;
  parliamentCode: string;
  constituency: string;
  email: string | null;
  telephone: string | null;
  fax: string | null;
  mobileNumber: string | null;
  contactAddress: string | null;
  serviceAddress: string | null;
  ministerialPosition: string | null;
}

/**
 * Known site-wide/footer emails that should be ignored
 */
const SITE_WIDE_EMAILS = [
  'info@parlimen.gov.my',
  'webmaster@parlimen.gov.my',
  'admin@parlimen.gov.my',
  'parlimen@parlimen.gov.my',
];

/**
 * Extract a clean email address from HTML using multiple strategies
 * Priority: 
 * 1. mailto: link (but not site-wide emails like info@parlimen.gov.my)
 * 2. First non-site-wide .gov.my email found in page text
 * 3. First gmail.com email found in page text
 */
function extractEmail(html: string): string | null {
  const $ = cheerio.load(html);
  
  // Strategy 1: Look for mailto: links (most reliable, but filter site-wide ones)
  let foundEmail: string | null = null;
  $('a[href^="mailto:"]').each((_, el) => {
    if (foundEmail) return; // Already found one
    const mailtoLink = $(el).attr('href');
    if (mailtoLink) {
      const email = mailtoLink.replace('mailto:', '').trim().toLowerCase();
      // Validate it looks like an email and is not a site-wide address
      if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(email) && !SITE_WIDE_EMAILS.includes(email)) {
        foundEmail = email;
      }
    }
  });
  if (foundEmail) return foundEmail;
  
  // Strategy 3: Extract all emails from page and filter out site-wide ones
  const bodyText = $('body').text();
  
  // Find all emails in the page
  const allEmails = bodyText.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) || [];
  
  // Filter out site-wide emails and deduplicate
  const candidateEmails = [...new Set(
    allEmails
      .map(e => e.toLowerCase().trim())
      .filter(e => !SITE_WIDE_EMAILS.includes(e))
  )];
  
  if (candidateEmails.length === 0) {
    return null;
  }
  
  // Prioritize .gov.my emails (most common for MPs)
  const govEmail = candidateEmails.find(e => e.endsWith('.gov.my'));
  if (govEmail) {
    return govEmail;
  }
  
  // Then try gmail.com emails
  const gmailEmail = candidateEmails.find(e => e.endsWith('@gmail.com'));
  if (gmailEmail) {
    return gmailEmail;
  }
  
  // Return first valid candidate
  const validEmail = candidateEmails.find(e => 
    !e.includes('example') && !e.includes('test@')
  );
  
  return validEmail || null;
}

/**
 * Extract a clean phone number from HTML
 */
function extractPhone(html: string): string | null {
  const $ = cheerio.load(html);
  const bodyText = $('body').text();
  
  // Malaysian landline pattern: 03-XXXX XXXX or 09-XXX XXXX
  const landlineMatch = bodyText.match(/0[23789]\s*-?\s*\d{3,4}\s*\d{4}/);
  if (landlineMatch) {
    return landlineMatch[0].replace(/\s+/g, ' ').trim();
  }
  
  return null;
}

async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`  Retry ${i + 1}/${retries} for ${url}...`);
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

async function scrapeAllMPContacts() {
  console.log('='.repeat(60));
  console.log('MP Contact Information Scraper (Simplified)');
  console.log('Extracts only clean email addresses');
  console.log('='.repeat(60));
  console.log('');

  // Load the scraped MPs data
  console.log('Loading MP data...');
  const mpsData = await readFile('./scripts/scraped-mps.json', 'utf-8');
  const mps: ScrapedMP[] = JSON.parse(mpsData);
  console.log(`Found ${mps.length} MPs to process\n`);

  const results: MPContactInfo[] = [];
  let emailCount = 0;
  let phoneCount = 0;
  let errorCount = 0;

  for (let i = 0; i < mps.length; i++) {
    const mp = mps[i];
    console.log(`[${i + 1}/${mps.length}] Processing ${mp.name} (${mp.constituency})...`);

    try {
      // Fetch the MP's profile page
      const html = await fetchWithRetry(mp.profileUrl);

      // Extract email and phone using simple regex
      const email = extractEmail(html);
      const phone = extractPhone(html);

      const result: MPContactInfo = {
        name: mp.name,
        parliamentCode: mp.parliamentCode,
        constituency: mp.constituency,
        email: email,
        telephone: phone,
        fax: null,
        mobileNumber: null,
        contactAddress: null,  // Not extracting - too error-prone
        serviceAddress: null,
        ministerialPosition: null,
      };

      if (email) {
        emailCount++;
        console.log(`  ✓ Email: ${email}`);
      }
      if (phone) {
        phoneCount++;
        console.log(`  ✓ Phone: ${phone}`);
      }
      if (!email && !phone) {
        console.log(`  ⊘ No contact info found`);
      }

      results.push(result);

      // Add a small delay to be respectful to the server
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`  ✗ Error: ${error}`);
      errorCount++;
      results.push({
        name: mp.name,
        parliamentCode: mp.parliamentCode,
        constituency: mp.constituency,
        email: null,
        telephone: null,
        fax: null,
        mobileNumber: null,
        contactAddress: null,
        serviceAddress: null,
        ministerialPosition: null,
      });
    }
  }

  // Save results
  const outputPath = './mp-contacts-scraped.json';
  await writeFile(outputPath, JSON.stringify(results, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('Scraping Summary');
  console.log('='.repeat(60));
  console.log(`Total MPs: ${mps.length}`);
  console.log(`With email: ${emailCount}`);
  console.log(`With phone: ${phoneCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`\nResults saved to: ${outputPath}`);
  console.log('\nNext step: Run "tsx scripts/update-mp-contacts.ts" to update the database');
}

// Run the scraper
scrapeAllMPContacts().catch(error => {
  console.error('Scraping failed:', error);
  process.exit(1);
});
