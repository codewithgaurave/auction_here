// middleware/adminAuth.js
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Admin from "../models/Admin.js";

const generateJWTSecret = () => {
  const base = process.env.MONGO_URI || "default_secret";
  return crypto.createHash("sha256").update(base).digest("hex");
};
const JWT_SECRET = generateJWTSecret();

export const authenticateAdmin = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) return res.status(401).json({ message: "Admin token missing" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await Admin.findOne({ _id: decoded.id, adminId: decoded.adminId });

    if (!admin || admin.token !== token) {
      return res.status(401).json({ message: "Invalid admin token" });
    }

    req.admin = { id: admin._id.toString(), adminId: admin.adminId, name: admin.name };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized (admin)", error: err.message });
  }
};
