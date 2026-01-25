# Material Stock API Routes - Quick Reference

## 🔵 MANAGER ROUTES

### Material Stock Management

```
GET  /manager/material-stock/projects/:projectId/material-stock
GET  /manager/material-stock/projects/:projectId/material-consumption
GET  /manager/material-stock/projects/:projectId/stock-summary
```

### GRN Approval (EXTENDED)

```
PATCH /manager/goods-receipt-notes/:grnId/approve
PATCH /manager/goods-receipt-notes/:grnId/reject
```

### DPR Approval with Consumption (EXTENDED)

```
PATCH /manager/dprs/:dprId/review
Body: {
  status: "APPROVED" | "REJECTED",
  remarks: string,
  material_usage?: [
    {
      material_name: string,
      unit: string,
      quantity_used: number
    }
  ]
}
```

---

## 🟢 SITE ENGINEER ROUTES

### Material Stock (Read-Only)

```
GET /engineer/material-stock/projects/:projectId/material-stock
```

### Existing Routes (Unchanged)

```
POST /engineer/material/request           # Create material request
GET  /engineer/material/requests          # View my requests
POST /engineer/grns                       # Create GRN (PENDING)
GET  /engineer/grns                       # View my GRNs
```

---

## 🟡 OWNER ROUTES

### Investment & Material Oversight

```
GET /owner/material-oversight/projects/investment-summary
GET /owner/material-oversight/projects/:projectId/material-stock
GET /owner/material-oversight/projects/:projectId/grns
GET /owner/material-oversight/grns/audit
GET /owner/material-oversight/projects/:projectId/material-consumption
```

---

## 📊 Response Schemas

### Stock Response

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

### Consumption Response

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

### Investment Summary Response

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

## ⚠️ Error Responses

### 400 - Insufficient Stock

```json
{
  "error": "Insufficient stock for Cement. Available: 30 bags, Required: 50 bags"
}
```

### 400 - Already Approved

```json
{
  "error": "GRN is already APPROVED"
}
```

### 403 - Access Denied

```json
{
  "error": "Access denied. Not an active manager in the project."
}
```

### 404 - Not Found

```json
{
  "error": "GRN not found"
}
```

---

## 🔐 Authentication

All routes require:

- Valid session cookie (`connect.sid`)
- Appropriate role (OWNER/MANAGER/SITE_ENGINEER)
- Project access permissions

---

## 📝 Notes

1. **GRN Approval** automatically updates:
   - `project_material_stock` (increases)
   - `projects.current_invested` (adds cost)
   - `material_ledger` (audit trail)

2. **DPR Approval with material_usage** automatically:
   - Validates stock availability
   - Decreases `project_material_stock`
   - Records in `material_consumption_records`
   - Updates `material_ledger` (OUT entries)

3. **Stock queries** are always current (no caching)

4. **Transactions** ensure atomic operations (all-or-nothing)
