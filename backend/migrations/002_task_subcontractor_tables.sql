-- ============================================
-- Task Subcontractor Assignment & Ratings
-- Migration v2
-- ============================================

-- 1. Create task_subcontractors table
CREATE TABLE IF NOT EXISTS task_subcontractors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
  subcontractor_id uuid NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES managers(id),
  assigned_at timestamp DEFAULT now(),
  task_start_date date,
  task_completed_at timestamp,
  CONSTRAINT task_sub_unique UNIQUE(task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_subcontractors_sub ON task_subcontractors(subcontractor_id);

-- 2. Create task_speed_ratings table
CREATE TABLE IF NOT EXISTS task_speed_ratings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
  subcontractor_id uuid NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  derived_from_duration boolean DEFAULT false,
  rated_by uuid REFERENCES managers(id),
  rated_at timestamp DEFAULT now(),
  CONSTRAINT task_speed_ratings_task_id_key UNIQUE(task_id)
);

CREATE INDEX IF NOT EXISTS idx_speed_ratings_sub ON task_speed_ratings(subcontractor_id);

-- 3. Create task_quality_reviews table
CREATE TABLE IF NOT EXISTS task_quality_reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
  subcontractor_id uuid NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  reviewed_by uuid REFERENCES managers(id),
  reviewed_at timestamp DEFAULT now(),
  CONSTRAINT task_quality_reviews_task_id_key UNIQUE(task_id)
);

CREATE INDEX IF NOT EXISTS idx_quality_reviews_sub ON task_quality_reviews(subcontractor_id);
