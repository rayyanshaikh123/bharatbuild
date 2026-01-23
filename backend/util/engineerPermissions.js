const pool = require("../db");

/**
 * Unified middleware to check if an engineer is:
 * 1. Authenticated (via engineerCheck already)
 * 2. APPROVED in the organization of the project
 * 3. ACTIVE in the specific project
 */
async function verifyEngineerAccess(engineerId, projectId) {
    if (!projectId) return { allowed: false, error: "projectId is required" };

    try {
        // Check both Organization status and Project status in one query
        const result = await pool.query(
            `SELECT 
        (SELECT status FROM organization_site_engineers ose
         JOIN projects p ON ose.org_id = p.org_id
         WHERE ose.site_engineer_id = $1 AND p.id = $2) as org_status,
        (SELECT status FROM project_site_engineers pse
         WHERE pse.site_engineer_id = $1 AND pse.project_id = $2) as project_status`,
            [engineerId, projectId]
        );

        if (result.rows.length === 0) {
            return { allowed: false, error: "Access denied. No relationship found with this project or organization." };
        }

        const { org_status, project_status } = result.rows[0];

        if (org_status !== 'APPROVED') {
            return { allowed: false, error: "Access denied. Not an approved engineer in the organization." };
        }

        if (project_status !== 'ACTIVE') {
            return { allowed: false, error: "Access denied. Not an active engineer in the project." };
        }

        return { allowed: true };
    } catch (err) {
        console.error("verifyEngineerAccess error:", err);
        return { allowed: false, error: "Internal server error during permission check." };
    }
}

module.exports = { verifyEngineerAccess };
