import { promises as fs } from 'fs';
import { PDFParse } from 'pdf-parse';
import { storage } from '../server/storage';
import { MPNameMatcher } from '../server/mp-name-matcher';

/**
 * Count ALL speaking instances for an MP (not just unique speakers)
 */
async function countAllSpeeches() {
  const pdfPath = process.argv[2];
  const mpIdentifier = process.argv[3];

  if (!pdfPath || !mpIdentifier) {
    console.error('Usage: tsx scripts/count-all-speeches.ts <pdf-path> <mp-name-or-id>');
    process.exit(1);
  }

  try {
    console.log('📄 Reading and parsing PDF...');
    const pdfBuffer = await fs.readFile(pdfPath);
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    const fullText = result.text;
    console.log(`✅ Extracted ${fullText.length} characters from PDF\n`);

    console.log('📊 Loading all MPs from database...');
    const allMps = await storage.getAllMps();
    console.log(`✅ Loaded ${allMps.length} MPs`);

    // Find the target MP
    const targetMp = allMps.find(mp => 
      mp.id === mpIdentifier || 
      mp.name.toLowerCase().includes(mpIdentifier.toLowerCase())
    );

    if (!targetMp) {
      console.error(`❌ Could not find MP matching: ${mpIdentifier}`);
      process.exit(1);
    }

    console.log(`\n🎯 Target MP: ${targetMp.name} (${targetMp.constituency})`);

    // Use MP name matcher to normalize names
    const matcher = new MPNameMatcher(allMps);

    // Speaker pattern that matches ministerial titles without constituencies
    const speakerPattern = /(?:Menteri|Timbalan Menteri|Datuk Seri|Dato' Sri|Datuk|Dato'|Tan Sri|Toh Puan|Tuan|Puan|Dr\.?|Yang Berhormat|Y\.Bhg\.|YB)\s+(?:Haji|Hajjah)?\s*([^:]{10,80}):\s+/gi;

    const matches: Array<{position: number; name: string; context: string}> = [];
    let match;

    console.log('\n🔍 Searching for speaking instances...\n');

    while ((match = speakerPattern.exec(fullText)) !== null) {
      const capturedName = match[1].trim();
      
      // Try to match this name to an MP
      const mpId = matcher.matchName(capturedName);
      
      if (mpId === targetMp.id) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(fullText.length, match.index + 200);
        const context = fullText.substring(start, end).replace(/\n/g, ' ');
        
        matches.push({
          position: match.index,
          name: capturedName,
          context
        });
      }
    }

    console.log('='.repeat(80));
    console.log('📊 RESULTS');
    console.log('='.repeat(80));
    console.log(`\n🎤 ${targetMp.name} spoke ${matches.length} time(s) in this session\n`);

    if (matches.length > 0) {
      matches.forEach((m, idx) => {
        console.log(`\n${idx + 1}. Speaking instance at position ${m.position}:`);
        console.log(`   Captured name: "${m.name}"`);
        console.log(`   Context: "${m.context}..."`);
      });
    } else {
      console.log('   No speaking instances found.');
    }

    console.log('\n' + '='.repeat(80));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

countAllSpeeches();
