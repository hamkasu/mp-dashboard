-- ============================================
-- Migration: Create MA63 Dashboard Tables
-- Malaysia Agreement 1963 Implementation Tracker
-- ============================================

-- 1. MA63 Summary Statistics Table
CREATE TABLE IF NOT EXISTS "ma63_summary" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    "total_issues" INTEGER NOT NULL DEFAULT 0,
    "resolved" INTEGER NOT NULL DEFAULT 0,
    "resolved_madani" INTEGER NOT NULL DEFAULT 0,
    "in_progress" INTEGER NOT NULL DEFAULT 0,
    "pending" INTEGER NOT NULL DEFAULT 0,
    "overall_progress" INTEGER NOT NULL DEFAULT 0,
    "data_source" TEXT,
    "last_official_update" TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ma63_summary_updated" ON "ma63_summary"("updated_at" DESC);

-- 2. MA63 Categories Table
CREATE TABLE IF NOT EXISTS "ma63_categories" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) UNIQUE NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ms" TEXT NOT NULL,
    "icon" VARCHAR(50),
    "color" VARCHAR(20),
    "resolved" INTEGER NOT NULL DEFAULT 0,
    "in_progress" INTEGER NOT NULL DEFAULT 0,
    "pending" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ma63_categories_code" ON "ma63_categories"("code");
CREATE INDEX IF NOT EXISTS "idx_ma63_categories_order" ON "ma63_categories"("display_order");

-- 3. MA63 Individual Issues Table
CREATE TABLE IF NOT EXISTS "ma63_issues" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    "category_id" VARCHAR(255) REFERENCES "ma63_categories"("id") ON DELETE CASCADE,
    "title_en" TEXT NOT NULL,
    "title_ms" TEXT NOT NULL,
    "description_en" TEXT,
    "description_ms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('resolved', 'in_progress', 'pending', 'blocked')),
    "priority" TEXT DEFAULT 'medium' CHECK ("priority" IN ('critical', 'high', 'medium', 'low')),
    "resolved_date" TIMESTAMP,
    "resolved_by" TEXT,
    "related_documents" JSONB DEFAULT '[]'::jsonb,
    "key_stakeholders" JSONB DEFAULT '[]'::jsonb,
    "notes" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT FALSE,
    "last_update" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ma63_issues_category" ON "ma63_issues"("category_id");
CREATE INDEX IF NOT EXISTS "idx_ma63_issues_status" ON "ma63_issues"("status");
CREATE INDEX IF NOT EXISTS "idx_ma63_issues_priority" ON "ma63_issues"("priority");
CREATE INDEX IF NOT EXISTS "idx_ma63_issues_featured" ON "ma63_issues"("is_featured") WHERE "is_featured" = TRUE;

-- 4. MA63 Timeline Events Table
CREATE TABLE IF NOT EXISTS "ma63_timeline_events" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_date" TIMESTAMP NOT NULL,
    "year" INTEGER NOT NULL,
    "month" VARCHAR(20),
    "event_en" TEXT NOT NULL,
    "event_ms" TEXT NOT NULL,
    "event_type" TEXT NOT NULL DEFAULT 'milestone' CHECK ("event_type" IN ('milestone', 'resolved', 'in_progress', 'upcoming', 'setback')),
    "related_issue_id" VARCHAR(255) REFERENCES "ma63_issues"("id") ON DELETE SET NULL,
    "source_url" TEXT,
    "source_name" TEXT,
    "is_major" BOOLEAN NOT NULL DEFAULT FALSE,
    "display_order" INTEGER,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ma63_timeline_date" ON "ma63_timeline_events"("event_date" DESC);
CREATE INDEX IF NOT EXISTS "idx_ma63_timeline_year" ON "ma63_timeline_events"("year" DESC);
CREATE INDEX IF NOT EXISTS "idx_ma63_timeline_type" ON "ma63_timeline_events"("event_type");

-- 5. MA63 Priority Watchlist Items Table
CREATE TABLE IF NOT EXISTS "ma63_watchlist_items" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    "issue_id" VARCHAR(255) REFERENCES "ma63_issues"("id") ON DELETE CASCADE,
    "title_en" TEXT NOT NULL,
    "title_ms" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_ms" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress' CHECK ("status" IN ('resolved', 'in_progress', 'pending', 'blocked')),
    "priority" TEXT NOT NULL DEFAULT 'medium' CHECK ("priority" IN ('critical', 'high', 'medium', 'low')),
    "last_update_date" TIMESTAMP,
    "last_update_note" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ma63_watchlist_priority" ON "ma63_watchlist_items"("priority");
CREATE INDEX IF NOT EXISTS "idx_ma63_watchlist_order" ON "ma63_watchlist_items"("display_order");
CREATE INDEX IF NOT EXISTS "idx_ma63_watchlist_active" ON "ma63_watchlist_items"("is_active") WHERE "is_active" = TRUE;

-- ============================================
-- Insert Initial Data
-- ============================================

-- Insert Summary Statistics (January 2026 data)
INSERT INTO "ma63_summary" (
    "total_issues", "resolved", "resolved_madani", "in_progress", "pending",
    "overall_progress", "data_source", "last_official_update", "notes"
) VALUES (
    29, 13, 9, 14, 2,
    45, 'MA63 Technical Committee / BHESS JPM', '2025-03-01',
    'Data based on public government announcements. Official MA63 Dashboard launching January 28, 2026 via BHESS/JPM portal.'
);

-- Insert Categories
INSERT INTO "ma63_categories" ("code", "name_en", "name_ms", "icon", "color", "resolved", "in_progress", "pending", "total", "display_order") VALUES
('territorial', 'Territorial & Continental Shelf', 'Wilayah & Pelantar Benua', 'MapPin', '#0033A0', 1, 3, 1, 5, 1),
('fiscal', 'Fiscal & Revenue Sharing', 'Fiskal & Perkongsian Hasil', 'DollarSign', '#FFD100', 3, 4, 0, 7, 2),
('autonomy', 'Autonomy & Devolution', 'Autonomi & Devolusi', 'Shield', '#C8102E', 4, 3, 0, 7, 3),
('parliamentary', 'Parliamentary Representation', 'Perwakilan Parlimen', 'Landmark', '#00A86B', 2, 2, 1, 5, 4),
('immigration', 'Immigration Control', 'Kawalan Imigresen', 'Users', '#6B21A8', 2, 1, 0, 3, 5),
('others', 'Others', 'Lain-lain', 'FileText', '#64748B', 1, 1, 0, 2, 6);

-- Insert Timeline Events
INSERT INTO "ma63_timeline_events" ("event_date", "year", "month", "event_en", "event_ms", "event_type", "is_major") VALUES
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
('2026-01-28', 2026, 'January', 'Official MA63 Dashboard launch scheduled (BHESS/JPM portal)', 'Pelancaran Dashboard MA63 rasmi dijadualkan (portal BHESS/JPM)', 'upcoming', TRUE);

-- Insert Priority Watchlist Items
INSERT INTO "ma63_watchlist_items" ("title_en", "title_ms", "description_en", "description_ms", "status", "priority", "last_update_date", "display_order") VALUES
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
);
