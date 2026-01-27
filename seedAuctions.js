// seedAuctions.js - Script to create live auctions with lots
import mongoose from "mongoose";
import Auction from "./models/Auction.js";
import Lot from "./models/Lot.js";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const genAuctionId = () =>
  "AUC" + Math.random().toString(36).substr(2, 9).toUpperCase();

const genLotId = () =>
  "LOT" + Math.random().toString(36).substr(2, 9).toUpperCase();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected for seeding auctions");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const seedAuctions = async () => {
  try {
    // Find a seller user (or create a demo seller)
    let seller = await User.findOne({ userType: { $in: ["Seller", "Seller & Buyer Both"] }, registrationStatus: "approved" });
    
    if (!seller) {
      // Create a demo seller if none exists
      const sellerId = "SELLER" + Math.random().toString(36).substr(2, 6).toUpperCase();
      seller = new User({
        userId: sellerId,
        password: "hashedpassword123", // In real app, this should be properly hashed
        name: "Demo Seller",
        email: `seller${Date.now()}@example.com`,
        phone: "9876543210",
        city: "Mumbai",
        userType: "Seller",
        organizationType: "individual",
        registrationStatus: "approved",
        profilePhoto: "https://via.placeholder.com/150",
        documents: {
          pan: "ABCDE1234F",
          aadhar: "123456789012"
        }
      });
      await seller.save();
      console.log("✅ Created demo seller:", seller.name);
    }

    // Create multiple auctions with different statuses
    const auctionsData = [
      {
        name: "Electronics & Gadgets Auction",
        description: "Premium electronics and latest gadgets auction",
        category: "Electronics",
        status: "live",
        lots: [
          {
            name: "iPhone 15 Pro Max",
            description: "Brand new iPhone 15 Pro Max 256GB in original packaging",
            category: "Mobile Phones",
            quantity: 1,
            unit: "piece",
            startPrice: 80000,
            reservePrice: 120000,
            minIncrement: 1000,
            images: ["https://via.placeholder.com/300x300?text=iPhone+15+Pro"]
          },
          {
            name: "MacBook Pro M3",
            description: "Latest MacBook Pro with M3 chip, 16GB RAM, 512GB SSD",
            category: "Laptops",
            quantity: 1,
            unit: "piece",
            startPrice: 150000,
            reservePrice: 200000,
            minIncrement: 2000,
            images: ["https://via.placeholder.com/300x300?text=MacBook+Pro"]
          },
          {
            name: "Sony WH-1000XM5 Headphones",
            description: "Premium noise-cancelling wireless headphones",
            category: "Audio",
            quantity: 2,
            unit: "pieces",
            startPrice: 15000,
            reservePrice: 25000,
            minIncrement: 500,
            images: ["https://via.placeholder.com/300x300?text=Sony+Headphones"]
          }
        ]
      },
      {
        name: "Antique & Collectibles Auction",
        description: "Rare antiques and valuable collectibles",
        category: "Antiques",
        status: "live",
        lots: [
          {
            name: "Vintage Rolex Watch",
            description: "1960s Rolex Submariner in excellent condition",
            category: "Watches",
            quantity: 1,
            unit: "piece",
            startPrice: 500000,
            reservePrice: 800000,
            minIncrement: 10000,
            images: ["https://via.placeholder.com/300x300?text=Vintage+Rolex"]
          },
          {
            name: "Ancient Coin Collection",
            description: "Collection of rare ancient coins from various civilizations",
            category: "Coins",
            quantity: 50,
            unit: "pieces",
            startPrice: 25000,
            reservePrice: 50000,
            minIncrement: 1000,
            images: ["https://via.placeholder.com/300x300?text=Ancient+Coins"]
          }
        ]
      },
      {
        name: "Art & Paintings Auction",
        description: "Contemporary and classical art pieces",
        category: "Art",
        status: "upcoming",
        lots: [
          {
            name: "Abstract Oil Painting",
            description: "Original abstract oil painting by renowned artist",
            category: "Paintings",
            quantity: 1,
            unit: "piece",
            startPrice: 75000,
            reservePrice: 150000,
            minIncrement: 2500,
            images: ["https://via.placeholder.com/300x300?text=Abstract+Art"]
          },
          {
            name: "Bronze Sculpture",
            description: "Handcrafted bronze sculpture, limited edition",
            category: "Sculptures",
            quantity: 1,
            unit: "piece",
            startPrice: 100000,
            reservePrice: 200000,
            minIncrement: 5000,
            images: ["https://via.placeholder.com/300x300?text=Bronze+Sculpture"]
          }
        ]
      },
      {
        name: "Automotive Parts Auction",
        description: "Premium automotive parts and accessories",
        category: "Automotive",
        status: "live",
        lots: [
          {
            name: "BMW Engine Parts Set",
            description: "Complete engine parts set for BMW 3 Series",
            category: "Engine Parts",
            quantity: 1,
            unit: "set",
            startPrice: 45000,
            reservePrice: 75000,
            minIncrement: 1500,
            images: ["https://via.placeholder.com/300x300?text=BMW+Parts"]
          },
          {
            name: "Michelin Tire Set",
            description: "Brand new Michelin tires 225/45R17",
            category: "Tires",
            quantity: 4,
            unit: "pieces",
            startPrice: 20000,
            reservePrice: 35000,
            minIncrement: 1000,
            images: ["https://via.placeholder.com/300x300?text=Michelin+Tires"]
          }
        ]
      }
    ];

    // Create auctions and lots
    for (const auctionData of auctionsData) {
      // Check if auction already exists
      const existingAuction = await Auction.findOne({ 
        auctionName: auctionData.name,
        sellerId: seller.userId 
      });
      
      if (existingAuction) {
        console.log(`⚠️ Auction already exists: ${auctionData.name}`);
        continue;
      }

      // Create auction dates
      const now = new Date();
      const startDate = new Date(now);
      const endDate = new Date(now);
      
      if (auctionData.status === "live") {
        startDate.setHours(now.getHours() - 1); // Started 1 hour ago
        endDate.setHours(now.getHours() + 6);   // Ends in 6 hours
      } else if (auctionData.status === "upcoming") {
        startDate.setHours(now.getHours() + 2); // Starts in 2 hours
        endDate.setHours(now.getHours() + 8);   // Ends in 8 hours
      }

      // Create auction
      const auction = new Auction({
        auctionId: genAuctionId(),
        sellerId: seller.userId,
        auctionName: auctionData.name,
        description: auctionData.description,
        category: auctionData.category,
        startDate: startDate,
        endDate: endDate,
        startTime: startDate.toTimeString().slice(0, 5),
        endTime: endDate.toTimeString().slice(0, 5),
        status: auctionData.status,
        totalLots: auctionData.lots.length
      });

      await auction.save();
      console.log(`✅ Created auction: ${auction.auctionName} (${auction.status})`);

      // Create lots for this auction
      const lotIds = [];
      for (const lotData of auctionData.lots) {
        const lot = new Lot({
          lotId: genLotId(),
          auctionId: auction.auctionId,
          sellerId: seller.userId,
          lotName: lotData.name,
          description: lotData.description,
          category: lotData.category,
          quantity: lotData.quantity,
          unit: lotData.unit,
          startPrice: lotData.startPrice,
          reservePrice: lotData.reservePrice,
          minIncrement: lotData.minIncrement,
          currentBid: lotData.startPrice,
          images: lotData.images || [],
          proofOfOwnership: "demo-document.pdf",
          status: "active"
        });

        await lot.save();
        lotIds.push(lot._id);
        console.log(`  ✅ Created lot: ${lot.lotName} (₹${lot.startPrice})`);
      }

      // Update auction with lot references
      auction.lots = lotIds;
      await auction.save();
    }

    console.log("🎉 Auction seeding completed!");
    
    // Display summary
    const totalAuctions = await Auction.countDocuments();
    const liveAuctions = await Auction.countDocuments({ status: "live" });
    const upcomingAuctions = await Auction.countDocuments({ status: "upcoming" });
    const totalLots = await Lot.countDocuments();
    
    console.log("\n📊 Auction Summary:");
    console.log(`Total Auctions: ${totalAuctions}`);
    console.log(`Live Auctions: ${liveAuctions}`);
    console.log(`Upcoming Auctions: ${upcomingAuctions}`);
    console.log(`Total Lots: ${totalLots}`);

  } catch (error) {
    console.error("❌ Error seeding auctions:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
};

// Run the seeding
connectDB().then(() => {
  seedAuctions();
});