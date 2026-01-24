# Dangerous Work Authorization API

## 🎯 Overview

Safety-critical module to prevent labours from performing dangerous tasks without explicit, real-time authorization from a Site Engineer using an OTP.

**This is NOT:**

- Attendance tracking
- Wage management
- Project approval

**This IS:**

- A safety gate requiring explicit engineer authorization
- Real-time OTP-based verification
- Single-use, time-limited approval

---

## 📊 Database Schema

### Tables Created

1. **dangerous_tasks** - Tasks defined by Site Engineers
2. **dangerous_task_requests** - Labour requests for authorization
3. **dangerous_task_otps** - Single-use OTPs with 5-minute expiry

### Migration

Run: `backend/migrations/add_dangerous_work_module.sql`

---

## 🔐 Role Permissions

| Role              | Permissions                                                        |
| ----------------- | ------------------------------------------------------------------ |
| **Site Engineer** | Create/update/deactivate tasks, view history, receive OTP requests |
| **Labour**        | View tasks, request authorization, submit OTP                      |
| **Manager/Owner** | Read-only audit access (to be implemented)                         |

---

## 🛣️ API Routes

### Site Engineer Routes

**Base:** `/engineer/dangerous-tasks`

#### 1. Create Dangerous Task

```http
POST /engineer/dangerous-tasks
Authorization: Site Engineer session
```

**Request Body:**

```json
{
  "projectId": "uuid",
  "name": "Working at Height >10ft",
  "description": "Use harness and safety rope. Check equipment before use."
}
```

**Response (201):**

```json
{
  "message": "Dangerous task created successfully",
  "dangerous_task": {
    "id": "uuid",
    "project_id": "uuid",
    "name": "Working at Height >10ft",
    "description": "Use harness...",
    "is_active": true,
    "created_by": "uuid",
    "created_by_role": "SITE_ENGINEER",
    "created_at": "2026-01-25T10:00:00Z"
  }
}
```

**Validation:**

- ✅ Engineer must be assigned to project
- ✅ Creates audit log entry

---

#### 2. Get Dangerous Tasks

```http
GET /engineer/dangerous-tasks?projectId=<uuid>
Authorization: Site Engineer session
```

**Response (200):**

```json
{
  "dangerous_tasks": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "name": "Electrical Work - Live Wires",
      "description": "Turn off main circuit before starting",
      "is_active": true,
      "created_by": "uuid",
      "created_by_role": "SITE_ENGINEER",
      "created_at": "2026-01-25T09:00:00Z",
      "created_by_name": "Ravi Kumar",
      "project_name": "Pearl Tower"
    }
  ]
}
```

**Validation:**

- ✅ Engineer must be assigned to project

---

#### 3. Update Dangerous Task

```http
PATCH /engineer/dangerous-tasks/:id
Authorization: Site Engineer session
```

**Request Body:**

```json
{
  "name": "Updated task name",
  "description": "Updated description",
  "is_active": false
}
```

**Response (200):**

```json
{
  "message": "Dangerous task updated successfully",
  "dangerous_task": {
    "id": "uuid",
    "name": "Updated task name",
    "is_active": false,
    ...
  }
}
```

**Validation:**

- ✅ Engineer must be assigned to project
- ✅ Creates audit log entry

---

#### 4. Get Task Request History

```http
GET /engineer/dangerous-tasks/requests?projectId=<uuid>
Authorization: Site Engineer session
```

**Response (200):**

```json
{
  "task_requests": [
    {
      "id": "uuid",
      "dangerous_task_id": "uuid",
      "labour_id": "uuid",
      "project_id": "uuid",
      "status": "APPROVED",
      "requested_at": "2026-01-25T10:15:00Z",
      "approved_at": "2026-01-25T10:18:00Z",
      "approved_by": "uuid",
      "approval_method": "OTP",
      "task_name": "Electrical Work",
      "task_description": "Live wires",
      "labour_name": "Rajesh Kumar",
      "labour_phone": "+919876543210",
      "approved_by_name": "Ravi Kumar"
    }
  ]
}
```

---

### Labour Routes

**Base:** `/labour/dangerous-task-requests`

#### 1. Get Available Dangerous Tasks

```http
GET /labour/dangerous-task-requests/available-tasks?projectId=<uuid>
Authorization: Labour session
```

**Response (200):**

```json
{
  "dangerous_tasks": [
    {
      "id": "uuid",
      "name": "Working at Height >10ft",
      "description": "Use harness and safety rope",
      "created_at": "2026-01-25T09:00:00Z",
      "created_by_name": "Ravi Kumar"
    }
  ]
}
```

**Validation:**

- ✅ Labour must be assigned to project
- ✅ Only active tasks returned

---

#### 2. Create Task Request

```http
POST /labour/dangerous-task-requests
Authorization: Labour session
```

**Request Body:**

```json
{
  "dangerousTaskId": "uuid",
  "projectId": "uuid"
}
```

