# Frontend Integration Plan - Material Stock Management System

## Overview

This document outlines the **planning phase** for integrating the newly implemented backend material stock management routes into the frontend (Web & Flutter App). This is **NOT an implementation guide** - it's a comprehensive plan that respects existing styling patterns and component architecture.

---

## 1. Web Frontend (Next.js) - Integration Plan

### 1.1 API Client Extensions

#### File: `frontend/lib/api/manager.ts`

**Current State:** 652 lines, has existing manager API methods  
**Required Changes:**

- Add TypeScript interfaces for Material Stock responses
- Add new API methods in `managerMaterialStock` namespace:

  ```typescript
  export interface MaterialStock {
    material_name: string;
    total_ordered: number;
    total_received: number;
    total_consumed: number;
    available_quantity: number;
    unit: string;
  }

  export interface MaterialConsumption {
    dpr_id: string;
    report_date: string;
    material_name: string;
    quantity_used: number;
    unit: string;
    used_by_name: string;
  }

  export interface StockSummary {
    total_materials_tracked: number;
    total_value_received: number;
    total_materials_in_stock: number;
  }

  export const managerMaterialStock = {
    getProjectStock: (projectId: string) =>
      api.get<{ stock: MaterialStock[] }>(
        `/manager/material-stock/projects/${projectId}/material-stock`,
      ),

    getConsumptionHistory: (projectId: string) =>
      api.get<{ consumption: MaterialConsumption[] }>(
        `/manager/material-stock/material-consumption?project_id=${projectId}`,
      ),

    getStockSummary: (projectId: string) =>
      api.get<{ summary: StockSummary }>(
        `/manager/material-stock/stock-summary?project_id=${projectId}`,
      ),
  };
  ```

**Pattern to Follow:** Matches existing `managerOrganization`, `managerProjects` namespace pattern

---

#### File: `frontend/lib/api/owner.ts`

**Current State:** 484 lines, has owner API methods  
**Required Changes:**

- Add TypeScript interfaces for Owner oversight responses
- Add new API methods in `ownerMaterialOversight` namespace:

  ```typescript
  export interface InvestmentSummary {
    project_id: string;
    project_name: string;
    total_budget: number;
    current_invested: number;
    remaining_budget: number;
    total_materials_received: number;
  }

  export interface MaterialStockOverview {
    project_id: string;
    material_name: string;
    total_ordered: number;
    total_received: number;
    total_consumed: number;
    available_quantity: number;
    unit: string;
  }

  export interface GRNOverview {
    grn_id: string;
    project_name: string;
    po_number: string;
    vendor_name: string;
    approved_at: string;
    total_value: number;
  }

  export interface MaterialAudit {
    project_id: string;
    project_name: string;
    material_name: string;
    total_received: number;
    total_consumed: number;
    available_quantity: number;
    unit: string;
  }

  export const ownerMaterialOversight = {
    getInvestmentSummary: (organizationId: string) =>
      api.get<{ projects: InvestmentSummary[] }>(
        `/owner/material-oversight/investment-summary?organization_id=${organizationId}`,
      ),

    getMaterialStock: (organizationId: string, projectId?: string) => {
      const url = projectId
        ? `/owner/material-oversight/material-stock?organization_id=${organizationId}&project_id=${projectId}`
        : `/owner/material-oversight/material-stock?organization_id=${organizationId}`;
      return api.get<{ stock: MaterialStockOverview[] }>(url);
    },

    getApprovedGRNs: (organizationId: string, projectId?: string) => {
      const url = projectId
        ? `/owner/material-oversight/grns?organization_id=${organizationId}&project_id=${projectId}`
        : `/owner/material-oversight/grns?organization_id=${organizationId}`;
      return api.get<{ grns: GRNOverview[] }>(url);
    },

    getMaterialAudit: (organizationId: string) =>
      api.get<{ audit: MaterialAudit[] }>(
        `/owner/material-oversight/audit?organization_id=${organizationId}`,
      ),

    getConsumptionHistory: (organizationId: string, projectId?: string) => {
      const url = projectId
        ? `/owner/material-oversight/consumption?organization_id=${organizationId}&project_id=${projectId}`
        : `/owner/material-oversight/consumption?organization_id=${organizationId}`;
      return api.get<{ consumption: MaterialConsumption[] }>(url);
    },
  };
  ```

**Pattern to Follow:** Matches existing `ownerOrganization`, `ownerProfile` namespace pattern

---

#### File: `frontend/lib/api/engineer.ts` (NEW FILE)

**Current State:** Does not exist  
**Required Changes:**

- Create new file following the pattern of `manager.ts` and `owner.ts`
- Add engineer material stock API methods:

  ```typescript
  import { api } from "../api";

  export interface EngineerMaterialStock {
    material_name: string;
    available_quantity: number;
    unit: string;
    total_received: number;
    total_consumed: number;
  }

  export const engineerMaterialStock = {
    getProjectStock: (projectId: string) =>
      api.get<{ stock: EngineerMaterialStock[] }>(
        `/engineer/material-stock/projects/${projectId}/material-stock`,
      ),
  };
  ```

**Pattern to Follow:** Match the file structure of `manager.ts` and `owner.ts`

---

### 1.2 Modified Pages - Manager Flow

#### Page: `frontend/app/(dashboard)/manager/grn/[id]/page.tsx`

**Current State:**

- 321 lines total
- Has GRN approval/rejection modal
- Shows comparison between PO and received items
- Uses `managerGrn.approve(id, remarks)` API call (line ~125)

**Required UI Changes:**

1. **Add Investment Impact Section** (before approval buttons):
   - Calculate total GRN value: `sum(received_items.quantity_received * po_items.rate)` for matching materials
   - Display in a card: "Investment Impact"
     - Total GRN Value: ₹XX,XXX
     - Current Project Investment: ₹XX,XXX (fetch from project data)
     - New Investment After Approval: ₹XX,XXX + GRN Value
   - Use existing `glass-card` styling pattern
   - Show warning badge if new investment exceeds budget

2. **Success Toast Enhancement:**
   - After approval, toast should show: "GRN Approved & Stock Updated. Investment: ₹XX,XXX added"

**Component Pattern:**

