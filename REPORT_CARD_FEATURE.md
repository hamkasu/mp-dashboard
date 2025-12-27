# MP Report Card Feature

## Overview

The MP Report Card feature provides a comprehensive performance evaluation system for all 221 Members of Parliament in Malaysia's Dewan Rakyat. It automatically calculates grades based on weighted metrics including attendance, participation, conduct, and constituency impact.

## Features

### 1. **Public Report Card Page** (`/report-card`)
- **Searchable & Filterable Table**: View all MPs with their performance grades
- **Filters**:
  - Search by name, party, or constituency
  - Filter by grade (A-F)
  - Filter by state
  - Filter by coalition (Government/Opposition)
- **Sortable Columns**: Sort by name, party, constituency, grade, score, attendance, and participation
- **Aggregate Statistics**:
  - Total MPs evaluated
  - Average performance score
  - Grade distribution
  - Top 10 and Bottom 10 performers
- **Visual Elements**:
  - Color-coded grade badges
  - Progress bars for attendance and participation scores
  - Responsive card-based and table layouts

### 2. **Admin Panel** (`/report-card-admin`)
- **Manual Update Trigger**: Force immediate recalculation of all report cards
- **Update Status Dashboard**: View last update time and scheduled update information
- **Grading Methodology Display**: Detailed breakdown of how grades are calculated
- **Admin-only Access**: Requires admin authentication

### 3. **Automatic Monthly Updates**
- **Scheduled Updates**: Automatically runs on the 1st of every month at 2:00 AM MYT
- **Cron Job**: Uses node-cron for reliable scheduling
- **Background Processing**: Updates all MP report cards without manual intervention

## Grading Methodology

### **PERCENTILE-BASED RANKING SYSTEM** ✨ (Updated)

The grading system uses **percentile ranking** - a fair, relative performance evaluation method used by parliamentary monitoring organizations worldwide (PRS India, MyMP Malaysia, GovTrack US).

**Key Principle**: Each MP is ranked relative to all other MPs, not against absolute thresholds. This ensures a natural distribution of grades and accurately reflects relative performance.

### Overall Score Calculation (0-100)

The overall score is calculated using **weighted percentile scores** from four key categories:

#### 1. **Attendance Score (40% weight)**
- **Metric**: `(daysAttended / totalParliamentDays) * 100`
- **Ranking**: All MPs ranked by attendance percentage
- **Score**: Percentile rank (0-100)
- Higher attendance = higher percentile

#### 2. **Participation Score (40% weight)**
- **Sub-metrics** (each ranked separately, then combined):
  - **Average Speeches per Session (40%)**: Total speeches / sessions spoken
  - **Bills Raised (30%)**: Number of legislative proposals submitted
  - **Questions Asked (30%)**: Parliamentary questions submitted
- **Ranking**: Percentile rank for each sub-metric
- **Score**: Weighted average of percentiles
- More active participation = higher percentile

#### 3. **Conduct Score (15% weight)**
- **Sub-metrics** (inverted - lower is better):
  - **Inappropriate Language Instances (70%)**: Counted from Hansard records
  - **Court Cases (30%)**: Active court cases
- **Ranking**: Inverted percentile (lowest values get highest percentiles)
- **Score**: Weighted average of percentiles
- Better conduct = higher percentile

#### 4. **Constituency Impact Score (5% weight)**
- **Metric**: Poverty rate in MP's constituency
- **Ranking**: Inverted percentile (lower poverty = higher percentile)
- **Score**: Percentile rank (0-100)
- Lower poverty = higher percentile
- Note: This is a proxy measure; actual constituency impact is multifaceted

### Percentile Calculation Details

For each metric:
1. All 221 MPs are sorted by their value
2. Each MP receives a percentile rank: `(rank / (n-1)) * 100`
3. MPs with identical values receive the average percentile of their tie group
4. Inverted metrics (conduct, poverty) are ranked in reverse order

**Example**: If an MP has the 10th highest attendance out of 221 MPs, their attendance percentile ≈ 95.5

### Final Grade Assignment

Based on the overall composite score (0-100):

