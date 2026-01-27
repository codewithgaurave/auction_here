// services/auctionScheduler.js
import cron from 'node-cron';
import Auction from '../models/Auction.js';
import Lot from '../models/Lot.js';

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
    
    // Start upcoming auctions that have lots and are past start time
    const startedAuctions = await Auction.updateMany(
      {
        status: "upcoming",
        startDate: { $lte: now },
        totalLots: { $gt: 0 }
      },
      {
        $set: { status: "live", updatedAt: now }
      }
    );

    // End live auctions that are past end time
    const endedAuctions = await Auction.updateMany(
      {
        status: "live",
        endDate: { $lte: now }
      },
      {
        $set: { status: "completed", updatedAt: now }
      }
    );

    // Update lot statuses for completed auctions
    if (endedAuctions.modifiedCount > 0) {
      const completedAuctions = await Auction.find({
        status: "completed",
        updatedAt: { $gte: new Date(now.getTime() - 60000) } // Updated in last minute
      });

      for (const auction of completedAuctions) {
        const lots = await Lot.find({ auctionId: auction.auctionId });
        
        for (const lot of lots) {
          if (lot.status === "active") {
            if (lot.currentBid >= lot.reservePrice && lot.currentBidder) {
              lot.status = "sold";
            } else {
              lot.status = "unsold";
            }
            lot.updatedAt = now;
            await lot.save();
          }
        }
      }
    }

    if (startedAuctions.modifiedCount > 0 || endedAuctions.modifiedCount > 0) {
      console.log(`Auction scheduler: Started ${startedAuctions.modifiedCount} auctions, Ended ${endedAuctions.modifiedCount} auctions`);
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