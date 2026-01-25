-- ============================================
-- MANUAL MIGRATION INSTRUCTIONS
-- ============================================
-- Run this SQL directly in your database client (pgAdmin, psql, etc.)
-- Or run: psql -U your_username -d bharatbuilddb -f apply_migration_manual.sql

BEGIN;

-- Add material_usage column to dprs table
ALTER TABLE dprs 
ADD COLUMN IF NOT EXISTS material_usage JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN dprs.material_usage IS 'Array of materials used in this DPR, submitted by Engineer: [{material_name, quantity_used, unit}]';

-- Create index for faster queries on material_usage
CREATE INDEX IF NOT EXISTS idx_dprs_material_usage ON dprs USING gin(material_usage);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'dprs' AND column_name = 'material_usage';

COMMIT;

-- Expected output:
-- column_name    | data_type | column_default      | is_nullable
-- ---------------+-----------+---------------------+-------------
-- material_usage | jsonb     | '[]'::jsonb         | YES
