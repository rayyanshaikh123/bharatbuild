# Tool Management API Documentation

## Overview

Project Tool Management system with daily QR code generation for issue/return tracking. Site Engineers manage tools and generate QR codes, while Labour scans QR codes to issue or return tools.

## Tables Used

- `project_tools`: Tool inventory with status tracking
- `tool_qr_codes`: Daily QR codes with expiration (unique per tool per day)
- `tool_transactions`: Issue/return tracking with timestamps

## Business Rules

1. **Daily QR Codes**: One QR code per tool per day (unique constraint on tool_id + valid_date)
2. **QR Expiration**: QR codes only valid on their generated date
3. **One Active Transaction**: Tool can only have one active (unreturned) transaction at a time
4. **Self-Service for Labour**: Labour can issue/return tools by scanning QR codes
5. **Status Tracking**: Tool status updates automatically (AVAILABLE ↔ ISSUED)
6. **Audit Logging**: All actions (create, QR generation, issue, return) are logged

## Role Access

- **Site Engineer**: Create tools, generate QR codes, view history, delete tools
- **Labour**: Scan QR to issue/return tools, view their issued tools and history

---

## Engineer Routes

### 1. Create Tool

**POST** `/engineer/tools`

Create a new tool in the project inventory.

**Headers:**

```
Authorization: Bearer <token>
```

**Body:**

```json
{
  "projectId": "uuid",
  "name": "Drill Machine",
  "toolCode": "DRL-001",
  "description": "Cordless drill with 2 batteries"
}
```

**Success Response (201):**

