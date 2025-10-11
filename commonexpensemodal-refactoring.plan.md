# Αναδιάρθρωση "Φύλλο Κοινοχρήστων" (CommonExpenseModal)

## 🎯 Κεντρικός Στόχος

Αναδιάρθρωση του "Φύλλο Κοινοχρήστων" Calculator για να εμφανίζει σωστά τον διαχωρισμό χρεώσεων ιδιοκτήτη/ενοίκου και να έχει επαγγελματικό header εκτύπωσης, όπως το PaymentNotificationModal.

---

## 📋 Τρέχουσα Κατάσταση

- Ο πίνακας έχει ήδη στήλη "ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ" αλλά εμφανίζει μόνο "-"
- Τα δεδομένα δεν διαχωρίζουν τις δαπάνες ανά `payer_responsibility`
- Το header για εκτύπωση χρειάζεται αισθητική αναβάθμιση

---

## 🗺️ Σχέδιο Αναδιάρθρωσης

### **Φάση 1: Backend - Εμπλουτισμός Δεδομένων**

**Στόχος:** Εξασφάλιση ότι το backend στέλνει `payer_responsibility` για κάθε δαπάνη

**Αρχεία:**
- `linux_version/backend/financial/views.py` (endpoint: `apartment_obligations`)
- ή χρήση του ήδη ενημερωμένου `apartment_balances` endpoint

**Ενέργειες:**
1. Επαλήθευση ότι το `expense_breakdown` που επιστρέφεται περιέχει `payer_responsibility`
2. Αν χρειάζεται, ενημέρωση του endpoint για να περιλαμβάνει αυτό το πεδίο

---

### **Φάση 2: Frontend Types - Ενημέρωση Interfaces**

**Αρχεία:**
- `linux_version/frontend/components/financial/calculator/types/financial.ts`
- `linux_version/frontend/hooks/useMonthlyExpenses.ts`

**Ενέργειες:**
1. Ενημέρωση `ExpenseBreakdownItem` interface:
   ```typescript
   interface ExpenseBreakdownItem {
     category: string;
     category_display: string;
     amount: number;
     payer_responsibility: 'owner' | 'resident' | 'shared';  // ΝΕΟ
   }
   ```

---

### **Φάση 3: Πίνακας - Σωστή Κατανομή Δαπανών**

**Αρχείο:** `linux_version/frontend/components/financial/calculator/components/ApartmentExpenseTable.tsx`

**Τρέχουσα Κατάσταση (γραμμή 90):**
```typescript
{showOwnerExpenses && (<><TableCell>-</TableCell><TableCell>-</TableCell><TableCell>-</TableCell></>)}
```

**Νέα Λογική:**
1. Υπολογισμός δαπανών ανά διαμέρισμα με βάση `payer_responsibility`
2. Κατανομή σε:
   - **Δαπάνες Ενοικιαστών:** `payer_responsibility === 'resident'` ή `'shared'`
   - **Δαπάνες Ιδιοκτητών:** `payer_responsibility === 'owner'`

**Στήλες Δαπανών Ενοικιαστών:**
- Κοινόχρηστα (resident expenses)
- Ανελκυστήρας (resident expenses)
- Θέρμανση (resident expenses)  
- Κόστος Διαχείρισης (resident expenses)

**Στήλες Δαπανών Ιδιοκτητών:**
- Κοινόχρηστα Ιδιοκτήτη (owner expenses)
- Ανελκυστήρας Ιδιοκτήτη (owner expenses)
- Θέρμανση Ιδιοκτήτη (owner expenses)

---

### **Φάση 4: Header - Αισθητική Αναβάθμιση**

**Αρχεία:**
- `linux_version/frontend/components/financial/calculator/utils/pdfGenerator.ts`
- `linux_version/frontend/components/financial/calculator/utils/jpgGenerator.ts`
- `linux_version/frontend/components/financial/calculator/ResultsStep.tsx`

