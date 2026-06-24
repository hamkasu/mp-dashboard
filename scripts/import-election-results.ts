/**
 * Import GE15 (2022) Election Results
 * Fetches data from Tindak Malaysia's GitHub and updates MP records
 */

import { db } from "../server/db";
import { mps } from "../shared/schema";
import { eq } from "drizzle-orm";

// Official GE15 results from Tindak Malaysia
const CSV_URL = "https://raw.githubusercontent.com/TindakMalaysia/HISTORICAL-ELECTION-RESULTS/main/2022-ELECTION-RESULTS/MALAYSIA_2022_PARLIAMENT_RESULTS.csv";

interface ElectionData {
  parliamentCode: string;
  votesReceived: number;
  totalValidVotes: number;
  majority: number;
  turnoutPercent: number;
  votePercentage: number;
}

async function fetchElectionData(): Promise<Map<string, ElectionData>> {
  console.log("📥 Fetching election data from GitHub...");

  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');

  // Find column indices
  const codeIdx = headers.findIndex(h => h.includes('PARLIAMENTARY CONSTITUENCY CODE'));
  const validVotesIdx = headers.findIndex(h => h.includes('TOTAL VALID VOTES'));
  const majorityIdx = headers.findIndex(h => h.includes('WINNING MAJORITY'));
  const turnoutIdx = headers.findIndex(h => h.includes('TURNOUT'));

  const results = new Map<string, ElectionData>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    if (cols.length < headers.length) continue;

    const code = normalizeCode(cols[codeIdx]);
    const totalValidVotes = parseInt(cols[validVotesIdx]?.replace(/,/g, '') || '0', 10);
    const majority = parseInt(cols[majorityIdx]?.replace(/,/g, '') || '0', 10);
    const turnout = parseFloat(cols[turnoutIdx] || '0');

    // Find winner's votes (highest vote count from all party columns)
    const winnerVotes = findWinnerVotes(cols, headers);
    const votePercentage = totalValidVotes > 0 ? (winnerVotes / totalValidVotes) * 100 : 0;

    if (winnerVotes > 0) {
      results.set(code, {
        parliamentCode: code,
        votesReceived: winnerVotes,
        totalValidVotes,
        majority,
        turnoutPercent: Math.round(turnout * 100), // Store as integer (7652 = 76.52%)
        votePercentage: Math.round(votePercentage * 100), // Store as integer
      });
    }
  }

  console.log(`✅ Parsed ${results.size} constituency results`);
  return results;
}

function normalizeCode(code: string): string {
  return code.replace(/\s+/g, '').replace(/\./g, '');
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function findWinnerVotes(cols: string[], headers: string[]): number {
  let maxVotes = 0;

  // Check all party vote columns (BN VOTE, PH VOTE, PN VOTE, etc.)
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].includes('VOTE') && !headers[i].includes('TOTAL') && !headers[i].includes('VALID')) {
      const votes = parseInt(cols[i]?.replace(/,/g, '') || '0', 10);
      if (votes > maxVotes) {
        maxVotes = votes;
      }
    }
  }

  return maxVotes;
}

async function updateMPs(electionData: Map<string, ElectionData>) {
  console.log("🔄 Updating MP records...");

  const allMps = await db.select().from(mps);
  let updated = 0;
  let notFound = 0;

  for (const mp of allMps) {
    const code = normalizeCode(mp.parliamentCode);
    const data = electionData.get(code);

    if (!data) {
      console.warn(`⚠️  No data for ${mp.name} (${mp.parliamentCode})`);
      notFound++;
      continue;
    }

    await db
      .update(mps)
      .set({
        electionVotesReceived: data.votesReceived,
        electionTotalValidVotes: data.totalValidVotes,
        electionYear: 2022,
        electionMajority: data.majority,
        electionTurnoutPercent: data.turnoutPercent,
        electionVotePercentage: data.votePercentage,
      })
      .where(eq(mps.id, mp.id));

    console.log(`✓ ${mp.name}: ${data.votesReceived.toLocaleString()} votes (${(data.votePercentage / 100).toFixed(1)}%)`);
    updated++;
  }

  console.log(`\n✅ Import complete!`);
  console.log(`- Updated: ${updated} MPs`);
  console.log(`- Not found: ${notFound} MPs`);
}

async function main() {
  try {
    const electionData = await fetchElectionData();
    await updateMPs(electionData);
    process.exit(0);
  } catch (error) {
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
}

main();
