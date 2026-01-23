# Manager API Routes - Verified Inventory

> **Status**: ✅ VERIFIED - All routes confirmed from source code  
> **Last Updated**: 2026-01-23  
> **Base URL**: `http://localhost:3001`

---

## Authentication Routes

### POST `/auth/manager/register`

- **Auth**: None (public)
- **Body**:
  - `name` (string, required)
  - `email` (string, required)
  - `phone` (string, required)
  - `password` (string, required)
- **Response**: `{ message: "Manager registered successfully" }`

### POST `/auth/manager/login`

- **Auth**: Passport (manager-local)
- **Body**:
  - `email` (string, required)
  - `password` (string, required)
- **Response**: `{ message: "Login successful", user: {...} }`

### POST `/auth/manager/logout`

- **Auth**: Session
- **Body**: None
- **Response**: `{ message: "Logged out successfully" }`

---

## Profile Routes

### GET `/manager/profile`

- **Auth**: managerCheck
- **Params**: None
- **Response**: `{ manager: {...} }`

### GET `/manager/check-auth`

- **Auth**: managerCheck
- **Params**: None
- **Response**: `{ authenticated: true, user: {...} }`

---

## Organization Routes

### GET `/manager/organization`

- **Auth**: managerCheck
- **Params**: None (uses session manager ID)
- **Response**: `{ organizations: [...] }` (APPROVED orgs only)

### GET `/manager/organization/all`

- **Auth**: managerCheck
- **Params**: None
- **Response**: `{ organizations: [...] }` (all orgs)

### POST `/manager/organization/join-organization`

- **Auth**: managerCheck
- **Body**:
  - `organizationId` (UUID, required)
- **Response**: `{ message: "Joining request to the organization successfully" }`
- **Note**: Prevents joining if already APPROVED in another org

### GET `/manager/organization/my-requests`

- **Auth**: managerCheck
- **Params**: None
- **Response**: `{ requests: [...] }` (all statuses)

### POST `/manager/organization/leave`

- **Auth**: managerCheck
- **Body**:
  - `organizationId` (UUID, required)
- **Response**: `{ message: "Successfully left the organization" }`

---

## Project Routes

### POST `/manager/project/create-project`

- **Auth**: managerCheck
- **Body**:
  - `name` (string, required)
  - `organizationId` (UUID, required)
  - `startDate` (date, optional)
  - `endDate` (date, optional)
- **Response**: `{ message: "Project created successfully", project: {...} }`

### GET `/manager/project/my-projects`

- **Auth**: managerCheck
- **Query**: None
- **Response**: `{ projects: [...] }` (only ACTIVE projects)

### GET `/manager/project/all-projects`

- **Auth**: managerCheck
- **Query**:
  - `organizationId` (UUID, required)
- **Response**: `{ projects: [...] }` (all projects with manager status)

### GET `/manager/project/project/:projectId`

- **Auth**: managerCheck
- **Params**:
  - `projectId` (UUID, in URL)
- **Response**: `{ project: {...} }`

### PUT `/manager/project/project/:projectId`

- **Auth**: managerCheck (creator only)
- **Params**:
  - `projectId` (UUID, in URL)
- **Body**:
  - `name` (string, optional)
  - `startDate` (date, optional)
  - `endDate` (date, optional)
- **Response**: `{ message: "Project updated successfully", project: {...} }`

### DELETE `/manager/project/project/:projectId`

- **Auth**: managerCheck (creator only)
- **Params**:
  - `projectId` (UUID, in URL)
- **Response**: `{ message: "Project deleted successfully" }`

### PUT `/manager/project/project/:projectId/status`

- **Auth**: managerCheck (creator only)
- **Params**:
  - `projectId` (UUID, in URL)
- **Body**:
  - `status` (string, required: ACTIVE/COMPLETED/ON_HOLD)
- **Response**: `{ message: "Project status updated successfully" }`

---

## Manager Project Join Routes

### POST `/manager/project-requests/join-project`

- **Auth**: managerCheck
- **Body**:
  - `projectId` (UUID, required)
  - `organizationId` (UUID, required)
- **Response**: `{ message: "Successfully joined the project as a manager" }`

### GET `/manager/project-requests/my-project-requests`

- **Auth**: managerCheck
- **Params**: None
- **Response**: `{ requests: [...] }` (all statuses)

---