```tsx
{
  /* Add before approval buttons section */
}
<div className="glass-card rounded-2xl p-6">
  <h3 className="font-semibold mb-4 flex items-center gap-2">
    <DollarSign size={18} className="text-primary" />
    Investment Impact
  </h3>
  <div className="grid grid-cols-3 gap-4">
    <div className="p-4 bg-muted/30 rounded-xl border border-border">
      <p className="text-xs text-muted-foreground mb-1">GRN Total Value</p>
      <p className="text-xl font-mono font-bold">
        ₹{grnTotalValue.toLocaleString()}
      </p>
    </div>
    <div className="p-4 bg-muted/30 rounded-xl border border-border">
      <p className="text-xs text-muted-foreground mb-1">Current Investment</p>
      <p className="text-xl font-mono font-bold">
        ₹{currentInvestment.toLocaleString()}
      </p>
    </div>
    <div className="p-4 bg-muted/30 rounded-xl border border-border">
      <p className="text-xs text-muted-foreground mb-1">After Approval</p>
      <p className="text-xl font-mono font-bold">
        ₹{(currentInvestment + grnTotalValue).toLocaleString()}
      </p>
    </div>
  </div>
  {currentInvestment + grnTotalValue > projectBudget && (
    <Badge className="mt-3 bg-orange-500/10 text-orange-600 border-0">
      <AlertTriangle size={12} className="mr-1" />
      Investment will exceed budget
    </Badge>
  )}
</div>;
```

**Data Requirements:**

- Fetch project details to get `budget` and `current_invested`
- Calculate GRN total value client-side for preview

**Styling Pattern:** Use existing `glass-card`, `Badge`, and grid layout from current page

---

#### Page: `frontend/app/(dashboard)/manager/dprs/[id]/page.tsx`

**Current State:**

- 252 lines total
- Has DPR approval/rejection modal
- Calls `managerDpr.review(dprId, status, remarks)` (line ~93)
- Currently NO material consumption input

**Required UI Changes:**

1. **Add Material Usage Section** (after work description, before review actions):
   - Multi-row input form for material consumption
   - Each row: Material dropdown (from project stock), Quantity input, Unit (auto-filled)
   - "Add Material" button to add more rows
   - "Remove" button for each row
   - Show available stock next to material selection
   - Validation: Quantity must be ≤ available stock
   - **Display existing material_usage if DPR already has it** (read-only if status is APPROVED/REJECTED)

2. **Modify Review API Call:**
   - Send `material_usage` array in approval request body
   - Structure: `[{material_name, quantity_used, unit}]`
   - **Note:** Material usage is submitted by Engineer during DPR creation, Manager only reviews it

3. **Stock Availability Display:**
   - Fetch project stock when page loads
   - Show real-time available quantity as user selects materials
   - Red badge if selected quantity > available
   - **Show stock impact preview:** "After approval, Cement stock: 100kg → 80kg"

**Component Pattern:**

```tsx
{/* Add Material Usage Section */}
<div className="glass-card rounded-2xl p-6">
  <h3 className="font-bold mb-4 flex items-center gap-2">
    <Package size={18} className="text-primary" />
    Material Usage (Optional)
  </h3>

  {materialUsage.map((item, idx) => (
    <div key={idx} className="flex gap-3 mb-3">
      <select
        value={item.material_name}
        onChange={(e) => handleMaterialChange(idx, e.target.value)}
        className="flex-1 p-3 rounded-xl bg-background border border-border text-sm"
        disabled={dpr.status !== 'PENDING'}
      >
        <option value="">Select Material</option>
        {projectStock.map(stock => (
          <option key={stock.material_name} value={stock.material_name}>
            {stock.material_name} (Available: {stock.available_quantity} {stock.unit})
          </option>
        ))}
      </select>

      <input
        type="number"
        value={item.quantity_used}
        onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value))}
        placeholder="Quantity"
        className="w-32 p-3 rounded-xl bg-background border border-border text-sm"
        disabled={dpr.status !== 'PENDING'}
      />

      <span className="flex items-center text-muted-foreground text-sm px-3">
        {item.unit || '-'}
      </span>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => removeMaterialRow(idx)}
        disabled={dpr.status !== 'PENDING'}
      >
        <X size={16} />
      </Button>
    </div>
  ))}

  <Button
    variant="outline"
    size="sm"
    onClick={addMaterialRow}
    disabled={dpr.status !== 'PENDING'}
  >
    <Plus size={14} className="mr-2" /> Add Material
  </Button>
</div>

{/* Update handleReview function */}
const handleReview = async (status: "APPROVED" | "REJECTED") => {
  // Validation for material usage
  if (status === "APPROVED") {
    for (const item of materialUsage.filter(m => m.material_name)) {
      const stock = projectStock.find(s => s.material_name === item.material_name);
      if (stock && item.quantity_used > stock.available_quantity) {
        toast.error(`Insufficient stock for ${item.material_name}`);
        return;
      }
    }
  }

  try {
    setIsReviewing(true);
    const payload = {
      status,
      remarks,
      material_usage: materialUsage.filter(m => m.material_name && m.quantity_used > 0)
    };
    await managerDpr.review(dprId, payload);
    // ... rest of code
  }
}
```

**Data Requirements:**

- Fetch project material stock on page load using new `managerMaterialStock.getProjectStock(projectId)` API
- Store in state: `projectStock`
- Manage `materialUsage` state array

**Styling Pattern:** Use existing `glass-card`, form input styling from review section

---

#### File: `frontend/lib/api/dpr.ts` (Modification Required)

**Current Function:** `managerDpr.review(dprId, status, remarks)`  
**Required Change:**

```typescript
// OLD:
review: (dprId: string, status: string, remarks: string) =>
  api.post(`/manager/dpr/review/${dprId}`, { status, remarks });

// NEW:
review: (
  dprId: string,
  payload: {
    status: "APPROVED" | "REJECTED";
    remarks: string;
    material_usage?: Array<{
      material_name: string;
      quantity_used: number;
      unit: string;
    }>;
  },
) => api.post(`/manager/dpr/review/${dprId}`, payload);
```

---

### 1.3 New Pages - Manager Flow

#### Page: `frontend/app/(dashboard)/manager/material-stock/page.tsx` (NEW)

**Purpose:** Manager stock viewing dashboard  
**Required Features:**

1. Project selector (same pattern as GRN/DPR pages)
2. Three tabs:
   - **Current Stock** - Table showing all materials with available quantities
   - **Consumption History** - Table showing DPR-wise material usage
   - **Stock Summary** - Card-based summary stats

