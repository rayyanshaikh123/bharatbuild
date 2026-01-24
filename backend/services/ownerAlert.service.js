const pool = require("../db");
const { sendNotificationEmail } = require("../util/mailer");
const { logAudit } = require("../util/auditLogger");

/**
 * Owner Email Alert Service
 * Sends critical project event notifications to project owners
 */

/**
 * Check and send orphan DPR alert to owner
 * @param {Object} dpr - DPR object after approval
 * @param {Object} client - Database client (for transaction)
 */
async function checkAndAlertOrphanDPR(dpr, client = pool) {
  try {
    // Check if DPR is orphan (no plan_id AND no plan_item_id)
    if (dpr.plan_id || dpr.plan_item_id) {
      return; // Not an orphan, skip
    }

    // Check if alert already sent for this DPR (prevent duplicates)
    const existingAlert = await client.query(
      `SELECT id FROM audit_logs 
       WHERE entity_type = 'PROJECT' 
       AND entity_id = $1 
       AND action = 'OWNER_EMAIL_ALERT' 
       AND category = 'ORPHAN_DPR'
       AND change_summary::jsonb @> $2::jsonb`,
      [dpr.project_id, JSON.stringify({ dpr_id: dpr.id })],
    );

    if (existingAlert.rows.length > 0) {
      return; // Alert already sent
    }

    // Get owner email and project details
    const ownerData = await client.query(
      `SELECT o.email, o.name as owner_name, p.name as project_name, se.name as engineer_name
       FROM projects p
       JOIN organizations org ON p.org_id = org.id
       JOIN owners o ON org.owner_id = o.id
       LEFT JOIN site_engineers se ON $1 = se.id
       WHERE p.id = $2`,
      [dpr.site_engineer_id, dpr.project_id],
    );

    if (ownerData.rows.length === 0) {
      console.error(
        "[Owner Alert] Owner not found for project:",
        dpr.project_id,
      );
      return;
    }

    const { email, owner_name, project_name, engineer_name } =
      ownerData.rows[0];

    // Send email (fail silently if error)
    try {
      const emailMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E74C3C;">⚠️ Orphan DPR Alert</h2>
          <p>Dear ${owner_name},</p>
          <p>An orphan DPR has been approved without linkage to any plan or plan item. This may affect planning accuracy.</p>
          
          <div style="background-color: #F8F9FA; padding: 15px; border-left: 4px solid #E74C3C; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Project:</strong> ${project_name}</p>
            <p style="margin: 5px 0;"><strong>DPR ID:</strong> ${dpr.id}</p>
            <p style="margin: 5px 0;"><strong>DPR Date:</strong> ${new Date(dpr.report_date).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Site Engineer:</strong> ${engineer_name || "Unknown"}</p>
            <p style="margin: 5px 0;"><strong>Work Description:</strong> ${dpr.work_description || "N/A"}</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Recommendation:</strong> Please review this DPR and ensure it is linked to the appropriate plan or plan item for accurate project tracking.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This is an automated alert from Bharat Build.
          </p>
        </div>
      `;

      await sendNotificationEmail({
        to: email,
        subject: `⚠️ Orphan DPR Approved - ${project_name}`,
        message: emailMessage,
      });

      console.log(
        `[Owner Alert] Orphan DPR email sent to ${email} for project ${project_name}`,
      );
    } catch (emailErr) {
      console.error(
        "[Owner Alert] Failed to send orphan DPR email:",
        emailErr.message,
      );
      // Don't throw - fail silently
    }

    // Log audit entry (prevents duplicate alerts)
    await logAudit({
      entityType: "PROJECT",
      entityId: dpr.project_id,
      category: "ORPHAN_DPR",
      action: "OWNER_EMAIL_ALERT",
      before: null,
      after: null,
      user: { id: "SYSTEM", role: "SYSTEM" },
      projectId: dpr.project_id,
      organizationId: ownerData.rows[0].org_id || null,
      client,
      changeSummary: JSON.stringify({
        alert_type: "ORPHAN_DPR",
        dpr_id: dpr.id,
        dpr_date: dpr.report_date,
        engineer_id: dpr.site_engineer_id,
        sent_to: email,
        sent_at: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error(
      "[Owner Alert] Error in checkAndAlertOrphanDPR:",
      error.message,
    );
    // Don't throw - fail silently
  }
}

/**
 * Check and send budget exceeded alert to owner
 * @param {string} projectId - Project ID
 * @param {string} triggerAction - What triggered the check (DPR/BILL/WAGE/ADJUSTMENT)
 * @param {Object} client - Database client (for transaction)
 */
async function checkAndAlertBudgetExceeded(
  projectId,
  triggerAction,
  client = pool,
) {
  try {
    // Get project budget details
    const projectData = await client.query(
      `SELECT p.id, p.name, p.budget, p.current_invested, o.email, o.name as owner_name, org.id as org_id
       FROM projects p
       JOIN organizations org ON p.org_id = org.id
       JOIN owners o ON org.owner_id = o.id
       WHERE p.id = $1`,
      [projectId],
    );

    if (projectData.rows.length === 0) {
      console.error("[Owner Alert] Project not found:", projectId);
      return;
    }

    const project = projectData.rows[0];
    const budget = parseFloat(project.budget);
    const invested = parseFloat(project.current_invested);

    // Check if budget is exceeded
    if (invested <= budget) {
      return; // Budget not exceeded, skip
    }

    // Check if alert already sent for this budget state (prevent duplicates)
    // We check if there's an alert for when invested >= current amount
    const existingAlert = await client.query(
      `SELECT id, change_summary FROM audit_logs 
       WHERE entity_type = 'PROJECT' 
       AND entity_id = $1 
       AND action = 'OWNER_EMAIL_ALERT' 
       AND category = 'BUDGET_ALERT'
       ORDER BY created_at DESC
       LIMIT 1`,
      [projectId],
    );

    // If alert exists and invested amount hasn't increased significantly, skip
    if (existingAlert.rows.length > 0) {
      try {
        const lastAlert = JSON.parse(existingAlert.rows[0].change_summary);
        const lastInvested = parseFloat(lastAlert.current_invested || 0);

        // Only send new alert if invested increased by at least 5% since last alert
        if (invested <= lastInvested * 1.05) {
          return; // Skip duplicate alert
        }
      } catch (parseErr) {
        // Continue if parsing fails
      }
    }

    const percentageExceeded = (((invested - budget) / budget) * 100).toFixed(
      2,
    );

    // Send email (fail silently if error)
    try {
      const emailMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E74C3C;">⚠️ Project Budget Exceeded</h2>
          <p>Dear ${project.owner_name},</p>
          <p>The current investment for one of your projects has exceeded the allocated budget. Please review immediately.</p>
          
          <div style="background-color: #FFF3CD; padding: 15px; border-left: 4px solid #FFC107; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Project:</strong> ${project.name}</p>
            <p style="margin: 5px 0;"><strong>Allocated Budget:</strong> ₹${budget.toLocaleString("en-IN")}</p>
            <p style="margin: 5px 0;"><strong>Current Investment:</strong> ₹${invested.toLocaleString("en-IN")}</p>
            <p style="margin: 5px 0; color: #E74C3C;"><strong>Exceeded By:</strong> ₹${(invested - budget).toLocaleString("en-IN")} (${percentageExceeded}%)</p>
            <p style="margin: 5px 0;"><strong>Triggered By:</strong> ${triggerAction}</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Action Required:</strong> Please review the project expenses and take necessary action to control costs.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This is an automated alert from Bharat Build.
          </p>
        </div>
      `;

      await sendNotificationEmail({
        to: project.email,
        subject: `⚠️ Budget Exceeded - ${project.name}`,
        message: emailMessage,
      });

      console.log(
        `[Owner Alert] Budget exceeded email sent to ${project.email} for project ${project.name}`,
      );
    } catch (emailErr) {
      console.error(
        "[Owner Alert] Failed to send budget exceeded email:",
        emailErr.message,
      );
      // Don't throw - fail silently
    }

    // Log audit entry (prevents duplicate alerts)
    await logAudit({
      entityType: "PROJECT",
      entityId: projectId,
      category: "BUDGET_ALERT",
      action: "OWNER_EMAIL_ALERT",
      before: null,
      after: null,
      user: { id: "SYSTEM", role: "SYSTEM" },
      projectId: projectId,
      organizationId: project.org_id,
      client,
      changeSummary: JSON.stringify({
        alert_type: "BUDGET_EXCEEDED",
        budget: budget,
        current_invested: invested,
        exceeded_by: invested - budget,
        percentage_exceeded: percentageExceeded,
        trigger_action: triggerAction,
        sent_to: project.email,
        sent_at: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error(
      "[Owner Alert] Error in checkAndAlertBudgetExceeded:",
      error.message,
    );
    // Don't throw - fail silently
  }
}

module.exports = {
  checkAndAlertOrphanDPR,
  checkAndAlertBudgetExceeded,
};
