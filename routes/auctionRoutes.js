// routes/auctionRoutes.js
import express from "express";
import {
  createAuction,
  getMyAuctions,
  getAuctionDetails,
  getActiveAuctions,
  updateAuctionStatus,
  createLot,
  getAllAuctions,
  startAuction,
  endAuction,
  autoUpdateAuctionStatus,
  deleteAuction,
  updateAuction
} from "../controllers/auctionController.js";

// ✅ LOT CONTROLLER FUNCTIONS
import {
  getAllLots,
  getLotsByAuction,
  getLotDetails,
  updateLot,
  deleteLot,
  getMyLots,
  bulkUpdateLotStatus,
  getLotBiddingSummary
} from "../controllers/lotController.js";

import { authenticateToken, optionalAuth } from "../middleware/auth.js";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { uploadLotFields } from "../config/cloudinary.js";

const router = express.Router();

/* ----------------- ADMIN ONLY ----------------- */
// GET /api/auctions/admin/auctions?status=live&sellerId=AUC123&q=steel&page=1&limit=20
router.get("/admin/auctions", authenticateAdmin, getAllAuctions);

// GET /api/auctions/admin/lots?status=active&auctionId=AUCTION123&sellerId=USER456&category=electronics&minPrice=100&maxPrice=1000&search=laptop&page=1&limit=20
router.get("/admin/lots", authenticateAdmin, getAllLots);

/* --------------- USER-AUTH REQUIRED --------------- */
router.use(authenticateToken);

/* Seller only */
router.post("/create", createAuction);
router.post("/:auctionId/lots", uploadLotFields, createLot);
router.get("/my-auctions", getMyAuctions);
router.put("/:auctionId", updateAuction);
router.delete("/:auctionId", deleteAuction);
router.patch("/:auctionId/status", updateAuctionStatus);
router.post("/:auctionId/start", startAuction);
router.post("/:auctionId/end", endAuction);
router.get("/my-lots", getMyLots);
router.put("/lots/:lotId", uploadLotFields, updateLot);
router.delete("/lots/:lotId", deleteLot);
router.patch("/lots/bulk-status", bulkUpdateLotStatus);

/* --------------- MIXED / PUBLIC ----------------- */
router.get("/:auctionId/details", getAuctionDetails);

/* Public (optional auth) */
router.get("/active", optionalAuth, getActiveAuctions);
router.get("/:auctionId/lots", optionalAuth, getLotsByAuction);
router.get("/lots/:lotId", optionalAuth, getLotDetails);
router.get("/lots/:lotId/summary", optionalAuth, getLotBiddingSummary);

export default router;