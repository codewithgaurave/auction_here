import mongoose from "mongoose";
import Auction from "./models/Auction.js";
import Lot from "./models/Lot.js";
import Bid from "./models/Bid.js";
import User from "./models/User.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

const generateAuctionId = () => "AUC" + Math.random().toString(36).substr(2, 9).toUpperCase();
const generateLotId = () => "LOT" + Math.random().toString(36).substr(2, 9).toUpperCase();
const generateBidId = () => "BID" + Math.random().toString(36).substr(2, 9).toUpperCase();

async function seedTestData() {
  try {
    console.log("🌱 Seeding test data...");

    // Find existing users to use as sellers and bidders
    const users = await User.find({ registrationStatus: "approved" }).limit(5);
    if (users.length < 2) {
      console.log("❌ Need at least 2 approved users to seed test data");
      return;
    }

    const seller = users[0];
    const bidders = users.slice(1);

    // Create upcoming auctions
    const upcomingAuctions = [
      {
        auctionId: generateAuctionId(),
        sellerId: seller.userId,
        auctionName: "Luxury Car Collection",
        description: "Premium vintage and luxury cars",
        category: "Automobile",
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        startTime: "10:00",
        endTime: "18:00",
        status: "upcoming"
      },
      {
        auctionId: generateAuctionId(),
        sellerId: seller.userId,
        auctionName: "Antique Jewelry Auction",
        description: "Rare and precious jewelry collection",
        category: "Jewelry",
        startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        startTime: "14:00",
        endTime: "20:00",
        status: "upcoming"
      }
    ];

    // Create live auction
    const liveAuction = {
      auctionId: generateAuctionId(),
      sellerId: seller.userId,
      auctionName: "Electronics Mega Sale",
      description: "Latest gadgets and electronics",
      category: "Electronics",
      startDate: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      endDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      startTime: "09:00",
      endTime: "21:00",
      status: "live"
    };

    // Save auctions
    const savedUpcoming = await Auction.insertMany(upcomingAuctions);
    const savedLive = await Auction.create(liveAuction);
    
    console.log(`✅ Created ${savedUpcoming.length + 1} auctions`);

    // Create lots for live auction
    const lots = [
      {
        lotId: generateLotId(),
        auctionId: savedLive.auctionId,
        sellerId: seller.userId,
        lotName: "iPhone 15 Pro Max",
        description: "Brand new iPhone 15 Pro Max 256GB",
        category: "Electronics",
        quantity: 1,
        unit: "piece",
        startPrice: 50000,
        reservePrice: 80000,
        minIncrement: 1000,
        currentBid: 50000,
        status: "active"
      },
      {
        lotId: generateLotId(),
        auctionId: savedLive.auctionId,
        sellerId: seller.userId,
        lotName: "MacBook Pro M3",
        description: "Latest MacBook Pro with M3 chip",
        category: "Electronics",
        quantity: 1,
        unit: "piece",
        startPrice: 120000,
        reservePrice: 150000,
        minIncrement: 2000,
        currentBid: 125000,
        status: "active"
      }
    ];

    const savedLots = await Lot.insertMany(lots);
    console.log(`✅ Created ${savedLots.length} lots`);

    // Update auction with lot references
    savedLive.lots = savedLots.map(lot => lot._id);
    savedLive.totalLots = savedLots.length;
    await savedLive.save();

    // Create some bids
    const bids = [];
    for (let i = 0; i < bidders.length && i < 3; i++) {
      const bidder = bidders[i];
      
      // Bid on iPhone
      bids.push({
        bidId: generateBidId(),
        auctionId: savedLive.auctionId,
        lotId: savedLots[0].lotId,
        bidderId: bidder.userId,
        amount: 52000 + (i * 1000),
        status: "valid"
      });

      // Bid on MacBook
      bids.push({
        bidId: generateBidId(),
        auctionId: savedLive.auctionId,
        lotId: savedLots[1].lotId,
        bidderId: bidder.userId,
        amount: 127000 + (i * 2000),
        status: "valid"
      });
    }

    await Bid.insertMany(bids);
    console.log(`✅ Created ${bids.length} bids`);

    // Update lots with current highest bids
    if (bids.length > 0) {
      const iphoneBids = bids.filter(b => b.lotId === savedLots[0].lotId);
      const macbookBids = bids.filter(b => b.lotId === savedLots[1].lotId);
      
      if (iphoneBids.length > 0) {
        const highestIphone = iphoneBids.reduce((max, bid) => bid.amount > max.amount ? bid : max);
        await Lot.updateOne(
          { lotId: savedLots[0].lotId },
          { 
            currentBid: highestIphone.amount,
            currentBidder: highestIphone.bidderId
          }
        );
      }

      if (macbookBids.length > 0) {
        const highestMacbook = macbookBids.reduce((max, bid) => bid.amount > max.amount ? bid : max);
        await Lot.updateOne(
          { lotId: savedLots[1].lotId },
          { 
            currentBid: highestMacbook.amount,
            currentBidder: highestMacbook.bidderId
          }
        );
      }
    }

    console.log("🎉 Test data seeded successfully!");
    console.log(`📊 Summary:`);
    console.log(`   - ${savedUpcoming.length} upcoming auctions`);
    console.log(`   - 1 live auction`);
    console.log(`   - ${savedLots.length} lots`);
    console.log(`   - ${bids.length} bids`);

  } catch (error) {
    console.error("❌ Error seeding test data:", error);
  } finally {
    mongoose.connection.close();
  }
}

seedTestData();