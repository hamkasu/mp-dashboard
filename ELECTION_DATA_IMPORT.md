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

### Method 1: Via Admin Dashboard (Recommended)

The easiest way to import election data is through the Hansard Admin interface:

1. Navigate to `/hansard-admin` (requires admin login)
2. Find the "Import Election Results" card (purple border)
3. Click "Import Election Data" button
4. Confirm the dialog prompt
5. Wait for the success notification

The data will be automatically fetched from Tindak Malaysia's GitHub repository and imported.

### Method 2: Via Command Line

#### Step 1: Run the Migration

First, apply the database schema changes:

```bash
npm run db:migrate
```

Or manually run the migration:

```bash
psql $DATABASE_URL -f migrations/0018_add_election_results_columns.sql
```

#### Step 2: Run the Import Script

Execute the import script to populate the database:

```bash
npm run import-election-results
```

Or use tsx directly:

```bash
npx tsx scripts/import-election-results.ts
```

The script will:
1. Fetch the GE15 results CSV from Tindak Malaysia's GitHub repository
2. Parse the CSV data
3. Match constituencies to MPs using parliament codes
4. Extract vote counts and election metrics
5. Update each MP's record with their election performance data

#### Step 3: Verify the Import

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

1. Check if the migration ran successfully:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'mps' AND column_name LIKE 'election_%';
   ```
2. Verify the import script ran without errors (check logs)
3. Ensure you have internet connectivity (script fetches data from GitHub)
4. Check that constituency codes match between the database and CSV

### Network errors during import

If the script fails to fetch the CSV from GitHub:
- Check your internet connection
- Verify GitHub is accessible from your server
- The source URL is: https://raw.githubusercontent.com/TindakMalaysia/HISTORICAL-ELECTION-RESULTS/main/2022-ELECTION-RESULTS/MALAYSIA_2022_PARLIAMENT_RESULTS.csv
- If GitHub is blocked, you may need to use a proxy or download the file manually

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
