-- ============================================
-- Subcontractor Performance & Rating Module
-- Migration v1
-- ============================================

-- 1. Add org_id to existing subcontractors table
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_subcontractors_org ON subcontractors(org_id);

-- 2. Create qa_engineers table (same pattern as site_engineers)
CREATE TABLE IF NOT EXISTS qa_engineers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL CONSTRAINT qa_engineers_email_key UNIQUE,
  phone text NOT NULL CONSTRAINT qa_engineers_phone_key UNIQUE,
  password_hash text NOT NULL,
  role text DEFAULT 'QA_ENGINEER' NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  push_notifications_enabled boolean DEFAULT true,
  email_notifications_enabled boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_qa_engineer_email ON qa_engineers(email);

-- 3. Create organization_qa_engineers table (same pattern as organization_site_engineers)
CREATE TABLE IF NOT EXISTS organization_qa_engineers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  qa_engineer_id uuid REFERENCES qa_engineers(id) ON DELETE CASCADE,
  approved_by uuid REFERENCES managers(id),
  status text DEFAULT 'PENDING',
  approved_at timestamp,
  created_at timestamp DEFAULT now(),
  CONSTRAINT organization_qa_engineers_org_id_qa_engineer_id_key UNIQUE(org_id, qa_engineer_id),
  CONSTRAINT organization_qa_engineers_status_check CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- 4. Create project_qa_engineers table (same pattern as project_site_engineers)
CREATE TABLE IF NOT EXISTS project_qa_engineers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  qa_engineer_id uuid REFERENCES qa_engineers(id) ON DELETE CASCADE,
  status text DEFAULT 'PENDING',
  assigned_at timestamp DEFAULT now(),
  CONSTRAINT project_qa_engineers_project_id_qa_engineer_id_key UNIQUE(project_id, qa_engineer_id),
  CONSTRAINT project_qa_engineers_status_check CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- Indexes for the new tables
CREATE INDEX IF NOT EXISTS idx_org_qa_engineers_org ON organization_qa_engineers(org_id);
CREATE INDEX IF NOT EXISTS idx_org_qa_engineers_qa ON organization_qa_engineers(qa_engineer_id);
CREATE INDEX IF NOT EXISTS idx_project_qa_engineers_project ON project_qa_engineers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_qa_engineers_qa ON project_qa_engineers(qa_engineer_id);
