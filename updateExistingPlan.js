// updateExistingPlan.js - Script to update existing plan tiers
import mongoose from "mongoose";
import SubscriptionPlan from "./models/SubscriptionPlan.js";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected for updating plans");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const updateExistingPlans = async () => {
  try {
    // Update the existing Buyer Pro plan to have tier 2
    const buyerProUpdate = await SubscriptionPlan.findOneAndUpdate(
      { name: "Buyer Pro", userType: "Buyer" },
      { 
        tier: 2,
        description: "Great for regular bidders",
        updatedAt: new Date()
      },
      { new: true }
    );

    if (buyerProUpdate) {
      console.log("✅ Updated Buyer Pro plan with tier 2");
    }

    // Update the existing Seller Basic plan to have tier 1
    const sellerBasicUpdate = await SubscriptionPlan.findOneAndUpdate(
      { name: "Seller Basic", userType: "Seller" },
      { 
        tier: 1,
        description: "Perfect for new sellers",
        updatedAt: new Date()
      },
      { new: true }
    );

    if (sellerBasicUpdate) {
      console.log("✅ Updated Seller Basic plan with tier 1");
    }

    console.log("🎉 Plan updates completed!");

  } catch (error) {
    console.error("❌ Error updating plans:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
};

// Run the update
connectDB().then(() => {
  updateExistingPlans();
});