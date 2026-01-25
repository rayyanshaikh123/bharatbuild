# Material Stock Management System - Implementation Summary

## Overview

Complete end-to-end material stock tracking system with GRN approval, stock management, and consumption tracking across Owner, Manager, and Site Engineer roles.

---

## ✅ Database Tables Used

### Existing Tables (No Changes Required)

1. **`project_material_stock`** - Current available stock per material per project
2. **`material_consumption_records`** - Tracks material usage from DPRs
3. **`material_ledger`** - Audit trail for all material movements
4. **`projects.current_invested`** - Tracks total material investment
5. **`goods_receipt_notes`** - GRN records with PENDING/APPROVED/REJECTED status
6. **`purchase_orders`** - PO details with items and pricing
7. **`dprs`** - Daily Progress Reports
8. **`material_requests`** - Material request records

---

## 🔄 Modified Existing Routes

### 1. Manager GRN Approval - EXTENDED

**File:** `backend/routes/manager/goodsReceiptNotes.js`
**Route:** `PATCH /manager/goods-receipt-notes/:grnId/approve`

**New Functionality Added:**

- ✅ Calculates GRN total value from PO items × quantities
- ✅ Updates `projects.current_invested` with GRN value
- ✅ Inserts records into `project_material_stock` (UPSERT logic)
- ✅ Maintains backward compatibility with existing ledger entries
- ✅ Transaction-safe with ROLLBACK on failure

**Business Logic:**

```javascript
ON GRN APPROVAL:
  1. Calculate: grn_total = Σ(quantity_received × unit_price)
  2. UPDATE projects SET current_invested += grn_total
  3. FOR EACH received_item:
       - INSERT/UPDATE project_material_stock (increase available_quantity)
       - INSERT material_ledger (movement_type=IN, source=BILL)
  4. Update GRN status to APPROVED
  5. Create audit log & notifications
```

**Idempotency:** ✅ Approval can only happen once (status check: PENDING → APPROVED)

---

### 2. Manager DPR Approval - EXTENDED

**File:** `backend/routes/manager/dpr.js`
**Route:** `PATCH /manager/dprs/:dprId/review`

**New Functionality Added:**

- ✅ Accepts optional `material_usage` array in request body
- ✅ Validates stock availability before approval
- ✅ Deducts quantities from `project_material_stock`
- ✅ Records consumption in `material_consumption_records`
- ✅ Writes OUT entries to `material_ledger`
- ✅ Rejects approval if insufficient stock

**Request Body Schema:**

```json
{
  "status": "APPROVED",
  "remarks": "Approved",
  "material_usage": [
    {
      "material_name": "Cement",
      "unit": "bags",
      "quantity_used": 50
    },
    {
      "material_name": "Steel Rods",
      "unit": "kg",
      "quantity_used": 120
    }
  ]
}
```

**Business Logic:**

```javascript
ON DPR APPROVAL WITH material_usage:
  1. FOR EACH material in material_usage:
       - Check available_quantity in project_material_stock
       - If insufficient: ROLLBACK & return 400 error
  2. FOR EACH material (after validation):
       - INSERT material_consumption_records
       - UPDATE project_material_stock (decrease available_quantity)
       - INSERT material_ledger (movement_type=OUT, source=AI_DPR)
  3. Update DPR status to APPROVED
  4. Send notifications
```

**Error Handling:**

- Returns 400 if stock < required quantity
- Provides clear error: "Insufficient stock for {material}. Available: X, Required: Y"

---

## ➕ New Routes Created

### MANAGER ROUTES

#### 1. View Project Material Stock

**Route:** `GET /manager/material-stock/projects/:projectId/material-stock`
**Access:** Manager must be ACTIVE in project
**Response:**

```json
{
  "stock": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "material_name": "Cement",
      "category": "Binding Materials",
      "unit": "bags",
      "available_quantity": 150,
      "last_updated_at": "2026-01-25T10:30:00Z"
    }
  ]
}
```

---

#### 2. View Material Consumption Records

