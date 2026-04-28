import { Router } from "express";
import { signup, login, me } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { loginLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", loginLimiter, login);
router.get("/me", authenticate, me);

export default router;
