import { sendNotification, sendNotificationToMultiple } from '../config/firebase.js';
import User from '../models/User.js';

// Send notification when auction goes live
export const notifyAuctionLive = async (auctionId, auctionName, category) => {
  try {
    // Get all buyers and hybrid users
    const buyers = await User.find({
      userType: { $in: ['Buyer', 'Seller & Buyer Both'] },
      fcmToken: { $exists: true, $ne: null },
      registrationStatus: 'approved'
    });

    const tokens = buyers.map(user => user.fcmToken).filter(token => token);

    if (tokens.length > 0) {
      await sendNotificationToMultiple(
        tokens,
        '🔴 Auction Live Now!',
        `${auctionName} is now live. Start bidding!`,
        { type: 'auction_live', auctionId, category }
      );
    }
  } catch (error) {
    console.error('Error sending auction live notification:', error);
  }
};

// Send notification when user wins a bid
export const notifyBidWon = async (userId, lotName, auctionName, bidAmount) => {
  try {
    const user = await User.findOne({ userId, fcmToken: { $exists: true, $ne: null } });
    
    if (user && user.fcmToken) {
      await sendNotification(
        user.fcmToken,
        '🎉 You Won the Bid!',
        `Congratulations! You won ${lotName} in ${auctionName} with ₹${bidAmount}`,
        { type: 'bid_won', lotName, auctionName }
      );
    }
  } catch (error) {
    console.error('Error sending bid won notification:', error);
  }
};

// Send notification when user is outbid
export const notifyOutbid = async (userId, lotName, newBidAmount) => {
  try {
    const user = await User.findOne({ userId, fcmToken: { $exists: true, $ne: null } });
    
    if (user && user.fcmToken) {
      await sendNotification(
        user.fcmToken,
        '⚠️ You Have Been Outbid!',
        `Someone placed a higher bid of ₹${newBidAmount} on ${lotName}`,
        { type: 'outbid', lotName }
      );
    }
  } catch (error) {
    console.error('Error sending outbid notification:', error);
  }
};

// Send notification when auction ends (to seller)
export const notifyAuctionEnded = async (sellerId, auctionName, totalBids, totalRevenue) => {
  try {
    const seller = await User.findOne({ userId: sellerId, fcmToken: { $exists: true, $ne: null } });
    
    if (seller && seller.fcmToken) {
      await sendNotification(
        seller.fcmToken,
        '✅ Auction Completed!',
        `${auctionName} has ended. Total bids: ${totalBids}, Revenue: ₹${totalRevenue}`,
        { type: 'auction_ended', auctionName }
      );
    }
  } catch (error) {
    console.error('Error sending auction ended notification:', error);
  }
};

// Send notification when new bid is placed on seller's lot
export const notifyNewBidOnLot = async (sellerId, lotName, bidAmount, bidderName) => {
  try {
    const seller = await User.findOne({ userId: sellerId, fcmToken: { $exists: true, $ne: null } });
    
    if (seller && seller.fcmToken) {
      await sendNotification(
        seller.fcmToken,
        '💰 New Bid Received!',
        `${bidderName} placed a bid of ₹${bidAmount} on ${lotName}`,
        { type: 'new_bid', lotName }
      );
    }
  } catch (error) {
    console.error('Error sending new bid notification:', error);
  }
};

// Send notification when auction is about to start (30 min before)
export const notifyAuctionStartingSoon = async (auctionId, auctionName, startTime) => {
  try {
    const buyers = await User.find({
      userType: { $in: ['Buyer', 'Seller & Buyer Both'] },
      fcmToken: { $exists: true, $ne: null },
      registrationStatus: 'approved'
    });

    const tokens = buyers.map(user => user.fcmToken).filter(token => token);

    if (tokens.length > 0) {
      await sendNotificationToMultiple(
        tokens,
        '⏰ Auction Starting Soon!',
        `${auctionName} will start in 30 minutes. Get ready!`,
        { type: 'auction_starting_soon', auctionId, startTime }
      );
    }
  } catch (error) {
    console.error('Error sending auction starting soon notification:', error);
  }
};