```json
{
  "message": "Tool created successfully",
  "tool": {
    "id": "uuid",
    "project_id": "uuid",
    "name": "Drill Machine",
    "tool_code": "DRL-001",
    "description": "Cordless drill with 2 batteries",
    "status": "AVAILABLE",
    "created_by": "uuid",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**

- **400**: Missing required fields or duplicate tool_code
- **403**: No access to project
- **500**: Server error

**Audit Log:**

- Action: `TOOL_CREATED`
- Entity: `TOOL`
- Category: `TOOL_MANAGEMENT`

---

### 2. Get Tools by Project

**GET** `/engineer/tools?projectId=<uuid>&status=<AVAILABLE|ISSUED|DAMAGED|LOST>`

List all tools for a project with transaction counts.

**Query Parameters:**

- `projectId` (required): Project UUID
- `status` (optional): Filter by status

**Success Response (200):**

```json
{
  "tools": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "name": "Drill Machine",
      "tool_code": "DRL-001",
      "description": "Cordless drill with 2 batteries",
      "status": "AVAILABLE",
      "created_by": "uuid",
      "created_at": "2024-01-15T10:30:00Z",
      "created_by_name": "John Doe",
      "total_transactions": 5,
      "active_transactions": 0
    }
  ]
}
```

---

### 3. Delete Tool

**DELETE** `/engineer/tools/:toolId`

Delete a tool (only if no active transactions).

**Success Response (200):**

```json
{
  "message": "Tool deleted successfully"
}
```

**Error Responses:**

- **400**: Cannot delete - tool has active transactions
- **404**: Tool not found or no access
- **500**: Server error

**Audit Log:**

- Action: `TOOL_DELETED`
- Entity: `TOOL`

---

### 4. Generate QR Code

**POST** `/engineer/tools/:toolId/qr`

Generate a QR code for today (or return existing one if already generated).

**Success Response (201):**

```json
{
  "message": "QR code generated successfully",
  "qr": {
    "id": "uuid",
    "tool_id": "uuid",
    "project_id": "uuid",
    "qr_token": "a1b2c3d4e5f6...",
    "valid_date": "2024-01-15",
    "generated_by": "uuid",
    "generated_at": "2024-01-15T08:00:00Z",
    "is_active": true
  }
}
```

**Success Response (200) - Already exists:**

```json
{
  "message": "QR code already exists for today",
  "qr": { ... }
}
```

**Error Responses:**

- **404**: Tool not found or no access
- **500**: Server error

**Audit Log:**

- Action: `QR_GENERATED`
- Entity: `TOOL_QR`
- Category: `TOOL_MANAGEMENT`

**Notes:**

- Only one QR per tool per day (enforced by database constraint)
- QR token is 64-character hex string (32 random bytes)
- Idempotent: Multiple calls on same day return same QR

---

### 5. Get Tool Transaction History

**GET** `/engineer/tools/:toolId/history`

Get all issue/return transactions for a tool.

**Success Response (200):**

```json
{
  "transactions": [
    {
      "id": "uuid",
      "tool_id": "uuid",
      "project_id": "uuid",
      "labour_id": "uuid",
      "issued_at": "2024-01-15T09:00:00Z",
      "returned_at": "2024-01-15T17:30:00Z",
      "issued_by": "uuid",
      "returned_by": "uuid",
      "status": "RETURNED",
      "remarks": null,
      "labour_name": "Raj Kumar",
      "labour_phone": "+919876543210",
      "issued_by_name": "John Doe",
      "returned_by_name": "Jane Smith"
    }
  ]
}
```

---

## Labour Routes

### 6. Scan QR Code (Issue/Return)

**POST** `/labour/tools/scan`

Scan QR code to issue or return a tool. Automatically determines action based on current state.

**Headers:**

```
Authorization: Bearer <token>
```

**Body:**

```json
{
  "qrToken": "a1b2c3d4e5f6..."
}
```

**Success Response - ISSUE (201):**

```json
{
  "message": "Tool issued successfully",
  "action": "ISSUED",
  "transaction": {
    "id": "uuid",
    "tool_id": "uuid",
    "project_id": "uuid",
    "labour_id": "uuid",
    "issued_at": "2024-01-15T09:00:00Z",
    "returned_at": null,
    "status": "ISSUED"
  },
  "tool": {
    "id": "uuid",
    "name": "Drill Machine",
    "tool_code": "DRL-001"
  }
}
```

**Success Response - RETURN (200):**

```json
{
  "message": "Tool returned successfully",
  "action": "RETURNED",
  "transaction": {
    "id": "uuid",
    "tool_id": "uuid",
    "project_id": "uuid",
    "labour_id": "uuid",
    "issued_at": "2024-01-15T09:00:00Z",
    "returned_at": "2024-01-15T17:30:00Z",
    "status": "RETURNED"
  },
  "tool": {
    "id": "uuid",
    "name": "Drill Machine",
    "tool_code": "DRL-001"
  }
}
```

**Error Responses:**

- **400**: Missing qrToken, QR expired, tool unavailable
- **403**: No project access, or tool issued to another labour
- **404**: Invalid QR code
- **500**: Server error

**Logic Flow:**

1. Validate QR token exists and is active
2. Check QR valid_date matches today
3. Verify labour has project access (via attendance or labour_request)
4. Check for active transaction:
   - **No active transaction**: Issue tool to labour (status → ISSUED)
   - **Active transaction by same labour**: Return tool (status → RETURNED)
   - **Active transaction by different labour**: Reject with error

**Audit Logs:**

- **Issue**: Action `TOOL_ISSUED`, Entity `TOOL_TRANSACTION`
- **Return**: Action `TOOL_RETURNED`, Entity `TOOL_TRANSACTION`

---

### 7. Get My Issued Tools

**GET** `/labour/tools/my-tools`

Get all tools currently issued to the logged-in labour.

**Success Response (200):**

```json
{
  "tools": [
    {
      "id": "uuid",
      "tool_id": "uuid",
      "issued_at": "2024-01-15T09:00:00Z",
      "tool_name": "Drill Machine",
      "tool_code": "DRL-001",
      "description": "Cordless drill with 2 batteries",
      "project_name": "Site A Construction"
    }
  ],
  "count": 1
}
```

---

### 8. Get My Tool History

**GET** `/labour/tools/my-history?projectId=<uuid>&status=<ISSUED|RETURNED>`

Get transaction history for the logged-in labour.

**Query Parameters:**

- `projectId` (optional): Filter by project
- `status` (optional): Filter by transaction status

**Success Response (200):**

```json
{
  "transactions": [
    {
      "id": "uuid",
      "tool_id": "uuid",
      "project_id": "uuid",
      "labour_id": "uuid",
      "issued_at": "2024-01-15T09:00:00Z",
      "returned_at": "2024-01-15T17:30:00Z",
      "status": "RETURNED",
      "tool_name": "Drill Machine",
      "tool_code": "DRL-001",
      "description": "Cordless drill with 2 batteries",
      "project_name": "Site A Construction",
      "issued_by_name": "John Doe",
      "returned_by_name": "Jane Smith"
    }
  ],
  "count": 1
}
```

---

## Security & Validation

### Authentication

- All routes require authentication via Bearer token
- Engineer routes: `engineerCheck` middleware
- Labour routes: `labourCheck` middleware

### Project Access

- **Engineers**: Must be in `project_site_engineers` with status APPROVED
- **Labour**: Must have attendance record OR approved labour_request for project

### Data Integrity

- All write operations use database transactions (BEGIN/COMMIT/ROLLBACK)
- QR codes have unique constraint on (tool_id, valid_date)
- Tool codes must be unique across all tools
- Tool status follows state machine: AVAILABLE ↔ ISSUED, DAMAGED, LOST

---

## Status Values

### Tool Status (project_tools.status)

- `AVAILABLE`: Ready to be issued
- `ISSUED`: Currently with a labour
- `DAMAGED`: Needs repair
- `LOST`: Cannot be found

### Transaction Status (tool_transactions.status)

- `ISSUED`: Tool currently with labour (returned_at IS NULL)
- `RETURNED`: Tool returned (returned_at IS NOT NULL)

---

## Example Workflow

### Daily Tool Management Flow

**Morning (Engineer):**

1. Engineer generates QR codes for all tools:
   ```
   POST /engineer/tools/{toolId}/qr
   ```
2. QR codes are printed/displayed for the day

**During Work (Labour):** 3. Labour scans QR to issue tool:

```
POST /labour/tools/scan
Body: { "qrToken": "..." }
Response: { "action": "ISSUED" }
```

4. Tool status changes to ISSUED
5. Transaction record created with issued_at timestamp

**Evening (Labour):** 6. Labour scans same QR to return tool:

```
POST /labour/tools/scan
Body: { "qrToken": "..." }
Response: { "action": "RETURNED" }
```

7. Tool status changes to AVAILABLE
8. Transaction updated with returned_at timestamp

**Anytime (Engineer):** 9. Check tool history:

```
GET /engineer/tools/{toolId}/history
```

---

## Error Handling

### Common Error Responses

**Invalid QR:**

```json
{
  "error": "Invalid or inactive QR code"
}
```

**Expired QR:**

```json
{
  "error": "QR code has expired. This QR is only valid for 2024-01-14"
}
```

**Tool Already Issued:**

```json
{
  "error": "Tool is currently ISSUED and cannot be issued"
}
```

**Wrong Labour Returning:**

```json
{
  "error": "This tool is currently issued to another labour. Only the issued labour can return it."
}
```

**No Project Access:**

```json
{
  "error": "You do not have access to this project"
}
```

**Active Transaction Exists:**

```json
{
  "error": "Cannot delete tool with active transactions. Please return the tool first."
}
```

---

## Database Constraints

### Unique Constraints

- `project_tools.tool_code`: Globally unique
- `tool_qr_codes.qr_token`: Globally unique
- `tool_qr_codes.(tool_id, valid_date)`: One QR per tool per day

### Check Constraints

- `project_tools.status`: IN ('AVAILABLE', 'ISSUED', 'DAMAGED', 'LOST')
- `tool_transactions.status`: IN ('ISSUED', 'RETURNED')

### Foreign Keys

- `project_tools.project_id` → projects(id)
- `project_tools.created_by` → site_engineers(id)
- `tool_qr_codes.tool_id` → project_tools(id) ON DELETE CASCADE
- `tool_qr_codes.project_id` → projects(id)
- `tool_qr_codes.generated_by` → site_engineers(id)
- `tool_transactions.tool_id` → project_tools(id) ON DELETE CASCADE
- `tool_transactions.project_id` → projects(id)
- `tool_transactions.labour_id` → labours(id)
- `tool_transactions.issued_by` → site_engineers(id)
- `tool_transactions.returned_by` → site_engineers(id)

---

## Performance Considerations

1. **QR Lookup**: Indexed on qr_token for fast scanning
2. **Active Transactions**: Use `WHERE returned_at IS NULL` for current state
3. **Date Validation**: QR expiration checked via `valid_date = CURRENT_DATE`
4. **Transaction Safety**: All write operations wrapped in BEGIN/COMMIT blocks

---

## Testing Checklist

- [ ] Engineer can create tools with unique tool_codes
- [ ] Engineer can generate QR code for today
- [ ] Cannot generate duplicate QR for same tool same day
- [ ] Labour can issue available tool via QR scan
- [ ] Labour cannot issue already issued tool
- [ ] Labour can return their issued tool via QR scan
- [ ] Labour cannot return tool issued to someone else
- [ ] QR codes from previous days are rejected
- [ ] Tool status updates correctly (AVAILABLE ↔ ISSUED)
- [ ] Cannot delete tool with active transactions
- [ ] Audit logs created for all actions
- [ ] Project access validated for all operations
