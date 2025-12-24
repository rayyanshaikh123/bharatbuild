function errorHandler(err, req, res, next) {
  console.error(err);
  // Postgres unique violation
  if (err && err.code === '23505') return res.status(409).json({ error: 'duplicate' });
  res.status(500).json({ error: 'internal' });
}

module.exports = errorHandler;
