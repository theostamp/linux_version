# 📊 Financial System API Documentation

## 🏗️ Overview

Το Financial System API παρέχει endpoints για τη διαχείριση οικονομικών λειτουργιών σε πολυκατοικίες. Το σύστημα υποστηρίζει:

- **Διαχείριση Δαπανών**: Δημιουργία, επεξεργασία και διαγραφή δαπανών
- **Διαχείριση Πληρωμών**: Εγγραφή πληρωμών από διαμερίσματα
- **Μετρήσεις**: Διαχείριση μετρητών θέρμανσης και άλλων υπηρεσιών
- **Υπολογισμοί**: Αυτόματος υπολογισμός μεριδίων κοινοχρήστων
- **Αναφορές**: Γενική κατάσταση και στατιστικά

## 🔐 Authentication

Όλα τα endpoints απαιτούν authentication. Χρησιμοποιήστε:

```http
Authorization: Token your_auth_token_here
```

ή

```http
Authorization: Bearer your_jwt_token_here
```

## 📋 Base URL

```
https://your-domain.com/api/financial/
```

---

## 🏢 Expenses (Δαπάνες)

### GET /expenses/
Λαμβάνει λίστα όλων των δαπανών.

**Parameters:**
- `category` (optional): Φιλτράρισμα ανά κατηγορία
- `date_from` (optional): Ημερομηνία από
- `date_to` (optional): Ημερομηνία έως
- `distribution_type` (optional): Τύπος κατανομής

