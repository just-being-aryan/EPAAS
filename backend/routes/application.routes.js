import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/rbac.js";
import {
  getStats,
  listApplications,
  getApplication,
  createApplication,
  updateApplication,
  submitApplication,
  deleteApplication,
  listInvoices,
} from "../controllers/application.controller.js";

const router = Router();

router.use(authenticate, authorize("APPLICANT"));

router.get("/stats", getStats);
router.get("/invoices", listInvoices);
router.get("/", listApplications);
router.get("/:id", getApplication);
router.post("/", createApplication);
router.patch("/:id", updateApplication);
router.post("/:id/submit", submitApplication);
router.delete("/:id", deleteApplication);

export default router;
