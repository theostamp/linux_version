# 🛍️ Stripe Products Creation Guide

## 📋 Δημιουργία Προϊόντων στο Stripe Dashboard

### 🎯 **Στόχος:**
Δημιουργία 3 προϊόντων στο Stripe που αντιστοιχούν στα Django subscription plans.

### 📊 **Υπάρχοντα Django Plans:**
- **Starter Plan**: €29.00/μήνα (20 apartments, 10 users)
- **Professional Plan**: €59.00/μήνα (100 apartments, 25 users)  
- **Enterprise Plan**: €99.00/μήνα (unlimited apartments/users)

---

## 🔧 **Βήμα 1: Σύνδεση στο Stripe Dashboard**

1. Πήγαινε στο [dashboard.stripe.com](https://dashboard.stripe.com)
2. Βεβαιώσου ότι είσαι σε **Test Mode** (διακόπτης πάνω δεξιά)
3. Πήγαινε στο **Products** στο αριστερό menu

---

## 🛍️ **Βήμα 2: Δημιουργία Προϊόντων**

### 🥉 **Starter Plan**

1. Κάνε κλικ στο **"Add product"**
2. Συμπλήρωσε:
   - **Name**: `Starter Plan`
   - **Description**: `Perfect for small buildings with basic management needs. Includes essential features for building administration.`
3. Κάνε κλικ στο **"Save product"**
4. Στο **Pricing** section:
   - Κάνε κλικ στο **"Add pricing"**
   - **Price**: `29.00`
   - **Currency**: `EUR`
   - **Billing period**: `Monthly`
   - Κάνε κλικ στο **"Save pricing"**
5. **ΣΗΜΑΝΤΙΚΟ**: Αντιγράψε το **Price ID** (ξεκινάει με `price_`)

### 🥈 **Professional Plan**

1. Κάνε κλικ στο **"Add product"**
2. Συμπλήρωσε:
   - **Name**: `Professional Plan`
   - **Description**: `Advanced building management with analytics, reporting, and enhanced features for growing properties.`
3. Κάνε κλικ στο **"Save product"**
4. Στο **Pricing** section:
   - Κάνε κλικ στο **"Add pricing"**
   - **Price**: `59.00`
   - **Currency**: `EUR`
   - **Billing period**: `Monthly`
   - Κάνε κλικ στο **"Save pricing"**
5. **ΣΗΜΑΝΤΙΚΟ**: Αντιγράψε το **Price ID** (ξεκινάει με `price_`)

### 🥇 **Enterprise Plan**

1. Κάνε κλικ στο **"Add product"**
2. Συμπλήρωσε:
   - **Name**: `Enterprise Plan`
   - **Description**: `Complete solution for large property portfolios with custom integrations, white-label options, and premium support.`
3. Κάνε κλικ στο **"Save product"**
4. Στο **Pricing** section:
   - Κάνε κλικ στο **"Add pricing"**
   - **Price**: `99.00`
   - **Currency**: `EUR`
   - **Billing period**: `Monthly`
   - Κάνε κλικ στο **"Save pricing"**
5. **ΣΗΜΑΝΤΙΚΟ**: Αντιγράψε το **Price ID** (ξεκινάει με `price_`)

---

## 📝 **Βήμα 3: Σημείωση Price IDs**

Αφού δημιουργήσεις όλα τα προϊόντα, θα έχεις 3 Price IDs:

```
Starter Plan:     price_XXXXXXXXXXXXXX
Professional Plan: price_YYYYYYYYYYYYYY
Enterprise Plan:   price_ZZZZZZZZZZZZZZ
```

**ΣΗΜΑΝΤΙΚΟ**: Αυτά τα Price IDs θα τα χρειαστούμε για να συνδέσουμε τα Stripe προϊόντα με τα Django plans.

---

## 🎯 **Επόμενο Βήμα**

Μετά τη δημιουργία των προϊόντων:

1. **Αντιγράψε τα Price IDs** από το Stripe Dashboard
2. **Ενημέρωσε τα Django plans** με τα Price IDs
3. **Test τη ροή** εγγραφής → συνδρομή → πρόσβαση

---

## 💡 **Tips**

- Κράτα το Stripe Dashboard ανοιχτό για εύκολη πρόσβαση στα Price IDs
- Βεβαιώσου ότι όλα τα προϊόντα είναι σε **Test Mode**
- Τα Price IDs είναι μοναδικά και απαραίτητα για την integration

