// routes/notificationRoutes.js
import express from 'express';
import { authenticateAdmin } from '../middleware/adminAuth.js';
import {
  sendCustomEmail,
  sendCustomSMS,
  sendAuctionStartingAlert,
  getNotificationHistory
} from '../controllers/notificationController.js';

const router = express.Router();

// Admin only routes
router.use(authenticateAdmin);

// Send custom email
router.post('/email', sendCustomEmail);

// Send custom SMS
router.post('/sms', sendCustomSMS);

// Send auction starting alert
router.post('/auction-starting/:auctionId', sendAuctionStartingAlert);

// Get notification history
router.get('/history', getNotificationHistory);

export default router;