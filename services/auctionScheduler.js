// services/auctionScheduler.js
import cron from 'node-cron';
import Auction from '../models/Auction.js';
import Lot from '../models/Lot.js';
import Bid from '../models/Bid.js';
import { notifyAuctionLive, notifyAuctionEnded, notifyBidWon } from './fcmNotificationService.js';

// Auto update auction statuses every minute
export const startAuctionScheduler = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      await autoUpdateAuctionStatuses();
    } catch (error) {
      console.error('Auction scheduler error:', error);
    }
  });

  console.log('Auction scheduler started - checking every minute');
};

// Auto update auction statuses based on time
export const autoUpdateAuctionStatuses = async () => {
  try {
    const now = new Date();
    
    // Find auctions that need to start
    const auctionsToStart = await Auction.find({
      status: "upcoming",
      startDate: { $lte: now },
      totalLots: { $gt: 0 }
    });

    // Start upcoming auctions
    for (const auction of auctionsToStart) {
      auction.status = "live";
      auction.updatedAt = now;
      await auction.save();
      
      // 🔔 Send notification to all buyers
      notifyAuctionLive(auction.auctionId, auction.auctionName, auction.category)
        .catch(err => console.error('Auction live notification error:', err));
    }

    // Find auctions that need to end
    const auctionsToEnd = await Auction.find({
      status: "live",
      endDate: { $lte: now }
    });

    // End live auctions
    for (const auction of auctionsToEnd) {
      const lots = await Lot.find({ auctionId: auction.auctionId });
      let totalBids = 0;
      let totalRevenue = 0;
      
      for (const lot of lots) {
        if (lot.status === "active") {
          const bidCount = await Bid.countDocuments({ lotId: lot.lotId });
          totalBids += bidCount;
          
          if (lot.currentBid >= lot.reservePrice && lot.currentBidder) {
            lot.status = "sold";
            totalRevenue += lot.currentBid;
            
            // 🔔 Notify winner
            notifyBidWon(lot.currentBidder, lot.lotName, auction.auctionName, lot.currentBid)
              .catch(err => console.error('Bid won notification error:', err));
          } else {
            lot.status = "unsold";
          }
          lot.updatedAt = now;
          await lot.save();
        }
      }
      
      auction.status = "completed";
      auction.updatedAt = now;
      await auction.save();
      
      // 🔔 Send notification to seller
      notifyAuctionEnded(auction.sellerId, auction.auctionName, totalBids, totalRevenue)
        .catch(err => console.error('Auction ended notification error:', err));
    }

    if (auctionsToStart.length > 0 || auctionsToEnd.length > 0) {
      console.log(`Auction scheduler: Started ${auctionsToStart.length} auctions, Ended ${auctionsToEnd.length} auctions`);
    }

  } catch (error) {
    console.error('Auto update auction statuses error:', error);
  }
};

// Get auction time status
export const getAuctionTimeStatus = (auction) => {
  const now = new Date();
  const startTime = new Date(auction.startDate);
  const endTime = new Date(auction.endDate);

  if (now < startTime) {
    return {
      status: 'upcoming',
      timeUntilStart: startTime - now,
      message: 'Auction has not started yet'
    };
  } else if (now >= startTime && now <= endTime) {
    return {
      status: 'live',
      timeUntilEnd: endTime - now,
      message: 'Auction is currently live'
    };
  } else {
    return {
      status: 'ended',
      timeSinceEnd: now - endTime,
      message: 'Auction has ended'
    };
  }
};

export default {
  startAuctionScheduler,
  autoUpdateAuctionStatuses,
  getAuctionTimeStatus
};