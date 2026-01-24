require("dotenv").config();
const pool = require("./db");
const fs = require("fs");
const path = require("path");

async function migrate() {
  let client;
  try {
    console.log("Connecting to database...");
    console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");
    
    client = await pool.connect();
    console.log("✅ Connected to database");

    await client.query("BEGIN");

    console.log("Running manual attendance face verification migration...");

    // Execute migration statements one by one
    console.log("Creating manual_attendance_labours table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS manual_attendance_labours (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name text NOT NULL,
        skill text NOT NULL,
        created_at timestamp DEFAULT now(),
        created_by uuid REFERENCES site_engineers(id),
        UNIQUE(project_id, name, skill)
      );
    `);

    console.log("Creating indexes...");
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_manual_attendance_labours_project 
      ON manual_attendance_labours(project_id);
    `);

    console.log("Adding face verification columns to attendance table...");
    await client.query(`
      ALTER TABLE attendance 
      ADD COLUMN IF NOT EXISTS check_in_face_image bytea,
      ADD COLUMN IF NOT EXISTS check_in_face_features jsonb,
      ADD COLUMN IF NOT EXISTS check_out_face_image bytea,
      ADD COLUMN IF NOT EXISTS check_out_face_features jsonb,
      ADD COLUMN IF NOT EXISTS face_verification_status text DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS face_verification_confidence numeric,
      ADD COLUMN IF NOT EXISTS manual_labour_id uuid REFERENCES manual_attendance_labours(id) ON DELETE SET NULL;
    `);

    // Add check constraint separately
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'attendance_face_verification_status_check'
        ) THEN
          ALTER TABLE attendance 
          ADD CONSTRAINT attendance_face_verification_status_check 
          CHECK (face_verification_status IN ('PENDING', 'VERIFIED', 'FAILED'));
        END IF;
      END $$;
    `);

    console.log("Creating face verification indexes...");
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_face_verification_status 
      ON attendance(face_verification_status) 
      WHERE is_manual = true;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_manual_labour 
      ON attendance(manual_labour_id) 
      WHERE manual_labour_id IS NOT NULL;
    `);

    await client.query("COMMIT");
    console.log("\n✅ Migration successful!");
    console.log("Created:");
    console.log("  - manual_attendance_labours table");
    console.log("  - Face verification columns in attendance table");
    console.log("  - All necessary indexes");
  } catch (err) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackErr) {
        console.error("Rollback error:", rollbackErr.message);
      }
    }
    console.error("\n❌ Migration failed:", err.message);
    console.error("\nYou can also run the migration manually using:");
    console.error("  psql -d your_database_name -f backend/migrations/add_manual_attendance_face_verification.sql");
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    process.exit(0);
  }
}

migrate();
