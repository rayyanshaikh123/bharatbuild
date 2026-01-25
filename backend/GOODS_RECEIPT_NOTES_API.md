# Goods Receipt Notes (GRN) API Documentation

## Overview

The Goods Receipt Notes (GRN) system provides a proper verification workflow for material receipts at construction sites. This feature fills the missing piece in the procurement workflow by enabling:

- Site Engineers to record physical receipt of materials with proof
- Managers to verify received quantities against Purchase Orders
- Proper audit trail for procurement
- Material ledger entries ONLY after Manager approval

## Database Tables

### `goods_receipt_notes`

Main table storing GRN records with approval workflow.

**Columns:**

- `id` (UUID): Primary key
- `project_id` (UUID): FK to projects
- `purchase_order_id` (UUID): FK to purchase_orders
- `material_request_id` (UUID): FK to material_requests
- `received_items` (JSONB): Array of `[{ material_name, quantity_received, unit }]`
- `received_at` (TIMESTAMP): Auto-set to NOW()
- `received_by` (UUID): FK to site_engineers
- `bill_image` (BYTEA): Vendor bill image
- `bill_image_mime` (TEXT): MIME type
- `delivery_proof_image` (BYTEA): Delivery proof image
- `delivery_proof_image_mime` (TEXT): MIME type
- `status` (TEXT): PENDING | APPROVED | REJECTED
- `manager_feedback` (TEXT): Manager's review comments
- `reviewed_by` (UUID): FK to managers
- `reviewed_at` (TIMESTAMP): Review timestamp
- `created_at` (TIMESTAMP): Auto-set to NOW()

### Related Table Changes

**`purchase_orders`**

- Added: `grn_created` (BOOLEAN DEFAULT false)
- Updated to `true` when GRN is approved

**`material_bills`**

- Added: `grn_id` (UUID, FK to goods_receipt_notes)
- Links bills to GRNs for comparison

---

## Workflow

### Step 1: Site Engineer Creates GRN

1. Site Engineer receives materials at site
2. Takes photos of vendor bill and delivery proof
3. Records actual quantities received
4. Creates GRN via API (status = PENDING)
5. GRN is **NOT auto-approved**
6. No material_ledger entries created yet

### Step 2: Manager Reviews GRN

1. Manager receives notification
2. Views GRN with comparison data:
   - PO items vs Received items
   - Bill amounts (if linked)
3. Can approve or reject with feedback

### Step 3: On Approval

1. GRN status → APPROVED
2. `purchase_orders.grn_created` → true
3. Material ledger entries created (movement_type = IN, source = BILL)
4. Audit log created
5. Site Engineer notified

### Step 4: On Rejection

1. GRN status → REJECTED
2. Manager feedback stored
3. No ledger entries created
4. Site Engineer notified to re-create GRN

---

## Site Engineer Routes

### 1. Create GRN

**POST** `/engineer/goods-receipt-notes`

Create a new Goods Receipt Note with images.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**

```
projectId: <uuid>
purchaseOrderId: <uuid>
materialRequestId: <uuid>
receivedItems: '[{"material_name":"Cement","quantity_received":100,"unit":"bags"}]'
bill_image: <file>
delivery_proof_image: <file>
```

**receivedItems** must be JSON string with array of:

```json
[
  {
    "material_name": "Cement",
    "quantity_received": 100,
    "unit": "bags"
  }
]
```

**Success Response (201):**

```json
{
  "message": "Goods Receipt Note created successfully. Pending manager approval.",
  "grn": {
    "id": "uuid",
    "project_id": "uuid",
    "purchase_order_id": "uuid",
    "material_request_id": "uuid",
    "received_by": "uuid",
    "status": "PENDING",
    "created_at": "2026-01-25T10:30:00Z",
    "received_at": "2026-01-25T10:30:00Z"
  }
}
```

**Error Responses:**

- **400**: Missing fields, invalid JSON, or missing images
- **403**: No access to project
- **404**: PO or Material Request not found
- **500**: Server error

