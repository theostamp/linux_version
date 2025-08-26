#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ανάλυση και βελτίωση του Φύλλου Κοινοχρήστων Αύγουστος 2025
Οργάνωση στηλών για τρέχουσες οφειλές, αποθεματικό και παλαιότερες οφειλές
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, Payment, CommonExpensePeriod, ApartmentShare
from apartments.models import Apartment
from buildings.models import Building
from financial.services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator

def analyze_current_common_expenses_sheet():
    """Ανάλυση της τρέχουσας κατάστασης του φύλλου κοινοχρήστων"""
    
    with schema_context('demo'):
        print("🔍 ΑΝΑΛΥΣΗ ΦΥΛΛΟΥ ΚΟΙΝΟΧΡΗΣΤΩΝ ΑΥΓΟΥΣΤΟΣ 2025")
        print("=" * 60)
        
        # Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(name__icontains="Αλκμάνος")
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print(f"📅 Ημερομηνία Ανάλυσης: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        print()
        
        # Λήψη διαμερισμάτων
        apartments = Apartment.objects.filter(building=building).order_by('number')
        print(f"🏠 Συνολικά Διαμερίσματα: {apartments.count()}")
        print()
        
        # Ανάλυση τρέχουσας κατάστασης
        print("📊 ΤΡΕΧΟΥΣΑ ΚΑΤΑΣΤΑΣΗ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        print("-" * 50)
        
        total_current_balance = Decimal('0.00')
        apartments_with_debts = 0
        apartments_with_credits = 0
        
        apartment_details = []
        
        for apt in apartments:
            current_balance = apt.current_balance or Decimal('0.00')
            total_current_balance += current_balance
            
            if current_balance < 0:
                apartments_with_debts += 1
            elif current_balance > 0:
                apartments_with_credits += 1
            
            # Υπολογισμός τρέχουσας μηνιαίας οφειλής
            monthly_obligation = calculate_monthly_obligation(apt, building)
            
            # Υπολογισμός αποθεματικού
            reserve_fund_contribution = calculate_reserve_fund_contribution(apt, building)
            
            # Υπολογισμός παλαιότερων οφειλών
            historical_debts = calculate_historical_debts(apt)
            
            # Συνολικό πληρωτέο ποσό
            total_payable = monthly_obligation + reserve_fund_contribution + historical_debts
            
            apartment_detail = {
                'number': apt.number,
                'owner_name': apt.owner_name or 'Μη καταχωρημένος',
                'current_balance': current_balance,
                'monthly_obligation': monthly_obligation,
                'reserve_fund_contribution': reserve_fund_contribution,
                'historical_debts': historical_debts,
                'total_payable': total_payable,
                'participation_mills': apt.participation_mills or 0
            }
            
            apartment_details.append(apartment_detail)
            
            print(f"🏠 {apt.number}: {apt.owner_name or 'Μη καταχωρημένος'}")
            print(f"   💰 Τρέχον Υπόλοιπο: {current_balance:,.2f}€")
            print(f"   📅 Μηνιαία Οφειλή: {monthly_obligation:,.2f}€")
            print(f"   🏦 Αποθεματικό: {reserve_fund_contribution:,.2f}€")
            print(f"   📚 Παλαιότερες Οφειλές: {historical_debts:,.2f}€")
            print(f"   💳 Σύνολο Πληρωτέο: {total_payable:,.2f}€")
            print()
        
        # Στατιστικά
        print("📈 ΣΤΑΤΙΣΤΙΚΑ ΣΥΝΟΛΟΥ")
        print("-" * 30)
        print(f"💰 Συνολικό Υπόλοιπο: {total_current_balance:,.2f}€")
        print(f"📉 Διαμερίσματα με Οφειλές: {apartments_with_debts}")
        print(f"📈 Διαμερίσματα με Πιστωτικό: {apartments_with_credits}")
        print(f"⚖️ Διαμερίσματα Μηδενικό: {apartments.count() - apartments_with_debts - apartments_with_credits}")
        print()
        
        # Προτάσεις βελτίωσης
        print("💡 ΠΡΟΤΑΣΕΙΣ ΒΕΛΤΙΩΣΗΣ ΦΥΛΛΟΥ ΚΟΙΝΟΧΡΗΣΤΩΝ")
        print("=" * 60)
        
        print("🎯 ΟΡΓΑΝΩΣΗ ΣΤΗΛΩΝ:")
        print()
        print("1️⃣ ΣΤΗΛΗ: ΑΡΙΘΜΟΣ ΔΙΑΜΕΡΙΣΜΑΤΟΣ")
        print("2️⃣ ΣΤΗΛΗ: ΟΝΟΜΑΤΕΠΩΝΥΜΟ ΙΔΙΟΚΤΗΤΗ")
        print("3️⃣ ΣΤΗΛΗ: ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ")
        print("4️⃣ ΣΤΗΛΗ: ΤΡΕΧΟΥΣΑ ΜΗΝΙΑΙΑ ΟΦΕΙΛΗ")
        print("5️⃣ ΣΤΗΛΗ: ΕΙΣΦΟΡΑ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        print("6️⃣ ΣΤΗΛΗ: ΠΑΛΑΙΟΤΕΡΕΣ ΟΦΕΙΛΕΣ")
        print("7️⃣ ΣΤΗΛΗ: ΣΥΝΟΛΟ ΠΛΗΡΩΤΕΟ ΠΟΣΟ")
        print("8️⃣ ΣΤΗΛΗ: Α/Α")
        print()
        
        print("📋 ΠΡΟΤΕΙΝΟΜΕΝΗ ΔΟΜΗ ΠΙΝΑΚΑ:")
        print("-" * 40)
        
        # Εμφάνιση προτεινόμενου πίνακα
        print(f"{'Α/Δ':<8} {'ΟΝΟΜΑΤΕΠΩΝΥΜΟ':<25} {'ΧΙΛΙΟΣΤΑ':<10} {'ΜΗΝΙΑΙΑ':<10} {'ΑΠΟΘΕΜΑΤΙΚΟ':<12} {'ΠΑΛΑΙΟΤΕΡΕΣ':<12} {'ΣΥΝΟΛΟ':<12} {'A/A':<4}")
        print("-" * 100)
        
        for i, apt in enumerate(apartment_details, 1):
            print(f"{apt['number']:<8} {apt['owner_name']:<25} {apt['participation_mills']:<10} "
                  f"{apt['monthly_obligation']:<10.2f}€ {apt['reserve_fund_contribution']:<12.2f}€ "
                  f"{apt['historical_debts']:<12.2f}€ {apt['total_payable']:<12.2f}€ {i:<4}")
        
        print("-" * 100)
        
        # Υπολογισμός συνόλων
        total_monthly = sum(apt['monthly_obligation'] for apt in apartment_details)
        total_reserve = sum(apt['reserve_fund_contribution'] for apt in apartment_details)
        total_historical = sum(apt['historical_debts'] for apt in apartment_details)
        total_payable = sum(apt['total_payable'] for apt in apartment_details)
        
        print(f"{'ΣΥΝΟΛΑ':<33} {sum(apt['participation_mills'] for apt in apartment_details):<10} "
              f"{total_monthly:<10.2f}€ {total_reserve:<12.2f}€ {total_historical:<12.2f}€ {total_payable:<12.2f}€")
        print()
        
        # Επιπλέον προτάσεις
        print("🔧 ΕΠΙΠΛΕΟΝ ΒΕΛΤΙΩΣΕΙΣ:")
        print("1. Προσθήκη στήλης 'ΗΜΕΡΟΜΗΝΙΑ ΛΗΞΗΣ ΠΛΗΡΩΜΗΣ'")
        print("2. Προσθήκη στήλης 'ΚΑΤΑΣΤΑΣΗ ΠΛΗΡΩΜΗΣ' (Εκκρεμεί/Πληρώθηκε)")
        print("3. Προσθήκη στήλης 'ΠΟΝΤΟΙΚΙΑ' για ειδικές περιπτώσεις")
        print("4. Χρωματική διάκριση για διαφορετικές κατηγορίες οφειλών")
        print("5. Προσθήκη υποσημείωσης με λεπτομέρειες υπολογισμών")
        print()
        
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΑΝΑΛΥΣΗ")

def calculate_monthly_obligation(apartment, building):
    """Υπολογισμός τρέχουσας μηνιαίας οφειλής"""
    try:
        # Χρήση του CommonExpenseCalculator για τον υπολογισμό
        calculator = CommonExpenseCalculator(building.id)
        shares = calculator.calculate_shares()
        
        if apartment.id in shares:
            return shares[apartment.id]['total_amount']
        else:
            return Decimal('0.00')
    except Exception as e:
        print(f"⚠️ Σφάλμα υπολογισμού μηνιαίας οφειλής για διαμέρισμα {apartment.number}: {e}")
        return Decimal('0.00')

def calculate_reserve_fund_contribution(apartment, building):
    """Υπολογισμός εισφοράς αποθεματικού"""
    try:
        # Βασική εισφορά αποθεματικού ανά διαμέρισμα
        base_reserve_contribution = getattr(building, 'reserve_fund_per_apartment', Decimal('0.00'))
        
        # Αν υπάρχει συμμετοχή σε χιλιοστά, υπολογίζουμε αναλογικά
        if apartment.participation_mills:
            total_mills = sum(apt.participation_mills or 0 for apt in Apartment.objects.filter(building=building))
            if total_mills > 0:
                return (base_reserve_contribution * apartment.participation_mills) / total_mills
        
        return base_reserve_contribution
    except Exception as e:
        print(f"⚠️ Σφάλμα υπολογισμού αποθεματικού για διαμέρισμα {apartment.number}: {e}")
        return Decimal('0.00')

def calculate_historical_debts(apartment):
    """Υπολογισμός παλαιότερων οφειλών"""
    try:
        # Αν το τρέχον υπόλοιπο είναι αρνητικό, είναι παλαιότερη οφειλή
        current_balance = apartment.current_balance or Decimal('0.00')
        
        if current_balance < 0:
            # Υπολογίζουμε την παλαιότερη οφειλή ως το αρνητικό υπόλοιπο
            # μείον την τρέχουσα μηνιαία οφειλή (που θα υπολογιστεί ξεχωριστά)
            return abs(current_balance)
        else:
            return Decimal('0.00')
    except Exception as e:
        print(f"⚠️ Σφάλμα υπολογισμού παλαιότερων οφειλών για διαμέρισμα {apartment.number}: {e}")
        return Decimal('0.00')

if __name__ == "__main__":
    analyze_current_common_expenses_sheet()
