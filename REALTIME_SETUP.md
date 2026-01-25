# Real-time Bidding & Notifications Setup Guide

## 📦 Installation

1. Install required packages:
```bash
cd server
npm install socket.io nodemailer twilio
```

2. Update environment variables in `.env`:
```env
# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## 🔧 Configuration

### Gmail Setup:
1. Enable 2-factor authentication
2. Generate app password: Google Account → Security → App passwords
3. Use app password in EMAIL_PASS

### Twilio Setup:
1. Create Twilio account
2. Get Account SID and Auth Token from dashboard
3. Purchase phone number for SMS

## 🚀 Features Added

### Real-time Bidding:
- Live bid updates via Socket.io
- Real-time auction status changes
- Automatic UI updates without refresh

### Notifications:
- Email notifications for bid events
- SMS notifications for important updates
- User approval notifications
- Auction starting alerts

## 📡 API Endpoints Added

### Notification APIs:
- `POST /api/notifications/email` - Send custom email
- `POST /api/notifications/sms` - Send custom SMS
- `POST /api/notifications/auction-starting/:auctionId` - Send auction alerts
- `GET /api/notifications/history` - Get notification history

### Socket.io Events:
- `join-auction` - Join auction room
- `leave-auction` - Leave auction room
- `bid-update` - Real-time bid updates
- `auction-status-update` - Auction status changes
- `lot-status-update` - Lot status changes

## 🎯 Usage

### Frontend Integration:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

// Join auction room
socket.emit('join-auction', 'AUCTION123');

// Listen for bid updates
socket.on('bid-update', (data) => {
  console.log('New bid:', data);
  // Update UI
});
```

### Testing:
1. Start server: `npm start`
2. Import Postman collection: `postman-notification-apis.json`
3. Test notification endpoints
4. Test Socket.io connection

## 🔄 Automatic Triggers

### Bid Placed:
- Real-time update to all auction participants
- Email to seller about new bid
- SMS to seller (optional)
- Email to previous bidder (outbid notification)

### User Approved:
- Welcome email sent automatically
- SMS confirmation (optional)

### Auction Starting:
- Email to all interested users
- SMS alerts for premium users

## 🛠️ Troubleshooting

### Email Issues:
- Check Gmail app password
- Verify EMAIL_USER and EMAIL_PASS
- Check firewall/antivirus blocking

### SMS Issues:
- Verify Twilio credentials
- Check phone number format (+91xxxxxxxxxx)
- Ensure sufficient Twilio balance

### Socket.io Issues:
- Check CORS configuration
- Verify client connection URL
- Check browser console for errors