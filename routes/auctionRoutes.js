// routes/auctionRoutes.js
import express from "express";
import {
  createAuction,
  getMyAuctions,
  getAuctionDetails,
  getActiveAuctions,
  updateAuctionStatus,
  createLot,
  getAllAuctions, // ✅ NEW EXPORT
} from "../controllers/auctionController.js";

// ✅ LOT CONTROLLER FUNCTIONS
import {
  getLotsByAuction,
  getLotDetails,
  updateLot,
  deleteLot,
  getMyLots
} from "../controllers/lotController.js";

import { authenticateToken, optionalAuth } from "../middleware/auth.js";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { uploadLotFields } from "../config/cloudinary.js";

const router = express.Router();

/* ----------------- ADMIN ONLY ----------------- */
// e.g. GET /api/auctions/admin/auctions?status=live&sellerId=AUC123&q=steel&page=1&limit=20
router.get("/admin/auctions", authenticateAdmin, getAllAuctions);

/* --------------- USER-AUTH REQUIRED --------------- */
router.use(authenticateToken);

/* Seller only */
router.post("/create", createAuction); // sellerOnly is enforced inside controller flow by checking seller role via middleware earlier if you used it
// If you already had sellerOnly middleware elsewhere, keep it: router.post("/create", sellerOnly, createAuction);

router.post("/:auctionId/lots", uploadLotFields, createLot); // add sellerOnly if you use it in your project
router.get("/my-auctions", getMyAuctions);
router.patch("/:auctionId/status", updateAuctionStatus);
router.get("/my-lots", getMyLots);
router.put("/lots/:lotId", uploadLotFields, updateLot);
router.delete("/lots/:lotId", deleteLot);

/* --------------- MIXED / PUBLIC ----------------- */
router.get("/:auctionId/details", getAuctionDetails);

/* Public (optional auth) */
router.get("/active", optionalAuth, getActiveAuctions);
router.get("/:auctionId/lots", optionalAuth, getLotsByAuction);
router.get("/lots/:lotId", optionalAuth, getLotDetails);

export default router;