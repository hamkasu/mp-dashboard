/**
 * Script to update MP contact information in the database
 * Run after scraping contact data from Parliament website
 *
 * Usage: tsx scripts/update-mp-contacts.ts
 */

import { db } from '../db';
import { mps } from '@db/schema';
import { eq, or, ilike } from 'drizzle-orm';
import { readFile } from 'fs/promises';

interface ScrapedMPContact {
  name: string;
  constituency?: string;
  party?: string;
  email?: string | null;
  telephone?: string | null;
  fax?: string | null;
  mobileNumber?: string | null;
  contactAddress?: string | null;
  serviceAddress?: string | null;
  socialMedia?: string | null;
}

/**
 * List of invalid values that should be filtered out
 * These are section headers or placeholder values that got scraped incorrectly
 */
const INVALID_ADDRESS_VALUES = [
  'MAKLUMAT',
  'maklumat',
  'INFORMATION',
  'Contact Information',
  'Contact Address',
  'Alamat',
  '-',
  'N/A',
  'n/a',
  'Tiada',
  'tiada',
  '',
];

/**
 * Clean and validate an address string
 */
function cleanAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  
  // Check against invalid values
  if (INVALID_ADDRESS_VALUES.includes(trimmed)) {
    console.log(`  ⚠ Skipping invalid address value: "${trimmed}"`);
    return null;
  }
  
  // Check if value is too short to be a valid address
  if (trimmed.length < 10) {
    console.log(`  ⚠ Skipping too-short address: "${trimmed}"`);
    return null;
  }
  
  // Check if value looks like a section header (all caps, no numbers, no commas)
  if (trimmed === trimmed.toUpperCase() && !/\d/.test(trimmed) && !trimmed.includes(',')) {
    console.log(`  ⚠ Skipping section header as address: "${trimmed}"`);
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
  
  // Check against invalid values
  if (['-', 'N/A', 'n/a', 'Tiada', 'tiada', ''].includes(trimmed)) {
    return null;
  }
  
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
  
  console.log(`  ⚠ Skipping invalid email: "${trimmed}"`);
  return null;
}

/**
 * Clean and validate a phone number
 */
function cleanPhoneNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  
  // Check against invalid values
  if (['-', 'N/A', 'n/a', 'Tiada', 'tiada', ''].includes(trimmed)) {
    return null;
  }
  
  // Must contain at least some digits
  if (!/\d/.test(trimmed)) {
    console.log(`  ⚠ Skipping invalid phone: "${trimmed}"`);
    return null;
  }
  
  return trimmed;
}

async function updateMPContacts() {
  console.log('Loading scraped MP contact data...');

  try {
    // Read the scraped data file
    const data = await readFile('./mp-contacts-scraped.json', 'utf-8');
    const scrapedContacts: ScrapedMPContact[] = JSON.parse(data);

    console.log(`Found ${scrapedContacts.length} contact records to process\n`);

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (const contact of scrapedContacts) {
      try {
        // Try to find the MP in the database
        // Match by name, or constituency
        const matchingMps = await db
          .select()
          .from(mps)
          .where(
            or(
              ilike(mps.name, `%${contact.name}%`),
              contact.constituency ? ilike(mps.constituency, `%${contact.constituency}%`) : undefined
            )
          )
          .limit(5);

        if (matchingMps.length === 0) {
          console.log(`⚠ No match found for: ${contact.name} (${contact.constituency})`);
          notFound++;
          continue;
        }

        // If multiple matches, pick the best one
        let bestMatch = matchingMps[0];
        if (matchingMps.length > 1) {
          console.log(`  Found ${matchingMps.length} matches for ${contact.name}:`);
          matchingMps.forEach((mp, i) => {
            console.log(`    ${i + 1}. ${mp.name} - ${mp.constituency} (${mp.party})`);
          });

          // Try to find exact match by name
          const exactMatch = matchingMps.find(mp =>
            mp.name.toLowerCase() === contact.name.toLowerCase()
          );
          if (exactMatch) {
            bestMatch = exactMatch;
            console.log(`  → Using exact name match: ${bestMatch.name}`);
          } else {
            console.log(`  → Using first match: ${bestMatch.name}`);
          }
        }

        // Update the MP with contact information - apply validation
        const updateData: any = {};

        const cleanedEmail = cleanEmail(contact.email);
        const cleanedTelephone = cleanPhoneNumber(contact.telephone);
        const cleanedFax = cleanPhoneNumber(contact.fax);
        const cleanedMobile = cleanPhoneNumber(contact.mobileNumber);
        const cleanedContactAddress = cleanAddress(contact.contactAddress);
        const cleanedServiceAddress = cleanAddress(contact.serviceAddress);

        if (cleanedEmail) updateData.email = cleanedEmail;
        if (cleanedTelephone) updateData.telephone = cleanedTelephone;
        if (cleanedFax) updateData.fax = cleanedFax;
        if (cleanedMobile) updateData.mobileNumber = cleanedMobile;
        if (cleanedContactAddress) updateData.contactAddress = cleanedContactAddress;
        if (cleanedServiceAddress) updateData.serviceAddress = cleanedServiceAddress;
        if (contact.socialMedia) updateData.socialMedia = contact.socialMedia;

        // Only update if we have at least one contact field
        if (Object.keys(updateData).length > 0) {
          await db
            .update(mps)
            .set(updateData)
            .where(eq(mps.id, bestMatch.id));

          const fields = Object.keys(updateData).join(', ');
          console.log(`✓ Updated ${bestMatch.name}: ${fields}`);
          updated++;
        } else {
          console.log(`⊘ No contact data for ${bestMatch.name}`);
        }

      } catch (error) {
        console.error(`✗ Error processing ${contact.name}:`, error);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Update Summary:');
    console.log('='.repeat(60));
    console.log(`✓ Successfully updated: ${updated}`);
    console.log(`⚠ Not found in database: ${notFound}`);
    console.log(`✗ Errors: ${errors}`);
    console.log(`Total processed: ${scrapedContacts.length}`);

  } catch (error) {
    console.error('Error updating MP contacts:', error);
    throw error;
  }
}

// Run the update
console.log('='.repeat(60));
console.log('MP Contact Information Update Script');
console.log('='.repeat(60));
console.log('');

updateMPContacts()
  .then(() => {
    console.log('\n✓ Contact update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Update failed:', error.message);
    process.exit(1);
  });
