// models/UserSubscription.js
import mongoose from "mongoose";

const userSubscriptionSchema = new mongoose.Schema({
  userSubId: { type: String, required: true, unique: true },
  userId: { type: String, required: true }, // User.userId
  userType: {
    type: String,
    required: true,
    enum: ["Seller", "Buyer", "Seller & Buyer Both"]
  },
  planId: { type: String, required: true }, // SubscriptionPlan.planId

  // immutable snapshot at purchase time
  planSnapshot: {
    name: String,
    description: String,
    userType: String,
    price: Number,
    currency: String,
    durationDays: Number,
    features: [String],
    sellerAuctionLimit: Number, // plan limits captured
    buyerBidLimit: Number
  },

  // Counters (remaining)
  remainingAuctions: { type: Number }, // null = unlimited or not applicable
  remainingBids: { type: Number },     // null = unlimited or not applicable

  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  status: { type: String, enum: ["active", "expired", "cancelled"], default: "active" },

  // purchase/payment meta
  paymentRef: { type: String },
  createdBy: { type: String, enum: ["user", "admin"], default: "user" },
  createdByAdminId: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSubscriptionSchema.index({ userId: 1, status: 1 });
userSubscriptionSchema.index({ planId: 1 });

const UserSubscription = mongoose.model("UserSubscription", userSubscriptionSchema);
export default UserSubscription;
