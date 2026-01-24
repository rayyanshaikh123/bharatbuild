# Purchase Manager API Documentation

## Overview

Complete API documentation for the Purchase Manager role in BharatBuild backend.

## Database Schema Requirements

### ⚠️ IMPORTANT: Database Migration Required

The following constraint needs to be updated in the database:

```sql
-- Update password_reset_tokens to support PURCHASE_MANAGER role
ALTER TABLE password_reset_tokens
DROP CONSTRAINT IF EXISTS password_reset_tokens_user_role_check;

ALTER TABLE password_reset_tokens
ADD CONSTRAINT password_reset_tokens_user_role_check
CHECK (user_role = ANY (ARRAY['OWNER'::text, 'MANAGER'::text, 'SITE_ENGINEER'::text, 'LABOUR'::text, 'PURCHASE_MANAGER'::text]));
```

### Tables Used

- `purchase_managers` - Purchase Manager authentication
- `organization_purchase_managers` - Organization membership
- `project_purchase_managers` - Project assignments
- `material_requests` - Read-only access to approved requests
- `purchase_orders` - Purchase order management
- `notifications` - System notifications
- `audit_logs` - Action tracking

---

## Authentication Endpoints

### Register Purchase Manager

**POST** `/auth/purchase-manager/register`

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "password": "securepassword123"
}
```

**Response (201):**

```json
{
  "message": "Purchase Manager registered successfully"
}
```

**Errors:**

- `400` - Missing fields / Email already exists
- `500` - Server error

---

### Login

**POST** `/auth/purchase-manager/login`

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200):**

```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "role": "PURCHASE_MANAGER"
  }
}
```

**Errors:**

- `401` - Invalid credentials
- `500` - Server error

---

### Logout

**POST** `/auth/purchase-manager/logout`

**Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

---

### Forgot Password

**POST** `/auth/purchase-manager/forgot-password`

**Request Body:**

```json
{
  "email": "john@example.com"
}
```

**Response (200):**

```json
{
  "message": "If the email exists, a reset link has been sent."
}
```

---

### Check Authentication

**GET** `/purchase-manager/check-auth`

**Headers:** `Cookie: connect.sid=...`

**Response (200):**

```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "PURCHASE_MANAGER"
  }
}
```

**Errors:**

- `401` - Not authenticated
- `403` - Wrong role

---

## Organization Endpoints

### Get Organization Status

**GET** `/purchase-manager/organization-status`

**Response (200):**

```json
{
  "organization": {
    "id": "uuid",
    "name": "ABC Construction",
    "address": "123 Main St",
    "office_phone": "+919876543210",
    "status": "APPROVED",
    "created_at": "2024-01-15T10:30:00Z",
    "approved_at": "2024-01-16T14:20:00Z"
  }
}
```

**Errors:**

- `401` - Unauthorized
- `404` - No organization found

---

### Get All Organizations

**GET** `/purchase-manager/organizations`

**Response (200):**

```json
{
  "organizations": [
    {
      "id": "uuid",
      "name": "ABC Construction",
      "address": "123 Main St",
      "office_phone": "+919876543210"
    }
  ]
}
```

---

### Join Organization

**POST** `/purchase-manager/join-organization`

**Request Body:**

```json
{
  "organizationId": "uuid"
}
```

**Response (200):**

```json
{
  "message": "Join request sent to organization successfully"
}
```

**Errors:**

- `400` - Already part of approved organization / Organization ID missing
- `404` - Organization not found

---

## Project Endpoints

### Get My Project Requests

**GET** `/purchase-manager/project-requests`

**Response (200):**

```json
{
  "requests": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "status": "PENDING",
      "assigned_at": "2024-01-15T10:30:00Z",
      "project_name": "Tower A Construction",
      "location_text": "Mumbai",
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "project_status": "ACTIVE",
      "org_name": "ABC Construction"
    }
  ]
}
```

---

### Get My Approved Projects

**GET** `/purchase-manager/projects`

**Response (200):**

```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Tower A Construction",
      "location_text": "Mumbai",
      "latitude": 19.076,
      "longitude": 72.8777,
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "budget": 5000000,
      "status": "ACTIVE",
      "current_invested": 1250000,
      "access_status": "APPROVED",
      "assigned_at": "2024-01-15T10:30:00Z",
      "org_name": "ABC Construction"
    }
  ]
}
```

**Errors:**

- `403` - No approved organization found

---

### Get Available Projects (for joining)

**GET** `/purchase-manager/available-projects`

**Response (200):**

```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Tower A Construction",
      "location_text": "Mumbai",
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "status": "ACTIVE",
      "join_status": "APPROVED"
    }
  ]
}
```

---

### Join Project

**POST** `/purchase-manager/join-project`

**Request Body:**

```json
{
  "projectId": "uuid"
}
```

**Response (200):**

```json
{
  "message": "Join request sent to project successfully"
}
```

**Errors:**

- `400` - Project ID missing
- `403` - Not approved in organization / Project not in organization
- `404` - Project not found

---

## Dashboard Endpoint

### Get Dashboard Summary

**GET** `/purchase-manager/dashboard`

**Response (200):**

```json
{
  "summary": {
    "pending_material_requests": 15,
    "pos_created_today": 3,
    "total_pos": 47
  }
}
```

---

## Material Request Endpoints (Read-Only)

### Get Approved Material Requests

**GET** `/purchase-manager/material-requests?projectId={uuid}`

**Query Parameters:**

- `projectId` (required) - Project UUID

**Response (200):**

```json
{
  "materialRequests": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "title": "Cement Required",
      "category": "CEMENT",
      "quantity": 100,
      "description": "50kg bags needed urgently",
      "status": "APPROVED",
      "created_at": "2024-01-15T10:30:00Z",
      "reviewed_at": "2024-01-16T14:20:00Z",
      "engineer_name": "Rajesh Kumar",
      "engineer_email": "rajesh@example.com",
      "reviewed_by_name": "Manager Name",
      "project_name": "Tower A Construction",
      "has_po": false,
      "po_number": null,
      "po_status": null
    }
  ]
}
```

**Errors:**

- `400` - Project ID missing
- `403` - No access to project

---

### Get Material Request Details

**GET** `/purchase-manager/material-requests/:id`

**Response (200):**

```json
{
  "materialRequest": {
    "id": "uuid",
    "project_id": "uuid",
    "site_engineer_id": "uuid",
    "title": "Cement Required",
    "category": "CEMENT",
    "quantity": 100,
    "description": "50kg bags needed urgently",
    "status": "APPROVED",
    "created_at": "2024-01-15T10:30:00Z",
    "reviewed_at": "2024-01-16T14:20:00Z",
    "engineer_name": "Rajesh Kumar",
    "engineer_email": "rajesh@example.com",
    "reviewed_by_name": "Manager Name",
    "project_name": "Tower A Construction"
  }
}
```

**Errors:**

- `403` - No access to material request
- `404` - Material request not found

---

### Get Material Request Image

**GET** `/purchase-manager/material-requests/:id/image`

**Response (200):**

- Binary image data with appropriate Content-Type

**Errors:**

- `403` - Access denied
- `404` - Material request or image not found

---

## Purchase Order Endpoints

### Create Purchase Order

**POST** `/purchase-manager/purchase-orders`

**Request Body:**

```json
{
  "materialRequestId": "uuid",
  "projectId": "uuid",
  "poNumber": "PO-2024-001",
  "vendorName": "XYZ Suppliers",
  "vendorContact": "+919876543210",
  "items": [
    {
      "name": "Portland Cement",
      "quantity": 100,
      "unit": "bags",
      "rate": 350,
      "amount": 35000
    }
  ],
  "totalAmount": 35000
}
```

**Response (201):**

```json
{
  "message": "Purchase order created successfully",
  "purchaseOrder": {
    "id": "uuid",
    "material_request_id": "uuid",
    "project_id": "uuid",
    "po_number": "PO-2024-001",
    "vendor_name": "XYZ Suppliers",
    "vendor_contact": "+919876543210",
    "items": [...],
    "total_amount": 35000,
    "status": "DRAFT",
    "po_pdf_url": null,
    "created_by": "uuid",
    "created_by_role": "PURCHASE_MANAGER",
    "created_at": "2024-01-15T10:30:00Z",
    "sent_at": null
  }
}
```

**Errors:**

- `400` - Missing fields / Material request not approved / PO number exists
- `403` - No access to project
- `404` - Material request not found

---

### Get All Purchase Orders

**GET** `/purchase-manager/purchase-orders?projectId={uuid}&status={status}`

**Query Parameters:**

- `projectId` (optional) - Filter by project
- `status` (optional) - Filter by status (DRAFT, SENT, ACKNOWLEDGED)

**Response (200):**

```json
{
  "purchaseOrders": [
    {
      "id": "uuid",
      "material_request_id": "uuid",
      "project_id": "uuid",
      "po_number": "PO-2024-001",
      "vendor_name": "XYZ Suppliers",
      "vendor_contact": "+919876543210",
      "items": [...],
      "total_amount": 35000,
      "status": "SENT",
      "po_pdf_url": "https://storage.example.com/po-001.pdf",
      "created_at": "2024-01-15T10:30:00Z",
      "sent_at": "2024-01-15T11:00:00Z",
      "project_name": "Tower A Construction",
      "material_request_title": "Cement Required",
      "material_category": "CEMENT"
    }
  ]
}
```

---

### Get Single Purchase Order

**GET** `/purchase-manager/purchase-orders/:id`

**Response (200):**

```json
{
  "purchaseOrder": {
    "id": "uuid",
    "material_request_id": "uuid",
    "project_id": "uuid",
    "po_number": "PO-2024-001",
    "vendor_name": "XYZ Suppliers",
    "vendor_contact": "+919876543210",
    "items": [...],
    "total_amount": 35000,
    "status": "SENT",
    "po_pdf_url": "https://storage.example.com/po-001.pdf",
    "created_at": "2024-01-15T10:30:00Z",
    "sent_at": "2024-01-15T11:00:00Z",
    "project_name": "Tower A Construction",
    "location_text": "Mumbai",
    "material_request_title": "Cement Required",
    "material_category": "CEMENT",
    "requested_quantity": 100,
    "material_description": "50kg bags needed urgently"
  }
}
```

**Errors:**

- `403` - Access denied (not owner)
- `404` - Purchase order not found

---

### Upload PO PDF

**PATCH** `/purchase-manager/purchase-orders/:id/upload`

**Request Body:**

```json
{
  "poPdfUrl": "https://storage.example.com/po-001.pdf"
}
```

**Response (200):**

```json
{
  "message": "PO PDF uploaded successfully",
  "purchaseOrder": {
    "id": "uuid",
    "po_pdf_url": "https://storage.example.com/po-001.pdf",
    ...
  }
}
```

**Errors:**

- `400` - PDF URL missing
- `403` - Access denied
- `404` - Purchase order not found

---

### Send Purchase Order

**PATCH** `/purchase-manager/purchase-orders/:id/send`

**Response (200):**

```json
{
  "message": "Purchase order sent successfully",
  "purchaseOrder": {
    "id": "uuid",
    "status": "SENT",
    "sent_at": "2024-01-15T11:00:00Z",
    ...
  }
}
```

**Errors:**

- `400` - PO not in DRAFT status / PDF not uploaded
- `403` - Access denied
- `404` - Purchase order not found

---

## Purchase Manager Workflow

### 1️⃣ Registration & Authentication

1. Register → `POST /auth/purchase-manager/register`
2. Login → `POST /auth/purchase-manager/login`
3. Check Auth → `GET /purchase-manager/check-auth`

### 2️⃣ Organization Access

1. View all organizations → `GET /purchase-manager/organizations`
2. Send join request → `POST /purchase-manager/join-organization`
3. Wait for owner approval
4. Check status → `GET /purchase-manager/organization-status`

### 3️⃣ Project Access

1. View available projects → `GET /purchase-manager/available-projects`
2. Send join request → `POST /purchase-manager/join-project`
3. Wait for manager approval
4. View approved projects → `GET /purchase-manager/projects`
5. Check requests → `GET /purchase-manager/project-requests`

### 4️⃣ Material Management

1. View approved material requests → `GET /purchase-manager/material-requests?projectId=xxx`
2. View request details → `GET /purchase-manager/material-requests/:id`
3. View request image → `GET /purchase-manager/material-requests/:id/image`

### 5️⃣ Purchase Order Lifecycle

1. Create PO → `POST /purchase-manager/purchase-orders` (status: DRAFT)
2. Upload PDF → `PATCH /purchase-manager/purchase-orders/:id/upload`
3. Send PO → `PATCH /purchase-manager/purchase-orders/:id/send` (status: SENT)
4. Site Engineer receives notification

### 6️⃣ Dashboard & Monitoring

- View summary → `GET /purchase-manager/dashboard`
- List all POs → `GET /purchase-manager/purchase-orders`
- Filter by project → `GET /purchase-manager/purchase-orders?projectId=xxx`
- Filter by status → `GET /purchase-manager/purchase-orders?status=SENT`

---

## Authorization Rules

✅ **Purchase Manager CAN:**

- Join ONE organization (must be APPROVED)
- Join multiple projects within approved organization
- View APPROVED material requests from assigned projects
- Create purchase orders for approved material requests
- Upload PO PDFs
- Send purchase orders
- View own purchase orders

❌ **Purchase Manager CANNOT:**

- Access DPRs, attendance, wages, labour data
- Approve/reject material requests
- Modify material requests
- Access multiple organizations
- Access projects outside their organization
- View/modify other purchase managers' POs
- Delete purchase orders (future enhancement)

---

## Notifications Created

1. **Project Join Request** - Sent to active project managers
2. **Purchase Order Sent** - Sent to site engineer who created material request

---

## Audit Logs Created

All actions create audit logs with:

- `entity_type` - ORGANIZATION, PROJECT, PURCHASE_ORDER
- `action` - JOIN_REQUEST, CREATED, PDF_UPLOADED, SENT
- `acted_by_role` - PURCHASE_MANAGER
- `acted_by_id` - Purchase Manager ID
- `project_id` / `organization_id` - Context
- `category` - ACCESS, PROCUREMENT

---

## Error Codes

- `400` - Bad Request (missing fields, validation errors)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (wrong role, no access)
- `404` - Not Found (resource doesn't exist)
- `500` - Server Error

---

## Session Management

All endpoints (except auth) require:

- Valid session cookie `connect.sid`
- User role = `PURCHASE_MANAGER`

Use Passport.js authentication middleware.

---

## Testing Checklist

- [ ] Register purchase manager
- [ ] Login with credentials
- [ ] Join organization (verify PENDING status)
- [ ] Owner approves organization request
- [ ] Verify organization status is APPROVED
- [ ] Join project
- [ ] Manager approves project request
- [ ] View approved material requests
- [ ] Create purchase order
- [ ] Upload PO PDF
- [ ] Send purchase order
- [ ] Verify site engineer receives notification
- [ ] Check dashboard summary
- [ ] View all POs with filters
- [ ] Verify audit logs created
- [ ] Test error cases (unauthorized access, etc.)

---

## Implementation Complete ✅

All endpoints implemented following exact database schema.
No assumptions made - all columns verified against `dbupdated.sql`.
