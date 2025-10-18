# 📚 New Concierge - User Guides
## Comprehensive User Manuals for All User Types

---

# 🔧 **SUPER USER GUIDE**
## Complete System Administration & Management

### **Overview**
As a Super User, you have complete access to all system features, admin functions, and can manage the entire New Concierge platform.

---

## **🚀 Getting Started**

### **1. System Access**
- **Login URL**: `http://localhost:8000/api/users/login/`
- **Admin Panel**: `http://localhost:8000/admin/`
- **API Documentation**: `http://localhost:8000/api/docs/`

### **2. Initial Setup**
```bash
# Create superuser account
docker compose exec backend python manage.py createsuperuser

# Access admin panel
http://localhost:8000/admin/
```

---

## **🛠️ System Administration**

### **User Management**
#### **View All Users**
```http
GET /api/admin/users/
Authorization: Bearer <superuser_token>
```

#### **Create New Users**
```http
POST /api/admin/users/
{
  "email": "manager@example.com",
  "password": "secure_password",
  "role": "manager",
  "building_id": 1
}
```

#### **User Actions**
- **Activate/Deactivate Users**
- **Reset Passwords**
- **Assign Roles (Manager/Resident)**
- **Manage Building Associations**

### **Subscription Management**
#### **View All Subscriptions**
```http
GET /api/billing/api/admin/subscriptions/
```

#### **Subscription Actions**
- **Extend Trial Periods**
- **Upgrade/Downgrade Plans**
- **Cancel Subscriptions**
- **Generate Manual Invoices**

### **Billing Administration**
#### **Financial Overview**
```http
GET /api/billing/api/admin/dashboard/?type=financial
```

**Key Metrics:**
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Payment Success Rates
- Churn Analysis

#### **Invoice Management**
```http
GET /api/billing/api/admin/billing/
```

**Actions Available:**
- **View All Invoices**
- **Process Failed Payments**
- **Generate Manual Invoices**
- **Handle Refunds**

---

## **📊 Advanced Analytics & Reporting**

### **Revenue Analytics**
```http
GET /api/billing/api/analytics/revenue/?period_days=30
```

**Features:**
- Revenue forecasting (3-month predictions)
- Growth rate analysis
- Revenue by plan type
- Daily revenue trends

### **Customer Analytics**
```http
GET /api/billing/api/analytics/customers/?period_days=30
```

**Insights:**
- Customer acquisition trends
- Lifetime value analysis
- Customer segmentation
- Behavior patterns

### **Predictive Analytics**
```http
GET /api/billing/api/analytics/predictive/
```

**Predictions:**
- Churn risk identification
- Revenue forecasting
- Growth projections
- Capacity planning

### **System Health Monitoring**
```http
GET /api/billing/api/admin/system-health/
```

**Monitoring:**
- API performance metrics
- Database health
- Payment processing status
- Email delivery rates

---

## **🔐 Security & Audit**

### **Security Audit Logs**
```http
GET /api/admin/audit-logs/
```

**Track:**
- Login attempts and failures
- Permission changes
- Data modifications
- Security events

### **Rate Limiting Management**
- Monitor API usage per user
- Adjust rate limits as needed
- Handle abuse cases
- Performance optimization

### **Account Security**
- Enable/disable user accounts
- Reset passwords
- Manage two-factor authentication
- IP-based access control

---

## **⚙️ System Configuration**

### **Subscription Plans Management**
```http
GET /api/billing/plans/
POST /api/billing/plans/
```

**Plan Configuration:**
- Create custom plans
- Set pricing and limits
- Configure features
- Manage Stripe integration

### **Email Templates**
- Customize email templates
- Manage notification settings
- Test email delivery
- Monitor email performance

### **System Settings**
- Configure Stripe keys
- Set up webhook endpoints
- Manage database settings
- Configure logging levels

---

## **🚨 Troubleshooting & Support**

### **Common Issues**

#### **Payment Processing Issues**
1. Check Stripe webhook logs
2. Verify payment method status
3. Review failed payment attempts
4. Process manual payments if needed

