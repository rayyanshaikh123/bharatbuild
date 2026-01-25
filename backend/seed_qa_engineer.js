const pool = require("./db");
const bcrypt = require("bcrypt");

async function seedQAEngineer() {
  try {
    console.log("🔧 Seeding QA Engineer test account...");

    const password = "password123";
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert QA Engineer
    const qaResult = await pool.query(
      `INSERT INTO qa_engineers (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE 
       SET password_hash = EXCLUDED.password_hash
       RETURNING id, name, email`,
      [
        "Test QA Engineer",
        "qa@test.com",
        "+919876543210",
        hashedPassword,
        "QA_ENGINEER",
      ],
    );

    console.log("✅ QA Engineer created:", qaResult.rows[0]);
    console.log("\n📋 Test Credentials:");
    console.log("   Email: qa@test.com");
    console.log("   Password: password123");
    console.log("   Role: QA_ENGINEER\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding QA Engineer:", err);
    process.exit(1);
  }
}

seedQAEngineer();
