// routes/subscriptionRoutes.js
import express from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";
import {
  createPlan,
  listPlansAdmin,
  getPlan,
  updatePlan,
  deletePlan,
  listPlansPublic,
  purchasePlan,
  getMyActiveSubscription
} from "../controllers/subscriptionController.js";

const router = express.Router();

/* ----- PUBLIC: list active plans for browsing/purchase ----- */
router.get("/plans", optionalAuth, listPlansPublic);

/* ----- USER: purchase & view active ----- */
router.post("/purchase", authenticateToken, purchasePlan);
router.get("/my/active", authenticateToken, getMyActiveSubscription);

/* ----- ADMIN: full plan management ----- */
router.post("/admin/plans", authenticateAdmin, createPlan);
router.get("/admin/plans", authenticateAdmin, listPlansAdmin);
router.get("/admin/plans/:planId", authenticateAdmin, getPlan);
router.patch("/admin/plans/:planId", authenticateAdmin, updatePlan);
router.delete("/admin/plans/:planId", authenticateAdmin, deletePlan);

export default router;