**Response:**
```json
[
  {
    "id": 1,
    "title": "Λογαριασμός Ηλεκτρικού",
    "amount": "1000.00",
    "category": "ELECTRICITY",
    "distribution_type": "EQUAL",
    "date": "2024-01-15",
    "description": "Μηνιαίος λογαριασμός",
    "created_by": 1,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

### POST /expenses/
Δημιουργεί νέα δαπάνη.

**Request Body:**
```json
{
  "title": "Λογαριασμός Ηλεκτρικού",
  "amount": "1000.00",
  "category": "ELECTRICITY",
  "distribution_type": "EQUAL",
  "date": "2024-01-15",
  "description": "Μηνιαίος λογαριασμός"
}
```

**Categories:**
- `ELECTRICITY`: Ηλεκτρικό
- `WATER`: Νερό
- `HEATING`: Θέρμανση
- `CLEANING`: Καθαρισμός
- `MAINTENANCE`: Συντήρηση
- `INSURANCE`: Ασφάλεια
- `OTHER`: Άλλο

**Distribution Types:**
- `EQUAL`: Ισόποσα μερίδια
- `BY_MILLS`: Κατά χιλιοστά
- `BY_METERS`: Κατά μετρητές

### GET /expenses/{id}/
Λαμβάνει λεπτομέρειες συγκεκριμένης δαπάνης.

### PUT /expenses/{id}/
Ενημερώνει υπάρχουσα δαπάνη.

### DELETE /expenses/{id}/
Διαγράφει δαπάνη.

---

## 💰 Payments (Πληρωμές)

### GET /payments/
Λαμβάνει λίστα όλων των πληρωμών.

**Parameters:**
- `apartment` (optional): Φιλτράρισμα ανά διαμέρισμα
- `payment_method` (optional): Μέθοδος πληρωμής
- `date_from` (optional): Ημερομηνία από
- `date_to` (optional): Ημερομηνία έως

**Response:**
```json
[
  {
    "id": 1,
    "apartment": 1,
    "apartment_number": "A1",
    "amount": "300.00",
    "payment_method": "CASH",
    "date": "2024-01-15",
    "description": "Μηνιαία πληρωμή",
    "created_by": 1,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### POST /payments/
Δημιουργεί νέα πληρωμή.

**Request Body:**
```json
{
  "apartment": 1,
  "amount": "300.00",
  "payment_method": "CASH",
  "date": "2024-01-15",
  "description": "Μηνιαία πληρωμή"
}
```

**Payment Methods:**
- `CASH`: Μετρητά
- `BANK_TRANSFER`: Τραπεζική μεταφορά
- `CHECK`: Επιταγή
- `CARD`: Κάρτα

### GET /payments/{id}/
Λαμβάνει λεπτομέρειες συγκεκριμένης πληρωμής.

### PUT /payments/{id}/
Ενημερώνει υπάρχουσα πληρωμή.

### DELETE /payments/{id}/
Διαγράφει πληρωμή.

---

## 📊 Meter Readings (Μετρήσεις)

### GET /meter-readings/
Λαμβάνει λίστα όλων των μετρήσεων.

**Parameters:**
- `apartment` (optional): Φιλτράρισμα ανά διαμέρισμα
- `reading_date` (optional): Ημερομηνία μετρήσης
- `date_from` (optional): Ημερομηνία από
- `date_to` (optional): Ημερομηνία έως

**Response:**
```json
[
  {
    "id": 1,
    "apartment": 1,
    "apartment_number": "A1",
    "reading_date": "2024-01-15",
    "current_value": "1000.50",
    "previous_value": "950.25",
    "consumption": "50.25",
    "created_by": 1,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### POST /meter-readings/
Δημιουργεί νέα μετρήση.

**Request Body:**
```json
{
  "apartment": 1,
  "reading_date": "2024-01-15",
  "current_value": "1000.50",
  "previous_value": "950.25"
}
```

### POST /meter-readings/bulk-import/
Μαζική εισαγωγή μετρήσεων.

**Request Body:**
```json
{
  "readings": [
    {
      "apartment": 1,
      "reading_date": "2024-01-15",
      "current_value": "1000.50",
      "previous_value": "950.25"
    },
    {
      "apartment": 2,
      "reading_date": "2024-01-15",
      "current_value": "1200.75",
      "previous_value": "1150.50"
    }
  ]
}
```

### GET /meter-readings/statistics/
Λαμβάνει στατιστικά μετρήσεων.

**Response:**
```json
{
  "total_consumption": "150.25",
  "average_consumption": "75.13",
  "apartment_consumption": [
    {
      "apartment": "A1",
      "consumption": "50.25"
    },
    {
      "apartment": "A2",
      "consumption": "100.00"
    }
  ]
}
```

### GET /meter-readings/{id}/
Λαμβάνει λεπτομέρειες συγκεκριμένης μετρήσης.

### PUT /meter-readings/{id}/
Ενημερώνει υπάρχουσα μετρήση.

### DELETE /meter-readings/{id}/
Διαγράφει μετρήση.

---

## 📈 Dashboard

### GET /dashboard/
Λαμβάνει γενική κατάσταση οικονομικών.

**Response:**
```json
{
  "total_expenses": "5000.00",
  "total_payments": "3000.00",
  "current_reserve": "10000.00",
  "total_apartments": 10,
  "apartments_with_balance": 7,
  "apartments_with_debt": 3,
  "recent_transactions": [
    {
      "id": 1,
      "type": "EXPENSE",
      "amount": "1000.00",
      "description": "Λογαριασμός Ηλεκτρικού",
      "date": "2024-01-15"
    }
  ],
  "monthly_trends": {
    "expenses": [1000, 1200, 800, 1500],
    "payments": [800, 1000, 900, 1200],
    "months": ["Oct", "Nov", "Dec", "Jan"]
  }
}
```

---

## 🧮 Common Expenses (Κοινοχρήστων)

### POST /common-expenses/calculate/
Υπολογίζει μερίδια κοινοχρήστων.

**Request Body:**
```json
{
  "amount": "1000.00",
  "distribution_type": "EQUAL",
  "date": "2024-01-15"
}
```

**Response:**
```json
{
  "total_amount": "1000.00",
  "distribution_type": "EQUAL",
  "shares": [
    {
      "apartment": "A1",
      "apartment_id": 1,
      "amount": "250.00",
      "percentage": "25.00"
    },
    {
      "apartment": "A2",
      "apartment_id": 2,
      "amount": "250.00",
      "percentage": "25.00"
    }
  ]
}
```

### POST /common-expenses/issue/
Εκδίδει κοινοχρήστων.

**Request Body:**
```json
{
  "title": "Κοινοχρήστων Ιανουαρίου",
  "amount": "1000.00",
  "distribution_type": "EQUAL",
  "date": "2024-01-15",
  "description": "Μηνιαίος κοινοχρήστων"
}
```

---

## 🏠 Apartment Balances (Καταστάσεις Διαμερισμάτων)

### GET /apartment-balances/
Λαμβάνει καταστάσεις όλων των διαμερισμάτων.

**Response:**
```json
[
  {
    "apartment": "A1",
    "apartment_id": 1,
    "current_balance": "500.00",
    "participation_mills": "100.00",
    "total_expenses": "1000.00",
    "total_payments": "1500.00",
    "last_payment_date": "2024-01-15"
  }
]
```

### GET /apartment-balances/{apartment_id}/
Λαμβάνει λεπτομερή κατάσταση διαμερίσματος.

**Response:**
```json
{
  "apartment": "A1",
  "apartment_id": 1,
  "current_balance": "500.00",
  "participation_mills": "100.00",
  "expense_history": [
    {
      "id": 1,
      "title": "Λογαριασμός Ηλεκτρικού",
      "amount": "250.00",
      "date": "2024-01-15"
    }
  ],
  "payment_history": [
    {
      "id": 1,
      "amount": "300.00",
      "date": "2024-01-15",
      "payment_method": "CASH"
    }
  ]
}
```

---

## 📊 Reports (Αναφορές)

### GET /reports/expense-summary/
Αναφορά σύνοψης δαπανών.

**Parameters:**
- `date_from` (optional): Ημερομηνία από
- `date_to` (optional): Ημερομηνία έως
- `category` (optional): Κατηγορία

**Response:**
```json
{
  "period": "2024-01-01 to 2024-01-31",
  "total_expenses": "5000.00",
  "expenses_by_category": [
    {
      "category": "ELECTRICITY",
      "amount": "2000.00",
      "percentage": "40.00"
    }
  ],
  "expenses_by_month": [
    {
      "month": "2024-01",
      "amount": "5000.00"
    }
  ]
}
```

### GET /reports/payment-summary/
Αναφορά σύνοψης πληρωμών.

### GET /reports/consumption-analysis/
Αναφορά ανάλυσης κατανάλωσης.

### POST /reports/export/
Εξαγωγή αναφοράς σε PDF/Excel.

**Request Body:**
```json
{
  "report_type": "expense_summary",
  "format": "pdf",
  "date_from": "2024-01-01",
  "date_to": "2024-01-31"
}
```

---

## 🔍 Search & Filters

### GET /search/
Γενική αναζήτηση σε όλα τα οικονομικά δεδομένα.

**Parameters:**
- `q` (required): Όρος αναζήτησης
- `type` (optional): Τύπος (expenses, payments, meter_readings)

**Response:**
```json
{
  "expenses": [...],
  "payments": [...],
  "meter_readings": [...],
  "total_results": 15
}
```

---

## ⚠️ Error Handling

Όλα τα endpoints επιστρέφουν κατάλληλα HTTP status codes:

- `200 OK`: Επιτυχής αίτηση
- `201 Created`: Δημιουργία επιτυχής
- `400 Bad Request`: Λάθος δεδομένα
- `401 Unauthorized`: Μη εξουσιοδοτημένη πρόσβαση
- `403 Forbidden`: Απαγορευμένη πρόσβαση
- `404 Not Found`: Δεν βρέθηκε
- `500 Internal Server Error`: Σφάλμα διακομιστή

**Error Response Format:**
```json
{
  "error": "Validation error",
  "message": "Invalid amount provided",
  "details": {
    "amount": ["Amount must be positive"]
  }
}
```

---

## 📝 Examples

### Δημιουργία Δαπάνης
```bash
curl -X POST https://your-domain.com/api/financial/expenses/ \
  -H "Authorization: Token your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Λογαριασμός Ηλεκτρικού",
    "amount": "1000.00",
    "category": "ELECTRICITY",
    "distribution_type": "EQUAL",
    "date": "2024-01-15",
    "description": "Μηνιαίος λογαριασμός"
  }'
```

### Εγγραφή Πληρωμής
```bash
curl -X POST https://your-domain.com/api/financial/payments/ \
  -H "Authorization: Token your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment": 1,
    "amount": "300.00",
    "payment_method": "CASH",
    "date": "2024-01-15",
    "description": "Μηνιαία πληρωμή"
  }'
```

### Εισαγωγή Μετρήσεων
```bash
curl -X POST https://your-domain.com/api/financial/meter-readings/ \
  -H "Authorization: Token your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment": 1,
    "reading_date": "2024-01-15",
    "current_value": "1000.50",
    "previous_value": "950.25"
  }'
```

---

## 🔧 Rate Limiting

Το API έχει rate limiting για την προστασία από κατάχρηση:

- **100 requests per minute** ανά user
- **1000 requests per hour** ανά user

---

## 📞 Support

Για τεχνική υποστήριξη ή ερωτήσεις σχετικά με το API:

- **Email**: support@your-domain.com
- **Documentation**: https://your-domain.com/docs/api
- **Status Page**: https://status.your-domain.com

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Maintainer**: Financial System Team 