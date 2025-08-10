# 🏢 New Concierge - Building Management System

## 📋 Επισκόπηση

Το **New Concierge** είναι ένα ολοκληρωμένο σύστημα διαχείρισης κτιρίων που προσφέρει λύσεις για:
- 🏠 Διαχείριση πολυκατοικιών και διαμερισμάτων
- 💰 Οικονομική διαχείριση (δαπάνες, εισπράξεις, κοινοχρήστων)
- 👥 Διαχείριση ιδιοκτητών και ενοικιαστών
- 📢 Επικοινωνία και ανακοινώσεις
- 🔧 Συντήρηση και επισκευές
- 📊 Reports και analytics

---

## 🚀 Τελευταίες Ενημερώσεις (August 8, 2025)

### 🎯 **Μεγάλες Βελτιώσεις - Payment List & Modals**

#### 💰 **Enhanced Payment List** - NEW FEATURE
- **Συγκεντρωτική Προβολή**: Μία εγγραφή ανά ενοίκο αντί για μεμονωμένες πληρωμές
- **Προοδευτικά Υπόλοιπα**: Ακριβής real-time υπολογισμός από transaction history
- **Smart UI**: Καθαρότερη εμφάνιση χωρίς περιττές ετικέτες
- **Color-Coded Balances**: Οπτικές ενδείξεις για οφειλές/πιστώσεις

#### 📋 **Payment Detail Modal** - NEW COMPONENT
- **Μοναδικό Ιστορικό**: Διαφορετικά δεδομένα ανά διαμέρισμα
- **Print-Ready**: Λειτουργική εκτύπωση με optimized CSS
- **Real-Time Data**: Σύνδεση με νέο backend API endpoint
- **Enhanced UX**: Loading states και error handling

#### 🔧 **Backend API Improvements** - ENHANCED
- **Dynamic Balance Calculation**: Υπολογισμός υπολοίπων από transaction history
- **New Endpoint**: `/api/financial/apartments/{id}/transactions/`
- **Enhanced Serializers**: Owner/tenant names και monthly due integration

---

## 🚀 Προηγούμενες Ενημερώσεις (December 5, 2024)

### ✅ **Επιλύθηκαν Κρίσιμα Προβλήματα**

#### 1. **Building Selector Issue** - FIXED
- **Πρόβλημα**: Type mismatch μεταξύ components
- **Λύση**: Ενοποίηση τύπων `buildingId` σε `number`
- **Αποτέλεσμα**: Σωστή λειτουργία multi-building management

#### 2. **CommonExpenseModal TypeError** - FIXED
- **Πρόβλημα**: `share.breakdown.forEach is not a function`
- **Λύση**: Array type checking με `Array.isArray()`
- **Αποτέλεσμα**: Robust error handling

#### 3. **Common Expenses Calculator** - FIXED
- **Πρόβλημα**: Δαπάνες δεν εμφανίζονταν στον υπολογισμό
- **Αιτία**: Έλλειψη ανέκδοτων δαπανών και χιλιοστών συμμετοχής
- **Λύση**: 
  - Δημιουργία 5 νέων δαπανών (1.050€ συνολικά)
  - Προσθήκη χιλιοστών συμμετοχής (1.000 συνολικά)
- **Αποτέλεσμα**: Πλήρης λειτουργικότητα υπολογισμού κοινοχρήστων

#### 4. **CommonExpenseModal UI/UX** - ENHANCED
- **Βελτιώσεις**:
  - Μικρότερο ύψος (85% αντί για 95%)
  - Μεγαλύτερο πλάτος (95% της οθόνης)
  - 3-Column layout για καλύτερη οργάνωση
  - Κουμπί "Αποθήκευση" με API integration
- **Αποθήκευση**: JSON format για ελάχιστη επιβάρυνση πόρων

