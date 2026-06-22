# Priority 0: Contact Data Verification Report

**Generated:** June 22, 2026  
**Status:** ⏸️ AWAITING MANUAL VERIFICATION & APPROVAL  
**File for Review:** [`PRIORITY_0_CONTACT_COMPARISON.csv`](PRIORITY_0_CONTACT_COMPARISON.csv)

---

## Executive Summary

I've completed a diagnostic analysis of the 36 mismatched MP contact records. Since the environment doesn't have outbound internet access to fetch directly from parliament.gov.my, I used **intelligent pattern analysis** to classify the severity of each mismatch.

### Analysis Results:

| Category | Count | Status |
|----------|-------|--------|
| **DEFINITELY NEEDS CORRECTION** | 2 | Parliament code mismatch detected |
| **NEEDS CORRECTION** (High confidence) | 15 | Email or address clearly wrong |
| **NEEDS REVIEW** (Medium confidence) | 19 | Email OK but address suspect |
| **Data Likely Correct** | 0 | None passed all checks |

---

## What the Analysis Found

### 🔴 CRITICAL - Definite Parliament Code Mismatches (2 records)

These emails contain **explicit parliament code references** that don't match the MP's assigned code:

1. **Mohamad Hasan** (P131, Rembau)
   - Current email: `parlimenp061@gmail.com` (P061 ≠ P131)
   - Current address: Padang Rengas, Perak (Wrong state - should be Negeri Sembilan)
   - **Action:** Definitely incorrect data

2. **Hanifah Hajar Taib** (P213, Mukah, Sarawak)
   - Current email: `ustazismip069@gmail.com` (P069 ≠ P213)
   - Current address: Perak (Wrong state - should be Sarawak)
   - **Action:** Definitely incorrect data

---

### 🟠 HIGH PRIORITY - Email Mismatches Without Name Match (13 records)

These emails don't contain the MP's name or refer to completely different constituencies:

| MP | Email Issue | Address Issue | Priority |
|----|------------|---------------|----------|
| Ikmal Hisham Abdul Aziz (P027) | `ik.nobletwin` - no name match | In KL, not Kelantan | HIGH |
| Suhaimi Abdullah (P004) | `khalib.5050` - no name match | In Pahang, not Kedah | HIGH |
| Ngeh Koo Ham (P068) | `drmaskepalabatas` - wrong constituency | In Penang, not Perak | HIGH |
| Wan Azizah Wan Ismail (P124) | `abuabdulhalim24` - no name match | In Melaka, not KL | HIGH |
| Hamzah Zainudin (P056) | Generic parliament email | In KL, not Perak | HIGH |
| Jonathan Yasin (P179) | `muhyddin.tsmy` - no name match | In KL, not Sabah | HIGH |
| Hishammuddin Hussein (P153) | `dshh61` - no name match | In KL, not Johor | HIGH |
| Roslan Hashim (P018) | Generic parliament email | In Terengganu, not Kedah | HIGH |
| Rafizi Ramli (P100) | Generic parliament email | Wrong state/constituency | HIGH |
| Suhaili Abdul Rahman (P166) | `syedsaddiq92` - no name match | In Johor, not Labuan | HIGH |
| Ahmad Tarmizi Sulaiman (P013) | Generic parliament email | In Kelantan, not Kedah | HIGH |
| Steven Sim (P045) | `ybteresakok1` - no name match | In KL, not Penang | HIGH |
| Fong Kui Lun (P120) | Generic parliament email | Address is correct! | MEDIUM |

**Common pattern:** Generic office emails like `dapbukit bintang@gmail.com`, `mpbachok@gmail.com` without the actual MP's personal or direct constituency email.

---

### 🟡 MEDIUM PRIORITY - Ministry Offices (6 records)

Cabinet members/deputy ministers with **ministry office addresses** instead of constituency office addresses:

| MP | Role | Ministry Address | Issue |
|----|------|------------------|-------|
| Hannah Yeoh (P117) | Minister of Youth & Sports | Putrajaya KBS Ministry | Should also have Segambut office |
| Ahmad Zahid Hamidi (P075) | Deputy PM | DPM Office, Putrajaya | Should also have Bagan Datuk office |
| Chan Foong Hin (P172) | Deputy Minister | Ministry of Plantations | Should also have Kota Kinabalu office |
| Zaliha Mustafa (P141) | Minister | Putrajaya Federal Territories | Should also have Sekijang office |
| Ewon Benedick (P174) | Minister | Ministry of Entrepreneur Dev | Should also have Penampang office |
| Siti Mastura Mohamad (P041) | Deputy Minister | Ministry of Human Resources | Should also have Kepala Batas office |

**Action:** Store BOTH ministry office + constituency office as per your requirement.

---

