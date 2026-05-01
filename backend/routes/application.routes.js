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
  listQueries,
  respondToQuery,
  listAppeals,
  fileAppeal,
  listReviews,
  fileReview,
  listExtensions,
  createExtensionRequest,
} from "../controllers/application.controller.js";

const router = Router();

router.use(authenticate, authorize("Applicant", "ApplicantRPET"));

router.get("/stats", getStats);
router.get("/invoices", listInvoices);
router.get("/requests/appeals", listAppeals);
router.get("/requests/reviews", listReviews);
router.get("/requests/extensions", listExtensions);
router.get("/", listApplications);
router.get("/:id", getApplication);
router.get("/:id/queries", listQueries);
router.post("/", createApplication);
router.patch("/:id", updateApplication);
router.post("/:id/submit", submitApplication);
router.post("/:id/queries/:queryId/respond", respondToQuery);
router.post("/:id/appeal", fileAppeal);
router.post("/:id/review", fileReview);
router.post("/:id/extension-request", createExtensionRequest);
router.delete("/:id", deleteApplication);

export default router;