**Validations:**

- Site Engineer must have APPROVED access to project
- Purchase Order must belong to same project
- Material Request must match PO's material_request_id
- Both images (bill_image, delivery_proof_image) required
- receivedItems must be non-empty array

**Audit Log:**

- Action: `GRN_CREATED`
- Category: `PROCUREMENT`
- Role: `SITE_ENGINEER`

---

### 2. List GRNs by Project

**GET** `/engineer/goods-receipt-notes?projectId=<uuid>&status=<PENDING|APPROVED|REJECTED>`

Get all GRNs for a project (no images in response).

**Query Parameters:**

- `projectId` (required): Project UUID
- `status` (optional): Filter by status

**Success Response (200):**

```json
{
  "grns": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "purchase_order_id": "uuid",
      "material_request_id": "uuid",
      "received_by": "uuid",
      "status": "PENDING",
      "received_items": [
        { "material_name": "Cement", "quantity_received": 100, "unit": "bags" }
      ],
      "manager_feedback": null,
      "reviewed_by": null,
      "created_at": "2026-01-25T10:30:00Z",
      "received_at": "2026-01-25T10:30:00Z",
      "reviewed_at": null,
      "bill_image_mime": "image/jpeg",
      "delivery_proof_image_mime": "image/jpeg",
      "po_number": "PO-2026-001",
      "vendor_name": "ABC Suppliers",
      "material_request_title": "Cement for Foundation",
      "reviewed_by_name": null
    }
  ]
}
```

---

### 3. Get Single GRN

**GET** `/engineer/goods-receipt-notes/:grnId`

Get detailed GRN with PO and MR information.

**Success Response (200):**

```json
{
  "grn": {
    "id": "uuid",
    "project_id": "uuid",
    "purchase_order_id": "uuid",
    "material_request_id": "uuid",
    "received_by": "uuid",
    "status": "PENDING",
    "received_items": [...],
    "manager_feedback": null,
    "po_number": "PO-2026-001",
    "vendor_name": "ABC Suppliers",
    "po_items": [...],
    "total_amount": 50000,
    "material_request_title": "Cement for Foundation",
    "requested_items": [...],
    "reviewed_by_name": null,
    "received_by_name": "John Doe"
  }
}
```

---

### 4. Get Bill Image

**GET** `/engineer/goods-receipt-notes/:grnId/bill-image`

Stream bill image.

**Success Response (200):**

- Content-Type: image/jpeg (or actual MIME type)
- Content-Disposition: inline
- Binary image data

---

### 5. Get Delivery Proof Image

**GET** `/engineer/goods-receipt-notes/:grnId/delivery-proof-image`

Stream delivery proof image.

**Success Response (200):**

- Content-Type: image/jpeg (or actual MIME type)
- Content-Disposition: inline
- Binary image data

---

## Manager Routes

### 6. List GRNs by Project (Manager)

**GET** `/manager/goods-receipt-notes?projectId=<uuid>&status=<PENDING|APPROVED|REJECTED>`

Get all GRNs for manager's projects.

**Query Parameters:**

- `projectId` (required): Project UUID
- `status` (optional): Filter by status

**Success Response (200):**
Same as Site Engineer list, with additional fields:

```json
{
  "grns": [
    {
      ...
      "received_by_name": "John Doe"
    }
  ]
}
```

**Access Control:**

- Manager must be ACTIVE in project OR project creator

---

### 7. Get Single GRN (Manager)

**GET** `/manager/goods-receipt-notes/:grnId`

Get GRN with all comparison data for verification.

**Success Response (200):**

