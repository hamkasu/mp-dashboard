-- Phase 5: Allowance-Per-Output ROI Analysis
-- Add value-for-money metrics to track MP salary efficiency

-- Add ROI and allowance fields to mp_report_cards table
ALTER TABLE mp_report_cards ADD COLUMN IF NOT EXISTS annual_allowance INTEGER DEFAULT 0;
ALTER TABLE mp_report_cards ADD COLUMN IF NOT EXISTS allowance_per_speech INTEGER DEFAULT 0;
ALTER TABLE mp_report_cards ADD COLUMN IF NOT EXISTS allowance_per_bill INTEGER DEFAULT 0;
ALTER TABLE mp_report_cards ADD COLUMN IF NOT EXISTS allowance_per_question INTEGER DEFAULT 0;
ALTER TABLE mp_report_cards ADD COLUMN IF NOT EXISTS allowance_per_committee INTEGER DEFAULT 0;
ALTER TABLE mp_report_cards ADD COLUMN IF NOT EXISTS roi_score INTEGER DEFAULT 50;
ALTER TABLE mp_report_cards ADD COLUMN IF NOT EXISTS roi_grade TEXT DEFAULT 'C';

-- Create indexes for ROI queries
CREATE INDEX IF NOT EXISTS idx_roi_score ON mp_report_cards(roi_score DESC);
CREATE INDEX IF NOT EXISTS idx_roi_grade ON mp_report_cards(roi_grade);
CREATE INDEX IF NOT EXISTS idx_annual_allowance ON mp_report_cards(annual_allowance DESC);

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mp_report_cards'
AND column_name IN ('annual_allowance', 'roi_score', 'roi_grade')
ORDER BY ordinal_position;
