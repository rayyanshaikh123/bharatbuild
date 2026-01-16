# Backend (Express) — Neon (Postgres) setup

Quick scaffold for an Express backend using a Neon/Postgres database.

Getting started

1. Install dependencies

```bash
cd backend
npm install
```

2. Create `.env` based on `.env.example` and set `DATABASE_URL` to your Neon connection string.

3. Run in development

```bash
npm run dev
```

Notes

- This scaffold expects a Postgres-compatible database. For Neon, use the provided `DATABASE_URL`.
- The app will create a small `users` table if it does not exist.

Endpoints

- `GET /health` — health check
- `GET /users` — list users
- `POST /users` — create user { name, email }
