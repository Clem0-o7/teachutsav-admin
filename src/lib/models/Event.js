//@/lib/models/Event.js

import mongoose from "mongoose";

const EventSchema = new mongoose.Schema({
  uniqueName: {
    type: String,
    required: true,
    unique: true,
  },
  eventName: {
    type: String,
    required: true,
    default: "",
  },
  department: {
    type: String,
    required: true,
    default: "",
  },
  // New categorization fields
  category: {
    type: String,
    enum: ["tech", "non-tech"],
    required: true,
    default: "tech"
  },
  eventMode: {
    type: String,
    enum: ["online", "offline", "hybrid"],
    default: "offline"
  },
  tags: [{
    type: String,
    enum: ["team", "individual", "coding", "puzzle", "experience", "reasoning", "ai", "business", "design", "other"],
    default: "other"
  }],
  
  // Event details
  eventTiming: {
    type: String,
    default: "To Be Announced",
  },
  eventDate: {
    type: Date,
    default: null
  },
  venue: {
    type: String,
    default: "TBA"
  },
  eventAbstract: {
    type: String,
    default: "",
  },
  eventDesp: {
    type: String,
    default: "",
  },
  
  // Media and resources
  poster: {
    type: String, // URL to poster image
    default: ""
  },
  rulebook: {
    type: String, // URL to rulebook PDF
    default: ""
  },
  
  // Registration and requirements
  registrationRequired: {
    type: Boolean,
    default: false
  },
  passRequired: [{
    type: Number,
    enum: [1, 2, 3, 4] // Pass 1-4
  }],
  maxTeamSize: {
    type: Number,
    default: 1 // 1 for individual events
  },
  minTeamSize: {
    type: Number,
    default: 1
  },
  registrationFee: {
    type: Number,
    default: 0
  },
  
  // Contact information
  incharge: { 
    type: String,
    default: "",
  },
  inchargeNumber: {
    type: String,
    default: "",
  },
  coordinators: [{
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      default: ""
    },
    phone: {
      type: String,
      default: ""
    },
    role: {
      type: String,
      default: "Coordinator"
    }
  }],
  
  
  // Event status and metadata
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0 // For sorting events
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add text index for search functionality
EventSchema.index({
  eventName: 'text',
  eventAbstract: 'text',
  eventDesp: 'text',
  department: 'text',
  tags: 'text'
});

// Add compound indexes for filtering
EventSchema.index({ category: 1, department: 1 });
EventSchema.index({ eventType: 1, category: 1 });
EventSchema.index({ tags: 1 });
EventSchema.index({ isActive: 1, priority: -1 });

// Prevent model overwrite during development
const Event = mongoose.models.Event || mongoose.model("Event", EventSchema);
export default Event;

