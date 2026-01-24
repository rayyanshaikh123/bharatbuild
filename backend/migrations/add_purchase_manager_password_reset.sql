-- Migration to add PURCHASE_MANAGER support to password_reset_tokens
-- Run this SQL script to enable password reset functionality for Purchase Managers

-- Drop existing constraint
ALTER TABLE password_reset_tokens 
DROP CONSTRAINT IF EXISTS password_reset_tokens_user_role_check;

-- Add new constraint with PURCHASE_MANAGER included
ALTER TABLE password_reset_tokens
ADD CONSTRAINT password_reset_tokens_user_role_check 
CHECK (user_role = ANY (ARRAY['OWNER'::text, 'MANAGER'::text, 'SITE_ENGINEER'::text, 'LABOUR'::text, 'PURCHASE_MANAGER'::text]));

-- Verify the constraint
SELECT 
    constraint_name, 
    check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'password_reset_tokens_user_role_check';
