/**
 * Utility for consistent date handling across the backend.
 * Normalizes dates to IST (UTC+5:30) for functional business logic.
 */

/**
 * Returns current date in IST as YYYY-MM-DD string
 */
const getISTDate = () => {
  // Current UTC time
  const now = new Date();
  // Offset for IST (5.5 hours in milliseconds)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split("T")[0];
};

/**
 * Returns current hour (0-23) in IST
 */
const getISTHour = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.getUTCHours(); // getUTCHours on shifted date gives correct IST hour
};

/**
 * Safely converts any date-like input to YYYY-MM-DD string
 * Handles JS Date objects, ISO strings, and standard strings.
 */
const formatDateString = (date) => {
  if (!date) return null;

  if (date instanceof Date) {
    // Use local components if needed, but ISO split is usually fine for DATE types from PG
    // Note: Using toISOString might still refer to UTC.
    // For PG DATE columns, normalize via manual component extraction for safety.
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padLeft(2, "0");
    const d = date.getDate().toString().padLeft(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof date === "string") {
    return date.split("T")[0];
  }

  return date;
};

/**
 * Normalizes a date from the database (potentially a Date object)
 * for strict comparison with a YYYY-MM-DD string.
 */
const normalizeDBDate = (dbDate) => {
  if (!dbDate) return null;

  // PG driver returns DATE columns as JS Date objects starting at 00:00 midnight LOCAL time.
  if (dbDate instanceof Date) {
    const y = dbDate.getFullYear();
    const m = (dbDate.getMonth() + 1).toString().padStart(2, "0");
    const d = dbDate.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof dbDate === "string") {
    return dbDate.split("T")[0];
  }

  return dbDate;
};

module.exports = { getISTDate, normalizeDBDate, getISTHour };
