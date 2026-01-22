/**
 * Import GE15 (2022) Election Results
 * This script imports election vote data from the Tindak Malaysia CSV
 * and updates MP records with their election performance metrics.
 */

import { db } from "../db";
import { mps } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import csvParser from "csv-parser";

interface ElectionResult {
  constituencyCode: string;
  constituencyName: string;
  winningParty: string;
  totalValidVotes: number;
  totalElectorate: number;
  winningMajority: number;
  turnoutPercent: number;
  candidates: Array<{
    party: string;
    name: string;
    votes: number;
    sex: string;
    age: number;
  }>;
}

// Normalize constituency code (remove spaces and dots)
function normalizeConstituencyCode(code: string): string {
  return code.replace(/\s+/g, "").replace(/\./g, "");
}

// Parse CSV and extract election results
async function parseElectionResults(): Promise<Map<string, ElectionResult>> {
  const resultsMap = new Map<string, ElectionResult>();
  const csvFilePath = path.join(__dirname, "..", "ge15_results.csv");

  return new Promise((resolve, reject) => {
    const results: any[] = [];

    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on("data", (row) => {
        results.push(row);
      })
      .on("end", () => {
        console.log(`Parsed ${results.length} rows from CSV`);

        for (const row of results) {
          const constituencyCode = normalizeConstituencyCode(row["PARLIAMENTARY CONSTITUENCY CODE"]);

          // Extract all candidates and their votes
          const candidates: Array<{party: string; name: string; votes: number; sex: string; age: number}> = [];

          // Parse party columns (BN, PH, PN, GPS, GRS, WARISAN, etc.)
          const parties = ["BN", "PH", "PN", "GPS", "GRS", "WARISAN", "GTA"];

          for (const party of parties) {
            const candidateName = row[`${party} CANDIDATE`];
            const votesStr = row[`${party} VOTE`];

            if (candidateName && votesStr) {
              candidates.push({
                party: party,
                name: candidateName.trim(),
                votes: parseInt(votesStr.replace(/,/g, ""), 10) || 0,
                sex: row[`${party} CANDIDATE SEX`] || "",
                age: parseInt(row[`${party} CANDIDATE AGE`], 10) || 0,
              });
            }
          }

          // Parse independent candidates (IND 1, IND 2, etc.)
          for (let i = 1; i <= 10; i++) {
            const indPrefix = `IND ${i}`;
            const candidateName = row[indPrefix];
            const votesStr = row[`${indPrefix} VOTE`];

            if (candidateName && votesStr) {
              candidates.push({
                party: "IND",
                name: candidateName.trim(),
                votes: parseInt(votesStr.replace(/,/g, ""), 10) || 0,
                sex: row[`${indPrefix} SEX`] || "",
                age: parseInt(row[`${indPrefix} AGE`], 10) || 0,
              });
            }
          }

          // Sort candidates by votes to find winner
          candidates.sort((a, b) => b.votes - a.votes);

          resultsMap.set(constituencyCode, {
            constituencyCode,
            constituencyName: row["PARLIAMENTARY CONSTITUENCY NAME"],
            winningParty: row["WINNING PARTY"] || "",
            totalValidVotes: parseInt(row["TOTAL VALID VOTES"].replace(/,/g, ""), 10) || 0,
            totalElectorate: parseInt(row["TOTAL ELECTORATE"].replace(/,/g, ""), 10) || 0,
            winningMajority: parseInt(row["WINNING MAJORITY"].replace(/,/g, ""), 10) || 0,
            turnoutPercent: parseFloat(row["TURNOUT (%)"]) || 0,
            candidates,
          });
        }

        resolve(resultsMap);
      })
      .on("error", reject);
  });
}

// Match MP to winning candidate by name similarity
function findWinningCandidate(
  mp: { name: string; party: string; constituency: string },
  electionResult: ElectionResult
): { votes: number; votePercentage: number } | null {
  if (!electionResult || electionResult.candidates.length === 0) {
    return null;
  }

  // The winner is the first candidate (already sorted by votes)
  const winner = electionResult.candidates[0];

  // Calculate vote percentage
  const votePercentage = (winner.votes / electionResult.totalValidVotes) * 100;

  return {
    votes: winner.votes,
    votePercentage: Math.round(votePercentage * 100), // Store as integer (e.g., 5358 = 53.58%)
  };
}

// Main import function
async function importElectionResults() {
  console.log("Starting GE15 election results import...");

  // Parse CSV file
  const electionResults = await parseElectionResults();
  console.log(`Loaded election results for ${electionResults.size} constituencies`);

  // Fetch all MPs from database
  const allMps = await db.select().from(mps);
  console.log(`Found ${allMps.length} MPs in database`);

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const mp of allMps) {
    const normalizedCode = normalizeConstituencyCode(mp.parliamentCode);
    const electionResult = electionResults.get(normalizedCode);

    if (!electionResult) {
      console.warn(`No election result found for ${mp.name} (${mp.parliamentCode} - ${mp.constituency})`);
      notFoundCount++;
      continue;
    }

    const winnerData = findWinningCandidate(mp, electionResult);

    if (!winnerData) {
      console.warn(`Could not find winner for ${mp.name} (${mp.constituency})`);
      notFoundCount++;
      continue;
    }

    // Update MP with election data
    await db
      .update(mps)
      .set({
        electionVotesReceived: winnerData.votes,
        electionTotalValidVotes: electionResult.totalValidVotes,
        electionYear: 2022,
        electionMajority: electionResult.winningMajority,
        electionTurnoutPercent: Math.round(electionResult.turnoutPercent * 100), // Store as integer
        electionVotePercentage: winnerData.votePercentage,
      })
      .where(eq(mps.id, mp.id));

    console.log(
      `Updated ${mp.name} (${mp.constituency}): ${winnerData.votes.toLocaleString()} votes (${(winnerData.votePercentage / 100).toFixed(2)}%)`
    );
    updatedCount++;
  }

  console.log(`\nImport complete!`);
  console.log(`- Updated: ${updatedCount} MPs`);
  console.log(`- Not found: ${notFoundCount} MPs`);
}

// Run the import
importElectionResults()
  .then(() => {
    console.log("Import completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  });
