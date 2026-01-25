-- ============================================
-- Schema Update: Enable Owner Actions
-- Migration v3
-- ============================================

-- 1. Update organization_qa_engineers
-- Remove FK to managers(id) because approved_by can be OWNER too
ALTER TABLE organization_qa_engineers DROP CONSTRAINT IF EXISTS organization_qa_engineers_approved_by_fkey;
ALTER TABLE organization_qa_engineers ADD COLUMN IF NOT EXISTS approved_by_role text CHECK (approved_by_role IN ('MANAGER', 'OWNER'));

-- 2. Update task_speed_ratings
-- Remove FK to managers(id)
ALTER TABLE task_speed_ratings DROP CONSTRAINT IF EXISTS task_speed_ratings_rated_by_fkey;
ALTER TABLE task_speed_ratings ADD COLUMN IF NOT EXISTS rated_by_role text CHECK (rated_by_role IN ('MANAGER', 'OWNER'));

-- 3. Update task_quality_reviews
-- Remove FK to managers(id)
ALTER TABLE task_quality_reviews DROP CONSTRAINT IF EXISTS task_quality_reviews_reviewed_by_fkey;
ALTER TABLE task_quality_reviews ADD COLUMN IF NOT EXISTS reviewed_by_role text CHECK (reviewed_by_role IN ('MANAGER', 'OWNER'));

-- NOTE: Ideally we would add a polymorphic FK or separate columns, but removing the constraint 
-- and managing referential integrity via logic (or composite FKs if we had a generic 'users' table) is simplest here.
-- The ID will strictly be a UUID of either a Manager or Owner.