### 🟢 NEEDS MANUAL VERIFICATION (19 records)

These have **emails that partially match** (contain part of the MP's name) but **addresses in wrong states/constituencies**. Need spot-checking:

- Sh Mohmed Puzi Sh Ali (P085) - Email OK, address in Selangor instead of Pahang
- Adnan Abu Hassan (P129) - Email OK, address in Kelantan instead of Negeri Sembilan
- Khaled Nordin (P156) - Email OK, address in Perak instead of Johor
- Abdul Hadi Awang (P037) - Email OK, address in KL instead of Terengganu
- *+ 15 more* (see CSV for full list)

**Why flagged:** Could be secondary office addresses, or data entry errors. Requires manual verification.

---

## Recommended Next Steps

### Phase 1: Spot-Check the Data (Requires Your Manual Verification)

Before I execute ANY database updates, **I need you to manually verify** at least 3-5 records by visiting `https://www.parlimen.gov.my`:

**Suggested spot-check records:**
1. **Mohamad Hasan (P131)** - Should definitely be corrected
2. **Ngeh Koo Ham (P068)** - Email clearly wrong
3. **Hannah Yeoh (P117)** - Need confirmation on storing both addresses
4. One from the MEDIUM category to confirm pattern

**Instructions:**
1. Visit https://www.parlimen.gov.my/ahli-detail.html?name=P131
2. Look for their official contact info
3. Confirm the CORRECT email and address
4. Reply with 2-3 findings so I can confirm the pattern is correct

### Phase 2: Automatic Updates (Pending Your Approval)

Once you approve the pattern, I will:
1. Create a SQL UPDATE script for each category
2. Show you the script before executing it
3. Execute updates and verify they worked
4. Test the API response to confirm data is correct

### Phase 3: Fix the Scraper (Prevent Future Mismatches)
1. Improve the `findMatchingMp()` function to use parliament code instead of fuzzy name matching
2. Add validation: confirm email's parliament code matches the MP's code
3. Add validation: confirm address state matches MP's state

---

## What I CANNOT Do Without Your Approval

- ❌ Update any database records
- ❌ Delete or overwrite existing data
- ❌ Make assumptions about correct values without verification
- ❌ Proceed to Priority 1 until you've verified Priority 0 data

---

## CSV File Format

The **`PRIORITY_0_CONTACT_COMPARISON.csv`** contains:

| Column | Meaning |
|--------|---------|
| Priority | Urgency order (1-17 = needs correction, blank = review manually) |
| MP Name | Full name |
| Parliament Code | P### code |
| Constituency | Assigned constituency |
| State | MP's state |
| Current Email | What's in the database now |
| Current Address | What's in the database now (truncated) |
| Email Belongs to MP? | YES/NO/UNCLEAR based on name analysis |
| Address Belongs to MP? | YES/NO/MINISTRY_OFFICE based on state analysis |
| Confidence | HIGH/MEDIUM/LOW |
| Recommendation | Action to take |
| Diagnosis/Reasons | Specific reasons why it flagged as wrong |

---

## Summary by State (Where Addresses Are Mislocated)

The mismatched addresses tend to cluster in Kuala Lumpur and Putrajaya:
- **Kuala Lumpur:** 12 records (likely shared office, generic addresses)
- **Putrajaya:** 6 records (ministry offices)
- **Perak:** 7 records (possibly someone else's office)
- **Other states:** Scattered

This suggests **centralized data source corruption** rather than random errors.

---

## ⏸️ NEXT ACTION REQUIRED FROM YOU

**Please confirm:**

1. **Spot-check at least 3 records** manually on parliament.gov.my and report findings
   - Especially: Mohamad Hasan (P131), Ngeh Koo Ham (P068), Hannah Yeoh (P117)
   - What are their ACTUAL emails and addresses?

2. **Confirm handling for ministers:**
   - For Hannah Yeoh, Ahmad Zahid, etc. - should I:
     - A) Store BOTH ministry office + local constituency office?
     - B) Replace ministry with constituency only?
     - C) Keep ministry as primary, add new `constituencyAddress` field?

3. **Review CSV** and flag any records that look incorrect in my analysis

4. **Approve proceeding** with automated fixes once verification is complete

Once I hear back from you, I'll immediately:
- Create the UPDATE SQL script
- Show it to you for final approval
- Execute it
- Re-test `/api/mps` to confirm data is fixed
- Proceed to **Priority 1 (API Performance Fix)** which is straightforward

---

**Files generated:**
- ✅ `PRIORITY_0_CONTACT_COMPARISON.csv` - Full diagnostic data
- ✅ `PRIORITY_0_CONTACT_DATA_AUDIT.md` - Root cause analysis
- ✅ This report

**Awaiting your spot-check verification before proceeding!**
