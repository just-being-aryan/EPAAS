import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/rbac.js";
import {
  getDashboardStats,
  listApplications,
  getApplication,
  assignApplication,
  forwardToEC,
  grantApproval,
  rejectApplication,
  withdrawApproval,
  raiseQuery,
  listQueries,
  approveQuery,
  getWorkflowHistory,
  listExtensions,
  handleExtension,
  getNotifications,
  markAllRead,
  markNotificationRead,
  searchApplications,
  reportApproved,
  reportStatus,
  reportByType,
  trackApplication,
  listTechnicalOfficers,
} from "../controllers/nodal.controller.js";

const router = Router();

router.use(authenticate, authorize("NodalOfficerA", "NodalOfficerARPET"));

// Dashboard
router.get("/stats", getDashboardStats);

// Applications queue
router.get("/applications", listApplications);
router.get("/applications/:id", getApplication);
router.post("/applications/:id/assign", assignApplication);
router.post("/applications/:id/forward-ec", forwardToEC);
router.post("/applications/:id/grant-approval", grantApproval);
router.post("/applications/:id/reject", rejectApplication);
router.post("/applications/:id/withdraw", withdrawApproval);

// Queries — specific routes before param routes
router.get("/queries", listQueries);
router.get("/applications/:id/queries", listQueries);
router.post("/applications/:id/queries", raiseQuery);
router.patch("/queries/:queryId/approve", approveQuery);

// Workflow history
router.get("/workflow/:id", getWorkflowHistory);

// Extension requests
router.get("/extensions", listExtensions);
router.patch("/extensions/:id", handleExtension);

// Notifications — read-all before :id to avoid route collision
router.get("/notifications", getNotifications);
router.patch("/notifications/read-all", markAllRead);
router.patch("/notifications/:id/read", markNotificationRead);

// Search console
router.get("/search", searchApplications);

// Reports
router.get("/reports/approved", reportApproved);
router.get("/reports/status", reportStatus);
router.get("/reports/by-type", reportByType);
router.get("/reports/track", trackApplication);

// Supporting data
router.get("/officers", listTechnicalOfficers);

export default router;