#### **User Access Issues**
1. Verify user account status
2. Check role assignments
3. Review permission settings
4. Reset user credentials

#### **System Performance**
1. Monitor API response times
2. Check database performance
3. Review error logs
4. Optimize queries if needed

### **Emergency Procedures**

#### **System Downtime**
1. Check Docker container status
2. Review application logs
3. Restart services if needed
4. Notify users of issues

#### **Payment Failures**
1. Review Stripe dashboard
2. Check webhook delivery
3. Process manual payments
4. Contact affected customers

---

## **📈 Best Practices**

### **Daily Tasks**
- Monitor system health dashboard
- Review new user registrations
- Check payment processing status
- Review security audit logs

### **Weekly Tasks**
- Analyze revenue reports
- Review customer analytics
- Check subscription health
- Update system documentation

### **Monthly Tasks**
- Comprehensive system review
- Performance optimization
- Security audit
- Backup verification

---

---

# 🏢 **MANAGER GUIDE**
## Building Management & User Administration

### **Overview**
As a Manager, you can manage buildings, residents, financial records, and maintenance requests. You have full access to building-specific data and can invite residents to join the system.

---

## **🚀 Getting Started**

### **1. Account Setup**
- **Registration**: Ask Super User to create your account
- **Login**: `http://localhost:8000/api/users/login/`
- **Dashboard**: Access building management features

### **2. Initial Configuration**
- **Building Setup**: Configure your building(s)
- **User Roles**: Understand Manager vs Resident permissions
- **Subscription**: Choose appropriate plan

---

## **🏢 Building Management**

### **Building Information**
#### **View Building Details**
```http
GET /api/buildings/
Authorization: Bearer <manager_token>
```

#### **Update Building Information**
```http
PUT /api/buildings/{id}/
{
  "name": "Residential Complex Alpha",
  "address": "123 Main Street",
  "total_apartments": 50,
  "floors": 5
}
```

### **Apartment Management**
#### **View All Apartments**
```http
GET /api/buildings/{id}/apartments/
```

#### **Add New Apartment**
```http
POST /api/buildings/{id}/apartments/
{
  "apartment_number": "1A",
  "floor": 1,
  "area": 85.5,
  "bedrooms": 2,
  "bathrooms": 1
}
```

---

## **👥 User Management**

### **Invite Residents**
#### **Send Invitations**
```http
POST /api/users/invite/
{
  "email": "resident@example.com",
  "role": "resident",
  "building_id": 1,
  "apartment_id": 1,
  "message": "Welcome to our building management system!"
}
```

#### **Manage Invitations**
```http
GET /api/users/invitations/
```

**Invitation Actions:**
- **Resend Invitations**
- **Cancel Pending Invitations**
- **Track Invitation Status**

### **User Administration**
#### **View Building Residents**
```http
GET /api/buildings/{id}/residents/
```

#### **User Management Actions**
- **View Resident Profiles**
- **Update User Information**
- **Deactivate Users**
- **Reset Passwords**

---

## **💰 Financial Management**

### **Expense Tracking**
#### **View All Expenses**
```http
GET /api/financial/expenses/
```

#### **Create New Expense**
```http
POST /api/financial/expenses/
{
  "building": 1,
  "category": "maintenance",
  "amount": 150.00,
  "description": "Elevator maintenance",
  "date": "2024-01-15",
  "receipt": "receipt_file.pdf"
}
```

**Expense Categories:**
- Maintenance
- Utilities
- Cleaning
- Security
- Insurance
- Other

#### **Expense Management**
- **Approve/Reject Expenses**
- **Add Receipts**
- **Categorize Expenses**
- **Generate Reports**

### **Payment Collection**
#### **View Payments**
```http
GET /api/financial/payments/
```

#### **Record Payments**
```http
POST /api/financial/payments/
{
  "building": 1,
  "apartment": 1,
  "resident": 1,
  "amount": 200.00,
  "payment_type": "monthly_fee",
  "date": "2024-01-15"
}
```

