-- =========================================
-- DUN Data Storage SQL Setup Script
-- For all Malaysian State Legislative Assemblies
-- =========================================

-- Table 1: Generic DUN Members (for all 13 states)
-- This is the main comprehensive table
CREATE TABLE IF NOT EXISTS dun_members (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    state TEXT NOT NULL,
    constituency_code TEXT NOT NULL,
    constituency_name TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT,
    party TEXT,
    photo_url TEXT,
    detail_url TEXT,

    -- Salary and allowances (RM per month unless specified)
    base_salary INTEGER DEFAULT 11130,
    service_allowance INTEGER DEFAULT 3870,
    constituency_allowance INTEGER DEFAULT 10500,
    sitting_allowance INTEGER DEFAULT 450, -- per day
    travel_allowance INTEGER DEFAULT 2000,
    entertainment_allowance INTEGER DEFAULT 1500,
    housing_allowance INTEGER DEFAULT 3000,
    total_monthly_allowance INTEGER DEFAULT 40000,

    -- Poverty and economic data from DOSM Kawasanku
    poverty_rate INTEGER, -- percentage * 10 (e.g. 125 = 12.5%)
    household_income INTEGER, -- median household income in RM
    gini_coefficient INTEGER, -- * 1000 (e.g. 350 = 0.350)
    unemployment_rate INTEGER, -- percentage * 10
    population INTEGER,

    scraped_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table 2: Sarawak-specific DUN Members (legacy/simplified)
CREATE TABLE IF NOT EXISTS sarawak_dun_members (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    constituency TEXT NOT NULL,
    constituency_number TEXT NOT NULL,
    party TEXT NOT NULL,
    photo_url TEXT,
    profile_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dun_members_state ON dun_members(state);
CREATE INDEX IF NOT EXISTS idx_dun_members_constituency_code ON dun_members(constituency_code);
CREATE INDEX IF NOT EXISTS idx_dun_members_party ON dun_members(party);
CREATE INDEX IF NOT EXISTS idx_dun_members_name ON dun_members(name);
CREATE INDEX IF NOT EXISTS idx_sarawak_dun_members_constituency ON sarawak_dun_members(constituency);
CREATE INDEX IF NOT EXISTS idx_sarawak_dun_members_party ON sarawak_dun_members(party);

-- =========================================
-- Sample INSERT Statements
-- =========================================

-- Example 1: Insert Sarawak DUN member (comprehensive table)
INSERT INTO dun_members (
    state,
    constituency_code,
    constituency_name,
    name,
    title,
    party,
    photo_url,
    detail_url,
    base_salary,
    service_allowance,
    constituency_allowance,
    sitting_allowance,
    travel_allowance,
    entertainment_allowance,
    housing_allowance,
    total_monthly_allowance,
    poverty_rate,
    household_income,
    gini_coefficient,
    unemployment_rate,
    population
) VALUES (
    'Sarawak',
    'N01',
    'Opar',
    'Ranum Mina',
    'YB',
    'GPS',
    'https://example.com/photo.jpg',
    'https://dun.sarawak.gov.my/member/n01',
    11130,  -- base salary
    3870,   -- service allowance
    10500,  -- constituency allowance
    450,    -- sitting allowance per day
    2000,   -- travel allowance
    1500,   -- entertainment allowance
    3000,   -- housing allowance
    40000,  -- total monthly allowance
    125,    -- 12.5% poverty rate
    4500,   -- RM 4,500 median household income
    350,    -- 0.350 Gini coefficient
    45,     -- 4.5% unemployment rate
    15000   -- population
) ON CONFLICT (id) DO NOTHING;

-- Example 2: Insert Johor DUN member
INSERT INTO dun_members (
    state,
    constituency_code,
    constituency_name,
    name,
    title,
    party,
    base_salary,
    service_allowance,
    constituency_allowance,
    sitting_allowance,
    total_monthly_allowance
) VALUES (
    'Johor',
    'N01',
    'Buloh Kasap',
    'Mohd Jafni Md Shukor',
    'YB',
    'UMNO',
    9000,   -- base salary (adjust per state)
    3000,   -- service allowance
    8000,   -- constituency allowance
    400,    -- sitting allowance
    30000   -- total monthly allowance
) ON CONFLICT (id) DO NOTHING;

-- Example 3: Insert Selangor DUN member
INSERT INTO dun_members (
    state,
    constituency_code,
    constituency_name,
    name,
    title,
    party,
    base_salary,
    service_allowance,
    constituency_allowance,
    sitting_allowance,
    total_monthly_allowance,
    population
) VALUES (
    'Selangor',
    'N01',
    'Sungai Kandis',
    'Mohd Zawawi Ahmad Mughni',
    'YB',
    'PKR',
    10000,  -- base salary
    3500,   -- service allowance
    9000,   -- constituency allowance
    450,    -- sitting allowance
    35000,  -- total monthly allowance
    45000   -- population
) ON CONFLICT (id) DO NOTHING;

-- Example 4: Insert Sarawak DUN member (simplified table)
INSERT INTO sarawak_dun_members (
    name,
    constituency,
    constituency_number,
    party,
    photo_url,
    profile_url
) VALUES (
    'Ranum Mina',
    'Opar',
    'N01',
    'GPS',
    'https://example.com/photo.jpg',
    'https://dun.sarawak.gov.my/member/n01'
) ON CONFLICT (id) DO NOTHING;

-- =========================================
-- Bulk Insert Template
-- =========================================

-- Use this template for bulk inserts from scraped data
-- Replace the VALUES with your actual data

/*
INSERT INTO dun_members (
    state, constituency_code, constituency_name, name, party,
    base_salary, service_allowance, constituency_allowance,
    sitting_allowance, total_monthly_allowance
) VALUES
    ('Sarawak', 'N01', 'Opar', 'Ranum Mina', 'GPS', 11130, 3870, 10500, 450, 40000),
    ('Sarawak', 'N02', 'Tasik Biru', 'Peter Nansian Ngusie', 'GPS', 11130, 3870, 10500, 450, 40000),
    ('Sarawak', 'N03', 'Tanjong Datu', 'Datuk Amar Dennis Ngau', 'GPS', 11130, 3870, 10500, 450, 40000),
    -- Add more rows as needed
ON CONFLICT (id) DO NOTHING;
*/

-- =========================================
-- Update Queries for Poverty Data
-- =========================================

-- Update poverty data for a specific constituency
UPDATE dun_members
SET
    poverty_rate = 125,           -- 12.5%
    household_income = 4500,       -- RM 4,500
    gini_coefficient = 350,        -- 0.350
    unemployment_rate = 45,        -- 4.5%
    population = 15000,
    updated_at = NOW()
WHERE state = 'Sarawak' AND constituency_code = 'N01';

-- =========================================
-- Query Examples
-- =========================================

-- Get all DUN members for a specific state
SELECT * FROM dun_members WHERE state = 'Sarawak' ORDER BY constituency_code;

-- Get DUN members with poverty data
SELECT
    state,
    constituency_name,
    name,
    party,
    poverty_rate::float / 10 as poverty_percentage,
    household_income,
    gini_coefficient::float / 1000 as gini,
    population
FROM dun_members
WHERE poverty_rate IS NOT NULL
ORDER BY poverty_rate DESC;

-- Calculate total monthly cost per state
SELECT
    state,
    COUNT(*) as total_members,
    SUM(total_monthly_allowance) as total_monthly_cost,
    AVG(total_monthly_allowance) as avg_monthly_allowance
FROM dun_members
GROUP BY state
ORDER BY total_monthly_cost DESC;

-- Get DUN members by party
SELECT
    party,
    COUNT(*) as member_count,
    string_agg(DISTINCT state, ', ') as states
FROM dun_members
GROUP BY party
ORDER BY member_count DESC;

-- Find constituencies with highest poverty rates
SELECT
    state,
    constituency_name,
    name,
    party,
    poverty_rate::float / 10 as poverty_percentage,
    household_income,
    population
FROM dun_members
WHERE poverty_rate IS NOT NULL
ORDER BY poverty_rate DESC
LIMIT 20;

-- =========================================
-- State-specific Salary Defaults
-- =========================================

/*
State salary reference (approximate, verify with official sources):

SARAWAK:
- Base Salary: RM 11,130
- Service Allowance: RM 3,870
- Constituency Allowance: RM 6,000 - RM 15,000 (avg RM 10,500)
- Sitting Allowance: RM 450/day (from Nov 2024)
- Total: RM 25,000 - RM 40,000

SELANGOR:
- Base Salary: ~RM 10,000
- Allowances: ~RM 25,000 - RM 35,000 total

JOHOR:
- Base Salary: ~RM 9,000
- Allowances: ~RM 25,000 - RM 30,000 total

PENANG:
- Base Salary: ~RM 9,500
- Allowances: ~RM 25,000 - RM 32,000 total

NOTE: Update these values based on official state government gazettes
*/

-- =========================================
-- Data Validation Queries
-- =========================================

-- Check for duplicate constituency codes within a state
SELECT state, constituency_code, COUNT(*) as count
FROM dun_members
GROUP BY state, constituency_code
HAVING COUNT(*) > 1;

-- Check for members without basic info
SELECT id, state, constituency_code, name
FROM dun_members
WHERE name IS NULL OR constituency_code IS NULL OR state IS NULL;

-- Check data completeness
SELECT
    state,
    COUNT(*) as total,
    COUNT(poverty_rate) as with_poverty_data,
    COUNT(household_income) as with_income_data,
    COUNT(photo_url) as with_photo,
    COUNT(party) as with_party
FROM dun_members
GROUP BY state;
