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
  
  // Find Ministerial Questions (page 1)
  console.log('=== Ministerial Questions Section (Page 1) ===\n');
  const page1Marker = text.indexOf('-- 1 of 167 --');
  if (page1Marker > 0) {
    const sampleText = text.slice(page1Marker, page1Marker + 2500);
    console.log(sampleText);
  }
  
  // Search for the actual bills listing
  console.log('\n\n=== Searching for "Rang Undang-undang Perbekalan 2026" ===\n');
  const billIndex = text.indexOf('Rang Undang-undang Perbekalan 2026');
  if (billIndex > 0) {
    // Get context around the bill mention
    const start = Math.max(0, billIndex - 500);
    const sampleText = text.slice(start, billIndex + 1000);
    console.log(sampleText);
  }
}

test();
