# Pearl Project Seed Script

## Overview

This seed script creates realistic test data for the "pearl" project in development/testing environments.

## What Gets Created

### 1. Organization Structure

- **1 Owner** - Owns the organization
- **1 Organization** - "Pearl Construction Pvt. Ltd."
- **1 Manager** - Approved and assigned to organization & project
- **1 Site Engineer** - Approved and assigned to organization & project

### 2. Project

- **Name**: `pearl`
- **Status**: `ACTIVE`
- **Budget**: ₹5 Crore
- **Location**: Sector 15, Noida, UP, India
- **Timeline**: Jan 2026 - Dec 2026
- **Check-in**: 06:00 AM
- **Check-out**: 06:00 PM
- **Geofence**: 500 meters radius

### 3. Labourers (12 total)

Diverse mix of skills:

- **4 SKILLED** - Mason, Electrician, Welder, etc.
- **4 SEMI_SKILLED** - Helper, Painter, Carpenter Helper
- **4 UNSKILLED** - Helper, Cleaner, Loader, Watchman

Each labour has:

- Unique phone number
- Primary location (latitude/longitude)
- Categories/skills
- 5km travel radius

### 4. Wage Rates

Configured hourly rates for project:

- **SKILLED**: ₹70-80/hour
- **SEMI_SKILLED**: ₹50-55/hour
- **UNSKILLED**: ₹35-40/hour

### 5. Attendance Records

For each labour:

- **5 working days** of attendance (excluding Sundays)
- **Status**: APPROVED
- **Source**: ONLINE
- **Face verification**: VERIFIED
- Work hours: 8-10 hours per day

Each attendance includes:

- Morning session (6 hours)
- Lunch break (1 hour)
- Afternoon session (2-4 hours)

### 6. Wages

For each attendance record:

- **Status**: APPROVED
- **is_ready_for_payment**: true
- Calculated: `worked_hours × hourly_rate`
- Linked to attendance, labour, and project

## Prerequisites

1. **PostgreSQL Database Running**

   ```bash
   # Ensure database is accessible
   ```

2. **Database Configuration**
   - Connection string configured in `./db.js`
   - Database schema already created (via `dbupdated.sql`)

3. **Dependencies Installed**
   ```bash
   npm install bcrypt
   ```

## Execution

### Basic Usage

```bash
cd backend
node seed_pearl_project.js
```

### Expected Output

```
🌱 Starting seed script for PEARL project...

1️⃣  Creating Owner...
   ✓ Owner created: abc123...

2️⃣  Creating Organization...
   ✓ Organization created: def456...

3️⃣  Creating Manager...
   ✓ Manager created: ghi789...
   ✓ Manager linked to organization (APPROVED)

4️⃣  Creating Project...
   ✓ Project created: jkl012...
   ✓ Manager assigned to project (ACTIVE)

5️⃣  Creating Site Engineer...
   ✓ Site Engineer created: mno345...
   ✓ Engineer linked to organization (APPROVED)
   ✓ Engineer assigned to project (APPROVED)

6️⃣  Creating Labourers...
   ✓ Created: Rajesh Kumar (pqr678...)
   ✓ Created: Suresh Sharma (stu901...)
   ...

7️⃣  Creating Wage Rates...
   ✓ SKILLED - Mason: ₹75/hr
   ✓ SKILLED - Electrician: ₹80/hr
   ...

8️⃣  Creating Attendance Records & Wages...
   Creating attendance for 5 days...

   📅 2026-01-20:
      ✓ Labour abc123...: 8.5hrs, ₹637.50
      ✓ Labour def456...: 9.2hrs, ₹736.00
      ...

✅ SEED SCRIPT COMPLETED SUCCESSFULLY!

========================================
📊 SUMMARY
========================================
Owner ID:          abc123-def4-5678-90ab-cdef12345678
Organization ID:   def456-789a-bcde-f012-3456789abcde
Manager ID:        ghi789-abcd-ef01-2345-6789abcdef01
Site Engineer ID:  jkl012-3456-789a-bcde-f0123456789a
Project ID:        mno345-6789-abcd-ef01-23456789abcd
Project Name:      pearl
Labourers:         12
Wage Rates:        7
Working Days:      5
Total Attendance:  60
========================================

🔑 TEST CREDENTIALS:
========================================
Owner:
  Email:    owner@pearl.test
  Password: Pearl@Owner123

Manager:
  Email:    manager@pearl.test
  Password: Pearl@Manager123

Site Engineer:
  Email:    engineer@pearl.test
  Password: Pearl@Engineer123
========================================
```

## Test Credentials

### Owner

- **Email**: `owner@pearl.test`
- **Password**: `Pearl@Owner123`
- **Phone**: `+919876543210`