**Route:** `GET /manager/material-stock/projects/:projectId/material-consumption`
**Access:** Manager must be ACTIVE in project
**Response:**

```json
{
  "consumption": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "dpr_id": "uuid",
      "material_name": "Cement",
      "unit": "bags",
      "quantity_used": 50,
      "recorded_at": "2026-01-24T15:00:00Z",
      "report_date": "2026-01-24",
      "dpr_title": "Foundation Work",
      "engineer_name": "John Doe"
    }
  ]
}
```

---

#### 3. Get Stock Summary with Consumption

**Route:** `GET /manager/material-stock/projects/:projectId/stock-summary`
**Access:** Manager must be ACTIVE in project
**Response:**

```json
{
  "summary": [
    {
      "material_name": "Cement",
      "category": "Binding Materials",
      "unit": "bags",
      "current_stock": 150,
      "total_consumed": 300,
      "last_updated_at": "2026-01-25T10:30:00Z"
    }
  ]
}
```

---

### SITE ENGINEER ROUTES

#### 1. View Project Material Stock (Read-Only)

**Route:** `GET /engineer/material-stock/projects/:projectId/material-stock`
**Access:** Engineer must have APPROVED access to project
**Response:** Same as Manager stock view
**Restrictions:** ❌ Cannot modify stock, ❌ Cannot approve GRNs

---

### OWNER ROUTES

#### 1. Investment Summary Across All Projects

**Route:** `GET /owner/material-oversight/projects/investment-summary`
**Access:** Owner owns the organization
**Response:**

```json
{
  "projects": [
    {
      "id": "uuid",
      "project_name": "Pearl Tower Construction",
      "budget": 5000000,
      "current_invested": 1250000,
      "budget_used_percentage": 25.0,
      "status": "ACTIVE",
      "manager_name": "Jane Smith"
    }
  ],
  "summary": {
    "total_budget": 10000000,
    "total_invested": 2500000,
    "overall_percentage": "25.00"
  }
}
```

---

#### 2. View Project Material Stock (Read-Only)

**Route:** `GET /owner/material-oversight/projects/:projectId/material-stock`
**Access:** Owner owns the project's organization
**Response:** Same as Manager/Engineer stock view

---

#### 3. View Project GRNs (Read-Only)

**Route:** `GET /owner/material-oversight/projects/:projectId/grns`
**Access:** Owner owns the project's organization
**Response:**

```json
{
  "grns": [
    {
      "id": "uuid",
      "po_number": "PO-2026-001",
      "vendor_name": "ABC Suppliers",
      "po_amount": 150000,
      "status": "APPROVED",
      "received_by_name": "John Doe",
      "reviewed_by_name": "Jane Smith",
      "reviewed_at": "2026-01-25T12:00:00Z"
    }
  ]
}
```

---

#### 4. GRN Approval Audit Trail

**Route:** `GET /owner/material-oversight/grns/audit`
**Access:** Owner sees all GRN approvals across their projects
**Response:**

```json
{
  "audit_records": [
    {
      "audit_id": "uuid",
      "grn_id": "uuid",
      "action": "GRN_APPROVED",
      "project_name": "Pearl Tower",
      "manager_name": "Jane Smith",
      "po_number": "PO-2026-001",
      "action_timestamp": "2026-01-25T12:00:00Z",
      "change_summary": {
        /* JSON details */
      }
    }
  ]
}
```

---

#### 5. View Material Consumption by Project

**Route:** `GET /owner/material-oversight/projects/:projectId/material-consumption`
**Access:** Owner owns the project's organization
**Response:** Same as Manager consumption view

---

## 🔒 Access Control Matrix

| Route                     | Site Engineer | Manager | Owner        |
| ------------------------- | ------------- | ------- | ------------ |
| Create Material Request   | ✅ Yes        | ❌ No   | ❌ No        |
| Create GRN                | ✅ Yes        | ❌ No   | ❌ No        |
| Approve GRN               | ❌ No         | ✅ Yes  | ❌ No        |
| Approve DPR (Consumption) | ❌ No         | ✅ Yes  | ❌ No        |
| View Stock                | ✅ Read-Only  | ✅ Full | ✅ Read-Only |
| View Consumption          | ❌ No         | ✅ Yes  | ✅ Read-Only |
| Modify Stock Directly     | ❌ No         | ❌ No\* | ❌ No        |
| View Investment Summary   | ❌ No         | ❌ No   | ✅ Yes       |

