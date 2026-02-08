import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  getCurrentUserProfile,
  updateCurrentUserProfile,
  listUsers,
  updateUserStatus,
  checkRegistrationStatus,
  getUsersByStatus,
  getDashboardStats,
  updateUserProfile,
  deleteUser,
  getUserDetailedActivity,
  verifyUser,
  resetPasswordSimple
} from "../controllers/userController.js";
import { uploadUserFields } from "../config/cloudinary.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Public routes with file upload
router.post("/register", uploadUserFields, registerUser);
router.post("/login", loginUser);
router.get("/status/:userId", checkRegistrationStatus);
router.post("/verify-user", verifyUser);
router.post("/reset-password-simple", resetPasswordSimple);

// Protected user routes (require authentication)
router.get("/me", authenticateToken, getCurrentUserProfile);
router.put("/me", authenticateToken, uploadUserFields, updateCurrentUserProfile);
router.get("/activity/:userId", getUserDetailedActivity);

// Admin routes
router.get("/profile/:userId", getUserProfile);
router.get("/list", listUsers);
router.patch("/status/:userId", updateUserStatus);
router.get("/by-status/:status", getUsersByStatus);
router.get("/dashboard/stats", getDashboardStats);

// Update and delete routes with file upload
router.put("/profile/:userId", uploadUserFields, updateUserProfile);
router.delete("/:userId", deleteUser);

export default router;