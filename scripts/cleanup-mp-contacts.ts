/**
 * Copyright by Calmic Sdn Bhd
 * 
 * Script to clean up corrupted MP contact data in the database
 * Fixes:
 * - Email fields containing concatenated "MAKLUMAT" section text
 * - Contact address fields with section headers like "MAKLUMAT"
 * 
 * Run: tsx scripts/cleanup-mp-contacts.ts
 */

import { db } from '../server/db';
import { mps } from '../shared/schema';
import { eq } from 'drizzle-orm';

const HEADER_KEYWORDS = [
  'maklumat',
  'information',
  'ahli parlimen',
  'profil',
  'hubungi',
  'butiran',
  'senarai',
  'nama yb',
  'jawatan dalam',
  'parti gps',
  'tempat duduk',
  'parlimen p',
  'kawasan',
  'negeri',
];

const INVALID_EXACT_VALUES = [
  '-',
  'n/a',
  'tiada',
  'kosong',
  'tidak ada',
  'na',
  'null',
  'undefined',
  '',
  'maklumat',
];

function extractValidEmail(value: string | null): string | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  
  if (trimmed.length === 0) return null;
  
  const lowerValue = trimmed.toLowerCase();
  
  if (lowerValue.length > 100) {
    console.log(`  Long email field detected (${trimmed.length} chars), extracting email...`);
  }
  
  const emailRegex = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi;
  const matches = trimmed.match(emailRegex);
  
  if (!matches || matches.length === 0) {
    return null;
  }
  
  const siteWideEmails = [
    'info@parlimen.gov.my',
    'webmaster@parlimen.gov.my',
    'admin@parlimen.gov.my',
    'parlimen@parlimen.gov.my',
  ];
  
  const validEmails = matches
    .map(e => e.toLowerCase().trim())
    .filter(e => !siteWideEmails.includes(e));
  
  if (validEmails.length === 0) {
    return null;
  }
  
  const govEmail = validEmails.find(e => e.endsWith('.gov.my'));
  if (govEmail) {
    return govEmail;
  }
  
  const gmailEmail = validEmails.find(e => e.endsWith('@gmail.com'));
  if (gmailEmail) {
    return gmailEmail;
  }
  
  return validEmails[0];
}

function cleanContactAddress(value: string | null): string | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  const lowerValue = trimmed.toLowerCase();
  
  if (INVALID_EXACT_VALUES.includes(lowerValue)) {
    return null;
  }
  
  for (const keyword of HEADER_KEYWORDS) {
    if (lowerValue.includes(keyword)) {
      console.log(`  Address contains header keyword "${keyword}", clearing...`);
      return null;
    }
  }
  
  if (trimmed.length < 15) {
    return null;
  }
  
  if (trimmed === trimmed.toUpperCase() && !/\d/.test(trimmed) && !trimmed.includes(',')) {
    return null;
  }
  
  if (trimmed.length > 500) {
    console.log(`  Address too long (${trimmed.length} chars), clearing...`);
    return null;
  }
  
  const hasNumbers = /\d/.test(trimmed);
  const hasAddressTerms = /jalan|lorong|taman|kampung|bandar|negeri|blok|aras|tingkat|lot|presint|putrajaya|kuala lumpur/i.test(trimmed);
  
  if (!hasNumbers && !hasAddressTerms) {
    return null;
  }
  
  return trimmed.replace(/\s+/g, ' ');
}

async function cleanupMPContacts() {
  console.log('='.repeat(60));
  console.log('MP Contact Data Cleanup Script');
  console.log('Fixes corrupted email and contact address fields');
  console.log('='.repeat(60));
  console.log('');

  const allMps = await db.select().from(mps);
  console.log(`Found ${allMps.length} MPs to check\n`);

  let emailFixed = 0;
  let emailCleared = 0;
  let addressCleared = 0;
  let unchanged = 0;
  let errors = 0;

  for (const mp of allMps) {
    console.log(`Checking ${mp.name} (${mp.constituency})...`);
    
    try {
      const updates: Partial<typeof mp> = {};
      let needsUpdate = false;
      
      if (mp.email) {
        const lowerEmail = mp.email.toLowerCase();
        const isCorrupted = lowerEmail.includes('maklumat') || 
                           lowerEmail.includes('nama yb') ||
                           lowerEmail.includes('jawatan dalam') ||
                           mp.email.length > 100;
        
        if (isCorrupted) {
          const cleanedEmail = extractValidEmail(mp.email);
          if (cleanedEmail && cleanedEmail !== mp.email.toLowerCase()) {
            console.log(`  Email: "${mp.email.substring(0, 50)}..." -> "${cleanedEmail}"`);
            updates.email = cleanedEmail;
            needsUpdate = true;
            emailFixed++;
          } else if (!cleanedEmail) {
            console.log(`  Email: Clearing corrupted value (no valid email found)`);
            updates.email = null;
            needsUpdate = true;
            emailCleared++;
          }
        } else {
          const emailRegex = /^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i;
          if (!emailRegex.test(mp.email)) {
            const extracted = extractValidEmail(mp.email);
            if (extracted) {
              console.log(`  Email: "${mp.email}" -> "${extracted}"`);
              updates.email = extracted;
              needsUpdate = true;
              emailFixed++;
            }
          }
        }
      }
      
      if (mp.contactAddress) {
        const cleanedAddress = cleanContactAddress(mp.contactAddress);
        if (cleanedAddress === null && mp.contactAddress) {
          console.log(`  Address: Clearing invalid value "${mp.contactAddress.substring(0, 50)}..."`);
          updates.contactAddress = null;
          needsUpdate = true;
          addressCleared++;
        }
      }
      
      if (needsUpdate) {
        await db
          .update(mps)
          .set(updates)
          .where(eq(mps.id, mp.id));
        console.log(`  Updated!`);
      } else {
        unchanged++;
      }
      
    } catch (error) {
      console.error(`  Error: ${error}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Cleanup Summary');
  console.log('='.repeat(60));
  console.log(`Total MPs checked: ${allMps.length}`);
  console.log(`Emails fixed (extracted): ${emailFixed}`);
  console.log(`Emails cleared (no valid email): ${emailCleared}`);
  console.log(`Addresses cleared: ${addressCleared}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Errors: ${errors}`);
}

cleanupMPContacts()
  .then(() => {
    console.log('\nCleanup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
