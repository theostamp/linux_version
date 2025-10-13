# 🔥 Testing Guide - Προστασία του Production System

## 📋 Γιατί Tests;

**ΑΠΑΝΤΗΣΗ:** Γιατί τα bugs στο financial system κοστίζουν!

- ❌ Λάθος υπολογισμός οφειλών → Χάσιμο χρημάτων
- ❌ Λάθος μεταφορά balances → Ενοίκοι χρεώνονται λάθος
- ❌ Regressions που δεν πιάνονται → Production downtime

## 🎯 Τι Ελέγχουν τα Tests;

### ✅ Test 1: Carry Forward (Αθροιστική Μεταφορά)
```
Scenario:
- Οκτώβριος: €1080 → Carry: €1080
- Νοέμβριος: €1080 → Carry: €2160 (αθροιστικό!)
- Δεκέμβριος: €1080 → Carry: €3240 (αθροιστικό!)

ΑΝ FAIL → Οι οφειλές δεν μεταφέρονται σωστά!
```

### ✅ Test 2: Previous Obligations Transfer
```
Ελέγχει ότι οι παλαιότερες οφειλές εμφανίζονται σωστά στο API

ΑΝ FAIL → Οι ενοίκοι δεν βλέπουν τι οφείλουν!
```

### ✅ Test 3: Apartment Balances Sum
```
Ελέγχει ότι άθροισμα διαμερισμάτων = συνολικό balance

ΑΝ FAIL → Τα ποσά δεν κλείνουν!
```

---

## 🚀 Πώς να Τρέξεις Tests;

### **Οπuση 1: Manual Run**
```bash
cd /home/theo/project/linux_version
docker exec linux_version-backend-1 python /app/run_critical_tests.py
```

### **Επιλογή 2: Pre-Commit Script**
```bash
cd /home/theo/project/linux_version
chmod +x run_tests_before_commit.sh
./run_tests_before_commit.sh
```

### **Επιλογή 3: Git Hook (Auto-run πριν commit)**
```bash
# Setup (one-time)
cd /home/theo/project
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
cd linux_version
./run_tests_before_commit.sh
EOF

chmod +x .git/hooks/pre-commit

# Από εδώ και πέρα, κάθε commit θα τρέχει tests αυτόματα!
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

Το `.github/workflows/financial-tests.yml` τρέχει αυτόματα:
- ✅ Σε κάθε push στο `main` ή `develop`
- ✅ Σε κάθε Pull Request
- ✅ **Μπλοκάρει το merge αν τα tests fail!**

---

## 📊 Πότε να Τρέχεις Tests;

### **Level 1: Πριν το Commit** ⚡ (5-30 sec)
```bash
./run_tests_before_commit.sh
```
- Τρέχει μόνο critical tests
- Γρήγορο feedback loop

### **Level 2: Μετά το Push** 🔧 (2-5 min)
```
GitHub Actions τρέχουν αυτόματα
```
- Full test suite
- Integration tests
- **Μπλοκάρει το merge αν fail**

### **Level 3: Πριν το Deployment** 🚀 (10-30 min)
```bash
# Run όλα τα tests + manual verification
docker exec linux_version-backend-1 python manage.py test
```
- E2E tests
- Load tests
- Manual smoke tests

---

## ❓ FAQ

### "Είναι υπερβολικό να τρέχω tests κάθε φορά;"

**❌ ΟΧΙ!** Είναι **standard practice**!

- Facebook: Tests τρέχουν σε **κάθε commit**
- Google: Tests τρέχουν **1000s of times/day**
- Το σύστημά σου: Tests **σώζουν λεφτά και reputation**

### "Πόσο χρόνο θα μου πάρει;"

- **Manual run:** 10 δευτερόλεπτα
- **Pre-commit hook:** 30 δευτερόλεπτα (1 φορά πριν commit)
- **CI/CD:** 0 δευτερόλεπτα (τρέχει αυτόματα στο background)

### "Τι κάνω αν τα tests fail;"

1. **ΜΗΝ ΚΑΝΕΙΣ COMMIT/DEPLOY!**
2. Διάβασε το error message
3. Διόρθωσε το πρόβλημα
4. Τρέξε tests ξανά
5. Commit μόνο όταν περάσουν ✅

---

## 🎯 Best Practices

### ✅ DO:
- Τρέχε tests πριν κάθε commit
- Τρέχε tests πριν κάθε deployment
- Διόρθωνε failing tests **ΑΜΕΣΑ**
- Γράψε νέα tests για κάθε bug που βρίσκεις

### ❌ DON'T:
- Μην κάνεις commit αν τα tests fail
- Μην deploy αν τα tests fail
- Μην ignore test failures ("θα το φτιάξω αργότερα")
- Μην διαγράψεις tests που σε ενοχλούν

---

## 📚 Resources

- **Critical Tests:** `/backend/run_critical_tests.py`
- **Pre-Commit Script:** `/run_tests_before_commit.sh`
- **GitHub Actions:** `/.github/workflows/financial-tests.yml`
- **This Guide:** `/TESTING_GUIDE.md`

---

## 🆘 Support

Αν τα tests fail και δεν ξέρεις γιατί:
1. Διάβασε το error message προσεκτικά
2. Τρέξε το test με `-v 2` για verbose output
3. Check τα logs: `docker logs linux_version-backend-1`
4. Ρώτησε τον AI assistant! 🤖

---

**💡 Remember:** Tests = Insurance Policy για το production system!


