-- Blacklist System Migration
CREATE TABLE IF NOT EXISTS organization_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    labour_id UUID NOT NULL REFERENCES labours(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(org_id, labour_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_blacklist_org ON organization_blacklist(org_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_labour ON organization_blacklist(labour_id);
