// controllers/lotController.js
import Lot from "../models/Lot.js";
import Auction from "../models/Auction.js";
import { cloudinary } from "../config/cloudinary.js";

// Helper function to generate unique lot ID
const generateLotId = () => {
  return "LOT" + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Helper function to delete uploaded files if operation fails
const deleteUploadedFiles = async (files) => {
  try {
    if (!files) return;

    const deletePromises = [];
    
    // Delete images
    if (files.images) {
      files.images.forEach(file => {
        const publicId = file.filename;
        deletePromises.push(cloudinary.uploader.destroy(publicId));
      });
    }

    // Delete proof of ownership
    if (files.proofOfOwnership) {
      const publicId = files.proofOfOwnership[0].filename;
      deletePromises.push(cloudinary.uploader.destroy(publicId));
    }

    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting uploaded files:', error);
  }
};

// ✅ Get All Lots with Auction Details (Admin Only)
// ✅ Get All Lots with Auction Details (Admin Only) — FIXED via aggregation
export const getAllLots = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 20,
      status,
      auctionId,
      sellerId,
      category,
      minPrice,
      maxPrice,
      search,
    } = req.query;

    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pg - 1) * lim;

    // ---- Build match filter (plain objects; auctionId/sellerId are strings) ----
    const match = {};

    if (status && status !== "all") match.status = status;
    if (auctionId) match.auctionId = auctionId;      // Lot.auctionId is a STRING like "AUCXXXX"
    if (sellerId) match.sellerId = sellerId;         // sellerId string
    if (category) match.category = category;

    if (minPrice || maxPrice) {
      match.currentBid = {};
      if (minPrice) match.currentBid.$gte = parseFloat(minPrice);
      if (maxPrice) match.currentBid.$lte = parseFloat(maxPrice);
    }

    if (search && String(search).trim()) {
      const term = String(search).trim();
      match.$or = [
        { lotName: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
        { lotId: { $regex: term, $options: "i" } },
      ];
    }

    // ---- total count ----
    const total = await Lot.countDocuments(match);

    // ---- aggregation with join to auctions by auctionId (string) ----
    const lots = await Lot.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: lim },

      // join auctions collection on auctionId (string -> string)
      {
        $lookup: {
          from: "auctions",
          localField: "auctionId",      // e.g. "AUC360NWEQET"
          foreignField: "auctionId",    // auction doc also has auctionId string
          as: "auction",
          pipeline: [
            {
              $project: {
                _id: 0,
                auctionId: 1,
                auctionName: 1,
                startDate: 1,
                endDate: 1,
                status: 1,
                sellerId: 1,
              },
            },
          ],
        },
      },
      { $addFields: { auction: { $first: "$auction" } } },

      // shape output
      {
        $project: {
          _id: 0,
          lotId: 1,
          lotName: 1,
          description: 1,
          category: 1,
          quantity: 1,
          unit: 1,
          startPrice: 1,
          reservePrice: 1,
          minIncrement: 1,
          currentBid: 1,
          currentBidder: 1,
          status: 1,
          images: 1,
          sellerId: 1,
          createdAt: 1,
          updatedAt: 1,
          bidsCount: { $size: { $ifNull: ["$bids", []] } },
          imagesCount: { $size: { $ifNull: ["$images", []] } },
          auction: 1,
        },
      },
    ]);

    return res.json({
      success: true,
      page: pg,
      totalPages: Math.ceil(total / lim),
      totalLots: total,
      lots,
    });
  } catch (error) {
    console.error("Get all lots error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching all lots",
      error: error.message,
    });
  }
};

