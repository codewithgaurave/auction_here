// routes/dashboardRoutes.js
import express from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { getAdminDashboardOverview } from "../controllers/dashboardController.js";

const router = express.Router();

// GET /api/admin/dashboard/overview?range=30d&tzOffsetMinutes=330
router.get("/admin/dashboard/overview", authenticateAdmin, getAdminDashboardOverview);

export default router;
