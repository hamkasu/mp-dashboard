/**
 * Analyze the Parliament HTML structure to understand how archives are organized
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function analyzeHtml() {
  const url = 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&arkib=yes';

  console.log('🔍 Analyzing Parliament HTML structure\n');
  console.log(`URL: ${url}\n`);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5,ms;q=0.3',
      },
      timeout: 30000,
      httpsAgent,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Look for navigation/archive UI elements
    console.log('📂 Looking for navigation elements...\n');

    // Check for select dropdowns (Penggal, Mesyuarat, etc.)
    const selects = $('select');
    console.log(`Found ${selects.length} select dropdowns:`);
    selects.each((i, el) => {
      const name = $(el).attr('name') || $(el).attr('id') || 'unnamed';
      const options = $(el).find('option');
      console.log(`\n  ${i + 1}. <select name="${name}">`);
      console.log(`     Options: ${options.length}`);

      if (options.length <= 20) {
        // Show all options
        options.each((j, opt) => {
          const value = $(opt).attr('value') || '';
          const text = $(opt).text().trim();
          console.log(`        - "${text}" (value="${value}")`);
        });
      } else {
        // Show first and last few
        options.slice(0, 3).each((j, opt) => {
          const value = $(opt).attr('value') || '';
          const text = $(opt).text().trim();
          console.log(`        - "${text}" (value="${value}")`);
        });
        console.log(`        ... (${options.length - 6} more options) ...`);
        options.slice(-3).each((j, opt) => {
          const value = $(opt).attr('value') || '';
          const text = $(opt).text().trim();
          console.log(`        - "${text}" (value="${value}")`);
        });
      }
    });

    // Look for forms
    const forms = $('form');
    console.log(`\n\n📝 Found ${forms.length} forms:`);
    forms.each((i, el) => {
      const action = $(el).attr('action') || 'no action';
      const method = $(el).attr('method') || 'GET';
      console.log(`\n  Form ${i + 1}: ${method} ${action}`);

      // List inputs
      const inputs = $(el).find('input, select');
      console.log(`     Inputs: ${inputs.length}`);
      inputs.each((j, input) => {
        const type = $(input).attr('type') || $(input).prop('tagName').toLowerCase();
        const name = $(input).attr('name') || 'unnamed';
        const value = $(input).attr('value') || '';
        console.log(`        - ${type}: name="${name}" value="${value}"`);
      });
    });

    // Look for clickable elements with 'penggal' or 'arkib' or 'tahun'
    console.log(`\n\n🔗 Looking for navigation links...\n`);
    const links = $('a[href*="penggal"], a[href*="arkib"], a[href*="tahun"], a[onclick*="penggal"], a[onclick*="arkib"]');
    console.log(`Found ${links.length} relevant links:`);
    links.slice(0, 10).each((i, el) => {
      const href = $(el).attr('href') || '';
      const onclick = $(el).attr('onclick') || '';
      const text = $(el).text().trim();
      console.log(`\n  ${i + 1}. "${text}"`);
      if (href) console.log(`     href: ${href}`);
      if (onclick) console.log(`     onclick: ${onclick}`);
    });

    // Look for JavaScript functions that might load data
    console.log(`\n\n📜 Looking for JavaScript functions...\n`);
    const scriptTags = $('script:not([src])');
    console.log(`Found ${scriptTags.length} inline script tags`);

    let foundSessionControl = false;
    scriptTags.each((i, el) => {
      const scriptContent = $(el).html() || '';

      // Look for functions that handle penggal/session selection
      if (scriptContent.match(/penggal|session|mesyuarat/i) && scriptContent.length < 5000) {
        if (!foundSessionControl) {
          console.log(`\nScript ${i + 1} (contains session-related code):`);
          console.log('─'.repeat(70));
          console.log(scriptContent.substring(0, 1000));
          if (scriptContent.length > 1000) {
            console.log(`\n... (${scriptContent.length - 1000} more chars) ...`);
          }
          foundSessionControl = true;
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

analyzeHtml();