```json
{
  "grn": {
    "id": "uuid",
    "project_id": "uuid",
    "purchase_order_id": "uuid",
    "material_request_id": "uuid",
    "received_by": "uuid",
    "status": "PENDING",
    "received_items": [
      { "material_name": "Cement", "quantity_received": 95, "unit": "bags" }
    ],
    "po_items": [
      {
        "material_name": "Cement",
        "quantity": 100,
        "unit": "bags",
        "rate": 500
      }
    ],
    "requested_items": [
      { "material_name": "Cement", "quantity": 100, "unit": "bags" }
    ],
    "po_number": "PO-2026-001",
    "vendor_name": "ABC Suppliers",
    "total_amount": 50000,
    "material_request_title": "Cement for Foundation",
    "project_name": "Site A Construction",
    "received_by_name": "John Doe",
    "reviewed_by_name": null
  }
}
```

---

### 8. Approve GRN

**POST** `/manager/goods-receipt-notes/:grnId/approve`

Approve GRN and create material ledger entries.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**

```json
{
  "managerFeedback": "Approved. Short received 5 bags, acceptable."
}
```

**Success Response (200):**

```json
{
  "message": "GRN approved successfully",
  "validation_results": [
    {
      "material_name": "Cement",
      "status": "SHORT_RECEIVED",
      "po_quantity": 100,
      "received_quantity": 95,
      "difference": 5
    }
  ],
  "grn_id": "uuid"
}
```

**Validation Statuses:**

- `MATCHED`: Received quantity = PO quantity
- `SHORT_RECEIVED`: Received < PO quantity
- `OVER_RECEIVED`: Received > PO quantity
- `NOT_IN_PO`: Material not found in PO

**Actions on Approval:**

1. Update `goods_receipt_notes.status` = 'APPROVED'
2. Update `goods_receipt_notes.reviewed_by` = manager ID
3. Update `goods_receipt_notes.reviewed_at` = NOW()
4. Update `purchase_orders.grn_created` = true
5. Insert material_ledger entries:
   - `movement_type` = 'IN'
   - `source` = 'BILL'
   - `recorded_by_role` = 'MANAGER'
   - `reference_id` = GRN ID
   - `reference_type` = 'GRN'
6. Create audit log (GRN_APPROVED)
7. Notify Site Engineer

**Error Responses:**

- **400**: GRN already approved/rejected
- **403**: No access to project
- **404**: GRN not found
- **500**: Server error

---

### 9. Reject GRN

**POST** `/manager/goods-receipt-notes/:grnId/reject`

Reject GRN with mandatory feedback.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**

```json
{
  "managerFeedback": "Images are unclear. Please retake and resubmit."
}
```

**Success Response (200):**

```json
{
  "message": "GRN rejected successfully",
  "grn_id": "uuid"
}
```

**Actions on Rejection:**

1. Update `goods_receipt_notes.status` = 'REJECTED'
2. Update `goods_receipt_notes.reviewed_by` = manager ID
3. Update `goods_receipt_notes.reviewed_at` = NOW()
4. Update `goods_receipt_notes.manager_feedback` = feedback
5. **NO** material_ledger entries created
6. **NO** purchase_orders.grn_created update
7. Create audit log (GRN_REJECTED)
8. Notify Site Engineer

**Error Responses:**

- **400**: Missing managerFeedback or GRN already processed
- **403**: No access to project
- **404**: GRN not found
- **500**: Server error

---

### 10. Get Bill Image (Manager)

**GET** `/manager/goods-receipt-notes/:grnId/bill-image`

Stream bill image for verification.

**Success Response (200):**
Binary image data with proper Content-Type.

---

### 11. Get Delivery Proof Image (Manager)

**GET** `/manager/goods-receipt-notes/:grnId/delivery-proof-image`

Stream delivery proof image for verification.

**Success Response (200):**
Binary image data with proper Content-Type.

---

## Verification Logic

### PO vs GRN Comparison

When Manager approves GRN, system automatically compares:

```javascript
For each received item:
  Find matching PO item by material_name

  If not found in PO:
    → Status: NOT_IN_PO

  Else:
    If received_qty < po_qty:
      → Status: SHORT_RECEIVED
      → Show difference

    Else if received_qty > po_qty:
      → Status: OVER_RECEIVED
      → Show difference

    Else:
      → Status: MATCHED
```

