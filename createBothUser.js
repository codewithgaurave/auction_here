import mongoose from "mongoose";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

mongoose.connect(process.env.MONGO_URI);

const generateUserId = () => {
  return "AUC" + Math.random().toString(36).substr(2, 9).toUpperCase();
};

async function createBothUser() {
  try {
    console.log("🔄 Creating Seller & Buyer Both user...");

    // Using plain password - will be hashed by User model pre-save hook
    const newUser = new User({
      userId: generateUserId(),
      name: "Test Both User",
      email: "testboth@demo.com",
      phone: "9999999999",
      city: "Mumbai",
      password: "password123",
      userType: "Seller & Buyer Both",
      organizationType: "individual",
      registrationStatus: "approved",
      profilePhoto: "",
      documents: {
        pan: "",
        aadhar: "",
        gst: "",
      },
    });

    await newUser.save();

    console.log("\n✅ User Created Successfully!");
    console.log("==================");
    console.log(`📧 Email: ${newUser.email}`);
    console.log(`👤 Name: ${newUser.name}`);
    console.log(`🔑 User ID: ${newUser.userId}`);
    console.log(`👥 Type: ${newUser.userType}`);
    console.log(`✅ Status: ${newUser.registrationStatus}`);
    console.log(`📱 Phone: ${newUser.phone}`);
    console.log("\n🔐 Password: password123");
    console.log("\n💡 Login with:");
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Password: password123`);

  } catch (error) {
    if (error.code === 11000) {
      console.error("❌ User already exists with this email!");
    } else {
      console.error("❌ Error creating user:", error);
    }
  } finally {
    mongoose.connection.close();
  }
}

createBothUser();