| Grade | Score Range | Color | Expected Distribution |
|-------|-------------|-------|----------------------|
| **A** | 90-100 | Green | ~10% (top performers) |
| **B** | 80-89 | Blue | ~20-30% |
| **C** | 70-79 | Yellow | ~30-40% (majority) |
| **D** | 60-69 | Orange | ~20-30% |
| **F** | Below 60 | Red | ~10% (chronic low performers) |

**Note**: The percentile system ensures a fair distribution - some MPs will receive A's for genuinely outstanding performance, while most will fall in the B/C range, with D/F reserved for consistently poor performers.

## Architecture

### Database Schema

**Table**: `mp_report_cards`

```sql
CREATE TABLE mp_report_cards (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_id VARCHAR NOT NULL REFERENCES mps(id) ON DELETE CASCADE,

  -- Calculated scores (0-100)
  attendance_score INTEGER NOT NULL DEFAULT 0,
  participation_score INTEGER NOT NULL DEFAULT 0,
  conduct_score INTEGER NOT NULL DEFAULT 0,
  constituency_impact_score INTEGER NOT NULL DEFAULT 0,
  overall_score INTEGER NOT NULL DEFAULT 0,

  -- Letter grade (A-F)
  grade TEXT NOT NULL DEFAULT 'F',

  -- Metadata
  total_speeches INTEGER NOT NULL DEFAULT 0,
  average_speeches INTEGER NOT NULL DEFAULT 0,
  bills_raised INTEGER NOT NULL DEFAULT 0,
  questions_asked INTEGER NOT NULL DEFAULT 0,
  inappropriate_language_count INTEGER NOT NULL DEFAULT 0,
  poverty_rate INTEGER DEFAULT 0,

  -- Timestamps
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(mp_id)
);
```

### Backend Components

#### 1. **Service Layer**
- **File**: `server/services/report-card-service.ts`
- **Key Functions**:
  - `fetchAllMPMetrics()`: Retrieves all MP data from database
  - `calculateAllGrades()`: Computes scores and grades for all MPs
  - `updateAllReportCards()`: Updates/inserts report cards in database
  - `getReportCardsWithDetails()`: Fetches report cards with MP details
  - `getAggregateStats()`: Calculates aggregate statistics

#### 2. **API Routes**
- **File**: `server/routes.ts`
- **Endpoints**:
  - `GET /api/report-cards` - Get all report cards with MP details
  - `GET /api/report-cards/stats` - Get aggregate statistics
  - `GET /api/report-cards/:mpId` - Get report card for specific MP
  - `POST /api/admin/report-cards/update` - Trigger manual update (admin only)
  - `GET /api/admin/report-cards/last-update` - Get last update timestamp (admin only)

#### 3. **Cron Job**
- **File**: `server/report-card-cron.ts`
- **Schedule**: `0 2 1 * *` (2:00 AM on the 1st of every month, MYT)
- **Function**: `startReportCardCron()` - Initialized on server startup

### Frontend Components

#### 1. **Report Card Page**
- **File**: `client/src/pages/ReportCard.tsx`
- **Features**:
  - Aggregate statistics cards
  - Top 10 and Bottom 10 performers
  - Search and filter interface
  - Sortable table with all MPs
  - Grading methodology explanation

#### 2. **Report Card Admin**
- **File**: `client/src/pages/ReportCardAdmin.tsx`
- **Features**:
  - Update status dashboard
  - Manual update trigger button
  - Grading methodology details
  - Admin-only access protection

#### 3. **Navigation**
- **File**: `client/src/components/Header.tsx`
- **Added Links**:
  - "Report Card" in main navigation
  - "Report Card Admin" in admin dropdown menu

## Setup & Deployment

### 1. Database Migration

Run the migration to create the report cards table:

```bash
# The migration file is located at:
# migrations/add_mp_report_cards.sql

# Run migration (automatically handled by startup tasks in production)
npm run db:migrate
```

### 2. Initial Data Population

After the migration, trigger an initial calculation:

```bash
# Option 1: Via admin panel (preferred)
1. Log in as admin
2. Navigate to /report-card-admin
3. Click "Trigger Manual Update"

# Option 2: Via API
curl -X POST http://localhost:5000/api/admin/report-cards/update \
  -H "Content-Type: application/json" \
  --cookie "session=<your-session-cookie>"
```

### 3. Verify Cron Job

