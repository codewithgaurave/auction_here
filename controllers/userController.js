// controllers/userController.js
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { cloudinary } from "../config/cloudinary.js";

// ✅ Dynamically generate JWT secret
const generateJWTSecret = () => {
  const base = process.env.MONGO_URI || "default_secret";
  return crypto.createHash("sha256").update(base).digest("hex");
};
const JWT_SECRET = generateJWTSecret();

// ✅ Generate unique User ID
const generateUserId = () => {
  return "AUC" + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// ✅ Helper function: Delete uploaded files if registration fails
const deleteUploadedFiles = async (files) => {
  try {
    if (!files) return;

    const deletePromises = [];
    
    // Profile photo delete karein
    if (files.profilePhoto && files.profilePhoto[0].path) {
      const publicId = files.profilePhoto[0].filename;
      deletePromises.push(cloudinary.uploader.destroy(publicId));
    }

    // Documents delete karein
    const documentFields = ['pan', 'aadhar', 'gst', 'deed', 'moa', 'aoa', 'coi', 'cpan', 'rcer', 'otherDoc'];
    documentFields.forEach(field => {
      if (files[field] && files[field][0].path) {
        const publicId = files[field][0].filename;
        deletePromises.push(cloudinary.uploader.destroy(publicId));
      }
    });

    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting uploaded files:', error);
  }
};

// ✅ User Registration with Cloudinary
export const registerUser = async (req, res) => {
  let uploadedFiles = null;

  try {
    const {
      name,
      email,
      phone,
      city,
      password,
      userType,
      organizationType,
      otherOrgType
    } = req.body;

    // Store files for cleanup if needed
    uploadedFiles = req.files;

    // Validation
    if (!name || !email || !phone || !city || !password || !userType || !organizationType) {
      // Delete uploaded files if validation fails
      if (uploadedFiles) {
        await deleteUploadedFiles(uploadedFiles);
      }
      return res.status(400).json({ message: "All required fields must be filled." });
    }

    // Validate userType
    const validUserTypes = ["Seller", "Buyer", "Seller & Buyer Both"];
    if (!validUserTypes.includes(userType)) {
      if (uploadedFiles) {
        await deleteUploadedFiles(uploadedFiles);
      }
      return res.status(400).json({ 
        message: "Invalid user type. Must be: Seller, Buyer, or Seller & Buyer Both" 
      });
    }

    // Validate organizationType
    const validOrgTypes = ["individual", "proprietorship", "partnership", "pvt", "llp", "others"];
    if (!validOrgTypes.includes(organizationType)) {
      if (uploadedFiles) {
        await deleteUploadedFiles(uploadedFiles);
      }
      return res.status(400).json({ 
        message: "Invalid organization type." 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phone }] 
    });
    
    if (existingUser) {
      if (uploadedFiles) {
        await deleteUploadedFiles(uploadedFiles);
      }
      return res.status(409).json({ 
        message: "User with this email or phone already exists." 
      });
    }

    // Generate unique user ID
    const userId = generateUserId();

    // Handle file URLs from Cloudinary
    const documents = {};
    
    // Profile photo URL
    const profilePhoto = req.files && req.files["profilePhoto"] 
      ? req.files["profilePhoto"][0].path 
      : "";

    // Document URLs
    const docFields = ["pan", "aadhar", "gst", "deed", "moa", "aoa", "coi", "cpan", "rcer", "otherDoc"];
    docFields.forEach(field => {
      if (req.files && req.files[field]) {
        documents[field] = req.files[field][0].path;
      }
    });

    // Create new user
    const newUser = new User({
      userId,
      password,
      name,
      email,
      phone,
      city,
      userType,
      organizationType,
      otherOrgType: otherOrgType || "",
      profilePhoto,
      documents,
      registrationStatus: "pending"
    });

    await newUser.save();

    return res.status(201).json({
      message: "User registered successfully. Waiting for admin approval.",
      user: {
        userId: newUser.userId,
        name: newUser.name,
        email: newUser.email,
        userType: newUser.userType,
        registrationStatus: newUser.registrationStatus,
        profilePhoto: newUser.profilePhoto
      }
    });

  } catch (err) {
    // Delete uploaded files if error occurs
    if (uploadedFiles) {
      await deleteUploadedFiles(uploadedFiles);
    }
    
    console.error(err);
    return res.status(500).json({ 
      message: "Server error during registration", 
      error: err.message 
    });
  }
};

// ✅ User Login (Same as before)
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Check registration status
    if (user.registrationStatus !== "approved") {
      return res.status(403).json({ 
        message: `Your account is ${user.registrationStatus}. Please wait for admin approval.`,
        registrationStatus: user.registrationStatus
      });
    }

    // 🔥 Generate JWT Token
    const token = jwt.sign(
      { 
        id: user._id, 
        userId: user.userId,
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 🔥 Save token in DB
    user.token = token;
    user.updatedAt = new Date();
    await user.save();

    return res.json({
      message: "Login successful",
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        userType: user.userType,
        registrationStatus: user.registrationStatus,
        profilePhoto: user.profilePhoto,
        token: user.token,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      message: "Server error during login", 
      error: err.message 
    });
  }
};

