// controllers/notificationController.js
import { sendEmail, sendSMS, emailTemplates, smsTemplates } from '../services/notificationService.js';
import { sendAuctionStartingNotifications } from '../services/realtimeService.js';
import User from '../models/User.js';
import Auction from '../models/Auction.js';

// Send custom email notification
export const sendCustomEmail = async (req, res) => {
  try {
    const { to, subject, message, userIds } = req.body;

    if (!to && !userIds) {
      return res.status(400).json({ 
        success: false, 
        message: "Either 'to' email or 'userIds' array is required" 
      });
    }

    let recipients = [];
    
    if (to) {
      recipients.push(to);
    }
    
    if (userIds && Array.isArray(userIds)) {
      const users = await User.find({ userId: { $in: userIds } }).select('email');
      recipients.push(...users.map(user => user.email));
    }

    const results = [];
    for (const email of recipients) {
      const result = await sendEmail(email, subject, message);
      results.push({ email, ...result });
    }

    return res.json({
      success: true,
      message: "Emails sent",
      results
    });
  } catch (error) {
    console.error('Send custom email error:', error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Send custom SMS notification
export const sendCustomSMS = async (req, res) => {
  try {
    const { to, message, userIds } = req.body;

    if (!to && !userIds) {
      return res.status(400).json({ 
        success: false, 
        message: "Either 'to' phone or 'userIds' array is required" 
      });
    }

    let recipients = [];
    
    if (to) {
      recipients.push(to);
    }
    
    if (userIds && Array.isArray(userIds)) {
      const users = await User.find({ userId: { $in: userIds } }).select('phone');
      recipients.push(...users.map(user => user.phone));
    }

    const results = [];
    for (const phone of recipients) {
      const result = await sendSMS(phone, message);
      results.push({ phone, ...result });
    }

    return res.json({
      success: true,
      message: "SMS sent",
      results
    });
  } catch (error) {
    console.error('Send custom SMS error:', error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Send auction starting notifications
export const sendAuctionStartingAlert = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const auction = await Auction.findOne({ auctionId });
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found"
      });
    }

    await sendAuctionStartingNotifications({
      auctionId: auction.auctionId,
      auctionName: auction.auctionName,
      startDate: auction.startDate,
      totalLots: auction.totalLots
    });

    return res.json({
      success: true,
      message: "Auction starting notifications sent"
    });
  } catch (error) {
    console.error('Send auction starting alert error:', error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get notification history (placeholder for future implementation)
export const getNotificationHistory = async (req, res) => {
  try {
    // This would require a notification history model
    // For now, return empty array
    return res.json({
      success: true,
      notifications: [],
      message: "Notification history feature coming soon"
    });
  } catch (error) {
    console.error('Get notification history error:', error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};