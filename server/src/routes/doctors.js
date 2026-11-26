import { Router } from "express";
import pool from "../db.js";
import { allowRoles, requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, allowRoles("patient", "admin"));

router.get("/", async (_req, res, next) => {
  try {
    const [doctors] = await pool.execute(
      "SELECT id, name, email FROM users WHERE role = 'doctor' ORDER BY name",
    );
    return res.json(doctors);
  } catch (error) {
    return next(error);
  }
});

export default router;
