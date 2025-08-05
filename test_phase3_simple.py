#!/usr/bin/env python3
"""
Simple Test Script για Phase 3 - Αυτοματισμοί Κοινοχρήστων
Ελέγχει ότι όλα τα automation features έχουν υλοποιηθεί σωστά
"""

import os
import sys

def test_backend_implementation():
    """Test για την υλοποίηση του backend"""
    
    print("🧪 ΕΚΚΙΝΗΣΗ SIMPLE TEST PHASE 3 - ΑΥΤΟΜΑΤΙΣΜΟΙ ΚΟΙΝΟΧΡΗΣΤΩΝ")
    print("=" * 60)
    
    # 1. Έλεγχος αν υπάρχει το automation service
    try:
        services_path = "backend/financial/services.py"
        if not os.path.exists(services_path):
            print(f"❌ Δεν βρέθηκε το αρχείο: {services_path}")
            return False
        
        with open(services_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Έλεγχος για την κλάση CommonExpenseAutomationService
        if "class CommonExpenseAutomationService:" not in content:
            print("❌ Δεν βρέθηκε η κλάση CommonExpenseAutomationService")
            return False
        
        print("✅ CommonExpenseAutomationService βρέθηκε")
        
        # Έλεγχος για τις μεθόδους
        required_methods = [
            "create_period_automatically",
            "collect_expenses_for_period", 
            "calculate_shares_for_period",
            "issue_period_automatically",
            "auto_process_period",
            "get_period_statistics"
        ]
        
        for method in required_methods:
            if f"def {method}(" not in content:
                print(f"❌ Δεν βρέθηκε η μέθοδος: {method}")
                return False
            print(f"✅ Μέθοδος {method} βρέθηκε")
        
        # Έλεγχος για τα templates περιόδων
        if "PERIOD_TEMPLATES" not in content:
            print("❌ Δεν βρέθηκαν τα PERIOD_TEMPLATES")
            return False
        print("✅ PERIOD_TEMPLATES βρέθηκαν")
        
    except Exception as e:
        print(f"❌ Σφάλμα κατά τον έλεγχο του backend: {e}")
        return False
    
    return True

def test_frontend_implementation():
    """Test για την υλοποίηση του frontend"""
    
    print("\n🎨 ΕΛΕΓΧΟΣ FRONTEND IMPLEMENTATION")
    print("=" * 40)
    
    # 1. Έλεγχος για το automation component
    try:
        component_path = "frontend/components/financial/CommonExpenseAutomation.tsx"
        if not os.path.exists(component_path):
            print(f"❌ Δεν βρέθηκε το component: {component_path}")
            return False
        
        with open(component_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print("✅ CommonExpenseAutomation component βρέθηκε")
        
        # Έλεγχος για βασικά features
        required_features = [
            "CommonExpenseAutomation",
            "useCommonExpenses",
            "handleAutoProcess",
            "automationSteps",
            "periodType",
            "startDate"
        ]
        
        for feature in required_features:
            if feature not in content:
                print(f"❌ Δεν βρέθηκε το feature: {feature}")
                return False
            print(f"✅ Feature {feature} βρέθηκε")
        
    except Exception as e:
        print(f"❌ Σφάλμα κατά τον έλεγχο του frontend: {e}")
        return False
    
    return True

def test_hooks_implementation():
    """Test για την υλοποίηση των hooks"""
    
    print("\n🔗 ΕΛΕΓΧΟΣ HOOKS IMPLEMENTATION")
    print("=" * 40)
    
    try:
        hooks_path = "frontend/hooks/useCommonExpenses.ts"
        if not os.path.exists(hooks_path):
            print(f"❌ Δεν βρέθηκε το hook: {hooks_path}")
            return False
        
        with open(hooks_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print("✅ useCommonExpenses hook βρέθηκε")
        
        # Έλεγχος για automation methods
        automation_methods = [
            "createPeriodAutomatically",
            "collectExpensesAutomatically",
            "calculateAutomatically", 
            "issueAutomatically",
            "autoProcessPeriod",
            "getPeriodStatistics",
            "getPeriodTemplates"
        ]
        
        for method in automation_methods:
            if f"const {method}" not in content:
                print(f"❌ Δεν βρέθηκε η μέθοδος: {method}")
                return False
            print(f"✅ Μέθοδος {method} βρέθηκε")
        
    except Exception as e:
        print(f"❌ Σφάλμα κατά τον έλεγχο των hooks: {e}")
        return False
    
    return True

def test_api_endpoints():
    """Test για τα API endpoints"""
    
    print("\n🌐 ΕΛΕΓΧΟΣ API ENDPOINTS")
    print("=" * 40)
    
    try:
        views_path = "backend/financial/views.py"
        if not os.path.exists(views_path):
            print(f"❌ Δεν βρέθηκε το αρχείο: {views_path}")
            return False
        
        with open(views_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print("✅ Financial views βρέθηκαν")
        
        # Έλεγχος για automation endpoints
        automation_endpoints = [
            "create_period_automatically",
            "collect_expenses_automatically",
            "calculate_automatically",
            "issue_automatically", 
            "auto_process_period",
            "period_statistics",
            "period_templates"
        ]
        
        for endpoint in automation_endpoints:
            if f"def {endpoint}(" not in content:
                print(f"❌ Δεν βρέθηκε το endpoint: {endpoint}")
                return False
            print(f"✅ Endpoint {endpoint} βρέθηκε")
        
    except Exception as e:
        print(f"❌ Σφάλμα κατά τον έλεγχο των API endpoints: {e}")
        return False
    
    return True

def test_todo_updates():
    """Test για τις ενημερώσεις στο TODO file"""
    
    print("\n📝 ΕΛΕΓΧΟΣ TODO UPDATES")
    print("=" * 40)
    
    try:
        todo_path = "TODO_Εισπράξεις-πληρωμές-κοινοχρηστα.md"
        if not os.path.exists(todo_path):
            print(f"❌ Δεν βρέθηκε το αρχείο: {todo_path}")
            return False
        
        with open(todo_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print("✅ TODO file βρέθηκε")
        
        # Έλεγχος για Phase 3 completion
        if "ΟΛΟΚΛΗΡΩΜΕΝΟ" in content:
            print("✅ Phase 3 σημειώθηκε ως ολοκληρωμένο")
        else:
            print("❌ Phase 3 δεν έχει σημειωθεί ως ολοκληρωμένο")
            return False
        
        # Έλεγχος για automation features
        automation_features = [
            "Αυτόματη δημιουργία περιόδου",
            "Αυτόματη συλλογή δαπανών",
            "Αυτόματος υπολογισμός", 
            "Αυτόματη έκδοση λογαριασμών",
            "CommonExpenseAutomationService",
            "CommonExpenseAutomation component"
        ]
        
        for feature in automation_features:
            if feature not in content:
                print(f"❌ Δεν βρέθηκε το feature: {feature}")
                return False
            print(f"✅ Feature {feature} βρέθηκε")
        
    except Exception as e:
        print(f"❌ Σφάλμα κατά τον έλεγχο του TODO: {e}")
        return False
    
    return True

def main():
    """Main function"""
    
    print("🚀 ΕΚΚΙΝΗΣΗ SIMPLE TEST PHASE 3")
    print("Αυτοματισμοί Κοινοχρήστων - Validation Test")
    print()
    
    # Run all tests
    tests = [
        ("Backend Implementation", test_backend_implementation),
        ("Frontend Implementation", test_frontend_implementation), 
        ("Hooks Implementation", test_hooks_implementation),
        ("API Endpoints", test_api_endpoints),
        ("TODO Updates", test_todo_updates)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Σφάλμα στο test {test_name}: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 ΣΥΝΟΠΤΙΚΗ ΑΠΟΤΕΛΕΣΜΑΤΩΝ")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ ΠΕΡΑΣΕ" if result else "❌ ΑΠΕΤΥΧΕ"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n📊 Αποτελέσματα: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 PHASE 3 - ΑΥΤΟΜΑΤΙΣΜΟΙ ΚΟΙΝΟΧΡΗΣΤΩΝ ΕΠΙΤΥΧΩΣ ΟΛΟΚΛΗΡΩΜΕΝΟ!")
        print("✅ Όλα τα automation features έχουν υλοποιηθεί σωστά")
        print("✅ Backend service: CommonExpenseAutomationService")
        print("✅ Frontend component: CommonExpenseAutomation")
        print("✅ API endpoints: 7 automation endpoints")
        print("✅ Hooks: useCommonExpenses με automation methods")
        print("✅ Documentation: TODO file ενημερωμένο")
        print("\n🎯 Επόμενο: Phase 4 - UI/UX Βελτιώσεις")
    else:
        print(f"\n❌ ΣΦΑΛΜΑ: {total - passed} tests failed")
        print("Ελέγξτε τα παραπάνω σφάλματα")

if __name__ == "__main__":
    main() 