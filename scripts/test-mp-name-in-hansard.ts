import { promises as fs } from 'fs';
import { PDFParse } from 'pdf-parse';

/**
 * Test script to extract PDF and search for MP name variations
 */
async function testMpNameInHansard() {
  const pdfPath = 'attached_assets/DR-10112025_1762918719116.pdf';
  
  try {
    console.log('📄 Reading and parsing PDF...');
    const pdfBuffer = await fs.readFile(pdfPath);
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    const fullText = result.text;
    
    console.log(`✅ Extracted ${fullText.length} characters from PDF\n`);

    // Search for various name patterns
    const searchPatterns = [
      'Mohamad bin Sabu',
      'Datuk Seri Haji Mohamad bin Sabu',
      'Mohamad Sabu',
      'Menteri Pertanian',
      'Kota Raja'
    ];

    for (const pattern of searchPatterns) {
      const regex = new RegExp(pattern, 'gi');
      const matches = fullText.match(regex);
      console.log(`Pattern "${pattern}": ${matches ? matches.length : 0} occurrences`);
      
      if (matches && matches.length > 0 && matches.length <= 10) {
        // Find and show context for each match
        let pos = 0;
        let count = 0;
        while ((pos = fullText.indexOf(pattern, pos)) !== -1 && count < 5) {
          count++;
          const start = Math.max(0, pos - 100);
          const end = Math.min(fullText.length, pos + 150);
          const context = fullText.substring(start, end);
          console.log(`\n  Match #${count} at position ${pos}:`);
          console.log(`  ${context.replace(/\n/g, ' ')}`);
          pos += pattern.length;
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testMpNameInHansard();
