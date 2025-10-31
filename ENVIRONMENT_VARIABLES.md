# Environment Variables Configuration

## 🔐 Production Environment Variables

Το σύστημα χρησιμοποιεί environment variables για όλες τις παραμετροποιήσεις. **Δεν υπάρχουν hard-coded credentials ή sensitive data στον κώδικα**.

### Required Variables (Production)

#### Ultra Admin User
```bash
ULTRA_ADMIN_EMAIL=your-admin@email.com  # Default: theostam1966@gmail.com
ULTRA_ADMIN_PASSWORD=your-secure-password  # Default: theo123!@#
ULTRA_ADMIN_FIRST_NAME=Admin  # Optional, defaults to "Theo"
ULTRA_ADMIN_LAST_NAME=User     # Optional, defaults to "Ultra Admin"
```

**Περιγραφή:** Δημιουργεί τον Ultra-Superuser στο public schema. Αν δεν οριστεί, θα χρησιμοποιηθούν τα default values για backward compatibility.

### Optional Variables

#### Production User Fixes
```bash
ENABLE_PRODUCTION_USER_FIXES=false  # true/false
PRODUCTION_USERS_TO_FIX=email1:first1:last1:role1,email2:first2:last2:role2
```

**Περιγραφή:** 
- `ENABLE_PRODUCTION_USER_FIXES`: Ενεργοποιεί την αυτόματη διόρθωση χρηστών παραγωγής
- `PRODUCTION_USERS_TO_FIX`: Λίστα χρηστών προς διόρθωση (format: `email:first_name:last_name:role`)

**Προσοχή:** Σε παραγωγική φάση, αυτό θα πρέπει να είναι `false` εκτός αν υπάρχει συγκεκριμένος λόγος.

#### Demo Data
```bash
ENABLE_DEMO_DATA=true  # Default: true (για demo κτίριο)
```

**Περιγραφή:** Ενεργοποιεί τη δημιουργία demo tenant και demo δεδομένων. **Default είναι `true` για demo κτίριο**.

---

## 📋 Railway Configuration

Για Railway deployment, προσθέστε τα environment variables στο Railway dashboard:

1. Μεταβείτε στο project → Variables
2. Προσθέστε:
   ```
   ULTRA_ADMIN_EMAIL=your-admin@email.com
   ULTRA_ADMIN_PASSWORD=your-secure-password
   ENABLE_PRODUCTION_USER_FIXES=false
   ENABLE_DEMO_DATA=false
   ```

---

## 🧪 Local Development

Για local development, μπορείτε να δημιουργήσετε ένα `.env` file στο `backend/` directory:

```bash
# .env file
ULTRA_ADMIN_EMAIL=admin@localhost
ULTRA_ADMIN_PASSWORD=dev123456
ULTRA_ADMIN_FIRST_NAME=Dev
ULTRA_ADMIN_LAST_NAME=Admin

# Enable demo data for development
ENABLE_DEMO_DATA=true

# Enable user fixes for development (optional)
ENABLE_PRODUCTION_USER_FIXES=false
```

---

## 🔒 Security Best Practices

1. **Μην ορίζετε hard-coded credentials στον κώδικα**
2. **Χρησιμοποιείτε environment variables για όλα τα sensitive data**
3. **Σε παραγωγή, απενεργοποιήστε demo data** (`ENABLE_DEMO_DATA=false`)
4. **Σε παραγωγή, απενεργοποιήστε user fixes** (`ENABLE_PRODUCTION_USER_FIXES=false`) εκτός αν χρειάζεται
5. **Χρησιμοποιείτε ισχυρά passwords για ULTRA_ADMIN_PASSWORD**
6. **Μην commit-άρετε `.env` files στο git**

---

## 📝 Summary

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ULTRA_ADMIN_EMAIL` | No | `theostam1966@gmail.com` | Ultra admin email |
| `ULTRA_ADMIN_PASSWORD` | No | `theo123!@#` | Ultra admin password |
| `ULTRA_ADMIN_FIRST_NAME` | No | "Theo" | Ultra admin first name |
| `ULTRA_ADMIN_LAST_NAME` | No | "Ultra Admin" | Ultra admin last name |
| `ENABLE_PRODUCTION_USER_FIXES` | No | `true` | Enable production user fixes (auto-fixes email verification, subscriptions) |
| `PRODUCTION_USERS_TO_FIX` | No | - | Comma-separated list of users to fix |
| `ENABLE_DEMO_DATA` | No | `true` | Enable demo data creation (default: true για demo κτίριο) |

---

## ✅ Verification

Για να ελέγξετε ότι δεν υπάρχουν hard-coded δεδομένα:

```bash
cd linux_version/backend
python3 scripts/check_hardcoded_data.py
```

Αυτό το script θα ελέγξει για:
- Hard-coded emails
- Hard-coded passwords
- Hard-coded production credentials
- Demo data που δεν είναι παραμετροποιημένο

---

## 🚀 Migration Guide

Αν έχετε hard-coded credentials σε παλιά deployment:

1. Ορίστε τα environment variables στο Railway/Vercel
2. Κάντε redeploy
3. Το σύστημα θα χρησιμοποιήσει τα environment variables αυτόματα

**Δεν χρειάζεται manual intervention** - όλα γίνονται αυτόματα κατά το deployment.

