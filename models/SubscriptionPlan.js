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

  // Plan hierarchy for upgrades (1=Basic, 2=Pro, 3=Premium, etc.)
  tier: { type: Number, required: true, default: 1 },
  
  // Upgrade eligibility
  canUpgradeFrom: [{ type: String }], // Array of planIds that can upgrade to this plan
  canUpgradeTo: [{ type: String }],   // Array of planIds this plan can upgrade to

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
subscriptionPlanSchema.index({ userType: 1, tier: 1 });

const SubscriptionPlan = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
export default SubscriptionPlan;
