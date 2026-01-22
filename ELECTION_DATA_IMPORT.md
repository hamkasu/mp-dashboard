# GE15 Election Results Import Guide

This guide explains how to import election vote data from the 15th General Election (GE15) held in November 2022.

## Data Source

The election results are sourced from **Tindak Malaysia's Historical Election Results** repository:
- Repository: https://github.com/TindakMalaysia/HISTORICAL-ELECTION-RESULTS
- File: `2022-ELECTION-RESULTS/MALAYSIA_2022_PARLIAMENT_RESULTS.csv`
- License: Open data - check the repository's General_Licence file for usage terms

## What Gets Imported

The import script adds the following election metrics to each MP's record:

1. **Election Votes Received** - Number of votes the winning candidate received
2. **Election Total Valid Votes** - Total valid votes cast in the constituency
3. **Election Year** - Year of the general election (2022 for GE15)
4. **Election Majority** - Winning margin (vote difference from runner-up)
5. **Election Turnout Percent** - Voter turnout percentage for the constituency
6. **Election Vote Percentage** - Percentage of valid votes received by the winning candidate

## How to Import

### Step 1: Run the Migration

First, apply the database schema changes:

```bash
npm run db:migrate
```

Or manually run the migration:

```bash
psql $DATABASE_URL -f migrations/0018_add_election_results_columns.sql
```

### Step 2: Download the CSV (if not already done)

The GE15 results CSV should already be in the project root as `ge15_results.csv`. If not, download it:

```bash
curl -o ge15_results.csv "https://raw.githubusercontent.com/TindakMalaysia/HISTORICAL-ELECTION-RESULTS/main/2022-ELECTION-RESULTS/MALAYSIA_2022_PARLIAMENT_RESULTS.csv"
```

### Step 3: Run the Import Script

Execute the import script to populate the database:

```bash
npm run import-election-results
```

Or use tsx directly:

```bash
npx tsx scripts/import-election-results.ts
```

The script will:
1. Parse the GE15 results CSV file
2. Match constituencies to MPs using parliament codes
3. Extract vote counts and election metrics
4. Update each MP's record with their election performance data

### Step 4: Verify the Import

Check that the data was imported successfully:

```sql
SELECT
  name,
  constituency,
  election_votes_received,
  election_vote_percentage / 100.0 as vote_percent,
  election_majority,
  election_turnout_percent / 100.0 as turnout_percent
FROM mps
WHERE election_votes_received IS NOT NULL
LIMIT 10;
```

## Data Format Notes

- **Percentages are stored as integers** (multiplied by 100)
  - Example: 76.52% is stored as 7652
  - Example: 53.58% is stored as 5358
- This format matches the existing pattern used for poverty rates
- When displaying, divide by 100 to get the decimal value

## Viewing the Data

After import, election results will appear on:
- **MP Cards** on the home page - showing votes received, vote percentage, majority, and turnout
- **MP Profile Pages** - detailed election performance metrics
- **Report Cards** (if enabled) - election performance as part of overall assessment

## Troubleshooting

### No election data showing up

1. Check if the migration ran successfully
2. Verify the CSV file exists at `/home/user/mp-dashboard/ge15_results.csv`
3. Check the import script logs for any errors
4. Ensure constituency codes match between the database and CSV

### Constituency code mismatches

The script normalizes constituency codes by removing spaces and dots:
- CSV format: `P. 001` → Normalized: `P001`
- Database format should already be `P001`

If there are still mismatches, check the `parliamentCode` field in the database.

## Data Sources & Attribution

- **Election Results**: Tindak Malaysia - Historical Election Results
- **Data Compilation**: Tindak Malaysia GitHub (https://github.com/TindakMalaysia)
- **Official Source**: Suruhanjaya Pilihan Raya Malaysia (SPR) - Election Commission of Malaysia

## References

- SPR Official Portal: https://spr.gov.my/
- SPR Results Dashboard: https://dashboard.spr.gov.my/
- MySPR Semak (Results Checker): https://mysprsemak.spr.gov.my/semakan/keputusan
- Tindak Malaysia: https://www.tindakmalaysia.org/
- Sinar Project GE15 Open Data: https://sinarproject.org/open-government/open-data/ge15-open-data

## License

This data is public domain election results compiled from official government sources. Check the source repository for specific licensing terms.
