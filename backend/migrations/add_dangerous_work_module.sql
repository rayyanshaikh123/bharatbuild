-- ========================================
-- DANGEROUS WORK AUTHORIZATION MODULE
-- ========================================
-- Purpose: Safety-critical module to prevent labours from performing 
--          dangerous tasks without explicit Site Engineer authorization via OTP
-- Date: 2026-01-25
-- ========================================

-- 1. DANGEROUS TASKS
-- Defines dangerous tasks for a project (created by Site Engineer)
CREATE TABLE dangerous_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES site_engineers(id),
    created_by_role TEXT NOT NULL CHECK (created_by_role = 'SITE_ENGINEER'),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dangerous_tasks_project ON dangerous_tasks(project_id);
CREATE INDEX idx_dangerous_tasks_active ON dangerous_tasks(is_active);

-- 2. DANGEROUS TASK REQUESTS
-- Labour requests authorization to perform a dangerous task
CREATE TABLE dangerous_task_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dangerous_task_id UUID NOT NULL REFERENCES dangerous_tasks(id) ON DELETE CASCADE,
    labour_id UUID NOT NULL REFERENCES labours(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'EXPIRED')),
    requested_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES site_engineers(id),
    approval_method TEXT CHECK (approval_method = 'OTP')
);

CREATE INDEX idx_task_requests_labour ON dangerous_task_requests(labour_id);
CREATE INDEX idx_task_requests_project ON dangerous_task_requests(project_id);
CREATE INDEX idx_task_requests_status ON dangerous_task_requests(status);
CREATE INDEX idx_task_requests_task ON dangerous_task_requests(dangerous_task_id);

-- 3. DANGEROUS TASK OTPS
-- OTPs for approving dangerous task requests
CREATE TABLE dangerous_task_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_request_id UUID NOT NULL REFERENCES dangerous_task_requests(id) ON DELETE CASCADE,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_otps_request ON dangerous_task_otps(task_request_id);
CREATE INDEX idx_task_otps_verified ON dangerous_task_otps(verified);
CREATE INDEX idx_task_otps_expires ON dangerous_task_otps(expires_at);

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON TABLE dangerous_tasks IS 'Safety-critical tasks requiring Site Engineer authorization';
COMMENT ON TABLE dangerous_task_requests IS 'Labour requests to perform dangerous tasks';
COMMENT ON TABLE dangerous_task_otps IS 'Single-use OTPs for dangerous task approval (5min expiry)';

COMMENT ON COLUMN dangerous_tasks.is_active IS 'Only active tasks can be requested by labour';
COMMENT ON COLUMN dangerous_task_requests.status IS 'REQUESTED → OTP generated | APPROVED → OTP verified | REJECTED/EXPIRED → denied';
COMMENT ON COLUMN dangerous_task_otps.otp_hash IS 'Bcrypt hashed OTP (never store plaintext)';
COMMENT ON COLUMN dangerous_task_otps.verified IS 'Single-use flag - once verified, cannot reuse';
