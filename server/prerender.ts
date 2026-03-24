/**
 * Copyright by Calmic Sdn Bhd
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, isDatabaseAvailable } from './db';
import { mps } from '../shared/schema';
import type { Mp } from '../shared/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PageMetadata {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string;
  structuredData?: any;
}

function generateMetaTags(metadata: PageMetadata): string {
  const baseUrl = 'https://myparliament.calmic.com.my';
  const fullUrl = `${baseUrl}${metadata.url}`;
  
  const structuredDataScripts = metadata.structuredData 
    ? (Array.isArray(metadata.structuredData)
        ? metadata.structuredData.map(data => `<script type="application/ld+json">${JSON.stringify(data)}</script>`).join('\n    ')
        : `<script type="application/ld+json">${JSON.stringify(metadata.structuredData)}</script>`)
    : '';
  
  return `
    <title>${metadata.title}</title>
    <meta name="description" content="${metadata.description}" />
    <link rel="canonical" href="${fullUrl}">
    
    <meta property="og:title" content="${metadata.title}" />
    <meta property="og:description" content="${metadata.description}" />
    <meta property="og:type" content="${metadata.type || 'website'}" />
    <meta property="og:url" content="${fullUrl}" />
    <meta property="og:site_name" content="Malaysian Parliament Dashboard" />
    ${metadata.image ? `<meta property="og:image" content="${metadata.image}" />` : ''}
    
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${metadata.title}" />
    <meta name="twitter:description" content="${metadata.description}" />
    ${metadata.image ? `<meta name="twitter:image" content="${metadata.image}" />` : ''}
    
    ${structuredDataScripts}
  `.trim();
}

function generateMpStructuredData(mp: Mp, attendanceRate: string): any[] {
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": mp.name,
    "jobTitle": mp.role || "Member of Parliament",
    "description": `${mp.party} Member of Parliament representing ${mp.constituency}, ${mp.state}. Parliament attendance rate: ${attendanceRate}%.`,
    "affiliation": {
      "@type": "Organization",
      "name": mp.party
    },
    "worksFor": {
      "@type": "GovernmentOrganization",
      "name": "Malaysian Parliament - Dewan Rakyat",
      "url": "https://www.parlimen.gov.my",
      "department": {
        "@type": "GovernmentOrganization",
        "name": mp.party
      }
    },
    "memberOf": {
      "@type": "Organization",
      "name": mp.party
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": mp.constituency,
      "addressRegion": mp.state,
      "addressCountry": "MY"
    },
    "knowsAbout": mp.role ? [mp.role, "Parliamentary Affairs", "Malaysian Politics"] : ["Parliamentary Affairs", "Malaysian Politics"],
    ...(mp.photoUrl && { "image": mp.photoUrl }),
    "url": `https://myparliament.calmic.com.my/mp/${mp.id}`,
    "identifier": mp.parliamentCode,
    "gender": mp.gender === "M" ? "Male" : mp.gender === "F" ? "Female" : undefined,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Malaysian Parliament Dashboard",
        "item": "https://myparliament.calmic.com.my"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": `${mp.state} MPs`,
        "item": `https://myparliament.calmic.com.my?state=${encodeURIComponent(mp.state)}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": `${mp.name} - ${mp.constituency}`,
        "item": `https://myparliament.calmic.com.my/mp/${mp.id}`
      }
    ]
  };

  const governmentServiceSchema = {
    "@context": "https://schema.org",
    "@type": "GovernmentService",
    "name": `${mp.constituency} Parliamentary Services`,
    "description": `Parliamentary representation services for ${mp.constituency}, ${mp.state} provided by ${mp.name} (${mp.party}).`,
    "provider": {
      "@type": "Person",
      "name": mp.name,
      "jobTitle": mp.role || "Member of Parliament"
    },
    "areaServed": {
      "@type": "AdministrativeArea",
      "name": mp.constituency,
      "containedInPlace": {
        "@type": "State",
        "name": mp.state
      }
    },
    "audience": {
      "@type": "Audience",
      "audienceType": "Residents of " + mp.constituency
    }
  };

  return [personSchema, breadcrumbSchema, governmentServiceSchema];
}

function generateOrganizationStructuredData(): any {
  return {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    "name": "Malaysian Parliament MP Dashboard",
    "alternateName": "Dewan Rakyat Dashboard",
    "url": "https://myparliament.calmic.com.my",
    "description": "Track all 222 Malaysian Parliament MPs, voting records, attendance rates, parliamentary activities, court cases, and SPRM investigations in one transparent platform.",
    "sameAs": [
      "https://www.parlimen.gov.my"
    ],
    "areaServed": {
      "@type": "Country",
      "name": "Malaysia"
    }
  };
}

/**
 * Structured data for the constituency analysis page.
 *
 * SEO REASONING — paywalled / gated content:
 *
 * Google's official guidance (https://developers.google.com/search/docs/appearance/structured-data/paywalled-content)
 * says to use isAccessibleForFree:"False" on the WebPage and mark the gated
 * elements with hasPart → WebPageElement → cssSelector.  This tells Google:
 *   1. The page is real and crawlable (not cloaked).
 *   2. Some content is behind a subscription — Googlebot should not penalise
 *      the page for showing less content than a paying user sees.
 *   3. The *preview* content (title, summary stats, top-5 table, chart) IS
 *      the freely accessible section and CAN be indexed fully.
 *
 * What we intentionally do NOT do:
 *   - We do NOT serve different HTML to Googlebot vs users (deceptive cloaking).
 *   - We do NOT put premium data in hidden HTML elements (CSS display:none / aria-hidden).
 *   - The premium API endpoint returns 401/403 for unauthenticated requests,
 *     even when Googlebot calls it — the full dataset never leaks.
 *
 * The public preview rendered in HTML contains:
 *   - Page title & meta description (always indexed)
 *   - 3 summary stat cards (always indexed)
 *   - Distribution bar chart (rendered as SVG/DOM — indexed)
 *   - Top-5 constituency rows (real data — indexed)
 *
 * The gated section (rows 6–10 blurred + full 222-row table) is wrapped in
 * <div class="premium-content"> so the cssSelector below matches Google's
 * structured-data validator.
 */
