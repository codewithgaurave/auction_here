// controllers/auctionController.js
import Auction from "../models/Auction.js";
import Lot from "../models/Lot.js";
// (Optional) direct import not needed for aggregation, but fine to keep if you need elsewhere
// import User from "../models/User.js";

// ⬇️ Subscription quota hooks
import { hasAuctionQuota, consumeAuctionQuota } from "../services/subscriptionQuota.js";

// ✅ Generate unique IDs
const generateAuctionId = () => {
  return "AUC" + Math.random().toString(36).substr(2, 9).toUpperCase();
};

const generateLotId = () => {
  return "LOT" + Math.random().toString(36).substr(2, 9).toUpperCase();
};

/* ---------------------------
   ADMIN: Get All Auctions (with seller name)
   GET /admin/auctions
   Query:
     - page (default 1)
     - limit (default 10)
     - status (upcoming|live|completed|cancelled)
     - sellerId (exact seller userId)
     - category
     - q (search: auctionId/auctionName)
---------------------------- */
export const getAllAuctions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sellerId,
      category,
      q
    } = req.query;

    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pg - 1) * lim;

    // Build match filter
    const match = {};
    if (status) match.status = status;
    if (sellerId) match.sellerId = sellerId; // sellerId is userId string
    if (category) match.category = category;
    if (q && String(q).trim()) {
      const term = String(q).trim();
      match.$or = [
        { auctionId: new RegExp(term, "i") },
        { auctionName: new RegExp(term, "i") }
      ];
    }

    // Total count (same filter)
    const total = await Auction.countDocuments(match);

    // Aggregation with seller (users collection) and lots
    const auctions = await Auction.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: lim },

      // Lookup seller by users.userId (NOT _id)
      {
        $lookup: {
          from: "users",               // collection name in Mongo
          localField: "sellerId",      // auction.sellerId (string userId)
          foreignField: "userId",      // users.userId (string)
          as: "seller"
        }
      },
      { $addFields: { seller: { $first: "$seller" } } },

      // Lookup lots (ObjectId refs)
      {
        $lookup: {
          from: "lots",
          localField: "lots",          // ObjectId[] in auction
          foreignField: "_id",
          as: "lots",
          pipeline: [
            { $project: { _id: 0, lotId: 1, lotName: 1, currentBid: 1, status: 1 } }
          ]
        }
      },

      // Shape output & drop internal fields you don't want
      {
        $project: {
          __v: 0,
          // keep all auction fields you need:
          auctionId: 1,
          sellerId: 1,
          auctionName: 1,
          description: 1,
          category: 1,
          startDate: 1,
          endDate: 1,
          startTime: 1,
          endTime: 1,
          status: 1,
          totalLots: 1,
          createdAt: 1,
          updatedAt: 1,
          lots: 1,
          // expose minimal seller info
          seller: {
            _id: 1,
            userId: 1,
            name: 1,
            email: 1
          }
        }
      }
    ]);

    // Add a convenience field sellerName at top-level
    const shaped = auctions.map(a => ({
      ...a,
      sellerName: a?.seller?.name || null
    }));

    return res.json({
      success: true,
      page: pg,
      limit: lim,
      totalPages: Math.ceil(total / lim),
      totalAuctions: total,
      count: shaped.length,
      auctions: shaped
    });
  } catch (error) {
    console.error("Admin getAllAuctions error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching all auctions",
      error: error.message
    });
  }
};

// ✅ Create Auction (Seller Only)
export const createAuction = async (req, res) => {
  try {
    const {
      auctionName,
      description,
      category,
      startDate,
      endDate,
      startTime,
      endTime
    } = req.body;

    // Validation
    if (!auctionName || !description || !category || !startDate || !endDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Check if end date/time is after start date/time
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
    
    if (endDateTime <= startDateTime) {
      return res.status(400).json({
        success: false,
        message: "End date/time must be after start date/time"
      });
    }

    // ⬇️ Subscription: Check auction quota before creating
    const quotaCheck = await hasAuctionQuota(req.user.userId);
    if (!quotaCheck.ok) {
      return res.status(402).json({
        success: false,
        message: quotaCheck.reason || "No active subscription / auction quota exhausted"
      });
    }

    // Create auction
    const newAuction = new Auction({
      auctionId: generateAuctionId(),
      sellerId: req.user.userId,
      auctionName,
      description,
      category,
      startDate: startDateTime,
      endDate: endDateTime,
      startTime,
      endTime,
      status: "upcoming"
    });

    await newAuction.save();

    // ⬇️ Subscription: consume auction quota after successful creation
    const consumed = await consumeAuctionQuota(req.user.userId);
    if (!consumed.ok) {
      // RARE race: quota got exhausted—rollback created auction to keep system consistent
      try {
        await Auction.deleteOne({ _id: newAuction._id });
      } catch (rollbackErr) {
        console.error("Auction rollback failed after quota consume error:", rollbackErr);
      }
      return res.status(402).json({
        success: false,
        message: consumed.reason || "Auction quota could not be consumed"
      });
    }

    return res.status(201).json({
      success: true,
      message: "Auction created successfully",
      auction: {
        auctionId: newAuction.auctionId,
        auctionName: newAuction.auctionName,
        category: newAuction.category,
        startDate: newAuction.startDate,
        endDate: newAuction.endDate,
        status: newAuction.status
      }
    });

  } catch (error) {
    console.error("Create auction error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating auction",
      error: error.message
    });
  }
};

