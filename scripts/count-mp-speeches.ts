import { promises as fs } from 'fs';
import { HansardPdfParser } from '../server/hansard-pdf-parser';
import { storage } from '../server/storage';

/**
 * Script to count speaking instances for a specific MP in a Hansard PDF
 * Usage: tsx scripts/count-mp-speeches.ts <pdf-path> <mp-name-or-id>
 */
async function countMpSpeeches() {
  const pdfPath = process.argv[2];
  const mpIdentifier = process.argv[3];

  if (!pdfPath || !mpIdentifier) {
    console.error('Usage: tsx scripts/count-mp-speeches.ts <pdf-path> <mp-name-or-id>');
    console.error('Example: tsx scripts/count-mp-speeches.ts ./attached_assets/DR-10112025_1762918719116.pdf "Mohamad bin Sabu"');
    process.exit(1);
  }

  try {
    console.log('🔍 Reading PDF file...');
    const pdfBuffer = await fs.readFile(pdfPath);
    console.log(`✅ Read ${pdfBuffer.length} bytes from ${pdfPath}`);

    console.log('\n📊 Loading all MPs from database...');
    const allMps = await storage.getAllMps();
    console.log(`✅ Loaded ${allMps.length} MPs`);

    // Find the target MP
    const targetMp = allMps.find(mp => 
      mp.id === mpIdentifier || 
      mp.name.toLowerCase().includes(mpIdentifier.toLowerCase())
    );

    if (!targetMp) {
      console.error(`❌ Could not find MP matching: ${mpIdentifier}`);
      console.error('\nSuggestions:');
      const suggestions = allMps
        .filter(mp => mp.name.toLowerCase().includes(mpIdentifier.toLowerCase().split(' ')[0]))
        .slice(0, 5);
      suggestions.forEach(mp => console.error(`  - ${mp.name} (${mp.constituency})`));
      process.exit(1);
    }

    console.log(`\n🎯 Target MP: ${targetMp.name} (${targetMp.constituency})`);

    console.log('\n📄 Parsing Hansard PDF...');
    const parser = new HansardPdfParser(allMps);
    const parsed = await parser.parseHansardPdf(pdfBuffer);

    // Filter speakers for target MP
    const targetSpeakers = parsed.speakers.filter(s => s.mpId === targetMp.id);

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTS');
    console.log('='.repeat(80));
    console.log(`\n📅 Session: ${parsed.metadata.sessionNumber}`);
    console.log(`📆 Date: ${parsed.metadata.sessionDate.toLocaleDateString('en-MY', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    })}`);
    console.log(`🏛️  Parliament: ${parsed.metadata.parliamentTerm}`);
    console.log(`📋 Sitting: ${parsed.metadata.sitting}`);
    
    console.log(`\n🎤 Speaking Statistics for ${targetMp.name}:`);
    console.log(`   - Total speaking instances: ${targetSpeakers.length}`);
    
    if (targetSpeakers.length > 0) {
      console.log(`   - First appearance: Speaking order #${targetSpeakers[0].speakingOrder}`);
      console.log(`   - Last appearance: Speaking order #${targetSpeakers[targetSpeakers.length - 1].speakingOrder}`);
    }

    console.log(`\n📊 Overall Session Statistics:`);
    console.log(`   - Total unique speakers: ${parsed.speakers.length} MPs`);
    console.log(`   - MPs attended: ${parsed.attendance.attendedMpIds.length}`);
    console.log(`   - MPs absent: ${parsed.attendance.absentMpIds.length}`);
    console.log(`   - Unmatched speakers: ${parsed.unmatchedSpeakers.length}`);

    if (parsed.unmatchedSpeakers.length > 0 && parsed.unmatchedSpeakers.length <= 10) {
      console.log(`\n⚠️  Unmatched speakers:`);
      parsed.unmatchedSpeakers.forEach(name => console.log(`   - ${name}`));
    }

    console.log('\n' + '='.repeat(80));
    
    // Check if target MP was in attendance
    const wasPresent = parsed.attendance.attendedMpIds.includes(targetMp.id);
    const wasAbsent = parsed.attendance.absentMpIds.includes(targetMp.id);
    
    if (wasPresent) {
      console.log(`✅ ${targetMp.name} was marked as PRESENT in attendance`);
    } else if (wasAbsent) {
      console.log(`❌ ${targetMp.name} was marked as ABSENT in attendance`);
    } else {
      console.log(`❓ ${targetMp.name} attendance status unknown (not in attendance records)`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

countMpSpeeches();
