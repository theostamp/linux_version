# 🏗️ Λογικό Διάγραμμα Ροής & Δομής - Οικονομική Διαχείριση

## 📋 Επισκόπηση Συστήματος

Το σύστημα οικονομικής διαχείρισης βασίζεται σε **τρεις βασικούς πυλώνες** που σχηματίζουν ένα κλειστό κύκλο διαχείρισης:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ΟΙΚΟΝΟΜΙΚΗ ΔΙΑΧΕΙΡΙΣΗ                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   ΠΥΛΩΝΑΣ 1 │    │   ΠΥΛΩΝΑΣ 2 │    │   ΠΥΛΩΝΑΣ 3 │         │
│  │Καταχώρηση   │───▶│Υπολογισμός &│───▶│Διαχείριση   │         │
│  │Δαπανών      │    │Έκδοση       │    │Αποθεματικού │         │
│  │("Εισροή")   │    │Κοινοχρήστων │    │& Πληρωμών   │         │
│  │             │    │("Επεξεργασία")│   │("Εικόνα")   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         ▲                                     │                 │
│         │                                     │                 │
│         └─────────────────────────────────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 ΠΥΛΩΝΑΣ 1: Καταχώρηση Δαπανών ("Εισροή")

### 📱 Οθόνη: "Νέα Δαπάνη"

#### Φόρμα Καταχώρησης
```typescript
interface ExpenseForm {
  title: string;           // Τίτλος Δαπάνης
  amount: number;          // Ποσό (€)
  date: Date;             // Ημερομηνία
  category: ExpenseCategory; // Κατηγορία Δαπάνης
  distributionType: DistributionType; // Τρόπος Κατανομής
  attachment?: File;       // Επισύναψη Παραστατικού
  notes?: string;          // Σημειώσεις
  affectedApartments?: number[]; // Ειδικές περιπτώσεις
}
```