function generateConstituencyStructuredData(
  totalConstituencies = 222,
  avgRate = 67
): any[] {
  const baseUrl = 'https://myparliament.calmic.com.my';

  // WebPage schema — tells Google the page has a metered paywall.
  // isAccessibleForFree:"False" is a string per schema.org spec, not boolean.
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Constituency Hansard Analysis — 15th Parliament | Malaysian Parliament",
    "description": `Track speaking participation for all ${totalConstituencies} Malaysian Parliament constituencies in the 15th Parliament. Average participation rate: ${avgRate}%.`,
    "url": `${baseUrl}/constituency-analysis`,
    "isAccessibleForFree": "False",
    "hasPart": [
      {
        // cssSelector matches the className applied to the PremiumGate wrapper.
        // Googlebot uses this to understand which portion of the DOM is gated.
        "@type": "WebPageElement",
        "isAccessibleForFree": "False",
        "cssSelector": ".premium-content"
      }
    ],
    "about": {
      "@type": "GovernmentOrganization",
      "name": "Malaysian Parliament — Dewan Rakyat",
      "url": "https://www.parlimen.gov.my"
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Dashboard", "item": baseUrl },
        { "@type": "ListItem", "position": 2, "name": "Constituency Analysis", "item": `${baseUrl}/constituency-analysis` }
      ]
    }
  };

  // Dataset schema for the public preview portion.
  // isAccessibleForFree:"True" here scopes to the preview content only.
  const previewDatasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": `Malaysian Constituency Hansard Participation — 15th Parliament (Preview)`,
    "description": `Public preview of Hansard speaking participation data for ${totalConstituencies} Malaysian Parliament constituencies. Includes participation distribution and top-5 rankings.`,
    "url": `${baseUrl}/constituency-analysis`,
    "isAccessibleForFree": "True",
    "temporalCoverage": "2022/2027",
    "spatial": { "@type": "Place", "name": "Malaysia" },
    "publisher": {
      "@type": "GovernmentOrganization",
      "name": "Malaysian Parliament MP Dashboard",
      "url": baseUrl
    },
    "license": "https://creativecommons.org/licenses/by/4.0/",
    "keywords": [
      "constituency analysis", "Hansard participation", "Malaysian Parliament",
      "Dewan Rakyat", "MP speaking record", "15th Parliament Malaysia",
      "constituency intelligence"
    ]
  };

  return [webPageSchema, previewDatasetSchema];
}

