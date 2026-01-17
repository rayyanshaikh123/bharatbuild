# BharatBuild Backend API Routes Documentation

**Base URL:** `http://localhost:3001`

---

## 📁 Files Covered

### Auth Routes

- `routes/auth/ownerAuth.js`
- `routes/auth/managerAuth.js`
- `routes/auth/engineerAuth.js`
- `routes/auth/labourAuth.js`

### Owner Routes

- `routes/owner/owner.js`
- `routes/owner/organization.js`
- `routes/owner/organizationReq.js`

### Manager Routes

- `routes/manager/manager.js`

### Engineer Routes

- `routes/engineer/engineer.js`

### Labour Routes

- `routes/labour/labour.js`

---

# 👤 OWNER

## Owner Auth

**File:** `routes/auth/ownerAuth.js`  
**Mount:** `/auth/owner`

### POST `/auth/owner/register`

Register a new owner.

**URL:** `http://localhost:3001/auth/owner/register`

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "securePassword123"
}
```

**Response (201):**

```json
{
  "message": "Owner registered successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "role": "OWNER"
  }
}
```

---

### POST `/auth/owner/login`

Login as owner.

**URL:** `http://localhost:3001/auth/owner/login`

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):**

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "role": "OWNER"
  }
}
```

---

### POST `/auth/owner/logout`

Logout owner.

**URL:** `http://localhost:3001/auth/owner/logout`

**Request Body:** None

**Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

---

## Owner Profile

**File:** `routes/owner/owner.js`  
**Mount:** `/owner`

### GET `/owner/profile`

Get owner profile. **(Auth Required: Owner)**

**URL:** `http://localhost:3001/owner/profile`

**Request Body:** None

**Response (200):**

```json
{
  "owner": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "role": "OWNER"
  }
}
```

---

### GET `/owner/check-auth`

Check if owner is authenticated. **(Auth Required: Owner)**

**URL:** `http://localhost:3001/owner/check-auth`

**Request Body:** None

**Response (200):**

```json
{
  "authenticated": true,
  "owner": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "OWNER"
  }
}
```

---

## Owner Organization

**File:** `routes/owner/organization.js`  
**Mount:** `/owner/organization`

### POST `/owner/organization/create-organization`

Create a new organization. **(Auth Required: Owner)**

**URL:** `http://localhost:3001/owner/organization/create-organization`

**Request Body:**

```json
{
  "name": "ABC Construction",
  "address": "123 Main Street, City",
  "phone": "9876543210",
  "org_type": "CONSTRUCTION"
}
```

**Response (201):**

```json
{
  "organization": {
    "id": 1,
    "name": "ABC Construction",
    "address": "123 Main Street, City",
    "phone": "9876543210",
    "org_type": "CONSTRUCTION",
    "owner_id": 1
  }
}
```

---

### GET `/owner/organization/organizations`

Get all organizations for the owner. **(Auth Required: Owner)**

**URL:** `http://localhost:3001/owner/organization/organizations`

**Request Body:** None

**Response (200):**

```json
{
  "organizations": [
    {
      "id": 1,
      "name": "ABC Construction",
      "address": "123 Main Street, City",
      "phone": "9876543210",
      "org_type": "CONSTRUCTION",
      "owner_id": 1
    }
  ]
}
```

---

### GET `/owner/organization/organization/:id`

Get a specific organization by ID. **(Auth Required: Owner)**

**URL:** `http://localhost:3001/owner/organization/organization/1`

**Request Body:** None

**Response (200):**

```json
{
  "organization": {
    "id": 1,
    "name": "ABC Construction",
    "address": "123 Main Street, City",
    "phone": "9876543210",
    "org_type": "CONSTRUCTION",
    "owner_id": 1
  }
}
```

---

### PATCH `/owner/organization/organization/:id`

Update an organization. **(Auth Required: Owner)**

**URL:** `http://localhost:3001/owner/organization/organization/1`

**Request Body:**

```json
{
  "name": "ABC Construction Updated",
  "address": "456 New Street, City",
  "phone": "9876543211",
  "org_type": "INFRASTRUCTURE"
}
```

**Response (200):**

```json
{
  "organization": {
    "id": 1,
    "name": "ABC Construction Updated",
    "address": "456 New Street, City",
    "phone": "9876543211",
    "org_type": "INFRASTRUCTURE",
    "owner_id": 1
  }
}
```

---

### DELETE `/owner/organization/organization/:id`

Delete an organization. **(Auth Required: Owner)**

**URL:** `http://localhost:3001/owner/organization/organization/1`

**Request Body:** None