#### Κατηγορίες Δαπανών (Προκαθορισμένες)
```typescript
enum ExpenseCategory {
  // Πάγιες Δαπάνες Κοινοχρήστων
  CLEANING = "cleaning",                           // Καθαρισμός Κοινοχρήστων Χώρων
  ELECTRICITY_COMMON = "electricity_common",       // ΔΕΗ Κοινοχρήστων
  WATER_COMMON = "water_common",                   // Νερό Κοινοχρήστων
  GARBAGE_COLLECTION = "garbage_collection",       // Συλλογή Απορριμμάτων
  SECURITY = "security",                           // Ασφάλεια Κτιρίου
  CONCIERGE = "concierge",                         // Συνεργείο Καθαρισμού
  
  // Δαπάνες Ανελκυστήρα
  ELEVATOR_MAINTENANCE = "elevator_maintenance",   // Ετήσια Συντήρηση Ανελκυστήρα
  ELEVATOR_REPAIR = "elevator_repair",             // Επισκευή Ανελκυστήρα
  ELEVATOR_INSPECTION = "elevator_inspection",     // Επιθεώρηση Ανελκυστήρα
  ELEVATOR_MODERNIZATION = "elevator_modernization", // Αναβάθμιση Ανελκυστήρα
  
  // Δαπάνες Θέρμανσης
  HEATING_FUEL = "heating_fuel",                   // Πετρέλαιο Θέρμανσης
  HEATING_GAS = "heating_gas",                     // Φυσικό Αέριο Θέρμανσης
  HEATING_MAINTENANCE = "heating_maintenance",     // Συντήρηση Καυστήρα
  HEATING_REPAIR = "heating_repair",               // Επισκευή Θερμαντικών
  HEATING_INSPECTION = "heating_inspection",       // Επιθεώρηση Θερμαντικών
  HEATING_MODERNIZATION = "heating_modernization", // Αναβάθμιση Θερμαντικών
  
  // Δαπάνες Ηλεκτρικών Εγκαταστάσεων
  ELECTRICAL_MAINTENANCE = "electrical_maintenance", // Συντήρηση Ηλεκτρικών
  ELECTRICAL_REPAIR = "electrical_repair",         // Επισκευή Ηλεκτρικών
  ELECTRICAL_UPGRADE = "electrical_upgrade",       // Αναβάθμιση Ηλεκτρικών
  LIGHTING_COMMON = "lighting_common",             // Φωτισμός Κοινοχρήστων
  INTERCOM_SYSTEM = "intercom_system",             // Σύστημα Εσωτερικής Επικοινωνίας
  
  // Δαπάνες Υδραυλικών Εγκαταστάσεων
  PLUMBING_MAINTENANCE = "plumbing_maintenance",   // Συντήρηση Υδραυλικών
  PLUMBING_REPAIR = "plumbing_repair",             // Επισκευή Υδραυλικών
  WATER_TANK_CLEANING = "water_tank_cleaning",     // Καθαρισμός Δεξαμενής Νερού
  WATER_TANK_MAINTENANCE = "water_tank_maintenance", // Συντήρηση Δεξαμενής Νερού
  SEWAGE_SYSTEM = "sewage_system",                 // Σύστημα Αποχέτευσης
  
  // Δαπάνες Κτιρίου & Εξωτερικών Χώρων
  BUILDING_INSURANCE = "building_insurance",       // Ασφάλεια Κτιρίου
  BUILDING_MAINTENANCE = "building_maintenance",   // Συντήρηση Κτιρίου
  ROOF_MAINTENANCE = "roof_maintenance",           // Συντήρηση Στέγης
  ROOF_REPAIR = "roof_repair",                     // Επισκευή Στέγης
  FACADE_MAINTENANCE = "facade_maintenance",       // Συντήρηση Πρόσοψης
  FACADE_REPAIR = "facade_repair",                 // Επισκευή Πρόσοψης
  PAINTING_EXTERIOR = "painting_exterior",         // Βαψίματα Εξωτερικών
  PAINTING_INTERIOR = "painting_interior",         // Βαψίματα Εσωτερικών Κοινοχρήστων
  GARDEN_MAINTENANCE = "garden_maintenance",       // Συντήρηση Κήπου
  PARKING_MAINTENANCE = "parking_maintenance",     // Συντήρηση Χώρων Στάθμευσης
  ENTRANCE_MAINTENANCE = "entrance_maintenance",   // Συντήρηση Εισόδου
  
  // Έκτακτες Δαπάνες & Επισκευές
  EMERGENCY_REPAIR = "emergency_repair",           // Έκτακτη Επισκευή
  STORM_DAMAGE = "storm_damage",                   // Ζημιές από Κακοκαιρία
  FLOOD_DAMAGE = "flood_damage",                   // Ζημιές από Πλημμύρα
  FIRE_DAMAGE = "fire_damage",                     // Ζημιές από Πυρκαγιά
  EARTHQUAKE_DAMAGE = "earthquake_damage",         // Ζημιές από Σεισμό
  VANDALISM_REPAIR = "vandalism_repair",           // Επισκευή Βανδαλισμών
  
  // Ειδικές Επισκευές
  LOCKSMITH = "locksmith",                         // Κλειδαράς
  GLASS_REPAIR = "glass_repair",                   // Επισκευή Γυαλιών
  DOOR_REPAIR = "door_repair",                     // Επισκευή Πόρτας
  WINDOW_REPAIR = "window_repair",                 // Επισκευή Παραθύρων
  BALCONY_REPAIR = "balcony_repair",               // Επισκευή Μπαλκονιού
  STAIRCASE_REPAIR = "staircase_repair",           // Επισκευή Σκάλας
  
  // Δαπάνες Ασφάλειας & Πρόσβασης
  SECURITY_SYSTEM = "security_system",             // Σύστημα Ασφάλειας
  CCTV_INSTALLATION = "cctv_installation",         // Εγκατάσταση CCTV
  ACCESS_CONTROL = "access_control",               // Σύστημα Ελέγχου Πρόσβασης
  FIRE_ALARM = "fire_alarm",                       // Σύστημα Πυρασφάλειας
  FIRE_EXTINGUISHERS = "fire_extinguishers",       // Πυροσβεστήρες
  
  // Δαπάνες Διοικητικές & Νομικές
  LEGAL_FEES = "legal_fees",                       // Δικαστικά Έξοδα
  NOTARY_FEES = "notary_fees",                     // Συμβολαιογραφικά Έξοδα
  SURVEYOR_FEES = "surveyor_fees",                 // Εκτιμητής
  ARCHITECT_FEES = "architect_fees",               // Αρχιτέκτονας
  ENGINEER_FEES = "engineer_fees",                 // Μηχανικός
  ACCOUNTING_FEES = "accounting_fees",             // Λογιστικά Έξοδα
  MANAGEMENT_FEES = "management_fees",             // Διοικητικά Έξοδα
  
  // Δαπάνες Ειδικών Εργασιών
  ASBESTOS_REMOVAL = "asbestos_removal",           // Αφαίρεση Ασβέστη
  LEAD_PAINT_REMOVAL = "lead_paint_removal",       // Αφαίρεση Μολύβδου
  MOLD_REMOVAL = "mold_removal",                   // Αφαίρεση Μούχλας
  PEST_CONTROL = "pest_control",                   // Εντομοκτονία
  TREE_TRIMMING = "tree_trimming",                 // Κλάδεμα Δέντρων
  SNOW_REMOVAL = "snow_removal",                   // Καθαρισμός Χιονιού
  
  // Δαπάνες Ενεργειακής Απόδοσης
  ENERGY_UPGRADE = "energy_upgrade",               // Ενεργειακή Αναβάθμιση
  INSULATION_WORK = "insulation_work",             // Θερμομόνωση
  SOLAR_PANEL_INSTALLATION = "solar_panel_installation", // Εγκατάσταση Φωτοβολταϊκών
  LED_LIGHTING = "led_lighting",                   // Αντικατάσταση με LED
  SMART_SYSTEMS = "smart_systems",                 // Έξυπνα Συστήματα
  
  // Δαπάνες Ιδιοκτητών
  SPECIAL_CONTRIBUTION = "special_contribution",   // Έκτακτη Εισφορά
  RESERVE_FUND = "reserve_fund",                   // Αποθεματικό Ταμείο
  EMERGENCY_FUND = "emergency_fund",               // Ταμείο Έκτακτης Ανάγκης
  RENOVATION_FUND = "renovation_fund",             // Ταμείο Ανακαίνισης
  
  // Άλλες Δαπάνες
  MISCELLANEOUS = "miscellaneous",                 // Διάφορες Δαπάνες
  CONSULTING_FEES = "consulting_fees",             // Εργασίες Συμβούλου
  PERMITS_LICENSES = "permits_licenses",           // Άδειες & Αποδοχές
  TAXES_FEES = "taxes_fees",                       // Φόροι & Τέλη
  UTILITIES_OTHER = "utilities_other"              // Άλλες Κοινόχρηστες Υπηρεσίες
}
```

