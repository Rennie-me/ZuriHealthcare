import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "./db.js";

const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
  throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 8 characters in server/.env.");
}

try {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await pool.execute(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = 'admin'`,
    [ADMIN_NAME, ADMIN_EMAIL.toLowerCase(), passwordHash],
  );
  console.log(`Admin account ready for ${ADMIN_EMAIL}.`);
} finally {
  await pool.end();
}
