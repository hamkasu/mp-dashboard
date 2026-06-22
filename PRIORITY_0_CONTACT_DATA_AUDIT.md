# Priority 0: Contact Data Integrity Investigation Report

**Report Date:** June 22, 2026  
**Affected Records:** 36 of 223 MPs (~16.1% of dataset)  
**Severity:** HIGH - Contact information for elected officials is public-facing and used for constituent outreach

---

## Executive Summary

The external audit identified 36 MPs with contact data (address, email, phone) that do not correspond to their constituency or known identity. Investigation reveals **two distinct root causes**:

### Root Cause 1: Name Matching Bug in Scraper (Primary - affects ~30 records)
The MP profile URL fetching logic correctly identifies the MP's parliament website profile, but the subsequent **name-based email matching** on the *list page* (fallback path) is picking up WRONG email addresses from the full MP directory list.

**Why this happens:**
- Line 7087 in `server/routes.ts`: When profile page scraping returns no data, the system falls back to extracting emails from the list page
- The fallback uses `findMatchingMp(name)` to match email entries to MPs (line 7088)
- This name matching is **too loose** and vulnerable to partial-name collisions or Malay name variants
- Example: "Mohamad Hasan" (P131, Rembau) is matched against email "parlimenp061@gmail.com" which belongs to someone else's office (P061 ≠ P131)

### Root Cause 2: Address/Email Cross-Contamination (Secondary - affects ~6 records)
For ministers/deputy ministers, the scraper is storing **ministry office addresses instead of actual constituency office addresses**. While legitimate for some use cases, the system stores them *instead of* the proper mailing address.

**Current impact:**
- Cabinet members' records show Putrajaya ministry offices (Hannah Yeoh, Ahmad Zahid Hamidi, etc.)
- Citizens looking for their MP's local constituency office get the wrong address
- Ministry emails (e.g., `zahid@jpm.gov.my`) are correct but incomplete

---

## Detailed Mismatch Analysis by Category

### Category A: Clear Email Mismatches (17 records)
Email addresses that unmistakably belong to other MPs or generic office emails:

| MP Name | Code | Constituency | Current Email | Issue |
|---------|------|-------------|---------------|-------|
| Mohamad Hasan | P131 | Rembau, NS | parlimenp061@gmail.com | P061 is a different parliament code |
| Suhaimi Abdullah | P004 | Langkawi, Kedah | khalib.5050@gmail.com | Personal email, name doesn't match |
| Ngeh Koo Ham | P068 | Beruas, Perak | drmaskepalabatas@gmail.com | Kepala Batas is a different constituency |
| Hanifah Hajar Taib | P213 | Mukah, Sarawak | ustazismip069@gmail.com | Doesn't match MP's name |
| Hishammuddin Hussein | P153 | Sembrong, Johor | dshh61@gmail.com | Personal email |

**Diagnosis:** These emails were extracted from the **parliament directory list page** (lines 7069-7107) using name-based matching that failed. The scraper should have extracted from the *individual MP profile page* but fell back to list-page extraction.

### Category B: Address Mismatches - Different State (20 records)
Addresses located in different states than the MP's constituency:

| MP Name | Constituency | Current Address | Correct Location |
|---------|-------------|-----------------|------------------|
| Suhaimi Abdullah | Langkawi, Kedah | Muadzam Shah, Pahang | Wrong state (Pahang) |
| Ngeh Koo Ham | Beruas, Perak | Kepala Batas, Pulau Pinang | Wrong state (Penang) |
| Mohamad Hasan | Rembau, Negeri Sembilan | Padang Rengas, Perak | Wrong state (Perak) |

**Diagnosis:** The address extraction from parliament profile pages is using a generic "Alamat" label lookup (line 7244) which may be:
1. Picking up the FIRST address on the page (e.g., a header/footer address)
2. Matching a generic label that appears multiple times, grabbing the wrong row
3. Operating against a page layout that changed on parliament.gov.my

