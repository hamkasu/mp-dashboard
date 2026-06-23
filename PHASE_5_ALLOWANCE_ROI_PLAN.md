# Phase 5: Allowance-Per-Output Ratios
## Value-For-Money Analysis of MP Compensation

**Date:** June 23, 2026  
**Status:** Ready to build  
**Objective:** Measure parliamentary productivity relative to taxpayer investment

---

## Problem Statement

MPs receive substantial compensation:
- **Base Allowance:** RM 6,000-10,000/month
- **Entertainment:** RM 2,500/month
- **Sitting Allowance:** RM 400/session
- **Minister/Cabinet:** Up to RM 50,000+/month

**Questions we want to answer:**
1. Which MPs generate the most output per ringgit paid?
2. Who are the least productive relative to salary?
3. How does cabinet pay compare to actual work output?
4. Which MPs deliver best ROI for taxpayers?

---

## Data Available

### Allowances (from schema)
- `mpAllowance` - Base monthly allowance
- `ministerSalary` - Minister salary supplement
- `entertainmentAllowance` - RM 2,500/month
- `handphoneAllowance` - RM 2,000/month
- `computerAllowance` - RM 6,000/month
- `dressWearAllowance` - RM 1,000/month
- `parliamentSittingAllowance` - RM 400/session

**Annual Calculation:**
```
Total Annual Allowance = 
  (mpAllowance + ministerSalary) * 12 +
  (entertainmentAllowance * 12) +
  (handphoneAllowance * 12) +
  (computerAllowance * 12) +
  (dressWearAllowance * 12) +
  (parliamentSittingAllowance * sessions)
```

**Example: Regular MP**
- Base: RM 10,000 × 12 = RM 120,000
- Entertainment: RM 2,500 × 12 = RM 30,000
- Phone: RM 2,000 × 12 = RM 24,000
- Computer: RM 6,000 × 12 = RM 72,000
- Dress: RM 1,000 × 12 = RM 12,000
- Sitting (70 sessions): RM 400 × 70 = RM 28,000
- **Total: RM 286,000/year**

### Outputs (from schema & calculated)
- **Hansard Speeches:** Total speech instances
- **Parliamentary Bills:** Legislative proposals raised
- **Parliamentary Questions:** Questions asked in parliament
- **Committee Participation:** Committee membership count
- **Attendance:** Parliament session attendance %

---

## Phase 5 Metrics

### 1. **Allowance-Per-Speech Ratio**
```
Cost Per Speech = Total Annual Allowance / Total Speeches
```

**Interpretation:**
- Low ratio (RM 500 per speech) = High productivity
- High ratio (RM 5,000 per speech) = Low productivity
- Benchmark: ~RM 1,000-2,000 per speech for active MPs

### 2. **Allowance-Per-Bill Ratio**
```
Cost Per Bill = Total Annual Allowance / Bills Raised
```

**Interpretation:**
- Bills are rarer than speeches
- Highly productive: <RM 50,000 per bill
- Low productivity: >RM 200,000 per bill

### 3. **Allowance-Per-Question Ratio**
```
Cost Per Question = Total Annual Allowance / Questions Asked
```

**Interpretation:**
- Questions are common accountability tool
- Active: <RM 2,000 per question
- Inactive: >RM 10,000 per question

### 4. **Allowance-Per-Committee Ratio**
```
Cost Per Committee = Total Annual Allowance / Committees Assigned
```

**Interpretation:**
- Higher participation = shared responsibility
- Shows willingness to take on oversight

### 5. **Composite ROI Score** (0-100)
```
ROI = (Speeches + Bills + Questions + Committees) / Allowance
      Normalized to 0-100 scale

High ROI (80+) = Excellent value for taxpayers
Medium ROI (50-79) = Acceptable performance
Low ROI (<50) = Poor value, minimal output
```

---

## Database Schema

Add to `mpReportCards` table:
```typescript
// Phase 5: Value-for-money metrics
annualAllowance: integer("annual_allowance").notNull().default(0),
allowancePerSpeech: integer("allowance_per_speech").notNull().default(0), // in RM
allowancePerBill: integer("allowance_per_bill").notNull().default(0),
allowancePerQuestion: integer("allowance_per_question").notNull().default(0),
allowancePerCommittee: integer("allowance_per_committee").notNull().default(0),
roiScore: integer("roi_score").notNull().default(50), // 0-100
roiGrade: text("roi_grade").notNull().default("C"), // A-F based on ROI
```

