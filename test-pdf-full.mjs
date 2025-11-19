import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const pdfModule = require('pdf-parse');

// Test actual parsing
const buffer = fs.readFileSync('attached_assets/DR-13112025_1763514446245.pdf');

// Try instantiating and calling parse
const parser = new pdfModule.PDFParse();
parser.parse(buffer).then(data => {
  console.log('✓ SUCCESS!');
  console.log('Pages:', data.numpages);
  console.log('Text length:', data.text.length);
  console.log('First 200 chars:', data.text.slice(0, 200));
}).catch(err => {
  console.error('✗ Parse failed:', err.message);
});