### 🛠️ **Scripts που Δημιουργήθηκαν**
- `add_expenses_via_api.py` - Δημιουργία ανέκδοτων δαπανών
- `add_mills_to_athens_building.py` - Προσθήκη χιλιοστών συμμετοχής
- `debug_expenses.py` - Εντοπισμός προβλημάτων δαπανών

---

## 🏗️ Αρχιτεκτονική

### Backend (Django + Django Tenants)
```
backend/
├── new_concierge_backend/     # Main Django project
├── tenants/                   # Multi-tenancy support
├── buildings/                 # Building management
├── apartments/                # Apartment management
├── financial/                 # Financial management
├── users/                     # User management
├── announcements/             # Communication
└── maintenance/               # Maintenance & repairs
```

### Frontend (React + TypeScript)
```
frontend/
├── components/                # Reusable UI components
├── pages/                     # Page components
├── hooks/                     # Custom React hooks
├── types/                     # TypeScript definitions
├── lib/                       # Utilities & configurations
└── styles/                    # CSS & styling
```

---

## 💰 Οικονομική Διαχείριση

### Διαθέσιμες Λειτουργίες
- ✅ **Δαπάνες**: Καταχώρηση και διαχείριση δαπανών κτιρίου
- ✅ **Εισπράξεις**: Διαχείριση πληρωμών ιδιοκτητών
- ✅ **Κοινοχρήστων**: Υπολογισμός και έκδοση κοινοχρήστων
- ✅ **Reports**: Οικονομικά reports και analytics
- ✅ **Αποθεματικό**: Διαχείριση ταμείου εφεδρείας

### Υπολογιστής Κοινοχρήστων
- **Τύποι Κατανομής**:
  - Ανά Χιλιοστά (by_participation_mills)
  - Ισόποσα (equal_share)
  - Συγκεκριμένα (specific_apartments)
  - Μετρητές (by_meters)

- **Κατηγορίες Δαπανών**:
  - Καθαρισμός Κοινοχρήστων
  - ΔΕΗ Κοινοχρήστων
  - Συντήρηση Ανελκυστήρα
  - Θέρμανση
  - Ασφάλεια Κτιρίου
  - Και πολλές άλλες...

---

## 🔧 Εγκατάσταση & Εκκίνηση

### Προαπαιτούμενα
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Docker (προαιρετικό)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ή venv\Scripts\activate  # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Database Setup
```bash
# Δημιουργία demo tenant
python manage.py create_tenant --schema_name=demo --name="Demo Tenant"

# Δημιουργία sample data
python create_sample_data.py
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
python manage.py test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### API Tests
```bash
# Test building selector
python test_building_selector_fix.py

# Test financial calculations
python test_advanced_calculator.py
```

---

## 📊 Demo Data

### Διαθέσιμα Κτίρια
- **Αθηνών 12**: 6 διαμερίσματα (με χιλιοστά συμμετοχής)
- **Πατησίων 45**: 6 διαμερίσματα
- **Αραχώβης 12**: 12 διαμερίσματα (με χιλιοστά συμμετοχής)

### Sample Δαπάνες
- ΔΕΗ Κοινοχρήστων: 280€
- Καθαρισμός Κοινοχρήστων: 320€
- Συντήρηση Ανελκυστήρα: 180€
- Νερό Κοινοχρήστων: 150€
- Ασφάλεια Κτιρίου: 120€

### Demo Credentials
```
Email: admin@demo.localhost
Password: admin123456
```

---

## 🔐 Security

### Authentication
- JWT-based authentication
- Refresh tokens
- Role-based access control
- Multi-tenant isolation

### Data Protection
- Tenant isolation
- Encrypted sensitive data
- Audit logging
- GDPR compliance

---

## 📈 Performance

### Optimizations
- Database query optimization
- Caching strategies
- Lazy loading
- Image compression
- CDN integration

### Monitoring
- Application performance monitoring
- Error tracking
- User analytics
- System health checks

---

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

### Code Standards
- TypeScript for frontend
- Python PEP 8 for backend
- ESLint + Prettier
- Black for Python formatting

---

## 📝 Documentation

### Available Documentation
- [API Documentation](docs/api/)
- [User Guide](docs/user-guide/)
- [Developer Guide](docs/developer-guide/)
- [Deployment Guide](docs/deployment/)

### Architecture Documents
- [System Architecture](docs/architecture/)
- [Database Schema](docs/database/)
- [Security Model](docs/security/)

---

## 🚀 Deployment

### Production Setup
```bash
# Backend deployment
docker-compose -f docker-compose.prod.yml up -d

