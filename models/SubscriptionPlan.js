// models/SubscriptionPlan.js
import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema({
  planId: { type: String, required: true, unique: true },
  name: { type: String, required: true }, // e.g., Starter, Pro
  description: { type: String },
  userType: {
    type: String,
    required: true,
    enum: ["Seller", "Buyer", "Seller & Buyer Both"]
  },

  // Pricing & validity
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "INR" },
  durationDays: { type: Number, required: true, min: 1 },

  // Quotas (null/undefined => unlimited)
  sellerAuctionLimit: { type: Number, min: 0 }, // applicable for Seller / Both
  buyerBidLimit: { type: Number, min: 0 },      // applicable for Buyer / Both

  features: [{ type: String }],

  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdByAdminId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

subscriptionPlanSchema.index({ userType: 1, name: 1 }, { unique: true });

const SubscriptionPlan = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
export default SubscriptionPlan;