**Νέο Header Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🏢 Logo + Γραφείο  │  ΦΥΛΛΟ ΚΟΙΝΟΧΡΗΣΤΩΝ  │  Πληρωτέο έως: │
│    + Στοιχεία      │    Οκτώβριος 2025     │   10/11/2025   │
└─────────────────────────────────────────────────────────────────────┘
```

**Styling:**
- Οριζόντια διάταξη με Flexbox
- 3 τμήματα: Γραφείο (αριστερά) | Τίτλος (κέντρο) | Λήξη (δεξιά)
- Uppercase για τίτλο
- Χρωματική κωδικοποίηση

---

### **Φάση 5: TraditionalViewTab - Αναβάθμιση UI**

**Αρχείο:** `linux_version/frontend/components/financial/calculator/tabs/TraditionalViewTab.tsx`

**Ενέργειες:**
1. Ενημέρωση των info cards με νέο styling (όπως στο PaymentNotificationModal)
2. Πιθανή αφαίρεση περιττών ενοτήτων (αν υπάρχουν)
3. Καλύτερη διάταξη για εκτύπωση

---

## 📊 Κριτήρια Ολοκλήρωσης

✅ Το backend επιστρέφει `payer_responsibility` για κάθε δαπάνη  
✅ Οι στήλες "Δαπάνες Ιδιοκτητών" εμφανίζουν πραγματικά ποσά  
✅ Ο διαχωρισμός ενοίκου/ιδιοκτήτη είναι σωστός  
✅ Το header είναι σε οριζόντια διάταξη  
✅ Η εκτύπωση είναι επαγγελματική  
✅ Δεν υπάρχουν linter errors  

---

## 🔧 Υλοποίηση

### To-dos

- [x] Backend: Επαλήθευση/Ενημέρωση endpoint για payer_responsibility (commit: 0a8f23b7)
- [x] Frontend: Ενημέρωση types (ExpenseBreakdownItem) (commit: 0a8f23b7)
- [x] CommonExpenseModal: Νέο print header σε οριζόντια διάταξη (commit: 2dc3dd3a)
- [x] CommonExpenseModal: Νέο screen header σε οριζόντια διάταξη (commit: 7bc0c394)
- [x] TraditionalViewTab: Απόκρυψη Τραπεζικών Στοιχείων από screen (commit: 2dc3dd3a)
- [x] TraditionalViewTab: Αφαίρεση ΛΗΞΗ ΠΛΗΡΩΜΗΣ & επικεφαλίδας (commit: c87dc26b, ed7aafc3)
- [x] CommonExpenseModal: Κουμπί Εξαγωγής στο header (commit: cca7e699)
- [x] ApartmentExpenseTable: Αφαίρεση στηλών χιλιοστών (commit: 460a7d7e)
- [x] ApartmentExpenseTable: Προσθήκη στήλης ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ (commit: 460a7d7e)
- [ ] PDF/JPG Generator: Νέο header layout (προαιρετικό)
- [ ] ResultsStep: Νέο header layout (προαιρετικό)
- [x] Testing: Βασική επαλήθευση (no linter errors)

---

## ✅ Ολοκληρωμένα (Μέχρι Τώρα)

1. **Backend Service (services.py):**
   - ✅ Η μέθοδος `get_expense_breakdown` τώρα επιστρέφει `payer_responsibility`
   - ✅ Group by γίνεται σε category ΚΑΙ payer_responsibility

2. **Frontend Types (useMonthlyExpenses.ts):**
   - ✅ Το `ExpenseBreakdownItem` interface περιλαμβάνει `payer_responsibility`

3. **CommonExpenseModal UI (commit: 2dc3dd3a):**
   - ✅ Νέο print-only header σε οριζόντια διάταξη
   - ✅ 3 τμήματα: Γραφείο | Τίτλος/Περίοδος | Ημερομηνία Λήξης
   - ✅ Uppercase styling με tracking-wide
   - ✅ Tabs navigation κρυμμένα στην εκτύπωση

4. **TraditionalViewTab (commits: 2dc3dd3a, c87dc26b, ed7aafc3):**
   - ✅ Τραπεζικά Στοιχεία εμφανίζονται μόνο στην εκτύπωση (hidden print:block)
   - ✅ Αφαιρέθηκε card "ΛΗΞΗ ΠΛΗΡΩΜΗΣ"
   - ✅ Αφαιρέθηκε επικεφαλίδα "ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ"
   - ✅ Αφαιρέθηκε κουμπί "Έλεγχος Δεδομένων"

5. **ApartmentExpenseTable (commit: 460a7d7e):**
   - ✅ Αφαιρέθηκαν 3 στήλες "ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ"
   - ✅ Προστέθηκε στήλη "ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ" (πράσινο header)
   - ✅ Υπολογισμός owner_expenses από backend data
   - ✅ Ενημέρωση γραμμής ΣΥΝΟΛΑ με σωστά cells

6. **CommonExpenseModal Header (commit: cca7e699):**
   - ✅ Κουμπί "Εξαγωγή" JPG στο header για άμεση πρόσβαση

---

## 🎉 ΟΛΟΚΛΗΡΩΘΗΚΕ ΕΠΙΤΥΧΩΣ!

Όλες οι κύριες αλλαγές έχουν υλοποιηθεί και commit!

### 📊 Τελικός Πίνακας:

**Πριν:**
```
Α/Δ | ΟΝΟΜΑΤΕΠΩΝΥΜΟ | ΟΦΕΙΛΕΣ | 
ΧΙΛΙΟΣΤΑ (3 στήλες) | 
ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ (4 στήλες) | 
ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ (3 στήλες με "-") | 
ΑΠΟΘΕΜΑΤΙΚΟ | ΠΛΗΡΩΤΕΟ
```

**Μετά:**
```
Α/Δ | ΟΝΟΜΑΤΕΠΩΝΥΜΟ | ΟΦΕΙΛΕΣ | 
ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ (4 στήλες) | 
ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ (1 στήλη με πραγματικά ποσά) | 
ΑΠΟΘΕΜΑΤΙΚΟ | ΠΛΗΡΩΤΕΟ
```

**Κέρδη:**
- ✅ 3 λιγότερες στήλες (χιλιοστά)
- ✅ Σαφής εμφάνιση δαπανών ιδιοκτητών
- ✅ Καθαρότερος και πιο readable πίνακας

---

## 📝 Σημειώσεις

- Το `useMonthlyExpenses` hook ήδη φέρνει δεδομένα από το API
- Πρέπει να διατηρηθεί η υπάρχουσα λογικότητα των χιλιοστών και κατανομών
- Το ApartmentExpenseTable είναι πολυπλοκότερο από το PaymentNotificationModal table

