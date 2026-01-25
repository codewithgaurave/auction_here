// services/notificationService.js
import nodemailer from 'nodemailer';
import twilio from 'twilio';

// Email configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// SMS configuration
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && 
    process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_ACCOUNT_SID.startsWith('AC') &&
    process.env.TWILIO_ACCOUNT_SID !== 'your-twilio-account-sid') {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('Twilio initialized successfully');
  } catch (error) {
    console.error('Twilio initialization failed:', error.message);
  }
} else {
  console.log('Twilio not configured - SMS features disabled');
}

// Email service
export const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    };

    const result = await emailTransporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// SMS service
export const sendSMS = async (to, message) => {
  try {
    if (!twilioClient) {
      console.log('Twilio not configured, SMS not sent:', message);
      return { success: false, error: 'Twilio not configured' };
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${to}` // Assuming Indian numbers
    });

    console.log('SMS sent successfully:', result.sid);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Notification templates
export const emailTemplates = {
  bidPlaced: (bidData) => `
    <h2>New Bid Placed!</h2>
    <p>A new bid of ₹${bidData.amount} has been placed on lot: ${bidData.lotName}</p>
    <p>Auction: ${bidData.auctionName}</p>
    <p>Bidder: ${bidData.bidderName}</p>
    <p>Time: ${new Date(bidData.createdAt).toLocaleString()}</p>
  `,
  
  bidOutbid: (bidData) => `
    <h2>You've been outbid!</h2>
    <p>Your bid of ₹${bidData.previousAmount} on lot: ${bidData.lotName} has been outbid.</p>
    <p>New highest bid: ₹${bidData.newAmount}</p>
    <p>Auction: ${bidData.auctionName}</p>
  `,
  
  auctionStarting: (auctionData) => `
    <h2>Auction Starting Soon!</h2>
    <p>Auction "${auctionData.auctionName}" will start in 30 minutes.</p>
    <p>Start Time: ${new Date(auctionData.startDate).toLocaleString()}</p>
    <p>Total Lots: ${auctionData.totalLots}</p>
  `,
  
  userApproved: (userData) => `
    <h2>Account Approved!</h2>
    <p>Dear ${userData.name},</p>
    <p>Your account has been approved. You can now start using our auction platform.</p>
    <p>Login to get started!</p>
  `
};

export const smsTemplates = {
  bidPlaced: (bidData) => 
    `New bid ₹${bidData.amount} placed on ${bidData.lotName}. Auction: ${bidData.auctionName}`,
  
  bidOutbid: (bidData) => 
    `You've been outbid! New bid ₹${bidData.newAmount} on ${bidData.lotName}`,
  
  auctionStarting: (auctionData) => 
    `Auction "${auctionData.auctionName}" starting in 30 minutes!`,
  
  userApproved: (userData) => 
    `Hi ${userData.name}, your account has been approved! Start bidding now.`
};