**Response (201):**

```json
{
  "message": "Task request created successfully. Request OTP from Site Engineer.",
  "task_request": {
    "id": "uuid",
    "dangerous_task_id": "uuid",
    "labour_id": "uuid",
    "project_id": "uuid",
    "status": "REQUESTED",
    "requested_at": "2026-01-25T10:15:00Z",
    "task_name": "Electrical Work"
  }
}
```

**Validation:**

- ✅ Labour must be assigned to project
- ✅ Task must exist and be active
- ❌ Rejects if task is inactive
- ✅ Creates audit log entry

---

#### 3. Generate OTP

```http
POST /labour/dangerous-task-requests/:id/generate-otp
Authorization: Labour session
```

**Response (200):**

```json
{
  "message": "OTP generated successfully. Show this to Site Engineer.",
  "otp": "123456",
  "expires_at": "2026-01-25T10:20:00Z",
  "task_request_id": "uuid"
}
```

**Validation:**

- ✅ Request must belong to labour
- ✅ Request status must be REQUESTED
- ✅ Task must still be active
- ❌ Rejects if OTP already exists and not expired
- ✅ OTP expires in 5 minutes
- ✅ OTP is bcrypt hashed before storage
- ✅ Creates audit log entry

**⚠️ Security Note:** In production, remove `otp` from response and send to engineer via SMS/notification.

---

#### 4. Verify OTP

```http
POST /labour/dangerous-task-requests/:id/verify-otp
Authorization: Labour session
```

**Request Body:**

```json
{
  "otp": "123456"
}
```

**Response (200) - Success:**

```json
{
  "message": "Task approved successfully. You may now proceed with the dangerous task.",
  "task_request": {
    "id": "uuid",
    "status": "APPROVED",
    "task_name": "Electrical Work",
    "approved_at": "2026-01-25T10:18:00Z"
  }
}
```

**Response (400) - Invalid OTP:**

```json
{
  "error": "Invalid OTP"
}
```

**Response (400) - Expired OTP:**

```json
{
  "error": "OTP expired. Request marked as EXPIRED. Create a new request."
}
```

**Response (400) - Already Used:**

```json
{
  "error": "OTP already used. Generate a new OTP if needed."
}
```

**Validation:**

- ✅ Request must belong to labour
- ✅ Request status must be REQUESTED
- ❌ Rejects if OTP expired (marks request as EXPIRED)
- ❌ Rejects if OTP already verified
- ❌ Rejects if OTP invalid
- ✅ On success: Updates request to APPROVED, marks OTP as verified
- ✅ Creates audit log entry

---

#### 5. Get My Task Requests

```http
GET /labour/dangerous-task-requests/my?projectId=<uuid>&status=<REQUESTED|APPROVED|REJECTED|EXPIRED>
Authorization: Labour session
```

**Response (200):**

```json
{
  "task_requests": [
    {
      "id": "uuid",
      "dangerous_task_id": "uuid",
      "labour_id": "uuid",
      "project_id": "uuid",
      "status": "APPROVED",
      "requested_at": "2026-01-25T10:15:00Z",
      "approved_at": "2026-01-25T10:18:00Z",
      "approved_by": "uuid",
      "approval_method": "OTP",
      "task_name": "Electrical Work",
      "task_description": "Live wires",
      "project_name": "Pearl Tower",
      "approved_by_name": "Ravi Kumar"
    }
  ]
}
```

---

## 🔄 Complete Workflow

### Step 1: Site Engineer Defines Tasks

```bash
POST /engineer/dangerous-tasks
{
  "projectId": "project-123",
  "name": "Electrical Work - Live Wires",
  "description": "Turn off main circuit before starting"
}
```

### Step 2: Labour Views Available Tasks

```bash
GET /labour/dangerous-task-requests/available-tasks?projectId=project-123
```

### Step 3: Labour Creates Request

```bash
POST /labour/dangerous-task-requests
{
  "dangerousTaskId": "task-456",
  "projectId": "project-123"
}
# Returns request-789
```

### Step 4: Labour Generates OTP

```bash
POST /labour/dangerous-task-requests/request-789/generate-otp
# Returns: { "otp": "123456", "expires_at": "..." }
```

### Step 5: Labour Shows OTP to Engineer

**Physical interaction - labour verbally shares OTP with engineer**

### Step 6: Labour Submits OTP

```bash
POST /labour/dangerous-task-requests/request-789/verify-otp
{
  "otp": "123456"
}
# Returns: { "status": "APPROVED" }
```

### Step 7: Labour Proceeds with Dangerous Task

✅ Authorization complete - labour can now safely perform the task

---

## 🛡️ Error Scenarios