**Response (200):**

```json
{
  "message": "Organization deleted successfully"
}
```

---

## Owner Organization Requests

**File:** `routes/owner/organizationReq.js`  
**Mount:** `/owner/requests`

### GET `/owner/requests/`

Get all manager requests for an organization. **(Auth Required: Owner)**

**URL:** `http://localhost:3001/owner/requests/`

**Request Body:**

```json
{
  "orgId": 1
}
```

**Response (200):**

```json
{
  "managers": [
    {
      "id": 1,
      "organization_id": 1,
      "manager_id": 2,
      "status": "PENDING"
    }
  ]
}
```

---

### GET `/owner/requests/accepted`

Get all accepted manager requests. **(Auth Required: Owner)**

**URL:** `http://localhost:3001/owner/requests/accepted`

**Request Body:**

```json
{
  "orgId": 1
}
```

**Response (200):**

```json
{
  "managers": [
    {
      "id": 1,
      "organization_id": 1,
      "manager_id": 2,
      "status": "APPROVED"
    }
  ]
}
```

---

### GET `/owner/requests/pending`

Get all pending manager requests. **(Auth Required: Owner)**

**URL:** `http://localhost:3001/owner/requests/pending`

**Request Body:**

```json
{
  "orgId": 1
}
```

**Response (200):**

```json
{
  "managers": [
    {
      "id": 1,
      "organization_id": 1,
      "manager_id": 3,
      "status": "PENDING"
    }
  ]
}
```

---

### GET `/owner/requests/rejected`

Get all rejected manager requests. **(Auth Required: Owner)**

**URL:** `http://localhost:3001/owner/requests/rejected`

**Request Body:**

```json
{
  "orgId": 1
}
```

**Response (200):**

```json
{
  "managers": [
    {
      "id": 1,
      "organization_id": 1,
      "manager_id": 4,
      "status": "REJECTED"
    }
  ]
}
```

---

### PATCH `/owner/requests/:id`

Update manager request status (approve/reject). **(Auth Required: Owner)**

**URL:** `http://localhost:3001/owner/requests/1`

**Request Body:**

```json
{
  "status": "APPROVED"
}
```

**Response (200):**

```json
{
  "request": {
    "id": 1,
    "organization_id": 1,
    "manager_id": 2,
    "status": "APPROVED"
  }
}
```

---

# 👔 MANAGER

## Manager Auth

**File:** `routes/auth/managerAuth.js`  
**Mount:** `/auth/manager`

### POST `/auth/manager/register`

Register a new manager.

**URL:** `http://localhost:3001/auth/manager/register`

**Request Body:**

```json
{
  "name": "Jane Manager",
  "email": "jane@example.com",
  "phone": "9876543211",
  "password": "securePassword123"
}
```

**Response (201):**

```json
{
  "message": "Manager registered successfully"
}
```

---

### POST `/auth/manager/login`

Login as manager.

**URL:** `http://localhost:3001/auth/manager/login`

**Request Body:**

```json
{
  "email": "jane@example.com",
  "password": "securePassword123"
}
```

**Response (200):**

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "Jane Manager",
    "email": "jane@example.com",
    "phone": "9876543211",
    "role": "MANAGER"
  }
}
```

---

### POST `/auth/manager/logout`

Logout manager.

**URL:** `http://localhost:3001/auth/manager/logout`

**Request Body:** None

**Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

---

## Manager Profile

**File:** `routes/manager/manager.js`  
**Mount:** `/manager`

### GET `/manager/profile`

Get manager profile. **(Auth Required: Manager)**

**URL:** `http://localhost:3001/manager/profile`

**Request Body:** None

**Response (200):**

```json
{
  "manager": {
    "id": 1,
    "name": "Jane Manager",
    "email": "jane@example.com",
    "phone": "9876543211",
    "role": "MANAGER"
  }
}
```

---

### GET `/manager/check-auth`

Check if manager is authenticated. **(Auth Required: Manager)**

**URL:** `http://localhost:3001/manager/check-auth`

**Request Body:** None

**Response (200):**

```json
{
  "authenticated": true,
  "manager": {
    "id": 1,
    "name": "Jane Manager",
    "email": "jane@example.com",
    "role": "MANAGER"
  }
}
```

---

# 🔧 ENGINEER

## Engineer Auth

**File:** `routes/auth/engineerAuth.js`  
**Mount:** `/auth/engineer`

### POST `/auth/engineer/register`

Register a new engineer.

**URL:** `http://localhost:3001/auth/engineer/register`

**Request Body:**

