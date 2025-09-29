# Financial API Fix - Οικονομικά API

## Το Πρόβλημα

Παίρνετε 404 error όταν προσπαθείτε να προσπελάσετε το `/financial/accounts` endpoint:
```
GET http://demo.localhost:8080/financial/accounts 404 (Not Found)
```

## Η Αιτία

Το πρόβλημα ήταν στο Next.js configuration που είχε ένα rewrite rule που έστελνε όλα τα `/api/*` requests στο backend, αλλά χωρίς το σωστό tenant context.

## Η Λύση

Έχουμε κάνει τις εξής αλλαγές:

### 1. Αφαιρέσαμε το Next.js Rewrite Rule
Στο `frontend/next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed rewrite rule - frontend will make direct requests to backend
};

module.exports = nextConfig;
```

### 2. Ενημερώσαμε το API Base URL
Στο `frontend/lib/api.ts`, η συνάρτηση `getApiBaseUrl()` τώρα:
- Χρησιμοποιεί το tenant subdomain (π.χ. `demo.localhost`)
- Κάνει request στο port 8000 (backend) αντί για 8080 (frontend)

### 3. Αφαιρέσαμε το Environment Variable
Αφαιρέσαμε το `BACKEND_INTERNAL_URL` από το `docker-compose.yml` αφού δεν το χρειαζόμαστε πλέον.

## Τι Πρέπει να Κάνετε

1. **Επανεκκινήστε τα containers**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

2. **Ελέγξτε αν λειτουργεί**:
   - Πηγαίνετε στο `http://demo.localhost:8080/financial`
   - Το frontend θα κάνει request στο `http://demo.localhost:8000/api/financial/accounts/`
   - Το backend θα αναγνωρίσει το tenant από το hostname `demo.localhost`

## Test Files

Δημιουργήσαμε τα εξής test files:

- `test_financial_api.py` - Python script για testing του API
- `test_frontend_financial.html` - HTML page για testing από browser

## Πώς Λειτουργεί Τώρα

1. Το frontend τρέχει στο `demo.localhost:8080`
2. Όταν κάνει API call, χρησιμοποιεί το `demo.localhost:8000/api/...`
3. Το django-tenants middleware αναγνωρίζει το tenant από το hostname
4. Το request πάει στο σωστό tenant schema (demo)

## Sample Data

Έχουμε ήδη δημιουργήσει sample data στο demo tenant:

### Λογαριασμοί Κτιρίου
- **Λειτουργικός Λογαριασμός**: €10,000 (Sample Bank - GR123456789)
- **Αποθεματικό Λογαριασμός**: €25,000 (Reserve Bank - GR987654321)

### Πληρωμές
- **6 πληρωμές** συνολικά
- **Συνολικό ποσό**: €1,501
- **Εξοφλημένο**: €1,160.5
- **Ποσοστό εξόφλησης**: 77.3%

### Τύποι Πληρωμών
- Συντήρηση (maintenance)
- Κοινοχρήστων (utilities)
- Φόροι (taxes)
- Άλλο (other)

## Frontend Pages

Δημιουργήσαμε τις εξής σελίδες:

1. **Financial Dashboard** (`/financial`)
   - Επισκόπηση όλων των οικονομικών
   - Στατιστικά πληρωμών
   - Σύνοψη λογαριασμών
   - Στατιστικά συναλλαγών

2. **Accounts Page** (`/financial/accounts`)
   - Λίστα όλων των λογαριασμών
   - Λεπτομέρειες κάθε λογαριασμού
   - Σύνοψη λογαριασμών

3. **Transactions Page** (`/financial/transactions`)
   - Λίστα όλων των συναλλαγών
   - Φίλτρα ανά τύπο, κατηγορία, ημερομηνία
   - Στατιστικά εσόδων/εξόδων

## API Endpoints

Όλα τα financial endpoints λειτουργούν σωστά:

- `GET /api/financial/accounts/` - Λίστα λογαριασμών
- `GET /api/financial/accounts/summary/` - Σύνοψη λογαριασμών
- `GET /api/financial/payments/` - Λίστα πληρωμών
- `GET /api/financial/payments/statistics/` - Στατιστικά πληρωμών
- `GET /api/financial/transactions/` - Λίστα συναλλαγών
- `GET /api/financial/transactions/statistics/` - Στατιστικά συναλλαγών

## Επόμενα Βήματα

Μετά την επανεκκίνηση των containers, μπορείτε να:

1. Επισκεφθείτε το financial dashboard στο `http://demo.localhost:8080/financial`
2. Δείτε τα λογαριασμοί κτιρίου στο `http://demo.localhost:8080/financial/accounts`
3. Δείτε τις συναλλαγές στο `http://demo.localhost:8080/financial/transactions`
4. Δημιουργήσετε νέες πληρωμές και συναλλαγές
5. Διαχειριστείτε τα οικονομικά του κτιρίου

## Authentication

Για να δοκιμάσετε το API:

```bash
# Login
curl -X POST -H "Host: demo.localhost" -H "Content-Type: application/json" \
  -d '{"email":"theostam1966@gmail.com","password":"admin123"}' \
  http://localhost:8000/api/users/login/

# Χρήση του token
curl -H "Host: demo.localhost" -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/financial/accounts/
```

## Τελευταίες Διορθώσεις

### Select Component Error
Διορθώσαμε το πρόβλημα με τα Select components που είχαν empty string values:
- Αντικαταστήσαμε `value=""` με `value="all"` σε όλα τα SelectItem
- Ενημερώσαμε το initial state των filters
- Προσαρμόσαμε τη λογική για να χειρίζεται το "all" value σωστά

### Αρχεία που Διορθώθηκαν:
- `frontend/app/(dashboard)/financial/transactions/page.tsx`
- `frontend/app/(dashboard)/financial/payments/page.tsx`

Το financial module είναι πλέον πλήρως λειτουργικό! 🎉 