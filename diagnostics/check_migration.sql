-- Quick diagnostic to check if Phase 4 migration has been applied

-- Check if coalitions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'coalitions'
) as coalitions_table_exists;

-- Check if coalition_id column exists in mps
SELECT EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_name = 'mps' AND column_name = 'coalition_id'
) as coalition_id_column_exists;

-- Count MPs
SELECT COUNT(*) as mp_count FROM mps;

-- Sample 5 MPs
SELECT id, name, party, coalition_id FROM mps LIMIT 5;

-- Check for any errors or foreign key issues
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'mps' AND column_name = 'coalition_id';
