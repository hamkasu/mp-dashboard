import { HansardScraper } from './server/hansard-scraper.js';
import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';

async function testParser() {
  const scraper = new HansardScraper();
  const pdfPath = path.join(process.cwd(), 'attached_assets/DR-06112025_1762879372571.pdf');
  
  console.log('🔍 Testing Hansard Parser on November 6, 2025 PDF...\n');
  
  try {
    // Extract PDF text directly from local file
    console.log('📄 Reading and extracting PDF...');
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    const transcript = pdfData.text;
    
    if (!transcript) {
      console.error('❌ Failed to extract PDF text');
      return;
    }
    
    console.log('✅ PDF extracted successfully\n');
    
    // Extract attendance data
    const attendanceData = scraper.extractAttendanceFromText(transcript);
    const constituencyCounts = scraper.extractConstituencyAttendanceCounts(transcript);
    
    console.log('═══════════════════════════════════════════════════');
    console.log('           ATTENDANCE BREAKDOWN');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📊 Individual Name Counts:');
    console.log(`   MPs Attended: ${attendanceData.attendedNames.length}`);
    console.log(`   General Absent: ${attendanceData.absentNames.length}`);
    
    console.log('\n📊 Constituency Counts:');
    console.log(`   Present: ${constituencyCounts.constituenciesPresent}`);
    console.log(`   Absent (general): ${constituencyCounts.constituenciesAbsent}`);
    console.log(`   Absent (Rule 91): ${constituencyCounts.constituenciesAbsentRule91}`);
    console.log(`   TOTAL: ${constituencyCounts.constituenciesPresent + constituencyCounts.constituenciesAbsent + constituencyCounts.constituenciesAbsentRule91}`);
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('           EXPECTED vs ACTUAL');
    console.log('═══════════════════════════════════════════════════\n');
    
    const expectedPresent = 170; // 171 entries minus 1 Speaker (no constituency)
    const expectedAbsent = 42;
    const expectedRule91 = 10;
    
    const presentMatch = constituencyCounts.constituenciesPresent === expectedPresent ? '✅' : '❌';
    const absentMatch = constituencyCounts.constituenciesAbsent === expectedAbsent ? '✅' : '❌';
    const rule91Match = constituencyCounts.constituenciesAbsentRule91 === expectedRule91 ? '✅' : '❌';
    
    console.log(`${presentMatch} MPs Present:     Expected: ${expectedPresent}, Got: ${constituencyCounts.constituenciesPresent}`);
    console.log(`${absentMatch} General Absent:  Expected: ${expectedAbsent}, Got: ${constituencyCounts.constituenciesAbsent}`);
    console.log(`${rule91Match} Rule 91 Absent:  Expected: ${expectedRule91}, Got: ${constituencyCounts.constituenciesAbsentRule91}`);
    
    const total = constituencyCounts.constituenciesPresent + constituencyCounts.constituenciesAbsent + constituencyCounts.constituenciesAbsentRule91;
    const totalMatch = total === 222 ? '✅' : '❌';
    console.log(`${totalMatch} Total:           Expected: 222, Got: ${total}`);
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('           FIRST 10 ATTENDED MPs');
    console.log('═══════════════════════════════════════════════════\n');
    attendanceData.attendedNames.slice(0, 10).forEach((name, i) => {
      console.log(`${(i + 1).toString().padStart(2, ' ')}. ${name}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('           FIRST 10 ABSENT MPs');
    console.log('═══════════════════════════════════════════════════\n');
    attendanceData.absentNames.slice(0, 10).forEach((name, i) => {
      console.log(`${(i + 1).toString().padStart(2, ' ')}. ${name}`);
    });
    
    console.log('\n');
    
    const allCorrect = constituencyCounts.constituenciesPresent === expectedPresent &&
                       constituencyCounts.constituenciesAbsent === expectedAbsent &&
                       constituencyCounts.constituenciesAbsentRule91 === expectedRule91 &&
                       total === 222;
    
    if (allCorrect) {
      console.log('🎉 SUCCESS! All counts match expected values.');
    } else {
      console.log('⚠️  WARNING: Some counts do not match expected values.');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testParser().catch(console.error);
