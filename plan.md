# Master Prompt: TechUtsav Admin Dashboard System

## 🎯 **PROJECT OVERVIEW**

Build a comprehensive admin dashboard system for TechUtsav event management with four distinct admin roles, registration analytics, payment verification, and event management capabilities.

---

## 🏗️ **SYSTEM ARCHITECTURE**

### **Tech Stack Requirements:**
- **Frontend**: Next.js 14+ App Router, JSX, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, MongoDB with Mongoose
- **Authentication**: NextAuth.js with role-based permissions
- **Charts**: Recharts or Chart.js
- **File Upload**: Azure Blob Storage (consistent with main project)
- **Email**: Same email service as main project
- **Fuzzy Matching**: fuse.js for college name grouping

### **Database Schema Extensions:**

```javascript
// Admin User Schema
const AdminSchema = {
  email: String,
  name: String,
  role: {
    type: String,
    enum: ['super-admin', 'view-only', 'events-admin', 'payments-admin']
  },
  permissions: {
    viewAnalytics: Boolean,
    verifyPayments: Boolean,
    manageEvents: Boolean,
    manageAdmins: Boolean
  },
  lastLogin: Date,
  isActive: Boolean
}

// Event Schema (New)
const EventSchema = {
  title: String,
  description: String,
  department: String,
  eventType: String, // 'workshop', 'competition', 'talk'
  poster: String, // Azure Blob URL
  rulebook: String, // Azure Blob URL
  venue: String,
  datetime: Date,
  capacity: Number,
  registrationRequired: Boolean,
  passRequired: [Number], // Which passes allow access
  prizes: [String],
  coordinators: [{
    name: String,
    contact: String,
    email: String
  }],
  isActive: Boolean,
  createdBy: ObjectId // Admin who created it
}

// Enhanced User Schema (extend existing)
const UserEnhancement = {
  // Add to existing User schema
  paymentHistory: [{
    passType: Number,
    amount: Number,
    transactionNumber: String,
    verifiedBy: ObjectId, // Admin who verified
    verificationDate: Date,
    verificationNotes: String
  }]
}
```

---

## 🔐 **ADMIN ROLE DEFINITIONS**

### **1. Super Admin (admin-1)**
```javascript
permissions: {
  viewAnalytics: true,
  verifyPayments: true,
  manageEvents: true,
  manageAdmins: true,
  exportData: true,
  systemSettings: true
}
```

### **2. View-Only Admin (admin-2)**
```javascript
permissions: {
  viewAnalytics: true,
  verifyPayments: false,
  manageEvents: false,
  manageAdmins: false,
  exportData: true,
  systemSettings: false
}
```

### **3. Events Admin (admin-3)**
```javascript
permissions: {
  viewAnalytics: false,
  verifyPayments: false,
  manageEvents: true,
  manageAdmins: false,
  exportData: false,
  systemSettings: false
}
```

### **4. Payments Admin (admin-4)**
```javascript
permissions: {
  viewAnalytics: false,
  verifyPayments: true,
  manageEvents: false,
  manageAdmins: false,
  exportData: true,
  systemSettings: false
}
```

---

## 📊 **ANALYTICS DASHBOARD REQUIREMENTS**

### **1. Registration Analytics**

```tsx
// Dashboard Components Needed:
<RegistrationOverview>
  - Total registrations count
  - Active vs verified users
  - Revenue breakdown by pass type
  - Profit calculation (Revenue - Floor Cost)
</RegistrationOverview>

<PassAnalytics>
  - Pass 1: Offline Workshop + Events
  - Pass 2: Online Paper Presentation  
  - Pass 3: Online Idea Pitching
  - Pass 4: Online Workshops
  - Charts: Bar, Line, Pie for each pass type
</PassAnalytics>

<DateWiseAnalytics>
  - Daily registration trends
  - Peak registration periods
  - Revenue timeline
  - Conversion funnel
</DateWiseAnalytics>

<CollegeAnalytics>
  - Fuzzy college grouping algorithm
  - Top colleges by registration
  - Geographic distribution
  - College-wise revenue
</CollegeAnalytics>
```

### **2. Fuzzy College Grouping Algorithm**

```javascript
// Implementation Requirements:
import Fuse from 'fuse.js'

const fuzzyCollegeGrouping = {
  // Normalize college names
  normalizeCollegeName: (name) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\b(college|university|institute|school)\b/g, '')
      .trim()
  },
  
  // Group similar colleges
  groupColleges: (colleges) => {
    // Use fuzzy matching to group similar names
    // Return grouped data with counts
  },
  
  // Chart the grouped data
  generateCollegeChart: (groupedData) => {
    // Return chart-ready data
  }
}
```

---

## 💳 **PAYMENT VERIFICATION SYSTEM**

### **Required Features:**

```tsx
<PaymentDashboard>
  <PaymentFilters>
    - Filter by: Pass Type, Date Range, Status, College
    - Search by: User Name, Email, Transaction Number
    - Sort by: Date, Amount, Status
  </PaymentFilters>

  <PaymentTable>
    - User details
    - Pass type and amount
    - Transaction number and screenshot
    - Current status (pending/verified/rejected)
    - Verification actions
    - Email notification triggers
  </PaymentTable>

  <PaymentActions>
    - Bulk verify selected payments
    - Send verification emails
    - Add rejection reasons
    - Export payment reports
  </PaymentActions>
</PaymentDashboard>
```

