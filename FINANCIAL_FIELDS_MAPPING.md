# Χαρτογράφηση Οικονομικών Πεδίων - Σύστημα Διαχείρισης Κτιρίων

## Επισκόπηση Συστήματος

Το σύστημα διαχείρισης κτιρίων χειρίζεται πολύπλοκα οικονομικά στοιχεία με πολλαπλές αλληλεπιδράσεις μεταξύ πληρωμών, εισπράξεων, δαπανών και υπολοίπων. Αυτή η χαρτογράφηση παρέχει έναν πλήρη κατάλογο των πεδίων και των σχέσεών τους για εντοπισμό πιθανών αστοχιών.

---

## 1. ΚΥΡΙΑ ΟΙΚΟΝΟΜΙΚΑ ΜΟΝΤΕΛΑ

### 1.1 Apartment (Διαμέρισμα)
**Πεδία που επηρεάζουν οικονομικούς υπολογισμούς:**
- `current_balance` (Decimal): Τρέχον υπόλοιπο διαμερίσματος
- `participation_mills` (Integer): Χιλιοστά συμμετοχής (συνολικό = 1000)
- `heating_mills` (Integer): Χιλιοστά θέρμανσης
- `elevator_mills` (Integer): Χιλιοστά ανελκυστήρα
- `owner_name` (String): Όνομα ιδιοκτήτη

### 1.2 Building (Κτίριο)
**Πεδία ρύθμισης οικονομικών:**
- `management_fee_per_apartment` (Decimal): Διαχειριστικά τέλη ανά διαμέρισμα
- `reserve_fund_goal` (Decimal): Στόχος αποθεματικού ταμείου
- `reserve_fund_duration_months` (Integer): Διάρκεια συλλογής αποθεματικού
- `reserve_fund_start_date` (Date): Ημερομηνία έναρξης συλλογής
- `reserve_contribution_per_apartment` (Decimal): Εισφορά ανά διαμέρισμα

### 1.3 Expense (Δαπάνη)
**Πεδία δαπανών:**
- `amount` (Decimal): Ποσό δαπάνης
- `date` (Date): Ημερομηνία δαπάνης
- `category` (String): Κατηγορία δαπάνης
- `expense_type` (String): Τύπος δαπάνης (regular, management_fee, reserve_fund, auto_generated)
- `distribution_type` (String): Τρόπος κατανομής (by_participation_mills, equal_share, specific_apartments, by_meters)

### 1.4 Payment (Είσπραξη)
**Πεδία εισπράξεων:**
- `amount` (Decimal): Συνολικό ποσό εισπράξεως
- `reserve_fund_amount` (Decimal): Ποσό για αποθεματικό
- `previous_obligations_amount` (Decimal): Ποσό για παλαιότερες οφειλές
- `date` (Date): Ημερομηνία εισπράξεως
- `payment_type` (String): Τύπος εισπράξεως (common_expense, reserve_fund, special_expense, advance, other)

### 1.5 Transaction (Κίνηση Ταμείου)
**Πεδία συναλλαγών:**
- `amount` (Decimal): Ποσό συναλλαγής
- `type` (String): Τύπος συναλλαγής
- `balance_before` (Decimal): Υπόλοιπο πριν
- `balance_after` (Decimal): Υπόλοιπο μετά
- `date` (DateTime): Ημερομηνία συναλλαγής

---

## 2. ΚΥΡΙΕΣ ΟΙΚΟΝΟΜΙΚΕΣ ΜΕΤΑΒΛΗΤΕΣ ΚΑΙ ΥΠΟΛΟΓΙΣΜΟΙ

### 2.1 Υπολοίπα Διαμερισμάτων

#### `current_balance` (Τρέχον Υπόλοιπο)
**Υπολογισμός:**
```
current_balance = Σ(πληρωμές) - Σ(χρεώσεις) + Σ(επιστροφές)
```

**Πηγές δεδομένων:**
- Πίνακας `Payment`: Όλες οι εισπράξεις
- Πίνακας `Transaction`: Όλες οι κινήσεις ταμείου
- Τύποι συναλλαγών που επηρεάζουν:
  - Χρεώσεις: `common_expense_charge`, `expense_created`, `expense_issued`, `interest_charge`, `penalty_charge`
  - Εισπράξεις: `common_expense_payment`, `payment_received`, `refund`

#### `previous_balance` (Προηγούμενο Υπόλοιπο)
**Χρήση:** Για "Παλαιότερες Οφειλές" στο φύλλο κοινοχρήστων
**Υπολογισμός:** Ιστορικό υπόλοιπο μέχρι συγκεκριμένη ημερομηνία

