// routes/dashboardRoutes.js
import express from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { authenticateToken } from "../middleware/auth.js";
import { getAdminDashboardOverview, getUserDashboard } from "../controllers/dashboardController.js";

const router = express.Router();

// GET /api/admin/dashboard/overview?range=30d&tzOffsetMinutes=330
router.get("/admin/dashboard/overview", authenticateAdmin, getAdminDashboardOverview);

// GET /api/dashboard/user - User dashboard
router.get("/user", authenticateToken, getUserDashboard);

export default router;
