-- =========================================================
-- EXTENSION
-- =========================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- ROLE TABLES
-- =========================================================

CREATE TABLE owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'OWNER',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'MANAGER',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE site_engineers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SITE_ENGINEER',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE labours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'LABOUR',
    skill_type TEXT CHECK (skill_type IN ('SKILLED','SEMI_SKILLED','UNSKILLED')),
    categories TEXT[] NOT NULL DEFAULT '{}',
    primary_latitude NUMERIC,
    primary_longitude NUMERIC,
    travel_radius_meters INTEGER,
    created_at TIMESTAMP DEFAULT now()
);

-- =========================================================
-- LABOUR ADDRESSES
-- =========================================================

CREATE TABLE labour_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    labour_id UUID REFERENCES labours(id) ON DELETE CASCADE,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    address_text TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now()
);

-- =========================================================
-- ORGANIZATION
-- =========================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    office_phone TEXT,
    org_type TEXT,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE organization_managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES managers(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('PENDING','APPROVED','REJECTED')) DEFAULT 'PENDING',
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE (org_id, manager_id)
);

CREATE TABLE organization_site_engineers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    site_engineer_id UUID REFERENCES site_engineers(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES managers(id),
    status TEXT CHECK (status IN ('PENDING','APPROVED','REJECTED')) DEFAULT 'PENDING',
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE (org_id, site_engineer_id)
);

-- =========================================================
-- PROJECTS
-- =========================================================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location_text TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    geofence_radius INTEGER,
    start_date DATE,
    end_date DATE,
    budget NUMERIC,
    current_invested NUMERIC DEFAULT 0,
    status TEXT CHECK (status IN ('PLANNED','ACTIVE','COMPLETED','ON_HOLD')),
    geofence JSONB,
    created_by UUID REFERENCES managers(id),
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE project_managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES managers(id),
    status TEXT CHECK (status IN ('PENDING','ACTIVE','REJECTED')) NOT NULL,
    assigned_at TIMESTAMP DEFAULT now(),
    UNIQUE (project_id, manager_id)
);

CREATE TABLE project_site_engineers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    site_engineer_id UUID REFERENCES site_engineers(id),
    status TEXT CHECK (status IN ('PENDING','ACTIVE','REMOVED','REJECTED')) DEFAULT 'PENDING',
    assigned_at TIMESTAMP DEFAULT now(),
    UNIQUE (project_id, site_engineer_id)
);



CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES managers(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE (project_id)
);

CREATE TABLE plan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    period_type TEXT CHECK (period_type IN ('WEEK','CUSTOM')) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    task_name TEXT NOT NULL,
    description TEXT,
    planned_quantity NUMERIC,
    planned_manpower INTEGER,
    planned_cost NUMERIC,
    created_at TIMESTAMP DEFAULT now()
);

-- =========================================================
-- DPRs
-- =========================================================
CREATE TABLE dprs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    site_engineer_id UUID REFERENCES site_engineers(id),
    title TEXT,
    description TEXT,
    plan_id UUID,
    plan_item_id UUID,
    report_date DATE NOT NULL,
    status TEXT CHECK (status IN ('PENDING','APPROVED','REJECTED')) DEFAULT 'PENDING',
    report_image BYTEA,
    report_image_mime TEXT,
    submitted_at TIMESTAMP DEFAULT now(),
    reviewed_by UUID REFERENCES managers(id),
    reviewed_at TIMESTAMP,
    remarks TEXT,
    UNIQUE (project_id, site_engineer_id, report_date)
);

-- =========================================================
-- MATERIAL REQUESTS
-- =========================================================

CREATE TABLE material_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    site_engineer_id UUID REFERENCES site_engineers(id),
    dpr_id UUID REFERENCES dprs(id),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    description TEXT,
    request_image BYTEA,
    request_image_mime TEXT,
    status TEXT CHECK (status IN ('PENDING','APPROVED','REJECTED')) DEFAULT 'PENDING',
    manager_feedback TEXT,
    reviewed_by UUID REFERENCES managers(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);
-- Make dpr_id explicitly nullable (if not already)
ALTER TABLE material_requests
ALTER COLUMN dpr_id DROP NOT NULL;

-- Ensure foreign key does NOT cascade deletes
ALTER TABLE material_requests
DROP CONSTRAINT IF EXISTS material_requests_dpr_id_fkey;

ALTER TABLE material_requests
ADD CONSTRAINT material_requests_dpr_id_fkey
FOREIGN KEY (dpr_id) REFERENCES dprs(id)
ON DELETE SET NULL;

-- =========================================================
-- MATERIAL BILLS
-- =========================================================

