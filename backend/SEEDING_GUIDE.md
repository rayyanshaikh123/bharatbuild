# 📊 BharatBuild - Complete Data Seeding Guide

## Available Seed Scripts

This document lists all the data that can be seeded for the **vasantdada patil** project.

---

## ✅ Already Seeded

### 1. **Labour & Wages** (`seed_labour_wages.js`)

**Status:** ✅ Completed

**Data Created:**

- **20 Labourers** (8 skilled, 7 semi-skilled, 5 unskilled)
  - Mason, Electrician, Plumber, Carpenter, Welder
  - Painter, Helper, Tiles worker
  - Cleaner, Watchman, Material carrier
- **30 Wage Rates** (hourly rates: ₹38-95)
- **208 Attendance Records** (last 15 working days)
- **177 Wage Entries** (₹92,764.50 total)

**Usage:**

```bash
node seed_labour_wages.js
```

---

### 2. **Material Inventory** (`seed_material_inventory.js`)

**Status:** ✅ Completed

**Data Created:**

- **15 Material Requests**
  - 8 Approved, 6 Pending, 1 Rejected
  - Categories: Cement, Steel, Bricks, Sand, Aggregates, Tiles, Paint, Electrical, Plumbing, Hardware
- **8 Purchase Orders** (6 sent, 2 draft)
- **6 GRNs** (Goods Receipt Notes)
- **5 Approved Bills** (₹40.55 Lakhs invested)
- **4 Materials in Stock** (1,320 units total)
- **4 Consumption Records**
- **Complete Material Ledger** (IN/OUT movements)

**Usage:**

```bash
node seed_material_inventory.js
```

---

### 3. **Plans & Timeline** (`seed_plans_timeline.js`)

**Status:** ✅ Completed

**Data Created:**

- **1 Project Plan**
- **21 Plan Items** (Construction phases)
  - 7 Completed (Foundation phase)
  - 2 In Progress (Ground floor)
  - 12 Pending (Upper floors & finishing)
- **Timeline Coverage:** Weeks 1-47 (nearly 1 year)

**Phases:**

1. Foundation (Weeks 1-4) - Completed
2. Ground Floor (Weeks 5-12) - In Progress
3. First Floor (Weeks 13-20) - Pending
4. Second Floor (Weeks 21-28) - Pending
5. Roofing & Finishing (Weeks 29-47) - Pending

**Usage:**

```bash
node seed_plans_timeline.js
```

---

## 🔜 Available for Seeding (Not Yet Created)

### 4. **DPRs (Daily Progress Reports)**

**Proposed:** `seed_dprs.js`

**What can be seeded:**

- Daily progress reports for completed plan items
- Work descriptions and progress percentages
- Images (optional - base64 encoded)
- Material usage linked to DPRs
- Site engineer submissions
- Manager approvals/rejections

**Estimated Data:**

- 50-60 DPRs over last 90 days
- Linked to completed and in-progress tasks
- Material consumption from stock

**Why seed this:**

- Owner/Manager dashboard analytics
- Progress tracking validation
- Material consumption reporting
- Historical data for AI insights

---

### 5. **Tool Management** (`seed_tools.js`)

**Proposed:** `seed_tools.js`

**What can be seeded:**

- **Project Tools** (equipment inventory)
  - Concrete mixers, drilling machines, scaffolding
  - Hand tools, safety equipment
  - QR codes for tool tracking
- **Tool Transactions** (issue/return records)
  - Tool assignments to labourers
  - Return dates and conditions
  - Damage/loss tracking

**Estimated Data:**

- 30-40 tools
- 100+ tool transactions
- QR code generation for tracking

**Why seed this:**

- Tool management feature testing
- QR code scanning workflows
- Tool utilization reports

---

### 6. **Dangerous Work Permits** (`seed_dangerous_work.js`)

**Proposed:** `seed_dangerous_work.js`

**What can be seeded:**

- **Dangerous Tasks** defined for project
  - Electrical work at height
  - Welding operations
  - Excavation work
  - Chemical handling
- **Permit Requests** from labourers
- **OTP-based Approvals**
- **Safety compliance records**

**Estimated Data:**

- 5-8 dangerous task types
- 20-30 permit requests
- Approval workflows with OTP logs

**Why seed this:**

- Safety compliance tracking
- OTP approval workflow testing
- Dangerous work reporting

---

### 7. **Subcontractor Management** (`seed_subcontractors.js`)

**Proposed:** `seed_subcontractors.js`

**What can be seeded:**

- **Subcontractors** (specialized contractors)
  - Electrical contractors
  - Plumbing contractors
  - Painting contractors
  - Tiling specialists
