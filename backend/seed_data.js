require("dotenv").config();
const pool = require("./db");
const bcrypt = require("bcrypt");

async function seed() {
    const client = await pool.connect();
    try {
        console.log("🌱 Starting seeding...");
        await client.query("BEGIN");

        // 1. Create Owner
        const ownerPassword = await bcrypt.hash("password123", 10);
        const ownerRes = await client.query(
            `INSERT INTO owners (name, email, phone, password_hash) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name 
       RETURNING id`,
            ["John Owner", "owner@example.com", "9876543210", ownerPassword]
        );
        const ownerId = ownerRes.rows[0].id;

        // 2. Create Organization
        const orgRes = await client.query(
            `INSERT INTO organizations (name, address, office_phone, org_type, owner_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
            ["Bharat Construction Corp", "123 Build Ave, Delhi", "011-2345678", "CONSTRUCTION", ownerId]
        );
        const orgId = orgRes.rows[0].id;

        // 3. Create Managers
        const managerPassword = await bcrypt.hash("password123", 10);
        const managers = [
            ["Alice Manager", "alice@example.com", "9876543211"],
            ["Bob Manager", "bob@example.com", "9876543212"]
        ];

        const managerIds = [];
        for (const m of managers) {
            const res = await client.query(
                `INSERT INTO managers (name, email, phone, password_hash) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name 
         RETURNING id`,
                [m[0], m[1], m[2], managerPassword]
            );
            managerIds.push(res.rows[0].id);
        }

        // 4. Approve Managers in Org
        for (const mid of managerIds) {
            await client.query(
                `INSERT INTO organization_managers (org_id, manager_id, status, approved_at) 
         VALUES ($1, $2, 'APPROVED', NOW()) 
         ON CONFLICT (org_id, manager_id) DO UPDATE SET status = 'APPROVED'`,
                [orgId, mid]
            );
        }

        // 5. Create Engineers
        const engineerPassword = await bcrypt.hash("password123", 10);
        const engineers = [
            ["Charlie Engineer", "charlie@example.com", "9876543213"],
            ["David Engineer", "david@example.com", "9876543214"]
        ];

        const engineerIds = [];
        for (const e of engineers) {
            const res = await client.query(
                `INSERT INTO site_engineers (name, email, phone, password_hash) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name 
         RETURNING id`,
                [e[0], e[1], e[2], engineerPassword]
            );
            engineerIds.push(res.rows[0].id);
        }

        // 6. Approve Engineers in Org
        for (const eid of engineerIds) {
            await client.query(
                `INSERT INTO organization_site_engineers (org_id, site_engineer_id, approved_by, status, approved_at) 
         VALUES ($1, $2, $3, 'APPROVED', NOW()) 
         ON CONFLICT (org_id, site_engineer_id) DO UPDATE SET status = 'APPROVED'`,
                [orgId, eid, managerIds[0]]
            );
        }

        // 7. Create Projects
        const projects = [
            ["Project Alpha", "Sector 62, Noida", 28.62, 77.37, 500, managerIds[0]],
            ["Project Beta", "Gurgaon Phase 3", 28.45, 77.02, 1000, managerIds[1]]
        ];

        const projectIds = [];
        for (const p of projects) {
            const res = await client.query(
                `INSERT INTO projects (org_id, name, location_text, latitude, longitude, geofence_radius, status, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7) 
         RETURNING id`,
                [orgId, p[0], p[1], p[2], p[3], p[4], p[5]]
            );
            projectIds.push(res.rows[0].id);
        }

        // 8. Assign Managers to Projects
        await client.query(
            `INSERT INTO project_managers (project_id, manager_id, status) VALUES ($1, $2, 'ACTIVE')`,
            [projectIds[0], managerIds[0]]
        );
        await client.query(
            `INSERT INTO project_managers (project_id, manager_id, status) VALUES ($1, $2, 'ACTIVE')`,
            [projectIds[1], managerIds[1]]
        );

        // 9. Assign Engineers to Projects
        await client.query(
            `INSERT INTO project_site_engineers (project_id, site_engineer_id, status) VALUES ($1, $2, 'ACTIVE')`,
            [projectIds[0], engineerIds[0]]
        );
        await client.query(
            `INSERT INTO project_site_engineers (project_id, site_engineer_id, status) VALUES ($1, $2, 'ACTIVE')`,
            [projectIds[1], engineerIds[1]]
        );

        await client.query("COMMIT");
        console.log("✅ Seeding completed successfully!");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Seeding failed:", err);
    } finally {
        client.release();
        pool.end();
    }
}

seed();