| Scenario              | HTTP | Error Message                               | Action                        |
| --------------------- | ---- | ------------------------------------------- | ----------------------------- |
| Task inactive         | 400  | "This dangerous task is currently inactive" | Cannot request inactive tasks |
| Labour not in project | 403  | "You are not assigned to this project"      | Verify project assignment     |
| OTP expired           | 400  | "OTP expired. Request marked as EXPIRED"    | Create new request            |
| OTP already used      | 400  | "OTP already used"                          | Generate new OTP              |
| Wrong OTP             | 400  | "Invalid OTP"                               | Try again with correct OTP    |
| OTP still active      | 400  | "An OTP is already active for this request" | Use existing OTP or wait      |

---

## 📝 Audit Logging

Every action creates an entry in `audit_logs`:

| Action           | Entity Type            | Acted By Role | Category |
| ---------------- | ---------------------- | ------------- | -------- |
| Task Created     | DANGEROUS_TASK         | SITE_ENGINEER | SAFETY   |
| Task Updated     | DANGEROUS_TASK         | SITE_ENGINEER | SAFETY   |
| Task Requested   | DANGEROUS_TASK_REQUEST | LABOUR        | SAFETY   |
| OTP Generated    | DANGEROUS_TASK_REQUEST | LABOUR        | SAFETY   |
| Request Approved | DANGEROUS_TASK_REQUEST | LABOUR        | SAFETY   |
| Request Expired  | DANGEROUS_TASK_REQUEST | LABOUR        | SAFETY   |

---

## 🧪 Testing Checklist

### Engineer Tests

- [ ] Create task with valid projectId
- [ ] Create task with invalid projectId (should fail)
- [ ] Create task while not assigned to project (should fail)
- [ ] Update task (name, description, is_active)
- [ ] Deactivate task (set is_active = false)
- [ ] View all tasks for project
- [ ] View task request history

### Labour Tests

- [ ] View available tasks (only active)
- [ ] Create request for active task
- [ ] Create request for inactive task (should fail)
- [ ] Create request while not assigned to project (should fail)
- [ ] Generate OTP
- [ ] Generate OTP when one already exists (should fail)
- [ ] Verify OTP with correct code
- [ ] Verify OTP with wrong code (should fail)
- [ ] Verify OTP after expiry (should fail, mark EXPIRED)
- [ ] Verify OTP after already used (should fail)
- [ ] View my requests (filtered by status)

### Security Tests

- [ ] OTP is hashed in database (never plaintext)
- [ ] OTP expires after 5 minutes
- [ ] OTP is single-use (verified flag)
- [ ] Cannot approve without OTP
- [ ] Cannot bypass engineer authorization
- [ ] Audit logs created for all actions

---

## 🚀 Deployment Steps

1. **Run Migration:**

   ```bash
   psql -h <host> -U <user> -d <database> -f migrations/add_dangerous_work_module.sql
   ```

2. **Restart Backend:**

   ```bash
   cd backend
   node index.js
   ```

3. **Verify Routes Registered:**
   - Check `/engineer/dangerous-tasks` is accessible
   - Check `/labour/dangerous-task-requests` is accessible

4. **Test Basic Flow:**
   - Create task as engineer
   - Request task as labour
   - Generate and verify OTP

---

## 📌 Important Notes

1. **OTP Security:**
   - OTPs are hashed using bcrypt (10 rounds)
   - Never stored in plaintext
   - Single-use only (verified flag prevents reuse)
   - 5-minute expiry window

2. **No Self-Approval:**
   - Labour cannot approve their own requests
   - Must obtain OTP from Site Engineer
   - Physical interaction ensures accountability

3. **Task Deactivation:**
   - Inactive tasks cannot be requested
   - Existing requests not affected
   - Engineer can reactivate anytime

4. **Audit Trail:**
   - Every action logged in `audit_logs`
   - Includes actor, timestamp, change summary
   - Category: SAFETY for compliance reporting

5. **Production Changes:**
   - Remove OTP from `/generate-otp` response
   - Send OTP to engineer via SMS/push notification
   - Labour obtains OTP verbally from engineer
   - Add rate limiting for OTP generation

---

## 🔗 Dependencies

**Existing:**

- `bcrypt` - OTP hashing
- `express` - Routing
- `pg` - PostgreSQL client
- Middleware: `engineerCheck`, `labourCheck`
- Database: `audit_logs` table

**No New Dependencies Required** ✅

---

## ❌ What This Module Does NOT Do

- ❌ Send SMS/notifications (to be added later)
- ❌ Track attendance
- ❌ Calculate wages
- ❌ Approve projects
- ❌ Manage material requests
- ❌ Reuse existing `otp_logs` table
- ❌ Allow auto-approval
- ❌ Bypass Site Engineer authorization

---

## 📞 Support

For issues or questions about this module, refer to:

- Migration file: `migrations/add_dangerous_work_module.sql`
- Engineer routes: `routes/engineer/dangerousTasks.js`
- Labour routes: `routes/labour/dangerousTaskRequests.js`
- Route registration: `index.js` (lines 264, 285)