- **Task Assignments** to subcontractors
- **Quality Reviews** (ratings 1-5)
- **Speed Ratings** (performance tracking)

**Estimated Data:**

- 5-7 subcontractors
- 10-15 task assignments
- Quality and speed ratings

**Why seed this:**

- Subcontractor performance tracking
- Task delegation workflows
- Quality control reporting

---

### 8. **Project Breaks & Delays** (`seed_delays.js`)

**Proposed:** `seed_delays.js`

**What can be seeded:**

- **Project Breaks** (tea breaks, lunch, weather delays)
- **Delay Records** linked to plan items
- **Delay Reasons and Analysis**
- **Impact on timeline**

**Estimated Data:**

- 50+ break records
- 5-10 delay incidents
- Delay impact calculations

**Why seed this:**

- Timeline delay tracking
- Break compliance monitoring
- Schedule variance analysis

---

### 9. **QA Inspections** (`seed_qa_inspections.js`)

**Proposed:** `seed_qa_inspections.js`

**What can be seeded:**

- **QA Engineer assignments** to project
- **Quality Inspection Records**
- **Task quality reviews**
- **Compliance checklists**

**Estimated Data:**

- QA engineer assignment
- 15-20 inspection records
- Quality pass/fail reports

**Why seed this:**

- Quality assurance workflows
- Inspection tracking
- Compliance reporting

---

### 10. **Audit Logs & Notifications** (`seed_audit_notifications.js`)

**Proposed:** `seed_audit_notifications.js`

**What can be seeded:**

- **Audit Logs** for all entity changes
- **User Notifications**
  - DPR approvals
  - Material request updates
  - Wage approvals
  - Safety alerts

**Estimated Data:**

- 200+ audit log entries
- 100+ notifications

**Why seed this:**

- Audit trail validation
- Notification system testing
- Activity tracking

---

### 11. **Attendance Sessions & Face Verification** (`seed_attendance_advanced.js`)

**Proposed:** `seed_attendance_advanced.js`

**What can be seeded:**

- **Multiple check-in/out sessions** per day
- **Geofence breach records**
- **Face verification data** (mock)
- **Manual attendance entries**

**Estimated Data:**

- 300+ attendance sessions
- Geofence tracking
- Face verification logs

**Why seed this:**

- Advanced attendance tracking
- Multi-session support
- Geofence compliance

---

### 12. **Manual Labours** (`seed_manual_labour.js`)

**Proposed:** `seed_manual_labour.js`

**What can be seeded:**

- **Manual Labour Entries** (non-registered workers)
- **Attendance for manual labours**
- **Wage calculations**

**Estimated Data:**

- 10-15 manual labour entries
- Attendance records
- Wage tracking

**Why seed this:**

- Temporary worker tracking
- Manual attendance workflows
- Casual labour management

---

## 📦 Combined Seed Script (All-in-One)

### **Proposed:** `seed_complete_project.js`

A comprehensive script that seeds all data in the correct order:

1. Labour & Wages
2. Material Inventory
3. Plans & Timeline
4. DPRs with material usage
5. Tools & Tool transactions
6. Dangerous work permits
7. Subcontractors & assignments
8. Project delays
9. QA inspections
10. Audit logs & notifications

**Usage:**

```bash
node seed_complete_project.js
```

**Benefits:**

- Single command for full project setup
- Proper dependency ordering
- Comprehensive test data
- Ready for demo/testing immediately

---

## 🎯 Summary

### Currently Seeded (3 scripts):

1. ✅ Labour & Wages (20 workers, 208 attendance, ₹92K wages)
2. ✅ Material Inventory (15 requests, 8 POs, 6 GRNs, ₹40.55L invested)
3. ✅ Plans & Timeline (21 tasks across 47 weeks)

### Available to Seed (9 more areas):

4. 🔜 DPRs (Daily Progress Reports)
5. 🔜 Tool Management
6. 🔜 Dangerous Work Permits
7. 🔜 Subcontractor Management
8. 🔜 Project Delays & Breaks
9. 🔜 QA Inspections
10. 🔜 Audit Logs & Notifications
11. 🔜 Advanced Attendance Features
12. 🔜 Manual Labour Management

### Total Potential Features:

- **12+ Seedable Areas**
- **1000+ Database Records**
- **Complete Project Lifecycle Coverage**

---

## 🚀 Next Steps

To continue seeding data, let me know which area you'd like to populate next:

1. **DPRs** - Most impactful for dashboards
2. **Tools** - For tool management testing
3. **Dangerous Work** - For safety compliance
4. **Subcontractors** - For quality tracking
5. **All of the above** - Complete project seed

Would you like me to create any of these seed scripts?
