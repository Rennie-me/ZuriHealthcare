import { Router } from "express";
import bcrypt from "bcryptjs";
import pool from "../db.js";
import { allowRoles, requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, allowRoles("admin"));

router.get("/", async (req, res, next) => {
  const role = req.query.role;
  if (role && !["doctor", "patient"].includes(role)) {
    return res.status(400).json({ message: "Users can be filtered by doctor or patient role." });
  }
  try {
    const [users] = role
      ? await pool.execute("SELECT id, name, email, role, created_at FROM users WHERE role = ? ORDER BY name", [role])
      : await pool.execute("SELECT id, name, email, role, created_at FROM users WHERE role IN ('doctor', 'patient') ORDER BY role, name");
    return res.json(users);
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  const { name, email, password, role } = req.body;
  if (typeof name !== "string" || !name.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof password !== "string" || password.length < 8 ||
      !["doctor", "patient"].includes(role)) {
    return res.status(400).json({ message: "Name, email, role (doctor or patient), and password of at least 8 characters are required." });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name.trim(), email.trim().toLowerCase(), hash, role],
    );
    return res.status(201).json({
      id: result.insertId, name: name.trim(), email: email.trim().toLowerCase(), role,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "An account with that email already exists." });
    }
    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  const { name, email, password } = req.body;
  if (typeof name !== "string" || !name.trim() ||
      typeof email !== "string" || !email.trim() ||
      (password !== undefined && (typeof password !== "string" || password.length < 8))) {
    return res.status(400).json({ message: "A name and email are required. A new password must be at least 8 characters." });
  }
  try {
    const [existing] = await pool.execute(
      "SELECT id, role FROM users WHERE id = ? AND role IN ('doctor', 'patient')",
      [req.params.id],
    );
    if (!existing.length) return res.status(404).json({ message: "User not found." });

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.execute("UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?",
        [name.trim(), email.trim().toLowerCase(), hash, req.params.id]);
    } else {
      await pool.execute("UPDATE users SET name = ?, email = ? WHERE id = ?",
        [name.trim(), email.trim().toLowerCase(), req.params.id]);
    }
    return res.json({
      id: Number(req.params.id), name: name.trim(), email: email.trim().toLowerCase(), role: existing[0].role,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "An account with that email already exists." });
    }
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const [result] = await pool.execute(
      "DELETE FROM users WHERE id = ? AND role IN ('doctor', 'patient')",
      [req.params.id],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "User not found." });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
