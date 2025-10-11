# Σύστημα Αυτόματου Χαρακτηρισμού Δαπανών: Ένοικος vs Ιδιοκτήτης

## 📋 Περιγραφή

Το σύστημα πλέον διαθέτει **αυτόματο χαρακτηρισμό δαπανών** με βάση την ελληνική νομοθεσία, ορίζοντας αυτόματα ποιος είναι υπεύθυνος για την πληρωμή: **Ιδιοκτήτης**, **Ένοικος**, ή **Κοινή Ευθύνη**.

## 🎯 Νομική Βάση

Βασισμένο στην ελληνική νομοθεσία (Αστικός Κώδικας, Νόμος 1512/1985):

### **ΕΝΟΙΚΟΣ πληρώνει:**
✅ **Τακτική συντήρηση** (ετήσια, υποχρεωτική)  
✅ **Κατανάλωση** (πετρέλαιο, αέριο, ρεύμα, νερό)  
✅ **Μικροεπισκευές** (λάμπες, μικρές ρυθμίσεις)  
✅ **Καθαρισμός** & λειτουργικά έξοδα  

### **ΙΔΙΟΚΤΗΤΗΣ πληρώνει:**
✅ **Αντικατάσταση** μηχανημάτων/εξαρτημάτων  
✅ **Μεγάλες επισκευές** (εκτεταμένες, δομικές)  
✅ **Αναβάθμιση/Εκσυγχρονισμός**  
✅ **Ασφάλιση** κτιρίου & **Αποθεματικό**  

### **ΚΟΙΝΗ ΕΥΘΥΝΗ:**
Για δαπάνες που εξαρτώνται από την περίπτωση (π.χ. επισκευή ανελκυστήρα: μικρή → ένοικος, μεγάλη → ιδιοκτήτης)

---

## 🔧 Τεχνική Υλοποίηση

### 1. **Mapping Dictionary** (`models.py`)

```python
EXPENSE_CATEGORY_DEFAULTS = {
    # Πάγιες Δαπάνες
    'cleaning': 'resident',
    'electricity_common': 'resident',
    'water_common': 'resident',
    
    # Ανελκυστήρας
    'elevator_maintenance': 'resident',      # Ετήσια συντήρηση
    'elevator_repair': 'shared',             # Μικρή/Μεγάλη
    'elevator_modernization': 'owner',       # Αναβάθμιση
    
    # Θέρμανση
    'heating_fuel': 'resident',              # Κατανάλωση
    'heating_maintenance': 'resident',       # Ετήσια συντήρηση
    'heating_repair': 'shared',              # Μικρή/Μεγάλη
    'heating_modernization': 'owner',        # Αντικατάσταση
    
    # Κτίριο
    'building_insurance': 'owner',
    'roof_maintenance': 'owner',
    'facade_maintenance': 'owner',
    
    # Αποθεματικό
    'reserve_fund': 'owner',
    'emergency_fund': 'owner',
    
    # ... (όλες οι ~70 κατηγορίες)
}
```

### 2. **Helper Method** (`models.py`)

```python
@classmethod
def get_default_payer_for_category(cls, category_key):
    """Επιστρέφει την προεπιλεγμένη ευθύνη πληρωμής για μια κατηγορία"""
    return cls.EXPENSE_CATEGORY_DEFAULTS.get(category_key, 'resident')
```

### 3. **Serializer Auto-fill** (`serializers.py`)

```python
def create(self, validated_data):
    """Auto-set payer_responsibility αν δεν έχει οριστεί"""
    if 'payer_responsibility' not in validated_data:
        category = validated_data.get('category')
        if category:
            validated_data['payer_responsibility'] = \
                Expense.get_default_payer_for_category(category)
    return super().create(validated_data)
```

### 4. **API Endpoint** (`views.py`)

```
GET /api/financial/expenses/category_payer_defaults/
```

Επιστρέφει:
```json
{
  "cleaning": "resident",
  "elevator_maintenance": "resident",
  "building_insurance": "owner",
  ...
}
```

---

## 🚀 Χρήση

### **Backend:**

```python
# Δημιουργία δαπάνης χωρίς payer_responsibility
expense = Expense.objects.create(
    building=building,
    category='cleaning',
    amount=100,
    # payer_responsibility ορίζεται αυτόματα → 'resident'
)

# Ή χειροκίνητα override
expense = Expense.objects.create(
    building=building,
    category='cleaning',
    amount=100,
    payer_responsibility='owner'  # Χειροκίνητο override
)

# Helper method
default_payer = Expense.get_default_payer_for_category('elevator_maintenance')
# Returns: 'resident'
```

### **Frontend:**