**Layout Pattern:**

```tsx
"use client";
import { useState, useEffect } from "react";
import { ProjectSelector } from "@/components/dashboard/ProjectSelector";
import { DataTable } from "@/components/ui/DataTable";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { managerMaterialStock } from "@/lib/api/manager";

export default function MaterialStockPage() {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeTab, setActiveTab] = useState<"stock" | "consumption" | "summary">("stock");
  const [stockData, setStockData] = useState([]);
  const [consumptionData, setConsumptionData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);

  // Fetch logic based on activeTab

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      <DashboardHeader
        userName={user?.name?.split(" ")[0]}
        title="Material Stock Management"
      />

      <ProjectSelector
        projects={projects}
        selectedId={selectedProjectId}
        onSelect={setSelectedProjectId}
      />

      {/* Tabs */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex gap-4 border-b border-border mb-6">
          <button onClick={() => setActiveTab("stock")} className={...}>
            Current Stock
          </button>
          <button onClick={() => setActiveTab("consumption")} className={...}>
            Consumption History
          </button>
          <button onClick={() => setActiveTab("summary")} className={...}>
            Summary
          </button>
        </div>

        {activeTab === "stock" && <StockTable data={stockData} />}
        {activeTab === "consumption" && <ConsumptionTable data={consumptionData} />}
        {activeTab === "summary" && <SummaryCards data={summaryData} />}
      </div>
    </div>
  );
}
```

**Component Patterns:**

- Use `DataTable` component (same as GRN/DPR pages)
- Use `Badge` for stock status (low/normal/adequate)
- Use `glass-card` for containers
- Use grid layout for summary cards (3-column like other dashboards)

**Columns for Stock Table:**

- Material Name
- Total Ordered
- Total Received
- Total Consumed
- Available Quantity (with unit)
- Status Badge (red if < 10%, yellow if < 30%, green otherwise)

**Columns for Consumption Table:**

- Report Date
- DPR ID (link to DPR details)
- Material Name
- Quantity Used
- Used By (Engineer name)

---

### 1.4 New Pages - Owner Flow

#### Page: `frontend/app/(dashboard)/owner/investment-overview/page.tsx` (NEW)

**Purpose:** Owner investment tracking dashboard  
**Required Features:**

1. Investment Summary Cards (all projects)
2. Project-wise investment breakdown table
3. Filter by project (optional)

**Layout Pattern:**

```tsx
export default function InvestmentOverviewPage() {
  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      <DashboardHeader title="Investment Overview" />

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <p className="text-xs text-muted-foreground mb-1">Total Budget</p>
          <p className="text-3xl font-bold">₹{totalBudget.toLocaleString()}</p>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <p className="text-xs text-muted-foreground mb-1">Total Invested</p>
          <p className="text-3xl font-bold text-green-500">
            ₹{totalInvested.toLocaleString()}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <p className="text-xs text-muted-foreground mb-1">Remaining Budget</p>
          <p className="text-3xl font-bold text-blue-500">
            ₹{remainingBudget.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Investment Table */}
      <DataTable
        data={investmentData}
        columns={investmentColumns}
        searchKeys={["project_name"]}
      />
    </div>
  );
}
```

**Styling Pattern:** Match existing owner dashboard pages

---

#### Page: `frontend/app/(dashboard)/owner/material-audit/page.tsx` (NEW)

**Purpose:** Owner material audit across all projects  
**Required Features:**

1. Organization-wide material stock view
2. Project filter dropdown
3. GRN history table
4. Consumption audit table

**Layout Pattern:** Similar to Manager's material-stock page but with organization-level data

---

### 1.5 Navigation Updates

#### File: `frontend/components/dashboard/DashboardSidebar.tsx`

**Current State:** Has `managerNavItems` array (around line 50-150)  
**Required Changes:**

1. **Add to Manager Navigation:**

```typescript
const managerNavItems = [
  // ... existing items
  {
    label: "Material Stock",
    href: "/manager/material-stock",
    icon: Package, // import from lucide-react
  },
  // ... rest
];
```

2. **Add to Owner Navigation:**

```typescript
const ownerNavItems = [
  // ... existing items
  {
    label: "Investment Overview",
    href: "/owner/investment-overview",
    icon: DollarSign,
  },
  {
    label: "Material Audit",
    href: "/owner/material-audit",
    icon: FileBarChart,
  },
  // ... rest
];
```

**Pattern:** Follow existing navigation item structure

---

## 2. Flutter App - Integration Plan

### 2.1 Overview

**Current State:**

- Flutter app has NO Manager or Owner screens (confirmed via file search)
- Only Site Engineer, QA, and Labour flows exist
- Engineer has `material_management_screen.dart` with TabController (Requests/Inventory)

**Strategy:**

- Add material stock viewing to **Engineer flow only**
- **Add material usage input to DPR submission screen**
- Manager and Owner functionality remains **Web-only**

---

### 2.2 API Service Layer

#### File: `app/lib/api/material_stock_service.dart` (NEW)

**Purpose:** API client for engineer material stock endpoint  
**Required Implementation:**

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

class MaterialStockService {
  static const String baseUrl = 'YOUR_API_URL'; // Same as auth_service.dart

  static Future<List<MaterialStock>> getProjectStock(String projectId) async {
    final token = await AuthService.getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/engineer/material-stock/projects/$projectId/material-stock'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return (data['stock'] as List)
          .map((item) => MaterialStock.fromJson(item))
          .toList();
    } else {
      throw Exception('Failed to load material stock');
    }
  }
}

class MaterialStock {
  final String materialName;
  final double availableQuantity;
  final String unit;
  final double totalReceived;
  final double totalConsumed;

  MaterialStock({
    required this.materialName,
    required this.availableQuantity,
    required this.unit,
    required this.totalReceived,
    required this.totalConsumed,
  });

  factory MaterialStock.fromJson(Map<String, dynamic> json) {
    return MaterialStock(
      materialName: json['material_name'],
      availableQuantity: (json['available_quantity'] as num).toDouble(),
      unit: json['unit'],
      totalReceived: (json['total_received'] as num).toDouble(),
      totalConsumed: (json['total_consumed'] as num).toDouble(),
    );
  }
}
```

**Pattern:** Follow existing `auth_service.dart` structure

---

### 2.3 Riverpod Provider

#### File: `app/lib/providers/material_stock_provider.dart` (NEW)

**Purpose:** State management for material stock  
**Required Implementation:**

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/material_stock_service.dart';

final materialStockProvider = FutureProvider.family<List<MaterialStock>, String>((ref, projectId) async {
  return MaterialStockService.getProjectStock(projectId);
});
```

