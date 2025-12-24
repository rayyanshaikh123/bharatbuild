const { query } = require('../db/postgres');

async function createUser(name, email) {
  const result = await query(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email',
    [name, email]
  );
  return result.rows[0];
}

async function getUsers() {
  const result = await query('SELECT id, name, email FROM users ORDER BY id DESC LIMIT 100');
  return result.rows;
}

module.exports = { createUser, getUsers };
