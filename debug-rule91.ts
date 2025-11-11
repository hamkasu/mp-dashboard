import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';

async function debugRule91() {
  const pdfPath = path.join(process.cwd(), 'attached_assets/DR-06112025_1762879372571.pdf');
  
  console.log('📄 Reading PDF...\n');
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  const pdfData = await parser.getText();
  const text = pdfData.text;
  
  const normalizedText = text.replace(/[ \t]+/g, ' ');
  
  // Find Rule 91 section
  const rule91Pattern = /Ahli[-\s]Ahli\s+Yang\s+Tidak\s+Hadir\s+Di\s+Bawah\s+Peraturan\s+Mesyuarat\s+91\s*:?/i;
  const rule91Match = normalizedText.match(rule91Pattern);
  
  if (rule91Match && rule91Match.index !== undefined) {
    const startIdx = rule91Match.index;
    const sectionStart = Math.max(0, startIdx - 200);
    const sectionEnd = Math.min(normalizedText.length, startIdx + 2000);
    
    const context = normalizedText.substring(sectionStart, sectionEnd);
    
    console.log('═══════════════════════════════════════════════════');
    console.log('         RULE 91 SECTION CONTEXT');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(context);
    console.log('\n═══════════════════════════════════════════════════\n');
    
    // Now extract and count
    const remainingText = normalizedText.substring(rule91Match.index + rule91Match[0].length);
    
    const senatorMatch = remainingText.match(/Senator\s+Yang\s+Turut\s+Hadir\s*:?/i);
    const nextMajorSectionMatch = remainingText.match(/\n\s*\n\s*[A-Z][A-Z][A-Z]/);
    
    console.log('🔍 Boundary Detection:');
    console.log(`   Senator section found at index: ${senatorMatch?.index ?? 'NOT FOUND'}`);
    console.log(`   Next major section found at index: ${nextMajorSectionMatch?.index ?? 'NOT FOUND'}`);
    
    let endIdx;
    if (senatorMatch && senatorMatch.index !== undefined) {
      endIdx = senatorMatch.index;
      console.log(`   ✅ Using senator boundary at ${endIdx}`);
    } else if (nextMajorSectionMatch && nextMajorSectionMatch.index !== undefined) {
      endIdx = nextMajorSectionMatch.index;
      console.log(`   Using major section boundary at ${endIdx}`);
    } else {
      endIdx = Math.min(10000, remainingText.length);
      console.log(`   Using default limit at ${endIdx}`);
    }
    
    const rule91Section = remainingText.substring(0, endIdx);
    const numberedPattern = /\d+\.\s+/g;
    const matches = rule91Section.match(numberedPattern);
    
    console.log(`\n   Counted ${matches?.length ?? 0} numbered entries`);
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('         EXTRACTED RULE 91 SECTION');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(rule91Section.substring(0, 1500));
    console.log('\n...(truncated)');
  } else {
    console.log('❌ Rule 91 section not found!');
  }
}

debugRule91().catch(console.error);