Migration SQL:
```sql
ALTER TABLE mp_report_cards 
ADD COLUMN annual_allowance INTEGER DEFAULT 0,
ADD COLUMN allowance_per_speech INTEGER DEFAULT 0,
ADD COLUMN allowance_per_bill INTEGER DEFAULT 0,
ADD COLUMN allowance_per_question INTEGER DEFAULT 0,
ADD COLUMN allowance_per_committee INTEGER DEFAULT 0,
ADD COLUMN roi_score INTEGER DEFAULT 50,
ADD COLUMN roi_grade TEXT DEFAULT 'C';

CREATE INDEX idx_roi_score ON mp_report_cards(roi_score DESC);
CREATE INDEX idx_roi_grade ON mp_report_cards(roi_grade);
```

---

## Scoring Logic

### Calculate Annual Allowance
```typescript
function calculateAnnualAllowance(mp: Mp): number {
  const base = (mp.mpAllowance || 0) * 12;
  const minister = (mp.ministerSalary || 0) * 12;
  const entertainment = (mp.entertainmentAllowance || 0) * 12;
  const phone = (mp.handphoneAllowance || 0) * 12;
  const computer = (mp.computerAllowance || 0) * 12;
  const dress = (mp.dressWearAllowance || 0) * 12;
  
  // Estimate sitting allowance (assume 70 sessions per year)
  const sitting = (mp.parliamentSittingAllowance || 400) * 70;
  
  return base + minister + entertainment + phone + computer + dress + sitting;
}
```

### Calculate Allowance-Per-X Ratios
```typescript
function calculateAllowanceRatios(
  annualAllowance: number,
  speeches: number,
  bills: number,
  questions: number,
  committees: number
) {
  return {
    allowancePerSpeech: speeches > 0 ? Math.round(annualAllowance / speeches) : 999999,
    allowancePerBill: bills > 0 ? Math.round(annualAllowance / bills) : 999999,
    allowancePerQuestion: questions > 0 ? Math.round(annualAllowance / questions) : 999999,
    allowancePerCommittee: committees > 0 ? Math.round(annualAllowance / committees) : 999999,
  };
}
```

### Calculate ROI Score
```typescript
function calculateROIScore(
  annualAllowance: number,
  speeches: number,
  bills: number,
  questions: number,
  committees: number
): { score: number; grade: string } {
  
  // Weighted composite score
  const outputIndex = 
    (speeches * 1.0) +          // Weight speeches heavily
    (bills * 5.0) +             // Bills worth more
    (questions * 0.8) +         // Questions less than speeches
    (committees * 2.0);         // Committees worth more
  
  // Normalize to 0-100
  // Benchmark: Active MP might score 500-1000 output units
  const roi = (outputIndex / annualAllowance) * 1000000;
  const normalizedROI = Math.min(100, Math.max(0, Math.round(roi)));
  
  let grade: string;
  if (normalizedROI >= 85) grade = 'A';
  else if (normalizedROI >= 70) grade = 'B';
  else if (normalizedROI >= 55) grade = 'C';
  else if (normalizedROI >= 40) grade = 'D';
  else grade = 'F';
  
  return { score: normalizedROI, grade };
}
```

---

## Frontend Components

### 1. **AllowanceBreakdown Card**
Shows MP's total allowance breakdown:
```
Annual Allowance: RM 286,000

Breakdown (pie chart):
├─ Base Allowance: RM 120,000 (42%)
├─ Entertainment: RM 30,000 (10%)
├─ Computer: RM 72,000 (25%)
├─ Phone: RM 24,000 (8%)
├─ Dress: RM 12,000 (4%)
└─ Sitting: RM 28,000 (10%)
```

### 2. **Value-For-Money Grid**
Shows ratios side-by-side:
```
┌─────────────────────────────┐
│ Cost Per Speech             │
│ RM 1,240                    │
│ Good - Active Speaker       │
└─────────────────────────────┘
┌─────────────────────────────┐
│ Cost Per Bill               │
│ RM 95,333                   │
│ Poor - Few Bills Raised     │
└─────────────────────────────┘
```

### 3. **ROI Leaderboard**
Ranked by ROI Score:
```
Rank │ Name              │ ROI Score │ Grade │ Annual Allowance
─────┼──────────────────┼───────────┼───────┼─────────────────
1    │ Anwar Ibrahim     │ 92        │ A     │ RM 286,000
2    │ Karmaine Sardine  │ 88        │ A     │ RM 286,000
3    │ Hannah Yeoh       │ 84        │ B     │ RM 286,000
...
220  │ Silent MP X       │ 8         │ F     │ RM 286,000
```

