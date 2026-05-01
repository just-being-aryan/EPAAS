import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/rbac.js";
import {
  getDashboardStats,
  listApplications,
  getApplication,
  updateRisk,
  draftQuery,
  submitRecommendation,
  listQueries,
  getWorkflowHistory,
  listExtensions,
  handleExtension,
  getNotifications,
  markAllRead,
  markNotificationRead,
  searchApplications,
  reportStatus,
} from "../controllers/technical.controller.js";

const router = Router();

router.use(authenticate, authorize("TechnicalOfficer", "TechnicalOfficerRPET"));

router.get("/stats", getDashboardStats);
router.get("/applications", listApplications);
router.get("/applications/:id", getApplication);
router.patch("/applications/:id/risk", updateRisk);
router.post("/applications/:id/queries", draftQuery);
router.post("/applications/:id/recommendation", submitRecommendation);
router.get("/queries", listQueries);
router.get("/workflow/:id", getWorkflowHistory);
router.get("/extensions", listExtensions);
router.patch("/extensions/:id", handleExtension);
router.get("/notifications", getNotifications);
router.patch("/notifications/read-all", markAllRead);
router.patch("/notifications/:id/read", markNotificationRead);
router.get("/search", searchApplications);
router.get("/reports/status", reportStatus);

export default router;
