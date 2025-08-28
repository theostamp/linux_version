# 📋 TODO: Έλεγχος & Διόρθωση Εμφάνισης Οικονομικών Ποσών

## 🎯 Σκοπός
Διόρθωση της εμφάνισης των ποσών αποθεματικού και κόστους διαχείρισης στο σύστημα, με έμφαση στη σωστή κατανομή και εμφάνιση.

---

## 🔍 Τρέχον Πρόβλημα
- **Backend υπολογίζει σωστά:** 44.0€ (0€ εξόδων + 44€ αποθεματικό)
- **Frontend εμφανίζει λάθος:** -8,00€
- **Διαφορά:** 52.0€

---

## 📊 Βασικές Αρχές Κατανομής

### 💰 Κόστος Διαχείρισης
- **Κατανομή:** Ισόποσα (ποσό ÷ αριθμός διαμερισμάτων)
- **Παράδειγμα:** 120€ ÷ 10 διαμερίσματα = 12€ ανά διαμέρισμα

### 🏦 Αποθεματικό Ταμείο
- **Κατανομή:** Με βάση χιλιοστά ιδιοκτησίας
- **Παράδειγμα:** 500€ μηνιαίος στόχος × (88 χιλιοστά ÷ 1000) = 44€

---

## ✅ TODO Λίστα

### 🔧 1. Backend Ελέγχος & Διόρθωση

#### 1.1 Έλεγχος PaymentSerializer.get_monthly_due()
- [ ] Επιβεβαίωση ότι υπολογίζει σωστά το αποθεματικό
- [ ] Επιβεβαίωση ότι υπολογίζει σωστά το κόστος διαχείρισης
- [ ] Έλεγχος για type conversion errors
- [ ] Προσθήκη logging για debugging

#### 1.2 Έλεγχος CommonExpenseCalculator
- [ ] Επιβεβαίωση ότι διαχωρίζει σωστά διαχείριση από αποθεματικό
- [ ] Έλεγχος κατανομής διαχείρισης (ισόποσα)
- [ ] Έλεγχος κατανομής αποθεματικού (χιλιοστά)
- [ ] Προσθήκη breakdown στο response

#### 1.3 API Endpoint Ελέγχος
- [ ] Έλεγχος `/financial/building/{id}/apartments-summary/`
- [ ] Επιβεβαίωση ότι επιστρέφει σωστά monthly_due
- [ ] Έλεγχος για caching issues
- [ ] Προσθήκη breakdown fields στο response

### 🎨 2. Frontend Ελέγχος & Διόρθωση

#### 2.1 AddPaymentModal.tsx
- [ ] Έλεγχος υπολογισμού προτεινόμενου ποσού
- [ ] Διόρθωση εμφάνισης αρνητικών ποσών
- [ ] Προσθήκη breakdown εμφάνισης
- [ ] Έλεγχος για type conversion errors

#### 2.2 Εμφάνιση Breakdown
- [ ] Προσθήκη κειμένου: "Αποθεματικό: Χ.ΧΧ€ + Διαχείριση: Χ.ΧΧ€"
- [ ] Εμφάνιση συνολικού ποσού
- [ ] Ένδειξη τρόπου κατανομής (ισόποσα vs χιλιοστά)
- [ ] Προσθήκη tooltip με εξήγηση

#### 2.3 useApartmentsWithFinancialData Hook
- [ ] Έλεγχος data fetching
- [ ] Έλεγχος caching logic
- [ ] Επιβεβαίωση ότι λαμβάνει σωστά δεδομένα
- [ ] Προσθήκη error handling

### 🧪 3. Testing & Επιβεβαίωση

#### 3.1 Unit Tests
- [ ] Test για PaymentSerializer.get_monthly_due()
- [ ] Test για CommonExpenseCalculator
- [ ] Test για frontend calculations
- [ ] Test για breakdown εμφάνιση

#### 3.2 Integration Tests
- [ ] Test API endpoint response
- [ ] Test frontend-backend integration
- [ ] Test με διαφορετικά σενάρια
- [ ] Test με μηδενικά ποσά

