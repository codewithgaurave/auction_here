// test-notifications.js
// Test script for email and SMS notifications

import { sendEmail, sendSMS, emailTemplates, smsTemplates } from './services/notificationService.js';

const testNotifications = async () => {
  console.log('🧪 Testing Notification Services...\n');

  // Test data
  const testData = {
    bidData: {
      lotName: 'iPhone 15 Pro',
      auctionName: 'Electronics Auction',
      amount: 150000,
      bidderName: 'Test Bidder',
      newAmount: 155000,
      createdAt: new Date()
    },
    userData: {
      name: 'Test User',
      email: 'test@example.com',
      phone: '9876543210'
    },
    auctionData: {
      auctionName: 'Test Auction',
      startDate: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      totalLots: 5
    }
  };

  try {
    // Test Email Service
    console.log('📧 Testing Email Service...');
    const emailResult = await sendEmail(
      testData.userData.email,
      'Test Email from Auction Here',
      emailTemplates.bidPlaced(testData.bidData)
    );
    console.log('Email Result:', emailResult);

    // Test SMS Service
    console.log('\n📱 Testing SMS Service...');
    const smsResult = await sendSMS(
      testData.userData.phone,
      smsTemplates.bidPlaced(testData.bidData)
    );
    console.log('SMS Result:', smsResult);

    // Test User Approval Email
    console.log('\n✅ Testing User Approval Email...');
    const approvalEmailResult = await sendEmail(
      testData.userData.email,
      'Account Approved - Welcome to Auction Here!',
      emailTemplates.userApproved(testData.userData)
    );
    console.log('Approval Email Result:', approvalEmailResult);

    // Test Auction Starting Notification
    console.log('\n🚀 Testing Auction Starting Notification...');
    const auctionEmailResult = await sendEmail(
      testData.userData.email,
      'Auction Starting Soon!',
      emailTemplates.auctionStarting(testData.auctionData)
    );
    console.log('Auction Email Result:', auctionEmailResult);

    console.log('\n✅ All notification tests completed!');

  } catch (error) {
    console.error('❌ Notification test failed:', error);
  }
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testNotifications();
}

export default testNotifications;