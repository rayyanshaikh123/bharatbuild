require("dotenv").config();
const pool = require("./db");

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        console.log("Creating dpr_items table...");
        await client.query(`
      CREATE TABLE IF NOT EXISTS dpr_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        dpr_id UUID NOT NULL REFERENCES dprs(id) ON DELETE CASCADE,
        plan_item_id UUID NOT NULL REFERENCES plan_items(id),
        quantity_done NUMERIC NOT NULL DEFAULT 0,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

        console.log("Adding index to dpr_items...");
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dpr_items_dpr ON dpr_items(dpr_id);
      CREATE INDEX IF NOT EXISTS idx_dpr_items_plan_item ON dpr_items(plan_item_id);
    `);

        await client.query("COMMIT");
        console.log("Migration successful!");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Migration failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
