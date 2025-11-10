import mongoose from "mongoose";

const auctionSchema = new mongoose.Schema({
  auctionId: { type: String, required: true, unique: true },
  sellerId: { type: String, required: true }, // Reference to user who created auction
  auctionName: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  status: { 
    type: String, 
    default: "upcoming",
    enum: ["upcoming", "live", "completed", "cancelled"]
  },
  lots: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lot" }],
  totalLots: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Auction = mongoose.model("Auction", auctionSchema);
export default Auction;