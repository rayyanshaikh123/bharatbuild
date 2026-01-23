require('dotenv').config();
const pool = require('./db');

async function createTestJobs() {
    const client = await pool.connect();
    try {
        // Get first project
        const projectRes = await client.query('SELECT id FROM projects LIMIT 1');
        if (projectRes.rows.length === 0) {
            console.log('❌ No projects found.');
            return;
        }

        const projectId = projectRes.rows[0].id;
        console.log('✓ Project:', projectId.substring(0, 8) + '...');

        // Get any site engineer
        const engineerRes = await client.query('SELECT id FROM site_engineers LIMIT 1');
        const engineerId = engineerRes.rows.length > 0 ? engineerRes.rows[0].id : null;

        await client.query('BEGIN');

        // Delete old test requests
        await client.query(`DELETE FROM labour_requests WHERE description LIKE 'TEST:%'`);

        // Tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const requests = [
            { category: 'MASONRY', count: 5 },
            { category: 'CARPENTRY', count: 3 },
            { category: 'ELECTRICAL', count: 2 },
            { category: 'PLUMBING', count: 4 },
        ];

        console.log('\n📝 Creating jobs for tomorrow...');
        for (const req of requests) {
            const result = await client.query(
                `INSERT INTO labour_requests 
         (project_id, site_engineer_id, category, required_count, description, status, request_date)
         VALUES ($1, $2, $3, $4, $5, 'OPEN', $6)
         RETURNING id, category`,
                [projectId, engineerId, req.category, req.count, `TEST: ${req.category} workers needed`, tomorrow]
            );
            console.log(`  ✓ ${result.rows[0].category} - ${req.count} workers`);
        }

        await client.query('COMMIT');
        console.log('\n✅ Done! Pull down to refresh the app to see jobs.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

createTestJobs();