**Payment Types:**
- Monthly Fees
- Maintenance Fees
- Utilities
- Special Assessments
- Late Fees

---

## **🔧 Maintenance Management**

### **Maintenance Requests**
#### **View All Requests**
```http
GET /api/maintenance/tickets/
```

#### **Create Maintenance Ticket**
```http
POST /api/maintenance/tickets/
{
  "building": 1,
  "apartment": 1,
  "resident": 1,
  "category": "plumbing",
  "priority": "high",
  "description": "Water leak in kitchen",
  "location": "Kitchen sink area"
}
```

**Maintenance Categories:**
- Plumbing
- Electrical
- HVAC
- Elevator
- Common Areas
- Security
- Cleaning

**Priority Levels:**
- Low (Non-urgent)
- Medium (Normal)
- High (Urgent)
- Emergency (Critical)

#### **Maintenance Management**
- **Assign Technicians**
- **Update Status**
- **Add Notes**
- **Schedule Repairs**
- **Track Progress**

---

## **📊 Reports & Analytics**

### **Building Reports**
#### **Financial Reports**
```http
GET /api/financial/reports/
```

**Available Reports:**
- Monthly Expense Summary
- Payment Collection Report
- Outstanding Balances
- Budget vs Actual

#### **Maintenance Reports**
```http
GET /api/maintenance/reports/
```

**Report Types:**
- Maintenance Request Summary
- Response Time Analysis
- Cost Analysis
- Preventive Maintenance Schedule

### **Usage Analytics**
#### **View Building Usage**
```http
GET /api/billing/api/analytics/usage/
```

**Metrics Tracked:**
- Number of Apartments
- Active Residents
- Maintenance Requests
- Financial Transactions

---

## **📧 Communication**

### **Email Notifications**
#### **Configure Notifications**
```http
PUT /api/users/profile/
{
  "email_notifications_enabled": true,
  "notify_financial_updates": true,
  "notify_maintenance_updates": true,
  "notify_announcements": true
}
```

#### **Notification Types**
- **Financial Updates**: Payment confirmations, expense approvals
- **Maintenance Updates**: Request status changes, completion notices
- **Announcements**: Building-wide communications
- **Votes**: Important building decisions

### **Building Announcements**
- Send building-wide announcements
- Schedule maintenance notifications
- Share important updates
- Communicate policy changes

---

## **🔐 Security & Access**

### **Access Control**
- **Building-specific Access**: Only access your assigned buildings
- **Resident Data**: View and manage resident information
- **Financial Data**: Full access to building finances
- **Maintenance Data**: Complete maintenance management

### **Data Security**
- **Secure Login**: Use strong passwords
- **Session Management**: Automatic logout for security
- **Audit Trail**: All actions are logged
- **Permission-based Access**: Role-based permissions

---

## **📱 Mobile Access**

### **Mobile-friendly Features**
- **Responsive Design**: Works on all devices
- **Mobile Notifications**: Push notifications for updates
- **Offline Access**: Basic functionality offline
- **Quick Actions**: Fast access to common tasks

---

## **🚨 Troubleshooting**

### **Common Issues**

#### **Login Problems**
1. Verify email and password
2. Check account activation status
3. Contact Super User for assistance
4. Reset password if needed

#### **Permission Issues**
1. Verify building assignments
2. Check role permissions
3. Contact Super User
4. Review access logs

#### **Data Access Issues**
1. Verify building associations
2. Check apartment assignments
3. Review permission settings
4. Contact support

---

## **📈 Best Practices**

### **Daily Tasks**
- Review new maintenance requests
- Check payment status
- Monitor building notifications
- Update resident information

### **Weekly Tasks**
- Review financial reports
- Analyze maintenance trends
- Check resident engagement
- Update building information

### **Monthly Tasks**
- Generate comprehensive reports
- Review subscription usage
- Plan maintenance schedules
- Assess resident satisfaction

---

---

# 🏠 **RESIDENT GUIDE**
## Personal Account & Building Services

### **Overview**
As a Resident, you can manage your personal profile, view building information, submit maintenance requests, and track your payments. You have access to building-specific services and can communicate with building management.

