-- ============================================
-- Fix: Point Quality Reviews to QA Engineers
-- Migration v4
-- ============================================

-- 1. Update task_quality_reviews Foreign Key
-- Previous migration pointed 'reviewed_by' to 'managers'.
-- We need it to point to 'qa_engineers'.

ALTER TABLE task_quality_reviews DROP CONSTRAINT IF EXISTS task_quality_reviews_reviewed_by_fkey;

-- If Migration 003 was run, 'reviewed_by_role' column might exist. 
-- We can ignore or drop it, but strictly we need the FK to QA Engineers.
-- Re-adding the strict FK constraint implies 'reviewed_by' must be a valid QA Engineer ID.
-- CAUTION: If any data exists with Manager IDs, this will fail. 
-- Assuming strict role separation means we haven't mixed data yet.

ALTER TABLE task_quality_reviews 
  ADD CONSTRAINT task_quality_reviews_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) 
  REFERENCES qa_engineers(id) 
  ON DELETE CASCADE;

-- Ensure Speed Ratings (Manager) stay pointing to Managers (No change needed if 002 was correct)
-- If 003 removed it, we should restore it for strictness, but 002 set it correctly.
-- We only need to fix Quality Reviews here.
