import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  city: { type: String, required: true },
  userType: { 
    type: String, 
    required: true,
    enum: ["Seller", "Buyer", "Seller & Buyer Both"]
  }, 
  organizationType: { 
    type: String, 
    required: true,
    enum: ["individual", "proprietorship", "partnership", "pvt", "llp", "others"]
  }, 
  otherOrgType: { type: String },
  profilePhoto: { type: String },
  documents: {
    pan: { type: String },
    aadhar: { type: String },
    gst: { type: String },
    deed: { type: String },
    moa: { type: String },
    aoa: { type: String },
    coi: { type: String },
    cpan: { type: String },
    rcer: { type: String },
    otherDoc: { type: String }
  },
  registrationStatus: { 
    type: String, 
    default: "pending",
    enum: ["pending", "under verification", "approved", "rejected"]
  }, 
  token: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpiry: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
export default User;