\*Stock is ONLY modified via GRN approval or DPR approval, never directly

---

## 📊 Data Flow Diagrams

### Stock Increase Flow (GRN Approval)

```
Site Engineer         Manager              Database
     |                   |                     |
     |--Create GRN------>|                     |
     |  (PENDING)        |                     |
     |                   |                     |
     |                   |--Approve GRN------->|
     |                   |                     |
     |                   |                 [Transaction]
     |                   |                 1. Update GRN → APPROVED
     |                   |                 2. Update projects.current_invested
     |                   |                 3. UPSERT project_material_stock
     |                   |                 4. INSERT material_ledger (IN)
     |                   |                 5. CREATE audit_logs
     |                   |                 [COMMIT]
     |                   |                     |
     |<--Notification----|<--------------------|
```

### Stock Decrease Flow (DPR Approval)

```
Site Engineer         Manager              Database
     |                   |                     |
     |--Submit DPR------>|                     |
     |  (material_usage) |                     |
     |                   |                     |
     |                   |--Approve DPR------->|
     |                   |  with material[]    |
     |                   |                 [Transaction]
     |                   |                 1. Validate stock >= usage
     |                   |                 2. INSERT material_consumption_records
     |                   |                 3. UPDATE project_material_stock (decrease)
     |                   |                 4. INSERT material_ledger (OUT)
     |                   |                 5. UPDATE dprs → APPROVED
     |                   |                 [COMMIT or ROLLBACK if insufficient]
     |                   |                     |
     |<--Notification----|<--------------------|
```

---

## 🛡️ Transaction Safety

### GRN Approval Transaction

```sql
BEGIN;
  -- 1. Validate GRN status
  -- 2. Calculate investment
  UPDATE projects SET current_invested = current_invested + $grn_total;

  -- 3. For each material:
  INSERT INTO project_material_stock (...)
  ON CONFLICT (project_id, material_name, unit)
  DO UPDATE SET available_quantity = available_quantity + $qty;

  INSERT INTO material_ledger (...);

  -- 4. Update GRN
  UPDATE goods_receipt_notes SET status = 'APPROVED';

  -- 5. Audit & notifications
  INSERT INTO audit_logs (...);
COMMIT; -- Or ROLLBACK on ANY error
```

### DPR Approval Transaction

```sql
BEGIN;
  -- 1. Validate stock for ALL materials FIRST
  FOR EACH material:
    SELECT available_quantity FROM project_material_stock WHERE ...;
    IF available < required THEN ROLLBACK;

  -- 2. If all validations pass, proceed
  FOR EACH material:
    INSERT INTO material_consumption_records (...);
    UPDATE project_material_stock SET available_quantity = available_quantity - $qty;
    INSERT INTO material_ledger (...);

  UPDATE dprs SET status = 'APPROVED';
COMMIT; -- Or ROLLBACK if ANY step fails
```

---

## 🧪 Testing Scenarios

### Scenario 1: Happy Path - GRN to Consumption

```
1. Site Engineer creates Material Request → PENDING
2. Manager approves Material Request → APPROVED
3. Purchase Manager creates PO → SENT
4. Site Engineer creates GRN (received 100 bags cement) → PENDING
5. Manager approves GRN → Stock increases by 100
   ✅ projects.current_invested updated
   ✅ project_material_stock shows 100 bags
6. Site Engineer submits DPR with material_usage: 50 bags
7. Manager approves DPR → Stock decreases by 50
   ✅ material_consumption_records created
   ✅ project_material_stock shows 50 bags remaining
```

### Scenario 2: Insufficient Stock

