import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const router = Router();

function createToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "8h" },
  );
}

router.post("/register", async (req, res, next) => {
  const { name, email, password } = req.body;
  if (typeof name !== "string" || !name.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ message: "Name, email, and a password of at least 8 characters are required." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'patient')",
      [name.trim(), email.trim().toLowerCase(), passwordHash],
    );
    const user = { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase(), role: "patient" };
    return res.status(201).json({ token: createToken(user), user });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "An account with that email already exists." });
    }
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT id, name, email, password_hash, role FROM users WHERE email = ?",
      [email.trim().toLowerCase()],
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    const publicUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    return res.json({ token: createToken(publicUser), user: publicUser });
  } catch (error) {
    return next(error);
  }
});

export default router;