CREATE TABLE material_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_request_id UUID REFERENCES material_requests(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id),
    vendor_name TEXT NOT NULL,
    vendor_contact TEXT,
    bill_number TEXT NOT NULL,
    bill_amount NUMERIC NOT NULL,
    gst_percentage NUMERIC NOT NULL,
    gst_amount NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    bill_image BYTEA,
    bill_image_mime TEXT,
    category TEXT NOT NULL,
    status TEXT CHECK (status IN ('PENDING','APPROVED','REJECTED')) DEFAULT 'PENDING',
    manager_feedback TEXT,
    uploaded_by UUID REFERENCES site_engineers(id),
    reviewed_by UUID REFERENCES managers(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE material_bills
ALTER COLUMN material_request_id DROP NOT NULL;

-- Remove cascading delete to prevent data loss
ALTER TABLE material_bills
DROP CONSTRAINT IF EXISTS material_bills_material_request_id_fkey;

ALTER TABLE material_bills
ADD CONSTRAINT material_bills_material_request_id_fkey
FOREIGN KEY (material_request_id) REFERENCES material_requests(id)
ON DELETE SET NULL;
-- =========================================================
-- OTP, AUDIT, SESSION, PASSWORD RESET
-- =========================================================

CREATE TABLE otp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    remarks TEXT,
    acted_by_role TEXT NOT NULL,
    acted_by_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE session (
    sid VARCHAR PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL
);

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_role TEXT NOT NULL CHECK (
        user_role IN ('OWNER','MANAGER','SITE_ENGINEER','LABOUR')
    ),
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE labour_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    site_engineer_id UUID REFERENCES site_engineers(id),
    category TEXT NOT NULL,
    required_count INTEGER NOT NULL,
    search_radius_meters INTEGER NOT NULL,
    request_date DATE NOT NULL,
    status TEXT CHECK (status IN ('OPEN','LOCKED','CLOSED')) DEFAULT 'OPEN',
    copied_from UUID REFERENCES labour_requests(id),
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE (project_id, category, request_date)
);

CREATE TABLE labour_request_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    labour_request_id UUID REFERENCES labour_requests(id) ON DELETE CASCADE,
    labour_id UUID REFERENCES labours(id),
    joined_at TIMESTAMP DEFAULT now(),
    UNIQUE (labour_request_id, labour_id)
);

-- =========================================================
-- ATTENDANCE
-- =========================================================

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    labour_id UUID REFERENCES labours(id),
    site_engineer_id UUID REFERENCES site_engineers(id),
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    work_hours NUMERIC,
    status TEXT CHECK (status IN ('PENDING','APPROVED','REJECTED')) DEFAULT 'PENDING',
    approved_by UUID REFERENCES site_engineers(id),
    approved_at TIMESTAMP,
    UNIQUE (project_id, labour_id, attendance_date)
);
CREATE TABLE wages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id UUID REFERENCES attendance(id) ON DELETE CASCADE,
    labour_id UUID REFERENCES labours(id),
    project_id UUID REFERENCES projects(id),
    wage_type TEXT CHECK (wage_type IN ('DAILY','HOURLY')) DEFAULT 'DAILY',
    rate NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT CHECK (status IN ('PENDING','APPROVED','REJECTED')) DEFAULT 'PENDING',
    approved_by UUID REFERENCES managers(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE (attendance_id)
);
CREATE TABLE material_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    dpr_id UUID REFERENCES dprs(id) ON DELETE SET NULL,
    material_request_id UUID REFERENCES material_requests(id) ON DELETE SET NULL,

    material_name TEXT NOT NULL,
    category TEXT,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL, -- bags, kg, tons, meters, etc.

    movement_type TEXT CHECK (
        movement_type IN ('IN', 'OUT', 'ADJUSTMENT')
    ) NOT NULL,

    source TEXT CHECK (
        source IN ('AI_DPR', 'MANUAL', 'BILL', 'ADJUSTMENT')
    ) NOT NULL,

    remarks TEXT,

    recorded_by UUID,
    recorded_by_role TEXT CHECK (
        recorded_by_role IN ('SITE_ENGINEER', 'MANAGER')
    ),

    created_at TIMESTAMP DEFAULT now()
);
ALTER TABLE plan_items
ADD COLUMN status TEXT CHECK (
    status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED')
) DEFAULT 'PENDING',

ADD COLUMN completed_at DATE,

ADD COLUMN updated_by UUID,

ADD COLUMN updated_by_role TEXT CHECK (
    updated_by_role IN ('MANAGER')
),

ADD COLUMN delay_info JSONB;
ALTER TABLE audit_logs
ADD COLUMN organization_id UUID,
ADD COLUMN project_id UUID,
ADD COLUMN category TEXT,
ADD COLUMN change_summary JSONB;

CREATE INDEX idx_prt_user ON password_reset_tokens(user_id, user_role);
CREATE INDEX idx_prt_expires ON password_reset_tokens(expires_at);

-- Login
CREATE INDEX idx_owner_email ON owners(email);
CREATE INDEX idx_manager_email ON managers(email);
CREATE INDEX idx_site_engineer_email ON site_engineers(email);
CREATE INDEX idx_labour_phone ON labours(phone);

-- OTP
CREATE INDEX idx_otp_phone ON otp_logs(phone);
CREATE INDEX idx_otp_expiry ON otp_logs(expires_at);

-- Projects & dashboards
CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_status ON projects(status);

-- Approval queues
CREATE INDEX idx_material_req_status ON material_requests(status);
CREATE INDEX idx_material_bill_status ON material_bills(status);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_wages_status ON wages(status);

-- Audit
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(acted_by_role, acted_by_id);
CREATE INDEX idx_audit_time ON audit_logs(created_at);
