# 📅 Automated Events System - Setup Guide

## Περιγραφή Συστήματος

Το αυτοματοποιημένο σύστημα events δημιουργεί **αυτόματα συμβάντα** για:

### 🔴 1. Καθυστερημένα Κοινόχρηστα (>1 μήνας)
- Εντοπίζει διαμερίσματα με οφειλές
- Δημιουργεί high priority events
- Περιλαμβάνει λεπτομέρειες οφειλών ανά διαμέρισμα
- **Αποφεύγει duplicates** - δεν δημιουργεί νέο event αν υπάρχει ήδη

### 📋 2. Μηνιαία Υπενθύμιση Κοινοχρήστων (1-3 κάθε μήνα)  
- Υπενθύμιση για έκδοση κοινοχρήστων προηγούμενου μήνα
- Medium priority events
- Περιλαμβάνει checklist βημάτων
- Εκτελείται μόνο τις πρώτες 3 μέρες του μήνα

### 🔧 3. Maintenance Payment Alerts (5 μέρες πριν + εκπρόθεσμα)
- Επερχόμενες δόσεις maintenance (5 μέρες πριν)
- Εκπρόθεσμες δόσεις (urgent priority)
- Πλήρεις λεπτομέρειες εργολάβου και πληρωμής
- Στοιχεία επικοινωνίας

## 🚀 Εγκατάσταση & Χρήση

### Μη-Αυτόματη Εκτέλεση
```bash
# Dry run (προεπισκόπηση χωρίς αποθήκευση)
./run_automated_events.sh --dry-run

# Κανονική εκτέλεση
./run_automated_events.sh

# Για συγκεκριμένο κτίριο
./run_automated_events.sh --building 1
```

### Αυτόματη Εκτέλεση με Cron

#### Επιλογή 1: Καθημερινή εκτέλεση (Συνιστάται)
```bash
# Προσθήκη στο crontab
crontab -e

# Καθημερινά στις 9:00 πμ
0 9 * * * /home/theo/projects/linux_version/run_automated_events.sh >> /home/theo/projects/linux_version/logs/cron.log 2>&1
```

#### Επιλογή 2: Εβδομαδιαία εκτέλεση  
```bash
# Κάθε Δευτέρα στις 8:00 πμ
0 8 * * 1 /home/theo/projects/linux_version/run_automated_events.sh >> /home/theo/projects/linux_version/logs/cron.log 2>&1
```

#### Επιλογή 3: Μηνιαία εκτέλεση
```bash
# Κάθε 1η του μήνα στις 7:00 πμ
0 7 1 * * /home/theo/projects/linux_version/run_automated_events.sh >> /home/theo/projects/linux_version/logs/cron.log 2>&1
```

## 📊 Monitoring & Logs

### Log Files
```bash
# Κύριο log file
tail -f /home/theo/projects/linux_version/logs/automated_events.log

# Cron execution log  
tail -f /home/theo/projects/linux_version/logs/cron.log
```

### Έλεγχος Events στο Frontend
1. Άνοιγμα http://demo.localhost:3001
2. Κλικ στο **κουδουνάκι** στο header (πάνω δεξιά)
3. Προβολή νέων events στο δεξιό sidebar

## ⚙️ Advanced Configuration

### Προσαρμογή Παραμέτρων

Μπορείτε να προσαρμόσετε το `create_automated_events.py`:

```python
# Αλλαγή threshold για καθυστερήσεις (default: 30 μέρες)  
one_month_ago = timezone.now() - timedelta(days=45)

# Αλλαγή μερών για maintenance alerts (default: 5 μέρες)
upcoming_threshold = timezone.now().date() + timedelta(days=7)

# Αλλαγή μερών μηνιαίας υπενθύμισης (default: 1-3 μέρες) 
if today.day <= 5:  # Επέκταση σε 5 μέρες
```

### Custom Building Logic
```python
# Εκτέλεση μόνο για συγκεκριμένο κτίριο
python /app/create_automated_events.py --building 1 --dry-run
```

## 🛡️ Ασφάλεια & Best Practices

### Duplicate Prevention
- ✅ Έλεγχος υπαρχόντων events πριν τη δημιουργία
- ✅ Time-based deduplication (7 μέρες για overdue, μήνας για reminders)
- ✅ Building-specific event tracking

### Error Handling  
- ✅ Comprehensive logging με timestamps
- ✅ Docker container health checks
- ✅ Graceful failure με error codes
- ✅ Rollback support

### Performance
- ✅ Optimized database queries με select_related
- ✅ Batch processing για multiple apartments
- ✅ Schema context for multi-tenancy

## 🔧 Troubleshooting

### Common Issues

#### "Container not running"
```bash
# Έλεγχος containers
docker ps

# Εκκίνηση αν χρειάζεται
./startup.sh
```

#### "Permission denied"  
```bash
# Fix script permissions
chmod +x /home/theo/projects/linux_version/run_automated_events.sh
```

#### "Database connection error"
```bash
# Έλεγχος backend container
docker exec linux_version-backend-1 python manage.py check
```

### Debug Mode
```bash  
# Εκτέλεση με verbose output
docker exec linux_version-backend-1 python /app/create_automated_events.py --dry-run --building 1
```

## 📈 Metrics & Analytics

### Event Statistics
- Πλήθος events ανά κατηγορία
- Response time για maintenance payments  
- Overdue trend analysis
- Building-specific metrics

### Success Metrics
- 🎯 **Automated Detection**: Events δημιουργούνται χωρίς χειροκίνητη παρέμβαση
- 🎯 **Zero Duplicates**: Duplicate prevention λειτουργεί σωστά
- 🎯 **Timely Alerts**: Maintenance payments εντοπίζονται 5+ μέρες πριν
- 🎯 **Complete Coverage**: Όλα τα κτίρια καλύπτονται αυτόματα

## 🚀 Future Enhancements

### Πιθανές Βελτιώσεις
1. **Email Notifications**: Αποστολή emails για urgent events
2. **SMS Alerts**: Κρίσιμες υπενθυμίσεις μέσω SMS
3. **Slack Integration**: Notifications στο Slack workspace
4. **Custom Rules**: Δημιουργία custom rules ανά building
5. **Machine Learning**: Predictive alerts based on patterns

### Integration Points
- 📧 **Email System**: SMTP configuration
- 📱 **Mobile App**: Push notifications  
- 🔗 **API Webhooks**: Third-party integrations
- 📊 **Analytics Dashboard**: Real-time metrics

---

## 🎉 Αποτελέσματα

Με το αυτοματοποιημένο σύστημα επιτυγχάνετε:

- ✅ **Μηδενικές παραλείψεις** καθυστερημένων πληρωμών
- ✅ **Προληπτική διαχείριση** maintenance schedules  
- ✅ **Αυτόματη υπενθύμιση** κοινοχρήστων κάθε μήνα
- ✅ **Κεντρική παρακολούθηση** μέσω calendar events
- ✅ **Πλήρης διαφάνεια** με detailed logging

**Το σύστημα είναι έτοιμο για άμεση χρήση! 🚀**