PROJECT_CONTEXT.md
Single Source of Truth for BharatBuild Construction Management System

1️⃣ Project Overview
What Problem This System Solves
BharatBuild is a construction project management system designed for the Indian construction industry. It solves the critical problem of coordinating multiple stakeholders across geographically distributed construction sites while maintaining strict financial accountability and workflow integrity.

Core Problems Addressed:

Fragmented Communication: Owners, managers, site engineers, and labourers operate in silos
Financial Opacity: No real-time tracking of material costs, wages, and project investment
Attendance Fraud: Manual attendance systems prone to manipulation
Material Wastage: Uncontrolled material procurement without approval workflows
Accountability Gaps: No audit trail for decisions and approvals
Real-World Construction Workflow Modeled
The system models a hierarchical construction workflow:

Owner creates an organization and projects
Managers join organizations, get assigned to projects, create plans
Site Engineers join organizations, get assigned to projects, execute daily work
Labourers apply for work, attend sites, get paid wages
Daily Workflow:

Site engineer creates Daily Progress Report (DPR)
Site engineer requests materials based on plan/DPR
Site engineer marks labour attendance (geofence-validated)
Manager reviews and approves DPRs, material requests, bills, wages
Owner monitors all activities and financial health
Why Roles Exist
OWNER - Business owner/investor

Needs: Financial oversight, project visibility, ROI tracking
Reality: Not present on-site, relies on managers for execution
MANAGER - Project manager/supervisor

Needs: Control over resources, approval authority, quality assurance
Reality: Manages multiple projects, needs mobile access
SITE_ENGINEER - On-site execution lead

Needs: Daily task tracking, resource requests, labour management
Reality: Works in low-network environments, needs offline capability
LABOUR - Daily wage workers

Needs: Job discovery, attendance tracking, wage transparency
Reality: Mobile-first, limited literacy, geolocation-based work
2️⃣ Role Definitions & Powers
OWNER
Can SEE:

✅ All projects in their organization
✅ All DPRs across all projects
✅ All material requests and bills
✅ All labour requests
✅ All wages
✅ All plans
✅ Financial summary (current_invested vs budget)
✅ Organization members (managers, engineers)
Can CREATE:

✅ Organization (exactly one per owner)
✅ Projects within their organization
✅ Nothing else (read-only for operational data)
Can EDIT:

✅ Organization details
✅ Project details (name, location, budget, dates, geofence)
✅ Special case: Orphan material bills (bills without material request)
Can DELETE:

✅ Projects (cascades to all related data)
✅ Special case: Orphan material bills
Can APPROVE/REJECT:

✅ Manager requests to join organization
✅ Site engineer requests to join organization
❌ Cannot approve DPRs, materials, wages (manager's job)
Can NEVER:

❌ Create DPRs, material requests, attendance
❌ Approve operational items (DPRs, materials, wages)
❌ Access data from other organizations
❌ Modify approved/completed items
MANAGER
Can SEE:

✅ All projects where they are ACTIVE
✅ All DPRs in their active projects
✅ All material requests/bills in their active projects
✅ All attendance records in their active projects
✅ All wages in their active projects
✅ All labour requests in their active projects
✅ Plans in their active projects
Can CREATE:

✅ Projects (within organizations where they are APPROVED)
✅ Plans for projects
✅ Plan items
✅ Wages (bulk generation from approved attendance)
Can EDIT:

✅ Project details (if they created it)
✅ Plans and plan items
❌ Cannot edit DPRs, material requests (engineer's domain)
Can DELETE:

✅ DPRs (only if NOT approved)
✅ Plans and plan items
❌ Cannot delete approved items
Can APPROVE/REJECT:

✅ DPRs
✅ Material requests
✅ Material bills
✅ Wages
✅ Site engineer requests to join projects
✅ Labour request participants
Can NEVER:

❌ Create DPRs (engineer's job)
❌ Mark attendance (engineer's job)
❌ Access projects where they are not ACTIVE
❌ Access other organizations' data
❌ Modify items after approval
SITE_ENGINEER
Can SEE:

✅ Projects where they are ACTIVE
✅ Their own DPRs
✅ All DPRs in their active projects (for reference)
✅ Their own material requests and bills
✅ Attendance records in their active projects
✅ Plans in their active projects
✅ Labour requests in their active projects
Can CREATE:

✅ DPRs (one per day per project)
✅ Material requests (linked to DPR or standalone)
✅ Material bills
✅ Labour requests
✅ Attendance records (manual marking)
✅ Wage submissions (rate entry for approved attendance)
Can EDIT:

✅ Own material requests (only if PENDING)
✅ Own material bills (only if PENDING)
❌ Cannot edit DPRs (immutable after creation)
❌ Cannot edit approved items
Can DELETE:

✅ Own material requests (only if PENDING)
✅ Own material bills (only if PENDING)
❌ Cannot delete DPRs
❌ Cannot delete approved items
Can APPROVE/REJECT:

❌ Nothing (no approval authority)
Can NEVER:

❌ Approve own DPRs or material requests
❌ Access projects where they are not ACTIVE
❌ Access other organizations' data
❌ Create/modify plans (manager's job)
❌ Approve wages or attendance
LABOUR
Can SEE:

✅ Available labour requests (within their travel radius)
✅ Their own attendance history
✅ Their own wage records
✅ Today's attendance status
Can CREATE:

✅ Labour request applications
✅ Attendance check-in (geofence-validated)
✅ Attendance check-out
Can EDIT:

✅ Own profile (categories, travel radius)
❌ Cannot edit attendance or wages
Can DELETE:

❌ Nothing
Can APPROVE/REJECT:

❌ Nothing
Can NEVER:

❌ See other labourers' data
❌ Access project details beyond attendance
❌ Modify approved attendance or wages
❌ Check-in outside geofence
❌ Exceed daily exit limits (default 3)
3️⃣ Organization & Project Model
One Owner → One Organization
Rule: Each owner can create exactly ONE organization.

Schema Enforcement:

organizations.owner_id → owners.id (UNIQUE implied by business logic)
Why: Simplifies ownership model, prevents multi-org complexity.

Organization → Multiple Projects
Rule: An organization can have unlimited projects.

Schema:

projects.org_id → organizations.id
Cascade: Deleting organization deletes all projects.

Project Lifecycle
States: PLANNED → ACTIVE → COMPLETED (or ON_HOLD)

PLANNED:

Project created but not started
Can assign managers and engineers
Can create plans
No DPRs, attendance, or material activity
ACTIVE:

Operational state
DPRs, attendance, materials, wages all active
Most common state for ongoing projects
COMPLETED:

Project finished
Read-only for all data
No new DPRs, attendance, or materials
ON_HOLD:

Temporarily paused
No new operational data
Can resume to ACTIVE
Project Membership Rules
Managers:

project_managers (project_id, manager_id, status)
status: PENDING | ACTIVE | REJECTED
Manager must be APPROVED in organization first
Manager must be ACTIVE in project to perform actions
One manager can be ACTIVE in multiple projects
Site Engineers:

project_site_engineers (project_id, site_engineer_id, status)
status: PENDING | ACTIVE | REMOVED | REJECTED
Engineer must be APPROVED in organization first
Engineer must be ACTIVE in project to perform actions
REMOVED = temporarily removed, can be re-activated
REJECTED = permanently rejected
Labourers:

No direct project membership
Join via labour_request_participants
Status: PENDING | APPROVED | REJECTED
APPROVED labourers can mark attendance
ACTIVE vs PENDING vs REJECTED
ACTIVE:

Full operational permissions
Can create, view, approve (based on role)
Required for all actions
PENDING:

Awaiting approval
Read-only or no access
Cannot perform operational actions
REJECTED:

Denied access
Cannot perform any actions
Permanent state (no re-application)
4️⃣ Planning System
Plans
Purpose: Define project timeline and tasks.

Schema:

plans (id, project_id, created_by, start_date, end_date)
Rules:

One plan per project (project_id UNIQUE)
Created by manager
Defines overall project timeline
Plan Items
Purpose: Break down plan into specific tasks with timelines.

Schema:

plan_items (id, plan_id, period_type, period_start, period_end, 
            task_name, description, planned_quantity, planned_manpower, planned_cost)
period_type: WEEK | MONTH
Rules:

Multiple items per plan
Each item has a time period (week or month)
Tracks planned vs actual (via DPRs)
How Plans Relate to Other Entities
DPRs:

DPR can link to plan_id and plan_item_id
Tracks actual progress against planned tasks
Not mandatory (DPRs can exist without plans)
Material Requests:

Can link to DPR (which links to plan)
Indirect relationship: Material → DPR → Plan Item
Labour Requests:

Planned manpower in plan_items guides labour requests
No direct foreign key relationship
Attendance:

Actual manpower tracked via attendance
Compared against plan_items.planned_manpower
5️⃣ DPR System
Who Can Create
Site Engineer (ACTIVE in project):

One DPR per day per project per engineer
Unique constraint: (project_id, site_engineer_id, report_date)
Who Can Approve
Manager (ACTIVE in project):

Reviews DPR
Sets status: APPROVED | REJECTED
Records reviewed_by, reviewed_at, remarks
Immutability Rules
After Creation:

❌ Cannot edit DPR fields
❌ Cannot delete DPR (except by manager if not approved)
✅ Can view and reference
Why Immutable:

Audit trail integrity
Legal/compliance requirements
Prevents tampering with historical records
Plan Linkage Rules
Optional Linkage:

DPR can have plan_id and plan_item_id (both nullable)
Allows tracking progress against specific plan tasks
Standalone DPRs:

DPRs without plan linkage are allowed
Used for unplanned work or emergencies
Image Handling Rules
Storage:

Images stored as BYTEA in database
MIME type stored separately (report_image_mime)
Size Limits:

Enforced at application level (not in schema)
Typical limit: 5MB per image
Retrieval:

Served via dedicated image routes
Authorization checked before serving
6️⃣ Material Flow (High Level)
Why Material Requests Exist
Purpose: Formal approval workflow for material procurement.

Business Need:

Prevent unauthorized purchases
Track material costs against budget
Link materials to specific work (via DPR)
Why Bills Exist
Purpose: Record actual material expenses with vendor details.

Business Need:

Financial accounting
Vendor management
GST tracking
Payment processing
Approval Flow
Material Request:

Engineer creates request (linked to DPR or standalone)
Status: PENDING
Manager reviews → APPROVED | REJECTED
If APPROVED, engineer can upload bill
Material Bill:

Engineer uploads bill (only for APPROVED request or standalone)
Status: PENDING
Manager reviews → APPROVED | REJECTED
If APPROVED, projects.current_invested updated
Why Orphan/Standalone Cases Exist
Orphan Bills (bill without material request):

Emergency purchases
Small items not worth formal request
Owner can edit/delete (special permission)
Standalone Requests (request without DPR):

Materials not tied to specific daily work
General inventory
Limited to 5 per month per engineer (prevents abuse)
Email Notifications:

Owner notified for standalone requests
Owner notified for orphan bills
Ensures visibility into exceptional cases
7️⃣ Labour, Attendance & Wages (High Level)
Why Labour is Independent
Design Decision: Labourers are NOT tied to organizations or projects permanently.

Rationale:

Daily wage workers move between projects
Gig economy model
Location-based job discovery
Implementation:

Labours table is independent
Join projects via labour_request_participants
Attendance links labour to project for specific dates
Geofence-Based Attendance
Purpose: Prevent attendance fraud (marking attendance from home).

Implementation:

projects (latitude, longitude, geofence_radius)
Workflow:

Labour sends GPS coordinates on check-in
System calculates distance using Haversine formula
If distance > geofence_radius, check-in rejected
If within radius, attendance session created
Edge Cases:

Projects without geofence (radius = NULL) allow any location
Used for administrative or remote work
Session-Based Attendance Logic
Why Sessions:

Labourers may leave and return multiple times per day
Need to track each entry/exit separately
Accurate work hours = sum of all sessions
Schema:

attendance (id, project_id, labour_id, attendance_date, work_hours, entry_exit_count, max_allowed_exits)
attendance_sessions (id, attendance_id, check_in_time, check_out_time, worked_minutes)
Flow:

First check-in creates attendance record + first session
Check-out closes session, calculates worked_minutes
Subsequent check-ins create new sessions (same attendance record)
entry_exit_count incremented on each check-out
If entry_exit_count >= max_allowed_exits (default 3), no more check-outs allowed
work_hours = SUM(all session worked_minutes) / 60
Manual Attendance:

Engineer can manually mark attendance (is_manual = true)
Used for labourers without smartphones
No geofence validation for manual entries
Wage Generation Lifecycle
Step 1: Attendance Approval

Engineer marks attendance (auto or manual)
Manager approves attendance (status = APPROVED)
Step 2: Wage Creation

Engineer or Manager creates wage record
Links to attendance_id (UNIQUE constraint)
Wage type: DAILY or HOURLY
Rate entered manually or from wage_rates table
Step 3: Calculation

DAILY: total_amount = rate
HOURLY: total_amount = rate × work_hours
Step 4: Approval

Manager reviews wage
Status: APPROVED | REJECTED
If APPROVED, projects.current_invested updated
Step 5: Payment (Future Feature)

is_ready_for_payment flag (not currently used)
paid_at timestamp (not currently used)
Payment Readiness Concept
Fields:

wages (is_ready_for_payment, paid_at)
Intent (not implemented):

Mark wages ready for payment processing
Track actual payment date
Integration with payment gateways
Current State: Fields exist but unused.

8️⃣ Financial Accounting Rules
What Affects projects.current_invested
Increments (adds to investment):

✅ Material bill APPROVED

Adds: material_bills.total_amount
Transaction: UPDATE projects SET current_invested = current_invested + total_amount
✅ Wage APPROVED

Adds: wages.total_amount
Transaction: UPDATE projects SET current_invested = current_invested + total_amount
Does NOT Affect:

❌ Material request approval (no money spent yet)
❌ DPR approval (no direct cost)
❌ Attendance approval (wage not created yet)
❌ Labour request (no cost until wages)
What Does NOT Affect It
Rejected Items:

Material bills with status = REJECTED
Wages with status = REJECTED
No impact on current_invested
Pending Items:

Material bills with status = PENDING
Wages with status = PENDING
No impact until APPROVED
Deleted Items:

If material bill deleted (before approval), no impact
If wage deleted (before approval), no impact
Why Transactions Are Required
Problem: Race conditions and partial updates.

Example Without Transaction:

// ❌ BAD: Not atomic
UPDATE material_bills SET status = 'APPROVED' WHERE id = $1;
UPDATE projects SET current_invested = current_invested + $2 WHERE id = $3;
// If second query fails, bill is approved but investment not updated!
Solution With Transaction:

// ✅ GOOD: Atomic
BEGIN;
UPDATE material_bills SET status = 'APPROVED' WHERE id = $1 RETURNING *;
UPDATE projects SET current_invested = current_invested + $2 WHERE id = $3;
COMMIT; // Both succeed or both fail
Implementation:

All approval routes use PostgreSQL transactions
BEGIN → UPDATE bill/wage → UPDATE project → COMMIT
ROLLBACK on any error
9️⃣ Non-Functional Constraints
Low Network Environments
Reality: Construction sites often have poor connectivity.

Design Decisions:

Session-based auth (cookies, not tokens)
Minimal API calls (batch operations where possible)
Image compression at client (before upload)
Offline-first mobile app (future)
Current Limitations:

No offline mode (requires network)
Large images may fail to upload
Mobile-First Assumptions
Primary Users: Site engineers and labourers use mobile devices.

Implications:

GPS coordinates required for attendance
Image capture from camera
Touch-friendly UI (frontend)
Responsive design
Backend Considerations:

Accept latitude/longitude in requests
Store images as BYTEA (mobile can send base64)
Simple JSON responses (no complex nested objects)
Auditability
Requirement: Every action must be traceable.

Implementation:

Audit Logs Table:

audit_logs (entity_type, entity_id, action, acted_by_role, acted_by_id, created_at, remarks)
Approval Tracking:

All entities have: approved_by, approved_at, reviewed_by, reviewed_at
Immutable after approval
Timestamps:

created_at on all tables
updated_at on user tables
Current State: Audit logs table exists but not fully utilized in all routes.

Data Integrity Guarantees
Foreign Key Constraints:

All relationships enforced at DB level
CASCADE deletes where appropriate
SET NULL for optional relationships
Unique Constraints:

Prevent duplicate DPRs (project, engineer, date)
Prevent duplicate attendance (project, labour, date)
Prevent duplicate wages (attendance_id)
Check Constraints:

Status values restricted (PENDING | APPROVED | REJECTED)
Skill types restricted (SKILLED | SEMI_SKILLED | UNSKILLED)
Wage types restricted (DAILY | HOURLY)
Transaction Isolation:

Default READ COMMITTED
Explicit transactions for multi-step operations
Row-level locking for concurrent updates
🔒 Security Principles
Authentication:

Session-based (express-session + connect-pg-simple)
Passwords hashed (bcrypt)
OTP for labour login
Authorization:

Role-based access control (RBAC)
Middleware: ownerCheck, managerCheck, engineerCheck, labourCheck
Contextual checks: ACTIVE status, organization ownership, project membership
Data Isolation:

Cross-organization access prevented
Cross-project access prevented (unless ACTIVE)
Users can only see their own data or data they manage
Input Validation:

Required fields enforced
Status values validated
File types validated (images only)
📊 Key Metrics Tracked
Financial:

projects.budget (planned)
projects.current_invested (actual)
Budget variance = budget - current_invested
Operational:

DPR approval rate
Material request approval rate
Attendance approval rate
Wage approval rate
Resource:

Labour utilization (attendance vs planned manpower)
Material consumption (requests vs plan)
🚨 Critical Business Rules Summary
One owner = one organization (business logic, not schema)
ACTIVE status required for all operational actions
DPRs are immutable after creation
Material bills only after request approval (or standalone with limit)
Geofence validation for labour attendance
Exit limits (3 per day) for attendance
Accounting updates only on APPROVED status
Transactions required for financial updates
Cross-organization access forbidden
Standalone material requests limited to 5 per month per engineer
END OF PROJECT_CONTEXT.md