```
1. Current stock: 30 bags cement
2. Site Engineer submits DPR with material_usage: 50 bags
3. Manager attempts to approve DPR
   ❌ Response: 400 Bad Request
   ❌ Error: "Insufficient stock for Cement. Available: 30 bags, Required: 50 bags"
   ✅ Stock unchanged
   ✅ DPR remains PENDING
```

### Scenario 3: Idempotency Test

```
1. Manager approves GRN (id: abc-123)
   ✅ Stock increased
2. Manager attempts to approve same GRN again
   ❌ Response: 400 Bad Request
   ❌ Error: "GRN is already APPROVED"
   ✅ Stock not double-counted
```

---

## 📝 API Usage Examples

### Example 1: Manager Approves GRN

```bash
curl -X PATCH http://localhost:3001/manager/goods-receipt-notes/abc-123/approve \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=..." \
  -d '{
    "managerFeedback": "Received in good condition"
  }'

# Response:
{
  "message": "GRN approved successfully",
  "validation_results": [
    {
      "material_name": "Cement",
      "status": "MATCHED",
      "quantity": 100
    }
  ],
  "grn_id": "abc-123"
}
```

### Example 2: Manager Approves DPR with Consumption

```bash
curl -X PATCH http://localhost:3001/manager/dprs/xyz-456/review \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=..." \
  -d '{
    "status": "APPROVED",
    "remarks": "Good progress",
    "material_usage": [
      {
        "material_name": "Cement",
        "unit": "bags",
        "quantity_used": 50
      },
      {
        "material_name": "Steel Rods",
        "unit": "kg",
        "quantity_used": 120
      }
    ]
  }'

# Response:
{
  "dpr": { /* DPR details */ },
  "material_consumed": [
    { "material_name": "Cement", "unit": "bags", "quantity_used": 50 },
    { "material_name": "Steel Rods", "unit": "kg", "quantity_used": 120 }
  ]
}
```

### Example 3: Owner Views Investment Summary

```bash
curl -X GET http://localhost:3001/owner/material-oversight/projects/investment-summary \
  --cookie "connect.sid=..."

# Response:
{
  "projects": [
    {
      "id": "proj-001",
      "project_name": "Pearl Tower",
      "budget": 5000000,
      "current_invested": 1250000,
      "budget_used_percentage": 25.00,
      "status": "ACTIVE"
    }
  ],
  "summary": {
    "total_budget": 5000000,
    "total_invested": 1250000,
    "overall_percentage": "25.00"
  }
}
```

---

## ⚠️ Important Notes

### What Was NOT Changed

- ❌ No database schema modifications
- ❌ No changes to authentication/authorization
- ❌ No changes to existing material request creation
- ❌ No changes to purchase order flow
- ❌ No accounting, GST, or payment features added

### Backward Compatibility

- ✅ All existing routes continue to work unchanged
- ✅ Existing GRN approval still works (just enhanced)
- ✅ Existing DPR approval still works (consumption is optional)
- ✅ `material_ledger` entries still created for audit trail

### Future Enhancements (Not Implemented)

- Material price tracking per GRN
- Stock alerts/notifications when low
- Material forecasting based on consumption patterns
- Vendor-wise material quality tracking
- Stock transfer between projects

---

## 🚀 Deployment Checklist

Before deploying to production:

1. ✅ Verify all tables exist in production database
2. ✅ Test GRN approval flow end-to-end
3. ✅ Test DPR approval with material consumption
4. ✅ Test insufficient stock scenario
5. ✅ Verify Owner investment summary displays correctly
6. ✅ Check audit logs are being created
7. ✅ Verify notifications are sent to Site Engineers
8. ✅ Test access control (Engineer cannot approve GRN)
9. ✅ Verify transaction rollbacks work correctly
10. ✅ Load test with concurrent GRN approvals

---

## 📞 Support

For issues or questions about this implementation:

- Check audit_logs table for approval history
- Review material_ledger for complete audit trail
- Verify project_material_stock for current inventory
- Check material_consumption_records for usage history

---

**Implementation Date:** January 25, 2026
**Version:** 1.0.0
**Status:** ✅ Complete and Ready for Testing
