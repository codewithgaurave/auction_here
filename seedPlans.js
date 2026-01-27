// seedPlans.js - Script to create multiple subscription plans
import mongoose from "mongoose";
import SubscriptionPlan from "./models/SubscriptionPlan.js";
import dotenv from "dotenv";

dotenv.config();

const genPlanId = () =>
  "PLAN" + Math.random().toString(36).substr(2, 9).toUpperCase();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected for seeding plans");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const seedPlans = async () => {
  try {
    // Clear existing plans (optional - comment out if you want to keep existing ones)
    // await SubscriptionPlan.deleteMany({});
    // console.log("🗑️ Cleared existing plans");

    const plans = [
      // BUYER PLANS
      {
        planId: genPlanId(),
        name: "Buyer Basic",
        description: "Perfect for casual bidders",
        userType: "Buyer",
        price: 499,
        currency: "INR",
        durationDays: 30,
        tier: 1,
        sellerAuctionLimit: null,
        buyerBidLimit: 20,
        features: [
          "Place up to 20 bids per month",
          "Basic notifications",
          "Email support"
        ],
        status: "active",
        createdByAdminId: "admin1"
      },
      {
        planId: genPlanId(),
        name: "Buyer Pro",
        description: "Great for regular bidders",
        userType: "Buyer",
        price: 799,
        currency: "INR",
        durationDays: 30,
        tier: 2,
        sellerAuctionLimit: null,
        buyerBidLimit: 50,
        features: [
          "Place up to 50 bids per month",
          "Priority notifications",
          "Email & chat support",
          "Bid history analytics"
        ],
        status: "active",
        createdByAdminId: "admin1"
      },
      {
        planId: genPlanId(),
        name: "Buyer Premium",
        description: "Best for professional bidders",
        userType: "Buyer",
        price: 1299,
        currency: "INR",
        durationDays: 30,
        tier: 3,
        sellerAuctionLimit: null,
        buyerBidLimit: null, // unlimited
        features: [
          "Unlimited bids",
          "Real-time notifications",
          "Priority support",
          "Advanced analytics",
          "Auto-bid feature",
          "Early access to auctions"
        ],
        status: "active",
        createdByAdminId: "admin1"
      },

      // SELLER PLANS
      {
        planId: genPlanId(),
        name: "Seller Basic",
        description: "Perfect for new sellers",
        userType: "Seller",
        price: 999,
        currency: "INR",
        durationDays: 30,
        tier: 1,
        sellerAuctionLimit: 3,
        buyerBidLimit: null,
        features: [
          "Create up to 3 auctions per month",
          "Basic listing features",
          "Email support"
        ],
        status: "active",
        createdByAdminId: "admin1"
      },
      {
        planId: genPlanId(),
        name: "Seller Pro",
        description: "Great for growing businesses",
        userType: "Seller",
        price: 1999,
        currency: "INR",
        durationDays: 30,
        tier: 2,
        sellerAuctionLimit: 10,
        buyerBidLimit: null,
        features: [
          "Create up to 10 auctions per month",
          "Featured listings",
          "Advanced analytics",
          "Priority support",
          "Custom auction duration"
        ],
        status: "active",
        createdByAdminId: "admin1"
      },
      {
        planId: genPlanId(),
        name: "Seller Premium",
        description: "Best for established businesses",
        userType: "Seller",
        price: 3999,
        currency: "INR",
        durationDays: 30,
        tier: 3,
        sellerAuctionLimit: null, // unlimited
        buyerBidLimit: null,
        features: [
          "Unlimited auctions",
          "Premium listing features",
          "Advanced marketing tools",
          "Dedicated account manager",
          "Custom branding",
          "API access"
        ],
        status: "active",
        createdByAdminId: "admin1"
      },

      // SELLER & BUYER BOTH PLANS
      {
        planId: genPlanId(),
        name: "Hybrid Basic",
        description: "Perfect for occasional buyers and sellers",
        userType: "Seller & Buyer Both",
        price: 1299,
        currency: "INR",
        durationDays: 30,
        tier: 1,
        sellerAuctionLimit: 2,
        buyerBidLimit: 15,
        features: [
          "Create up to 2 auctions per month",
          "Place up to 15 bids per month",
          "Basic features for both",
          "Email support"
        ],
        status: "active",
        createdByAdminId: "admin1"
      },
      {
        planId: genPlanId(),
        name: "Hybrid Pro",
        description: "Great for active traders",
        userType: "Seller & Buyer Both",
        price: 2499,
        currency: "INR",
        durationDays: 30,
        tier: 2,
        sellerAuctionLimit: 5,
        buyerBidLimit: 30,
        features: [
          "Create up to 5 auctions per month",
          "Place up to 30 bids per month",
          "Featured listings",
          "Priority notifications",
          "Advanced analytics",
          "Priority support"
        ],
        status: "active",
        createdByAdminId: "admin1"
      },
      {
        planId: genPlanId(),
        name: "Hybrid Premium",
        description: "Best for professional traders",
        userType: "Seller & Buyer Both",
        price: 4999,
        currency: "INR",
        durationDays: 30,
        tier: 3,
        sellerAuctionLimit: null, // unlimited
        buyerBidLimit: null, // unlimited
        features: [
          "Unlimited auctions and bids",
          "All premium features",
          "Dedicated account manager",
          "Custom branding",
          "API access",
          "Advanced marketing tools",
          "Real-time analytics"
        ],
        status: "active",
        createdByAdminId: "admin1"
      }
    ];

    // Insert plans
    for (const planData of plans) {
      const existingPlan = await SubscriptionPlan.findOne({ 
        name: planData.name, 
        userType: planData.userType 
      });
      
      if (!existingPlan) {
        const plan = new SubscriptionPlan(planData);
        await plan.save();
        console.log(`✅ Created plan: ${planData.name} (${planData.userType})`);
      } else {
        console.log(`⚠️ Plan already exists: ${planData.name} (${planData.userType})`);
      }
    }

    console.log("🎉 Plan seeding completed!");
    
    // Display summary
    const totalPlans = await SubscriptionPlan.countDocuments({ status: "active" });
    const buyerPlans = await SubscriptionPlan.countDocuments({ userType: "Buyer", status: "active" });
    const sellerPlans = await SubscriptionPlan.countDocuments({ userType: "Seller", status: "active" });
    const hybridPlans = await SubscriptionPlan.countDocuments({ userType: "Seller & Buyer Both", status: "active" });
    
    console.log("\n📊 Plan Summary:");
    console.log(`Total Active Plans: ${totalPlans}`);
    console.log(`Buyer Plans: ${buyerPlans}`);
    console.log(`Seller Plans: ${sellerPlans}`);
    console.log(`Hybrid Plans: ${hybridPlans}`);

  } catch (error) {
    console.error("❌ Error seeding plans:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
};

// Run the seeding
connectDB().then(() => {
  seedPlans();
});