// ✅ Create Lot
export const createLot = async (req, res) => {
  let uploadedFiles = null;

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
      minIncrement
    } = req.body;

    uploadedFiles = req.files;

    // Validation
    if (!lotName || !description || !category || !quantity || !unit || !startPrice || !reservePrice || !minIncrement) {
      if (uploadedFiles) {
        await deleteUploadedFiles(uploadedFiles);
      }
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled."
      });
    }

    // Check if auction exists and user is the seller
    const auction = await Auction.findOne({ auctionId });
    if (!auction) {
      if (uploadedFiles) {
        await deleteUploadedFiles(uploadedFiles);
      }
      return res.status(404).json({
        success: false,
        message: "Auction not found"
      });
    }

    if (auction.sellerId !== req.user.userId) {
      if (uploadedFiles) {
        await deleteUploadedFiles(uploadedFiles);
      }
      return res.status(403).json({
        success: false,
        message: "You can only add lots to your own auctions"
      });
    }

    // Generate unique lot ID
    const lotId = generateLotId();

    // Handle file URLs from Cloudinary
    const images = [];
    let proofOfOwnership = "";

    // Process multiple images
    if (req.files && req.files.images) {
      req.files.images.forEach(file => {
        images.push(file.path);
      });
    }

    // Process proof of ownership document
    if (req.files && req.files.proofOfOwnership) {
      proofOfOwnership = req.files.proofOfOwnership[0].path;
    }

    // Create new lot
    const newLot = new Lot({
      lotId,
      auctionId: auction.auctionId,
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
      images,
      proofOfOwnership,
      status: "active"
    });

    const savedLot = await newLot.save();

    // Add lot to auction
    auction.lots.push(savedLot._id);
    auction.totalLots += 1;
    auction.updatedAt = new Date();
    await auction.save();

    // Return COMPLETE lot data including images
    return res.status(201).json({
      success: true,
      message: "Lot created successfully",
      lot: {
        lotId: savedLot.lotId,
        lotName: savedLot.lotName,
        auctionId: savedLot.auctionId,
        description: savedLot.description,
        category: savedLot.category,
        quantity: savedLot.quantity,
        unit: savedLot.unit,
        startPrice: savedLot.startPrice,
        reservePrice: savedLot.reservePrice,
        minIncrement: savedLot.minIncrement,
        currentBid: savedLot.currentBid,
        status: savedLot.status,
        images: savedLot.images,
        proofOfOwnership: savedLot.proofOfOwnership,
        imagesCount: savedLot.images ? savedLot.images.length : 0,
        createdAt: savedLot.createdAt
      }
    });

  } catch (error) {
    // Delete uploaded files if error occurs
    if (uploadedFiles) {
      await deleteUploadedFiles(uploadedFiles);
    }
    
    console.error("Create lot error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating lot",
      error: error.message
    });
  }
};

// ✅ Get Lots by Auction (Public)
export const getLotsByAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { page = 1, limit = 20, status = "active" } = req.query;
    const skip = (page - 1) * limit;

    const auction = await Auction.findOne({ auctionId });
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found"
      });
    }

    const filter = { auctionId };
    if (status !== 'all') {
      filter.status = status;
    }

    const lots = await Lot.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v -bids -proofOfOwnership');

    const total = await Lot.countDocuments(filter);

    return res.json({
      success: true,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalLots: total,
      auction: {
        auctionId: auction.auctionId,
        auctionName: auction.auctionName,
        status: auction.status
      },
      lots
    });

  } catch (error) {
    console.error("Get lots by auction error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching lots",
      error: error.message
    });
  }
};

// ✅ Get Lot Details (Public)
export const getLotDetails = async (req, res) => {
  try {
    const { lotId } = req.params;

    const lot = await Lot.findOne({ lotId })
      .populate('auctionId', 'auctionName startDate endDate status');

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: "Lot not found"
      });
    }

    // For public, don't show proof of ownership and full bid history
    const publicLot = {
      lotId: lot.lotId,
      auctionId: lot.auctionId,
      sellerId: lot.sellerId,
      lotName: lot.lotName,
      description: lot.description,
      category: lot.category,
      quantity: lot.quantity,
      unit: lot.unit,
      startPrice: lot.startPrice,
      reservePrice: lot.reservePrice,
      minIncrement: lot.minIncrement,
      currentBid: lot.currentBid,
      currentBidder: lot.currentBidder,
      status: lot.status,
      images: lot.images,
      createdAt: lot.createdAt,
      updatedAt: lot.updatedAt,
      auction: lot.auctionId
    };

    return res.json({
      success: true,
      lot: publicLot
    });

  } catch (error) {
    console.error("Get lot details error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching lot details",
      error: error.message
    });
  }
};

