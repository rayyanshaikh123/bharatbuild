-- Migration: Add face verification support for manual attendance
-- This adds columns to store check-in and checkout face images and features
-- Also creates a table for local labours who don't use the app

-- Create table for manual attendance labours (local labours)
CREATE TABLE IF NOT EXISTS manual_attendance_labours (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    skill text NOT NULL,
    created_at timestamp DEFAULT now(),
    created_by uuid REFERENCES site_engineers(id),
    UNIQUE(project_id, name, skill)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_manual_attendance_labours_project 
ON manual_attendance_labours(project_id);

-- Add columns to attendance table for face verification
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS check_in_face_image bytea,
ADD COLUMN IF NOT EXISTS check_in_face_features jsonb,
ADD COLUMN IF NOT EXISTS check_out_face_image bytea,
ADD COLUMN IF NOT EXISTS check_out_face_features jsonb,
ADD COLUMN IF NOT EXISTS face_verification_status text DEFAULT 'PENDING' CHECK (face_verification_status IN ('PENDING', 'VERIFIED', 'FAILED')),
ADD COLUMN IF NOT EXISTS face_verification_confidence numeric,
ADD COLUMN IF NOT EXISTS manual_labour_id uuid REFERENCES manual_attendance_labours(id) ON DELETE SET NULL;

-- Add index for face verification queries
CREATE INDEX IF NOT EXISTS idx_attendance_face_verification_status 
ON attendance(face_verification_status) 
WHERE is_manual = true;

-- Add index for manual labour lookups
CREATE INDEX IF NOT EXISTS idx_attendance_manual_labour 
ON attendance(manual_labour_id) 
WHERE manual_labour_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE manual_attendance_labours IS 'Stores local labours who do not use the app - only name and skill';
COMMENT ON COLUMN attendance.check_in_face_image IS 'Face image captured during manual attendance check-in';
COMMENT ON COLUMN attendance.check_in_face_features IS 'Extracted face features (landmarks, ratios) in JSON format for verification';
COMMENT ON COLUMN attendance.check_out_face_image IS 'Face image captured during manual attendance checkout';
COMMENT ON COLUMN attendance.check_out_face_features IS 'Extracted face features from checkout image';
COMMENT ON COLUMN attendance.face_verification_status IS 'Status of face verification: PENDING, VERIFIED, FAILED';
COMMENT ON COLUMN attendance.face_verification_confidence IS 'Confidence score of face match (0-1)';
COMMENT ON COLUMN attendance.manual_labour_id IS 'Reference to manual_attendance_labours for local labours';