**Pattern:** Follow existing `material_provider.dart` and `inventory_provider.dart` pattern

---

### 2.4 Screen Modification

#### File: `app/lib/screens/engineer/material_management_screen.dart`

**Current State:**

- 419 lines total
- Has TabController with 2 tabs: "Requests" and "Inventory"
- Line 1-100 shows imports and basic structure

**Required Changes:**

1. **Add third tab:** "Stock Availability"
2. **Update TabController length:** from 2 to 3
3. **Add new tab view:** `_buildStockAvailability()`

**Code Pattern:**

```dart
@override
void initState() {
  super.initState();
  _tabController = TabController(length: 3, vsync: this); // Changed from 2 to 3
}

// In AppBar bottom:
TabBar(
  controller: _tabController,
  tabs: [
    Tab(text: 'requests'.tr()),
    Tab(text: 'inventory'.tr()),
    Tab(text: 'stock_availability'.tr()), // NEW
  ],
),

// In TabBarView:
TabBarView(
  controller: _tabController,
  children: [
    _buildRequestsList(),
    _buildInventoryList(),
    _buildStockAvailability(), // NEW
  ],
),

// New widget:
Widget _buildStockAvailability() {
  final currentProjectId = ref.watch(currentProjectProvider)?.id;

  if (currentProjectId == null) {
    return Center(child: Text('no_project_selected'.tr()));
  }

  final stockAsync = ref.watch(materialStockProvider(currentProjectId));

  return stockAsync.when(
    data: (stockList) {
      if (stockList.isEmpty) {
        return Center(child: Text('no_stock_data'.tr()));
      }

      return RefreshIndicator(
        onRefresh: () async => ref.refresh(materialStockProvider(currentProjectId).future),
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: stockList.length,
          itemBuilder: (context, index) {
            final stock = stockList[index];
            return _buildStockCard(stock);
          },
        ),
      );
    },
    loading: () => const Center(child: CircularProgressIndicator()),
    error: (err, _) => Center(child: Text('Error: $err')),
  );
}

Widget _buildStockCard(MaterialStock stock) {
  final theme = Theme.of(context);

  // Color coding based on availability
  Color statusColor;
  String statusText;
  if (stock.availableQuantity == 0) {
    statusColor = Colors.red;
    statusText = 'out_of_stock'.tr();
  } else if (stock.availableQuantity < stock.totalReceived * 0.3) {
    statusColor = Colors.orange;
    statusText = 'low_stock'.tr();
  } else {
    statusColor = Colors.green;
    statusText = 'in_stock'.tr();
  }

  return Card(
    margin: const EdgeInsets.only(bottom: 12),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  stock.materialName,
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: statusColor.withOpacity(0.3)),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildStockMetric('available'.tr(), '${stock.availableQuantity} ${stock.unit}', Colors.blue),
              ),
              Expanded(
                child: _buildStockMetric('received'.tr(), '${stock.totalReceived} ${stock.unit}', Colors.green),
              ),
              Expanded(
                child: _buildStockMetric('consumed'.tr(), '${stock.totalConsumed} ${stock.unit}', Colors.orange),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

Widget _buildStockMetric(String label, String value, Color color) {
  return Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: TextStyle(fontSize: 11, color: Colors.grey[600]),
      ),
      const SizedBox(height: 4),
      Text(
        value,
        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color),
      ),
    ],
  );
}
```

**Styling Pattern:**

- Use existing Card widget pattern from `_buildRequestCard` (line ~90)
- Use theme colors from `AppColors` or `Theme.of(context)`
- Follow existing padding/margin patterns (16px standard)
- Use RefreshIndicator like in `_buildRequestsList` (line ~71)

**Localization Required:**
Add to `app/assets/translations/en.json`:

```json
{
  "stock_availability": "Stock Availability",
  "no_stock_data": "No stock data available",
  "out_of_stock": "Out of Stock",
  "low_stock": "Low Stock",
  "in_stock": "In Stock",
  "available": "Available",
  "received": "Received",
  "consumed": "Consumed"
}
```

---

## 3. Summary of Changes

### Web Frontend Changes

| File                                                          | Type   | Changes                                                   |
| ------------------------------------------------------------- | ------ | --------------------------------------------------------- |
| `frontend/lib/api/manager.ts`                                 | Modify | Add `managerMaterialStock` namespace with 3 methods       |
| `frontend/lib/api/owner.ts`                                   | Modify | Add `ownerMaterialOversight` namespace with 5 methods     |
| `frontend/lib/api/engineer.ts`                                | Create | New file with `engineerMaterialStock` namespace           |
| `frontend/lib/api/dpr.ts`                                     | Modify | Update `review()` method to accept `material_usage` array |
| `frontend/app/(dashboard)/manager/grn/[id]/page.tsx`          | Modify | Add Investment Impact section before approval             |
| `frontend/app/(dashboard)/manager/dprs/[id]/page.tsx`         | Modify | Add Material Usage input section                          |
| `frontend/app/(dashboard)/manager/material-stock/page.tsx`    | Create | New page with 3 tabs (Stock/Consumption/Summary)          |
| `frontend/app/(dashboard)/owner/investment-overview/page.tsx` | Create | New page with investment tracking                         |
| `frontend/app/(dashboard)/owner/material-audit/page.tsx`      | Create | New page with material audit across projects              |
| `frontend/components/dashboard/DashboardSidebar.tsx`          | Modify | Add 3 new navigation items (1 Manager, 2 Owner)           |

### Flutter App Changes

| File                                                       | Type   | Changes                                                                 |
| ---------------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| `app/lib/api/material_stock_service.dart`                  | Create | New API service for engineer stock endpoint                             |
| `app/lib/providers/material_stock_provider.dart`           | Create | New Riverpod provider for stock data                                    |
| `app/lib/screens/engineer/material_management_screen.dart` | Modify | Add 3rd tab "Stock Availability", implement `_buildStockAvailability()` |
| `app/assets/translations/en.json`                          | Modify | Add 7 new translation keys                                              |

