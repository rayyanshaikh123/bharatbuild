CREATE TABLE IF NOT EXISTS "ledger_adjustments" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "project_id" uuid NOT NULL,
  "created_by" uuid,
  "date" date NOT NULL,
  "description" text NOT NULL,
  "amount" numeric NOT NULL,
  "category" text DEFAULT 'ADJUSTMENT',
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "ledger_adjustments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "ledger_adjustments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "managers"("id")
);

CREATE INDEX IF NOT EXISTS "idx_ledger_adjustments_project" ON "ledger_adjustments" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_ledger_adjustments_date" ON "ledger_adjustments" ("date");