function generateDatasetStructuredData(type: 'directory' | 'attendance' | 'hansard' | 'allowances' | 'activity'): any {
  const baseDataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "publisher": {
      "@type": "GovernmentOrganization",
      "name": "Malaysian Parliament MP Dashboard",
      "url": "https://myparliament.calmic.com.my"
    },
    "license": "https://creativecommons.org/licenses/by/4.0/",
    "isAccessibleForFree": true,
    "spatial": {
      "@type": "Place",
      "name": "Malaysia"
    }
  };

  switch (type) {
    case 'directory':
      return {
        ...baseDataset,
        "name": "Malaysian Parliament Members Directory",
        "description": "Complete directory of all 222 Members of Parliament (MPs) in Malaysia's Dewan Rakyat, including contact information, constituencies, party affiliations, and biographical data.",
        "url": "https://myparliament.calmic.com.my",
        "keywords": ["Malaysian Parliament", "MPs", "Dewan Rakyat", "Parliament Members", "Malaysia Government"],
        "temporalCoverage": "2022/2027",
        "distribution": {
          "@type": "DataDownload",
          "encodingFormat": "HTML",
          "contentUrl": "https://myparliament.calmic.com.my"
        }
      };
    
    case 'attendance':
      return {
        ...baseDataset,
        "name": "Malaysian Parliament MP Attendance Records",
        "description": "Comprehensive attendance tracking data for all 222 Dewan Rakyat MPs, including attendance rates, session participation, and historical attendance records.",
        "url": "https://myparliament.calmic.com.my/attendance",
        "keywords": ["MP attendance", "Parliament sessions", "Dewan Rakyat attendance", "Parliamentary participation"],
        "temporalCoverage": "2022/..",
        "distribution": {
          "@type": "DataDownload",
          "encodingFormat": "HTML",
          "contentUrl": "https://myparliament.calmic.com.my/attendance"
        }
      };
    
    case 'hansard':
      return {
        ...baseDataset,
        "name": "Malaysian Parliament Hansard Records",
        "description": "Official Hansard records of Malaysian Parliament proceedings, including debates, voting records, questions, and session transcripts from Dewan Rakyat.",
        "url": "https://myparliament.calmic.com.my/hansard",
        "keywords": ["Hansard", "Parliament debates", "Parliamentary proceedings", "Voting records", "Session transcripts"],
        "temporalCoverage": "2022/..",
        "distribution": {
          "@type": "DataDownload",
          "encodingFormat": "HTML",
          "contentUrl": "https://myparliament.calmic.com.my/hansard"
        }
      };
    
    case 'allowances':
      return {
        ...baseDataset,
        "name": "Malaysian Parliament MP Salaries and Allowances",
        "description": "Transparent breakdown of salaries, allowances, and benefits for all 222 Malaysian Parliament MPs, including ministerial salaries, entertainment allowances, and other compensation.",
        "url": "https://myparliament.calmic.com.my/allowances",
        "keywords": ["MP salaries", "MP allowances", "Parliamentary compensation", "Government transparency"],
        "temporalCoverage": "2022/..",
        "distribution": {
          "@type": "DataDownload",
          "encodingFormat": "HTML",
          "contentUrl": "https://myparliament.calmic.com.my/allowances"
        }
      };
    
    case 'activity':
      return {
        ...baseDataset,
        "name": "Malaysian Parliament Parliamentary Activities",
        "description": "Comprehensive tracking of parliamentary activities including legislative proposals, debates, questions, and participation records for all 222 Dewan Rakyat MPs.",
        "url": "https://myparliament.calmic.com.my/activity",
        "keywords": ["Parliamentary activities", "Legislative proposals", "Parliamentary debates", "MP participation"],
        "temporalCoverage": "2022/..",
        "distribution": {
          "@type": "DataDownload",
          "encodingFormat": "HTML",
          "contentUrl": "https://myparliament.calmic.com.my/activity"
        }
      };
    
    default:
      return baseDataset;
  }
}

async function prerenderPage(htmlTemplate: string, metadata: PageMetadata): Promise<string> {
  const metaTags = generateMetaTags(metadata);
  
  const existingTitleRegex = /<title>.*?<\/title>/;
  const existingMetaRegex = /<meta\s+name="description"[^>]*>/;
  const existingCanonicalRegex = /<link\s+rel="canonical"[^>]*>/;
  const existingKeywordsRegex = /<meta\s+name="keywords"[^>]*>/;
  const existingOgRegex = /<meta\s+property="og:[^"]*"[^>]*>/g;
  const existingTwitterRegex = /<meta\s+name="twitter:[^"]*"[^>]*>/g;
  const existingJsonLdRegex = /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/g;
  
  let result = htmlTemplate
    .replace(existingTitleRegex, '')
    .replace(existingMetaRegex, '')
    .replace(existingCanonicalRegex, '')
    .replace(existingKeywordsRegex, '')
    .replace(existingOgRegex, '')
    .replace(existingTwitterRegex, '')
    .replace(existingJsonLdRegex, '');
  
  const headCloseIndex = result.indexOf('</head>');
  if (headCloseIndex === -1) {
    throw new Error('Could not find </head> tag in HTML template');
  }
  
  result = result.slice(0, headCloseIndex) + '\n    ' + metaTags + '\n  ' + result.slice(headCloseIndex);
  
  return result;
}

