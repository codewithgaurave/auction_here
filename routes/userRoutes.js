// routes/userRoutes.js
import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  listUsers,
  updateUserStatus,
  checkRegistrationStatus,
  getUsersByStatus,
  getDashboardStats,
  updateUserProfile,
  deleteUser
} from "../controllers/userController.js";
import { uploadUserFields } from "../config/cloudinary.js";

const router = express.Router();

// Public routes with file upload
router.post("/register", uploadUserFields, registerUser);
router.post("/login", loginUser);
router.get("/status/:userId", checkRegistrationStatus);

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