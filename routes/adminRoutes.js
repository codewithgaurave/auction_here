import express from "express";
import { createAdmin, loginAdmin, listAdmins } from "../controllers/adminController.js";

const router = express.Router();

router.post("/create", createAdmin);
router.post("/login", loginAdmin);
router.get("/list", listAdmins);

export default router;