### 2.2 Μερίδια Κοινοχρήστων

#### `expense_share` (Μερίδιο Δαπανών)
**Υπολογισμός:**
```
expense_share = Σ(μερίδια δαπανών) + διαχειριστικά_τέλη + εισφορά_αποθεματικού
```

**Στοιχεία:**
- Μερίδια δαπανών ανά χιλιοστά συμμετοχής
- Διαχειριστικά τέλη ανά διαμέρισμα
- Εισφορά αποθεματικού ανά χιλιοστά

#### `net_obligation` (Καθαρή Οφειλή)
**Υπολογισμός:**
```
net_obligation = previous_balance + expense_share
```

**Χρήση:** Τελικό ποσό που οφείλει το διαμέρισμα

---

## 3. ΑΛΓΟΡΙΘΜΟΙ ΥΠΟΛΟΓΙΣΜΟΥ

### 3.1 CommonExpenseCalculator (Βασικός Υπολογιστής)

#### Κατανομή ανά Χιλιοστά (`by_participation_mills`)
```python
share_amount = (expense.amount * apartment.participation_mills) / total_mills
```

#### Κατανομή Ισόποσα (`equal_share`)
```python
share_per_apartment = expense.amount / apartments_count
```

#### Εισφορά Αποθεματικού
```python
monthly_target = reserve_fund_goal / reserve_fund_duration_months
reserve_share = (monthly_target * participation_mills) / total_mills
```

### 3.2 AdvancedCommonExpenseCalculator (Προηγμένος Υπολογιστής)

#### Κατηγορίες Δαπανών:
- **Γενικές δαπάνες:** Κατανομή ανά χιλιοστά συμμετοχής
- **Δαπάνες ανελκυστήρα:** Κατανομή ανά χιλιοστά ανελκυστήρα
- **Δαπάνες θέρμανσης:** Σύνθετος υπολογισμός (πάγιο + μεταβλητό)
- **Ισόποσες δαπάνες:** Κατανομή ισόποσα
- **Ατομικές δαπάνες:** Συγκεκριμένα διαμερίσματα

#### Υπολογισμός Θέρμανσης:
```python
fixed_cost = total_heating_cost * heating_fixed_percentage
variable_cost = (total_heating_cost - fixed_cost) * (apartment_consumption / total_consumption)
```

---

## 4. ΚΡΙΤΙΚΕΣ ΑΛΛΗΛΕΠΙΔΡΑΣΕΙΣ ΚΑΙ ΠΙΘΑΝΕΣ ΑΣΤΟΧΙΕΣ

### 4.1 Υπολογισμός Υπολοίπων

#### Πρόβλημα: Ασυμφωνία μεταξύ `current_balance` και ιστορικών υπολοίπων
**Συμπτώματα:**
- Διαφορά μεταξύ `apartment.current_balance` και υπολογισμένου ιστορικού υπολοίπου
- Λανθασμένα "Παλαιότερες Οφειλές" στο φύλλο κοινοχρήστων

**Εντοπισμός:**
```python
historical_balance = _get_historical_balance(apartment, end_date)
discrepancy = abs(apartment.current_balance - historical_balance)
if discrepancy > tolerance:
    # Πιθανή αστοχία
```

#### Πρόβλημα: Λανθασμένη χρήση πεδίων στο φύλλο κοινοχρήστων
**Συμπτώματα:**
- Χρήση `net_obligation` αντί για `previous_balance` για "Παλαιότερες Οφειλές"
- Χρήση `net_obligation` αντί για `expense_share` για "Ποσό Κοινόχρηστων"

### 4.2 Κατανομή Δαπανών

#### Πρόβλημα: Συνολικό χιλιοστά ≠ 1000
**Συμπτώματα:**
- Λανθασμένη κατανομή δαπανών
- Ασυμμετρική κατανομή αποθεματικού

**Εντοπισμός:**
```python
total_mills = sum(apt.participation_mills for apt in apartments)
if total_mills != 1000:
    # Πιθανή αστοχία
```

#### Πρόβλημα: Αποθεματικό με εκκρεμότητες
**Συμπτώματα:**
- Συλλογή αποθεματικού ενώ υπάρχουν οφειλές
- Λανθασμένος υπολογισμός προτεραιότητας

### 4.3 Χρονικές Ασυνέπειες