### **Email Templates:**

```javascript
const emailTemplates = {
  paymentVerified: {
    subject: "Payment Verified - TechUtsav Pass {passType}",
    template: "Your payment for {passType} has been verified..."
  },
  paymentRejected: {
    subject: "Payment Issue - TechUtsav Pass {passType}",
    template: "We found an issue with your payment..."
  }
}
```

---

## 🎪 **EVENT MANAGEMENT SYSTEM**

### **Events Admin Interface:**

```tsx
<EventsDashboard>
  <EventsList>
    - All events grid/list view
    - Filter by department, type, status
    - Quick edit actions
    - Duplicate event feature
  </EventsList>

  <EventEditor>
    <BasicDetails>
      - Title, description, department
      - Event type, venue, datetime
      - Capacity and pass requirements
    </BasicDetails>

    <MediaUpload>
      - Poster upload (Azure Blob)
      - Rulebook upload (PDF only)
      - Image optimization
    </MediaUpload>

    <Coordinators>
      - Add multiple coordinators
      - Contact information
      - Role assignments
    </Coordinators>

    <Settings>
      - Registration requirements
      - QR code access (future feature)
      - Visibility controls
    </Settings>
  </EventEditor>
</EventsDashboard>
```

### **Public Events Pages (Main Project Integration):**

```tsx
// /events - All Events Page
<EventsDirectory>
  - Department-wise categorization
  - Search and filter functionality
  - Event cards with posters
  - Quick registration links
</EventsDirectory>

// /events/[id] - Individual Event Page
<EventDetails>
  - Full event information
  - Poster and rulebook download
  - Coordinator contacts
  - Registration integration
  - QR code access (future)
</EventDetails>
```

---

## 🛡️ **SECURITY & PERMISSIONS**

### **Authentication Flow:**
1. Admin login with NextAuth.js
2. Role-based route protection
3. Component-level permission checks
4. API route authorization
5. Audit logging for admin actions

### **Permission Middleware:**
```javascript
export const withPermission = (permission) => {
  return (handler) => async (req, res) => {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.permissions?.[permission]) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    return handler(req, res)
  }
}
```

---

## 📁 **PROJECT STRUCTURE**

```
admin-dashboard/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── dashboard/           # Analytics dashboard
│   │   │   ├── payments/            # Payment verification
│   │   │   ├── events/              # Event management
│   │   │   ├── users/               # User management (super admin)
│   │   │   └── settings/            # System settings
│   │   ├── events/                  # Public events pages
│   │   │   ├── page.tsx             # Events directory
│   │   │   └── [id]/page.tsx        # Individual event
│   │   └── api/
│   │       ├── admin/               # Admin API routes
│   │       ├── analytics/           # Analytics endpoints
│   │       ├── payments/            # Payment operations
│   │       └── events/              # Event operations
│   ├── components/
│   │   ├── admin/                   # Admin-specific components
│   │   ├── analytics/               # Chart components
│   │   ├── payments/                # Payment components
│   │   └── events/                  # Event components
│   ├── lib/
│   │   ├── permissions.js           # Permission utilities
│   │   ├── fuzzy-college.js         # College grouping logic
│   │   ├── email-templates.js       # Email utilities
│   │   └── analytics.js             # Analytics calculations
│   └── models/
│       ├── Admin.js                 # Admin user model
│       ├── Event.js                 # Event model
│       └── Analytics.js             # Analytics cache model
```

---

## 🚀 **DEVELOPMENT PHASES**

### **Phase 1: Foundation (Week 1-2)**
- Admin authentication system
- Role-based permissions
- Basic dashboard layout
- Database schema setup

### **Phase 2: Analytics Dashboard (Week 3-4)**
- Registration analytics
- Chart implementations
- Fuzzy college grouping
- Export functionality

### **Phase 3: Payment Verification (Week 5-6)**
- Payment dashboard
- Verification workflow
- Email notifications
- Bulk operations

### **Phase 4: Event Management (Week 7-8)**
- Event CRUD operations
- Media upload system
- Public events pages
- Integration with main project

### **Phase 5: Polish & Testing (Week 9-10)**
- Security auditing
- Performance optimization
- User testing
- Documentation

---

## 🔗 **INTEGRATION REQUIREMENTS**

### **With Main TechUtsav Project:**
- Shared user authentication
- Consistent design system
- Shared Azure Blob storage
- Cross-project navigation
- Unified email service

### **Data Synchronization:**
- Real-time dashboards
- Webhook notifications
- Cache invalidation
- Database consistency

---

## 📈 **SUCCESS METRICS**

### **Admin Efficiency:**
- Time to verify payments: < 30 seconds per payment
- Event creation time: < 5 minutes
- Dashboard load time: < 2 seconds
- Data accuracy: 99.9%

### **System Performance:**
- Support 1000+ concurrent users
- 99.9% uptime
- Real-time data updates
- Mobile-responsive design

---

This master prompt provides a comprehensive roadmap for building the TechUtsav Admin Dashboard system with clear technical specifications, security considerations, and development phases. Each component is designed to integrate seamlessly with your existing TechUtsav project while providing powerful administrative capabilities.