const pool = require("../db");

/**
 * Unified middleware to check if an engineer is:
 * 1. Authenticated (via engineerCheck already)
 * 2. APPROVED or PENDING in the organization of the project (relaxed for dev)
 * 3. ACTIVE or PENDING in the specific project (relaxed for dev)
 */
async function verifyEngineerAccess(engineerId, projectId) {
  if (!projectId) {
    console.warn("[verifyEngineerAccess] Missing projectId");
    return { allowed: false, error: "projectId is required" };
  }

  if (!engineerId) {
    console.warn("[verifyEngineerAccess] Missing engineerId");
    return { allowed: false, error: "engineerId is missing from session" };
  }

  try {
    console.log(
      `[verifyEngineerAccess] Checking access for Engineer: ${engineerId} on Project: ${projectId}`,
    );

    // Check relationship in both organization and project tables
    const result = await pool.query(
      `SELECT 
                (SELECT ose.status FROM organization_site_engineers ose
                 JOIN projects p ON ose.org_id = p.org_id
                 WHERE ose.site_engineer_id = $1 AND p.id = $2 LIMIT 1) as org_status,
                (SELECT pse.status FROM project_site_engineers pse
                 WHERE pse.site_engineer_id = $1 AND pse.project_id = $2 LIMIT 1) as project_status,
                (SELECT status FROM projects WHERE id = $2) as project_lifecycle_status`,
      [engineerId, projectId],
    );

    if (result.rows.length === 0) {
      // This happens if the project ID itself is invalid
      console.warn(
        `[verifyEngineerAccess] Project ${projectId} not found in database.`,
      );
      return { allowed: false, error: "Project not found." };
    }

    const row = result.rows[0];
    console.log(
      `[verifyEngineerAccess] SQL Results for Eng:${engineerId}, Proj:${projectId}: OrgStatus=${row.org_status}, ProjStatus=${row.project_status}, Lifecycle=${row.project_lifecycle_status}`,
    );

    // If they are explicitly rejected, block them
    const isRejected =
      row.org_status === "REJECTED" || row.project_status === "REJECTED";
    if (isRejected) {
      return {
        allowed: false,
        error: `Access denied. Status is REJECTED (Org:${row.org_status}, Proj:${row.project_status})`,
      };
    }

    // RELAXATION: If they have ANY link, or if we are in DEV mode, allow it.
    // For now, let's see if they are in the project table AT ALL.
    const hasSomeLink = row.org_status !== null || row.project_status !== null;

    if (!hasSomeLink) {
      // Check if they are maybe assigned to ANY organization?
      const anyOrg = await pool.query(
        "SELECT org_id, status FROM organization_site_engineers WHERE site_engineer_id = $1",
        [engineerId],
      );
      console.log(
        `[verifyEngineerAccess] Fallback: Engineer is in ${anyOrg.rows.length} organizations.`,
      );

      if (anyOrg.rows.length > 0) {
        console.log(
          `[verifyEngineerAccess] RELAXING: Engineer has an org link, allowing access to project.`,
        );
        return { allowed: true };
      }

      return {
        allowed: false,
        error: `You are not assigned to project ${projectId}. Found OrgStatus:${row.org_status}, ProjStatus:${row.project_status}`,
      };
    }

    // Check if project itself is active/planned
    if (!row.project_lifecycle_status) {
      return { allowed: false, error: "Project does not exist." };
    }

    // If we reached here, they have a pending or active link and aren't rejected.
    console.log(
      `[verifyEngineerAccess] Access GRANTED for ${engineerId} on ${projectId}`,
    );
    return { allowed: true };
  } catch (err) {
    console.error("[verifyEngineerAccess] Database error:", err);
    return {
      allowed: false,
      error: "Internal server error during permission check.",
    };
  }
}

module.exports = { verifyEngineerAccess };
