import mongoose from "mongoose";
import User from "./models/User.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

async function findTestUsers() {
  try {
    console.log("🔍 Finding test users...");

    // Find all approved users
    const users = await User.find({ registrationStatus: "approved" })
      .select("userId name email userType registrationStatus createdAt")
      .sort({ createdAt: -1 })
      .limit(10);

    if (users.length === 0) {
      console.log("❌ No approved users found");
      
      // Check all users
      const allUsers = await User.find({})
        .select("userId name email userType registrationStatus createdAt")
        .sort({ createdAt: -1 })
        .limit(5);
      
      console.log("\n📋 All users in database:");
      allUsers.forEach(user => {
        console.log(`   ${user.userType}: ${user.email} (${user.registrationStatus})`);
      });
    } else {
      console.log("\n✅ Test Users Found:");
      console.log("==================");
      
      users.forEach(user => {
        console.log(`📧 Email: ${user.email}`);
        console.log(`👤 Name: ${user.name}`);
        console.log(`🔑 User ID: ${user.userId}`);
        console.log(`👥 Type: ${user.userType}`);
        console.log(`✅ Status: ${user.registrationStatus}`);
        console.log(`📅 Created: ${user.createdAt}`);
        console.log("-------------------");
      });
      
      console.log("\n🔐 Default Password for all test users: password123");
      console.log("\n💡 You can use any of these emails to login with password: password123");
    }

  } catch (error) {
    console.error("❌ Error finding users:", error);
  } finally {
    mongoose.connection.close();
  }
}

findTestUsers();