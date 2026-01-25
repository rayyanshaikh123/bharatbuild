-- Migration: Add material_usage column to dprs table
-- Date: 2026-01-25
-- Purpose: Store material consumption data submitted by Engineer during DPR creation

-- Add material_usage JSONB column to store array of materials used
ALTER TABLE dprs 
ADD COLUMN IF NOT EXISTS material_usage JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN dprs.material_usage IS 'Array of materials used in this DPR, submitted by Engineer: [{material_name, quantity_used, unit}]';

-- Create index for faster queries on material_usage
CREATE INDEX IF NOT EXISTS idx_dprs_material_usage ON dprs USING gin(material_usage);