# Frontend deployment
npm run build
# Deploy to CDN/static hosting
```

### Environment Variables
```bash
# Backend
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key
DEBUG=False

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 📞 Support

### Contact Information
- **Email**: support@newconcierge.com
- **Documentation**: [docs.newconcierge.com](https://docs.newconcierge.com)
- **Issues**: [GitHub Issues](https://github.com/newconcierge/issues)

### Community
- **Discord**: [Join our community](https://discord.gg/newconcierge)
- **Blog**: [Latest updates](https://blog.newconcierge.com)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🧹 Καθαρισμός Docker

### Πλήρης Καθαρισμός Docker
```bash

docker stop $(docker ps -aq)

docker rm $(docker ps -aq)
docker volume prune -f
docker network prune -f
docker builder prune -af
docker system prune -af --volumes

docker compose up --build -d


docker rmi $(docker images -q)

# Πλήρες reset και εκκίνηση
./reset_and_start.sh

# Ή με interactive menu
./clean_and_restart.sh
```

### Επιλεκτικός Καθαρισμός
```bash
# Διαγραφή μόνο των unused containers
docker container prune -f

# Διαγραφή μόνο των unused images
docker image prune -af

# Διαγραφή μόνο των unused volumes
docker volume prune -f
```

---



### Αναλυτική Διαδικασία Ενημέρωσης
```bash
# 1. Έλεγχος τρέχουσας κατάστασης
git status
git log --oneline -5

# 2. Pull τελευταίων αλλαγών από remote
git pull origin main

# 3. Προσθήκη αλλαγών
git add .

# 4. Commit με περιγραφικό μήνυμα
git commit -m "feat: προσθήκη νέων χαρακτηριστικών οικονομικής διαχείρισης"

# 5. Push στο GitHub
git push origin main

# 6. Έλεγχος ότι τα πάντα ανέβηκαν σωστά
git status
```

### Χρήσιμες Εντολές Git
```bash
# Δημιουργία νέου branch
git checkout -b feature/new-feature

# Αλλαγή branch
git checkout main

# Merge branch
git merge feature/new-feature

# Διαγραφή local branch
git branch -d feature/new-feature

# Διαγραφή remote branch
git push origin --delete feature/new-feature

# Undo τελευταίου commit (χωρίς να χαθούν οι αλλαγές)
git reset --soft HEAD~1

# Δημιουργία tag
git tag -a v2.1.0 -m "Version 2.1.0"
git push origin v2.1.0
```

### GitHub CLI (gh) Εντολές
```bash
# Εγκατάσταση GitHub CLI (Ubuntu/Debian)
sudo apt install gh

# Login στο GitHub
gh auth login

# Δημιουργία pull request
gh pr create --title "Νέο χαρακτηριστικό" --body "Περιγραφή των αλλαγών"

# Δημιουργία issue
gh issue create --title "Bug report" --body "Περιγραφή του προβλήματος"

# Clone repository
gh repo clone username/repository-name
```

---

## 📤 Ενημέρωση GitHub Repository

### Βασικές Εντολές Git
```bash

git status
git add .
git commit -m "προβλημα εκτυπωσης εισπραξεων"
git push origin main
```




**Last Updated**: December 5, 2024  
**Version**: 2.1.0  
**Status**: Production Ready ✅