**Example Validation Results:**

```json
[
  {
    "material_name": "Cement",
    "status": "MATCHED",
    "quantity": 100
  },
  {
    "material_name": "Steel Bars",
    "status": "SHORT_RECEIVED",
    "po_quantity": 200,
    "received_quantity": 190,
    "difference": 10
  },
  {
    "material_name": "Bricks",
    "status": "OVER_RECEIVED",
    "po_quantity": 5000,
    "received_quantity": 5100,
    "difference": 100
  }
]
```

---

## Security & Access Control

### Site Engineer Access

- Must be in `project_site_engineers` with status = 'APPROVED'
- Can only create GRNs for their approved projects
- Can only view GRNs for their projects

### Manager Access

- Must be ACTIVE in `project_managers` OR be the project creator
- Can approve/reject any GRN in their projects
- Full visibility of all GRNs in managed projects

### Image Handling

- Images stored as BYTEA in database
- **NOT** returned in list APIs (performance)
- Separate streaming endpoints for images
- Access control enforced on image endpoints

---

## Audit & Notifications

### Audit Logs

All actions create audit_logs entries:

**GRN_CREATED:**

```json
{
  "entity_type": "GOODS_RECEIPT_NOTE",
  "action": "GRN_CREATED",
  "acted_by_role": "SITE_ENGINEER",
  "category": "PROCUREMENT",
  "change_summary": {
    "purchase_order_id": "uuid",
    "material_request_id": "uuid",
    "items_count": 3,
    "bill_image_size": 156789,
    "delivery_proof_size": 234567
  }
}
```

**GRN_APPROVED:**

```json
{
  "entity_type": "GOODS_RECEIPT_NOTE",
  "action": "GRN_APPROVED",
  "acted_by_role": "MANAGER",
  "category": "PROCUREMENT",
  "change_summary": {
    "purchase_order_id": "uuid",
    "material_request_id": "uuid",
    "items_count": 3,
    "validation_results": [...],
    "manager_feedback": "Approved"
  }
}
```

**GRN_REJECTED:**

```json
{
  "entity_type": "GOODS_RECEIPT_NOTE",
  "action": "GRN_REJECTED",
  "acted_by_role": "MANAGER",
  "category": "PROCUREMENT",
  "change_summary": {
    "purchase_order_id": "uuid",
    "material_request_id": "uuid",
    "manager_feedback": "Images unclear"
  }
}
```

### Notifications

System creates notifications for:

**On GRN Approval:**

- To: Site Engineer who created GRN
- Title: "GRN Approved"
- Message: "Your Goods Receipt Note for PO {po_number} has been approved by the manager."
- Category: PROCUREMENT

**On GRN Rejection:**

- To: Site Engineer who created GRN
- Title: "GRN Rejected"
- Message: "Your Goods Receipt Note for PO {po_number} has been rejected. Reason: {manager_feedback}"
- Category: PROCUREMENT

---

## Material Ledger Integration

### On Approval Only

When Manager approves GRN, entries are created in `material_ledger`:

```sql
INSERT INTO material_ledger (
  project_id,
  material_name,
  quantity,
  unit,
  movement_type,
  source,
  recorded_by_role,
  recorded_by_id,
  reference_id,
  reference_type,
  remarks
) VALUES (
  <project_id>,
  <material_name>,
  <quantity_received>,
  <unit>,
  'IN',                -- Movement type
  'BILL',              -- Source
  'MANAGER',           -- Recorded by role
  <manager_id>,        -- Recorded by ID
  <grn_id>,            -- Reference ID
  'GRN',               -- Reference type
  'GRN {po_number} - Approved by Manager'
);
```

**Important:**

- Material ledger entries created **ONLY** on approval
- No entries on rejection
- movement_type = 'IN' (materials coming into site)
- source = 'BILL' (from vendor bill)

---