## Manager Request Approval (Creator Only)

### GET `/manager/projects/manager-requests`

- **Auth**: managerCheck (project creator only)
- **Query**:
  - `projectId` (UUID, required)
  - `organizationId` (UUID, required)
- **Response**: `{ requests: [...] }`

### PUT `/manager/projects/manager-requests/:requestId/decision`

- **Auth**: managerCheck (project creator only)
- **Params**:
  - `requestId` (UUID, in URL)
- **Body**:
  - `decision` (string, required: ACTIVE/REJECTED)
  - `projectId` (UUID, required)
  - `organizationId` (UUID, required)
- **Response**: `{ message: "Manager request {decision} successfully" }`

---

## Engineer Request Routes

### GET `/manager/projects/project-requests`

- **Auth**: managerCheck (ACTIVE manager)
- **Query**:
  - `projectId` (UUID, required)
  - `organizationId` (UUID, required)
- **Response**: `{ requests: [...] }` (engineer requests)

### PUT `/manager/projects/project-requests/:requestId/decision`

- **Auth**: managerCheck (ACTIVE manager)
- **Params**:
  - `requestId` (UUID, in URL)
- **Body**:
  - `decision` (string, required: ACTIVE/REJECTED)
  - `projectId` (UUID, required)
  - `organizationId` (UUID, required)
- **Response**: `{ message: "Engineer request {decision} successfully" }`

### GET `/manager/project-engineer-requests/engineer-requests`

- **Auth**: managerCheck
- **Query**:
  - `projectId` (UUID, required)
- **Response**: `{ requests: [...] }` (PENDING only)

### GET `/manager/project-engineer-requests/engineer-accepted-requests`

- **Auth**: managerCheck
- **Query**:
  - `projectId` (UUID, required)
- **Response**: `{ requests: [...] }` (ACTIVE only)

### GET `/manager/project-engineer-requests/engineer-rejected-requests`

- **Auth**: managerCheck
- **Query**:
  - `projectId` (UUID, required)
- **Response**: `{ requests: [...] }` (REJECTED only)

---

## Analytics Routes

### GET `/manager/analytics/overview`

- **Auth**: managerCheck
- **Query**:
  - `organizationId` (UUID, required)
- **Response**: `{ overview: {...} }`

### GET `/manager/analytics/project`

- **Auth**: managerCheck
- **Query**:
  - `projectId` (UUID, required)
- **Response**: `{ analytics: {...} }`

---

## Ledger Routes

### GET `/manager/ledger/project/:projectId`

- **Auth**: managerCheck
- **Params**:
  - `projectId` (UUID, in URL)
- **Query**:
  - `startDate` (date, optional)
  - `endDate` (date, optional)
- **Response**: `{ ledger: [...] }`

---

## Delay Routes

### GET `/manager/delays/project/:projectId`

- **Auth**: None (should be managerCheck - verify)
- **Params**:
  - `projectId` (UUID, in URL)
- **Response**: `{ delays: [...] }`

### PATCH `/manager/delays/plan-items/:id/status`

- **Auth**: None (should be managerCheck - verify)
- **Params**:
  - `id` (UUID, in URL)
- **Body**:
  - `status` (string, required)
  - `delayInfo` (object, optional)
- **Response**: `{ message: "Status updated successfully" }`

---

## Report Routes

### GET `/manager/reports/financial`

- **Auth**: managerCheck
- **Query**:
  - `projectId` (UUID, required)
  - `startDate` (date, optional)
  - `endDate` (date, optional)
- **Response**: `{ report: {...} }`

### GET `/manager/reports/project-progress`

- **Auth**: managerCheck
- **Query**:
  - `projectId` (UUID, required)
- **Response**: `{ report: {...} }`

### GET `/manager/reports/attendance`

- **Auth**: managerCheck
- **Query**:
  - `projectId` (UUID, required)
  - `startDate` (date, optional)
  - `endDate` (date, optional)
- **Response**: `{ report: {...} }`

### GET `/manager/reports/materials`

- **Auth**: managerCheck
- **Query**:
  - `projectId` (UUID, required)
- **Response**: `{ report: {...} }`

### GET `/manager/reports/audit`

- **Auth**: managerCheck
- **Query**:
  - `projectId` (UUID, required)
  - `startDate` (date, optional)
  - `endDate` (date, optional)