// ✅ Create Lot in Auction (Seller Only)
export const createLot = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const {
      lotName,
      description,
      category,
      quantity,
      unit,
      startPrice,
      reservePrice,
      minIncrement,
      images,
      proofOfOwnership
    } = req.body;

    if (!lotName || !description || !category || !quantity || !unit || !startPrice || !reservePrice || !minIncrement) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled"
      });
    }

    const auction = await Auction.findOne({ auctionId, sellerId: req.user.userId });
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found or you don't have permission to add lots to this auction"
      });
    }

    if (auction.status === "completed" || auction.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot add lots to completed or cancelled auction"
      });
    }

    const newLot = new Lot({
      lotId: generateLotId(),
      auctionId,
      sellerId: req.user.userId,
      lotName,
      description,
      category,
      quantity: parseInt(quantity),
      unit,
      startPrice: parseFloat(startPrice),
      reservePrice: parseFloat(reservePrice),
      minIncrement: parseFloat(minIncrement),
      currentBid: parseFloat(startPrice),
      images: images || [],
      proofOfOwnership: proofOfOwnership || ""
    });

    await newLot.save();

    auction.lots.push(newLot._id);
    auction.totalLots += 1;
    auction.updatedAt = new Date();
    await auction.save();

    return res.status(201).json({
      success: true,
      message: "Lot created successfully in auction",
      lot: {
        lotId: newLot.lotId,
        lotName: newLot.lotName,
        auctionId: newLot.auctionId,
        startPrice: newLot.startPrice,
        reservePrice: newLot.reservePrice,
        status: newLot.status
      }
    });

  } catch (error) {
    console.error("Create lot error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating lot",
      error: error.message
    });
  }
};

// ✅ Get Seller's Auctions
export const getMyAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find({ sellerId: req.user.userId })
      .sort({ createdAt: -1 })
      .populate("lots", "lotName currentBid status")
      .select("-__v");

    return res.json({
      success: true,
      count: auctions.length,
      auctions
    });
  } catch (error) {
    console.error("Get my auctions error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching auctions",
      error: error.message
    });
  }
};

// ✅ Get Auction Details with Lots
export const getAuctionDetails = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const auction = await Auction.findOne({ auctionId })
      .populate({
        path: "lots",
        select: "lotId lotName description category startPrice currentBid reservePrice status images",
        options: { sort: { createdAt: -1 } }
      });

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found"
      });
    }

    return res.json({
      success: true,
      auction
    });
  } catch (error) {
    console.error("Get auction details error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching auction details",
      error: error.message
    });
  }
};

// ✅ Get All Active Auctions (Public)
export const getActiveAuctions = async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pg - 1) * lim;

    const filter = { status: { $in: ["upcoming", "live"] } };
    if (category) filter.category = category;

    const [auctions, total] = await Promise.all([
      Auction.find(filter)
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(lim)
        .populate("lots", "lotName startPrice currentBid images")
        .select("auctionId auctionName category startDate endDate status totalLots"),
      Auction.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      page: pg,
      totalPages: Math.ceil(total / lim),
      totalAuctions: total,
      auctions
    });
  } catch (error) {
    console.error("Get active auctions error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching auctions",
      error: error.message
    });
  }
};

// ✅ Update Auction Status (Seller)
export const updateAuctionStatus = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { status } = req.body;

    const validStatuses = ["upcoming", "live", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    const auction = await Auction.findOne({ auctionId, sellerId: req.user.userId });
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found or access denied"
      });
    }

    auction.status = status;
    auction.updatedAt = new Date();
    await auction.save();

    return res.json({
      success: true,
      message: `Auction status updated to ${status}`,
      auction: {
        auctionId: auction.auctionId,
        auctionName: auction.auctionName,
        status: auction.status
      }
    });
  } catch (error) {
    console.error("Update auction status error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating auction status",
      error: error.message
    });
  }
};