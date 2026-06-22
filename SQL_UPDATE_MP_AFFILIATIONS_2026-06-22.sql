-- ================================================================
-- MP Affiliation Updates - Generated 2026-06-22
-- Applies party and coalition changes
-- ================================================================

BEGIN;

-- ================================================================
-- 1. PARTY SACKINGS - Bersatu MPs became Independent
-- ================================================================

-- P147 | Larut
UPDATE mps
SET party = 'Independent', coalition = 'IND'
WHERE parliament_code = 'P147'
  AND name ILIKE '%Hamzah%';

INSERT INTO party_history
  (mp_id, old_party, old_coalition, new_party, new_coalition, change_date, change_type, notes)
SELECT id, 'Bersatu', 'PN', 'Independent', 'IND', '2026-02-13'::timestamp, 'sacking', 'Bersatu mass sacking - 13 Feb 2026'
FROM mps WHERE parliament_code = 'P147';

-- P172 | Machang
UPDATE mps
SET party = 'Independent', coalition = 'IND'
WHERE parliament_code = 'P172'
  AND name ILIKE '%Wan%';

INSERT INTO party_history
  (mp_id, old_party, old_coalition, new_party, new_coalition, change_date, change_type, notes)
SELECT id, 'Bersatu', 'PN', 'Independent', 'IND', '2026-02-13'::timestamp, 'sacking', 'Bersatu mass sacking - 13 Feb 2026'
FROM mps WHERE parliament_code = 'P172';

-- P156 | Padang Rengas
UPDATE mps
SET party = 'Independent', coalition = 'IND'
WHERE parliament_code = 'P156'
  AND name ILIKE '%Azahari%';

INSERT INTO party_history
  (mp_id, old_party, old_coalition, new_party, new_coalition, change_date, change_type, notes)
SELECT id, 'Bersatu', 'PN', 'Independent', 'IND', '2026-02-13'::timestamp, 'sacking', 'Bersatu mass sacking - 13 Feb 2026'
FROM mps WHERE parliament_code = 'P156';

-- P169 | Gerik
UPDATE mps
SET party = 'Independent', coalition = 'IND'
WHERE parliament_code = 'P169'
  AND name ILIKE '%Fathul%';

INSERT INTO party_history
  (mp_id, old_party, old_coalition, new_party, new_coalition, change_date, change_type, notes)
SELECT id, 'Bersatu', 'PN', 'Independent', 'IND', '2026-02-13'::timestamp, 'sacking', 'Bersatu mass sacking - 13 Feb 2026'
FROM mps WHERE parliament_code = 'P169';

-- P127 | Indera Mahkota
UPDATE mps
SET party = 'Independent', coalition = 'IND'
WHERE parliament_code = 'P127'
  AND name ILIKE '%Saifuddin%';

INSERT INTO party_history
  (mp_id, old_party, old_coalition, new_party, new_coalition, change_date, change_type, notes)
SELECT id, 'Bersatu', 'PN', 'Independent', 'IND', '2026-01-06'::timestamp, 'sacking', 'Sacked from Bersatu - ~6 Jan 2026'
FROM mps WHERE parliament_code = 'P127';

-- ================================================================
-- 2. COALITION EXITS
-- ================================================================

-- P209 | Tuaran
UPDATE mps
SET coalition = 'UPKO'
WHERE parliament_code = 'P209'
  AND name ILIKE '%Wilfred%';

INSERT INTO party_history
  (mp_id, old_party, old_coalition, new_party, new_coalition, change_date, change_type, notes)
SELECT id, 'UPKO', 'PH', 'UPKO', 'UPKO', '2025-11-01'::timestamp, 'coalition_exit', 'UPKO formally exited PH - Nov 2025'
FROM mps WHERE parliament_code = 'P209';

-- P210 | Penampang
UPDATE mps
SET coalition = 'UPKO'
WHERE parliament_code = 'P210'
  AND name ILIKE '%Ewon%';

INSERT INTO party_history
  (mp_id, old_party, old_coalition, new_party, new_coalition, change_date, change_type, notes)
SELECT id, 'UPKO', 'PH', 'UPKO', 'UPKO', '2025-11-01'::timestamp, 'coalition_exit', 'UPKO formally exited PH - Nov 2025'
FROM mps WHERE parliament_code = 'P210';

-- P197 | Keningau
UPDATE mps
SET coalition = 'STAR'
WHERE parliament_code = 'P197'
  AND name ILIKE '%Jeffrey%';

INSERT INTO party_history
  (mp_id, old_party, old_coalition, new_party, new_coalition, change_date, change_type, notes)
SELECT id, 'STAR', 'GRS', 'STAR', 'STAR', '2025-10-01'::timestamp, 'coalition_exit', 'STAR formally exited GRS - Oct 2025'
FROM mps WHERE parliament_code = 'P197';

-- ================================================================
-- 3. BY-ELECTION SEAT CHANGES
-- ================================================================

-- P199 | Kinabatangan
-- Old MP: Bung Moktar Radin -> New MP: Mohammad Naim Kurniawan Moktar
UPDATE mps
SET name = 'Mohammad Naim Kurniawan Moktar', party = 'UMNO', coalition = 'BN',
    by_election_date = '2026-01-01'::timestamp,
    by_election_notes = 'By-election seat change - Jan 2026 (Bung Moktar died)'
WHERE parliament_code = 'P199';

INSERT INTO party_history
  (mp_id, old_party, new_party, new_coalition, change_date, change_type, notes)
SELECT id, NULL, 'UMNO', 'BN', '2026-01-01'::timestamp, 'by_election', 'By-election seat change - Jan 2026 (Bung Moktar died) (Previous: Bung Moktar Radin)'
FROM mps WHERE parliament_code = 'P199';


COMMIT;
