require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runTest() {
    try {
        console.log("Running proximity search test...");

        // 1. Get a sample labour
        const labourRes = await pool.query("SELECT id, primary_latitude, primary_longitude FROM labours LIMIT 1");
        if (labourRes.rows.length === 0) {
            console.log("No labourer found for testing.");
            return;
        }
        const labour = labourRes.rows[0];
        console.log(`Testing with labour ${labour.id} at (${labour.primary_latitude}, ${labour.primary_longitude})`);

        // 2. Fetch available jobs
        // Note: We need to mock the authentication or call the logic directly.
        // Since we've already modified jobs.js, we can inspect the query logic.

        const DEFAULT_LABOUR_RADIUS = 50000;
        const lat = labour.primary_latitude;
        const lon = labour.primary_longitude;

        if (!lat || !lon) {
            console.log("Labourer has no primary location.");
            return;
        }

        const query = `
      SELECT lr.*, p.name as project_name, p.latitude, p.longitude, p.geofence, p.geofence_radius,
            (6371000 * acos(
              cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2)) + 
              sin(radians($1)) * sin(radians(p.latitude))
            )) AS distance_meters
      FROM labour_requests lr
      JOIN projects p ON lr.project_id = p.id
      WHERE lr.status = 'OPEN'
    `;

        const result = await pool.query(query, [lat, lon]);
        console.log(`Found ${result.rows.length} jobs.`);

        result.rows.forEach(job => {
            const projRadius = job.geofence_radius || 0;
            const canApply = parseFloat(job.distance_meters) <= (DEFAULT_LABOUR_RADIUS + projRadius);
            console.log(`Job: ${job.project_name}, Distance: ${Math.round(job.distance_meters)}m, Radius: ${projRadius}m, Can Apply: ${canApply}`);
        });

    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        await pool.end();
    }
}

runTest();