## Error Handling

### Common Errors

**Missing Images:**

```json
{
  "error": "Both bill_image and delivery_proof_image are required"
}
```

**Invalid JSON:**

```json
{
  "error": "receivedItems must be valid JSON"
}
```

**PO-MR Mismatch:**

```json
{
  "error": "Material request ID does not match the purchase order"
}
```

**Already Processed:**

```json
{
  "error": "GRN is already APPROVED"
}
```

**No Access:**

```json
{
  "error": "You do not have access to this project"
}
```

---

## Best Practices

### For Site Engineers

1. Take clear photos of vendor bills and delivery challans
2. Record actual quantities received (not PO quantities)
3. Note any damage or shortages in remarks
4. Create GRN immediately upon receipt

### For Managers

1. Compare GRN items vs PO items before approving
2. Check bill amounts vs PO amounts
3. Provide clear feedback when rejecting
4. Approve only after verifying images

### For System Integration

1. Do not return images in list APIs
2. Use streaming endpoints for images
3. Check status before processing
4. Validate all UUIDs (no parseInt)
5. Use transactions for approval/rejection

---

## Database Constraints

### Status Values

- `goods_receipt_notes.status`: PENDING | APPROVED | REJECTED
- Default: PENDING

### Foreign Keys

- All UUID fields properly linked
- ON DELETE CASCADE for project_id
- ON DELETE RESTRICT for purchase_order_id and material_request_id

### Unique Constraints

- No duplicate constraints (multiple GRNs allowed per PO)

---

## Testing Checklist

- [ ] Site Engineer can create GRN with images
- [ ] GRN defaults to PENDING status
- [ ] No material_ledger entries on GRN creation
- [ ] Manager can view pending GRNs
- [ ] Manager can approve GRN
- [ ] Approval creates material_ledger entries
- [ ] Approval sets grn_created = true on PO
- [ ] Validation results show MATCHED/SHORT/OVER status
- [ ] Manager can reject GRN with feedback
- [ ] Rejection does NOT create ledger entries
- [ ] Cannot approve/reject already processed GRN
- [ ] Images stream correctly via separate endpoints
- [ ] Notifications sent to Site Engineer
- [ ] Audit logs created for all actions
- [ ] Access control enforced for all routes

---

## Migration Notes

### From Old `grns` Table

This implementation uses the new `goods_receipt_notes` table with:

- Proper approval workflow (PENDING → APPROVED/REJECTED)
- Manager review required
- Material ledger integration on approval only

The old `grns` table (with CREATED/VERIFIED status) remains for backward compatibility but is separate from this workflow.

### Key Differences

| Feature  | Old `grns`              | New `goods_receipt_notes`        |
| -------- | ----------------------- | -------------------------------- |
| Status   | CREATED/VERIFIED        | PENDING/APPROVED/REJECTED        |
| Column   | site_engineer_id        | received_by                      |
| Images   | bill_image, proof_image | bill_image, delivery_proof_image |
| Approval | Auto or manual          | Manager required                 |
| Ledger   | Manual insertion        | Auto on approval                 |
| Feedback | remarks                 | manager_feedback                 |

---

## API Endpoints Summary

### Site Engineer Routes (`/engineer/goods-receipt-notes`)

- `POST /` - Create GRN
- `GET /` - List GRNs
- `GET /:grnId` - Get single GRN
- `GET /:grnId/bill-image` - Stream bill image
- `GET /:grnId/delivery-proof-image` - Stream delivery proof

### Manager Routes (`/manager/goods-receipt-notes`)

- `GET /` - List GRNs
- `GET /:grnId` - Get single GRN with details
- `PATCH /:grnId/approve` - Approve GRN
- `PATCH /:grnId/reject` - Reject GRN
- `GET /:grnId/bill-image` - Stream bill image
- `GET /:grnId/delivery-proof-image` - Stream delivery proof

Total: **11 endpoints** (5 Site Engineer, 6 Manager)
