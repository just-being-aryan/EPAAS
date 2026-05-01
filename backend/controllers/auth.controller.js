import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import pool from "../config/db.js";

const signupSchema = z.object({
  username: z.string().min(2).max(100),
  email: z.string().email().max(150).toLowerCase(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );

// POST /api/auth/signup  — Applicants only
export const signup = async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [data.email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const roleResult = await pool.query("SELECT id FROM roles WHERE role_code = 'Applicant'");
    const applicantRoleId = roleResult.rows[0].id;

    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email`,
      [data.username, data.email, passwordHash, applicantRoleId]
    );
    const user = { ...rows[0], role: "Applicant" };

    const token = signToken(user);
    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login  — All roles
export const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.email, u.password_hash, r.role_code AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.email = $1`,
      [data.email]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(user);
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me  — Authenticated users
export const me = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.email, u.created_at,
              r.role_code AS role, r.role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};
