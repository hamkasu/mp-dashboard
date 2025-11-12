import fs from 'fs/promises';
import { PDFParse } from 'pdf-parse';

async function checkPdfFormat() {
  const pdfPath = './attached_assets/DR-06112025_1762791752278.pdf';
  
  try {
    console.log(`Reading PDF: ${pdfPath}\n`);
    const pdfBuffer = await fs.readFile(pdfPath);
    const parser = new PDFParse({ data: pdfBuffer });
    const text = await parser.getText();
    const data = { text, numpages: 1 }; // PDFParse doesn't return numpages, so estimate
    
    console.log(`Total pages: ${data.numpages}`);
    console.log(`Total text length: ${data.text.length} characters\n`);
    
    // Show first 2000 characters to see format
    console.log('=== FIRST 2000 CHARACTERS ===');
    console.log(data.text.substring(0, 2000));
    console.log('\n=== CHARACTERS 5000-7000 (mid section) ===');
    console.log(data.text.substring(5000, 7000));
    
    // Try to find speaker patterns
    const speakerPatterns = [
      /\[([A-Za-z\s]+)\s*-\s*([^\]]+)\]/g,
      /Tuan\s+([^(:\[]+?)\s*\(([^)]+)\)/g,
      /Yang Berhormat\s+([^(:\[]+)/g
    ];
    
    console.log('\n=== LOOKING FOR SPEAKER PATTERNS ===');
    for (let i = 0; i < speakerPatterns.length; i++) {
      const pattern = speakerPatterns[i];
      const matches = Array.from(data.text.matchAll(pattern)).slice(0, 5);
      console.log(`\nPattern ${i + 1}: Found ${matches.length} matches (showing first 5)`);
      matches.forEach(match => {
        console.log(`  - ${match[0]}`);
      });
    }
    
  } catch (error) {
    console.error('Error reading PDF:', error);
  }
}

checkPdfFormat()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
