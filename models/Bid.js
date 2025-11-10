// models/Bid.js
import mongoose from "mongoose";

const bidSchema = new mongoose.Schema({
  bidId: { type: String, required: true, unique: true },
  auctionId: { type: String, required: true },   // String ref to Auction.auctionId
  lotId: { type: String, required: true },       // String ref to Lot.lotId
  bidderId: { type: String, required: true },    // String ref to User.userId
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    default: "valid",
    enum: ["valid", "outbid", "retracted"]
  },
  createdAt: { type: Date, default: Date.now }
});

// Helpful indexes
bidSchema.index({ lotId: 1, amount: -1, createdAt: -1 });
bidSchema.index({ bidderId: 1, createdAt: -1 });

const Bid = mongoose.model("Bid", bidSchema);
export default Bid;