### Manager

- **Email**: `manager@pearl.test`
- **Password**: `Pearl@Manager123`
- **Phone**: `+919876543211`

### Site Engineer

- **Email**: `engineer@pearl.test`
- **Password**: `Pearl@Engineer123`
- **Phone**: `+919876543212`

### Labourers

Phone numbers: `+919876501001` to `+919876501012`

## Re-runnability

The script is **safe to run multiple times**:

- Checks existence before inserting
- Skips existing records
- Uses transactions (rollback on error)
- Logs what was created vs. what already existed

### Example Re-run Output

```
1️⃣  Creating Owner...
   ✓ Owner already exists: abc123...

2️⃣  Creating Organization...
   ✓ Organization already exists: def456...

...
```

## Data Characteristics

### Realistic Attendance

- **Random check-in times**: 6:00 AM - 6:30 AM
- **Varied work hours**: 8-10 hours per day
- **Lunch break**: 12:00 PM - 1:00 PM (1 hour)
- **Sessions tracked**: Morning (6hrs) + Afternoon (2-4hrs)

### Wage Calculation

```javascript
total_amount = worked_hours × hourly_rate

Example:
  Worker: Skilled Mason
  Hours: 9.5
  Rate: ₹75/hr
  Total: ₹712.50
```

### Location Data

- **Project**: Noida, UP (28.6139, 77.209)
- **Labours**: Nearby locations within 5km radius
- **Geofence**: 500m from project site

## Database Tables Populated

1. `owners`
2. `organizations`
3. `managers`
4. `organization_managers`
5. `site_engineers`
6. `organization_site_engineers`
7. `projects`
8. `project_managers`
9. `project_site_engineers`
10. `labours`
11. `wage_rates`
12. `attendance`
13. `attendance_sessions`
14. `wages`

## Safety Features

✅ **Transaction-safe**: All operations wrapped in BEGIN/COMMIT  
✅ **Rollback on error**: Database unchanged if script fails  
✅ **Idempotent**: Safe to run multiple times  
✅ **No production data**: Test credentials only  
✅ **UUID-based**: No integer ID assumptions  
✅ **Constraint-aware**: Respects all foreign keys and checks

## Troubleshooting

### Error: "relation does not exist"

- Ensure database schema is created via `dbupdated.sql`
- Run migrations first

### Error: "duplicate key value"

- Normal behavior if data already exists
- Script will skip and continue

### Error: "bcrypt not found"

```bash
npm install bcrypt
```

### Error: "database connection failed"

- Check `db.js` configuration
- Ensure PostgreSQL is running
- Verify connection string

## Cleanup (Optional)

To remove all seeded data for "pearl" project:

```sql
-- ⚠️ WARNING: This will delete all pearl project data
BEGIN;

-- Delete in reverse dependency order
DELETE FROM wages WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl');
DELETE FROM attendance_sessions WHERE attendance_id IN
  (SELECT id FROM attendance WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl'));
DELETE FROM attendance WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl');
DELETE FROM wage_rates WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl');
DELETE FROM project_site_engineers WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl');
DELETE FROM project_managers WHERE project_id = (SELECT id FROM projects WHERE name = 'pearl');
DELETE FROM projects WHERE name = 'pearl';
-- Keep owner, organization, manager, engineer, labours for reuse

COMMIT;
```

## Development Notes

- **Password hashing**: bcrypt with 10 salt rounds
- **UUID generation**: PostgreSQL `uuid_generate_v4()`
- **Date handling**: JavaScript Date objects
- **Time zones**: UTC timestamps
- **Attendance dates**: Last 5 working days (excludes Sundays)

## Statistics

| Metric              | Value                        |
| ------------------- | ---------------------------- |
| Organizations       | 1                            |
| Projects            | 1                            |
| Users               | 3 (Owner, Manager, Engineer) |
| Labourers           | 12                           |
| Wage Rates          | 7                            |
| Working Days        | 5                            |
| Attendance Records  | 60 (12 labours × 5 days)     |
| Attendance Sessions | 120 (2 per attendance)       |
| Wage Records        | 60                           |
| **Total Records**   | **~270**                     |

## Next Steps

After running the seed script:

1. **Test Login**: Try credentials in your frontend/API
2. **Verify Data**: Query database to check records
3. **API Testing**: Use seeded data for endpoint testing
4. **Frontend Testing**: Populate UI with real-looking data

## Support

For issues or questions:

1. Check database logs
2. Review script output
3. Verify schema matches `dbupdated.sql`
4. Check foreign key constraints

---

**⚠️ DEVELOPMENT ONLY - DO NOT RUN IN PRODUCTION**