---

## 4. Implementation Priority

### Phase 1 - Critical Backend Integration (Week 1)

1. ✅ **Web:** Update `manager.ts` API client (GRN/DPR approval changes)
2. ✅ **Web:** Modify GRN [id] page - Add investment impact display
3. ✅ **Web:** Modify DPR [id] page - Add material usage input
4. ✅ **Web:** Update `dpr.ts` review method signature

### Phase 2 - Manager Stock Viewing (Week 2)

5. ⏳ **Web:** Complete `managerMaterialStock` API namespace
6. ⏳ **Web:** Create `material-stock/page.tsx` with 3 tabs
7. ⏳ **Web:** Add navigation item to sidebar

### Phase 3 - Owner Oversight (Week 3)

8. ⏳ **Web:** Complete `ownerMaterialOversight` API namespace
9. ⏳ **Web:** Create `investment-overview/page.tsx`
10. ⏳ **Web:** Create `material-audit/page.tsx`
11. ⏳ **Web:** Add 2 navigation items to owner sidebar

### Phase 4 - Engineer Mobile View (Week 4)

12. ⏳ **Flutter:** Create `material_stock_service.dart`
13. ⏳ **Flutter:** Create `material_stock_provider.dart`
14. ⏳ **Flutter:** Modify `material_management_screen.dart` (3rd tab)
15. ⏳ **Flutter:** Add translations

---

## 5. Styling & Component Guidelines

### Web (Next.js)

**DO:**

- ✅ Use `glass-card` class for all container cards
- ✅ Use `DataTable` component from `@/components/ui/DataTable` for tables
- ✅ Use `Badge` component from `@/components/ui/badge` for status indicators
- ✅ Use `Button` component from `@/components/ui/Button`
- ✅ Use `Loader2` from `lucide-react` for loading states
- ✅ Follow grid patterns: 3-column for summary cards, responsive with `md:grid-cols-3`
- ✅ Use `toast.success()` and `toast.error()` from `sonner` for notifications
- ✅ Use `rounded-2xl` for card corners
- ✅ Use `text-muted-foreground` for secondary text
- ✅ Use `font-mono` for numerical values

**DON'T:**

- ❌ Create custom table components (use DataTable)
- ❌ Use hardcoded colors (use theme variables)
- ❌ Ignore mobile responsiveness (always test `md:` breakpoints)

### Flutter App

**DO:**

- ✅ Use `Card` widget with `borderRadius: BorderRadius.circular(12)`
- ✅ Use `Theme.of(context)` for colors
- ✅ Use `RefreshIndicator` for pull-to-refresh
- ✅ Use `CircularProgressIndicator` for loading states
- ✅ Follow 16px padding standard (`EdgeInsets.all(16)`)
- ✅ Use `easy_localization` `.tr()` for all user-facing text
- ✅ Use Riverpod `.watch()` for reactive state
- ✅ Use `Container` with `BoxDecoration` for status badges

**DON'T:**

- ❌ Hardcode strings (always use translations)
- ❌ Use `setState` for async data (use Riverpod providers)
- ❌ Ignore error states in `.when()` callbacks

---

## 6. Testing Checklist

### Web Testing

- [ ] GRN Approval shows correct investment calculation
- [ ] GRN Approval updates project investment in database
- [ ] DPR Approval with material usage validates stock availability
- [ ] DPR Approval decreases stock correctly
- [ ] Manager Material Stock page loads all 3 tabs correctly
- [ ] Owner Investment Overview shows accurate totals
- [ ] Owner Material Audit filters by project correctly
- [ ] Navigation items work correctly
- [ ] Mobile responsive on all new pages

### Flutter Testing

- [ ] Engineer can view material stock for selected project
- [ ] Stock status colors work correctly (red/orange/green)
- [ ] Pull-to-refresh updates stock data
- [ ] Translation keys work in all supported languages
- [ ] 3rd tab loads without errors
- [ ] Empty state shows when no stock data

---

## 7. API Route Mapping Reference

### Manager Routes

| Frontend API Method                                     | Backend Route                                                   | Purpose                                  |
| ------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------- |
| `managerGrn.approve(id, remarks)`                       | `POST /manager/goods-receipt-notes/approve/:id`                 | Approve GRN → Updates stock + investment |
| `managerDpr.review(id, payload)`                        | `POST /manager/dpr/review/:id`                                  | Approve DPR → Validates & consumes stock |
| `managerMaterialStock.getProjectStock(projectId)`       | `GET /manager/material-stock/projects/:id/material-stock`       | View current stock                       |
| `managerMaterialStock.getConsumptionHistory(projectId)` | `GET /manager/material-stock/material-consumption?project_id=X` | View consumption history                 |
| `managerMaterialStock.getStockSummary(projectId)`       | `GET /manager/material-stock/stock-summary?project_id=X`        | View stock summary stats                 |

### Owner Routes

| Frontend API Method                                               | Backend Route                                                                 | Purpose                          |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------- |
| `ownerMaterialOversight.getInvestmentSummary(orgId)`              | `GET /owner/material-oversight/investment-summary?organization_id=X`          | Investment overview all projects |
| `ownerMaterialOversight.getMaterialStock(orgId, projectId?)`      | `GET /owner/material-oversight/material-stock?organization_id=X&project_id=Y` | Stock across projects            |
| `ownerMaterialOversight.getApprovedGRNs(orgId, projectId?)`       | `GET /owner/material-oversight/grns?organization_id=X&project_id=Y`           | All approved GRNs                |
| `ownerMaterialOversight.getMaterialAudit(orgId)`                  | `GET /owner/material-oversight/audit?organization_id=X`                       | Material audit report            |
| `ownerMaterialOversight.getConsumptionHistory(orgId, projectId?)` | `GET /owner/material-oversight/consumption?organization_id=X&project_id=Y`    | Consumption history              |

### Engineer Routes

| Frontend API Method                                | Backend Route                                              | Purpose              |
| -------------------------------------------------- | ---------------------------------------------------------- | -------------------- |
| `engineerMaterialStock.getProjectStock(projectId)` | `GET /engineer/material-stock/projects/:id/material-stock` | Read-only stock view |

---

## 8. Data Flow Diagrams

### GRN Approval Flow (Modified)

