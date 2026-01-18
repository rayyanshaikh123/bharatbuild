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
    status TEXT CHECK (status IN ('PLANNED','ACTIVE','COMPLETED','ON_HOLD')),
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

-- =========================================================
-- LABOUR REQUESTS
-- =========================================================

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

-- =========================================================
-- WAGES
-- =========================================================

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

-- =========================================================
-- OTP + AUDIT + SESSION
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
        user_role IN ('OWNER', 'MANAGER', 'SITE_ENGINEER', 'LABOUR')
    ),

    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_prt_user ON password_reset_tokens(user_id, user_role);
CREATE INDEX idx_prt_expires ON password_reset_tokens(expires_at);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_labours_phone ON labours(phone);
CREATE INDEX idx_labours_categories ON labours USING GIN (categories);

CREATE INDEX idx_otp_phone ON otp_logs(phone);
CREATE INDEX idx_otp_expiry ON otp_logs(expires_at);

CREATE INDEX idx_labour_requests_status ON labour_requests(status);
CREATE INDEX idx_labour_requests_date ON labour_requests(request_date);

CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_wages_status ON wages(status);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(acted_by_role, acted_by_id);
CREATE INDEX idx_audit_time ON audit_logs(created_at);
