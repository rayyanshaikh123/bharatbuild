const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { initPostgres } = require('./db/postgres');

async function start() {
  const app = express();
  app.use(express.json());
  app.use(morgan('dev'));
  app.use(cors());

  // Initialize DB
  await initPostgres();

  // Routes
  const usersRouter = require('./routes/users');
  app.use('/users', usersRouter);

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // error handler middleware
  const errorHandler = require('./middlewares/errorHandler');
  app.use(errorHandler);

  const port = process.env.PORT || 3000;
  const server = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });

  // graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    server.close(() => console.log('HTTP server closed'));
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return { app, server };
}

module.exports = { start };
