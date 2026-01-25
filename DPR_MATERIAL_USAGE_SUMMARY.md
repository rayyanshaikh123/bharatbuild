# DPR Material Usage Integration - Implementation Summary

## ✅ Changes Completed

### 1. Backend Changes

#### Database Migration

- **File Created**: `migrations/add_material_usage_to_dprs.sql`
- **File Created**: `apply_migration_manual.sql` (manual migration instructions)
- **Changes**:
  - Added `material_usage JSONB` column to `dprs` table
  - Default value: `'[]'::jsonb`
  - Added GIN index for performance
  - **Action Required**: Run the migration manually (see instructions below)

#### Backend Routes Updated

**File**: `routes/engineer/dpr.js`

- ✅ Modified DPR creation endpoint to accept `material_usage` array
- ✅ Added validation for material_usage format
- ✅ Stores material_usage in database with DPR
- ✅ Updated INSERT query to include material_usage column
- ✅ Syntax validated successfully

**File**: `routes/manager/dpr.js`

- ✅ Modified DPR approval endpoint to use stored material_usage from DPR
- ✅ Falls back to DPR's stored material_usage if not provided in approval request
- ✅ Supports Manager adding additional materials (merges arrays)
- ✅ Validates stock availability before deduction
- ✅ Deducts stock only on approval
- ✅ Syntax validated successfully

### 2. Flutter App Changes

**File**: `app/lib/screens/engineer/dpr_form.dart`

- ✅ Removed separate inventory recording loop (lines 77-89 removed)
- ✅ Added `material_usage` field to DPR submission payload
- ✅ Material usage now sent as: `[{material_name, quantity_used, unit}]`
- ✅ Added comment explaining stock deduction happens on Manager approval

## 📋 Manual Steps Required

### Run Database Migration

**Option 1: Using psql command line**

```bash
cd /Users/chiteshvarun/Documents/GitHub/bharatbuild/backend
psql -U your_username -d bharatbuilddb -f apply_migration_manual.sql
```

**Option 2: Using pgAdmin or database client**

1. Open your database client
2. Connect to `bharatbuilddb`
3. Open `backend/apply_migration_manual.sql`
4. Execute the SQL script

**Option 3: Direct SQL**
Run this SQL directly in your database:

```sql
ALTER TABLE dprs ADD COLUMN IF NOT EXISTS material_usage JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_dprs_material_usage ON dprs USING gin(material_usage);
```

### Verify Migration

After running migration, verify with:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'dprs' AND column_name = 'material_usage';
```

Expected result:

```
column_name    | data_type | column_default
---------------+-----------+----------------
material_usage | jsonb     | '[]'::jsonb
```

## 🔄 Updated Data Flow

### Before (Old Flow - Had Issues)

```
Engineer submits DPR
  → Material usage recorded to inventory immediately (separate API)
  → DPR created WITHOUT material_usage
  → Manager approves DPR
  → ❌ No stock deduction (material usage not linked to DPR)
```

### After (New Flow - Correct)

```
Engineer submits DPR
  → DPR created WITH material_usage array stored
  → Stock NOT touched yet
  ↓
Manager reviews DPR
  → Sees Engineer's material usage
  → Can optionally add more materials
  → Approves DPR
  ↓
Backend validates stock
  → Checks available_quantity >= quantity_used for each material
  → If insufficient: Reject with error
  → If sufficient:
      • Deducts from project_material_stock
      • Inserts into material_consumption_records
      • Inserts into material_ledger
      • Updates DPR status to APPROVED
```

## 🧪 Testing Scenarios

### Test 1: Engineer submits DPR with materials

1. Open Flutter app
2. Create DPR with material usage (e.g., Cement: 50kg)
3. Submit DPR
4. **Verify**:
   - DPR created in database
   - `material_usage` column has data: `[{"material_name":"Cement","quantity_used":50,"unit":"kg"}]`
   - Stock is NOT deducted yet

### Test 2: Manager approves DPR (uses Engineer's materials)

1. Manager logs in (web)
2. Views DPR
3. Approves without adding materials
4. **Verify**:
   - DPR status = APPROVED
   - Stock deducted (e.g., Cement: 200kg → 150kg)
   - Entry in `material_consumption_records`

### Test 3: Insufficient stock validation

1. Engineer submits DPR with Cement: 500kg
2. Available stock: Cement: 100kg
3. Manager tries to approve
4. **Verify**:
   - Returns error: "Insufficient stock for Cement. Available: 100 kg, Required: 500 kg"
   - DPR remains PENDING
   - Stock unchanged

## 📂 Files Modified

```
backend/
├── migrations/
│   └── add_material_usage_to_dprs.sql (NEW)
├── apply_migration_manual.sql (NEW)
├── run_migration.js (NEW - for automated migration)
├── routes/
│   ├── engineer/
│   │   └── dpr.js (MODIFIED - accepts material_usage)
│   └── manager/
│       └── dpr.js (MODIFIED - uses stored material_usage)

app/
└── lib/
    └── screens/
        └── engineer/
            └── dpr_form.dart (MODIFIED - sends material_usage with DPR)
```

## ⚠️ Breaking Changes

**None** - The changes are backward compatible:

- Old DPRs without `material_usage` will have default `[]`
- Material usage is optional (Manager can approve without it)
- If Engineer doesn't send material_usage, column stores empty array

## 🎯 Next Steps (Web Frontend - Not Yet Started)

After migration is successful, implement web frontend changes as per plan:

1. Manager DPR review page - Display Engineer's pre-submitted materials
2. Manager can add additional materials (optional)
3. Show stock availability and validation

## 📝 Notes

- Database migration failed due to connection issue - **Needs manual execution**
- All code changes are complete and syntax validated
- Flutter app change is ready (no compilation needed until testing)
- Backend routes are ready to use after migration

---

**Status**: ✅ Code Implementation Complete | ⏳ Database Migration Pending
**Date**: 2026-01-25