---

## **🚀 Getting Started**

### **1. Account Activation**
- **Invitation**: Receive invitation email from Manager
- **Accept Invitation**: Click link in email to accept
- **Set Password**: Create secure password
- **Login**: Access your personal dashboard

### **2. Profile Setup**
- **Complete Profile**: Add personal information
- **Notification Preferences**: Set communication preferences
- **Building Association**: Confirm apartment assignment

---

## **👤 Personal Profile Management**

### **View Profile**
```http
GET /api/users/profile/
Authorization: Bearer <resident_token>
```

### **Update Profile**
```http
PUT /api/users/profile/
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "email_notifications_enabled": true,
  "notify_maintenance_updates": true,
  "notify_announcements": true
}
```

**Profile Information:**
- Personal details (name, phone, email)
- Notification preferences
- Building and apartment association
- Emergency contacts

---

## **🏢 Building Information**

### **View Building Details**
```http
GET /api/buildings/{id}/
```

**Building Information:**
- Building name and address
- Total apartments and floors
- Common facilities
- Contact information

### **View Apartment Details**
```http
GET /api/buildings/{id}/apartments/{apartment_id}/
```

**Apartment Information:**
- Apartment number and floor
- Area and layout details
- Amenities and features
- Lease information

---

## **🔧 Maintenance Requests**

### **Submit Maintenance Request**
```http
POST /api/maintenance/tickets/
{
  "building": 1,
  "apartment": 1,
  "category": "plumbing",
  "priority": "medium",
  "description": "Kitchen faucet dripping",
  "location": "Kitchen sink"
}
```

**Maintenance Categories:**
- **Plumbing**: Water leaks, faucet issues, toilet problems
- **Electrical**: Power outages, faulty switches, lighting issues
- **HVAC**: Heating/cooling problems, ventilation issues
- **Elevator**: Elevator malfunctions, button issues
- **Common Areas**: Hallway, lobby, parking issues
- **Security**: Door locks, intercom, security systems
- **Cleaning**: Common area cleaning requests

**Priority Levels:**
- **Low**: Non-urgent issues (cosmetic problems)
- **Medium**: Normal issues (functional problems)
- **High**: Urgent issues (safety concerns)
- **Emergency**: Critical issues (immediate danger)

### **Track Maintenance Requests**
```http
GET /api/maintenance/tickets/
```

**Request Status:**
- **Submitted**: Request received
- **In Progress**: Work being scheduled
- **Scheduled**: Repair appointment set
- **Completed**: Work finished
- **Closed**: Request resolved

### **Maintenance History**
- View all past requests
- Track response times
- Review completion status
- Rate service quality

---

## **💰 Financial Information**

### **View Payment History**
```http
GET /api/financial/payments/
```

**Payment Information:**
- Monthly fees and charges
- Maintenance fees
- Utility payments
- Special assessments
- Payment due dates
- Outstanding balances

### **Payment Status**
- **Paid**: Payment completed
- **Pending**: Payment processing
- **Overdue**: Payment past due
- **Failed**: Payment unsuccessful

### **Financial Reports**
- Monthly payment summaries
- Annual payment history
- Outstanding balance reports
- Payment confirmations

---

## **📧 Communication**

### **Notification Preferences**
```http
PUT /api/users/profile/
{
  "email_notifications_enabled": true,
  "notify_financial_updates": true,
  "notify_maintenance_updates": true,
  "notify_announcements": true,
  "notify_votes": true
}
```

**Notification Types:**
- **Financial Updates**: Payment confirmations, fee changes
- **Maintenance Updates**: Request status, completion notices
- **Announcements**: Building-wide communications
- **Votes**: Important building decisions

### **Building Announcements**
- Receive building-wide announcements
- Maintenance notifications
- Policy updates
- Emergency alerts

### **Contact Management**
- Direct communication with building management
- Emergency contact information
- Service request updates
- General inquiries

---

## **📊 Usage Tracking**

### **View Usage Information**
```http
GET /api/billing/api/analytics/usage/
```

