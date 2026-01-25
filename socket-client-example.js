// socket-client.js
// Frontend Socket.io client example for real-time bidding

import { io } from 'socket.io-client';

class AuctionSocketClient {
  constructor(serverUrl = 'http://localhost:5000') {
    this.socket = io(serverUrl);
    this.currentAuction = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to auction server:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from auction server');
    });

    // Real-time bid updates
    this.socket.on('bid-update', (data) => {
      console.log('New bid received:', data);
      this.handleBidUpdate(data);
    });

    // Auction status updates
    this.socket.on('auction-status-update', (data) => {
      console.log('Auction status update:', data);
      this.handleAuctionStatusUpdate(data);
    });

    // Lot status updates
    this.socket.on('lot-status-update', (data) => {
      console.log('Lot status update:', data);
      this.handleLotStatusUpdate(data);
    });
  }

  // Join auction room to receive real-time updates
  joinAuction(auctionId) {
    this.currentAuction = auctionId;
    this.socket.emit('join-auction', auctionId);
    console.log(`Joined auction room: ${auctionId}`);
  }

  // Leave auction room
  leaveAuction(auctionId) {
    this.socket.emit('leave-auction', auctionId);
    this.currentAuction = null;
    console.log(`Left auction room: ${auctionId}`);
  }

  // Handle real-time bid updates
  handleBidUpdate(data) {
    // Update UI with new bid information
    const { lotId, highestBid, bidderName, bidTime, totalBids } = data;
    
    // Update lot display
    const lotElement = document.getElementById(`lot-${lotId}`);
    if (lotElement) {
      const bidElement = lotElement.querySelector('.current-bid');
      const bidderElement = lotElement.querySelector('.current-bidder');
      const totalBidsElement = lotElement.querySelector('.total-bids');
      
      if (bidElement) bidElement.textContent = `₹${highestBid.toLocaleString()}`;
      if (bidderElement) bidderElement.textContent = bidderName;
      if (totalBidsElement) totalBidsElement.textContent = `${totalBids} bids`;
    }

    // Show notification
    this.showNotification(`New bid of ₹${highestBid.toLocaleString()} by ${bidderName}`, 'success');
  }

  // Handle auction status updates
  handleAuctionStatusUpdate(data) {
    const { auctionId, status, message } = data;
    
    // Update auction status display
    const statusElement = document.getElementById(`auction-${auctionId}-status`);
    if (statusElement) {
      statusElement.textContent = status.toUpperCase();
      statusElement.className = `status ${status}`;
    }

    // Show notification
    this.showNotification(message || `Auction ${status}`, 'info');
  }

  // Handle lot status updates
  handleLotStatusUpdate(data) {
    const { lotId, status, currentBid } = data;
    
    // Update lot status display
    const lotElement = document.getElementById(`lot-${lotId}`);
    if (lotElement) {
      const statusElement = lotElement.querySelector('.lot-status');
      const bidElement = lotElement.querySelector('.current-bid');
      
      if (statusElement) {
        statusElement.textContent = status.toUpperCase();
        statusElement.className = `status ${status}`;
      }
      
      if (bidElement && currentBid) {
        bidElement.textContent = `₹${currentBid.toLocaleString()}`;
      }
    }
  }

  // Show notification to user
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to notification container
    const container = document.getElementById('notifications') || document.body;
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  // Disconnect from server
  disconnect() {
    if (this.currentAuction) {
      this.leaveAuction(this.currentAuction);
    }
    this.socket.disconnect();
  }
}

// Usage example:
// const auctionSocket = new AuctionSocketClient();
// auctionSocket.joinAuction('AUCTION123');

export default AuctionSocketClient;