// ✅ Update Lot with Image Upload (Seller Only)
export const updateLot = async (req, res) => {
  let uploadedFiles = null;

  try {
    const { lotId } = req.params;
    const updateData = req.body;
    uploadedFiles = req.files;

    const lot = await Lot.findOne({ 
      lotId, 
      sellerId: req.user.userId 
    });

    if (!lot) {
      if (uploadedFiles) {
        await deleteUploadedFiles(uploadedFiles);
      }
      return res.status(404).json({
        success: false,
        message: "Lot not found or access denied"
      });
    }

    // Check if lot can be updated (no active bids)
    if (lot.bids.length > 0 && lot.currentBid > lot.startPrice) {
      if (uploadedFiles) {
        await deleteUploadedFiles(uploadedFiles);
      }
      return res.status(400).json({
        success: false,
        message: "Cannot update lot with active bids"
      });
    }

    // Handle image updates
    if (req.files && req.files.images) {
      // Delete old images from Cloudinary
      if (lot.images && lot.images.length > 0) {
        try {
          const deletePromises = lot.images.map(imageUrl => {
            const publicId = imageUrl.split('/').pop().split('.')[0];
            return cloudinary.uploader.destroy(`auction_lots/${publicId}`);
          });
          await Promise.all(deletePromises);
        } catch (error) {
          console.error('Error deleting old images:', error);
        }
      }

      // Add new images
      updateData.images = [];
      req.files.images.forEach(file => {
        updateData.images.push(file.path);
      });
    }

    // Handle proof of ownership update
    if (req.files && req.files.proofOfOwnership) {
      // Delete old proof of ownership from Cloudinary
      if (lot.proofOfOwnership) {
        try {
          const publicId = lot.proofOfOwnership.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`auction_lots/${publicId}`);
        } catch (error) {
          console.error('Error deleting old proof of ownership:', error);
        }
      }

      updateData.proofOfOwnership = req.files.proofOfOwnership[0].path;
    }

    // Update allowed fields
    const allowedUpdates = [
      'lotName', 
      'description', 
      'images', 
      'proofOfOwnership', 
      'category', 
      'quantity', 
      'unit',
      'startPrice',
      'reservePrice',
      'minIncrement'
    ];
    
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        lot[key] = updateData[key];
      }
    });

    lot.updatedAt = new Date();
    await lot.save();

    // Refresh the lot data
    const updatedLot = await Lot.findOne({ lotId });

    return res.json({
      success: true,
      message: "Lot updated successfully",
      lot: {
        lotId: updatedLot.lotId,
        lotName: updatedLot.lotName,
        description: updatedLot.description,
        category: updatedLot.category,
        quantity: updatedLot.quantity,
        unit: updatedLot.unit,
        startPrice: updatedLot.startPrice,
        reservePrice: updatedLot.reservePrice,
        minIncrement: updatedLot.minIncrement,
        currentBid: updatedLot.currentBid,
        status: updatedLot.status,
        images: updatedLot.images,
        proofOfOwnership: updatedLot.proofOfOwnership,
        updatedAt: updatedLot.updatedAt
      }
    });

  } catch (error) {
    // Delete uploaded files if error occurs
    if (uploadedFiles) {
      await deleteUploadedFiles(uploadedFiles);
    }
    
    console.error("Update lot error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating lot",
      error: error.message
    });
  }
};

// ✅ Delete Lot (Seller Only)
export const deleteLot = async (req, res) => {
  try {
    const { lotId } = req.params;

    const lot = await Lot.findOne({ 
      lotId, 
      sellerId: req.user.userId 
    });

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: "Lot not found or access denied"
      });
    }

    // Check if lot has bids
    if (lot.bids.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete lot with active bids"
      });
    }

    // Delete files from Cloudinary
    try {
      // Delete images
      if (lot.images && lot.images.length > 0) {
        const deleteImagePromises = lot.images.map(imageUrl => {
          const publicId = imageUrl.split('/').pop().split('.')[0];
          return cloudinary.uploader.destroy(`auction_lots/${publicId}`);
        });
        await Promise.all(deleteImagePromises);
      }

      // Delete proof of ownership
      if (lot.proofOfOwnership) {
        const publicId = lot.proofOfOwnership.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`auction_lots/${publicId}`);
      }
    } catch (cloudinaryError) {
      console.error('Error deleting files from Cloudinary:', cloudinaryError);
    }

    // Remove lot from auction
    await Auction.updateOne(
      { auctionId: lot.auctionId },
      { 
        $pull: { lots: lot._id },
        $inc: { totalLots: -1 }
      }
    );

    await Lot.deleteOne({ lotId });

    return res.json({
      success: true,
      message: "Lot deleted successfully"
    });

  } catch (error) {
    console.error("Delete lot error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting lot",
      error: error.message
    });
  }
};

