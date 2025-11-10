// routes/auctionRoutes.js
import express from "express";
import {
  createAuction,
  getMyAuctions,
  getAuctionDetails,
  getActiveAuctions,
  updateAuctionStatus
} from "../controllers/auctionController.js";

// ✅ IMPORT LOT CONTROLLER FUNCTIONS
import {
  createLot,
  getLotsByAuction,
  getLotDetails,
  updateLot,
  deleteLot,
  getMyLots
} from "../controllers/lotController.js";  // ❌ YEH IMPORT ADD KARO

import { authenticateToken, sellerOnly, optionalAuth } from "../middleware/auth.js";
import { uploadLotFields } from "../config/cloudinary.js";

const router = express.Router();

// 🔒 Protected Routes (Authentication required)
router.use(authenticateToken);

// 🔒 Seller Only Routes
router.post("/create", sellerOnly, createAuction);

// ✅ YAHAN createLot LOT CONTROLLER SE AAYEGA
router.post("/:auctionId/lots", sellerOnly, uploadLotFields, createLot);

router.get("/my-auctions", sellerOnly, getMyAuctions);
router.patch("/:auctionId/status", sellerOnly, updateAuctionStatus);
router.get("/my-lots", sellerOnly, getMyLots);
router.put("/lots/:lotId", sellerOnly, uploadLotFields, updateLot);
router.delete("/lots/:lotId", sellerOnly, deleteLot);

// 🔐 Authenticated but not necessarily seller
router.get("/:auctionId/details", getAuctionDetails);

// 🌐 Public Routes (Optional authentication)
router.get("/active", optionalAuth, getActiveAuctions);
router.get("/:auctionId/lots", optionalAuth, getLotsByAuction);
router.get("/lots/:lotId", optionalAuth, getLotDetails);

export default router;