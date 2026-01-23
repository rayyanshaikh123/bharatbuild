# Backend Changes Log

This file tracks all modifications made to the backend routes during the enhancement phases.

## Phase 0: Audit & Preparation
- Verified existing routes in `backend/routes/engineer/`.
- Updated `dbupdated.sql` with new tables (`material_ledger`, `sync_action_log`, etc.).

## Phase 2: On-Site Inventory Management (Ledger)
- Created `backend/routes/engineer/ledger.js` with endpoints:
    - `GET /stock/:projectId`: Aggregated stock query using SUM/CASE.
    - `POST /movement`: Manual IN/OUT/ADJUSTMENT entry.
    - `GET /history/:projectId`: Full transaction audit for the project.
- Registered `/engineer/ledger` in `backend/index.js`.
