/**
 * Copyright by Calmic Sdn Bhd
 *
 * Script to scrape MP contact information from Parliament profile pages
 * This script correctly parses the structured "MAKLUMAT" section of MP profiles
 * 
 * Run: tsx scripts/scrape-mp-profile-contacts.ts
 */

import { readFile, writeFile } from 'fs/promises';
import * as cheerio from 'cheerio';

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
 * Clean and validate an address string
 * Returns null if the value is a section header or invalid
 */
function cleanAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  
  // List of invalid values that should not be used as addresses
  const invalidValues = [
    'MAKLUMAT',
    'maklumat',
    '-',
    'N/A',
    'n/a',
    'Tiada',
    'tiada',
    '',
  ];
  
  // Check if value is a section header or invalid
  if (invalidValues.includes(trimmed)) {
    return null;
  }
  
  // Check if value is too short to be a valid address (less than 10 chars)
  if (trimmed.length < 10) {
    return null;
  }
  
  // Check if value looks like a section header (all caps, no numbers, no commas)
  if (trimmed === trimmed.toUpperCase() && !/\d/.test(trimmed) && !trimmed.includes(',')) {
    return null;
  }
  
  return trimmed;
}

/**
 * Clean and validate an email address
 */
function cleanEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  
  const trimmed = value.trim().toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(trimmed)) {
    return trimmed;
  }
  
  // Try to extract email from a string containing other text
  const emailMatch = trimmed.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    return emailMatch[0];
  }
  
  return null;
}

/**
 * Clean and validate a phone number
 */
function cleanPhoneNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  
  // Invalid values
  if (['-', 'N/A', 'n/a', 'Tiada', 'tiada', ''].includes(trimmed)) {
    return null;
  }
  
  // Must contain at least some digits
  if (!/\d/.test(trimmed)) {
    return null;
  }
  
  // Clean up the phone number format
  const cleaned = trimmed.replace(/\s+/g, ' ').trim();
  
  return cleaned || null;
}

/**
 * Parse the MP profile HTML to extract contact information
 */
