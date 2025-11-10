import mongoose from "mongoose";

const lotSchema = new mongoose.Schema({
  lotId: { type: String, required: true, unique: true },
  auctionId: { type: String, required: true }, // Reference to parent auction
  sellerId: { type: String, required: true }, // Seller who owns this lot
  lotName: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  startPrice: { type: Number, required: true },
  reservePrice: { type: Number, required: true },
  minIncrement: { type: Number, required: true },
  currentBid: { type: Number, default: 0 },
  currentBidder: { type: String }, // userId of current highest bidder
  status: { 
    type: String, 
    default: "active",
    enum: ["active", "sold", "unsold", "cancelled"]
  },
  images: [{ type: String }], // Array of image URLs
  proofOfOwnership: { type: String }, // Document URL
  bids: [{
    bidderId: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Lot = mongoose.model("Lot", lotSchema);
export default Lot;