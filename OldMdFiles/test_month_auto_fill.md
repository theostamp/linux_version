# 🧪 Test Guide: Αυτόματη Συμπλήρωση Μήνα στο Προηγμένο Υπολογιστή

## 🎯 Στόχος
Επιβεβαίωση ότι τα πεδία "Όνομα Περιόδου", "Ημερομηνία Έναρξης" και "Ημερομηνία Λήξης" στο προηγμένο υπολογιστή συμπληρώνονται αυτόματα με τον επιλεγμένο μήνα από το φίλτρο.

## 🚀 Βήματα Test

### 1. Εκκίνηση Συστημάτων
```bash
# Backend
cd backend && source venv/bin/activate
python manage.py runserver 0.0.0.0:8000

# Frontend
cd frontend
npm run dev
```

### 2. Πρόσβαση στη Σελίδα
```
http://demo.localhost:8080/financial?tab=calculator&building=2
```

### 3. Test Scenarios

#### ✅ Scenario 1: Αυτόματη Συμπλήρωση
1. **Επιλογή μήνα** από το φίλτρο "Φιλτράρισμα ανά μήνα"
2. **Μετάβαση** στην καρτέλα "Υπολογιστής Κοινοχρήστων"
3. **Έλεγχος** ότι τα πεδία συμπληρώθηκαν αυτόματα:
   - "Όνομα Περιόδου": Ιανουάριος 2024
   - "Ημερομηνία Έναρξης": 2024-01-01
   - "Ημερομηνία Λήξης": 2024-01-31

#### ✅ Scenario 2: Αλλαγή Μήνα
1. **Επιλογή διαφορετικού μήνα** από το φίλτρο
2. **Έλεγχος** ότι όλα τα πεδία ενημερώθηκαν αυτόματα:
   - "Όνομα Περιόδου" με νέο μήνα
   - "Ημερομηνία Έναρξης" με πρώτη ημέρα του μήνα
   - "Ημερομηνία Λήξης" με τελευταία ημέρα του μήνα

#### ✅ Scenario 3: Χειροκίνητη Επεξεργασία
1. **Επιλογή μήνα** από το φίλτρο
2. **Χειροκίνητη αλλαγή** οποιουδήποτε πεδίου (Όνομα Περιόδου, Ημερομηνία Έναρξης, Ημερομηνία Λήξης)
3. **Έλεγχος** ότι οι χειροκίνητες αλλαγές διατηρούνται

#### ✅ Scenario 4: Τρέχων Μήνας
1. **Κλικ** στο κουμπί "Τρέχων Μήνας"
2. **Έλεγχος** ότι όλα τα πεδία συμπληρώθηκαν με τον τρέχοντα μήνα:
   - "Όνομα Περιόδου" με τρέχοντα μήνα
   - "Ημερομηνία Έναρξης" με πρώτη ημέρα του τρέχοντος μήνα
   - "Ημερομηνία Λήξης" με τελευταία ημέρα του τρέχοντος μήνα

## 📊 Αναμενόμενα Αποτελέσματα

### ✅ Μορφή Πεδίων
- **Επιλεγμένος μήνας:** Ιανουάριος 2024
- **Πεδίο "Όνομα Περιόδου":** Ιανουάριος 2024
- **Πεδίο "Ημερομηνία Έναρξης":** 2024-01-01
- **Πεδίο "Ημερομηνία Λήξης":** 2024-01-31

### ✅ Συμπεριφορά
- **Αυτόματη συμπλήρωση** όλων των πεδίων όταν αλλάζει ο μήνας
- **Δυνατότητα χειροκίνητης αλλαγής** οποιουδήποτε πεδίου
- **Διατήρηση χειροκίνητων αλλαγών**
- **Άμεση λειτουργικότητα** του κουμπιού "Υπολογισμός"

## 🔧 Τεχνικές Λεπτομέρειες

### 📁 Αρχεία που Ενημερώθηκαν
- `frontend/components/financial/CommonExpenseCalculator.tsx`

### 🔄 Νέα Λειτουργικότητα
```typescript
// Helper function to convert YYYY-MM format to Greek month name
const formatSelectedMonth = (monthString: string) => {
  if (!monthString) return '';
  
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
};

// Helper function to get month start and end dates from YYYY-MM format
const getMonthDates = (monthString: string) => {
  if (!monthString) return { startDate: '', endDate: '' };
  
  const [year, month] = monthString.split('-');
  const yearNum = parseInt(year);
  const monthNum = parseInt(month) - 1; // JavaScript months are 0-based
  
  // First day of the month
  const firstDay = new Date(yearNum, monthNum, 1);
  // Last day of the month
  const lastDay = new Date(yearNum, monthNum + 1, 0);
  
  return {
    startDate: firstDay.toISOString().split('T')[0],
    endDate: lastDay.toISOString().split('T')[0]
  };
};

// Auto-fill period name and dates when selectedMonth changes
useEffect(() => {
  if (selectedMonth) {
    const formattedMonth = formatSelectedMonth(selectedMonth);
    const { startDate, endDate } = getMonthDates(selectedMonth);
    
    setPeriodName(formattedMonth);
    setStartDate(startDate);
    setEndDate(endDate);
  }
}, [selectedMonth]);
```

## 🎯 Success Criteria

### ✅ Βασική Λειτουργικότητα
- [ ] Αυτόματη συμπλήρωση όλων των πεδίων με επιλεγμένο μήνα
- [ ] Σωστή μορφή (π.χ. "Ιανουάριος 2024", "2024-01-01", "2024-01-31")
- [ ] Ενημέρωση όταν αλλάζει ο μήνας
- [ ] Άμεση λειτουργικότητα του κουμπιού "Υπολογισμός"

### ✅ UX Βελτιώσεις
- [ ] Χειροκίνητη επεξεργασία οποιουδήποτε πεδίου
- [ ] Διατήρηση χειροκίνητων αλλαγών
- [ ] Smooth transitions
- [ ] Άμεση λειτουργικότητα υπολογιστή

### ✅ Edge Cases
- [ ] Χωρίς επιλεγμένο μήνα
- [ ] Μη έγκυρη μορφή μήνα
- [ ] Τρέχων μήνας

## 🚀 Επόμενα Βήματα

### 📋 Μετά το Test
1. **Validation** των αποτελεσμάτων
2. **Feedback** από χρήστες
3. **Βελτιώσεις** αν χρειάζεται

### 🔄 Επέκταση
- **Validation** πεδίων
- **Auto-save** ρυθμίσεων
- **Custom date ranges** για ειδικές περιπτώσεις

---

**🎯 Η λειτουργικότητα είναι έτοιμη για testing!**