#### Τρόποι Κατανομής
```typescript
enum DistributionType {
  BY_PARTICIPATION_MILLS = "by_participation_mills", // Ανά Χιλιοστά (default)
  EQUAL_SHARE = "equal_share",             // Ισόποσα σε όλα τα διαμερίσματα
  SPECIFIC_APARTMENTS = "specific_apartments", // Μόνο σε συγκεκριμένα
  BY_METERS = "by_meters"                  // Με βάση μετρητές
}
```

#### Λογική Ροής
```
1. Διαχειριστής ανοίγει "Νέα Δαπάνη"
2. Συμπληρώνει βασικά πεδία (τίτλος, ποσό, ημερομηνία)
3. Επιλέγει κατηγορία → Αυτόματη πρόταση τρόπου κατανομής
4. Επιβεβαιώνει/αλλάζει τρόπο κατανομής
5. Προσθέτει επισύναψη (προαιρετικό)
6. Αποθηκεύει → Μεταφέρεται σε "Ανέκδοτες Δαπάνες"
```

---

## ⚙️ ΠΥΛΩΝΑΣ 2: Υπολογισμός & Έκδοση Κοινοχρήστων ("Επεξεργασία")

### 📱 Οθόνη: "Έκδοση Κοινοχρήστων"

#### Διαδικασία Έκδοσης
```typescript
interface CommonExpenseIssue {
  period: string;          // "Ιούλιος 2024"
  pendingExpenses: Expense[]; // Ανέκδοτες Δαπάνες
  meterReadings?: MeterReading[]; // Μετρήσεις (αν χρειάζεται)
  calculatedShares: ApartmentShare[]; // Υπολογισμένα μερίδια
  totalAmount: number;     // Συνολικό ποσό
}
```

