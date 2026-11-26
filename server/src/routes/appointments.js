import { Router } from "express";
import pool from "../db.js";
import { allowRoles, requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  const fields = `a.id, a.patient_id, a.doctor_id, a.appointment_date, a.reason, a.status, a.created_at,
    p.name AS patient_name, d.name AS doctor_name`;
  let query = `SELECT ${fields} FROM appointments a
    JOIN users p ON p.id = a.patient_id JOIN users d ON d.id = a.doctor_id`;
  const values = [];
  if (req.user.role === "patient") {
    query += " WHERE a.patient_id = ?";
    values.push(req.user.id);
  } else if (req.user.role === "doctor") {
    query += " WHERE a.doctor_id = ?";
    values.push(req.user.id);
  } else if (req.user.role !== "admin") {
    return res.status(403).json({ message: "You do not have permission to view appointments." });
  }
  query += " ORDER BY a.appointment_date DESC";
  try {
    const [appointments] = await pool.execute(query, values);
    return res.json(appointments);
  } catch (error) {
    return next(error);
  }
});

router.post("/", allowRoles("patient"), async (req, res, next) => {
  const { doctorId, appointmentDate, reason } = req.body;
  const date = new Date(appointmentDate);
  if (!Number.isInteger(Number(doctorId)) || Number(doctorId) <= 0 ||
      Number.isNaN(date.getTime()) || typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ message: "Choose a doctor, a valid appointment date, and provide a reason." });
  }
  if (date.getTime() <= Date.now()) {
    return res.status(400).json({ message: "Appointment dates must be in the future." });
  }
  try {
    const [doctors] = await pool.execute("SELECT id FROM users WHERE id = ? AND role = 'doctor'", [doctorId]);
    if (!doctors.length) return res.status(400).json({ message: "The selected doctor does not exist." });
    const [result] = await pool.execute(
      "INSERT INTO appointments (patient_id, doctor_id, appointment_date, reason) VALUES (?, ?, ?, ?)",
      [req.user.id, doctorId, date, reason.trim()],
    );
    return res.status(201).json({ id: result.insertId, status: "pending" });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/status", allowRoles("doctor", "admin"), async (req, res, next) => {
  const { status } = req.body;
  if (!["approved", "declined"].includes(status)) {
    return res.status(400).json({ message: "Status must be approved or declined." });
  }
  try {
    const [result] = req.user.role === "doctor"
      ? await pool.execute(
        "UPDATE appointments SET status = ? WHERE id = ? AND doctor_id = ? AND status = 'pending'",
        [status, req.params.id, req.user.id],
      )
      : await pool.execute(
        "UPDATE appointments SET status = ? WHERE id = ? AND status = 'pending'",
        [status, req.params.id],
      );
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Pending appointment not found or not assigned to you." });
    }
    return res.json({ id: Number(req.params.id), status });
  } catch (error) {
    return next(error);
  }
});

export default router;