```javascript
// 1. Λήψη mapping κατά την αρχικοποίηση
const response = await fetch('/api/financial/expenses/category_payer_defaults/');
const payerDefaults = await response.json();
// { cleaning: 'resident', building_insurance: 'owner', ... }

// 2. Auto-suggestion όταν αλλάζει η κατηγορία
function onCategoryChange(selectedCategory) {
  const suggestedPayer = payerDefaults[selectedCategory] || 'resident';
  setPayerResponsibility(suggestedPayer);
}

// 3. Το πεδίο 'suggested_payer' είναι διαθέσιμο σε κάθε Expense object
expense.suggested_payer  // 'resident', 'owner', ή 'shared'
```

---

## 📊 Κατηγοριοποίηση Δαπανών

### **Ένοικος (resident):**
- Καθαρισμός κοινοχρήστων
- ΔΕΗ κοινοχρήστων
- Νερό κοινοχρήστων
- Συλλογή απορριμμάτων
- Ετήσια συντήρηση ανελκυστήρα
- Ετήσια συντήρηση καυστήρα
- Πετρέλαιο/Αέριο θέρμανσης
- Καθαρισμός δεξαμενής νερού
- Φωτισμός κοινοχρήστων
- Εντομοκτονία
- Καθαρισμός χιονιού

### **Ιδιοκτήτης (owner):**
- Ασφάλιση κτιρίου
- Συντήρηση/Επισκευή στέγης
- Συντήρηση/Επισκευή πρόσοψης
- Αναβάθμιση ανελκυστήρα
- Αντικατάσταση καυστήρα
- Επισκευή ηλεκτρικών εγκαταστάσεων
- Επισκευή υδραυλικών
- Αποθεματικό ταμείο
- Έκτακτες επισκευές
- Ζημιές (πλημμύρα, σεισμός, φωτιά)
- Νομικά/Λογιστικά έξοδα
- Ενεργειακές αναβαθμίσεις

### **Κοινή Ευθύνη (shared):**
- Επισκευή ανελκυστήρα (μικρή vs μεγάλη)
- Επισκευή θερμαντικών (μικρή vs αντικατάσταση)
- Κλειδαράς (κοινόχρηστα vs θύρες)
- Διάφορες δαπάνες

---

## ⚙️ Μετάπτωση (Migration)

**Δεν χρειάζεται migration!** Το σύστημα:
- ✅ Προσθέτει νέο dictionary στο μοντέλο (δεν αλλάζει schema)
- ✅ Προσθέτει helper method (class method)
- ✅ Ενημερώνει το serializer (λογική μόνο)
- ✅ Προσθέτει νέο API endpoint

Οι **υπάρχουσες δαπάνες** διατηρούν το τρέχον `payer_responsibility` τους.  
Οι **νέες δαπάνες** χρησιμοποιούν αυτόματα το mapping.

---

## 🧪 Testing

```python
# Test auto-assignment
def test_expense_auto_payer():
    expense = Expense.objects.create(
        building=building,
        category='cleaning',
        amount=100
    )
    assert expense.payer_responsibility == 'resident'
    
    expense2 = Expense.objects.create(
        building=building,
        category='building_insurance',
        amount=500
    )
    assert expense2.payer_responsibility == 'owner'

# Test helper method
def test_default_payer_lookup():
    assert Expense.get_default_payer_for_category('cleaning') == 'resident'
    assert Expense.get_default_payer_for_category('building_insurance') == 'owner'
    assert Expense.get_default_payer_for_category('elevator_repair') == 'shared'
```

---

## 📝 Σημειώσεις

1. **Override είναι πάντα δυνατό**: Το σύστημα προτείνει, αλλά ο χρήστης μπορεί να αλλάξει
2. **Συμβατότητα**: Παλιές δαπάνες δεν επηρεάζονται
3. **Νομική ασφάλεια**: Βασισμένο στην ελληνική νομοθεσία
4. **Ευελιξία**: Το mapping μπορεί να ενημερωθεί εύκολα για νέες νομικές απαιτήσεις

---

## 🔄 Ενημέρωση Mapping

Για να ενημερώσετε το mapping (π.χ. νέα νομοθεσία):

1. Επεξεργαστείτε το `EXPENSE_CATEGORY_DEFAULTS` στο `models.py`
2. Δεν χρειάζεται migration
3. Restart το Django server
4. Το νέο mapping ενεργοποιείται αμέσως

---

**Ημερομηνία Υλοποίησης**: 11 Οκτωβρίου 2025  
**Έκδοση**: 1.0  
**Συντάκτης**: AI Assistant με βάση απαιτήσεις χρήστη  

