# Πώς Λειτουργεί το Invitation System - Πρακτική Εξήγηση

## 🎯 Στόχος

Να επιτρέπει στον **Admin/Manager** να προσκαλεί **Residents** ή **Internal Managers** να εγγραφούν στην εφαρμογή και να τους δώσει πρόσβαση σε συγκεκριμένο κτίριο.

---

## 📋 Πλήρης Flow (Step-by-Step)

### **ΒΗΜΑ 1: Ο Admin Δημιουργεί Invitation**

#### Πώς γίνεται (Backend):
```python
# Admin κάνει POST request στο /api/users/invite/
POST /api/users/invite/
{
  "email": "thodoris_st@hotmail.com",
  "first_name": "Θεοδώρος",
  "last_name": "Σταματιάδης",
  "building_id": 1,
  "assigned_role": "resident"  # ή "internal_manager"
}
```

#### Τι συμβαίνει:
1. **Έλεγχος Permissions**: Μόνο Managers μπορούν να δημιουργούν invitations
2. **Έλεγχος Duplicates**: Αν υπάρχει ήδη pending invitation για αυτό το email → Error
3. **Δημιουργία Invitation Record**:
   ```python
   UserInvitation.objects.create(
       email="thodoris_st@hotmail.com",
       first_name="Θεοδώρος",
       last_name="Σταματιάδης",
       building_id=1,
       assigned_role="resident",
       invited_by=admin_user,
       token=UUID(),  # Μοναδικό token
       expires_at=now() + 7 days
   )
   ```
4. **Αποστολή Email**: Στέλνεται email με link που περιέχει το token

---

### **ΒΗΜΑ 2: Το Email που Παίρνει ο Ένοικος**

#### Περιεχόμενο Email:
```
Subject: Πρόσκληση στο New Concierge

Γεια σας Θεοδώρος,

Ο/Η [Admin Name] σας προσκαλεί να συμμετάσχετε στο New Concierge.
Κτίριο: Αλκμάνος 22
Ρόλος: Resident

Για να αποδεχτείτε την πρόσκληση, κάντε κλικ στον παρακάτω σύνδεσμο:
https://app.newconcierge.app/accept-invitation?token=abc123xyz...

Αυτή η πρόσκληση θα λήξει στις 02/12/2025 14:30.
```

#### Το Link:
```
https://app.newconcierge.app/accept-invitation?token=abc123xyz...
```

---

### **ΒΗΜΑ 3: Ο Ένοικος Κάνει Κλικ στο Link**

#### Frontend Flow (`/accept-invitation` page):

1. **Το Frontend παίρνει το token** από το URL:
   ```typescript
   const token = searchParams.get('token'); // "abc123xyz..."
   ```

2. **Κάνει POST request στο Backend**:
   ```typescript
   POST /api/users/accept-invitation/
   {
     "token": "abc123xyz...",
     "password": "secure_password_123"
   }
   ```

---

### **ΒΗΜΑ 4: Το Backend Επεξεργάζεται την Αποδοχή**

#### Τι συμβαίνει στο Backend (`accept_invitation()`):

1. **Εύρεση Invitation**:
   ```python
   invitation = UserInvitation.objects.get(token=token, status='pending')
   ```

2. **Έλεγχος Expiration**:
   ```python
   if invitation.is_expired:
       invitation.expire()  # Mark as expired
       raise ValueError("Η πρόσκληση έχει λήξει")
   ```

3. **Δημιουργία User Account**:
   ```python
   user = CustomUser.objects.create_user(
       email=invitation.email,  # "thodoris_st@hotmail.com"
       password=password,        # Hashed password
       first_name=invitation.first_name,
       last_name=invitation.last_name,
       is_active=True,
       email_verified=True  # Auto-verified (invited users)
   )
   ```

4. **Ανάθεση Role (αν υπάρχει)**:
   ```python
   if invitation.assigned_role:
       group = Group.objects.get(name=invitation.assigned_role)
       user.groups.add(group)  # Προσθήκη σε RBAC group
   ```

5. **Δημιουργία Building Membership**:
   ```python
   if invitation.building_id:
       building = Building.objects.get(id=invitation.building_id)
       BuildingMembership.objects.create(
           user=user,
           building=building,
           role='resident'  # ⚠️ PROBLEM: Hardcoded, δεν χρησιμοποιεί assigned_role
       )
   ```

6. **Mark Invitation as Accepted**:
   ```python
   invitation.accept(user)  # Status = 'accepted', created_user = user
   ```

7. **Αποστολή Welcome Email**:
   ```python
   EmailService.send_welcome_email(user)
   ```

---

### **ΒΗΜΑ 5: Redirect στο Dashboard**

#### Frontend:
```typescript
// Αποθήκευση tokens
localStorage.setItem('access_token', response.access);
localStorage.setItem('refresh_token', response.refresh);

// Redirect στο dashboard
window.location.href = '/dashboard';
```

---

## 🔄 Ολικό Flow Diagram

```
┌─────────────┐
│   Admin     │
│  (Manager)  │
└──────┬──────┘
       │
       │ POST /api/users/invite/
       │ { email, building_id, assigned_role }
       ▼
┌─────────────────────┐
│  Backend API        │
│  - Create Invitation│
│  - Generate Token   │
│  - Send Email       │
└──────┬──────────────┘
       │
       │ Email με link
       ▼
┌─────────────┐
│   Ένοικος   │
│  (Email)    │
└──────┬──────┘
       │
       │ Κλικ στο link
       │ /accept-invitation?token=...
       ▼
┌─────────────────────┐
│  Frontend Page      │
│  /accept-invitation │
│  - Extract token    │
│  - POST to backend  │
└──────┬──────────────┘
       │
       │ POST /api/users/accept-invitation/
       │ { token, password }
       ▼
┌─────────────────────┐
│  Backend Service    │
│  - Verify token     │
│  - Create User      │
│  - Create Membership│
│  - Assign Role      │
└──────┬──────────────┘
       │
       │ Success Response
       │ { access_token, refresh_token }
       ▼
┌─────────────────────┐
│  Frontend           │
│  - Save tokens      │
│  - Redirect         │
└──────┬──────────────┘
       │
       ▼
┌─────────────┐
│  Dashboard  │
│  (Logged in)│
└─────────────┘
```

