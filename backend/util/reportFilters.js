/**
 * Report Filters Utility
 * Handles date filtering, entity filtering, and pagination for reports
 */

/**
 * Parse date filters from query parameters
 * @param {Object} query - Express query object
 * @returns {Object} { start_date, end_date }
 */
function parseDateFilters(query) {
  const now = new Date();

  // Preset date ranges
  if (query.preset) {
    const presets = {
      last_7_days: 7,
      last_30_days: 30,
      last_90_days: 90,
      last_180_days: 180,
    };

    const days = presets[query.preset];
    if (days) {
      return {
        start_date: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
        end_date: now,
      };
    }
  }

  // Specific month (YYYY-MM)
  if (query.month) {
    const [year, month] = query.month.split("-");
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    return { start_date: start, end_date: end };
  }

  // Specific year (YYYY)
  if (query.year) {
    return {
      start_date: new Date(query.year, 0, 1),
      end_date: new Date(query.year, 11, 31, 23, 59, 59),
    };
  }

  // Single date
  if (query.date) {
    const date = new Date(query.date);
    return {
      start_date: new Date(date.setHours(0, 0, 0, 0)),
      end_date: new Date(date.setHours(23, 59, 59, 999)),
    };
  }

  // Date range
  if (query.start_date && query.end_date) {
    return {
      start_date: new Date(query.start_date),
      end_date: new Date(query.end_date),
    };
  }

  // Default: last 30 days
  return {
    start_date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    end_date: now,
  };
}

/**
 * Parse entity filters from query parameters
 * @param {Object} query - Express query object
 * @returns {Object} Entity filters
 */
function parseEntityFilters(query) {
  const filters = {};

  if (query.organization_id) filters.organization_id = query.organization_id;
  if (query.project_id) filters.project_id = query.project_id;
  if (query.manager_id) filters.manager_id = query.manager_id;
  if (query.category) filters.category = query.category;
  if (query.status) filters.status = query.status;

  return filters;
}

/**
 * Apply pagination to query
 * @param {Object} query - Express query object
 * @returns {Object} { page, limit, offset }
 */
function applyPagination(query) {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 50, 200); // Max 200
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Build SQL WHERE clause from filters
 * @param {Object} filters - Filter object
 * @param {Array} params - SQL parameters array (will be mutated)
 * @param {Number} startIdx - Starting parameter index
 * @returns {String} WHERE clause
 */
function buildWhereClause(filters, params, startIdx = 1) {
  const conditions = [];
  let paramIdx = startIdx;

  if (filters.start_date && filters.end_date) {
    conditions.push(`created_at >= $${paramIdx++}`);
    conditions.push(`created_at <= $${paramIdx++}`);
    params.push(filters.start_date, filters.end_date);
  }

  if (filters.organization_id) {
    conditions.push(`organization_id = $${paramIdx++}`);
    params.push(filters.organization_id);
  }

  if (filters.project_id) {
    conditions.push(`project_id = $${paramIdx++}`);
    params.push(filters.project_id);
  }

  if (filters.manager_id) {
    conditions.push(`manager_id = $${paramIdx++}`);
    params.push(filters.manager_id);
  }

  if (filters.category) {
    conditions.push(`category = $${paramIdx++}`);
    params.push(filters.category);
  }

  if (filters.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(filters.status);
  }

  return conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
}

/**
 * Format currency for display
 * @param {Number} amount - Amount in rupees
 * @returns {String} Formatted currency
 */
function formatCurrency(amount) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Calculate percentage
 * @param {Number} part - Part value
 * @param {Number} total - Total value
 * @returns {Number} Percentage (0-100)
 */
function calculatePercentage(part, total) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100 * 100) / 100; // 2 decimal places
}

module.exports = {
  parseDateFilters,
  parseEntityFilters,
  applyPagination,
  buildWhereClause,
  formatCurrency,
  calculatePercentage,
};
