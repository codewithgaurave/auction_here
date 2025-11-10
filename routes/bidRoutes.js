// routes/bidRoutes.js
import express from "express";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";
import {
  placeBid,
  getHighestBid,
  listBidsForLot,
  getMyBids
} from "../controllers/bidController.js";

const router = express.Router();

// Public (optional auth)
router.get("/:lotId/highest", optionalAuth, getHighestBid);
router.get("/:lotId/list", optionalAuth, listBidsForLot);

// Auth required
router.use(authenticateToken);

router.post("/:lotId/place", placeBid);
router.get("/my", getMyBids);

export default router;
