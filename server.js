// server.js
// ✅ Load env BEFORE anything else (ESM-safe)
import "dotenv/config";

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";

// Routes
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import auctionRoutes from "./routes/auctionRoutes.js";
import bidRoutes from "./routes/bidRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

// Initialize app
const app = express();

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// CORS
app.use(cors());

// Connect to MongoDB (startup)
await connectDB(); // if your connectDB returns a promise; else just call connectDB()

// API routes
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auctions", auctionRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api", dashboardRoutes);

// Default route
app.get("/", (_req, res) => {
  res.send("✅ Auction Here API is running...");
});

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "OK",
    message: "Auction Here API is running smoothly",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler (optional but useful)
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler (optional)
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error", error: err?.message });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
