const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
  ssl: process.env.DATABASE_URL && (process.env.DATABASE_URL.includes("neon") || process.env.DATABASE_URL.includes("aws-west-2"))
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("connect", () => {
  console.log("📦 Connected to PostgreSQL");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

module.exports = pool;
