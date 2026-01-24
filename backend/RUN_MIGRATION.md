# Manual Attendance Face Verification Migration

## Quick Run (Node.js)

```bash
cd backend
node migrate_manual_attendance.js
```

## Manual Run (psql)

If the Node.js script fails, you can run the SQL directly:

```bash
psql -d your_database_name -f backend/migrations/add_manual_attendance_face_verification.sql
```

Or connect to your database and run:

```sql
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
```

## Verify Migration

After running, verify the tables exist:

```sql
-- Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'manual_attendance_labours'
);

-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'attendance' 
AND column_name IN ('check_in_face_image', 'face_verification_status', 'manual_labour_id');
```
