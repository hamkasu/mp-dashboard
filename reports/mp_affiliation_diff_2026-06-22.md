# MP Affiliation Diff Report

**Generated:** 2026-06-22T12:42:55.285Z
**As of Date:** 2026-06-22
**Source:** parlimen.gov.my (documented changes)

## Executive Summary

| Category | Count |
|----------|-------|
| Party/Status Changes (Sackings to Independent) | 5 |
| Coalition Exits | 3 |
| By-Election Seat Changes | 1 |
| **Total Changes** | **9** |

## Detailed Changes

### Party Sackings / Status Changes to Independent

| Code | Constituency | MP Name | Old Party | New Party | Date | Notes |
|------|--------------|---------|-----------|-----------|------|-------|
| P147 | Larut | Hamzah Zainudin | Bersatu | Independent | 2026-02-13 | Bersatu mass sacking - 13 Feb 2026 |
| P172 | Machang | Wan Ahmad Fayhsal | Bersatu | Independent | 2026-02-13 | Bersatu mass sacking - 13 Feb 2026 |
| P156 | Padang Rengas | Azahari Hasan | Bersatu | Independent | 2026-02-13 | Bersatu mass sacking - 13 Feb 2026 |
| P169 | Gerik | Fathul Huzir Ayob | Bersatu | Independent | 2026-02-13 | Bersatu mass sacking - 13 Feb 2026 |
| P127 | Indera Mahkota | Saifuddin Abdullah | Bersatu | Independent | 2026-01-06 | Sacked from Bersatu - ~6 Jan 2026 |

### Coalition Exits (Party Remains Same)

| Code | Constituency | MP Name | Party | Old Coalition | New Coalition | Date | Notes |
|------|--------------|---------|-------|---------------|---------------|------|-------|
| P209 | Tuaran | Wilfred Madius Tangau | UPKO | PH | UPKO | 2025-11-01 | UPKO formally exited PH - Nov 2025 |
| P210 | Penampang | Ewon Benedick | UPKO | PH | UPKO | 2025-11-01 | UPKO formally exited PH - Nov 2025 |
| P197 | Keningau | Jeffrey Kitingan | STAR | GRS | STAR | 2025-10-01 | STAR formally exited GRS - Oct 2025 |

### By-Election Seat Changes (Person & Party Changes)

| Code | Constituency | Old MP | New MP | New Party | Date | Notes |
|------|--------------|--------|--------|-----------|------|-------|
| P199 | Kinabatangan | Bung Moktar Radin | Mohammad Naim Kurniawan Moktar | UMNO | 2026-01-01 | By-election seat change - Jan 2026 (Bung Moktar died) |

## Next Steps

1. ✅ **Review the changes above** - Verify each entry is correct
2. 📝 **Run the update script** when ready: `npm run apply-mp-affiliation-changes`
3. 🔄 **Database updates** will:
   - Update MP party and coalition fields
   - Create party_history records
   - Update all related aggregates
4. ✨ **Deploy** and verify changes on the live site

## Notes

- All changes are based on official sources documented in task
- Timestamp indicates when reference data was generated
- Contact user if any entries require clarification
