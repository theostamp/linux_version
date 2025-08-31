# 📋 TODO: Μετατροπή Modal "Λεπτομέρειες" σε "Ειδοποιητήριο Πληρωμής"

## 🎯 **Στόχος**
Μετατροπή του modal "Λεπτομέρειες: Διαμέρισμα X" σε εκτυπώσιμο "Ειδοποιητήριο Πληρωμής" με επαγγελματική εμφάνιση και πλήρη πληροφορίες για την πληρωμή που πρέπει να γίνει.

---

## 📁 **Αρχεία που θα τροποποιηθούν**

### 🔧 **Backend Changes**
- [ ] `backend/users/models.py` - Προσθήκη πεδίου `office_logo` στο CustomUser model
- [ ] `backend/users/serializers.py` - Ενημέρωση OfficeDetailsSerializer
- [ ] `backend/users/views.py` - Ενημέρωση update_office_details view για logo upload
- [ ] `backend/users/urls.py` - Προσθήκη URL για logo upload

### 🎨 **Frontend Changes**
- [ ] `frontend/components/financial/ApartmentBalancesTab.tsx` - Μετατροπή του details modal
- [ ] `frontend/components/OfficeSettingsModal.tsx` - Προσθήκη logo upload field
- [ ] `frontend/components/financial/PaymentNotificationModal.tsx` - **ΝΕΟ ΑΡΧΕΙΟ** (αν χρειαστεί)

---

## 🚀 **Βήματα Υλοποίησης**

### **Βήμα 1: Backend - Logo Upload Support**
- [ ] **1.1** Προσθήκη πεδίου `office_logo` στο CustomUser model
  ```python
  office_logo = models.ImageField(
      _("Logo Γραφείου Διαχείρισης"),
      upload_to='office_logos/',
      blank=True,
      null=True,
      help_text=_("Logo της εταιρείας διαχείρισης")
  )
  ```
- [ ] **1.2** Ενημέρωση OfficeDetailsSerializer για logo field
- [ ] **1.3** Ενημέρωση update_office_details view για file upload
- [ ] **1.4** Δημιουργία και εφαρμογή migration
- [ ] **1.5** Προσθήκη URL για logo upload

### **Βήμα 2: Frontend - Office Settings Modal**
- [ ] **2.1** Προσθήκη logo upload field στο OfficeSettingsModal
  - File input με preview
  - Validation για image files
  - Remove logo functionality
- [ ] **2.2** Ενημέρωση form submission για logo upload
- [ ] **2.3** Προσθήκη logo preview στο modal

### **Βήμα 3: Frontend - Payment Notification Modal**
- [ ] **3.1** Μετονομασία modal title από "Λεπτομέρειες" σε "Ειδοποιητήριο Πληρωμής"
- [ ] **3.2** Προσθήκη επαγγελματικού header με:
  - Logo της εταιρείας διαχείρισης
  - Όνομα γραφείου διαχείρισης
  - Διεύθυνση γραφείου
  - Τηλέφωνο επικοινωνίας
- [ ] **3.3** Ενημέρωση περιεχομένου για ειδοποιητήριο πληρωμής:
  - Στοιχεία διαμερίσματος (ιδιοκτήτης, ενοικιαστής)
  - Λεπτομέρειες πληρωμής (ποσό, ημερομηνία λήξης)
  - Ανάλυση κοινοχρήστων
  - Σημειώσεις και οδηγίες πληρωμής

### **Βήμα 4: Content Transformation**
- [ ] **4.1** Προσθήκη payment deadline (15η του επόμενου μήνα)
- [ ] **4.2** Ενημέρωση financial information display:
  - "Ποσό Πληρωτέο" αντί για "Net Obligation"
  - "Ημερομηνία Λήξης Πληρωμής"
  - "Ανάλυση Κοινοχρήστων"
- [ ] **4.3** Προσθήκη επαγγελματικών οδηγιών πληρωμής
- [ ] **4.4** Προσθήκη footer με επαγγελματικές πληροφορίες

### **Βήμα 5: Print Functionality**
- [ ] **5.1** Ενημέρωση print styling για επαγγελματική εμφάνιση
- [ ] **5.2** Προσθήκη print-specific CSS classes
- [ ] **5.3** Ενεργοποίηση/απενεργοποίηση στοιχείων κατά την εκτύπωση
- [ ] **5.4** Προσθήκη QR code για digital verification

---

## 🎨 **Design Specifications**

### **Header Section**
```
┌─────────────────────────────────────────────────────────┐
│ [LOGO]  ΓΡΑΦΕΙΟ ΔΙΑΧΕΙΡΙΣΗΣ ΠΑΠΑΔΟΠΟΥΛΟΥ              │
│         Λεωφ. Συγγρού 123, Αθήνα                       │
│         Τηλ: 210-1234567                                │
└─────────────────────────────────────────────────────────┘
```

