# 🔍 Σύστημα Ελέγχου Υγείας - New Concierge

## 📋 Επισκόπηση

Το **Σύστημα Ελέγχου Υγείας** είναι ένα ολοκληρωμένο εργαλείο για την παρακολούθηση και επικύρωση της ορθότητας των οικονομικών δεδομένων στο New Concierge. Παρέχει αυτοματοποιημένους ελέγχους και αναφορές για την ακεραιότητα του συστήματος.

## 🎯 Λειτουργίες

### ✅ Έλεγχοι που Εκτελούνται

1. **🏢 Έλεγχος Βασικών Δεδομένων Κτιρίου**
   - Υπαρξη κτιρίου
   - Αριθμός διαμερισμάτων
   - Κατανομή χιλιοστών (πρέπει να ισούται με 1000)

2. **💰 Έλεγχος Οικονομικών Δεδομένων**
   - Αριθμός δαπανών, συναλλαγών, πληρωμών
   - Ισορροπία εσόδων-εξόδων
   - Μήνες με δεδομένα

3. **🔄 Έλεγχος Μεταφοράς Υπολοίπων**
   - Σωστή μεταφορά υπολοίπων μεταξύ μηνών
   - Έλεγχος ακεραιότητας υπολογισμών

4. **🔍 Έλεγχος Διπλών Χρεώσεων**
   - Διπλές δαπάνες
   - Διπλές πληρωμές

5. **🔒 Έλεγχος Ακεραιότητας Δεδομένων**
   - Orphaned records
   - Λάθος ποσά
   - Λείπουσες περιγραφές

## 🚀 Τρόποι Χρήσης

### 1. Django Management Command

```bash
# Βασικός έλεγχος
python manage.py system_health_check

# Λεπτομερής έξοδος
python manage.py system_health_check --detailed

# Αυτόματη διόρθωση προβλημάτων
python manage.py system_health_check --fix

# Εξαγωγή σε JSON
python manage.py system_health_check --json
```

### 2. API Endpoint

```bash
# GET request για βασικό έλεγχο
GET /api/financial/system-health/

# POST request με επιλογές
POST /api/financial/system-health/
{
    "detailed": true,
    "auto_fix": false
}
```

### 3. Standalone Script

```bash
# Εκτέλεση απευθείας
python system_health_check.py

# Με επιλογές
python system_health_check.py --detailed --fix
```

## 📊 Αποτελέσματα

### Επιτυχείς Έλεγχοι ✅
- **100%**: Εξαιρετικά! Όλοι οι έλεγχοι επιτυχείς!
- **80-99%**: Καλά! Το σύστημα λειτουργεί σχετικά καλά
- **60-79%**: Προσοχή! Χρειάζεται βελτίωση
- **<60%**: Κριτικό! Χρειάζεται άμεση διόρθωση

### Παράδειγμα Αποτελέσματος

```json
{
  "status": "success",
  "data": {
    "timestamp": "2025-01-26T10:45:29",
    "summary": {
      "total_checks": 5,
      "passed": 4,
      "failed": 1,
      "warnings": 0
    },
    "checks": {
      "building_data": { ... },
      "financial_data": { ... },
      "balance_transfer": { ... },
      "duplicate_charges": { ... },
      "data_integrity": { ... }
    },
    "status": "issues_found",
    "success_rate": 80.0,
    "output": "🔍 SYSTEM HEALTH CHECK - New Concierge..."
  }
}
```

## 🔧 Ενσωμάτωση στο Sidebar

### Frontend Integration

```typescript
// API call για έλεγχο υγείας
const checkSystemHealth = async (options?: {
  detailed?: boolean;
  auto_fix?: boolean;
}) => {
  const response = await fetch('/api/financial/system-health/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(options || {})
  });
  
  return response.json();
};

// Χρήση στο sidebar
const SystemHealthCheck = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  
  const runHealthCheck = async () => {
    const result = await checkSystemHealth({ detailed: true });
    setHealthStatus(result.data);
  };
  
  return (
    <div className="system-health-check">
      <button onClick={runHealthCheck}>
        🔍 Έλεγχος Υγείας Συστήματος
      </button>
      {healthStatus && (
        <div className="health-results">
          <div className={`status ${healthStatus.status}`}>
            {healthStatus.success_rate}% Επιτυχία
          </div>
          <pre>{healthStatus.output}</pre>
        </div>
      )}
    </div>
  );
};
```

## 📁 Αρχεία Συστήματος

### Core Files
- `system_health_check.py` - Standalone script
- `backend/financial/management/commands/system_health_check.py` - Django command
- `backend/financial/views.py` - API endpoint (SystemHealthCheckView)
- `backend/financial/urls.py` - URL routing

### Audit Files
- `financial_audit_plan.md` - Πλάνο ελέγχου
- `financial_audit_final_report.md` - Τελική αναφορά
- `financial_audit_step3_balance_transfer_check.py` - Έλεγχος μεταφοράς υπολοίπων
- `financial_audit_step4_mills_distribution_check.py` - Έλεγχος κατανομής χιλιοστών
- `financial_audit_step5_duplicate_charges_check.py` - Έλεγχος διπλών χρεώσεων

## 🎯 Προτεινόμενες Βελτιώσεις

### 1. Automated Scheduling
```python
# Cron job για αυτόματο έλεγχο
0 2 * * * python manage.py system_health_check --json > /var/log/health_check.log
```

### 2. Email Notifications
```python
# Αποστολή email σε περίπτωση προβλημάτων
if results['summary']['failed'] > 0:
    send_health_check_alert(results)
```

### 3. Dashboard Integration
```typescript
// Real-time health status στο dashboard
const HealthStatusWidget = () => {
  const [status, setStatus] = useState('unknown');
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await checkSystemHealth();
      setStatus(result.data.status);
    }, 300000); // 5 λεπτά
    
    return () => clearInterval(interval);
  }, []);
  
  return <div className={`health-indicator ${status}`} />;
};
```

### 4. Advanced Analytics
- Ιστορικό ελέγχων
- Τάσεις και προβλέψεις
- Performance metrics

## 🚨 Troubleshooting

### Συχνά Προβλήματα

1. **Import Errors**
   ```bash
   # Επιβεβαίωση Django environment
   python manage.py shell
   from financial.models import Expense, Payment
   ```

2. **Permission Errors**
   ```bash
   # Έλεγχος permissions
   python manage.py check --deploy
   ```

3. **Database Connection**
   ```bash
   # Έλεγχος database
   python manage.py dbshell
   ```

### Logs και Debugging

```bash
# Ενεργοποίηση debug mode
python manage.py system_health_check --detailed --json > debug.log

# Ανάλυση logs
tail -f debug.log | grep "ERROR\|WARNING"
```

## 📞 Υποστήριξη

Για ερωτήσεις ή προβλήματα με το σύστημα ελέγχου υγείας:

1. Ελέγξτε τα logs: `docker logs linux_version-backend-1`
2. Εκτελέστε manual έλεγχο: `python manage.py system_health_check --detailed`
3. Επιβεβαιώστε το database connection
4. Ελέγξτε τα permissions και authentication

---

**Τελευταία Ενημέρωση**: Ιανουάριος 2025  
**Έκδοση**: 1.0.0  
**Κατάσταση**: Production Ready ✅
