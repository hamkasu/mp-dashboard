/**
 * Copyright by Calmic Sdn Bhd
 *
 * Script to scrape MP social media profile URLs from Parliament website
 * Run: tsx scripts/scrape-mp-social-media.ts
 *
 * This script fetches MP profile pages and extracts social media URLs
 * (Facebook, Instagram, Twitter/X, TikTok)
 */

import { readFile, writeFile } from 'fs/promises';

interface ScrapedMP {
  name: string;
  fullName: string;
  party: string;
  parliamentCode: string;
  constituency: string;
  photoUrl: string;
  profileUrl: string;
}

interface MPSocialMedia {
  name: string;
  parliamentCode: string;
  constituency: string;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  tiktokUrl?: string | null;
}

// Social media URL patterns
const SOCIAL_MEDIA_PATTERNS = {
  facebook: [
    /https?:\/\/(www\.)?(facebook\.com|fb\.com)\/[^\s"'<>]+/gi,
    /facebook\.com\/[^\s"'<>]+/gi,
  ],
  instagram: [
    /https?:\/\/(www\.)?instagram\.com\/[^\s"'<>]+/gi,
    /instagram\.com\/[^\s"'<>]+/gi,
  ],
  twitter: [
    /https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^\s"'<>]+/gi,
    /twitter\.com\/[^\s"'<>]+/gi,
    /x\.com\/[^\s"'<>]+/gi,
  ],
  tiktok: [
    /https?:\/\/(www\.)?tiktok\.com\/@?[^\s"'<>]+/gi,
    /tiktok\.com\/@?[^\s"'<>]+/gi,
  ],
};

function cleanUrl(url: string): string {
  // Remove trailing punctuation and common URL artifacts
  return url
    .replace(/['"<>)\]]+$/, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, '');
}

function extractSocialMediaUrls(html: string): {
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  tiktokUrl?: string;
} {
  const result: {
    facebookUrl?: string;
    instagramUrl?: string;
    twitterUrl?: string;
    tiktokUrl?: string;
  } = {};

  // Extract Facebook URL
  for (const pattern of SOCIAL_MEDIA_PATTERNS.facebook) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      // Filter out share buttons and common non-profile URLs
      const validUrl = matches.find(url =>
        !url.includes('sharer') &&
        !url.includes('/share') &&
        !url.includes('dialog/') &&
        !url.includes('plugins/')
      );
      if (validUrl) {
        result.facebookUrl = cleanUrl(validUrl.startsWith('http') ? validUrl : `https://${validUrl}`);
        break;
      }
    }
  }

  // Extract Instagram URL
  for (const pattern of SOCIAL_MEDIA_PATTERNS.instagram) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      // Filter out embed URLs
      const validUrl = matches.find(url =>
        !url.includes('embed') &&
        !url.includes('/p/')  // Exclude post URLs
      );
      if (validUrl) {
        result.instagramUrl = cleanUrl(validUrl.startsWith('http') ? validUrl : `https://${validUrl}`);
        break;
      }
    }
  }

  // Extract Twitter/X URL
  for (const pattern of SOCIAL_MEDIA_PATTERNS.twitter) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      // Filter out intent/share URLs
      const validUrl = matches.find(url =>
        !url.includes('intent') &&
        !url.includes('share') &&
        !url.includes('/status/')  // Exclude individual tweet URLs
      );
      if (validUrl) {
        result.twitterUrl = cleanUrl(validUrl.startsWith('http') ? validUrl : `https://${validUrl}`);
        break;
      }
    }
  }

  // Extract TikTok URL
  for (const pattern of SOCIAL_MEDIA_PATTERNS.tiktok) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      // Filter out video URLs
      const validUrl = matches.find(url =>
        !url.includes('/video/')
      );
      if (validUrl) {
        result.tiktokUrl = cleanUrl(validUrl.startsWith('http') ? validUrl : `https://${validUrl}`);
        break;
      }
    }
  }

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

async function scrapeSocialMedia() {
  console.log('='.repeat(60));
  console.log('MP Social Media Scraper');
  console.log('='.repeat(60));
  console.log('');

  // Load the scraped MPs data
  console.log('Loading MP data...');
  const mpsData = await readFile('./scripts/scraped-mps.json', 'utf-8');
  const mps: ScrapedMP[] = JSON.parse(mpsData);
  console.log(`Found ${mps.length} MPs to process\n`);

  const results: MPSocialMedia[] = [];
  let foundCount = 0;
  let errorCount = 0;

  for (let i = 0; i < mps.length; i++) {
    const mp = mps[i];
    console.log(`[${i + 1}/${mps.length}] Processing ${mp.name} (${mp.constituency})...`);

    try {
      // Fetch the MP's profile page
      const html = await fetchWithRetry(mp.profileUrl);

      // Extract social media URLs
      const socialMedia = extractSocialMediaUrls(html);

      const result: MPSocialMedia = {
        name: mp.name,
        parliamentCode: mp.parliamentCode,
        constituency: mp.constituency,
        ...socialMedia,
      };

      const hasSocial = result.facebookUrl || result.instagramUrl || result.twitterUrl || result.tiktokUrl;

      if (hasSocial) {
        foundCount++;
        console.log(`  ✓ Found social media:`);
        if (result.facebookUrl) console.log(`    Facebook: ${result.facebookUrl}`);
        if (result.instagramUrl) console.log(`    Instagram: ${result.instagramUrl}`);
        if (result.twitterUrl) console.log(`    Twitter/X: ${result.twitterUrl}`);
        if (result.tiktokUrl) console.log(`    TikTok: ${result.tiktokUrl}`);
      } else {
        console.log(`  ⊘ No social media found`);
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
      });
    }
  }

  // Save results
  const outputPath = './scripts/mp-social-media-scraped.json';
  await writeFile(outputPath, JSON.stringify(results, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('Scrape Summary:');
  console.log('='.repeat(60));
  console.log(`✓ MPs with social media found: ${foundCount}`);
  console.log(`⊘ MPs without social media: ${mps.length - foundCount - errorCount}`);
  console.log(`✗ Errors: ${errorCount}`);
  console.log(`Total processed: ${mps.length}`);
  console.log(`\nResults saved to: ${outputPath}`);
}

// Run the scraper
scrapeSocialMedia()
  .then(() => {
    console.log('\n✓ Scraping completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Scraping failed:', error.message);
    process.exit(1);
  });
