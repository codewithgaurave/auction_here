# 🏛️ Auction System Setup Guide

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Cloudinary account (for image uploads)
- Email service (for notifications)

## 🚀 Installation Steps

### 1. Install Dependencies
```bash
cd server
npm install node-cron
npm install
```

### 2. Environment Setup
Create `.env` file in server directory:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/auction-here
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/auction-here

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Twilio (for SMS notifications)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Server
PORT=5001
```

### 3. Start the Server
```bash
npm start
```

## 🔧 System Features

### ✅ Completed Features:

1. **Auction Management**
   - Create auctions with start/end times
   - Automatic status updates (upcoming → live → completed)
   - Manual start/end controls
   - Auction validation (must have lots to start)

2. **Lot Management**
   - Add lots to auctions with images
   - Set start price, reserve price, minimum increment
   - Bulk status updates
   - Lot analytics and bidding summary

3. **Bidding System**
   - Real-time bidding with validation
   - Minimum increment enforcement
   - Reserve price tracking
   - Bid history and analytics
   - Race condition protection

4. **Real-time Updates**
   - Socket.io integration
   - Live bid updates
   - Auction status changes
   - Notification system

5. **Automated Scheduling**
   - Cron job runs every minute
   - Auto-start auctions at scheduled time
   - Auto-end auctions at scheduled time
   - Auto-update lot statuses (sold/unsold)

6. **User Management**
   - JWT authentication
   - Role-based permissions (Seller/Buyer/Admin)
   - Account approval system

## 📊 How It Works

### Auction Lifecycle:
```
1. Seller creates auction (status: upcoming)
2. Seller adds lots with pricing details
3. System auto-starts auction at scheduled time (status: live)
4. Buyers place bids on lots
5. System auto-ends auction at scheduled time (status: completed)
6. Lots marked as sold/unsold based on reserve price
```

### Bidding Rules:
```
- First bid must be >= start price
- Next bids must be >= current bid + minimum increment
- Cannot bid on own lots
- Only during live auctions
- Reserve price determines if lot sells
```

## 🎯 Key API Endpoints

### Auction Flow:
```bash
# Create auction
POST /api/auctions/create

# Add lot to auction
POST /api/auctions/{auctionId}/lots

# Start auction manually
POST /api/auctions/{auctionId}/start

# Place bid on lot
POST /api/bids/{lotId}/place

# End auction manually
POST /api/auctions/{auctionId}/end
```

### Real-time Updates:
```javascript
// Connect to socket
const socket = io('http://localhost:5001');

// Join auction room
socket.emit('join-auction', 'AUC123');

// Listen for bid updates
socket.on('bid-update', (data) => {
  console.log('New bid:', data);
});
```

## 🔄 Automatic Features

### Scheduler (runs every minute):
- ✅ Starts auctions at scheduled time
- ✅ Ends auctions at scheduled time  
- ✅ Updates lot statuses automatically
- ✅ Validates auction requirements

### Real-time Features:
- ✅ Live bid updates
- ✅ Auction status changes
- ✅ Notification system
- ✅ Race condition handling

## 📱 Frontend Integration

### Required API Calls:

1. **Auction Creation Page:**
   ```javascript
   // Create auction
   POST /api/auctions/create
   
   // Add lots
   POST /api/auctions/{auctionId}/lots
   ```

2. **Bidding Page:**
   ```javascript
   // Get lot details
   GET /api/auctions/lots/{lotId}
   
   // Place bid
   POST /api/bids/{lotId}/place
   
   // Real-time updates
   socket.on('bid-update', updateUI);
   ```

3. **Dashboard:**
   ```javascript
   // Seller dashboard
   GET /api/auctions/my-auctions
   GET /api/auctions/my-lots
   
   // Buyer dashboard
   GET /api/bids/my
   ```

## 🚨 Important Notes

### For Sellers:
- Auction must have lots before starting
- Cannot modify lots with active bids
- Can manually start/end auctions
- Automatic status updates based on time

### For Buyers:
- Must be approved to bid
- Cannot bid on own lots
- Minimum increment enforced
- Real-time bid updates

### System Requirements:
- MongoDB running
- Cloudinary configured for images
- Email service for notifications
- Socket.io for real-time features

## 🔧 Troubleshooting

### Common Issues:

1. **Auction won't start:**
   - Check if auction has lots
   - Verify start time is not in future
   - Check auction status

2. **Bidding fails:**
   - Verify user is approved
   - Check minimum bid amount
   - Ensure auction is live

3. **Images not uploading:**
   - Check Cloudinary configuration
   - Verify API keys in .env

4. **Real-time updates not working:**
   - Check Socket.io connection
   - Verify client is in auction room

## 📞 Support

For issues or questions:
1. Check API documentation
2. Verify environment variables
3. Check server logs
4. Test with Postman/API client

---

## 🎉 System Ready!

Your auction system is now ready with:
- ✅ Complete auction lifecycle management
- ✅ Real-time bidding system
- ✅ Automatic scheduling
- ✅ File upload support
- ✅ Notification system
- ✅ Admin controls

Start the server and begin creating auctions!