#### Πρόβλημα: Δαπάνες μελλοντικών ημερομηνιών
**Συμπτώματα:**
- Δαπάνες με ημερομηνία στο μέλλον
- Λανθασμένος υπολογισμός μηνιαίων δαπανών

#### Πρόβλημα: Εκκρεμείς συναλλαγές
**Συμπτώματα:**
- Συναλλαγές με status = 'pending'
- Ασυμφωνία υπολοίπων

---

## 5. ΕΛΕΓΧΟΙ ΕΠΙΚΥΡΩΣΗΣ

### 5.1 Ελέγχος Συνέπειας Υπολοίπων
```python
def verify_balance_consistency(building_id):
    apartments = Apartment.objects.filter(building_id=building_id)
    for apartment in apartments:
        calculated_balance = calculate_historical_balance(apartment)
        if abs(apartment.current_balance - calculated_balance) > 0.01:
            return False
    return True
```

### 5.2 Έλεγχος Χιλιοστών
```python
def verify_participation_mills(building_id):
    apartments = Apartment.objects.filter(building_id=building_id)
    total_mills = sum(apt.participation_mills or 0 for apt in apartments)
    return total_mills == 1000
```

### 5.3 Έλεγχος Αποθεματικού
```python
def verify_reserve_fund_logic(building_id):
    building = Building.objects.get(id=building_id)
    if building.reserve_fund_goal and building.reserve_fund_duration_months:
        monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
        # Έλεγχος αν υπάρχουν εκκρεμότητες
        total_obligations = sum(abs(apt.current_balance) for apt in apartments if apt.current_balance < 0)
        if total_obligations > 0:
            # Δεν πρέπει να συλλέγεται αποθεματικό
            return False
    return True
```

---

## 6. ΚΑΝΟΝΕΣ ΕΠΙΚΥΡΩΣΗΣ

### 6.1 Βασικοί Κανόνες
1. **Συνολικό χιλιοστά = 1000** για κάθε κτίριο
2. **Υπολοίπα = Σ(εισπράξεις) - Σ(χρεώσεις)**
3. **Αποθεματικό μόνο χωρίς εκκρεμότητες**
4. **Δαπάνες μόνο παρελθοντικές ημερομηνίες**

### 6.2 Κανόνες Φύλλου Κοινοχρήστων
1. **"Παλαιότερες Οφειλές" = previous_balance**
2. **"Ποσό Κοινόχρηστων" = expense_share**
3. **"Συνολική Οφειλή" = previous_balance + expense_share**

### 6.3 Κανόνες Αποθεματικού
1. **Συλλογή μόνο αν δεν υπάρχουν εκκρεμότητες**
2. **Κατανομή ανά χιλιοστά συμμετοχής**
3. **Μηνιαίος στόχος = στόχος / διάρκεια**

---

## 7. ΠΡΟΤΕΙΝΟΜΕΝΕΣ ΒΕΛΤΙΩΣΕΙΣ

### 7.1 Αυτοματοποιημένοι Έλεγχοι
- Επιβεβαίωση συνέπειας υπολοίπων κάθε νύχτα
- Έλεγχος χιλιοστών κατά τη δημιουργία διαμερισμάτων
- Επιβεβαίωση λογικής αποθεματικού

### 7.2 Βελτίωση Αλγορίθμων
- Προηγμένος υπολογιστής θέρμανσης με μετρητές
- Διαχείριση εκκρεμών συναλλαγών
- Αυτόματη διόρθωση ασυμφωνιών

### 7.3 Καλύτερη Τεκμηρίωση
- Σχόλια στον κώδικα για κάθε υπολογισμό
- Παραδείγματα χρήσης για κάθε πεδίο
- Οδηγίες επικύρωσης δεδομένων

---

## 8. ΣΥΜΠΕΡΑΣΜΑΤΑ

Η χαρτογράφηση αυτή παρέχει έναν πλήρη κατάλογο των οικονομικών πεδίων και των αλληλεπιδράσεών τους. Οι κύριες πηγές αστοχιών είναι:

1. **Ασυμφωνία υπολοίπων** μεταξύ υπολογισμένων και αποθηκευμένων
2. **Λανθασμένη χρήση πεδίων** στο φύλλο κοινοχρήστων
3. **Ασυνέπεια χιλιοστών** συμμετοχής
4. **Λανθασμένη λογική αποθεματικού**

Η εφαρμογή αυτών των κανόνων επικύρωσης θα βελτιώσει σημαντικά την αξιοπιστία του συστήματος.