function parseProfileHTML(html: string): Partial<MPContactInfo> {
  const $ = cheerio.load(html);
  const result: Partial<MPContactInfo> = {};
  
  // Strategy 1: Look for label-value pairs in the page structure
  // Based on the screenshot, the page has labels like "Email", "No. Telefon", "Alamat Surat-menyurat"
  
  // Try to find table cells or div pairs with labels
  const labelValuePairs: { [key: string]: string } = {};
  
  // Look for table rows with label-value pairs
  $('table tr, tbody tr').each((_, tr) => {
    const cells = $(tr).find('td, th');
    if (cells.length >= 2) {
      const label = $(cells[0]).text().trim().toLowerCase();
      const value = $(cells[1]).text().trim();
      if (label && value) {
        labelValuePairs[label] = value;
      }
    }
  });
  
  // Look for dl/dt/dd pairs
  $('dl').each((_, dl) => {
    $(dl).find('dt').each((i, dt) => {
      const label = $(dt).text().trim().toLowerCase();
      const dd = $(dt).next('dd');
      if (dd.length) {
        const value = dd.text().trim();
        if (label && value) {
          labelValuePairs[label] = value;
        }
      }
    });
  });
  
  // Look for div pairs with specific class patterns
  $('div').each((_, div) => {
    const text = $(div).text().trim();
    
    // Check if this div contains a labeled field pattern like "Email\naaron.ago@perpaduan.gov.my"
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length >= 2) {
      const label = lines[0].toLowerCase();
      const value = lines[1];
      
      // Only capture if this looks like a label-value pair
      if (label.length < 30 && !label.includes('@')) {
        labelValuePairs[label] = value;
      }
    }
  });
  
  // Look for specific labeled elements
  const findValueByLabel = (labels: string[]): string | null => {
    for (const label of labels) {
      const lowerLabel = label.toLowerCase();
      for (const [key, value] of Object.entries(labelValuePairs)) {
        if (key.includes(lowerLabel) || lowerLabel.includes(key)) {
          return value;
        }
      }
    }
    return null;
  };
  
  // Extract email
  const emailLink = $('a[href^="mailto:"]').first().attr('href');
  if (emailLink) {
    result.email = cleanEmail(emailLink.replace('mailto:', ''));
  } else {
    result.email = cleanEmail(findValueByLabel(['email', 'emel', 'e-mail']));
  }
  
  // Extract telephone
  result.telephone = cleanPhoneNumber(findValueByLabel(['no. telefon', 'telefon', 'telephone', 'phone', 'tel']));
  
  // Extract fax
  result.fax = cleanPhoneNumber(findValueByLabel(['no. faks', 'faks', 'fax']));
  
  // Extract mobile number
  result.mobileNumber = cleanPhoneNumber(findValueByLabel(['no. bimbit', 'bimbit', 'mobile', 'hp']));
  
  // Extract contact address - look for "Alamat Surat-menyurat"
  const rawAddress = findValueByLabel(['alamat surat-menyurat', 'alamat surat', 'alamat', 'address', 'office address']);
  result.contactAddress = cleanAddress(rawAddress);
  
  // Extract ministerial position - look for "Jawatan dalam Kabinet"
  result.ministerialPosition = findValueByLabel(['jawatan dalam kabinet', 'jawatan kabinet', 'cabinet position']);
  
  // Strategy 2: Extract from body text using regex patterns
  const bodyText = $('body').text();
  
  // Email fallback
  if (!result.email) {
    const emailMatch = bodyText.match(/[\w.-]+@[\w.-]+\.gov\.my/);
    if (emailMatch) {
      result.email = cleanEmail(emailMatch[0]);
    }
  }
  
  // Phone fallback - Malaysian phone numbers
  if (!result.telephone) {
    const phoneMatch = bodyText.match(/0[23]\s*-?\s*\d{4}\s*\d{4}/);
    if (phoneMatch) {
      result.telephone = cleanPhoneNumber(phoneMatch[0]);
    }
  }
  
  // Strategy 3: Look for the second MAKLUMAT section which typically has contact details
  // The page structure shows MAKLUMAT headers followed by label-value pairs
  const maklumatSections = $('*').filter((_, el) => {
    return $(el).text().trim() === 'MAKLUMAT';
  });
  
  maklumatSections.each((i, section) => {
    // Skip the first MAKLUMAT if there are multiple (first one is usually the profile info)
    if (i === 0 && maklumatSections.length > 1) return;
    
    // Get the parent container and look for sibling content
    const parent = $(section).parent();
    const siblings = parent.nextAll();
    
    siblings.each((_, sibling) => {
      const text = $(sibling).text().trim();
      
      // Look for email in this section
      if (!result.email) {
        const emailInSection = text.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailInSection) {
          result.email = cleanEmail(emailInSection[0]);
        }
      }
      
      // Look for address - typically after "Alamat Surat-menyurat"
      if (!result.contactAddress && text.includes('Alamat')) {
        const addressMatch = text.match(/Alamat[^:]*:\s*([\s\S]+?)(?=\n\n|$)/i);
        if (addressMatch) {
          result.contactAddress = cleanAddress(addressMatch[1]);
        }
      }
    });
  });
  
  return result;
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
  console.log('MP Contact Information Scraper');
  console.log('(Improved parser for Parliament profile pages)');
  console.log('='.repeat(60));
  console.log('');

  // Load the scraped MPs data
  console.log('Loading MP data...');
  const mpsData = await readFile('./scripts/scraped-mps.json', 'utf-8');
  const mps: ScrapedMP[] = JSON.parse(mpsData);
  console.log(`Found ${mps.length} MPs to process\n`);

  const results: MPContactInfo[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < mps.length; i++) {
    const mp = mps[i];
    console.log(`[${i + 1}/${mps.length}] Processing ${mp.name} (${mp.constituency})...`);

    try {
      // Fetch the MP's profile page
      const html = await fetchWithRetry(mp.profileUrl);

      // Parse contact information
      const contactInfo = parseProfileHTML(html);

      const result: MPContactInfo = {
        name: mp.name,
        parliamentCode: mp.parliamentCode,
        constituency: mp.constituency,
        email: contactInfo.email || null,
        telephone: contactInfo.telephone || null,
        fax: contactInfo.fax || null,
        mobileNumber: contactInfo.mobileNumber || null,
        contactAddress: contactInfo.contactAddress || null,
        serviceAddress: contactInfo.serviceAddress || null,
        ministerialPosition: contactInfo.ministerialPosition || null,
      };

      const hasContact = result.email || result.telephone || result.contactAddress;

      if (hasContact) {
        successCount++;
        console.log(`  ✓ Found contact info:`);
        if (result.email) console.log(`    Email: ${result.email}`);
        if (result.telephone) console.log(`    Tel: ${result.telephone}`);
        if (result.contactAddress) console.log(`    Address: ${result.contactAddress.substring(0, 50)}...`);
      } else {
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
  console.log(`With contact info: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`\nResults saved to: ${outputPath}`);
  console.log('\nNext step: Run "tsx scripts/update-mp-contacts.ts" to update the database');
}

// Run the scraper
scrapeAllMPContacts().catch(error => {
  console.error('Scraping failed:', error);
  process.exit(1);
});
