-- ========================================
-- SQL QUERIES FOR PEARL PROJECT VERIFICATION
-- ========================================
-- Quick reference queries to manually check seeded data
-- Run these in your PostgreSQL client (psql, pgAdmin, etc.)

-- 1. Check Project
SELECT 
    id,
    name,
    status,
    location_text,
    check_in_time,
    check_out_time,
    budget,
    start_date,
    end_date
FROM projects
WHERE name = 'pearl';

-- 2. Check Organization & Owner
SELECT 
    o.id as org_id,
    o.name as org_name,
    ow.id as owner_id,
    ow.name as owner_name,
    ow.email as owner_email
FROM organizations o
JOIN owners ow ON o.owner_id = ow.id
WHERE ow.email = 'owner@pearl.test';

-- 3. Check Manager Assignment
SELECT 
    m.id as manager_id,
    m.name as manager_name,
    m.email,
    pm.status as project_status,
    om.status as org_status
FROM managers m
JOIN project_managers pm ON m.id = pm.manager_id
JOIN organization_managers om ON m.id = om.manager_id
JOIN projects p ON pm.project_id = p.id
WHERE p.name = 'pearl';

-- 4. Check Site Engineer Assignment
SELECT 
    se.id as engineer_id,
    se.name as engineer_name,
    se.email,
    pse.status as project_status,
    ose.status as org_status
FROM site_engineers se
JOIN project_site_engineers pse ON se.id = pse.site_engineer_id
JOIN organization_site_engineers ose ON se.id = ose.site_engineer_id
JOIN projects p ON pse.project_id = p.id
WHERE p.name = 'pearl';

-- 5. Check All Labourers
SELECT 
    id,
    name,
    phone,
    skill_type,
    categories,
    primary_latitude,
    primary_longitude
FROM labours
WHERE phone LIKE '+9198765010%'
ORDER BY skill_type, name;

-- 6. Check Wage Rates
SELECT 
    wr.id,
    p.name as project_name,
    wr.skill_type,
    wr.category,
    wr.hourly_rate
FROM wage_rates wr
JOIN projects p ON wr.project_id = p.id
WHERE p.name = 'pearl'
ORDER BY wr.skill_type, wr.category;

-- 7. Check Attendance Summary
SELECT 
    attendance_date,
    COUNT(*) as total_labourers,
    ROUND(AVG(work_hours)::numeric, 2) as avg_work_hours,
    COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count
FROM attendance
WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl')
GROUP BY attendance_date
ORDER BY attendance_date DESC;

-- 8. Check Wages Summary
SELECT 
    a.attendance_date,
    l.name as labour_name,
    l.skill_type,
    w.worked_hours,
    w.rate,
    w.total_amount,
    w.status,
    w.is_ready_for_payment
FROM wages w
JOIN attendance a ON w.attendance_id = a.id
JOIN labours l ON w.labour_id = l.id
WHERE w.project_id = (SELECT id FROM projects WHERE name = 'pearl')
ORDER BY a.attendance_date DESC, l.name
LIMIT 20;

-- 9. Check Attendance Sessions
SELECT 
    a.attendance_date,
    l.name as labour_name,
    asess.check_in_time,
    asess.check_out_time,
    asess.worked_minutes
FROM attendance_sessions asess
JOIN attendance a ON asess.attendance_id = a.id
JOIN labours l ON a.labour_id = l.id
WHERE a.project_id = (SELECT id FROM projects WHERE name = 'pearl')
ORDER BY a.attendance_date DESC, asess.check_in_time
LIMIT 20;

-- 10. Overall Statistics
SELECT 
    'Project' as entity,
    COUNT(*) as count
FROM projects
WHERE name = 'pearl'

UNION ALL

SELECT 
    'Labourers',
    COUNT(*)
FROM labours
WHERE phone LIKE '+9198765010%'

UNION ALL

SELECT 
    'Wage Rates',
    COUNT(*)
FROM wage_rates
WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl')

UNION ALL

SELECT 
    'Attendance Records',
    COUNT(*)
FROM attendance
WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl')

UNION ALL

SELECT 
    'Attendance Sessions',
    COUNT(*)
