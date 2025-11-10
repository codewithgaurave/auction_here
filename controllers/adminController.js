import jwt from "jsonwebtoken";
import crypto from "crypto";
import Admin from "../models/Admin.js";

// ✅ Dynamically generate JWT secret from Mongo URI
const generateJWTSecret = () => {
  const base = process.env.MONGO_URI || "default_secret";
  return crypto.createHash("sha256").update(base).digest("hex");
};
const JWT_SECRET = generateJWTSecret();

// ✅ Create Admin
export const createAdmin = async (req, res) => {
  try {
    const { adminId, password, name } = req.body;

    if (!adminId || !password) {
      return res.status(400).json({ message: "adminId and password are required." });
    }

    const exists = await Admin.findOne({ adminId });
    if (exists) {
      return res.status(409).json({ message: "Admin with this adminId already exists." });
    }

    const newAdmin = new Admin({ adminId, password, name });
    await newAdmin.save();

    return res.status(201).json({
      message: "Admin created successfully",
      admin: { adminId: newAdmin.adminId, name: newAdmin.name },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Login Admin (with JWT generation + saving)
export const loginAdmin = async (req, res) => {
  try {
    const { adminId, password } = req.body;

    if (!adminId || !password) {
      return res.status(400).json({ message: "adminId and password are required." });
    }

    const admin = await Admin.findOne({ adminId });
    if (!admin || admin.password !== password) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // 🔥 Generate JWT Token
    const token = jwt.sign(
      { id: admin._id, adminId: admin.adminId },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 🔥 Save token in DB
    admin.token = token;
    await admin.save();

    return res.json({
      message: "Login successful",
      admin: {
        adminId: admin.adminId,
        name: admin.name,
        token: admin.token,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ List Admins
export const listAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}, "-password");
    return res.json({ admins });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
