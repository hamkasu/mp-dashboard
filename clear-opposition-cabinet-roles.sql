-- Clear cabinet roles from opposition party MPs
-- Opposition parties (PN, MUDA, WARISAN, BEBAS) cannot hold Unity Government cabinet positions

-- First, let's see which opposition MPs currently have cabinet roles
SELECT
  name,
  party,
  role
FROM mps
WHERE party IN ('PN', 'MUDA', 'WARISAN', 'BEBAS')
  AND role IS NOT NULL
  AND (role LIKE '%Minister%' OR role LIKE '%Prime Minister%');

-- Now clear those incorrect cabinet roles
UPDATE mps
SET role = NULL
WHERE party IN ('PN', 'MUDA', 'WARISAN', 'BEBAS')
  AND role IS NOT NULL
  AND (role LIKE '%Minister%' OR role LIKE '%Prime Minister%');

-- Verify the cleanup
SELECT
  COUNT(*) as opposition_mps_with_cabinet_roles
FROM mps
WHERE party IN ('PN', 'MUDA', 'WARISAN', 'BEBAS')
  AND role IS NOT NULL
  AND (role LIKE '%Minister%' OR role LIKE '%Prime Minister%');
-- Should return 0
