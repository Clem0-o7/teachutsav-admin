// @/lib/models/Team.js

import mongoose, { Schema } from "mongoose";
import { randomUUID } from 'crypto';

const teamSchema = new Schema(
  {
    teamId: { 
      type: String, 
      unique: true, 
      default: () => randomUUID(),
      required: true 
    },
    eventType: {
      type: String,
      enum: ["paper-presentation", "ideathon"],
      required: true
    },
    leaderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    members: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      email: String,
      name: String,
      joinedDate: { type: Date, default: Date.now },
      role: {
        type: String,
        enum: ["leader", "member"],
        default: "member"
      }
    }],
    maxMembers: {
      type: Number,
      default: function() {
        return this.eventType === "ideathon" ? 2 : 10; // Ideathon: 2, Paper: multiple authors
      }
    },
    teamName: String,
    isActive: { type: Boolean, default: true },
    inviteCode: { 
      type: String, 
      unique: true, 
      default: () => Math.random().toString(36).substring(2, 8).toUpperCase() 
    }
  },
  { timestamps: true }
);

// Static method to join team by invite code
teamSchema.statics.joinByInviteCode = async function(inviteCode, userId, userEmail, userName) {
  const team = await this.findOne({ inviteCode, isActive: true }).populate('members.userId');
  
  if (!team) {
    throw new Error("Invalid invite code or team not found");
  }

  // Check if user is already in the team
  const isAlreadyMember = team.members.some(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (isAlreadyMember) {
    throw new Error("You are already a member of this team");
  }

  // Check team capacity
  if (team.members.length >= team.maxMembers) {
    throw new Error("Team is already full");
  }

  // Add user to team
  team.members.push({
    userId,
    email: userEmail,
    name: userName,
    role: "member"
  });

  await team.save();
  return team;
};

// Static method to create team
teamSchema.statics.createTeam = async function(eventType, leaderId, leaderEmail, leaderName, teamName) {
  const team = new this({
    eventType,
    leaderId,
    teamName,
    members: [{
      userId: leaderId,
      email: leaderEmail,
      name: leaderName,
      role: "leader"
    }]
  });

  await team.save();
  return team;
};

const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);
export default Team;