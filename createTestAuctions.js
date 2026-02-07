import mongoose from "mongoose";
import User from "./models/User.js";
import Auction from "./models/Auction.js";
import Lot from "./models/Lot.js";
import dotenv from "dotenv";

dotenv.config();
mongoose.connect(process.env.MONGO_URI);

const generateAuctionId = () => "AUC" + Math.random().toString(36).substr(2, 9).toUpperCase();
const generateLotId = () => "LOT" + Math.random().toString(36).substr(2, 9).toUpperCase();

async function createTestAuctions() {
  try {
    console.log("🔍 Finding seller...\n");

    const seller = await User.findOne({ 
      email: "testseller@demo.com",
      registrationStatus: "approved" 
    });

    if (!seller) {
      console.log("❌ Seller not found");
      return;
    }

    console.log(`✅ Seller Found: ${seller.name} (${seller.userId})\n`);

    const now = new Date();
    
    // ========== LIVE AUCTION (10 minutes) ==========
    const liveStartDate = new Date(now);
    const liveEndDate = new Date(now.getTime() + 10 * 60 * 1000); // +10 minutes

    const liveAuction = new Auction({
      auctionId: generateAuctionId(),
      sellerId: seller.userId,
      auctionName: "🔴 LIVE Test Auction - 10 Minutes",
      description: "Live auction for testing - ends in 10 minutes",
      category: "Electronics",
      startDate: liveStartDate,
      endDate: liveEndDate,
      startTime: liveStartDate.toTimeString().slice(0, 5),
      endTime: liveEndDate.toTimeString().slice(0, 5),
      status: "live",
      totalLots: 0
    });

    await liveAuction.save();
    console.log("✅ LIVE AUCTION CREATED:");
    console.log(`   ID: ${liveAuction.auctionId}`);
    console.log(`   Name: ${liveAuction.auctionName}`);
    console.log(`   Start: ${liveStartDate.toLocaleString()}`);
    console.log(`   End: ${liveEndDate.toLocaleString()}`);
    console.log(`   Duration: 10 minutes\n`);

    // Add lots to live auction
    const liveLots = [
      {
        lotName: "iPhone 15 Pro Max",
        description: "Brand new sealed iPhone 15 Pro Max 256GB",
        category: "Electronics",
        quantity: 1,
        unit: "piece",
        startPrice: 50000,
        reservePrice: 80000,
        minIncrement: 1000,
        images: ["https://via.placeholder.com/400x300?text=iPhone+15+Pro"]
      },
      {
        lotName: "MacBook Pro M3",
        description: "Latest MacBook Pro with M3 chip, 16GB RAM",
        category: "Electronics",
        quantity: 1,
        unit: "piece",
        startPrice: 100000,
        reservePrice: 150000,
        minIncrement: 2000,
        images: ["https://via.placeholder.com/400x300?text=MacBook+Pro"]
      },
      {
        lotName: "Sony WH-1000XM5",
        description: "Premium noise cancelling headphones",
        category: "Electronics",
        quantity: 2,
        unit: "pieces",
        startPrice: 15000,
        reservePrice: 25000,
        minIncrement: 500,
        images: ["https://via.placeholder.com/400x300?text=Sony+Headphones"]
      }
    ];

    console.log("📦 Adding lots to LIVE auction...");
    for (const lotData of liveLots) {
      const lot = new Lot({
        lotId: generateLotId(),
        auctionId: liveAuction.auctionId,
        sellerId: seller.userId,
        ...lotData,
        currentBid: lotData.startPrice,
        status: "active"
      });
      await lot.save();
      liveAuction.lots.push(lot._id);
      liveAuction.totalLots += 1;
      console.log(`   ✅ ${lot.lotName} - ₹${lot.startPrice}`);
    }
    await liveAuction.save();

    // ========== UPCOMING AUCTION ==========
    const upcomingStartDate = new Date(now.getTime() + 30 * 60 * 1000); // +30 minutes
    const upcomingEndDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours

    const upcomingAuction = new Auction({
      auctionId: generateAuctionId(),
      sellerId: seller.userId,
      auctionName: "⏰ UPCOMING Test Auction - Starts in 30 Min",
      description: "Upcoming auction - starts in 30 minutes",
      category: "Automobile",
      startDate: upcomingStartDate,
      endDate: upcomingEndDate,
      startTime: upcomingStartDate.toTimeString().slice(0, 5),
      endTime: upcomingEndDate.toTimeString().slice(0, 5),
      status: "upcoming",
      totalLots: 0
    });

    await upcomingAuction.save();
    console.log("\n✅ UPCOMING AUCTION CREATED:");
    console.log(`   ID: ${upcomingAuction.auctionId}`);
    console.log(`   Name: ${upcomingAuction.auctionName}`);
    console.log(`   Start: ${upcomingStartDate.toLocaleString()}`);
    console.log(`   End: ${upcomingEndDate.toLocaleString()}\n`);

    // Add lots to upcoming auction
    const upcomingLots = [
      {
        lotName: "BMW 3 Series 2020",
        description: "Well maintained BMW 3 Series, single owner",
        category: "Automobile",
        quantity: 1,
        unit: "vehicle",
        startPrice: 2000000,
        reservePrice: 2500000,
        minIncrement: 50000,
        images: ["https://via.placeholder.com/400x300?text=BMW+3+Series"]
      },
      {
        lotName: "Honda City 2021",
        description: "Honda City VX model, excellent condition",
        category: "Automobile",
        quantity: 1,
        unit: "vehicle",
        startPrice: 800000,
        reservePrice: 1000000,
        minIncrement: 20000,
        images: ["https://via.placeholder.com/400x300?text=Honda+City"]
      }
    ];

    console.log("📦 Adding lots to UPCOMING auction...");
    for (const lotData of upcomingLots) {
      const lot = new Lot({
        lotId: generateLotId(),
        auctionId: upcomingAuction.auctionId,
        sellerId: seller.userId,
        ...lotData,
        currentBid: lotData.startPrice,
        status: "active"
      });
      await lot.save();
      upcomingAuction.lots.push(lot._id);
      upcomingAuction.totalLots += 1;
      console.log(`   ✅ ${lot.lotName} - ₹${lot.startPrice}`);
    }
    await upcomingAuction.save();

    console.log("\n" + "=".repeat(60));
    console.log("🎉 SUCCESS! Test auctions created");
    console.log("=".repeat(60));
    console.log("\n📊 SUMMARY:");
    console.log(`   🔴 LIVE Auction: ${liveAuction.auctionId}`);
    console.log(`      - ${liveAuction.totalLots} lots`);
    console.log(`      - Ends in 10 minutes`);
    console.log(`\n   ⏰ UPCOMING Auction: ${upcomingAuction.auctionId}`);
    console.log(`      - ${upcomingAuction.totalLots} lots`);
    console.log(`      - Starts in 30 minutes`);
    console.log("\n💡 Login to app and start bidding!");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    mongoose.connection.close();
  }
}

createTestAuctions();