FROM attendance_sessions
WHERE attendance_id IN (
    SELECT id FROM attendance 
    WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl')
)

UNION ALL

SELECT 
    'Wage Records',
    COUNT(*)
FROM wages
WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl');

-- 11. Financial Summary
SELECT 
    COUNT(*) as total_wage_records,
    SUM(total_amount) as total_wages_amount,
    AVG(total_amount) as avg_wage_per_record,
    MIN(total_amount) as min_wage,
    MAX(total_amount) as max_wage,
    SUM(worked_hours) as total_hours_worked,
    COUNT(CASE WHEN is_ready_for_payment = true THEN 1 END) as ready_for_payment_count
FROM wages
WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl');

-- 12. Labour-wise Summary
SELECT 
    l.name as labour_name,
    l.skill_type,
    COUNT(a.id) as attendance_days,
    ROUND(SUM(a.work_hours)::numeric, 2) as total_hours,
    ROUND(AVG(a.work_hours)::numeric, 2) as avg_hours,
    SUM(w.total_amount) as total_earnings,
    ROUND(AVG(w.total_amount)::numeric, 2) as avg_daily_wage
FROM labours l
JOIN attendance a ON l.id = a.labour_id
JOIN wages w ON a.id = w.attendance_id
WHERE a.project_id = (SELECT id FROM projects WHERE name = 'pearl')
GROUP BY l.id, l.name, l.skill_type
ORDER BY total_earnings DESC;

-- 13. Check Data Integrity
-- This query checks for any orphaned records or missing relationships
SELECT 
    'Wages without Attendance' as check_type,
    COUNT(*) as count
FROM wages w
WHERE NOT EXISTS (
    SELECT 1 FROM attendance a WHERE a.id = w.attendance_id
)

UNION ALL

SELECT 
    'Attendance without Sessions',
    COUNT(*)
FROM attendance a
WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl')
AND NOT EXISTS (
    SELECT 1 FROM attendance_sessions asess WHERE asess.attendance_id = a.id
)

UNION ALL

SELECT 
    'Wages without Labour',
    COUNT(*)
FROM wages w
WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl')
AND NOT EXISTS (
    SELECT 1 FROM labours l WHERE l.id = w.labour_id
);

-- 14. Test Login Credentials (for reference only - passwords are hashed)
SELECT 
    'Owner' as role,
    name,
    email,
    phone,
    'Pearl@Owner123' as test_password
FROM owners
WHERE email = 'owner@pearl.test'

UNION ALL

SELECT 
    'Manager',
    name,
    email,
    phone,
    'Pearl@Manager123'
FROM managers
WHERE email = 'manager@pearl.test'

UNION ALL

SELECT 
    'Site Engineer',
    name,
    email,
    phone,
    'Pearl@Engineer123'
FROM site_engineers
WHERE email = 'engineer@pearl.test';

-- 15. Cleanup Query (USE WITH CAUTION!)
-- Uncomment to delete all pearl project data

/*
BEGIN;

DELETE FROM wages WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl');
DELETE FROM attendance_sessions WHERE attendance_id IN 
    (SELECT id FROM attendance WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl'));
DELETE FROM attendance WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl');
DELETE FROM wage_rates WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl');
DELETE FROM project_site_engineers WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl');
DELETE FROM project_managers WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl');
DELETE FROM projects WHERE name = 'pearl';

-- Optional: Delete organization and users (uncomment if needed)
-- DELETE FROM organization_site_engineers WHERE site_engineer_id = 
--     (SELECT id FROM site_engineers WHERE email = 'engineer@pearl.test');
-- DELETE FROM organization_managers WHERE manager_id = 
--     (SELECT id FROM managers WHERE email = 'manager@pearl.test');
-- DELETE FROM site_engineers WHERE email = 'engineer@pearl.test';
-- DELETE FROM managers WHERE email = 'manager@pearl.test';
-- DELETE FROM labours WHERE phone LIKE '+9198765010%';
-- DELETE FROM organizations WHERE owner_id = 
--     (SELECT id FROM owners WHERE email = 'owner@pearl.test');
-- DELETE FROM owners WHERE email = 'owner@pearl.test';

COMMIT;
-- Or ROLLBACK; if you want to cancel
*/