// ✅ Get Seller's Lots
export const getMyLots = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, auctionId } = req.query;
    const skip = (page - 1) * limit;

    let filter = { sellerId: req.user.userId };
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (auctionId) {
      filter.auctionId = auctionId;
    }

    const lots = await Lot.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('auctionId', 'auctionName status')
      .select('-bids -__v');

    const total = await Lot.countDocuments(filter);

    return res.json({
      success: true,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalLots: total,
      lots
    });

  } catch (error) {
    console.error("Get my lots error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching lots",
      error: error.message
    });
  }
};

// ✅ Get Lot by ID (Detailed - for owner/admin)
export const getLotById = async (req, res) => {
  try {
    const { lotId } = req.params;

    const lot = await Lot.findOne({ lotId })
      .populate('auctionId', 'auctionName startDate endDate status sellerId');

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: "Lot not found"
      });
    }

    // Check if user is owner or admin
    const isOwner = lot.sellerId === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own lots."
      });
    }

    return res.json({
      success: true,
      lot
    });

  } catch (error) {
    console.error("Get lot by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching lot",
      error: error.message
    });
  }
};

// ✅ Update Lot Status (Seller Only)
export const updateLotStatus = async (req, res) => {
  try {
    const { lotId } = req.params;
    const { status } = req.body;

    const validStatuses = ["active", "sold", "unsold", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    const lot = await Lot.findOne({ 
      lotId, 
      sellerId: req.user.userId 
    });

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: "Lot not found or access denied"
      });
    }

    lot.status = status;
    lot.updatedAt = new Date();
    await lot.save();

    return res.json({
      success: true,
      message: `Lot status updated to ${status}`,
      lot: {
        lotId: lot.lotId,
        lotName: lot.lotName,
        status: lot.status,
        updatedAt: lot.updatedAt
      }
    });

  } catch (error) {
    console.error("Update lot status error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating lot status",
      error: error.message
    });
  }
};

// ✅ Search Lots (Public)
export const searchLots = async (req, res) => {
  try {
    const { 
      query, 
      category, 
      minPrice, 
      maxPrice, 
      page = 1, 
      limit = 20 
    } = req.query;
    
    const skip = (page - 1) * limit;

    let filter = { status: "active" };

    // Text search
    if (query) {
      filter.$or = [
        { lotName: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.currentBid = {};
      if (minPrice) filter.currentBid.$gte = parseFloat(minPrice);
      if (maxPrice) filter.currentBid.$lte = parseFloat(maxPrice);
    }

    const lots = await Lot.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('auctionId', 'auctionName status')
      .select('-bids -proofOfOwnership -__v');

    const total = await Lot.countDocuments(filter);

    return res.json({
      success: true,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalLots: total,
      lots
    });

  } catch (error) {
    console.error("Search lots error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while searching lots",
      error: error.message
    });
  }
};

// ✅ Get Lot Analytics (Seller Only)
export const getLotAnalytics = async (req, res) => {
  try {
    const { lotId } = req.params;

    const lot = await Lot.findOne({ 
      lotId, 
      sellerId: req.user.userId 
    });

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: "Lot not found or access denied"
      });
    }

    const analytics = {
      lotId: lot.lotId,
      lotName: lot.lotName,
      totalBids: lot.bids.length,
      currentBid: lot.currentBid,
      startPrice: lot.startPrice,
      reservePrice: lot.reservePrice,
      status: lot.status,
      views: 0,
      createdAt: lot.createdAt,
      bidHistory: lot.bids.map(bid => ({
        bidderId: bid.bidderId,
        amount: bid.amount,
        timestamp: bid.timestamp
      })).sort((a, b) => b.amount - a.amount)
    };

    return res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error("Get lot analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching lot analytics",
      error: error.message
    });
  }
};

export default {
  getAllLots,
  createLot,
  getLotsByAuction,
  getLotDetails,
  updateLot,
  deleteLot,
  getMyLots,
  getLotById,
  updateLotStatus,
  searchLots,
  getLotAnalytics
};