```
Manager clicks "Approve GRN"
    ↓
Frontend calculates GRN total value (UI preview)
    ↓
Frontend shows Investment Impact card
    ↓
Manager confirms approval with remarks
    ↓
Frontend calls: managerGrn.approve(id, remarks)
    ↓
Backend (routes/manager/goodsReceiptNotes.js):
    - Calculates GRN total value
    - Updates projects.current_invested
    - UPSERTS project_material_stock for each material
    - Inserts material_ledger entries
    - Updates GRN status to APPROVED
    ↓
Frontend receives success
    ↓
Shows toast: "GRN Approved & Stock Updated"
    ↓
Redirects to /manager/grn
```

### DPR Approval with Material Usage Flow (New)

```
Manager views DPR details page
    ↓
Frontend fetches project material stock
    ↓
Manager adds material usage rows
    ↓
Manager selects materials from dropdown
    ↓
Frontend validates: quantity_used ≤ available_quantity
    ↓
Manager clicks "Approve"
    ↓
Frontend calls: managerDpr.review(id, {status, remarks, material_usage})
    ↓
Backend (routes/manager/dpr.js):
    - Validates stock availability for each material
    - If insufficient: ROLLBACK & return error
    - If sufficient:
        * Updates DPR status to APPROVED
        * Inserts material_consumption_records
        * Updates project_material_stock (decreases available_quantity)
        * Inserts material_ledger entries (CONSUMPTION)
    ↓
Frontend receives success
    ↓
Shows toast: "DPR Approved & Stock Updated"
    ↓
Redirects to /manager/dprs
```

---

## 9. Notes & Considerations

### Security

- All API calls require valid JWT tokens (handled by existing `api.ts` interceptor)
- Backend validates user access (Manager must be in project, Owner must own org, Engineer must have approved access)

### Performance

- Use pagination for large datasets (DataTable component supports this)
- Consider caching project stock data for DPR approval page (avoid refetching on every material selection)

### Error Handling

- Backend returns specific error messages (e.g., "Insufficient stock for Cement")
- Frontend should display these errors in toast notifications
- Validation should happen BOTH client-side (immediate feedback) and server-side (security)

### Future Enhancements (Not in this phase)

- Real-time stock updates using WebSockets
- Export functionality for stock reports (CSV/PDF)
- Stock alerts/notifications when materials run low
- Material forecasting based on consumption trends

---

## 10. Conclusion

This plan provides a complete roadmap for integrating the material stock management backend routes into both web and mobile frontends. The key principles are:

1. **Respect existing patterns:** Use DataTable, glass-card, Badge components that already exist
2. **Minimal disruption:** Extend existing pages rather than rebuilding them
3. **Consistent styling:** Follow the established design system
4. **Progressive enhancement:** Prioritize critical features (GRN/DPR approval changes) first

**Next Step:** Review this plan, get approval, then proceed with Phase 1 implementation.

---

---

## 11. CRITICAL UPDATE: DPR Material Usage Flow (Engineer → Manager Approval)

### Current Implementation Issue

**Problem Identified:**  
The Flutter app (`dpr_form.dart`) currently records material usage to inventory immediately when Engineer submits the DPR, BUT it does NOT send the `material_usage` data to the DPR endpoint. This creates a disconnect:

- Engineer records material OUT movements to inventory (lines 77-89 in dpr_form.dart)
- DPR is created without `material_usage` field
- Manager approval expects `material_usage` in the DPR but it's not there
- Backend cannot validate stock during approval because data is missing

### Correct Flow Required

**Engineer Submits DPR:**

1. Engineer fills material usage in DPR form ✅ (UI exists)
2. Engineer submits DPR → `material_usage` array is sent to backend ❌ (MISSING)
3. Backend stores DPR with `material_usage` in JSONB column ❌ (NEEDS IMPLEMENTATION)
4. Stock is NOT deducted yet (waits for Manager approval) ❌ (NEEDS CHANGE)

**Manager Approves DPR:**

1. Manager views DPR → Sees `material_usage` from Engineer (read-only)
2. Manager can optionally modify/add materials ✅ (Already planned)
3. Manager approves → Backend validates stock & deducts ✅ (Already implemented)

---

### Backend Changes Required

#### 1. Database Migration - Add `material_usage` column to `dprs` table

```sql
-- Migration file: add_material_usage_to_dprs.sql
ALTER TABLE dprs
ADD COLUMN material_usage JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN dprs.material_usage IS 'Array of materials used in this DPR, submitted by Engineer: [{material_name, quantity_used, unit}]';
```

---

#### 2. Backend Route - Modify DPR Creation Endpoint

**File:** `backend/routes/engineer/dpr.js` (or wherever Engineer DPR creation is)

**Find the DPR creation route** (likely `POST /engineer/dpr` or similar):

```javascript
// BEFORE (Current - Does not accept material_usage):
router.post("/create", engineerCheck, async (req, res) => {
  const {
    title,
    description,
    plan_id,
    plan_item_id,
    report_date,
    report_image,
    report_image_mime,
    items,
  } = req.body;

  // ... existing code

  const result = await pool.query(
    `INSERT INTO dprs (project_id, site_engineer_id, title, description, plan_id, plan_item_id, report_date, report_image, items)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      projectId,
      req.user.id,
      title,
      description,
      plan_id,
      plan_item_id,
      report_date,
      imageBuffer,
      items,
    ],
  );
});

