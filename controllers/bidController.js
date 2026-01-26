// controllers/bidController.js
import Bid from "../models/Bid.js";
import Lot from "../models/Lot.js";
import Auction from "../models/Auction.js";
import User from "../models/User.js";

// ⬇️ Subscription quota hooks
import { hasBidQuota, consumeBidQuota } from "../services/subscriptionQuota.js";

// ⬇️ Real-time and notification services
import { broadcastBidUpdate, handleBidNotifications } from "../services/realtimeService.js";

// ID generator
const generateBidId = () =>
  "BID" + Math.random().toString(36).substr(2, 9).toUpperCase();

/**
 * POST /api/bids/:lotId/place
 * Body: { amount }
 * Auth: required (approved Buyer or Seller & Buyer Both)
 */
export const placeBid = async (req, res) => {
  try {
    const { lotId } = req.params;
    const { amount } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    // Load user & verify eligibility
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    if (user.registrationStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.registrationStatus}. Bidding allowed only for approved users.`
      });
    }

    const userIsBuyer =
      user.userType === "Buyer" || user.userType === "Seller & Buyer Both";
    if (!userIsBuyer) {
      return res.status(403).json({ success: false, message: "Only buyers can place bids" });
    }

    // ⬇️ Check bid quota before attempting
    const bidQuota = await hasBidQuota(user.userId);
    if (!bidQuota.ok) {
      return res.status(402).json({
        success: false,
        message: bidQuota.reason || "No active subscription / bid quota exhausted"
      });
    }

    // Load lot and auction
    const lot = await Lot.findOne({ lotId });
    if (!lot) return res.status(404).json({ success: false, message: "Lot not found" });

    const auction = await Auction.findOne({ auctionId: lot.auctionId });
    if (!auction) return res.status(404).json({ success: false, message: "Auction not found" });

    // Prevent self-bidding
    if (lot.sellerId === user.userId) {
      return res.status(403).json({ success: false, message: "Sellers cannot bid on their own lots" });
    }

    // Auction must be LIVE and within time window
    const now = new Date();
    const withinWindow = now >= auction.startDate && now <= auction.endDate;
    if (auction.status !== "live" || !withinWindow) {
      return res.status(400).json({
        success: false,
        message: "Bidding is allowed only while the auction is LIVE and within the scheduled time window."
      });
    }

    // Lot must be active
    if (lot.status !== "active") {
      return res.status(400).json({ success: false, message: `Lot is ${lot.status}. Bidding not allowed.` });
    }

    const current = Number(lot.currentBid || 0);
    const startPrice = Number(lot.startPrice);
    const minInc = Number(lot.minIncrement || 0);

    // ✅ First bid vs subsequent bids
    const isFirstBid = (Array.isArray(lot.bids) ? lot.bids.length : 0) === 0;
    const minAllowed = isFirstBid ? startPrice : current + minInc;

    if (Number(amount) < minAllowed) {
      return res.status(400).json({
        success: false,
        message: `Bid too low. Minimum allowed is ${minAllowed}.`
      });
    }

    // --- Race-safe atomic update ---
    // Require the currentBid to match what we just read to avoid outbidding races.
    const updatedLot = await Lot.findOneAndUpdate(
      {
        lotId,
        status: "active",
        currentBid: current // optimistic concurrency check
      },
      {
        $set: {
          currentBid: Number(amount),
          currentBidder: user.userId,
          updatedAt: new Date()
        },
        $push: {
          bids: {
            bidderId: user.userId,
            amount: Number(amount),
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updatedLot) {
      // Someone else outbid in between
      return res.status(409).json({
        success: false,
        message: "You were outbid just now. Fetch the latest bid and try again."
      });
    }

    // ⬇️ Consume bid quota AFTER successful lot update.
    // If consume fails (rare), rollback the lot update to keep state consistent.
    const consume = await consumeBidQuota(user.userId);
    if (!consume.ok) {
      // ROLLBACK: revert currentBid/currentBidder to previous values & remove this pushed bid entry
      try {
        await Lot.findOneAndUpdate(
          {
            lotId,
            currentBid: Number(amount),
            currentBidder: user.userId
          },
          {
            $set: {
              currentBid: current,
              currentBidder: updatedLot.currentBidder === user.userId ? null : updatedLot.currentBidder,
              updatedAt: new Date()
            },
            $pull: {
              bids: { bidderId: user.userId, amount: Number(amount) }
            }
          }
        );
      } catch (rbErr) {
        console.error("Bid quota consume failed and rollback errored:", rbErr);
      }

      return res.status(402).json({
        success: false,
        message: consume.reason || "Bid quota could not be consumed"
      });
    }

    // Record bid document as well (for history & analytics queries)
    const bidDoc = new Bid({
      bidId: generateBidId(),
      auctionId: lot.auctionId,
      lotId: lot.lotId,
      bidderId: user.userId,
      amount: Number(amount),
      status: "valid"
    });
    await bidDoc.save();

    // ⬇️ Real-time bid update and notifications
    const io = req.app.get('io');
    if (io) {
      // Get previous bidder for notification
      const previousBidder = lot.bids && lot.bids.length > 1 
        ? lot.bids[lot.bids.length - 2] 
        : null;

      // Broadcast real-time update
      broadcastBidUpdate(io, {
        lotId: lot.lotId,
        auctionId: lot.auctionId,
        amount: Number(amount),
        bidderName: user.name,
        createdAt: bidDoc.createdAt,
        totalBids: lot.bids.length
      });

      // Send notifications (async, don't wait)
      handleBidNotifications({
        lotId: lot.lotId,
        lotName: lot.lotName,
        auctionId: lot.auctionId,
        auctionName: auction.auctionName,
        amount: Number(amount),
        bidderName: user.name,
        sellerId: lot.sellerId,
        createdAt: bidDoc.createdAt
      }, previousBidder).catch(err => {
        console.error('Notification error:', err);
      });
    }

    const reserveMet = Number(amount) >= Number(lot.reservePrice);

    return res.status(201).json({
      success: true,
      message: "Bid placed successfully",
      bid: {
        bidId: bidDoc.bidId,
        lotId: bidDoc.lotId,
        auctionId: bidDoc.auctionId,
        amount: bidDoc.amount,
        status: bidDoc.status,
        createdAt: bidDoc.createdAt,
        reserveMet
      },
      lot: {
        lotId: updatedLot.lotId,
        currentBid: updatedLot.currentBid,
        currentBidder: updatedLot.currentBidder
      }
    });
  } catch (error) {
    console.error("Place bid error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while placing bid",
      error: error.message
    });
  }
};

/**
 * GET /api/bids/:lotId/highest
 * Public (optional auth)
 */
export const getHighestBid = async (req, res) => {
  try {
    const { lotId } = req.params;
    const lot = await Lot.findOne({ lotId }).select(
      "lotId currentBid currentBidder startPrice minIncrement reservePrice status"
    );
    if (!lot) return res.status(404).json({ success: false, message: "Lot not found" });

    return res.json({
      success: true,
      lotId: lot.lotId,
      currentBid: lot.currentBid,
      currentBidder: lot.currentBidder,
      startPrice: lot.startPrice,
      minIncrement: lot.minIncrement,
      reservePrice: lot.reservePrice,
      status: lot.status
    });
  } catch (error) {
    console.error("Get highest bid error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * GET /api/bids/:lotId/list
 * Public (optional auth) – returns recent bids (sanitized)
 * Query: ?page=1&limit=20
 */
export const listBidsForLot = async (req, res) => {
  try {
    const { lotId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const lot = await Lot.findOne({ lotId }).select("lotId");
    if (!lot) return res.status(404).json({ success: false, message: "Lot not found" });

    const [bids, total] = await Promise.all([
      Bid.find({ lotId, status: "valid" })
        .sort({ createdAt: -1 }) // latest first; you can change to amount:-1 if you prefer highest first
        .skip(skip)
        .limit(parseInt(limit))
        .select("-_id bidId amount createdAt bidderId"),
      Bid.countDocuments({ lotId, status: "valid" })
    ]);

    return res.json({
      success: true,
      lotId,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalBids: total,
      bids
    });
  } catch (error) {
    console.error("List bids error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * GET /api/bids/my
 * Auth required – bidder's own bids with detailed info
 * Query: ?page=1&limit=20
 */
export const getMyBids = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Get bids with auction and lot details using aggregation
    const [bids, total] = await Promise.all([
      Bid.aggregate([
        { $match: { bidderId: req.user.userId } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        
        // Join with lots to get lot details
        {
          $lookup: {
            from: "lots",
            localField: "lotId",
            foreignField: "lotId",
            as: "lot"
          }
        },
        { $addFields: { lot: { $first: "$lot" } } },
        
        // Join with auctions to get auction details
        {
          $lookup: {
            from: "auctions",
            localField: "auctionId",
            foreignField: "auctionId",
            as: "auction"
          }
        },
        { $addFields: { auction: { $first: "$auction" } } },
        
        // Project the fields we need
        {
          $project: {
            _id: 0,
            bidId: 1,
            lotId: 1,
            auctionId: 1,
            amount: 1,
            status: 1,
            createdAt: 1,
            auctionName: "$auction.auctionName",
            auctionStatus: "$auction.status",
            auctionEndDate: "$auction.endDate",
            lotName: "$lot.lotName",
            category: "$lot.category",
            currentHighestBid: "$lot.currentBid",
            currentBidder: "$lot.currentBidder",
            isWinning: {
              $cond: {
                if: { $eq: ["$lot.currentBidder", req.user.userId] },
                then: true,
                else: false
              }
            }
          }
        }
      ]),
      Bid.countDocuments({ bidderId: req.user.userId })
    ]);

    return res.json({
      success: true,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalBids: total,
      bids
    });
  } catch (error) {
    console.error("Get my bids error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
