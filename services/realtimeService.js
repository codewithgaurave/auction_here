// services/realtimeService.js
import { sendEmail, sendSMS, emailTemplates, smsTemplates } from './notificationService.js';
import User from '../models/User.js';

// Real-time bid update
export const broadcastBidUpdate = (io, bidData) => {
  // Emit to all users in the auction room
  io.to(bidData.auctionId).emit('bid-update', {
    lotId: bidData.lotId,
    auctionId: bidData.auctionId,
    highestBid: bidData.amount,
    bidderName: bidData.bidderName,
    bidTime: bidData.createdAt,
    totalBids: bidData.totalBids
  });
};

// Real-time auction status update
export const broadcastAuctionStatus = (io, auctionData) => {
  io.to(auctionData.auctionId).emit('auction-status-update', {
    auctionId: auctionData.auctionId,
    status: auctionData.status,
    message: auctionData.message,
    timestamp: new Date()
  });
};

// Real-time lot status update
export const broadcastLotStatus = (io, lotData) => {
  io.to(lotData.auctionId).emit('lot-status-update', {
    lotId: lotData.lotId,
    auctionId: lotData.auctionId,
    status: lotData.status,
    currentBid: lotData.currentBid,
    timestamp: new Date()
  });
};

// Send notifications for bid events
export const handleBidNotifications = async (bidData, previousBidder = null) => {
  try {
    // Get seller details
    const seller = await User.findOne({ userId: bidData.sellerId });
    
    // Notify seller about new bid
    if (seller) {
      await sendEmail(
        seller.email,
        'New Bid Placed on Your Auction',
        emailTemplates.bidPlaced(bidData)
      );
      
      await sendSMS(
        seller.phone,
        smsTemplates.bidPlaced(bidData)
      );
    }

    // Notify previous bidder if outbid
    if (previousBidder) {
      const prevBidder = await User.findOne({ userId: previousBidder.bidderId });
      if (prevBidder) {
        await sendEmail(
          prevBidder.email,
          'You have been outbid!',
          emailTemplates.bidOutbid({
            ...bidData,
            previousAmount: previousBidder.amount,
            newAmount: bidData.amount
          })
        );
        
        await sendSMS(
          prevBidder.phone,
          smsTemplates.bidOutbid({
            ...bidData,
            newAmount: bidData.amount
          })
        );
      }
    }
  } catch (error) {
    console.error('Error sending bid notifications:', error);
  }
};

// Send auction starting notifications
export const sendAuctionStartingNotifications = async (auctionData) => {
  try {
    // Get all interested users (who have bid on this auction before or following)
    // For now, we'll send to all approved users
    const users = await User.find({ registrationStatus: 'approved' });
    
    for (const user of users) {
      await sendEmail(
        user.email,
        'Auction Starting Soon!',
        emailTemplates.auctionStarting(auctionData)
      );
      
      await sendSMS(
        user.phone,
        smsTemplates.auctionStarting(auctionData)
      );
    }
  } catch (error) {
    console.error('Error sending auction starting notifications:', error);
  }
};

// Send user approval notification
export const sendUserApprovalNotification = async (userData) => {
  try {
    await sendEmail(
      userData.email,
      'Account Approved - Welcome to Auction Here!',
      emailTemplates.userApproved(userData)
    );
    
    await sendSMS(
      userData.phone,
      smsTemplates.userApproved(userData)
    );
  } catch (error) {
    console.error('Error sending user approval notification:', error);
  }
};