// AFTER (New - Accepts and stores material_usage):
router.post("/create", engineerCheck, async (req, res) => {
  const {
    title,
    description,
    plan_id,
    plan_item_id,
    report_date,
    report_image,
    report_image_mime,
    items,
    material_usage, // NEW: Accept material_usage array
  } = req.body;

  // Validate material_usage format
  if (material_usage && !Array.isArray(material_usage)) {
    return res.status(400).json({ error: "material_usage must be an array" });
  }

  // ... existing code

  const result = await pool.query(
    `INSERT INTO dprs (
      project_id, site_engineer_id, title, description, plan_id, plan_item_id, 
      report_date, report_image, items, material_usage
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      projectId,
      req.user.id,
      title,
      description,
      plan_id,
      plan_item_id,
      report_date,
      imageBuffer,
      items,
      JSON.stringify(material_usage || []), // NEW: Store material_usage
    ],
  );
});
```

---

#### 3. Backend Route - Modify DPR Approval to Use Stored Material Usage

**File:** `backend/routes/manager/dpr.js`

**Current State:** Expects `material_usage` in approval payload (line 58-158)  
**Required Change:** If no `material_usage` in payload, use the one stored in DPR

```javascript
// In approve route (around line 58)
router.post("/review/:id", managerCheck, async (req, res) => {
  const { id } = req.params;
  const { status, remarks, material_usage } = req.body; // material_usage is optional now

  // ... existing validation

  if (status === "APPROVED") {
    // NEW: If material_usage not provided in approval, fetch from DPR
    let finalMaterialUsage = material_usage;

    if (!finalMaterialUsage || finalMaterialUsage.length === 0) {
      const dprResult = await pool.query(
        "SELECT material_usage FROM dprs WHERE id = $1",
        [id],
      );
      finalMaterialUsage = dprResult.rows[0]?.material_usage || [];
    }

    // Validate stock availability (existing code, now uses finalMaterialUsage)
    for (const item of finalMaterialUsage) {
      const stockCheck = await pool.query(
        `SELECT available_quantity, unit FROM project_material_stock
         WHERE project_id = $1 AND material_name = $2`,
        [dpr.project_id, item.material_name],
      );

      // ... rest of existing validation logic
    }

    // Deduct stock (existing code, now uses finalMaterialUsage)
    for (const item of finalMaterialUsage) {
      // ... existing stock deduction logic
    }
  }

  // ... rest of approval logic
});
```

---

### Frontend Changes Required

#### Flutter App - Modify DPR Form Submission

**File:** `app/lib/screens/engineer/dpr_form.dart`

**Change 1: Update DPR Payload (line ~130-145)**

```dart
// REMOVE this block (lines 77-89):
// for (var mat in _materialUsage) {
//   if (project != null) {
//     await ref.read(recordMovementProvider({
//       'project_id': project['project_id'] ?? project['id'],
//       'material_name': mat['material_name'],
//       'category': 'Construction',
//       'quantity': mat['quantity'],
//       'unit': mat['unit'] ?? 'units',
//       'movement_type': 'OUT',
//       'source': 'DPR_CONSUMPTION',
//       'remarks': 'Used in DPR: ${_titleController.text}',
//     }).future);
//   }
// }

// UPDATE this block (add material_usage to payload):
final payload = {
  'title': _titleController.text.trim(),
  'description': _descriptionController.text.trim(),
  'plan_id': primaryPlanId,
  'plan_item_id': primaryPlanItemId,
  'report_date': DateFormat('yyyy-MM-dd').format(_reportDate),
  'report_image': base64Image,
  'report_image_mime': mimeType,
  'items': _reportedItems,
  // NEW: Add material_usage to DPR
  'material_usage': _materialUsage.map((mat) => {
    'material_name': mat['material_name'],
    'quantity_used': mat['quantity'],
    'unit': mat['unit'] ?? 'units',
  }).toList(),
};
```

**Impact:** Material usage is now stored with the DPR and will be deducted from stock only when Manager approves it.

---

#### Web Frontend - Manager DPR Review Page

**File:** `frontend/app/(dashboard)/manager/dprs/[id]/page.tsx`

**Change 1: Display Pre-Submitted Material Usage (Read-Only)**

```tsx
// Add state for pre-submitted materials
const [preSubmittedMaterials, setPreSubmittedMaterials] = useState([]);
const [additionalMaterials, setAdditionalMaterials] = useState([]);

// In fetchDpr useEffect:
useEffect(() => {
  const fetchDpr = async () => {
    try {
      setIsLoading(true);
      const res = await managerDpr.getById(dprId);
      setDpr(res.dpr);
      setRemarks(res.dpr.remarks || "");

      // NEW: Load pre-submitted material usage from Engineer
      if (res.dpr.material_usage && Array.isArray(res.dpr.material_usage)) {
        setPreSubmittedMaterials(res.dpr.material_usage);
      }
    } catch (err) {
      // ... error handling
    }
  };
  fetchDpr();
}, [dprId]);

// Add Material Usage Display Section (before Review Actions):
<div className="glass-card rounded-2xl p-6">
  <h3 className="font-bold mb-4 flex items-center gap-2">
    <Package size={18} className="text-primary" />
    Material Usage Reported by Engineer
  </h3>

  {preSubmittedMaterials.length === 0 ? (
    <p className="text-sm text-muted-foreground">No materials reported</p>
  ) : (
    <div className="space-y-2 mb-4">
      {preSubmittedMaterials.map((mat, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border"
        >
          <div>
            <p className="font-medium">{mat.material_name}</p>
            <p className="text-xs text-muted-foreground">Unit: {mat.unit}</p>
          </div>
          <p className="font-mono font-bold">{mat.quantity_used}</p>
        </div>
      ))}
    </div>
  )}

  {dpr.status === "PENDING" && (
    <>
      <hr className="my-4 border-border" />
      <h4 className="font-semibold mb-3 text-sm">
        Add Additional Materials (Optional)
      </h4>

      {additionalMaterials.map((item, idx) => (
        <div key={idx} className="flex gap-3 mb-3">
          {/* Material input form - same as before */}
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addMaterialRow}>
        <Plus size={14} className="mr-2" /> Add Material
      </Button>
    </>
  )}
</div>;

// Update handleReview to combine both material arrays:
const handleReview = async (status: "APPROVED" | "REJECTED") => {
  // Combine pre-submitted and additional materials
  const allMaterials = [
    ...preSubmittedMaterials,
    ...additionalMaterials.filter(
      (m) => m.material_name && m.quantity_used > 0,
    ),
  ];

  // Validate stock for all materials
  if (status === "APPROVED") {
    for (const item of allMaterials) {
      const stock = projectStock.find(
        (s) => s.material_name === item.material_name,
      );
      if (stock && item.quantity_used > stock.available_quantity) {
        toast.error(`Insufficient stock for ${item.material_name}`);
        return;
      }
    }
  }

  try {
    setIsReviewing(true);
    const payload = {
      status,
      remarks,
      // Only send additional materials if Manager added any
      // Backend will use DPR's stored material_usage if this is empty
      material_usage: additionalMaterials.filter(
        (m) => m.material_name && m.quantity_used > 0,
      ),
    };
    await managerDpr.review(dprId, payload);
    toast.success(`DPR ${status === "APPROVED" ? "Approved" : "Rejected"}`);
    router.push("/manager/dprs");
  } catch (err: any) {
    console.error("Review failed:", err);
    toast.error(err.response?.data?.error || "Failed to submit review");
  } finally {
    setIsReviewing(false);
  }
};
```

---

### Updated Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ ENGINEER SUBMITS DPR (Flutter App)                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
    Engineer fills DPR form with material usage
    (e.g., Cement: 50kg, Steel: 100kg)
                          ↓
    Submits DPR with payload:
    {
      title, description, items,
      material_usage: [{material_name, quantity_used, unit}]
    }
                          ↓
    Backend: POST /engineer/dpr/create
    - Validates Engineer access
    - Stores DPR with material_usage JSONB column
    - Status: PENDING
    - Stock is NOT touched yet
                          ↓
    Response: DPR created successfully (ID: 123)

┌─────────────────────────────────────────────────────────────┐
│ MANAGER REVIEWS DPR (Web Frontend)                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
    Manager opens DPR #123
                          ↓
    Frontend: GET /manager/dpr/:id
    - Fetches DPR with material_usage field
    - Displays Engineer's reported materials (read-only)
                          ↓
    Manager sees:
    ✓ Work Description
    ✓ Materials Used by Engineer:
      - Cement: 50kg
      - Steel: 100kg
    ✓ Option to add more materials (optional)
                          ↓
    Manager clicks "Approve" with remarks
                          ↓
    Frontend: POST /manager/dpr/review/:id
    Payload: {
      status: "APPROVED",
      remarks: "Good work",
      material_usage: [] // Empty if no additional materials
    }
                          ↓
    Backend: routes/manager/dpr.js
    - Fetches DPR's stored material_usage (Cement 50kg, Steel 100kg)
    - If payload has material_usage, merges/replaces it
    - Validates stock for ALL materials:
      * Check: Cement available >= 50kg? ✓
      * Check: Steel available >= 100kg? ✓
    - If validation passes:
      BEGIN TRANSACTION
        * Update DPR status → APPROVED
        * Insert material_consumption_records
        * Update project_material_stock:
          - Cement: 200kg → 150kg (available_quantity)
          - Steel: 500kg → 400kg
        * Insert material_ledger entries (CONSUMPTION)
      COMMIT
                          ↓
    Response: {success: true, message: "DPR approved, stock updated"}
                          ↓
    Frontend: Shows toast "DPR Approved & Stock Updated"
                          ↓
    Redirects to /manager/dprs
```

---

### Implementation Checklist

#### Backend

- [ ] Create migration: Add `material_usage JSONB` column to `dprs` table
- [ ] Run migration on database
- [ ] Modify Engineer DPR creation route to accept & store `material_usage`
- [ ] Modify Manager DPR approval route to use stored `material_usage` if not in payload
- [ ] Test: Engineer submits DPR with materials → Check DB has material_usage data
- [ ] Test: Manager approves DPR → Stock deducts correctly

#### Flutter App

- [ ] Remove inventory movement recording loop from `dpr_form.dart` (lines 77-89)
- [ ] Add `material_usage` field to DPR payload in `_submitDPR()` method
- [ ] Test: Submit DPR with materials → Backend receives material_usage array
- [ ] Test: Check DPR in database has material_usage stored

#### Web Frontend

- [ ] Add state for `preSubmittedMaterials` in Manager DPR review page
- [ ] Fetch and display Engineer's material_usage (read-only section)
- [ ] Add section for Manager to add additional materials (optional)
- [ ] Merge both material arrays before approval
- [ ] Update `managerDpr.review()` API call to handle combined materials
- [ ] Test: Manager sees Engineer's materials
- [ ] Test: Manager can add additional materials
- [ ] Test: Approval validates and deducts all materials

---

### Testing Scenarios

**Scenario 1: Engineer submits DPR with materials**

- Engineer creates DPR with Cement (50kg), Steel (100kg)
- Backend stores material_usage in dprs table
- Stock is NOT deducted yet
- ✅ PASS: DPR created with material_usage stored

**Scenario 2: Manager approves without adding materials**

- Manager opens DPR, sees Cement (50kg), Steel (100kg)
- Manager approves with remarks
- Backend uses stored material_usage
- Stock deducts: Cement -50kg, Steel -100kg
- ✅ PASS: Stock updated correctly

**Scenario 3: Manager adds additional materials**

- Manager opens DPR, sees Cement (50kg)
- Manager adds: Bricks (200 pcs)
- Manager approves
- Backend processes: Cement 50kg + Bricks 200pcs
- Stock deducts both
- ✅ PASS: All materials deducted

**Scenario 4: Insufficient stock**

- Engineer submits DPR with Cement (500kg)
- Available stock: Cement (100kg)
- Manager approves
- Backend validates: 500 > 100 ❌
- Returns error: "Insufficient stock for Cement"
- Transaction ROLLBACK
- ✅ PASS: DPR not approved, stock unchanged

---

## 12. Summary of All Changes

### Backend Implementation (CRITICAL - Phase 1)

| File                             | Type   | Changes                                                         |
| -------------------------------- | ------ | --------------------------------------------------------------- |
| `db_migration.sql`               | Create | Add `material_usage JSONB` column to `dprs` table               |
| `backend/routes/engineer/dpr.js` | Modify | Accept `material_usage` in DPR creation, store in DB            |
| `backend/routes/manager/dpr.js`  | Modify | Use stored `material_usage` from DPR if not in approval payload |

### Flutter App (CRITICAL - Phase 1)

| File                                     | Type   | Changes                                                         |
| ---------------------------------------- | ------ | --------------------------------------------------------------- |
| `app/lib/screens/engineer/dpr_form.dart` | Modify | Remove inventory recording, add `material_usage` to DPR payload |

### Web Frontend (HIGH Priority - Phase 2)

| File                                                  | Type   | Changes                                                     |
| ----------------------------------------------------- | ------ | ----------------------------------------------------------- |
| `frontend/app/(dashboard)/manager/dprs/[id]/page.tsx` | Modify | Display pre-submitted materials, allow additional materials |
| `frontend/lib/api/dpr.ts`                             | Modify | Update review method signature (already planned)            |

---

**Document Version:** 2.0  
**Last Updated:** 25 January 2026  
**Status:** PLANNING PHASE - CRITICAL DPR FLOW UPDATED - AWAITING APPROVAL