### 4. **Comparative Analysis**
Compare allowance vs output:
```
Scatter plot: X-axis = Annual Allowance (all MPs get similar amounts)
             Y-axis = Total Output (speeches + bills + questions)

High output, high allowance = "Expensive Active"
Low output, high allowance = "Dead Weight" (taxpayer concern)
High output, low allowance = "Bargain" (model for efficiency)
```

---

## API Endpoints

```
GET /api/mps/:id/allowance-breakdown
  Returns:
  {
    mpId: "...",
    name: "...",
    annualAllowance: 286000,
    allowancePerSpeech: 1240,
    allowancePerBill: 95333,
    allowancePerQuestion: 1830,
    allowancePerCommittee: 57200,
    roiScore: 84,
    roiGrade: "B"
  }

GET /api/report-cards/roi-leaderboard
  Returns: Array of all MPs ranked by ROI score
  [{
    rank: 1,
    mpId: "...",
    name: "...",
    party: "...",
    roiScore: 92,
    roiGrade: "A",
    annualAllowance: 286000,
    outputScore: 2650  // aggregate output
  }]

GET /api/analytics/allowance-efficiency
  Returns:
  {
    averageROI: 52,
    mediaROI: 48,
    topPerformer: { name: "...", roiScore: 92 },
    lowestPerformer: { name: "...", roiScore: 8 },
    allowanceByPerformance: {
      "A-Grade MPs": RM 286000,
      "B-Grade MPs": RM 286000,
      ...
    }
  }
```

---

## Pages to Build

### 1. `/allowance-analysis`
**Main dashboard showing:**
- How much taxpayers spend on parliament (aggregate)
- Average MP allowance
- ROI leaderboard
- Filtering: by state, party, coalition

### 2. `/mp/:id/allowance-breakdown`
**Individual MP page showing:**
- Allowance breakdown (pie chart)
- Cost per output ratios
- ROI grade
- Comparison: How does this MP compare to their coalition/state?

### 3. `/allowance-efficiency`
**Analytical page showing:**
- Correlation: allowance vs output (scatter plot)
- Distribution by ROI grade (histogram)
- Which roles (minister, etc.) get best ROI?
- Historical trend (if data available)

---

## Implementation Steps

1. **Update schema** (migration)
   - Add allowance/ROI fields to mpReportCards
   
2. **Update scoring engine** (report-card-service)
   - Add calculateAnnualAllowance()
   - Add calculateAllowanceRatios()
   - Add calculateROIScore()
   - Integrate into monthly scoring run

3. **Create API endpoints** (routes.ts)
   - /api/mps/:id/allowance-breakdown
   - /api/report-cards/roi-leaderboard
   - /api/analytics/allowance-efficiency

4. **Build frontend components** (React)
   - AllowanceBreakdownCard
   - AllowanceRatioGrid
   - ROILeaderboard
   - AllowanceEfficiencyChart

5. **Create dashboard pages**
   - /allowance-analysis
   - /mp/:id/allowance-breakdown
   - /allowance-efficiency

6. **Add to report card** (enhancement)
   - Show ROI score alongside overall grade
   - Badge: "A-Grade Performer" or "Poor Value for Money"

---

## Interpretation Guide

**High ROI (80+) MPs:**
- Speak frequently
- Raise bills
- Ask questions
- Active in committees
- Taxpayer gets good value

**Low ROI (<40) MPs:**
- Silent or minimal participation
- High allowance despite low output
- Public accountability issue
- May indicate lack of engagement or health/personal issues

**Cabinet Ministers:**
- Higher allowance due to ministerial salary
- May have lower public output (cabinet duties are behind-the-scenes)
- Should still maintain committee participation

---

## Strategic Value

**For Citizens:**
- Understand what parliament costs
- See value-for-money on each MP
- Identify underperforming representatives

**For Media:**
- "RM 8M spent on silent MPs"
- "Top 10 most productive MPs for taxpayers"
- Accountability story ideas

**For Parliament:**
- Performance metrics
- Identify training needs
- Justify budget allocations

---

## Ready to Build?

Phase 5 will add **taxpayer-focused accountability metrics** to the dashboard.

Should I proceed with:
1. ✅ Update schema with allowance/ROI fields
2. ✅ Build scoring engine
3. ✅ Create API endpoints
4. ✅ Build frontend components
5. ✅ Deploy leaderboards

Or would you like to adjust the methodology first?
