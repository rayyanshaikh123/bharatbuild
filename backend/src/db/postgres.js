const { Pool } = require('pg');

let pool;

async function initPostgres() {
  if (pool) return pool;
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== '0'
      }
    });
  } else {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5432,
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      database: process.env.POSTGRES_DB || 'postgres'
    });
  }

  // create a simple users table if not exists
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE
    );
  `;

  await pool.query(createTableSQL);
  console.log('Postgres connected and users table ensured');
  return pool;
}

function query(text, params) {
  if (!pool) throw new Error('Postgres not initialized');
  return pool.query(text, params);
}

module.exports = { initPostgres, query, pool: () => pool };
