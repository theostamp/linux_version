#!/usr/bin/env python3
"""
Έλεγχος καταχώρησης payer_responsibility στις υπάρχουσες δαπάνες.
Συγκρίνει τις τιμές με το EXPENSE_CATEGORY_DEFAULTS mapping.
"""
import os
import sys
import django
from collections import defaultdict

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from buildings.models import Building

def check_payer_responsibility():
    """Ελέγχει την καταχώρηση του payer_responsibility στις δαπάνες"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΕΛΕΓΧΟΣ ΚΑΤΑΧΩΡΗΣΗΣ: ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ vs ΙΔΙΟΚΤΗΤΩΝ")
        print("="*80 + "\n")
        
        # Στατιστικά
        stats = {
            'owner': [],
            'resident': [],
            'shared': [],
            'not_set': [],
            'wrong': []  # Διαφορετικό από το suggested
        }
        
        # Ανάλυση κατηγοριών
        category_stats = defaultdict(lambda: {'owner': 0, 'resident': 0, 'shared': 0, 'not_set': 0})
        
        # Λήψη όλων των δαπανών
        all_expenses = Expense.objects.all().order_by('date', 'category')
        total_count = all_expenses.count()
        
        if total_count == 0:
            print("❌ Δεν βρέθηκαν δαπάνες στη βάση δεδομένων!\n")
            return
        
        print(f"📊 Σύνολο δαπανών: {total_count}\n")
        
        # Ανάλυση κάθε δαπάνης
        for expense in all_expenses:
            suggested = Expense.get_default_payer_for_category(expense.category)
            actual = expense.payer_responsibility or 'not_set'
            
            # Στατιστικά
            if actual == 'not_set':
                stats['not_set'].append(expense)
            else:
                stats[actual].append(expense)
                
            category_stats[expense.category][actual] += 1
            
            # Έλεγχος αν διαφέρει από το suggested
            if actual != 'not_set' and actual != suggested:
                stats['wrong'].append({
                    'expense': expense,
                    'suggested': suggested,
                    'actual': actual
                })
        
        # ========================================
        # 1. ΣΥΝΟΠΤΙΚΑ ΣΤΑΤΙΣΤΙΚΑ
        # ========================================
        print("📈 ΣΥΝΟΠΤΙΚΑ ΣΤΑΤΙΣΤΙΚΑ:")
        print("-" * 80)
        
        resident_count = len(stats['resident'])
        owner_count = len(stats['owner'])
        shared_count = len(stats['shared'])
        not_set_count = len(stats['not_set'])
        
        print(f"✅ Ένοικος (resident):        {resident_count:4d} ({resident_count/total_count*100:5.1f}%)")
        print(f"✅ Ιδιοκτήτης (owner):        {owner_count:4d} ({owner_count/total_count*100:5.1f}%)")
        print(f"⚖️  Κοινή Ευθύνη (shared):    {shared_count:4d} ({shared_count/total_count*100:5.1f}%)")
        print(f"❌ Μη Ορισμένο (not set):    {not_set_count:4d} ({not_set_count/total_count*100:5.1f}%)")
        
        # ========================================
        # 2. ΔΑΠΑΝΕΣ ΠΟΥ ΔΙΑΦΕΡΟΥΝ ΑΠΟ ΤΟ SUGGESTED
        # ========================================
        if stats['wrong']:
            print(f"\n⚠️  ΠΡΟΣΟΧΗ: {len(stats['wrong'])} δαπάνες διαφέρουν από το suggested!")
            print("-" * 80)
            for item in stats['wrong'][:10]:  # Εμφάνιση πρώτων 10
                exp = item['expense']
                print(f"   ID: {exp.id} | {exp.date} | {exp.get_category_display()}")
                print(f"   Τίτλος: {exp.title}")
                print(f"   Suggested: {item['suggested']} → Actual: {item['actual']}")
                print(f"   Ποσό: €{exp.amount}")
                print()
            
            if len(stats['wrong']) > 10:
                print(f"   ... και {len(stats['wrong']) - 10} ακόμα\n")
        
        # ========================================
        # 3. ΔΑΠΑΝΕΣ ΜΗ ΟΡΙΣΜΕΝΕΣ
        # ========================================
        if stats['not_set']:
            print(f"\n❌ ΔΑΠΑΝΕΣ ΜΗ ΟΡΙΣΜΕΝΕΣ (not_set): {len(stats['not_set'])}")
            print("-" * 80)
            for exp in stats['not_set'][:15]:  # Εμφάνιση πρώτων 15
                suggested = Expense.get_default_payer_for_category(exp.category)
                print(f"   ID: {exp.id} | {exp.date} | {exp.get_category_display()}")
                print(f"   Τίτλος: {exp.title}")
                print(f"   Suggested: {suggested}")
                print(f"   Ποσό: €{exp.amount}")
                print()
            
            if len(stats['not_set']) > 15:
                print(f"   ... και {len(stats['not_set']) - 15} ακόμα\n")
        
        # ========================================
        # 4. ΑΝΑΛΥΣΗ ΑΝΑ ΚΑΤΗΓΟΡΙΑ
        # ========================================
        print("\n📋 ΑΝΑΛΥΣΗ ΑΝΑ ΚΑΤΗΓΟΡΙΑ:")
        print("-" * 80)
        print(f"{'Κατηγορία':<40} {'Resident':<10} {'Owner':<10} {'Shared':<10} {'Not Set':<10}")
        print("-" * 80)
        
        for category_key, counts in sorted(category_stats.items()):
            category_display = dict(Expense.EXPENSE_CATEGORIES).get(category_key, category_key)
            suggested = Expense.get_default_payer_for_category(category_key)
            
            # Highlight αν έχει not_set
            marker = "❌" if counts['not_set'] > 0 else "  "
            
            print(f"{marker}{category_display[:38]:<38} "
                  f"{counts['resident']:<10} "
                  f"{counts['owner']:<10} "
                  f"{counts['shared']:<10} "
                  f"{counts['not_set']:<10} "
                  f"(Suggested: {suggested})")
        
        # ========================================
        # 5. ΑΝΑΛΥΣΗ ΑΝΑ ΚΤΙΡΙΟ
        # ========================================
        print("\n\n🏢 ΑΝΑΛΥΣΗ ΑΝΑ ΚΤΙΡΙΟ:")
        print("-" * 80)
        
        buildings = Building.objects.all()
        for building in buildings:
            building_expenses = all_expenses.filter(building=building)
            if building_expenses.count() == 0:
                continue
            
            b_resident = building_expenses.filter(payer_responsibility='resident').count()
            b_owner = building_expenses.filter(payer_responsibility='owner').count()
            b_shared = building_expenses.filter(payer_responsibility='shared').count()
            b_not_set = building_expenses.filter(payer_responsibility__isnull=True).count() + \
                       building_expenses.filter(payer_responsibility='').count()
            b_total = building_expenses.count()
            
            print(f"\n🏢 {building.name} (ID: {building.id})")
            print(f"   Σύνολο: {b_total}")
            print(f"   ✅ Ένοικος:      {b_resident:4d} ({b_resident/b_total*100:5.1f}%)")
            print(f"   ✅ Ιδιοκτήτης:   {b_owner:4d} ({b_owner/b_total*100:5.1f}%)")
            print(f"   ⚖️  Κοινή:       {b_shared:4d} ({b_shared/b_total*100:5.1f}%)")
            print(f"   ❌ Μη Ορισμένο: {b_not_set:4d} ({b_not_set/b_total*100:5.1f}%)")
        
        # ========================================
        # 6. ΣΥΣΤΑΣΕΙΣ
        # ========================================
        print("\n\n💡 ΣΥΣΤΑΣΕΙΣ:")
        print("-" * 80)
        
        if not_set_count > 0:
            print(f"⚠️  Υπάρχουν {not_set_count} δαπάνες χωρίς payer_responsibility.")
            print("   Προτείνεται να τρέξετε migration script για auto-fill.")
        
        if stats['wrong']:
            print(f"⚠️  Υπάρχουν {len(stats['wrong'])} δαπάνες με διαφορετική τιμή από το suggested.")
            print("   Ελέγξτε αν είναι σκόπιμο override ή λάθος.")
        
        if not_set_count == 0 and not stats['wrong']:
            print("✅ Όλες οι δαπάνες έχουν καταχωρηθεί σωστά!")
        
        print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    check_payer_responsibility()

