import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/rbac.js";
import {
  getDashboardStats,
  listApplications,
  getApplication,
  recordDecision,
  getAgenda,
  getNotifications,
  markAllRead,
  markNotificationRead,
} from "../controllers/expert.controller.js";

const router = Router();

router.use(authenticate, authorize("ExpertCommittee"));

router.get("/stats", getDashboardStats);
router.get("/applications", listApplications);
router.get("/applications/:id", getApplication);
router.post("/applications/:id/decision", recordDecision);
router.get("/agenda", getAgenda);
router.get("/notifications", getNotifications);
router.patch("/notifications/read-all", markAllRead);
router.patch("/notifications/:id/read", markNotificationRead);

export default router;
