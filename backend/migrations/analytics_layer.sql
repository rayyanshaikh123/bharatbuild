-- Analytics & Statistics Layer - Database Changes
-- Run this migration to add required tables and columns

-- 1. Create ledger_adjustments table
CREATE TABLE IF NOT EXISTS ledger_adjustments (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES managers(id),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category VARCHAR(50) DEFAULT 'ADJUSTMENT',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add delay column to plan_items (JSONB for flexible delay tracking)
ALTER TABLE plan_items 
ADD COLUMN IF NOT EXISTS delay JSONB DEFAULT NULL;

-- 3. Add completed_at column to plan_items
ALTER TABLE plan_items 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP DEFAULT NULL;

-- 4. Create performance indexes for analytics queries

-- Organization-level analytics
CREATE INDEX IF NOT EXISTS idx_projects_org_status 
ON projects(org_id, status);

-- Material costs
CREATE INDEX IF NOT EXISTS idx_material_bills_project_status 
ON material_bills(project_id, status);

-- Wages
CREATE INDEX IF NOT EXISTS idx_wages_project_status 
ON wages(project_id, status);

-- Audit logs (organization-level)
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_date 
ON audit_logs(organization_id, created_at DESC);

-- Audit logs (project-level)
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_date 
ON audit_logs(project_id, created_at DESC);

-- Audit logs (category filtering)
CREATE INDEX IF NOT EXISTS idx_audit_logs_category 
ON audit_logs(category);

-- Ledger adjustments
CREATE INDEX IF NOT EXISTS idx_ledger_adjustments_project_date 
ON ledger_adjustments(project_id, date DESC);

-- Plan items (delay tracking)
CREATE INDEX IF NOT EXISTS idx_plan_items_project_status 
ON plan_items(project_id, status);

-- Attendance (for analytics)
CREATE INDEX IF NOT EXISTS idx_attendance_project_checkout 
ON attendance(project_id, checkout_time);

-- Project managers (for manager analytics)
CREATE INDEX IF NOT EXISTS idx_project_managers_manager_status 
ON project_managers(manager_id, status);

-- Comments on delay JSONB structure
COMMENT ON COLUMN plan_items.delay IS 'Delay tracking info: { referenced_dprs: [int], delay_reason: string, reported_at: timestamp, reported_by: int }';

-- Comments on ledger_adjustments
COMMENT ON TABLE ledger_adjustments IS 'Manual financial adjustments to project ledger (Manager only)';