- **Response**: `{ report: {...} }`

---

## Audit Routes

### GET `/manager/audits/project/:projectId`

- **Auth**: managerCheck
- **Params**:
  - `projectId` (UUID, in URL)
- **Query**:
  - `startDate` (date, optional)
  - `endDate` (date, optional)
  - `limit` (number, optional)
- **Response**: `{ audits: [...] }`

---

## Dashboard Routes

### GET `/manager/dashboard`

- **Auth**: managerCheck
- **Params**: None
- **Response**: `{ dashboard: {...} }`

---

## Plan Routes

### POST `/manager/plan/plans`

- **Auth**: managerCheck (project creator only)
- **Body**:
  - `project_id` (UUID, required)
  - `start_date` (date, required)
  - `end_date` (date, required)
- **Response**: `{ plan: {...} }`
- **Note**: One plan per project

### GET `/manager/plan/plans/:projectId`

- **Auth**: managerCheck (ACTIVE manager or creator)
- **Params**:
  - `projectId` (UUID, in URL)
- **Response**: `{ plan: {...}, items: [...] }`

### PUT `/manager/plan/plans/:planId`

- **Auth**: managerCheck (project creator only)
- **Params**:
  - `planId` (UUID, in URL)
- **Body**:
  - `start_date` (date, optional)
  - `end_date` (date, optional)
- **Response**: `{ plan: {...} }`

### DELETE `/manager/plan/plans/:planId`

- **Auth**: managerCheck (project creator only)
- **Params**:
  - `planId` (UUID, in URL)
- **Response**: `{ message: "Plan deleted successfully" }`

---

## Plan Items Routes

### POST `/manager/plan/plans/:planId/items`

- **Auth**: managerCheck (ACTIVE manager or creator)
- **Params**:
  - `planId` (UUID, in URL)
- **Body**:
  - `period_type` (string, required: WEEK/MONTH)
  - `period_start` (date, required)
  - `period_end` (date, required)
  - `task_name` (string, required)
  - `description` (string, optional)
  - `planned_quantity` (number, optional)
  - `planned_manpower` (integer, optional)
  - `planned_cost` (number, optional)
- **Response**: `{ item: {...} }`

### PUT `/manager/plan/plans/items/:itemId`

- **Auth**: managerCheck (ACTIVE manager or creator)
- **Params**:
  - `itemId` (UUID, in URL)
- **Body**:
  - `period_type` (string, optional)
  - `period_start` (date, optional)
  - `period_end` (date, optional)
  - `task_name` (string, optional)
  - `description` (string, optional)
  - `planned_quantity` (number, optional)
  - `planned_manpower` (integer, optional)
  - `planned_cost` (number, optional)
- **Response**: `{ item: {...} }`

### DELETE `/manager/plan/plans/items/:itemId`

- **Auth**: managerCheck (ACTIVE manager or creator)
- **Params**:
  - `itemId` (UUID, in URL)
- **Response**: `{ message: "Plan item deleted successfully" }`

---

## Wage Rates Routes

### POST `/manager/wage-rates`

- **Auth**: managerCheck (ACTIVE in project)
- **Body**:
  - `project_id` (UUID, required)
  - `skill_type` (string, required: SKILLED/SEMI_SKILLED/UNSKILLED)
  - `category` (string, required)
  - `hourly_rate` (number, required)
- **Response**: `{ wage_rate: {...} }`

### GET `/manager/wage-rates`

- **Auth**: managerCheck (ACTIVE in project)
- **Query**:
  - `project_id` (UUID, required)
- **Response**: `{ wage_rates: [...] }`

### PATCH `/manager/wage-rates/:id`

- **Auth**: managerCheck (ACTIVE in project)
- **Params**:
  - `id` (UUID, in URL)
- **Body**:
  - `hourly_rate` (number, required)
- **Response**: `{ wage_rate: {...} }`

### DELETE `/manager/wage-rates/:id`

- **Auth**: managerCheck (ACTIVE in project)
- **Params**:
  - `id` (UUID, in URL)
- **Response**: `{ message: "Wage rate deleted successfully" }`

---

## Notes

- All UUIDs must be valid UUID format
- Session cookies are required for authenticated routes
- `managerCheck` middleware validates session
- Creator-only routes check `created_by` field
- ACTIVE manager routes check `status = 'ACTIVE'` in `project_managers`
