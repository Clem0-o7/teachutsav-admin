// Admin Schema for the separate admin dashboard project
// This file documents the schema that should be implemented in the admin project

import mongoose from "mongoose"

// Admin User Schema for the separate admin dashboard
const AdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['super-admin', 'view-only', 'events-admin', 'payments-admin', 'paper-presentation-admin', 'ideathon-admin'],
    required: true,
    default: 'view-only'
  },
  permissions: {
    viewAnalytics: {
      type: Boolean,
      default: false
    },
    verifyPayments: {
      type: Boolean,
      default: false
    },
    manageEvents: {
      type: Boolean,
      default: false
    },
    manageAdmins: {
      type: Boolean,
      default: false
    },
    exportData: {
      type: Boolean,
      default: false
    },
    systemSettings: {
      type: Boolean,
      default: false
    }
  },
  lastLogin: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true
})

// Set permissions based on role
AdminSchema.pre('save', async function() {
  switch (this.role) {
    case 'super-admin':
      this.permissions = {
        viewAnalytics: true,
        verifyPayments: true,
        manageEvents: true,
        manageAdmins: true,
        exportData: true,
        systemSettings: true
      }
      break
    case 'view-only':
      this.permissions = {
        viewAnalytics: true,
        verifyPayments: false,
        manageEvents: false,
        manageAdmins: false,
        exportData: true,
        systemSettings: false
      }
      break
    case 'events-admin':
      this.permissions = {
        viewAnalytics: false,
        verifyPayments: false,
        manageEvents: true,
        manageAdmins: false,
        exportData: false,
        systemSettings: false
      }
      break
    case 'payments-admin':
      this.permissions = {
        viewAnalytics: false,
        verifyPayments: true,
        manageEvents: false,
        manageAdmins: false,
        exportData: true,
        systemSettings: false
      }
      break
    case 'paper-presentation-admin':
      this.permissions = {
        viewAnalytics: false,
        verifyPayments: false,
        manageEvents: true,
        manageAdmins: false,
        exportData: false,
        systemSettings: false
      }
      break
    case 'ideathon-admin':
      this.permissions = {
        viewAnalytics: false,
        verifyPayments: false,
        manageEvents: true,
        manageAdmins: false,
        exportData: false,
        systemSettings: false
      }
      break
  }
})

// Enhanced User Schema additions for the main project
const UserEnhancements = {
  // Add these fields to existing User schema
  paymentHistory: [{
    passType: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    transactionNumber: {
      type: String,
      required: true
    },
    screenshot: {
      type: String, // Azure Blob URL
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    verificationDate: {
      type: Date,
      default: null
    },
    verificationNotes: {
      type: String,
      default: ''
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Analytics tracking
  analytics: {
    registrationDate: {
      type: Date,
      default: Date.now
    },
    lastActiveDate: {
      type: Date,
      default: Date.now
    },
    eventRegistrations: [{
      eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
      },
      registeredAt: {
        type: Date,
        default: Date.now
      }
    }],
    totalAmountPaid: {
      type: Number,
      default: 0
    }
  }
}

// College grouping schema for analytics
const CollegeGroupSchema = new mongoose.Schema({
  normalizedName: {
    type: String,
    required: true,
    unique: true
  },
  variations: [{
    type: String
  }],
  userCount: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  city: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
})

// System analytics cache schema
const AnalyticsCacheSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'college-groups'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  }
}, {
  timestamps: true
})

// Create indexes for analytics
AnalyticsCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
AnalyticsCacheSchema.index({ type: 1, date: 1 }, { unique: true })

// Export schemas for reference (these will be used in the admin project)
const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema)
const CollegeGroup = mongoose.models.CollegeGroup || mongoose.model('CollegeGroup', CollegeGroupSchema)
const AnalyticsCache = mongoose.models.AnalyticsCache || mongoose.model('AnalyticsCache', AnalyticsCacheSchema)

export { Admin, CollegeGroup, AnalyticsCache, UserEnhancements }

// Sample admin users for seeding
export const sampleAdmins = [
  {
    email: 'superadmin@techutsav.com',
    name: 'Super Administrator',
    role: 'super-admin',
    password: 'hashed_password_here' // Use bcrypt in real implementation
  },
  {
    email: 'analytics@techutsav.com',
    name: 'Analytics Viewer',
    role: 'view-only',
    password: 'hashed_password_here'
  },
  {
    email: 'events@techutsav.com',
    name: 'Events Manager',
    role: 'events-admin',
    password: 'hashed_password_here'
  },
  {
    email: 'payments@techutsav.com',
    name: 'Payments Verifier',
    role: 'payments-admin',
    password: 'hashed_password_here'
  }
]