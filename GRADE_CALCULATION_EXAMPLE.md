# How MP Report Card Grades Are Calculated

## Example: Chong Zhemin (Kampar) - Grade B

A **Grade B** means an overall score between **80-89** out of 100.

## Score Breakdown

The overall score is calculated from 4 weighted components:

```
Overall Score = (Attendance × 40%) + (Participation × 30%) + (Conduct × 20%) + (Constituency × 10%)
```

### For a B Grade (80-89), here's a typical breakdown:

---

## 1. Attendance Score (40% weight)

**What it measures**: Days attended ÷ Total parliament days

**How it's calculated**:
1. Calculate attendance percentage for ALL MPs
2. Rank by percentile (0-100)
   - Highest attendance = 100th percentile
   - Lowest attendance = 0th percentile

**Example**:
- If MP attended 80 out of 100 days = 80% attendance
- If this ranks in the 75th percentile among all MPs
- **Attendance Score = 75**

---

## 2. Participation Score (30% weight)

**What it measures**: Weighted average of 3 sub-metrics

**Formula**:
```
Participation = (Speeches × 40%) + (Bills × 30%) + (Questions × 30%)
```

**Sub-metrics**:

### a) Average Speeches per Session (40% of participation)
- Total speech instances ÷ Hansard sessions spoke
- Ranked by percentile

### b) Bills Raised (30% of participation)
- Total legislative proposals sponsored
- Ranked by percentile

### c) Questions Asked (30% of participation)
- Total parliamentary questions submitted
- Ranked by percentile

**Example**:
- Speeches percentile: 85
- Bills percentile: 70
- Questions percentile: 80

```
Participation Score = (85 × 0.4) + (70 × 0.3) + (80 × 0.3)
                    = 34 + 21 + 24
                    = 79
```

---

## 3. Conduct Score (20% weight)

**What it measures**: Number of court cases (INVERTED - fewer is better)

**How it's calculated**:
1. Count court cases for ALL MPs
2. Rank by percentile with `lowerIsBetter=true`
   - Fewest court cases = 100th percentile
   - Most court cases = 0th percentile

**Example**:
- MP has 0 court cases
- This is likely 100th percentile (best possible)
- **Conduct Score = 100**

---

## 4. Constituency Impact Score (10% weight) - **NEW!**

**What it measures**: Poverty rate in MP's constituency (INVERTED - lower is better)

**How it's calculated**:
1. Get poverty incidence from constituency data
2. Rank by percentile with `lowerIsBetter=true`
   - Lowest poverty = 100th percentile (best)
   - Highest poverty = 0th percentile (worst)

**Example for Kampar**:
- Kampar poverty rate: 7.6% (stored as 76)
- National average: ~6.5%
- This might rank around 40th percentile
- **Constituency Score = 40**

---

## Putting It All Together

### Example Calculation for B Grade (80-89):

```
Component           | Score | Weight | Contribution
--------------------|-------|--------|-------------
Attendance          |   75  |  40%   |   30.0
Participation       |   79  |  30%   |   23.7
Conduct             |  100  |  20%   |   20.0
Constituency Impact |   40  |  10%   |    4.0
--------------------|-------|--------|-------------
OVERALL SCORE       |       |        |   77.7 ≈ 78
```

**Result**: Overall Score = **78 → Grade C**

Wait, that would be a C! For a **Grade B**, we need 80-89.

### Adjusted Example for Grade B:

```
Component           | Score | Weight | Contribution
--------------------|-------|--------|-------------
Attendance          |   85  |  40%   |   34.0
Participation       |   82  |  30%   |   24.6
Conduct             |  100  |  20%   |   20.0
Constituency Impact |   40  |  10%   |    4.0
--------------------|-------|--------|-------------
OVERALL SCORE       |       |        |   82.6 ≈ 83
```

**Result**: Overall Score = **83 → Grade B** ✓

---

## Grade Thresholds

| Grade | Score Range | Interpretation |
|-------|-------------|----------------|
| **A** | 90-100      | Excellent performance |
| **B** | 80-89       | Above average performance |
| **C** | 70-79       | Average performance |
| **D** | 60-69       | Below average performance |
| **F** | 0-59        | Poor performance |

---

## Key Points

1. **Percentile-based**: MPs are ranked relative to each other, not against absolute standards
2. **Fair distribution**: Ensures natural grade spread across all MPs
3. **Weighted scoring**: Attendance matters most (40%), then participation (30%)
4. **Inverted metrics**: Court cases and poverty use reverse scoring (lower = better)
5. **Data-driven**: Uses real parliamentary data, court records, and poverty statistics

---

## To See Chong Zhemin's Actual Scores

Run this API call (requires server to be running):

```bash
curl http://localhost:5000/api/report-cards | jq '.[] | select(.mp.name == "Chong Zhemin")'
```

Or visit the admin panel at: `/admin/report-cards`
