# Auction System API Documentation

## Overview
Complete auction system with bidding functionality, real-time updates, and automated status management.

## Base URL
```
http://localhost:5001/api
```

## Authentication
Most endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 🏛️ AUCTION ENDPOINTS

### 1. Create Auction
**POST** `/auctions/create`
```json
{
  "auctionName": "Steel Auction 2024",
  "description": "High quality steel products",
  "category": "Industrial",
  "startDate": "2024-01-15",
  "endDate": "2024-01-16",
  "startTime": "10:00",
  "endTime": "18:00"
}
```

### 2. Get My Auctions
**GET** `/auctions/my-auctions`

### 3. Get Active Auctions (Public)
**GET** `/auctions/active?page=1&limit=10&category=Industrial`

### 4. Get Auction Details
**GET** `/auctions/{auctionId}/details`

### 5. Start Auction Manually
**POST** `/auctions/{auctionId}/start`

### 6. End Auction Manually
**POST** `/auctions/{auctionId}/end`

### 7. Update Auction Status
**PATCH** `/auctions/{auctionId}/status`
```json
{
  "status": "live" // upcoming, live, completed, cancelled
}
```

---

## 📦 LOT ENDPOINTS

### 1. Create Lot in Auction
**POST** `/auctions/{auctionId}/lots`
```json
{
  "lotName": "Steel Rods Bundle",
  "description": "High grade steel rods",
  "category": "Steel",
  "quantity": 100,
  "unit": "kg",
  "startPrice": 5000,
  "reservePrice": 8000,
  "minIncrement": 100
}
```
*Note: Supports file uploads for images and proof of ownership*

### 2. Get Lots by Auction
**GET** `/auctions/{auctionId}/lots?page=1&limit=20&status=active`

### 3. Get Lot Details
**GET** `/auctions/lots/{lotId}`

### 4. Get Lot Bidding Summary
**GET** `/auctions/lots/{lotId}/summary`

### 5. Get My Lots
**GET** `/auctions/my-lots?page=1&limit=10&status=active&auctionId=AUC123`

### 6. Update Lot
**PUT** `/auctions/lots/{lotId}`
```json
{
  "lotName": "Updated Steel Rods Bundle",
  "startPrice": 5500,
  "reservePrice": 8500,
  "minIncrement": 150
}
```

### 7. Delete Lot
**DELETE** `/auctions/lots/{lotId}`

### 8. Bulk Update Lot Status
**PATCH** `/auctions/lots/bulk-status`
```json
{
  "lotIds": ["LOT123", "LOT456"],
  "status": "cancelled"
}
```

---

## 💰 BIDDING ENDPOINTS

### 1. Place Bid
**POST** `/bids/{lotId}/place`
```json
{
  "amount": 5200
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bid placed successfully! Reserve price not yet met.",
  "bid": {
    "bidId": "BID123",
    "lotId": "LOT456",
    "auctionId": "AUC789",
    "amount": 5200,
    "status": "valid",
    "createdAt": "2024-01-15T10:30:00Z",
    "reserveMet": false
  },
  "lot": {
    "lotId": "LOT456",
    "currentBid": 5200,
    "currentBidder": "USER123",
    "nextMinimumBid": 5300,
    "reservePrice": 8000,
    "totalBids": 3
  }
}
```

### 2. Get Highest Bid
**GET** `/bids/{lotId}/highest`

### 3. List Bids for Lot
**GET** `/bids/{lotId}/list?page=1&limit=20`

### 4. Get My Bids
**GET** `/bids/my?page=1&limit=20`

---

## 🔧 ADMIN ENDPOINTS

### 1. Get All Auctions (Admin)
**GET** `/auctions/admin/auctions?status=live&sellerId=USER123&q=steel&page=1&limit=20`

### 2. Get All Lots (Admin)
**GET** `/auctions/admin/lots?status=active&auctionId=AUC123&category=steel&minPrice=1000&maxPrice=10000&search=rods&page=1&limit=20`

---

## 🔄 REAL-TIME FEATURES

### Socket.io Events

#### Client to Server:
- `join-auction`: Join auction room for real-time updates
- `leave-auction`: Leave auction room

#### Server to Client:
- `bid-update`: New bid placed on lot
- `auction-status-change`: Auction status changed
- `lot-status-change`: Lot status changed

### Example Socket Usage:
```javascript
// Join auction room
socket.emit('join-auction', 'AUC123');

// Listen for bid updates
socket.on('bid-update', (data) => {
  console.log('New bid:', data);
  // Update UI with new bid information
});
```

---

## 📊 AUCTION LIFECYCLE

### 1. Auction Creation Flow:
1. Seller creates auction with start/end times
2. Auction status: `upcoming`
3. Seller adds lots to auction
4. Auction automatically starts at scheduled time (status: `live`)
5. Bidding begins on lots
6. Auction automatically ends at scheduled time (status: `completed`)
7. Lots marked as `sold` or `unsold` based on reserve price

### 2. Bidding Rules:
- First bid must be >= start price
- Subsequent bids must be >= current bid + minimum increment
- Bidders cannot bid on their own lots
- Bidding only allowed during live auctions
- Reserve price determines if lot is sold

### 3. Automatic Status Management:
- Server checks every minute for auctions to start/end
- Auctions with no lots cannot be started
- Completed auctions automatically update lot statuses

---

## 🚨 ERROR CODES

- `400`: Bad Request - Invalid input data
- `401`: Unauthorized - Invalid or missing token
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource doesn't exist
- `409`: Conflict - Race condition (e.g., outbid)
- `402`: Payment Required - Quota exhausted
- `500`: Internal Server Error

---

## 📝 EXAMPLE WORKFLOWS

### Complete Auction Setup:
```bash
# 1. Create auction
POST /auctions/create

# 2. Add lots to auction
POST /auctions/AUC123/lots

# 3. Start auction (manual or automatic)
POST /auctions/AUC123/start

# 4. Users place bids
POST /bids/LOT456/place

# 5. End auction (manual or automatic)
POST /auctions/AUC123/end
```

### Bidding Flow:
```bash
# 1. Get lot details
GET /auctions/lots/LOT456

# 2. Check current bid
GET /bids/LOT456/highest

# 3. Place bid
POST /bids/LOT456/place

# 4. Monitor real-time updates via Socket.io
```

---

## 🔐 PERMISSIONS

### Seller:
- Create/manage auctions
- Add/edit/delete lots
- Start/end auctions
- View analytics

### Buyer:
- View auctions/lots
- Place bids
- View bid history

### Admin:
- Full access to all endpoints
- View all auctions/lots
- Manage system

---

## 📱 MOBILE/WEB INTEGRATION

The API supports both web and mobile applications with:
- RESTful endpoints for standard operations
- WebSocket support for real-time updates
- File upload support for lot images
- Pagination for large datasets
- Search and filtering capabilities

---

## 🚀 DEPLOYMENT NOTES

1. Install dependencies: `npm install`
2. Set environment variables in `.env`
3. Start server: `npm start`
4. Server runs on port 5001 by default
5. Auction scheduler starts automatically
6. Socket.io server runs alongside REST API