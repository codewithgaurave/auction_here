import mongoose from "mongoose";
import User from "./models/User.js";
import Bid from "./models/Bid.js";
import Lot from "./models/Lot.js";
import Auction from "./models/Auction.js";
import dotenv from "dotenv";

dotenv.config();

mongoose.connect(process.env.MONGO_URI);

async function getBuyerBidSummary() {
  try {
    console.log("🔍 Fetching buyer bid summary...\n");

    // Find buyer
    const buyer = await User.findOne({ 
      email: "testbuyer@demo.com",
      registrationStatus: "approved" 
    });

    if (!buyer) {
      console.log("❌ Buyer not found or not approved");
      return;
    }

    console.log("✅ BUYER DETAILS:");
    console.log("==================");
    console.log(`📧 Email: ${buyer.email}`);
    console.log(`👤 Name: ${buyer.name}`);
    console.log(`🔑 User ID: ${buyer.userId}`);
    console.log(`👥 Type: ${buyer.userType}`);
    console.log(`✅ Status: ${buyer.registrationStatus}\n`);

    // Get all bids by this buyer
    const bids = await Bid.find({ 
      bidderId: buyer.userId,
      status: "valid" 
    }).sort({ createdAt: -1 });

    console.log("📊 BID SUMMARY:");
    console.log("==================");
    console.log(`Total Bids: ${bids.length}\n`);

    if (bids.length === 0) {
      console.log("❌ No bids found for this buyer");
      console.log("\n💡 This is a new buyer account with no bidding history yet.");
      return;
    }

    // Get detailed bid information
    for (const bid of bids) {
      const lot = await Lot.findOne({ lotId: bid.lotId });
      const auction = lot ? await Auction.findOne({ auctionId: lot.auctionId }) : null;

      console.log("-------------------");
      console.log(`🎯 Bid ID: ${bid.bidId}`);
      console.log(`💰 Amount: ₹${bid.amount}`);
      console.log(`📅 Date: ${bid.createdAt}`);
      console.log(`✅ Status: ${bid.status}`);
      
      if (lot) {
        console.log(`📦 Lot: ${lot.lotName}`);
        console.log(`💵 Current Bid: ₹${lot.currentBid}`);
        console.log(`🏆 Winning: ${lot.currentBidder === buyer.userId ? "YES ✅" : "NO ❌"}`);
      }
      
      if (auction) {
        console.log(`🎪 Auction: ${auction.auctionName}`);
        console.log(`📊 Status: ${auction.status}`);
      }
      console.log("");
    }

    // Summary statistics
    const totalBidAmount = bids.reduce((sum, bid) => sum + bid.amount, 0);
    const winningBids = await Lot.countDocuments({ 
      currentBidder: buyer.userId,
      status: "active"
    });

    console.log("\n📈 STATISTICS:");
    console.log("==================");
    console.log(`Total Bids Placed: ${bids.length}`);
    console.log(`Total Amount Bid: ₹${totalBidAmount}`);
    console.log(`Currently Winning: ${winningBids} lots`);
    console.log(`Average Bid: ₹${(totalBidAmount / bids.length).toFixed(2)}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    mongoose.connection.close();
  }
}

getBuyerBidSummary();
