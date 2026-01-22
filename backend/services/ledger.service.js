const pool = require("../config/db");
const { logAudit } = require("../util/auditLogger");

/**
 * Ledger Service
 * Manages project financial ledger including materials, wages, and manual adjustments
 */

/**
 * Get project ledger with chronological entries
 * @param {number} projectId - Project ID
 * @param {Object} filters - { startDate, endDate, type, page, limit }
 * @returns {Object} Ledger entries with pagination
 */
async function getProjectLedger(projectId, filters = {}) {
  const client = await pool.connect();
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 30 days ago
      endDate = new Date().toISOString().split("T")[0], // today
      type = null, // MATERIAL | WAGE | ADJUSTMENT
      page = 1,
      limit = 100,
    } = filters;

    const offset = (page - 1) * limit;

    // Build unified ledger query
    const entries = await client.query(
      `
      WITH ledger_entries AS (
        -- Material bills
        SELECT 
          mb.approved_at::date as date,
          'MATERIAL' as type,
          mb.id as reference_id,
          CONCAT('Material Bill #', mb.id, ' - ', mb.category) as description,
          mb.total_amount as amount,
          mb.category,
          m.name as approved_by_name,
          mb.approved_at
        FROM material_bills mb
        LEFT JOIN managers m ON mb.approved_by = m.id
        WHERE mb.project_id = $1 
          AND mb.status = 'APPROVED'
          AND mb.approved_at::date BETWEEN $2 AND $3
        
        UNION ALL
        
        -- Wages
        SELECT 
          w.approved_at::date as date,
          'WAGE' as type,
          w.id as reference_id,
          CONCAT('Wage Payment - ', l.name, ' (', l.skill, ')') as description,
          w.total_amount as amount,
          l.skill as category,
          m.name as approved_by_name,
          w.approved_at
        FROM wages w
        JOIN labours l ON w.labour_id = l.id
        LEFT JOIN managers m ON w.approved_by = m.id
        WHERE w.project_id = $1 
          AND w.status = 'APPROVED'
          AND w.approved_at::date BETWEEN $2 AND $3
        
        UNION ALL
        
        -- Manual adjustments
        SELECT 
          la.date,
          'ADJUSTMENT' as type,
          la.id as reference_id,
          la.description,
          la.amount,
          la.category,
          m.name as approved_by_name,
          la.created_at as approved_at
        FROM ledger_adjustments la
        LEFT JOIN managers m ON la.created_by = m.id
        WHERE la.project_id = $1 
          AND la.date BETWEEN $2 AND $3
      )
      SELECT * FROM ledger_entries
      WHERE ($4::text IS NULL OR type = $4)
      ORDER BY date DESC, approved_at DESC
      LIMIT $5 OFFSET $6
    `,
      [projectId, startDate, endDate, type, limit, offset],
    );

    // Get total count for pagination
    const countResult = await client.query(
      `
      WITH ledger_entries AS (
        SELECT mb.approved_at::date as date, 'MATERIAL' as type
        FROM material_bills mb
        WHERE mb.project_id = $1 AND mb.status = 'APPROVED'
          AND mb.approved_at::date BETWEEN $2 AND $3
        
        UNION ALL
        
        SELECT w.approved_at::date as date, 'WAGE' as type
        FROM wages w
        WHERE w.project_id = $1 AND w.status = 'APPROVED'
          AND w.approved_at::date BETWEEN $2 AND $3
        
        UNION ALL
        
        SELECT la.date, 'ADJUSTMENT' as type
        FROM ledger_adjustments la
        WHERE la.project_id = $1 AND la.date BETWEEN $2 AND $3
      )
      SELECT COUNT(*) as total
      FROM ledger_entries
      WHERE ($4::text IS NULL OR type = $4)
    `,
      [projectId, startDate, endDate, type],
    );

    // Calculate running total
    const ledgerWithRunningTotal = calculateRunningTotal(entries.rows);

    const total = parseInt(countResult.rows[0].total);

    return {
      entries: ledgerWithRunningTotal,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        total_pages: Math.ceil(total / limit),
      },
      filters: {
        start_date: startDate,
        end_date: endDate,
        type: type,
      },
    };
  } finally {
    client.release();
  }
}

/**
 * Add manual ledger adjustment (Manager only)
 * @param {number} projectId - Project ID
 * @param {number} managerId - Manager ID
 * @param {Object} data - { date, description, amount, category, notes }
 * @param {Object} req - Express request object (for audit)
 * @returns {Object} Created adjustment
 */
async function addLedgerAdjustment(projectId, managerId, data, req) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { date, description, amount, category = "ADJUSTMENT", notes } = data;

    // Validate amount is numeric
    if (isNaN(parseFloat(amount))) {
      throw new Error("Invalid amount");
    }

    // Insert adjustment
    const result = await client.query(
      `
      INSERT INTO ledger_adjustments 
        (project_id, created_by, date, description, amount, category, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [projectId, managerId, date, description, amount, category, notes],
    );

    const adjustment = result.rows[0];

    // Audit log
    await logAudit({
      entityType: "ledger_adjustment",
      entityId: adjustment.id,
      category: "LEDGER",
      action: "CREATE",
      before: null,
      after: adjustment,
      user: req.user,
      projectId: projectId,
      client,
    });

    await client.query("COMMIT");

    return {
      id: adjustment.id,
      project_id: adjustment.project_id,
      date: adjustment.date,
      description: adjustment.description,
      amount: parseFloat(adjustment.amount),
      category: adjustment.category,
      notes: adjustment.notes,
      created_by: managerId,
      created_at: adjustment.created_at,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate running total for ledger entries
 * @param {Array} entries - Ledger entries
 * @returns {Array} Entries with running_total field
 */
function calculateRunningTotal(entries) {
  let runningTotal = 0;

  // Reverse to calculate from oldest to newest
  const reversed = [...entries].reverse();

  const withTotals = reversed.map((entry) => {
    runningTotal += parseFloat(entry.amount);
    return {
      date: entry.date,
      type: entry.type,
      reference_id: entry.reference_id,
      description: entry.description,
      amount: parseFloat(entry.amount),
      running_total: parseFloat(runningTotal.toFixed(2)),
      category: entry.category,
      approved_by: entry.approved_by_name,
      approved_at: entry.approved_at,
    };
  });

  // Reverse back to newest first
  return withTotals.reverse();
}

module.exports = {
  getProjectLedger,
  addLedgerAdjustment,
  calculateRunningTotal,
};
