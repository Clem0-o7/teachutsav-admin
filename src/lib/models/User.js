// @/lib/models/User.js

import mongoose, { Schema } from "mongoose"
import bcrypt from "bcryptjs"

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: "College" },
    college: String, // College name as string (for simple onboarding)
    phoneNo: String,
    year: Number,
    department: String,
    onboardingCompleted: { type: Boolean, default: false },

    // Multi-pass payment system
    passes: [
      {
        passType: {
          type: Number,
          required: true,
          enum: [1, 2, 3, 4], // Pass 1-4
        },
        transactionNumber: { type: String, required: true },
        transactionScreenshot: { type: String, required: true }, // Azure Blob URL
        status: {
          type: String,
          enum: ["pending", "verified", "rejected"],
          default: "pending",
        },
        rejectionReason: String,
        submittedDate: { type: Date, default: Date.now },
        verifiedDate: Date,
        verifiedBy: String,        // Admin name who verified/rejected
        verifiedByEmail: String,   // Admin email who verified/rejected
      },
    ],

    // Submissions system
    submissions: {
      type: [{
        type: {
          type: String,
          enum: ["paper-presentation", "ideathon"],
          required: true
        },
        status: {
          type: String,
          enum: ["draft", "submitted", "reviewed", "accepted", "rejected"],
          default: "draft"
        },
        fileUrl: String, // Azure Blob URL
        fileName: String,
        submittedDate: Date,
        teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
        title: String,
        description: String
      }],
      default: []
    },
  },
  { timestamps: true }
);

// Static method to login user
userSchema.statics.login = async function(email, password) {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // Find user by email (case-insensitive)
  const user = await this.findOne({ email: email.toLowerCase() });
  
  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Check if email is verified
  if (!user.isEmailVerified) {
    throw new Error("Please verify your email before logging in");
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  return user;
};

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