```json
{
  "name": "Bob Engineer",
  "email": "bob@example.com",
  "phone": "9876543212",
  "password": "securePassword123"
}
```

**Response (201):**

```json
{
  "message": "Engineer registered successfully"
}
```

---

### POST `/auth/engineer/login`

Login as engineer.

**URL:** `http://localhost:3001/auth/engineer/login`

**Request Body:**

```json
{
  "email": "bob@example.com",
  "password": "securePassword123"
}
```

**Response (200):**

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "Bob Engineer",
    "email": "bob@example.com",
    "phone": "9876543212",
    "role": "ENGINEER"
  }
}
```

---

### POST `/auth/engineer/logout`

Logout engineer.

**URL:** `http://localhost:3001/auth/engineer/logout`

**Request Body:** None

**Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

---

## Engineer Profile

**File:** `routes/engineer/engineer.js`  
**Mount:** `/engineer`

### GET `/engineer/profile`

Get engineer profile. **(Auth Required: Engineer)**

**URL:** `http://localhost:3001/engineer/profile`

**Request Body:** None

**Response (200):**

```json
{
  "engineer": {
    "id": 1,
    "name": "Bob Engineer",
    "email": "bob@example.com",
    "phone": "9876543212",
    "role": "ENGINEER"
  }
}
```

---

### GET `/engineer/check-auth`

Check if engineer is authenticated. **(Auth Required: Engineer)**

**URL:** `http://localhost:3001/engineer/check-auth`

**Request Body:** None

**Response (200):**

```json
{
  "authenticated": true,
  "engineer": {
    "id": 1,
    "name": "Bob Engineer",
    "email": "bob@example.com",
    "role": "ENGINEER"
  }
}
```

---

# 👷 LABOUR

## Labour Auth

**File:** `routes/auth/labourAuth.js`  
**Mount:** `/auth/labour`

### POST `/auth/labour/register`

Register a new labour (OTP-based, no password).

**URL:** `http://localhost:3001/auth/labour/register`

**Request Body:**

```json
{
  "name": "Ram Labour",
  "phone": "9876543213"
}
```

**Response (201):**

```json
{
  "message": "Labour registered successfully"
}
```

---

### POST `/auth/labour/otp/request`

Request OTP for labour login.

**URL:** `http://localhost:3001/auth/labour/otp/request`

**Request Body:**

```json
{
  "phone": "9876543213"
}
```

**Response (200):**

```json
{
  "message": "OTP sent successfully"
}
```

---

### POST `/auth/labour/otp/verify`

Verify OTP and login as labour.

**URL:** `http://localhost:3001/auth/labour/otp/verify`

**Request Body:**

```json
{
  "phone": "9876543213",
  "otp": "123456"
}
```

**Response (200):**

```json
{
  "message": "OTP login successful",
  "user": {
    "id": 1,
    "name": "Ram Labour",
    "phone": "9876543213",
    "role": "LABOUR"
  }
}
```

---

### POST `/auth/labour/logout`

Logout labour.

**URL:** `http://localhost:3001/auth/labour/logout`

**Request Body:** None

**Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

---

## Labour Profile

**File:** `routes/labour/labour.js`  
**Mount:** `/labour`

### GET `/labour/profile`

Get labour profile. **(Auth Required: Labour)**

**URL:** `http://localhost:3001/labour/profile`

**Request Body:** None

**Response (200):**

```json
{
  "labour": {
    "id": 1,
    "name": "Ram Labour",
    "email": null,
    "phone": "9876543213",
    "role": "LABOUR"
  }
}
```

---

### GET `/labour/check-auth`

Check if labour is authenticated. **(Auth Required: Labour)**

**URL:** `http://localhost:3001/labour/check-auth`

**Request Body:** None

**Response (200):**

```json
{
  "authenticated": true,
  "labour": {
    "id": 1,
    "name": "Ram Labour",
    "phone": "9876543213",
    "role": "LABOUR"
  }
}
```

---

# 🏥 HEALTH & ROOT

### GET `/health`

Health check endpoint.

**URL:** `http://localhost:3001/health`

**Request Body:** None

**Response (200):**

```json
{
  "status": "ok",
  "message": "Healthy"
}
```

---

### GET `/`

Root endpoint.

**URL:** `http://localhost:3001/`

**Request Body:** None

**Response (200):**

```
Hello World!
```

---

## Notes

- All protected routes require session-based authentication (cookies).
- Send requests with `credentials: 'include'` from frontend.
- Status codes: `200` (success), `201` (created), `400` (bad request), `401` (unauthorized), `403` (forbidden), `404` (not found), `500` (server error).