#### Υπολογισμός Μεριδίων
```typescript
interface ApartmentShare {
  apartmentId: number;
  apartmentNumber: string;
  participationMills: number;  // Χιλιοστά συμμετοχής
  calculatedAmount: number;    // Υπολογισμένο ποσό
  previousBalance: number;     // Προηγούμενη οφειλή
  totalDue: number;           // Συνολικό οφειλόμενο
  distributionBreakdown: ExpenseBreakdown[]; // Ανάλυση ανά δαπάνη
}

interface ExpenseBreakdown {
  expenseId: number;
  expenseTitle: string;
  expenseAmount: number;
  apartmentShare: number;
  distributionType: DistributionType;
}
```

#### Αλγόριθμος Υπολογισμού
```python
def calculate_apartment_shares(expenses, apartments, meter_readings=None):
    """
    Υπολογισμός μεριδίων για κάθε διαμέρισμα
    """
    shares = {}
    
    for apartment in apartments:
        shares[apartment.id] = {
            'total_amount': 0,
            'breakdown': [],
            'previous_balance': apartment.current_balance
        }
    
    for expense in expenses:
        if expense.distribution_type == DistributionType.BY_PARTICIPATION_MILLS:
            # Κατανομή ανά χιλιοστά συμμετοχής
            total_mills = sum(apt.participation_mills for apt in apartments)
            for apartment in apartments:
                share = (expense.amount * apartment.participation_mills) / total_mills
                shares[apartment.id]['total_amount'] += share
                shares[apartment.id]['breakdown'].append({
                    'expense_id': expense.id,
                    'amount': share
                })
        
        elif expense.distribution_type == DistributionType.EQUAL_SHARE:
            # Ισόποσα σε όλα τα διαμερίσματα
            share_per_apartment = expense.amount / len(apartments)
            for apartment in apartments:
                shares[apartment.id]['total_amount'] += share_per_apartment
                shares[apartment.id]['breakdown'].append({
                    'expense_id': expense.id,
                    'amount': share_per_apartment
                })
        
        elif expense.distribution_type == DistributionType.BY_METERS:
            # Με βάση μετρητές (για θέρμανση)
            if meter_readings:
                total_consumption = sum(meter.value for meter in meter_readings)
                for apartment in apartments:
                    apartment_meter = next(m for m in meter_readings if m.apartment_id == apartment.id)
                    share = (expense.amount * apartment_meter.value) / total_consumption
                    shares[apartment.id]['total_amount'] += share
                    shares[apartment.id]['breakdown'].append({
                        'expense_id': expense.id,
                        'amount': share
                    })
    
    return shares
```

#### Λογική Ροής Έκδοσης
```
1. Επιλογή Περιόδου
   ↓
2. Επισκόπηση Ανέκδοτων Δαπανών
   ↓
3. Εισαγωγή Μετρήσεων (αν χρειάζεται)
   ↓
4. Υπολογισμός Μεριδίων
   ↓
5. Προεπισκόπηση Αποτελεσμάτων
   ↓
6. Οριστική Έκδοση & Αποστολή
   ↓
7. Ενημέρωση Οφειλών & Μεταφορά σε "Εκδοθείσες"
```

---

## 📊 ΠΥΛΩΝΑΣ 3: Διαχείριση Αποθεματικού & Πληρωμών ("Εικόνα")

### 📱 Κεντρική Οθόνη (Dashboard)

#### Βασικά Μετρικά
```typescript
interface FinancialDashboard {
  currentReserve: number;      // Τρέχον Αποθεματικό (€)
  totalObligations: number;    // Συνολικές Οφειλές (€)
  cashFlow: CashFlowData[];    // Γράφημα Ταμειακής Ροής
  recentTransactions: Transaction[]; // Πρόσφατες Κινήσεις
  apartmentBalances: ApartmentBalance[]; // Κατάσταση Οφειλών
}

interface CashFlowData {
  date: string;
  income: number;    // Εισπράξεις
  expenses: number;  // Πληρωμές
  balance: number;   // Υπόλοιπο
}
```

#### Οθόνη: "Κινήσεις Ταμείου"
```typescript
interface Transaction {
  id: number;
  date: Date;
  type: TransactionType;
  description: string;
  apartmentNumber?: string;
  amount: number;
  balanceAfter: number;
  receipt?: string;
}

enum TransactionType {
  COMMON_EXPENSE_PAYMENT = "common_expense_payment", // Πληρωμή Κοινοχρήστων
  EXPENSE_PAYMENT = "expense_payment",               // Πληρωμή Δαπάνης
  SPECIAL_PAYMENT = "special_payment",              // Ειδική Πληρωμή
  REFUND = "refund"                                 // Επιστροφή
}
```