**Usage Metrics:**
- Maintenance requests submitted
- Payment history
- Building engagement
- Service utilization

### **Usage Limits**
- Understand building service limits
- Track personal usage
- Monitor service availability
- Plan maintenance needs

---

## **🏠 Building Services**

### **Common Facilities**
- **Elevator**: Schedule maintenance, report issues
- **Parking**: Manage parking assignments
- **Laundry**: Monitor laundry facilities
- **Storage**: Manage storage units
- **Gym**: Access fitness facilities

### **Building Rules**
- **Quiet Hours**: Understand building policies
- **Guest Policy**: Guest registration procedures
- **Pet Policy**: Pet ownership guidelines
- **Maintenance Access**: Service entry procedures

### **Emergency Procedures**
- **Emergency Contacts**: Building emergency numbers
- **Evacuation Plans**: Emergency exit procedures
- **Safety Protocols**: Building safety guidelines
- **Incident Reporting**: How to report emergencies

---

## **📱 Mobile Access**

### **Mobile Features**
- **Responsive Design**: Works on all devices
- **Push Notifications**: Real-time updates
- **Offline Access**: Basic functionality offline
- **Quick Actions**: Fast access to common tasks

### **Mobile App Features**
- **Maintenance Requests**: Submit and track requests
- **Payment Notifications**: Receive payment alerts
- **Building Updates**: Get latest announcements
- **Emergency Contacts**: Quick access to help

---

## **🔐 Security & Privacy**

### **Account Security**
- **Secure Login**: Use strong passwords
- **Session Management**: Automatic logout for security
- **Privacy Settings**: Control information sharing
- **Data Protection**: Secure personal information

### **Access Control**
- **Building-specific Access**: Only your building data
- **Personal Information**: Private profile data
- **Payment History**: Secure financial information
- **Maintenance Requests**: Private service requests

---

## **🚨 Troubleshooting**

### **Common Issues**

#### **Login Problems**
1. Verify email and password
2. Check account activation status
3. Contact building management
4. Reset password if needed

#### **Maintenance Request Issues**
1. Verify request details
2. Check building assignment
3. Contact management directly
4. Follow up on urgent issues

#### **Payment Issues**
1. Verify payment information
2. Check payment history
3. Contact building management
4. Review outstanding balances

#### **Notification Issues**
1. Check notification preferences
2. Verify email settings
3. Check spam folder
4. Update contact information

---

## **📈 Best Practices**

### **Daily Tasks**
- Check for building announcements
- Review maintenance request status
- Monitor payment due dates
- Update personal information

### **Weekly Tasks**
- Review payment history
- Check maintenance updates
- Update notification preferences
- Plan maintenance needs

### **Monthly Tasks**
- Review financial statements
- Assess maintenance satisfaction
- Update emergency contacts
- Provide feedback to management

---

## **📞 Support & Contact**

### **Building Management**
- **Manager Contact**: Direct communication with building manager
- **Emergency Line**: 24/7 emergency contact
- **General Inquiries**: Non-urgent questions and requests

### **Technical Support**
- **System Issues**: Technical problems with the platform
- **Account Problems**: Login and access issues
- **Feature Questions**: How to use specific features

### **Emergency Contacts**
- **Building Emergency**: Immediate building issues
- **Medical Emergency**: Health and safety concerns
- **Security Issues**: Security-related problems

---

## **🎯 Getting the Most Out of the System**

### **Tips for Residents**
1. **Stay Updated**: Enable all relevant notifications
2. **Report Issues Early**: Submit maintenance requests promptly
3. **Keep Information Current**: Update profile and contact details
4. **Use Mobile Access**: Take advantage of mobile features
5. **Provide Feedback**: Help improve building services

### **System Benefits**
- **Convenience**: 24/7 access to building services
- **Transparency**: Clear communication with management
- **Efficiency**: Fast maintenance request processing
- **Organization**: Centralized building information
- **Community**: Better building communication

---

**The New Concierge system is designed to make building living more convenient, organized, and enjoyable for all residents!** 🏠✨


