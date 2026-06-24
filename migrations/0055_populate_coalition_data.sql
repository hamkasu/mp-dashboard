-- Phase 4: Populate Coalition Data
-- Maps all MPs to their political coalitions based on party affiliation

-- First, verify coalitions exist
SELECT name, code FROM coalitions ORDER BY name;

-- Step 1: Assign BN (Barisan Nasional) coalition
UPDATE mps
SET coalition_id = (SELECT id FROM coalitions WHERE code = 'BN')
WHERE party IN ('UMNO', 'MCA', 'MIC', 'PBB', 'SUPP', 'PBS', 'UPKO', 'LDP', 'Barisan Nasional');

-- Step 2: Assign PH (Pakatan Harapan) coalition
UPDATE mps
SET coalition_id = (SELECT id FROM coalitions WHERE code = 'PH')
WHERE party IN ('PKR', 'DAP', 'AMANAH', 'BERSATU', 'Pakatan Harapan');

-- Step 3: Assign GPS (Gabungan Parti Sarawak) coalition
UPDATE mps
SET coalition_id = (SELECT id FROM coalitions WHERE code = 'GPS')
WHERE party IN ('GPS', 'PDS', 'Gabungan Parti Sarawak');

-- Step 4: Assign PN (Perikatan Nasional) coalition
UPDATE mps
SET coalition_id = (SELECT id FROM coalitions WHERE code = 'PN')
WHERE party IN ('PAS', 'BERSATU-PN', 'Perikatan Nasional');

-- Step 5: Assign IND (Independent) for non-coalition parties
UPDATE mps
SET coalition_id = (SELECT id FROM coalitions WHERE code = 'IND')
WHERE coalition_id IS NULL AND party NOT IN ('UMNO', 'MCA', 'MIC', 'PBB', 'SUPP', 'PBS', 'UPKO', 'LDP',
                                              'PKR', 'DAP', 'AMANAH', 'BERSATU', 'GPS', 'PDS', 'PAS');

-- Step 6: Verify the results
SELECT
    c.code,
    c.name,
    COUNT(m.id) as mp_count,
    STRING_AGG(DISTINCT m.party, ', ' ORDER BY m.party) as parties
FROM coalitions c
LEFT JOIN mps m ON c.id = m.coalition_id
GROUP BY c.id, c.code, c.name
ORDER BY mp_count DESC;

-- Step 7: Check for any unassigned MPs
SELECT id, name, party, coalition_id
FROM mps
WHERE coalition_id IS NULL
ORDER BY party;

-- Step 8: Show distribution by party
SELECT
    party,
    COALESCE(c.code, 'UNASSIGNED') as coalition,
    COUNT(*) as mp_count
FROM mps m
LEFT JOIN coalitions c ON m.coalition_id = c.id
GROUP BY party, coalition
ORDER BY mp_count DESC, party;
