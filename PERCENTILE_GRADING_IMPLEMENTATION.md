# Percentile-Based Grading System Implementation

## Overview

This document describes the implementation of a fair, percentile-based grading system for the MP Report Card feature. This replaces the previous absolute threshold system which was too harsh and resulted in no MPs scoring above grade D.

## Problem with Previous System

The original grading system used **absolute thresholds** with min-max normalization:
- Directly used attendance % as attendance score
- Normalized participation metrics against the maximum values
- Applied fixed thresholds (90+ = A, 80-89 = B, etc.)

**Issues:**
- With real MP data showing high attendance clustering (80-100%) and skewed participation, most MPs fell into D/F grades
- Not reflective of actual relative performance
- Uninformative for constituents trying to compare MPs
- Failed to identify genuinely high and low performers

## New Percentile-Based System

### Methodology

The new system uses **percentile ranking** - a standard approach used by MP report card systems worldwide (e.g., PRS India, MyMP Malaysia, GovTrack US).

**Key Principles:**
1. **Relative Ranking**: Each MP is ranked relative to all other MPs, not against absolute thresholds
2. **Percentile Scores**: For each metric, MPs are assigned a percentile score (0-100) based on their rank
3. **Fair Distribution**: Ensures a natural distribution of grades (some A's, mostly B/C, some D/F)
4. **Handles Ties**: MPs with identical values receive the average percentile of their tie group

### Weights

The system uses the following weights for composite scoring:

| Category | Weight | Sub-metrics | Sub-weights |
|----------|--------|-------------|-------------|
| **Attendance** | 40% | Attendance percentage | 100% |
| **Participation** | 40% | Average speeches per session<br>Bills raised<br>Questions asked | 40%<br>30%<br>30% |
| **Conduct** | 15% | Inappropriate language count (inverted)<br>Court cases (inverted) | 70%<br>30% |
| **Constituency Impact** | 5% | Poverty rate (inverted) | 100% |

**Note:** Inverted metrics mean lower values are better (e.g., lower poverty rate = higher score)

### Grade Thresholds

| Grade | Score Range | Expected Distribution |
|-------|-------------|----------------------|
| A | 90-100 | ~10% (top performers) |
| B | 80-89 | ~20-30% |
| C | 70-79 | ~30-40% (majority) |
| D | 60-69 | ~20-30% |
| F | 0-59 | ~10% (chronic low performers) |

## Implementation Details

### Files Created/Modified

#### 1. **`server/utils/percentile-grading.ts`** (NEW)

Core utility functions for percentile calculations:

**`calculatePercentiles(metrics, inverted)`**
- Takes array of `{mpId, value}` objects
- Sorts and ranks all values
- Returns Map of `mpId -> percentile score (0-100)`
- Handles ties by averaging percentiles
- Supports inverted ranking for negative metrics

**`calculateParticipationPercentiles(speeches, bills, questions, weights)`**
- Calculates percentiles for each participation sub-metric separately
- Combines them using weighted average
- Returns composite participation percentile for each MP

**`calculateConductPercentiles(inappropriateLanguage, courtCases, weights)`**
- Both metrics are inverted (lower = better)
- Combines using weighted average
- Returns composite conduct percentile

**`calculateFinalScores(attendance, participation, conduct, constituency, weights)`**
- Combines all category percentiles using overall weights
- Returns final composite score (0-100)

**`getLetterGrade(score)`**
- Converts numerical score to letter grade (A-F)

#### 2. **`server/services/report-card-service.ts`** (MODIFIED)

Updated grading service to use percentile ranking:

**Changes:**
- Updated `DEFAULT_WEIGHTS` to match new weight distribution (40/40/15/5)
- Modified `fetchAllMPMetrics()` to:
  - Fetch `povertyRate` from mps table
  - Convert poverty rate from integer storage (e.g., 125 = 12.5%)
  - Use average speeches per session instead of total speeches
- Completely rewrote `calculateAllGrades()`:
  - Prepares metrics arrays for percentile calculations
  - Calls percentile functions for each category
  - Combines percentiles into final scores
  - Assigns letter grades

**Key Functions:**
```typescript
// Fetch all MP metrics from database
fetchAllMPMetrics(): Promise<MPMetrics[]>

// Calculate percentile-based grades for all MPs
calculateAllGrades(weights): Promise<CalculatedGrade[]>

// Update database with calculated grades
updateAllReportCards(): Promise<{updated, created}>

// Retrieve report cards with MP details
getReportCardsWithDetails()

// Get aggregate statistics
getAggregateStats()
```

### Data Flow

```
1. Monthly Cron Job / Manual Trigger
   ↓
2. fetchAllMPMetrics()
   - Fetch attendance, speeches, bills, questions, court cases, poverty rate
   - Calculate attendance percentage, average speeches
   ↓
3. calculateAllGrades()
   - Prepare metrics arrays {mpId, value}
   - calculatePercentiles() for each metric
   - calculateParticipationPercentiles() for composite participation
   - calculateConductPercentiles() for composite conduct
   - calculateFinalScores() for weighted composite
   - getLetterGrade() for letter grades
   ↓
4. updateAllReportCards()
   - Store scores and grades in database
   ↓
5. Frontend displays updated grades
```

## Examples

### Attendance Percentile Calculation

Given 5 MPs with attendance:
- MP1: 95% → Percentile: 100 (highest)
- MP2: 90% → Percentile: 75
- MP3: 85% → Percentile: 50
- MP4: 80% → Percentile: 25
- MP5: 75% → Percentile: 0 (lowest)

### Composite Score Calculation

For an MP with:
- Attendance percentile: 85
- Participation percentile: 70
- Conduct percentile: 90
- Constituency percentile: 60

Final Score = (85 × 0.40) + (70 × 0.40) + (90 × 0.15) + (60 × 0.05)
           = 34 + 28 + 13.5 + 3
           = **78.5 → Grade C**

## Testing

To test the new grading system:

1. **Trigger Manual Update** (requires admin login):
   ```bash
   POST /api/admin/report-cards/update
   ```

2. **Verify Grade Distribution**:
   - Check `/report-card` page
   - Should see natural distribution (some A's, mostly B/C, some D/F)
   - Average grade should be around C (70-75)

3. **Check Top Performers**:
   - Should include MPs with:
     - High attendance (90%+)
     - Active participation (frequent speeches, bills, questions)
     - Good conduct (low/no inappropriate language or court cases)
     - Low constituency poverty (if data available)

## Migration Notes

- **No database schema changes** required
- Existing `mpReportCards` table already has all necessary columns
- Grades will be recalculated on next update (monthly cron or manual trigger)
- Previous grades will be overwritten

## Future Enhancements

1. **Inappropriate Language Tracking**:
   - Currently defaulted to 0 for all MPs
   - Need to implement Hansard text analysis to detect inappropriate language
   - Consider using AI/NLP for sentiment analysis

2. **Dynamic Weights**:
   - Allow admins to adjust weights through UI
   - Store custom weight configurations

3. **Historical Tracking**:
   - Archive previous month's grades
   - Show grade trends over time

4. **Performance Insights**:
   - Show which metrics are pulling a grade up/down
   - Percentile breakdown per category

## References

- **PRS India Legislative Research**: Uses percentile ranking for MP performance
- **MyMP Malaysia**: Previous system used relative ranking (now defunct)
- **GovTrack US**: Ranks US Congress members by percentiles
- **Parliamentary monitoring best practices**: Emphasize relative performance metrics

## Credits

Implementation by Claude Code Agent
Date: December 2024
