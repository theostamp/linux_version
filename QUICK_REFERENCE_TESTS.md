# 🧪 Quick Reference - Automated Tests Οικονομικού Πυρήνα

## 🚀 Γρήγορη Εκκίνηση

### 📍 Navigation Path
```
Sidebar → Σύστημα & Ελέγχοι → 🧪 Automated Tests Οικονομικού Πυρήνα
```

### ⚡ Quick Actions
| Button | Duration | Use Case |
|--------|----------|----------|
| **Backend Tests** | ~15s | Γρήγορος έλεγχος core logic |
| **Integration Tests** | ~30s | End-to-end validation |
| **Εκτέλεση Όλων** | ~60s | Comprehensive testing |

---

## 📊 Status Indicators

| Icon | Status | Action Needed |
|------|--------|--------------|
| ✅ | **Επιτυχία** | ✨ All good! |
| ⚠️ | **Προειδοποίηση** | 👀 Monitor closely |
| ❌ | **Αποτυχία** | 🚨 Investigate immediately |
| 🔄 | **Εκτέλεση** | ⏳ Wait for completion |

---

## 🎯 Test Suites Overview

### 🧮 Calculator Tests (15 tests)
- ✅ Expense calculations
- ✅ Greek apartment support
- ✅ Decimal precision

### 📊 Dashboard Tests (10 tests)
- ✅ Summary reports
- ✅ Cash flow analysis
- ✅ Performance metrics

### ⚖️ Balance Tests (8 tests)
- ✅ Transfer scenarios
- ✅ Precision handling
- ✅ Edge cases

### 📈 Distribution Tests (12 tests)
- ✅ Algorithm validation
- ✅ Conservation checks
- ✅ Multi-method support

---

## 🆘 Emergency Commands

### Backend Issues
```bash
# Restart backend
docker restart linux_version-backend-1

# Check status
docker ps | grep linux_version
```

### Test Stuck
1. Click **"Διακοπή"**
2. Wait 30 seconds
3. Restart tests

### Manual Execution
```bash
docker exec linux_version-backend-1 python /app/run_ui_financial_tests.py --type all
```

---

## 📈 Success Rate Guide

| Rate | Status | Meaning |
|------|--------|---------|
| **>95%** | 🟢 Excellent | System is rock solid |
| **90-95%** | 🟡 Good | Minor issues, monitor |
| **80-90%** | 🟠 Warning | Needs attention |
| **<80%** | 🔴 Critical | Immediate action required |

---

## ⏱️ When to Run Tests

### 📅 Daily
- Before configuration changes
- After significant updates
- When financial issues reported

### 📅 Weekly  
- Comprehensive validation
- System health check
- Pre-month-end verification

### 📅 Monthly
- Full business logic audit
- Performance validation
- Complete system review

---

## 🎯 Best Practices

### ✅ DO
- Run "Εκτέλεση Όλων" for thorough testing
- Check logs when failures occur
- Monitor success rates trends
- Test after system changes

### ❌ DON'T
- Ignore warning status
- Run during peak hours
- Skip testing after updates
- Interrupt running tests unnecessarily

---

## 📞 Quick Help

### 🔍 Troubleshooting Steps
1. **Check Status**: Look at overall success rate
2. **Review Logs**: Open logs section for details
3. **Restart**: Try stopping and restarting tests
4. **Backend**: Restart backend container if needed
5. **Contact**: Reach technical team with screenshots

### 💡 Pro Tips
- Use "Backend Tests" for quick validation
- Monitor the real-time progress indicator
- Check individual test details for specific issues
- Keep an eye on duration trends

---

*🚀 Happy Testing!*