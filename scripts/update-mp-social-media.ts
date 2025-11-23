/**
 * Copyright by Calmic Sdn Bhd
 *
 * Script to update MP social media URLs in the database
 * Run after scraping social media data with scrape-mp-social-media.ts
 *
 * Usage: tsx scripts/update-mp-social-media.ts
 */

import { db } from '../server/db';
import { mps } from '../shared/schema';
import { eq, or, ilike } from 'drizzle-orm';
import { readFile } from 'fs/promises';

interface MPSocialMedia {
  name: string;
  parliamentCode: string;
  constituency: string;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  tiktokUrl?: string | null;
}

async function updateMPSocialMedia() {
  console.log('Loading scraped MP social media data...');

  try {
    // Read the scraped data file
    const data = await readFile('./scripts/mp-social-media-scraped.json', 'utf-8');
    const scrapedData: MPSocialMedia[] = JSON.parse(data);

    console.log(`Found ${scrapedData.length} social media records to process\n`);

    let updated = 0;
    let notFound = 0;
    let noData = 0;
    let errors = 0;

    for (const socialMedia of scrapedData) {
      try {
        // Check if there's any social media data
        const hasSocialMedia = socialMedia.facebookUrl || socialMedia.instagramUrl ||
                               socialMedia.twitterUrl || socialMedia.tiktokUrl;

        if (!hasSocialMedia) {
          noData++;
          continue;
        }

        // Try to find the MP in the database by parliament code first, then name/constituency
        let matchingMps = await db
          .select()
          .from(mps)
          .where(eq(mps.parliamentCode, socialMedia.parliamentCode))
          .limit(1);

        if (matchingMps.length === 0) {
          // Fall back to name/constituency matching
          matchingMps = await db
            .select()
            .from(mps)
            .where(
              or(
                ilike(mps.name, `%${socialMedia.name}%`),
                ilike(mps.constituency, `%${socialMedia.constituency}%`)
              )
            )
            .limit(5);
        }

        if (matchingMps.length === 0) {
          console.log(`⚠ No match found for: ${socialMedia.name} (${socialMedia.parliamentCode})`);
          notFound++;
          continue;
        }

        // If multiple matches, pick the best one
        let bestMatch = matchingMps[0];
        if (matchingMps.length > 1) {
          // Try to find exact match by parliament code
          const exactMatch = matchingMps.find(mp =>
            mp.parliamentCode === socialMedia.parliamentCode
          );
          if (exactMatch) {
            bestMatch = exactMatch;
          }
        }

        // Update the MP with social media information
        const updateData: {
          facebookUrl?: string | null;
          instagramUrl?: string | null;
          twitterUrl?: string | null;
          tiktokUrl?: string | null;
        } = {};

        if (socialMedia.facebookUrl) updateData.facebookUrl = socialMedia.facebookUrl;
        if (socialMedia.instagramUrl) updateData.instagramUrl = socialMedia.instagramUrl;
        if (socialMedia.twitterUrl) updateData.twitterUrl = socialMedia.twitterUrl;
        if (socialMedia.tiktokUrl) updateData.tiktokUrl = socialMedia.tiktokUrl;

        // Only update if we have at least one social media field
        if (Object.keys(updateData).length > 0) {
          await db
            .update(mps)
            .set(updateData)
            .where(eq(mps.id, bestMatch.id));

          const fields = Object.keys(updateData).join(', ');
          console.log(`✓ Updated ${bestMatch.name}: ${fields}`);
          updated++;
        }

      } catch (error) {
        console.error(`✗ Error processing ${socialMedia.name}:`, error);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Update Summary:');
    console.log('='.repeat(60));
    console.log(`✓ Successfully updated: ${updated}`);
    console.log(`⊘ No social media data: ${noData}`);
    console.log(`⚠ Not found in database: ${notFound}`);
    console.log(`✗ Errors: ${errors}`);
    console.log(`Total processed: ${scrapedData.length}`);

  } catch (error) {
    console.error('Error updating MP social media:', error);
    throw error;
  }
}

// Run the update
console.log('='.repeat(60));
console.log('MP Social Media Update Script');
console.log('='.repeat(60));
console.log('');

updateMPSocialMedia()
  .then(() => {
    console.log('\n✓ Social media update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Update failed:', error.message);
    process.exit(1);
  });
