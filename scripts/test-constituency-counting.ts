import * as fs from 'fs/promises';
import * as path from 'path';
import { db } from '../server/db';
import { mps } from '../shared/schema';

interface ConstituencySpeechCount {
  constituency: string;
  count: number;
  sessions: string[];
}

/**
 * Test script to count constituency speeches from attached Hansard PDFs
 * This uses constituency names in brackets to count speeches, avoiding name misspelling issues
 */
async function testConstituencyCounting() {
  try {
    console.log('🔍 Testing Constituency-Based Speech Counting\n');
    console.log('=' .repeat(80));
    
    // Load all MPs to get constituency list
    console.log('📋 Loading MP list to get all constituencies...');
    const allMps = await db.select().from(mps);
    console.log(`✅ Found ${allMps.length} MPs\n`);

    // Create constituency lookup (normalize to handle variations)
    const constituencyMap = new Map<string, string>();
    for (const mp of allMps) {
      const normalized = normalizeConstituency(mp.constituency);
      constituencyMap.set(normalized, mp.constituency);
    }

    // List of attached Hansard PDFs
    const hansardFiles = [
      'attached_assets/DR-13112025_1763259059526.pdf',
      'attached_assets/DR-12112025_1763259059527.pdf',
      'attached_assets/DR-06102025_1763259059528.pdf',
      'attached_assets/DR-07102025_1763259059529.pdf',
      'attached_assets/DR-08102025_1763259059529.pdf',
      'attached_assets/DR-09102025_1763259059530.pdf',
    ];

    const constituencyCounts = new Map<string, ConstituencySpeechCount>();

    // Process each Hansard PDF
    for (const filePath of hansardFiles) {
      console.log(`\n📄 Processing: ${path.basename(filePath)}`);
      
      try {
        const fileBuffer = await fs.readFile(filePath);
        
        // Use dynamic import like in hansard-pdf-parser.ts
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: fileBuffer });
        const result = await parser.getText();
        const transcript = result.text;
        
        // Extract session info from filename
        const sessionMatch = path.basename(filePath).match(/DR-(\d{8})/);
        const sessionId = sessionMatch ? sessionMatch[1] : path.basename(filePath);
        
        console.log(`   📊 Extracted ${transcript.length} characters of text`);
        
        // Count constituencies using multiple patterns
        const sessionCounts = countConstituenciesInTranscript(transcript, constituencyMap);
        
        console.log(`   🎤 Found ${sessionCounts.size} constituencies speaking in this session`);
        
        // Aggregate into overall counts
        for (const [constituency, count] of sessionCounts.entries()) {
          if (!constituencyCounts.has(constituency)) {
            constituencyCounts.set(constituency, {
              constituency,
              count: 0,
              sessions: [],
            });
          }
          
          const data = constituencyCounts.get(constituency)!;
          data.count += count;
          if (!data.sessions.includes(sessionId)) {
            data.sessions.push(sessionId);
          }
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing ${filePath}:`, error);
      }
    }

    // Display results
    console.log('\n' + '='.repeat(80));
    console.log('📊 CONSTITUENCY SPEECH COUNT RESULTS');
    console.log('='.repeat(80));
    console.log(`Total constituencies found speaking: ${constituencyCounts.size}`);
    console.log(`Total Hansard sessions analyzed: ${hansardFiles.length}`);
    console.log('');

    // Sort by total count (descending)
    const sortedResults = Array.from(constituencyCounts.values())
      .sort((a, b) => b.count - a.count);

    console.log('🏆 TOP 30 MOST ACTIVE CONSTITUENCIES:');
    console.log('='.repeat(80));
    console.log('Rank | Constituency                  | Total Speeches | Sessions');
    console.log('='.repeat(80));

    sortedResults.slice(0, 30).forEach((data, idx) => {
      console.log(
        `${String(idx + 1).padStart(4)} | ${data.constituency.padEnd(29)} | ${String(data.count).padStart(14)} | ${String(data.sessions.length).padStart(8)}`
      );
    });

    // Full table
    console.log('\n' + '='.repeat(80));
    console.log('📋 COMPLETE CONSTITUENCY SPEECH COUNT TABLE');
    console.log('='.repeat(80));
    console.log('');

    console.log('| Rank | Constituency | Total Speeches | Sessions Participated |');
    console.log('|------|-------------|----------------|----------------------|');
    
    sortedResults.forEach((data, idx) => {
      console.log(
        `| ${String(idx + 1).padStart(4)} | ${data.constituency.padEnd(30)} | ${String(data.count).padStart(14)} | ${String(data.sessions.length).padStart(20)} |`
      );
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis Complete!');
    console.log('='.repeat(80));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error in constituency counting test:', error);
    process.exit(1);
  }
}

/**
 * Count how many times each constituency speaks in a transcript
 * Uses constituency names in brackets/parentheses
 */
function countConstituenciesInTranscript(
  transcript: string,
  constituencyMap: Map<string, string>
): Map<string, number> {
  const counts = new Map<string, number>();

  // Pattern 1: (Constituency) format - most common in Hansard
  const pattern1 = /\(([A-Z][a-zA-Z\s]{2,30})\)\s*:/g;
  
  // Pattern 2: [Constituency - Name] or [P### Constituency - Name] format
  const pattern2 = /\[(?:P\d{3}\s+)?([A-Z][a-zA-Z\s]{2,30})\s*[-–]/g;
  
  // Pattern 3: [Constituency]: format
  const pattern3 = /\[([A-Z][a-zA-Z\s]{2,30})\]\s*:/g;

  const patterns = [pattern1, pattern2, pattern3];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    
    while ((match = regex.exec(transcript)) !== null) {
      const extractedText = match[1].trim();
      
      // Try to match to known constituency
      const normalized = normalizeConstituency(extractedText);
      const officialConstituency = constituencyMap.get(normalized);
      
      if (officialConstituency) {
        const currentCount = counts.get(officialConstituency) || 0;
        counts.set(officialConstituency, currentCount + 1);
      } else {
        // Check if it's a close match (fuzzy matching)
        for (const [key, value] of constituencyMap.entries()) {
          if (key.includes(normalized) || normalized.includes(key)) {
            const currentCount = counts.get(value) || 0;
            counts.set(value, currentCount + 1);
            break;
          }
        }
      }
    }
  }

  return counts;
}

/**
 * Normalize constituency name for matching
 */
function normalizeConstituency(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z]/g, '');
}

testConstituencyCounting();