#### Οθόνη: "Κατάσταση Οφειλών"
```typescript
interface ApartmentBalance {
  apartmentId: number;
  apartmentNumber: string;
  ownerName: string;
  currentBalance: number;      // + = πιστωτικό, - = οφειλή
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  paymentHistory: Payment[];
}
```

### 💰 Καταχώρηση Πληρωμής

#### Φόρμα Πληρωμής
```typescript
interface PaymentForm {
  apartmentId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  receipt?: File;
  notes?: string;
}

enum PaymentMethod {
  CASH = "cash",
  BANK_TRANSFER = "bank_transfer",
  CHECK = "check",
  CARD = "card"
}
```

#### Λογική Επεξεργασίας Πληρωμής
```python
def process_payment(payment_data):
    """
    Επεξεργασία πληρωμής και ενημέρωση συστήματος
    """
    # 1. Ενημέρωση υπόλοιπου διαμερίσματος
    apartment = Apartment.objects.get(id=payment_data.apartment_id)
    apartment.current_balance += payment_data.amount
    apartment.save()
    
    # 2. Προσθήκη στο τρέχον αποθεματικό
    building = apartment.building
    building.current_reserve += payment_data.amount
    building.save()
    
    # 3. Δημιουργία εγγραφής κίνησης
    transaction = Transaction.objects.create(
        date=payment_data.payment_date,
        type=TransactionType.COMMON_EXPENSE_PAYMENT,
        description=f"Πληρωμή Κοινοχρήστων - {apartment.number}",
        apartment_number=apartment.number,
        amount=payment_data.amount,
        balance_after=building.current_reserve,
        receipt=payment_data.receipt
    )
    
    # 4. Ενημέρωση ιστορικού πληρωμών
    Payment.objects.create(
        apartment=apartment,
        amount=payment_data.amount,
        date=payment_data.payment_date,
        method=payment_data.payment_method,
        notes=payment_data.notes
    )
    
    return transaction
```

---

## 🗄️ Δομή Βάσης Δεδομένων

### Βασικές Οντότητες
```sql
-- Κτίρια
CREATE TABLE buildings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    address TEXT,
    current_reserve DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Διαμερίσματα
CREATE TABLE apartments (
    id SERIAL PRIMARY KEY,
    building_id INTEGER REFERENCES buildings(id),
    number VARCHAR(50),
    owner_name VARCHAR(255),
    participation_mills INTEGER,
    current_balance DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Δαπάνες
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    building_id INTEGER REFERENCES buildings(id),
    title VARCHAR(255),
    amount DECIMAL(10,2),
    date DATE,
    category VARCHAR(100),
    distribution_type VARCHAR(50),
    attachment_url VARCHAR(500),
    notes TEXT,
    is_issued BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Συναφείς Διαμερίσματα (για ειδικές κατανομές)
CREATE TABLE expense_apartments (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    apartment_id INTEGER REFERENCES apartments(id)
);

-- Μετρήσεις (για θέρμανση)
CREATE TABLE meter_readings (
    id SERIAL PRIMARY KEY,
    apartment_id INTEGER REFERENCES apartments(id),
    reading_date DATE,
    value DECIMAL(10,2),
    meter_type VARCHAR(50)
);

-- Κινήσεις Ταμείου
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    building_id INTEGER REFERENCES buildings(id),
    date TIMESTAMP,
    type VARCHAR(50),
    description TEXT,
    apartment_number VARCHAR(50),
    amount DECIMAL(10,2),
    balance_after DECIMAL(10,2),
    receipt_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Πληρωμές
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    apartment_id INTEGER REFERENCES apartments(id),
    amount DECIMAL(10,2),
    date DATE,
    method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔄 Ροή Δεδομένων

### Διάγραμμα Ροής
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ΔΑΠΑΝΕΣ      │    │   ΥΠΟΛΟΓΙΣΜΟΙ   │    │   ΠΛΗΡΩΜΕΣ     │
│                 │    │                 │    │                 │
│ • Καταχώρηση    │───▶│ • Αυτόματος     │───▶│ • Ενημέρωση    │
│ • Κατηγοριοποίηση│   │ • Κατανομή      │    │ • Υπόλοιπα     │
│ • Επισύναψη     │    │ • Μερίδια       │    │ • Ιστορικό     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ΑΝΕΚΔΟΤΕΣ     │    │   ΕΚΔΟΘΕΙΣΕΣ    │    │   ΑΠΟΘΕΜΑΤΙΚΟ   │
│   ΔΑΠΑΝΕΣ       │    │   ΔΑΠΑΝΕΣ       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### API Endpoints
```typescript
// Πυλώνας 1: Καταχώρηση Δαπανών
POST   /api/expenses/                    // Νέα δαπάνη
GET    /api/expenses/pending/            // Ανέκδοτες δαπάνες
PUT    /api/expenses/:id                 // Επεξεργασία δαπάνης
DELETE /api/expenses/:id                 // Διαγραφή δαπάνης