// ✅ Update User Profile with File Upload
export const updateUserProfile = async (req, res) => {
  let uploadedFiles = null;

  try {
    const { userId } = req.params;
    const updateData = req.body;
    uploadedFiles = req.files;

    const user = await User.findOne({ userId });
    if (!user) {
      if (uploadedFiles) {
        await deleteUploadedFiles(uploadedFiles);
      }
      return res.status(404).json({ message: "User not found." });
    }

    // Handle profile photo update
    if (req.files && req.files["profilePhoto"]) {
      // Delete old profile photo from Cloudinary
      if (user.profilePhoto) {
        try {
          const publicId = user.profilePhoto.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`auction_users/${publicId}`);
        } catch (error) {
          console.error('Error deleting old profile photo:', error);
        }
      }
      updateData.profilePhoto = req.files["profilePhoto"][0].path;
    }

    // Handle document updates
    if (req.files) {
      const docFields = ["pan", "aadhar", "gst", "deed", "moa", "aoa", "coi", "cpan", "rcer", "otherDoc"];
      docFields.forEach(field => {
        if (req.files[field]) {
          // Delete old document from Cloudinary if exists
          if (user.documents && user.documents[field]) {
            try {
              const publicId = user.documents[field].split('/').pop().split('.')[0];
              cloudinary.uploader.destroy(`auction_users/${publicId}`);
            } catch (error) {
              console.error(`Error deleting old ${field}:`, error);
            }
          }
          
          if (!updateData.documents) updateData.documents = {};
          updateData.documents[field] = req.files[field][0].path;
        }
      });
    }

    updateData.updatedAt = new Date();

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      updateData,
      { new: true }
    ).select("-password -token");

    return res.json({
      message: "Profile updated successfully",
      user: updatedUser
    });

  } catch (err) {
    if (uploadedFiles) {
      await deleteUploadedFiles(uploadedFiles);
    }
    
    console.error(err);
    return res.status(500).json({ 
      message: "Server error during profile update", 
      error: err.message 
    });
  }
};

// ✅ Delete User (with Cloudinary cleanup)
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Delete files from Cloudinary
    try {
      // Delete profile photo
      if (user.profilePhoto) {
        const profilePublicId = user.profilePhoto.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`auction_users/${profilePublicId}`);
      }

      // Delete documents
      const docFields = ["pan", "aadhar", "gst", "deed", "moa", "aoa", "coi", "cpan", "rcer", "otherDoc"];
      for (const field of docFields) {
        if (user.documents && user.documents[field]) {
          const docPublicId = user.documents[field].split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`auction_users/${docPublicId}`);
        }
      }
    } catch (cloudinaryError) {
      console.error('Error deleting files from Cloudinary:', cloudinaryError);
    }

    // Delete user from database
    await User.findOneAndDelete({ userId });

    return res.json({
      message: "User deleted successfully"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      message: "Server error during user deletion", 
      error: err.message 
    });
  }
};

// ✅ Get User Profile (Same as before)
export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId }).select("-password -token");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      message: "Server error", 
      error: err.message 
    });
  }
};

// ✅ List All Users (for admin)
export const listUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password -token").sort({ createdAt: -1 });
    return res.json({ 
      count: users.length,
      users 
    });
  } catch (err) {
    return res.status(500).json({ 
      message: "Server error", 
      error: err.message 
    });
  }
};

// ✅ Update User Status (for admin)
export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { registrationStatus } = req.body;

    // Validate status
    const validStatuses = ["pending", "under verification", "approved", "rejected"];
    if (!validStatuses.includes(registrationStatus)) {
      return res.status(400).json({ 
        message: "Invalid status. Use: pending, under verification, approved, or rejected." 
      });
    }

    const user = await User.findOneAndUpdate(
      { userId },
      { 
        registrationStatus,
        updatedAt: new Date()
      },
      { new: true }
    ).select("-password -token");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      message: `User status updated to ${registrationStatus}`,
      user
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      message: "Server error", 
      error: err.message 
    });
  }
};

// ✅ Check Registration Status
export const checkRegistrationStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId }).select("userId name registrationStatus createdAt profilePhoto");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      userId: user.userId,
      name: user.name,
      registrationStatus: user.registrationStatus,
      profilePhoto: user.profilePhoto,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      message: "Server error", 
      error: err.message 
    });
  }
};

// ✅ Get Users by Status (for admin dashboard)
export const getUsersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    const validStatuses = ["pending", "under verification", "approved", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: "Invalid status." 
      });
    }

    const users = await User.find({ registrationStatus: status })
      .select("userId name email userType organizationType createdAt profilePhoto")
      .sort({ createdAt: -1 });

    return res.json({
      status,
      count: users.length,
      users
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      message: "Server error", 
      error: err.message 
    });
  }
};

// ✅ Get Dashboard Stats (for admin)
export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const pendingUsers = await User.countDocuments({ registrationStatus: "pending" });
    const underVerificationUsers = await User.countDocuments({ registrationStatus: "under verification" });
    const approvedUsers = await User.countDocuments({ registrationStatus: "approved" });
    const rejectedUsers = await User.countDocuments({ registrationStatus: "rejected" });

    const userTypeStats = await User.aggregate([
      {
        $group: {
          _id: "$userType",
          count: { $sum: 1 }
        }
      }
    ]);

    return res.json({
      totalUsers,
      statusStats: {
        pending: pendingUsers,
        underVerification: underVerificationUsers,
        approved: approvedUsers,
        rejected: rejectedUsers
      },
      userTypeStats
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      message: "Server error", 
      error: err.message 
    });
  }
};