import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";

// ✅ Dynamically generate JWT secret
const generateJWTSecret = () => {
  const base = process.env.MONGO_URI || "default_secret";
  return crypto.createHash("sha256").update(base).digest("hex");
};
const JWT_SECRET = generateJWTSecret();

// ✅ Authentication Middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Access token required" 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user and check if token matches
    const user = await User.findOne({ 
      _id: decoded.id, 
      token: token 
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid or expired token" 
      });
    }

    // Check if user is approved
    if (user.registrationStatus !== "approved") {
      return res.status(403).json({ 
        success: false,
        message: "Account not approved. Please wait for admin approval." 
      });
    }

    // Attach user to request
    req.user = {
      id: user._id,
      userId: user.userId,
      email: user.email,
      name: user.name,
      userType: user.userType
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(403).json({ 
      success: false,
      message: "Invalid token" 
    });
  }
};

// ✅ Seller Only Middleware
export const sellerOnly = (req, res, next) => {
  const validSellerTypes = ["Seller", "Seller & Buyer Both"];
  
  if (!validSellerTypes.includes(req.user.userType)) {
    return res.status(403).json({ 
      success: false,
      message: "Access denied. Seller privileges required." 
    });
  }
  next();
};

// ✅ Optional Authentication Middleware (for public routes)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findOne({ 
        _id: decoded.id, 
        token: token,
        registrationStatus: "approved"
      });

      if (user) {
        req.user = {
          id: user._id,
          userId: user.userId,
          email: user.email,
          name: user.name,
          userType: user.userType
        };
      }
    }
    next();
  } catch (error) {
    next(); // Continue without user info if token is invalid
  }
};