// Πυλώνας 2: Υπολογισμός & Έκδοση
POST   /api/common-expenses/calculate/   // Υπολογισμός μεριδίων
POST   /api/common-expenses/issue/       // Έκδοση κοινοχρήστων
GET    /api/common-expenses/:period      // Προεπισκόπηση

// Πυλώνας 3: Διαχείριση Αποθεματικού
GET    /api/financial/dashboard/         // Κεντρική οθόνη
GET    /api/financial/transactions/      // Κινήσεις ταμείου
GET    /api/financial/apartments/        // Κατάσταση οφειλών
POST   /api/financial/payments/          // Καταχώρηση πληρωμής
```

---

## 🎨 Αρχιτεκτονική Frontend

### Component Structure
```
src/
├── components/
│   ├── financial/
│   │   ├── ExpenseForm.tsx              // Φόρμα νέας δαπάνης
│   │   ├── ExpenseList.tsx              // Λίστα δαπανών
│   │   ├── CommonExpenseCalculator.tsx  // Υπολογισμός κοινοχρήστων
│   │   ├── PaymentForm.tsx              // Φόρμα πληρωμής
│   │   ├── FinancialDashboard.tsx       // Κεντρική οθόνη
│   │   ├── TransactionHistory.tsx       // Ιστορικό κινήσεων
│   │   └── ApartmentBalances.tsx        // Κατάσταση οφειλών
│   └── ui/
│       ├── CategorySelector.tsx         // Επιλογή κατηγορίας
│       ├── DistributionSelector.tsx     // Επιλογή κατανομής
│       └── FileUpload.tsx               // Επισύναψη αρχείων
├── hooks/
│   ├── useExpenses.ts                   // Διαχείριση δαπανών
│   ├── useCommonExpenses.ts             // Διαχείριση κοινοχρήστων
│   └── usePayments.ts                   // Διαχείριση πληρωμών
└── types/
    └── financial.ts                     // Τύποι οικονομικών
```

---

## 🔒 Ασφάλεια & Επιθεώρηση

### Audit Trail
```typescript
interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  old_values?: any;
  new_values?: any;
  timestamp: Date;
  ip_address: string;
}
```

### Επιθεώρηση Δεδομένων
- **Διαφάνεια**: Όλες οι κινήσεις είναι ορατές σε όλους τους χρήστες
- **Ιστορικό**: Πλήρες ιστορικό όλων των λειτουργιών
- **Αναφορά**: Αυτόματη δημιουργία αναφορών για επιθεώρηση
- **Εξαγωγή**: Δυνατότητα εξαγωγής δεδομένων σε PDF/Excel

---

## 🚀 Εφαρμογή & Ανάπτυξη

### Προτεραιότητες Ανάπτυξης
1. **Πυλώνας 1**: Καταχώρηση Δαπανών (Βασική λειτουργικότητα)
2. **Πυλώνας 3**: Διαχείριση Αποθεματικού (Διαφάνεια)
3. **Πυλώνας 2**: Υπολογισμός & Έκδοση (Αυτοματοποίηση)

### Κριτήρια Επιτυχίας
- ✅ Ευκολία χρήσης για διαχειριστές
- ✅ Απόλυτη διαφάνεια για όλους
- ✅ Αυτοματοποίηση υπολογισμών
- ✅ Πλήρες ιστορικό κινήσεων
- ✅ Ασφάλεια και επιθεώρηση

---

**Συμπέρασμα**: Αυτή η αρχιτεκτονική εξασφαλίζει ένα σύστημα που είναι τόσο απλό στη χρήση όσο και διαφανές στη λειτουργία του, ενισχύοντας την εμπιστοσύνη και μειώνοντας τις προστριβές μεταξύ διαχειριστών και ιδιοκτητών. 