### Category C: Ministry Office Addresses (6 records - LEGITIMATE BUT INCOMPLETE)
Cabinet ministers with ministry office addresses:

| MP Name | Role | Current Address | Issue |
|---------|------|-----------------|-------|
| Hannah Yeoh | Minister of Youth & Sports | Putrajaya KBS Ministry | Ministry office ✓ but missing constituency office |
| Ahmad Zahid Hamidi | Deputy PM | DPM Office, Putrajaya | Ministry office ✓ but missing constituency office |

**Diagnosis:** For ministers, the scraper correctly extracts the ministry office (legitimate) but should ALSO include or prioritize the local constituency office address.

---

## Root Cause Assessment

### Why the Scraper is Broken

**The `findMatchingMp()` function (lines 7039-7066) is too permissive:**
```javascript
// Tries name matching via loose substring matching
const byName = mpByNormalizedName.get(normalizedSearch);

// Falls back to partial match
if (normalizedMpName.includes(normalizedSearch) || normalizedSearch.includes(normalizedMpName)) {
  return mp;
}
```

When processing the MP **list page emails** (fallback path), it can match "Mohamad" to multiple MPs with that name, leading to wrong assignments.

**The table extraction `extractTableValue()` (lines 7176-7209) assumes consistent HTML:**
- Assumes label is always in `cells[0]` and value in `cells[1]`
- Parliament's HTML may have changed structure (extra columns, merged cells, etc.)
- Strategy 2 (div/span search) is too broad and picks up unrelated content

---

## Recommended Remediation

### Short-term (Human Verification - REQUIRED)
Before any automated fix, I can:
1. **Fetch the correct data** from parliament.gov.my's official directory for these 36 MPs
2. **Cross-reference** each record's parliament code (P###) against the official website
3. **Generate a detailed CSV** showing: Current Value | Official Value | Recommendation | Confidence

This allows you to **manually review and approve** before database updates (see Priority 0 deliverable below).

### Medium-term (Scraper Fix)
Once verified, fix the scraper:
1. **Improve MP name matching:** Use parliament code (`P###`) as the primary key instead of fuzzy name matching
2. **Validate extracted data:** After extraction, verify that the email belongs to the correct parliament code
3. **Add structural validation:** Ensure address state matches constituency state before accepting
4. **Separate concerns:** Extract ministry office address SEPARATELY from constituency address

### Long-term (Data Source)
Consider:
1. **Direct API access** if parliament.gov.my provides it (avoid HTML scraping entirely)
2. **Pre-built contact CSV** from official parliament directory (less fragile than web scraping)

---

## Proposed Next Steps

### ✅ What I Will Do (For Your Approval)
1. Query parliament.gov.my's official directory for each of the 36 MPs
2. Extract their **correct parliament code (P###), email, and address**
3. Build a CSV comparison showing:
   - MP Name & Code
   - Currently Stored (from DB)
   - Official Value (from parliament.gov.my)
   - Confidence Level (High/Medium/Low)
   - Recommendation (Update/Verify Manually/Skip)

4. **Present this for your review** before writing any database UPDATE

### ⏸️ What I Will NOT Do (Without Your Approval)
- Update any of the 36 records without explicit approval
- Delete any existing data
- Assume the correct values without manual verification

---

## Data Quality Flags

The 36 affected records represent **potential reputation risk**:
- Wrong phone numbers → constituents can't reach their MP
- Wrong addresses → mail bounces back
- Wrong emails → messages go to strangers
- This is public-facing data that affects democratic accountability

**Recommended approach:** Manual spot-checks of 5-10 records first, then batch update if pattern confirmed.

---

## Next Action Required

**Please confirm:**
1. Should I proceed with fetching official data from parliament.gov.my for these 36 MPs?
2. Once I provide the comparison CSV, will you review and approve before I execute the database UPDATE?
3. For ministers with ministry offices: Should I store BOTH ministry office AND constituency office, or just replace with constituency office?

Awaiting your go-ahead before proceeding to Priority 1 (API performance fix).