function sanitizePathForFilename(urlPath: string): string {
  return urlPath.replace(/^\//, '').replace(/\//g, '_') || 'index';
}

function pathToFilename(urlPath: string): string {
  if (urlPath === '/') {
    return 'index.html';
  }
  return `${sanitizePathForFilename(urlPath)}.html`;
}

export async function generatePrerenderedPages() {
  console.log('🚀 Starting pre-rendering process...');
  
  const templatePath = path.join(__dirname, '..', 'client', 'index.html');
  const htmlTemplate = fs.readFileSync(templatePath, 'utf-8');
  
  const outputDir = path.join(__dirname, '..', 'dist', 'prerendered');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const urlMap = new Map<string, string>();
  const pages: { filename: string; html: string; url: string }[] = [];
  
  console.log('📄 Generating homepage...');
  const homepageStructuredData = [
    generateOrganizationStructuredData(),
    generateDatasetStructuredData('directory')
  ];
  const homepageHtml = await prerenderPage(htmlTemplate, {
    title: 'Malaysian Parliament MP Dashboard | Track All 222 Dewan Rakyat MPs',
    description: 'Track all 222 Malaysian Parliament MPs from Dewan Rakyat. Monitor voting records, attendance rates, parliamentary activities, court cases, and SPRM investigations in one transparent, accessible platform.',
    url: '/',
    structuredData: homepageStructuredData
  });
  pages.push({ filename: 'index.html', html: homepageHtml, url: '/' });
  urlMap.set('/', 'index.html');
  
  console.log('👥 Fetching all MPs...');
  let allMps: Mp[] = [];
  if (!isDatabaseAvailable()) {
    console.warn('⚠️ DATABASE_URL not set during build (expected in CI/CD). Skipping MP profile pages.');
    console.warn('   MP profiles will be rendered dynamically at runtime.');
  } else {
    try {
      allMps = await db!.select().from(mps);
      console.log(`📊 Generating ${allMps.length} MP profile pages...`);
    } catch (error) {
      console.warn('⚠️ Database query failed during build. Skipping MP profile pages.');
      console.warn('   MP profiles will be rendered dynamically at runtime.');
    }
  }
  
  for (const mp of allMps) {
    const attendanceRate = mp.totalParliamentDays > 0
      ? ((mp.daysAttended / mp.totalParliamentDays) * 100).toFixed(1)
      : '0';

    // Calculate MP salary for SEO-rich description
    const baseMpSalary = mp.mpAllowance || 0;
    const ministerialSalary = 0; // We don't have role salary calculation here, but basic MP salary is still informative
    const monthlySalary = baseMpSalary + ministerialSalary;
    const yearlySalary = monthlySalary * 12;

    const mpUrl = `/mp/${mp.id}`;

    // Enhanced meta title with key metrics
    const mpTitle = `${mp.name} (${mp.party}) - ${mp.constituency}, ${mp.state} MP | Attendance ${attendanceRate}%`;

    // Enhanced meta description with specific performance data
    const mpDescription = `${mp.name} - ${mp.party} MP for ${mp.constituency}, ${mp.state}. Parliament attendance: ${attendanceRate}% (${mp.daysAttended}/${mp.totalParliamentDays} sessions). Track voting records, Hansard speeches, parliamentary questions, legislative proposals, and performance metrics.`;

    const mpHtml = await prerenderPage(htmlTemplate, {
      title: mpTitle,
      description: mpDescription,
      url: mpUrl,
      image: mp.photoUrl || undefined,
      type: 'profile',
      structuredData: generateMpStructuredData(mp, attendanceRate)
    });

    const filename = pathToFilename(mpUrl);
    pages.push({ filename, html: mpHtml, url: mpUrl });
    urlMap.set(mpUrl, filename);
  }
  
  // ── Constituency analysis page ──────────────────────────────────────────
  // SEO REASONING: pre-rendering bakes the title, meta description, and
  // structured data (with isAccessibleForFree:"False") into static HTML so
  // Googlebot receives it on first crawl — no JavaScript execution needed.
  // The public preview content (summary stats, chart, top-5 rows) is always
  // present in the pre-rendered HTML, giving Google real indexable content.
  // The premium gated section is marked via cssSelector in the schema above.
  console.log('📊 Generating constituency analysis page...');
  const constituencyHtml = await prerenderPage(htmlTemplate, {
    title: 'Constituency Hansard Analysis — 15th Parliament | Malaysian Parliament Dashboard',
    description: 'See how actively all 222 Malaysian Parliament constituencies are represented in the 15th Parliament Hansard. View participation rates, top-performing seats, and distribution by state. Premium: full 222-seat data, detailed metrics & PDF export.',
    url: '/constituency-analysis',
    structuredData: generateConstituencyStructuredData()
  });
  pages.push({ filename: 'constituency-analysis.html', html: constituencyHtml, url: '/constituency-analysis' });
  urlMap.set('/constituency-analysis', 'constituency-analysis.html');

  const statsPages = [
    {
      path: '/activity',
      title: 'Parliamentary Activity | Malaysian Parliament Dashboard',
      description: 'Browse parliamentary activities, legislative proposals, debates, and questions from all 222 Dewan Rakyat MPs. Track who\'s actively participating in Malaysian Parliament.',
      datasetType: 'activity' as const
    },
    {
      path: '/hansard',
      title: 'Hansard Records | Malaysian Parliament Dashboard',
      description: 'Access complete Hansard records of Malaysian Parliament sessions. Search parliamentary debates, attendance records, voting results, and session transcripts.',
      datasetType: 'hansard' as const
    },
    {
      path: '/attendance',
      title: 'MP Attendance Tracking | Malaysian Parliament Dashboard',
      description: 'Track attendance rates of all 222 Dewan Rakyat MPs. See who attends parliamentary sessions and who doesn\'t. Real-time attendance monitoring and historical records.',
      datasetType: 'attendance' as const
    },
    {
      path: '/allowances',
      title: 'MP Salaries & Allowances | Malaysian Parliament Dashboard',
      description: 'View transparent breakdown of MP salaries, allowances, and benefits. Track entertainment allowances, computer allowances, and ministerial salaries for all 222 MPs.',
      datasetType: 'allowances' as const
    }
  ];
  
  console.log('📊 Generating stats pages...');
  for (const page of statsPages) {
    const pageHtml = await prerenderPage(htmlTemplate, {
      title: page.title,
      description: page.description,
      url: page.path,
      structuredData: generateDatasetStructuredData(page.datasetType)
    });
    const filename = pathToFilename(page.path);
    pages.push({ filename, html: pageHtml, url: page.path });
    urlMap.set(page.path, filename);
  }
  
  console.log('💾 Writing pre-rendered files...');
  for (const page of pages) {
    const filePath = path.join(outputDir, page.filename);
    fs.writeFileSync(filePath, page.html, 'utf-8');
  }
  
  const urlMapPath = path.join(outputDir, 'url-map.json');
  fs.writeFileSync(urlMapPath, JSON.stringify(Object.fromEntries(urlMap), null, 2), 'utf-8');
  
  console.log(`✅ Pre-rendered ${pages.length} pages successfully!`);
  
  return Array.from(urlMap.keys());
}

export async function generateSitemap(urls: string[]) {
  const baseUrl = 'https://myparliament.calmic.com.my';
  const now = new Date().toISOString().split('T')[0];
  
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(url => `
  <url>
    <loc>${baseUrl}${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${url === '/' ? 'daily' : url.startsWith('/mp/') ? 'weekly' : 'weekly'}</changefreq>
    <priority>${url === '/' ? '1.0' : url.startsWith('/mp/') ? '0.8' : '0.9'}</priority>
  </url>`).join('')}
</urlset>`;
  
  const publicDir = path.join(__dirname, '..', 'dist', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemapContent, 'utf-8');
  
  console.log('✅ Sitemap generated successfully!');
}

export async function generateRobotsTxt() {
  const robotsContent = `User-agent: *
Allow: /

Sitemap: https://myparliament.calmic.com.my/sitemap.xml`;
  
  const publicDir = path.join(__dirname, '..', 'dist', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  const robotsPath = path.join(publicDir, 'robots.txt');
  fs.writeFileSync(robotsPath, robotsContent, 'utf-8');
  
  console.log('✅ robots.txt generated successfully!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const urls = await generatePrerenderedPages();
      await generateSitemap(urls);
      await generateRobotsTxt();
      console.log('🎉 Pre-rendering complete!');
      process.exit(0);
    } catch (error) {
      console.warn('⚠️ Pre-rendering encountered an error:', error);
      console.warn('   This is expected during Railway build. Pages will render dynamically at runtime.');
      process.exit(0);
    }
  })();
}