---

## 📊 Database Changes

### Πριν την Αποδοχή:
```sql
-- UserInvitation table
id: 123
email: "thodoris_st@hotmail.com"
first_name: "Θεοδώρος"
last_name: "Σταματιάδης"
building_id: 1
assigned_role: "resident"
status: "pending"
token: "abc123xyz..."
expires_at: "2025-12-02 14:30:00"
invited_by_id: 5  -- Admin user ID
```

### Μετά την Αποδοχή:
```sql
-- CustomUser table (ΝΕΟΣ ΧΡΗΣΤΗΣ)
id: 456
email: "thodoris_st@hotmail.com"
first_name: "Θεοδώρος"
last_name: "Σταματιάδης"
password: "$2b$12$..."  -- Hashed
is_active: true
email_verified: true
role: null  -- ⚠️ Δεν ορίζεται από assigned_role

-- BuildingMembership table (ΝΕΟ MEMBERSHIP)
id: 789
user_id: 456
building_id: 1
role: "resident"  -- ⚠️ Hardcoded, δεν χρησιμοποιεί assigned_role
apartment: ""

-- UserInvitation table (UPDATED)
id: 123
status: "accepted"  -- Changed from "pending"
accepted_at: "2025-11-25 15:30:00"
created_user_id: 456  -- Link to created user
```

---

## ⚠️ Προβλήματα που Υπάρχουν

### 1. **Hardcoded Role στο Building Membership**
```python
# Current (WRONG):
BuildingMembership.objects.create(
    user=user,
    building=building,
    role='resident'  # ⚠️ Πάντα 'resident', ακόμα και αν assigned_role='internal_manager'
)

# Should be:
BuildingMembership.objects.create(
    user=user,
    building=building,
    role=invitation.assigned_role or 'resident'  # ✅ Χρήση assigned_role
)
```

### 2. **Δεν Ορίζεται User.role**
```python
# Current:
user = CustomUser.objects.create_user(...)
# user.role = None  ⚠️

# Should be:
user = CustomUser.objects.create_user(...)
if invitation.assigned_role:
    user.role = invitation.assigned_role  # ✅ Set role
    user.save()
```

### 3. **Δεν Ορίζεται building.internal_manager**
```python
# Αν assigned_role='internal_manager', πρέπει:
if invitation.assigned_role == 'internal_manager' and building:
    building.internal_manager = user
    building.save()
```

---

## 🎯 Πρακτικό Παράδειγμα

### Σενάριο: Admin προσκαλεί Internal Manager

1. **Admin Action**:
   ```
   POST /api/users/invite/
   {
     "email": "maria@example.com",
     "first_name": "Μαρία",
     "last_name": "Κωνσταντίνου",
     "building_id": 1,
     "assigned_role": "internal_manager"
   }
   ```

2. **Email Sent**:
   ```
   To: maria@example.com
   Subject: Πρόσκληση στο New Concierge
   Link: /accept-invitation?token=xyz789...
   ```

3. **Maria Κάνει Κλικ**:
   - Ανοίγει `/accept-invitation?token=xyz789...`
   - Εισάγει password
   - Κάνει submit

4. **Backend Δημιουργεί**:
   - ✅ User account (maria@example.com)
   - ⚠️ BuildingMembership με role='resident' (WRONG - θα έπρεπε 'internal_manager')
   - ❌ Δεν ορίζει building.internal_manager = user

5. **Αποτέλεσμα**:
   - ✅ User μπορεί να login
   - ⚠️ Έχει role='resident' αντί για 'internal_manager'
   - ❌ Δεν είναι internal manager του building

---

## ✅ Τι Λειτουργεί Σωστά

1. ✅ **Invitation Creation**: Admin μπορεί να δημιουργεί invitations
2. ✅ **Email Sending**: Emails στέλνονται σωστά
3. ✅ **Token Security**: Tokens είναι secure και expire
4. ✅ **User Creation**: User accounts δημιουργούνται σωστά
5. ✅ **Building Membership**: Δημιουργείται membership (αλλά με λάθος role)
6. ✅ **Frontend Flow**: Accept page λειτουργεί

---

## ❌ Τι ΔΕΝ Λειτουργεί Σωστά

1. ❌ **Role Assignment**: Δεν χρησιμοποιείται το `assigned_role` για building membership
2. ❌ **Internal Manager**: Δεν ορίζεται `building.internal_manager`
3. ❌ **User.role**: Δεν ορίζεται το `user.role` field
4. ❌ **Frontend UI**: Δεν υπάρχει UI για admin να στέλνει invitations

---

## 🔧 Τι Χρειάζεται Fix

### Backend Fixes:
1. Χρήση `assigned_role` για building membership role
2. Αν `assigned_role='internal_manager'`, ορισμός `building.internal_manager = user`
3. Ορισμός `user.role = assigned_role`

### Frontend Fixes:
1. UI component για invitation creation
2. List of sent invitations
3. Invitation management (resend, cancel)

---

**Συνολική Αξιολόγηση**: Το invitation system **λειτουργεί βασικά**, αλλά έχει **κρίσιμα bugs** που εμποδίζουν τη σωστή λειτουργία για internal managers.

