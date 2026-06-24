-- ============================================
-- MA63 Dashboard - PostgreSQL Database Setup
-- Malaysia Agreement 1963 Implementation Tracker
-- ============================================
-- Copyright by Calmic Sdn Bhd
-- Run these queries in PostgreSQL to set up and manage MA63 data
-- ============================================

-- ============================================
-- PART 1: TABLE CREATION (DDL)
-- ============================================

-- Drop existing tables if recreating (comment out in production)
-- DROP TABLE IF EXISTS ma63_watchlist_items CASCADE;
-- DROP TABLE IF EXISTS ma63_timeline_events CASCADE;
-- DROP TABLE IF EXISTS ma63_issues CASCADE;
-- DROP TABLE IF EXISTS ma63_categories CASCADE;
-- DROP TABLE IF EXISTS ma63_summary CASCADE;

-- 1. MA63 Summary Statistics Table
CREATE TABLE IF NOT EXISTS ma63_summary (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    total_issues INTEGER NOT NULL DEFAULT 0,
    resolved INTEGER NOT NULL DEFAULT 0,
    resolved_madani INTEGER NOT NULL DEFAULT 0,  -- Resolved under Madani government
    in_progress INTEGER NOT NULL DEFAULT 0,
    pending INTEGER NOT NULL DEFAULT 0,
    overall_progress INTEGER NOT NULL DEFAULT 0, -- Percentage (0-100)
    data_source TEXT,
    last_official_update DATE,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_ma63_summary_updated ON ma63_summary(updated_at DESC);

-- 2. MA63 Categories Table
CREATE TABLE IF NOT EXISTS ma63_categories (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., 'territorial', 'fiscal', 'autonomy'
    name_en TEXT NOT NULL,
    name_ms TEXT NOT NULL,
    icon VARCHAR(50),  -- Lucide icon name
    color VARCHAR(20),  -- Hex color code
    resolved INTEGER NOT NULL DEFAULT 0,
    in_progress INTEGER NOT NULL DEFAULT 0,
    pending INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ma63_categories_code ON ma63_categories(code);
CREATE INDEX IF NOT EXISTS idx_ma63_categories_order ON ma63_categories(display_order);

-- 3. MA63 Individual Issues Table
CREATE TABLE IF NOT EXISTS ma63_issues (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id VARCHAR(255) REFERENCES ma63_categories(id) ON DELETE CASCADE,
    title_en TEXT NOT NULL,
    title_ms TEXT NOT NULL,
    description_en TEXT,
    description_ms TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('resolved', 'in_progress', 'pending', 'blocked')),
    priority VARCHAR(20) DEFAULT 'medium'
        CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    resolved_date DATE,
    resolved_by TEXT,  -- Which government/administration resolved it
    related_documents JSONB DEFAULT '[]'::jsonb,  -- Array of document links
    key_stakeholders JSONB DEFAULT '[]'::jsonb,   -- Array of stakeholder names
    notes TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,  -- Show in watchlist
    last_update DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ma63_issues_category ON ma63_issues(category_id);
CREATE INDEX IF NOT EXISTS idx_ma63_issues_status ON ma63_issues(status);
CREATE INDEX IF NOT EXISTS idx_ma63_issues_priority ON ma63_issues(priority);
CREATE INDEX IF NOT EXISTS idx_ma63_issues_featured ON ma63_issues(is_featured) WHERE is_featured = TRUE;

-- 4. MA63 Timeline Events Table
CREATE TABLE IF NOT EXISTS ma63_timeline_events (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    event_date DATE NOT NULL,
    year INTEGER NOT NULL,
    month VARCHAR(20),
    event_en TEXT NOT NULL,
    event_ms TEXT NOT NULL,
    event_type VARCHAR(20) NOT NULL DEFAULT 'milestone'
        CHECK (event_type IN ('milestone', 'resolved', 'in_progress', 'upcoming', 'setback')),
    related_issue_id VARCHAR(255) REFERENCES ma63_issues(id) ON DELETE SET NULL,
    source_url TEXT,
    source_name TEXT,
    is_major BOOLEAN NOT NULL DEFAULT FALSE,  -- Major milestone
    display_order INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ma63_timeline_date ON ma63_timeline_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_ma63_timeline_year ON ma63_timeline_events(year DESC);
CREATE INDEX IF NOT EXISTS idx_ma63_timeline_type ON ma63_timeline_events(event_type);

-- 5. MA63 Priority Watchlist Items Table
CREATE TABLE IF NOT EXISTS ma63_watchlist_items (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id VARCHAR(255) REFERENCES ma63_issues(id) ON DELETE CASCADE,
    title_en TEXT NOT NULL,
    title_ms TEXT NOT NULL,
    description_en TEXT NOT NULL,
    description_ms TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('resolved', 'in_progress', 'pending', 'blocked')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    last_update_date DATE,
    last_update_note TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ma63_watchlist_priority ON ma63_watchlist_items(priority);
CREATE INDEX IF NOT EXISTS idx_ma63_watchlist_order ON ma63_watchlist_items(display_order);
CREATE INDEX IF NOT EXISTS idx_ma63_watchlist_active ON ma63_watchlist_items(is_active) WHERE is_active = TRUE;


-- ============================================
-- PART 2: INITIAL DATA INSERTION
-- ============================================

-- Insert Summary Statistics (January 2026 data)
INSERT INTO ma63_summary (
    total_issues, resolved, resolved_madani, in_progress, pending,
    overall_progress, data_source, last_official_update, notes
) VALUES (
    29, 13, 9, 14, 2,
    45, 'MA63 Technical Committee / BHESS JPM', '2025-03-01',
    'Data based on public government announcements. Official MA63 Dashboard launching January 28, 2026 via BHESS/JPM portal.'
) ON CONFLICT DO NOTHING;

-- Insert Categories
INSERT INTO ma63_categories (code, name_en, name_ms, icon, color, resolved, in_progress, pending, total, display_order) VALUES
('territorial', 'Territorial & Continental Shelf', 'Wilayah & Pelantar Benua', 'MapPin', '#0033A0', 1, 3, 1, 5, 1),
('fiscal', 'Fiscal & Revenue Sharing', 'Fiskal & Perkongsian Hasil', 'DollarSign', '#FFD100', 3, 4, 0, 7, 2),
('autonomy', 'Autonomy & Devolution', 'Autonomi & Devolusi', 'Shield', '#C8102E', 4, 3, 0, 7, 3),
('parliamentary', 'Parliamentary Representation', 'Perwakilan Parlimen', 'Landmark', '#00A86B', 2, 2, 1, 5, 4),
('immigration', 'Immigration Control', 'Kawalan Imigresen', 'Users', '#6B21A8', 2, 1, 0, 3, 5),
('others', 'Others', 'Lain-lain', 'FileText', '#64748B', 1, 1, 0, 2, 6)
ON CONFLICT (code) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    name_ms = EXCLUDED.name_ms,
    resolved = EXCLUDED.resolved,
    in_progress = EXCLUDED.in_progress,
    pending = EXCLUDED.pending,
    total = EXCLUDED.total,
    updated_at = NOW();

-- Insert Timeline Events
INSERT INTO ma63_timeline_events (event_date, year, month, event_en, event_ms, event_type, is_major) VALUES
('2018-05-09', 2018, 'May', 'Pakatan Harapan government pledges to review MA63 implementation', 'Kerajaan Pakatan Harapan berjanji untuk mengkaji semula pelaksanaan MA63', 'milestone', TRUE),
('2019-04-01', 2019, 'April', 'MA63 Special Cabinet Committee formed', 'Jawatankuasa Khas Kabinet MA63 ditubuhkan', 'milestone', TRUE),
('2019-12-01', 2019, 'December', 'Constitutional amendment (Art. 1(2)) passed - recognizes Sabah & Sarawak as equal partners', 'Pindaan Perlembagaan (Per. 1(2)) diluluskan - mengiktiraf Sabah & Sarawak sebagai rakan setara', 'resolved', TRUE),
('2021-02-01', 2021, 'February', 'Sarawak achieves 5.45% SST revenue share', 'Sarawak mencapai bahagian hasil SST 5.45%', 'resolved', FALSE),
('2022-11-24', 2022, 'November', 'Unity Government (Madani) formed with strong Sabah/Sarawak representation', 'Kerajaan Perpaduan (Madani) dibentuk dengan perwakilan kuat Sabah/Sarawak', 'milestone', TRUE),
('2023-07-01', 2023, 'July', 'Sabah, Sarawak granted public holiday for Malaysia Day (Sept 16)', 'Sabah, Sarawak diberikan cuti umum Hari Malaysia (16 Sept)', 'resolved', FALSE),
('2024-03-01', 2024, 'March', 'Petroleum Development Act review announced', 'Semakan Akta Pembangunan Petroleum diumumkan', 'in_progress', FALSE),
('2024-09-01', 2024, 'September', 'Special grants to Sabah & Sarawak increased to RM300M each', 'Pemberian khas kepada Sabah & Sarawak ditingkatkan ke RM300J setiap satu', 'resolved', TRUE),
('2025-03-01', 2025, 'March', 'MA63 Technical Committee reports 13 of 29 issues resolved', 'Jawatankuasa Teknikal MA63 melaporkan 13 daripada 29 isu diselesaikan', 'milestone', TRUE),
('2025-10-01', 2025, 'October', 'Sabah 40% revenue talks enter final stage negotiations', 'Rundingan hasil 40% Sabah memasuki peringkat akhir', 'in_progress', TRUE),
('2026-01-28', 2026, 'January', 'Official MA63 Dashboard launch scheduled (BHESS/JPM portal)', 'Pelancaran Dashboard MA63 rasmi dijadualkan (portal BHESS/JPM)', 'upcoming', TRUE)
ON CONFLICT DO NOTHING;

-- Insert Priority Watchlist Items
INSERT INTO ma63_watchlist_items (title_en, title_ms, description_en, description_ms, status, priority, last_update_date, display_order) VALUES
(
    'Sabah 40% Oil & Gas Revenue',
    'Hasil Minyak & Gas 40% Sabah',
    'Long-standing demand for Sabah to receive 40% of petroleum revenue from resources within its territory, as originally promised.',
    'Tuntutan lama untuk Sabah menerima 40% hasil petroleum dari sumber dalam wilayahnya, seperti yang dijanjikan asal.',
    'in_progress', 'critical', '2025-10-01', 1
),
(
    'Continental Shelf & Petroleum Rights',
    'Hak Pelantar Benua & Petroleum',
    'Clarification of jurisdiction over continental shelf resources and petroleum beyond territorial waters.',
    'Penjelasan bidang kuasa ke atas sumber pelantar benua dan petroleum di luar perairan wilayah.',
    'in_progress', 'high', '2025-09-01', 2
),
(
    'Parliamentary Seat Rebalancing',
    'Pengimbangan Semula Kerusi Parlimen',
    'Adjustment of parliamentary seats to ensure Sabah & Sarawak together hold at least 35% (originally 1/3) of total seats.',
    'Pelarasan kerusi parlimen untuk memastikan Sabah & Sarawak bersama-sama memegang sekurang-kurangnya 35% (asal 1/3) daripada jumlah kerusi.',
    'in_progress', 'high', '2025-08-01', 3
),
(
    'Native Customary Rights & Land',
    'Hak Adat & Tanah Natif',
    'Legal recognition and protection of native customary land rights (NCR) for indigenous communities.',
    'Pengiktirafan undang-undang dan perlindungan hak tanah adat (NCR) untuk komuniti orang asal.',
    'in_progress', 'medium', '2025-11-01', 4
),
(
    'Equal Partner Status Formalization',
    'Pemformalan Status Rakan Setara',
    'Complete constitutional formalization of Sabah and Sarawak as equal partners in the Federation, not just states.',
    'Pemformalan perlembagaan lengkap Sabah dan Sarawak sebagai rakan setara dalam Persekutuan, bukan sekadar negeri.',
    'pending', 'medium', '2025-07-01', 5
)
ON CONFLICT DO NOTHING;


-- ============================================
-- PART 3: UPDATE QUERIES (for manual updates)
-- ============================================

-- 3.1 UPDATE SUMMARY STATISTICS
-- Use this to update the main dashboard numbers
UPDATE ma63_summary SET
    total_issues = 29,
    resolved = 13,
    resolved_madani = 9,
    in_progress = 14,
    pending = 2,
    overall_progress = 45,
    last_official_update = '2025-03-01',
    notes = 'Updated based on latest MA63 Technical Committee report',
    updated_at = NOW()
WHERE id = (SELECT id FROM ma63_summary ORDER BY created_at DESC LIMIT 1);

-- 3.2 UPDATE A SPECIFIC CATEGORY
-- Example: Update fiscal category when an issue is resolved
UPDATE ma63_categories SET
    resolved = resolved + 1,
    in_progress = in_progress - 1,
    updated_at = NOW()
WHERE code = 'fiscal';

-- 3.3 MARK AN ISSUE AS RESOLVED
-- When a specific issue gets resolved
UPDATE ma63_issues SET
    status = 'resolved',
    resolved_date = CURRENT_DATE,
    resolved_by = 'Madani Government',
    notes = 'Resolved via cabinet decision on [date]',
    updated_at = NOW()
WHERE id = 'issue-uuid-here';

-- 3.4 UPDATE WATCHLIST ITEM STATUS
UPDATE ma63_watchlist_items SET
    status = 'resolved',
    last_update_date = CURRENT_DATE,
    last_update_note = 'Agreement reached on revenue sharing formula',
    updated_at = NOW()
WHERE title_en = 'Sabah 40% Oil & Gas Revenue';

-- 3.5 ADD NEW TIMELINE EVENT
INSERT INTO ma63_timeline_events (event_date, year, month, event_en, event_ms, event_type, is_major)
VALUES (
    '2026-01-28',
    2026,
    'January',
    'Official MA63 Dashboard launched by JPM',
    'Pelancaran rasmi Dashboard MA63 oleh JPM',
    'milestone',
    TRUE
);

-- 3.6 UPDATE PROGRESS PERCENTAGE
-- Recalculate overall progress based on resolved/total
UPDATE ma63_summary SET
    overall_progress = ROUND((resolved::DECIMAL / NULLIF(total_issues, 0)) * 100),
    updated_at = NOW()
WHERE id = (SELECT id FROM ma63_summary ORDER BY created_at DESC LIMIT 1);


-- ============================================
-- PART 4: USEFUL SELECT QUERIES
-- ============================================

-- 4.1 Get full dashboard summary
SELECT
    total_issues,
    resolved,
    resolved_madani,
    in_progress,
    pending,
    overall_progress,
    data_source,
    last_official_update,
    updated_at
FROM ma63_summary
ORDER BY created_at DESC
LIMIT 1;

-- 4.2 Get all categories with counts
SELECT
    code,
    name_en,
    name_ms,
    icon,
    color,
    resolved,
    in_progress,
    pending,
    total,
    ROUND((resolved::DECIMAL / NULLIF(total, 0)) * 100, 1) as progress_pct
FROM ma63_categories
WHERE is_active = TRUE
ORDER BY display_order;

-- 4.3 Get timeline events (most recent first)
SELECT
    event_date,
    year,
    month,
    event_en,
    event_ms,
    event_type,
    is_major
FROM ma63_timeline_events
ORDER BY event_date DESC;

-- 4.4 Get active watchlist items by priority
SELECT
    title_en,
    title_ms,
    description_en,
    status,
    priority,
    last_update_date,
    CASE priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END as priority_order
FROM ma63_watchlist_items
WHERE is_active = TRUE
ORDER BY priority_order, display_order;

-- 4.5 Get issues by category
SELECT
    c.name_en as category,
    i.title_en,
    i.status,
    i.priority,
    i.resolved_date
FROM ma63_issues i
JOIN ma63_categories c ON i.category_id = c.id
ORDER BY c.display_order, i.status, i.priority;

-- 4.6 Get summary statistics for reporting
SELECT
    'Total Issues' as metric, total_issues::TEXT as value FROM ma63_summary
UNION ALL
SELECT 'Resolved', resolved::TEXT FROM ma63_summary
UNION ALL
SELECT 'Resolved (Madani)', resolved_madani::TEXT FROM ma63_summary
UNION ALL
SELECT 'In Progress', in_progress::TEXT FROM ma63_summary
UNION ALL
SELECT 'Pending', pending::TEXT FROM ma63_summary
UNION ALL
SELECT 'Overall Progress', overall_progress || '%' FROM ma63_summary;


-- ============================================
-- PART 5: BATCH UPDATE EXAMPLES
-- ============================================

-- 5.1 Batch update all category totals based on issues
UPDATE ma63_categories c SET
    resolved = COALESCE(subq.resolved_count, 0),
    in_progress = COALESCE(subq.in_progress_count, 0),
    pending = COALESCE(subq.pending_count, 0),
    total = COALESCE(subq.total_count, 0),
    updated_at = NOW()
FROM (
    SELECT
        category_id,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) as total_count
    FROM ma63_issues
    GROUP BY category_id
) subq
WHERE c.id = subq.category_id;

-- 5.2 Recalculate summary from categories
UPDATE ma63_summary SET
    resolved = (SELECT COALESCE(SUM(resolved), 0) FROM ma63_categories WHERE is_active = TRUE),
    in_progress = (SELECT COALESCE(SUM(in_progress), 0) FROM ma63_categories WHERE is_active = TRUE),
    pending = (SELECT COALESCE(SUM(pending), 0) FROM ma63_categories WHERE is_active = TRUE),
    total_issues = (SELECT COALESCE(SUM(total), 0) FROM ma63_categories WHERE is_active = TRUE),
    updated_at = NOW()
WHERE id = (SELECT id FROM ma63_summary ORDER BY created_at DESC LIMIT 1);

-- Then recalculate percentage
UPDATE ma63_summary SET
    overall_progress = ROUND((resolved::DECIMAL / NULLIF(total_issues, 0)) * 100)
WHERE id = (SELECT id FROM ma63_summary ORDER BY created_at DESC LIMIT 1);


-- ============================================
-- PART 6: DELETION QUERIES (use with caution)
-- ============================================

-- 6.1 Remove a timeline event
-- DELETE FROM ma63_timeline_events WHERE id = 'event-uuid-here';

-- 6.2 Remove a watchlist item
-- DELETE FROM ma63_watchlist_items WHERE id = 'item-uuid-here';

-- 6.3 Deactivate (soft delete) a category
-- UPDATE ma63_categories SET is_active = FALSE, updated_at = NOW() WHERE code = 'category-code';

-- 6.4 Clear all data and start fresh (DANGEROUS - use only in development)
-- TRUNCATE ma63_watchlist_items, ma63_timeline_events, ma63_issues, ma63_categories, ma63_summary CASCADE;


-- ============================================
-- PART 7: VIEWS FOR EASY ACCESS
-- ============================================

-- Create a view for the complete dashboard data
CREATE OR REPLACE VIEW v_ma63_dashboard AS
SELECT
    s.total_issues,
    s.resolved,
    s.resolved_madani,
    s.in_progress,
    s.pending,
    s.overall_progress,
    s.data_source,
    s.last_official_update,
    s.updated_at as last_updated,
    (
        SELECT jsonb_agg(jsonb_build_object(
            'code', c.code,
            'name_en', c.name_en,
            'name_ms', c.name_ms,
            'icon', c.icon,
            'color', c.color,
            'resolved', c.resolved,
            'in_progress', c.in_progress,
            'pending', c.pending,
            'total', c.total
        ) ORDER BY c.display_order)
        FROM ma63_categories c
        WHERE c.is_active = TRUE
    ) as categories,
    (
        SELECT jsonb_agg(jsonb_build_object(
            'event_date', t.event_date,
            'year', t.year,
            'month', t.month,
            'event_en', t.event_en,
            'event_ms', t.event_ms,
            'event_type', t.event_type,
            'is_major', t.is_major
        ) ORDER BY t.event_date DESC)
        FROM ma63_timeline_events t
    ) as timeline,
    (
        SELECT jsonb_agg(jsonb_build_object(
            'title_en', w.title_en,
            'title_ms', w.title_ms,
            'description_en', w.description_en,
            'description_ms', w.description_ms,
            'status', w.status,
            'priority', w.priority,
            'last_update_date', w.last_update_date
        ) ORDER BY
            CASE w.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
            w.display_order
        )
        FROM ma63_watchlist_items w
        WHERE w.is_active = TRUE
    ) as watchlist
FROM ma63_summary s
ORDER BY s.created_at DESC
LIMIT 1;

-- Use the view to get all dashboard data in one query
-- SELECT * FROM v_ma63_dashboard;


-- ============================================
-- END OF MA63 DATABASE SETUP
-- ============================================
