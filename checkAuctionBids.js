import mongoose from "mongoose";
import User from "./models/User.js";
import Auction from "./models/Auction.js";
import Lot from "./models/Lot.js";
import Bid from "./models/Bid.js";
import dotenv from "dotenv";

dotenv.config();
mongoose.connect(process.env.MONGO_URI);

async function checkAuctionBidStatus() {
  try {
    console.log("🔍 Checking Auction & Bid Status...\n");

    // Get seller
    const seller = await User.findOne({ email: "testseller@demo.com" });
    const buyer = await User.findOne({ email: "testbuyer@demo.com" });

    if (!seller || !buyer) {
      console.log("❌ Users not found");
      return;
    }

    console.log("✅ USERS FOUND:");
    console.log(`   Seller: ${seller.name} (${seller.userId})`);
    console.log(`   Buyer: ${buyer.name} (${buyer.userId})\n`);

    // Get seller's auctions
    const auctions = await Auction.find({ sellerId: seller.userId })
      .sort({ createdAt: -1 })
      .limit(5);

    console.log(`📊 SELLER'S AUCTIONS: ${auctions.length}\n`);

    for (const auction of auctions) {
      console.log("=".repeat(60));
      console.log(`🎪 Auction: ${auction.auctionName}`);
      console.log(`   ID: ${auction.auctionId}`);
      console.log(`   Status: ${auction.status}`);
      console.log(`   Total Lots: ${auction.totalLots}`);

      // Get lots for this auction
      const lots = await Lot.find({ auctionId: auction.auctionId });
      
      console.log(`\n   📦 LOTS (${lots.length}):`);
      
      for (const lot of lots) {
        console.log(`\n   ├─ ${lot.lotName}`);
        console.log(`   │  Lot ID: ${lot.lotId}`);
        console.log(`   │  Start Price: ₹${lot.startPrice}`);
        console.log(`   │  Current Bid: ₹${lot.currentBid}`);
        console.log(`   │  Reserve Price: ₹${lot.reservePrice}`);
        console.log(`   │  Status: ${lot.status}`);
        
        // Get bids for this lot
        const bids = await Bid.find({ lotId: lot.lotId, status: "valid" })
          .sort({ amount: -1 });
        
        console.log(`   │  Total Bids: ${bids.length}`);
        
        if (bids.length > 0) {
          console.log(`   │`);
          console.log(`   │  🏆 HIGHEST BID:`);
          const highestBid = bids[0];
          const bidder = await User.findOne({ userId: highestBid.bidderId });
          
          console.log(`   │     Amount: ₹${highestBid.amount}`);
          console.log(`   │     Bidder: ${bidder?.name || 'Unknown'}`);
          console.log(`   │     Email: ${bidder?.email || 'N/A'}`);
          console.log(`   │     Phone: ${bidder?.phone || 'N/A'}`);
          console.log(`   │     Time: ${highestBid.createdAt}`);
          
          if (lot.currentBidder) {
            console.log(`   │     Current Bidder Match: ${lot.currentBidder === highestBid.bidderId ? '✅' : '❌'}`);
          }
          
          if (bids.length > 1) {
            console.log(`   │`);
            console.log(`   │  📋 ALL BIDS:`);
            for (let i = 0; i < bids.length; i++) {
              const bid = bids[i];
              const bidderUser = await User.findOne({ userId: bid.bidderId });
              console.log(`   │     ${i + 1}. ₹${bid.amount} - ${bidderUser?.name || 'Unknown'} (${bid.bidderId})`);
            }
          }
        } else {
          console.log(`   │  ❌ No bids yet`);
        }
      }
      console.log("");
    }

    // Get buyer's bids
    console.log("\n" + "=".repeat(60));
    console.log("🛒 BUYER'S BIDS:");
    console.log("=".repeat(60));
    
    const buyerBids = await Bid.find({ 
      bidderId: buyer.userId,
      status: "valid" 
    }).sort({ createdAt: -1 });

    console.log(`Total Bids Placed: ${buyerBids.length}\n`);

    for (const bid of buyerBids) {
      const lot = await Lot.findOne({ lotId: bid.lotId });
      const auction = lot ? await Auction.findOne({ auctionId: lot.auctionId }) : null;
      
      console.log(`📌 Bid ID: ${bid.bidId}`);
      console.log(`   Amount: ₹${bid.amount}`);
      console.log(`   Status: ${bid.status}`);
      console.log(`   Time: ${bid.createdAt}`);
      
      if (lot) {
        console.log(`   Lot: ${lot.lotName}`);
        console.log(`   Current Bid: ₹${lot.currentBid}`);
        console.log(`   Winning: ${lot.currentBidder === buyer.userId ? '🏆 YES' : '❌ NO'}`);
      }
      
      if (auction) {
        console.log(`   Auction: ${auction.auctionName}`);
        console.log(`   Status: ${auction.status}`);
      }
      console.log("");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    mongoose.connection.close();
  }
}

checkAuctionBidStatus();
