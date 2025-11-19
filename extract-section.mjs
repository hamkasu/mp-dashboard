import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

async function test() {
  const buffer = fs.readFileSync('attached_assets/DR-13112025_1763514446245.pdf');
  const parser = new PDFParse({ data: buffer });
  const pdfData = await parser.getText();
  await parser.destroy();
  
  const text = pdfData.text;
  
  // Find the actual oral questions section content (after page 21 marker)
  console.log('\n=== Searching for Oral Questions Content ===\n');
  const page21Marker = text.indexOf('-- 21 of 167 --');
  if (page21Marker > 0) {
    console.log('Found page 21 marker');
    const sampleText = text.slice(page21Marker, page21Marker + 3000);
    console.log(sampleText);
  }
  
  // Look for bill content sections
  console.log('\n\n=== Searching for Bill Content (around page 58) ===\n');
  const page58Marker = text.indexOf('-- 58 of 167 --');
  if (page58Marker > 0) {
    console.log('Found page 58 marker');
    const sampleText = text.slice(page58Marker, page58Marker + 2000);
    console.log(sampleText);
  }
}

test();