#### 3.3 Manual Testing
- [ ] Έλεγχος με διαμέρισμα 3 (88 χιλιοστά)
- [ ] Έλεγχος με διαφορετικά διαμερίσματα
- [ ] Έλεγχος με και χωρίς εξόδους
- [ ] Έλεγχος με διαφορετικούς μήνες

---

## 🎨 4. UI/UX Βελτιώσεις

### 4.1 Εμφάνιση Ποσών
- [ ] Προσθήκη breakdown tooltip
- [ ] Ένδειξη τρόπου κατανομής
- [ ] Χρωματική διάκριση (θετικά/αρνητικά)
- [ ] Προσθήκη εικονιδίων

### 4.2 Εξήγηση Κατανομής
- [ ] Tooltip: "Διαχείριση: ισόποσα, Αποθεματικό: βάσει χιλιοστών"
- [ ] Help text για κάθε πεδίο
- [ ] Documentation link
- [ ] FAQ section

---

## 🔧 5. Technical Implementation

### 5.1 Backend Changes
```python
# PaymentSerializer.get_monthly_due() - Προσθήκη breakdown
def get_monthly_due(self, obj):
    # Υπολογισμός διαχείρισης (ισόποσα)
    management_fee = building.management_fee_per_apartment
    
    # Υπολογισμός αποθεματικού (χιλιοστά)
    reserve_fund = calculate_reserve_fund_by_mills(apartment)
    
    return {
        'total': management_fee + reserve_fund,
        'breakdown': {
            'management_fee': management_fee,
            'reserve_fund': reserve_fund,
            'distribution_info': {
                'management': 'ισόποσα',
                'reserve_fund': 'βάσει χιλιοστών'
            }
        }
    }
```

### 5.2 Frontend Changes
```typescript
// AddPaymentModal - Εμφάνιση breakdown
const breakdownText = `Αποθεματικό: ${formatCurrency(reserveFund)} + Διαχείριση: ${formatCurrency(managementFee)}`;

// Tooltip με εξήγηση
<Tooltip content="Διαχείριση: ισόποσα, Αποθεματικό: βάσει χιλιοστών">
  <span>{breakdownText}</span>
</Tooltip>
```

---

## 📋 6. Επιβεβαίωση Κριτηρίων

### 6.1 Σωστή Κατανομή
- [ ] Διαχείριση: ισόποσα σε όλα τα διαμερίσματα
- [ ] Αποθεματικό: ανάλογα με χιλιοστά
- [ ] Συνολικό ποσό = διαχείριση + αποθεματικό

### 6.2 Σωστή Εμφάνιση
- [ ] Θετικά ποσά (όχι αρνητικά)
- [ ] Breakdown εμφάνιση όπου εφικτό
- [ ] Εξήγηση τρόπου κατανομής
- [ ] Συνεπής μορφοποίηση

### 6.3 Performance
- [ ] Χωρίς caching issues
- [ ] Γρήγορη φόρτωση
- [ ] Σωστό error handling
- [ ] Responsive design

---

## 🚀 7. Deployment & Monitoring

### 7.1 Pre-deployment
- [ ] Code review
- [ ] Testing σε staging
- [ ] Performance testing
- [ ] Security review

### 7.2 Post-deployment
- [ ] Monitoring για errors
- [ ] User feedback collection
- [ ] Performance monitoring
- [ ] Bug tracking

---

## 📝 8. Documentation

### 8.1 Technical Documentation
- [ ] API documentation update
- [ ] Code comments
- [ ] Architecture decisions
- [ ] Troubleshooting guide

### 8.2 User Documentation
- [ ] User guide update
- [ ] FAQ section
- [ ] Video tutorials
- [ ] Help documentation

---

## ⏰ Προτεραιότητες

### 🔴 High Priority
1. Διόρθωση αρνητικού ποσού στο frontend
2. Έλεγχος backend calculations
3. Προσθήκη breakdown εμφάνισης

### 🟡 Medium Priority
1. UI/UX βελτιώσεις
2. Performance optimizations
3. Documentation updates

### 🟢 Low Priority
1. Advanced features
2. Additional tooltips
3. Extended testing

---

## 📞 Επικοινωνία

**Responsible:** Development Team  
**Reviewer:** Product Owner  
**Deadline:** TBD  
**Status:** 🔴 In Progress  

---

*Τελευταία ενημέρωση: 27/08/2025*