The cron job starts automatically on server initialization. Verify in logs:

```bash
# Look for this log entry on server start:
[Report Card Cron] Monthly update job scheduled for 1st of every month at 2:00 AM MYT
```

### 4. Access the Feature

- **Public Page**: `https://myparliament.calmic.com.my/report-card`
- **Admin Panel**: `https://myparliament.calmic.com.my/report-card-admin` (requires admin login)

## Development

### Running Locally

```bash
# Start development server
npm run dev

# The report card feature will be available at:
# http://localhost:5000/report-card
# http://localhost:5000/report-card-admin
```

### Testing Grading Logic

```typescript
// Import the service
import { calculateAllGrades, updateAllReportCards } from './server/services/report-card-service';

// Test grade calculation
const grades = await calculateAllGrades();
console.log('Calculated grades:', grades);

// Test database update
const result = await updateAllReportCards();
console.log(`Created: ${result.created}, Updated: ${result.updated}`);
```

## Customization

### Adjusting Grading Weights

Edit `server/services/report-card-service.ts`:

```typescript
export const DEFAULT_WEIGHTS: GradingWeights = {
  attendance: 0.40,        // 40%
  participation: 0.30,     // 30%
  conduct: 0.20,           // 20%
  constituencyImpact: 0.10 // 10%
};
```

### Changing Cron Schedule

Edit `server/report-card-cron.ts`:

```typescript
// Current: 1st of every month at 2:00 AM
cronJob = cron.schedule("0 2 1 * *", async () => {
  // Update logic
});

// Examples:
// Daily at 2 AM: "0 2 * * *"
// Weekly on Monday at 2 AM: "0 2 * * 1"
// Every 6 hours: "0 */6 * * *"
```

### Modifying Grade Thresholds

Edit `server/services/report-card-service.ts`:

```typescript
export function getLetterGrade(score: number): string {
  if (score >= 90) return 'A';  // Customize these thresholds
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
```

## Monitoring & Maintenance

### Check Last Update

```bash
# Via API
curl http://localhost:5000/api/admin/report-cards/last-update \
  --cookie "session=<your-session-cookie>"

# Via database
psql $DATABASE_URL -c "SELECT MAX(updated_at) FROM mp_report_cards;"
```

### Manual Update via API

```bash
# Trigger update
curl -X POST http://localhost:5000/api/admin/report-cards/update \
  -H "Content-Type: application/json" \
  --cookie "session=<your-session-cookie>"
```

### View Aggregate Stats

```bash
curl http://localhost:5000/api/report-cards/stats
```

## Troubleshooting

### Report cards not updating

1. Check if cron job is running:
   ```bash
   # Look for log: "[Report Card Cron] Monthly update job scheduled..."
   ```

2. Manually trigger update via admin panel

3. Check database connectivity and MP data availability

### Grades seem incorrect

1. Verify MP data is current (attendance, speeches, bills, questions)
2. Check if constituency data (poverty rates) is populated
3. Review grading weights in `report-card-service.ts`
4. Inspect calculated scores in database:
   ```sql
   SELECT mp_id, grade, overall_score, attendance_score,
          participation_score, conduct_score
   FROM mp_report_cards
   ORDER BY overall_score DESC
   LIMIT 10;
   ```

### Performance issues with large datasets

1. Ensure database indexes are created (automatically handled by migration)
2. Consider batch processing for very large MP counts
3. Monitor memory usage during updates

## Future Enhancements

Potential improvements to consider:

1. **Historical Tracking**: Store grade history to show trends over time
2. **Comparative Analysis**: Compare MPs within the same state or coalition
3. **Detailed Breakdown**: Per-MP drill-down showing component score details
4. **Export Functionality**: Download report cards as CSV/PDF
5. **Custom Filters**: Filter by tenure, ministerial status, or specific metrics
6. **Email Notifications**: Alert admins when updates complete or fail
7. **Performance Benchmarks**: Compare against historical averages
8. **Poverty Data Integration**: Automatically fetch updated constituency poverty rates
9. **Inappropriate Language Detection**: Implement automated flagging from Hansard transcripts

## License

Copyright by Calmic Sdn Bhd

## Support

For issues or questions about the Report Card feature, contact the development team or refer to the main project documentation.
