# 🚀 New Concierge - Light Mode Installation Guide

## 📋 Επισκόπηση

Το **Light Mode** είναι μια βελτιστοποιημένη έκδοση του New Concierge για γρηγορότερη development. Εξοικονομεί ~500MB RAM απενεργοποιώντας τα Celery services.

## ⚡ Τι περιλαμβάνει το Light Mode

### ✅ **Συμπεριλαμβάνει:**
- 🗄️ **Database** (PostgreSQL)
- 🔴 **Redis** (Cache & Session Storage)
- 🐍 **Backend** (Django + DRF)
- ⚛️ **Frontend** (Next.js + TypeScript)

### ❌ **Δεν περιλαμβάνει:**
- 🔄 **Celery Worker** (Background Tasks)
- ⏰ **Celery Beat** (Scheduled Tasks)
- 🌸 **Flower** (Celery Monitoring)
- 📄 **Document Parser** (AI Document Processing)

## 🛠️ Προαπαιτούμενα

### Βασικά Προαπαιτούμενα
- **Docker** & **Docker Compose**
- **Git** (για clone του repository)
- **8GB RAM** (ελάχιστο)
- **10GB** ελεύθερος χώρος δίσκου

### Επιπλέον Προαπαιτούμενα (για Full Mode)
- **12GB RAM** (για Document Parser)
- **Google Cloud Account** (για Document AI)

## 🚀 Γρήγορη Εγκατάσταση

### 1. Clone του Repository
```bash
git clone https://github.com/theostamp/linux_version.git
cd linux_version
```

### 2. Διόρθωση Permissions
```bash
# Δώσε εκτελέσιμα permissions σε όλα τα .sh αρχεία
find . -name "*.sh" -type f | grep -v ".venv" | grep -v "node_modules" | xargs chmod +x
```

### 3. Δημιουργία Environment File
```bash
# Αντιγραφή του example environment
cp env.example .env

# Επεξεργασία του .env file (προαιρετικό)
nano .env
```

### 4. Εκκίνηση Light Mode
```bash
# Εκκίνηση Light Mode (γρηγορότερο)
./start_dev_light.sh
```

### 5. Έλεγχος Εγκατάστασης
```bash
# Έλεγχος ότι όλα λειτουργούν
curl http://localhost:3001  # Frontend
curl http://localhost:8000  # Backend
```

## 📊 Σύγκριση Modes

| Feature | Light Mode | Full Mode |
|---------|------------|-----------|
| **RAM Usage** | ~700MB | ~1.2GB |
| **Startup Time** | ~30s | ~60s |
| **Services** | 4 containers | 7 containers |
| **Document Parser** | ❌ | ✅ |
| **Background Tasks** | ❌ | ✅ |
| **Scheduled Tasks** | ❌ | ✅ |
| **Development** | ✅ Εξαιρετικό | ✅ Καλό |
| **Production** | ❌ | ✅ |

## 🔧 Χρήσιμες Εντολές

### Έλεγχος Κατάστασης
```bash
# Έλεγχος containers
docker-compose ps

# Έλεγχος resource usage
docker stats --no-stream

# Έλεγχος logs
docker logs linux_version-backend-1
docker logs linux_version-frontend-1
```

### Εναλλαγή Modes
```bash
# Light Mode (γρήγορο development)
./start_dev_light.sh

# Full Mode (πλήρης λειτουργικότητα)
./startup.sh

# Stop όλα
docker-compose down
```

### Έλεγχος Document Parser
```bash
# Έλεγχος αν Document Parser λειτουργεί
./check_document_parser.sh
```

## ⚠️ Περιορισμοί Light Mode

### 🚫 **Δεν Λειτουργούν:**
1. **Document Parser**: Ανεβάσματα και επεξεργασία εγγράφων
2. **Background Tasks**: Ασύγχρονες εργασίες
3. **Scheduled Tasks**: Αυτόματες εργασίες (cleanup, reports)
4. **Email Notifications**: Αυτόματες ειδοποιήσεις

### ✅ **Λειτουργούν Κανονικά:**
1. **Financial Management**: Δαπάνες, πληρωμές, κοινοχρήστα
2. **Building Management**: Διαμερίσματα, ιδιοκτήτες
3. **Maintenance**: Συντήρηση, έργα, συνεργεία
4. **Communication**: Ανακοινώσεις, αιτήματα
5. **Reports**: Όλα τα reports και analytics

## 🎯 Πότε να Χρησιμοποιείς Light Mode

### ✅ **Χρησιμοποίησε Light Mode όταν:**
- Κάνεις **καθημερινή development**
- Δουλεύεις σε **UI/UX improvements**
- Κάνεις **API development**
- Δοκιμάζεις **νέες features**
- Έχεις **περιορισμένη RAM**

### ❌ **ΜΗΝ χρησιμοποιείς Light Mode όταν:**
- Χρειάζεσαι **Document Parser**
- Δοκιμάζεις **background tasks**
- Κάνεις **production testing**
- Χρειάζεσαι **scheduled tasks**

## 🔄 Μετάβαση από Light σε Full Mode

```bash
# 1. Σταμάτημα Light Mode
docker-compose down

# 2. Εκκίνηση Full Mode
./startup.sh

# 3. Έλεγχος Document Parser
./check_document_parser.sh
```

## 🆘 Troubleshooting

### Πρόβλημα: Containers δεν ξεκινούν
```bash
# Έλεγχος Docker
docker --version
docker-compose --version

# Καθαρισμός Docker
docker system prune -f
```

### Πρόβλημα: Port conflicts
```bash
# Έλεγχος ports
netstat -tulpn | grep :3001
netstat -tulpn | grep :8000

# Αλλαγή ports στο docker-compose.dev.yml
```

### Πρόβλημα: Database connection
```bash
# Έλεγχος database
docker logs linux_version-db-1

# Restart database
docker restart linux_version-db-1
```

## 📞 Support

### Χρήσιμα Links
- **GitHub Repository**: https://github.com/theostamp/linux_version
- **Full Documentation**: README_.MD
- **API Documentation**: http://localhost:8000/api/docs/

### Contact
- **Email**: support@newconcierge.com
- **Issues**: GitHub Issues

---

## 🎉 Ευχαριστούμε!

Το Light Mode είναι σχεδιασμένο για να κάνει την development εμπειρία γρηγορότερη και πιο αποδοτική. Αν χρειάζεσαι πλήρη λειτουργικότητα, χρησιμοποίησε το Full Mode με `./startup.sh`.

**Happy Coding! 🚀**