### **Content Structure**
1. **Τίτλος**: "ΕΙΔΟΠΟΙΗΤΗΡΙΟ ΠΛΗΡΩΜΗΣ ΚΟΙΝΟΧΡΗΣΤΩΝ"
2. **Στοιχεία Διαμερίσματος**: Αριθμός, Ιδιοκτήτης, Ενοικιαστής
3. **Πληροφορίες Πληρωμής**: Ποσό, Ημερομηνία λήξης
4. **Ανάλυση Κοινοχρήστων**: Λεπτομέρειες δαπανών
5. **Οδηγίες Πληρωμής**: Τρόποι πληρωμής, τραπεζικά στοιχεία

### **Footer Section**
```
┌─────────────────────────────────────────────────────────┐
│ Τραπεζικά Στοιχεία:                                     │
│ IBAN: GR16 0110 1250 0000 1234 5678 901                │
│ Δικαιούχος: Γραφείο Διαχείρισης Παπαδόπουλου           │
│                                                         │
│ QR Code: [QR CODE]                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 **Technical Implementation Details**

### **Logo Upload Requirements**
- **File Types**: PNG, JPG, JPEG, SVG
- **Max Size**: 2MB
- **Dimensions**: Recommended 200x200px
- **Storage**: `/media/office_logos/` directory

### **Print Styling**
- **Paper Size**: A4
- **Margins**: 1cm on all sides
- **Font**: Arial, 12px for body, 16px for headers
- **Colors**: Black and white for printing

### **Data Sources**
- **Office Info**: `user.office_name`, `user.office_phone`, `user.office_address`, `user.office_logo`
- **Building Info**: `building.name`, `building.address`
- **Apartment Info**: `apartment.number`, `apartment.owner_name`, `apartment.tenant_name`
- **Financial Info**: `apartment.net_obligation`, `apartment.payment_breakdown`

---

## 🧪 **Testing Checklist**

### **Backend Testing**
- [ ] Logo upload functionality
- [ ] File validation (type, size)
- [ ] Database storage and retrieval
- [ ] API endpoints for office details

### **Frontend Testing**
- [ ] Logo upload in office settings
- [ ] Logo display in payment notification
- [ ] Print functionality
- [ ] Responsive design
- [ ] Greek text rendering

### **Integration Testing**
- [ ] End-to-end payment notification flow
- [ ] Print output quality
- [ ] Data accuracy in notification
- [ ] Logo display across different screen sizes

---

## 📝 **Notes & Considerations**

### **Greek Language Support**
- Όλα τα κείμενα πρέπει να είναι στα ελληνικά
- Χρήση ελληνικών ημερομηνιών (π.χ. "15η Ιανουαρίου 2025")
- Χρήση ελληνικών νομισματικών μονάδων (€)

### **Professional Appearance**
- Επαγγελματικό header με logo
- Καθαρή και ευανάγνωστη τυπογραφία
- Σωστή χρήση χρωμάτων και spacing
- Print-friendly design

### **Data Accuracy**
- Επαλήθευση όλων των ποσών
- Σωστή ημερομηνία λήξης πληρωμής
- Ενημερωμένα στοιχεία επικοινωνίας
- Ακριβής ανάλυση κοινοχρήστων

---

## 🎯 **Success Criteria**

### **Functional Requirements**
- [ ] Logo upload and display works correctly
- [ ] Payment notification shows all required information
- [ ] Print functionality produces professional output
- [ ] All Greek text displays correctly
- [ ] Payment deadline is calculated correctly

### **User Experience**
- [ ] Modal opens quickly and displays data correctly
- [ ] Print output is professional and readable
- [ ] Logo upload is intuitive and user-friendly
- [ ] Error handling is graceful and informative

### **Technical Quality**
- [ ] Code follows project conventions
- [ ] No console errors or warnings
- [ ] Responsive design works on all screen sizes
- [ ] Print styling is consistent across browsers

---

## 📅 **Estimated Timeline**
- **Backend Changes**: 2-3 hours
- **Frontend Modal Transformation**: 4-5 hours
- **Print Styling**: 2-3 hours
- **Testing & Refinement**: 2-3 hours
- **Total**: 10-14 hours

---

## 🔄 **Next Steps**
1. Start with backend logo upload implementation
2. Update office settings modal with logo field
3. Transform apartment details modal into payment notification
4. Implement print styling and functionality
5. Test thoroughly across different scenarios
6. Deploy and gather user feedback
