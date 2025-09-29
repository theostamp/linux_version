#!/usr/bin/env python3
"""
Script για έλεγχο της λογικής του frontend PaymentList component
"""

import requests
from collections import defaultdict

def test_frontend_logic():
    """Μιμείται τη λογική του PaymentList.apartmentSummaries"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΛΟΓΙΚΗΣ FRONTEND")
    print("="*50)
    
    # Fetch payments from API (like usePayments hook does)
    base_url = "http://demo.localhost:8000/api"
    
    try:
        response = requests.get(f"{base_url}/financial/payments/?building_id=3")
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code} - {response.text}")
            return
        
        payments = response.json()
        print(f"✅ Φορτώθηκαν {len(payments)} payments από το API")
        
        # Mimic the frontend apartmentSummaries logic
        # Group payments by apartment (same as frontend lines 116-123)
        payments_by_apartment = defaultdict(list)
        for payment in payments:
            apartment_key = payment['apartment']
            payments_by_apartment[apartment_key].append(payment)
        
        print("\n📊 FRONTEND APARTMENT SUMMARIES LOGIC:")
        print(f"Βρέθηκαν {len(payments_by_apartment)} διαμερίσματα με πληρωμές")
        
        summaries = []
        
        for apartment_id, apartment_payments in payments_by_apartment.items():
            # Sort payments by date (same as frontend lines 130-136)
            sorted_payments = sorted(apartment_payments, key=lambda p: (p['date'], p['id']))
            
            # Calculate total amount (same as frontend lines 139-142)
            total_amount = 0
            for payment in sorted_payments:
                amount = float(payment['amount']) if isinstance(payment['amount'], str) else payment['amount']
                total_amount += amount if not (amount != amount) else 0  # Handle NaN
            
            # Use latest payment as base (same as frontend lines 145-146)
            latest_payment = sorted_payments[-1]
            oldest_payment = sorted_payments[0]
            
            # Use current_balance from API (same as frontend line 150)
            current_balance = latest_payment.get('current_balance', 0)
            
            # Create summary (same as frontend lines 153-166)
            summary = {
                'id': apartment_id * 1000,  # Unique ID for summary entry
                'apartment': apartment_id,
                'apartment_number': latest_payment.get('apartment_number', f'Διαμέρισμα {apartment_id}'),
                'owner_name': latest_payment.get('owner_name', ''),
                'tenant_name': latest_payment.get('tenant_name', ''),
                'amount': total_amount,  # Total amount of all payments
                'date': oldest_payment['date'],  # Date of first payment
                'notes': f"{len(sorted_payments)} πληρωμ{'ή' if len(sorted_payments) == 1 else 'ές'}",
                'current_balance': current_balance,  # Current balance from API
                'monthly_due': latest_payment.get('monthly_due', 0),
                'payment_count': len(sorted_payments)
            }
            
            summaries.append(summary)
            
            print(f"\n🏠 Διαμέρισμα {summary['apartment_number']} (ID: {apartment_id}):")
            print(f"  • Συνολικό ποσό πληρωμών: {total_amount:.2f}€")
            print(f"  • Πλήθος πληρωμών: {len(sorted_payments)}")
            print(f"  • Τρέχον υπόλοιπο (από API): {current_balance:.2f}€")
            print(f"  • Μηνιαία οφειλή (από API): {latest_payment.get('monthly_due', 0):.2f}€")
            print(f"  • Ιδιοκτήτης: {latest_payment.get('owner_name', 'N/A')}")
            print(f"  • Ενοικιαστής: {latest_payment.get('tenant_name', 'N/A')}")
        
        # Sort summaries by apartment number (same as frontend lines 169-173)
        sorted_summaries = sorted(summaries, key=lambda s: s['apartment_number'])
        
        # Calculate total amount (same as frontend lines 200-205)
        total_amount = sum(
            s['amount'] if not (s['amount'] != s['amount']) else 0  # Handle NaN
            for s in sorted_summaries
        )
        
        print("\n💰 ΣΥΓΚΕΝΤΡΩΤΙΚΑ ΣΤΟΙΧΕΙΑ:")
        print(f"  • Σύνολο διαμερισμάτων: {len(sorted_summaries)}")
        print(f"  • Συνολικό ποσό όλων των πληρωμών: {total_amount:.2f}€")
        
        # Test specific apartments mentioned in TODO (C2 and C3)
        print("\n🎯 ΕΛΕΓΧΟΣ ΣΥΓΚΕΚΡΙΜΕΝΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
        target_apartments = [10, 11]  # C2 and C3 based on the API script
        
        for apt_id in target_apartments:
            if apt_id in payments_by_apartment:
                apt_payments = payments_by_apartment[apt_id]
                apt_summary = next((s for s in sorted_summaries if s['apartment'] == apt_id), None)
                if apt_summary:
                    print(f"\n🏠 Διαμέρισμα {apt_summary['apartment_number']} (ID: {apt_id}):")
                    print(f"  • Frontend summary amount: {apt_summary['amount']:.2f}€")
                    print(f"  • Frontend current_balance: {apt_summary['current_balance']:.2f}€")
                    print("  • Individual payments:")
                    for payment in apt_payments:
                        print(f"    - {payment['amount']}€ ({payment['date']}) - {payment.get('method_display', payment.get('method', 'N/A'))}")
                    
                    # Verify calculation
                    manual_total = sum(float(p['amount']) for p in apt_payments)
                    if abs(manual_total - apt_summary['amount']) > 0.01:
                        print(f"  ⚠️  ΑΝΑΝΤΙΣΤΟΙΧΙΑ: Manual sum: {manual_total:.2f}€, Summary: {apt_summary['amount']:.2f}€")
                    else:
                        print("  ✅ Ο υπολογισμός του συνόλου είναι σωστός")
            else:
                print(f"\n❌ Δεν βρέθηκαν πληρωμές για διαμέρισμα ID {apt_id}")
        
        return sorted_summaries
        
    except Exception as e:
        print(f"❌ Exception: {e}")
        return None

def compare_with_modal_logic(summaries):
    """Ελέγχει αν τα δεδομένα που περνάνε στο modal είναι σωστά"""
    if not summaries:
        return
        
    print("\n🔍 ΕΛΕΓΧΟΣ ΔΕΔΟΜΕΝΩΝ ΠΟΥ ΠΕΡΝΑΝΕ ΣΤΟ MODAL:")
    
    for summary in summaries:
        apartment_id = summary['apartment']
        
        # Test the transaction endpoint that the modal uses
        try:
            response = requests.get(f"http://demo.localhost:8000/api/financial/apartments/{apartment_id}/transactions/")
            if response.status_code == 200:
                transactions = response.json()
                
                # Calculate balance from transactions (same as modal does)
                last_balance = transactions[-1]['balance_after'] if transactions else 0
                
                print(f"\n🏠 Διαμέρισμα {summary['apartment_number']}:")
                print(f"  • PaymentList current_balance: {summary['current_balance']:.2f}€")
                print(f"  • Modal calculated balance: {last_balance:.2f}€")
                
                if abs(summary['current_balance'] - last_balance) > 0.01:
                    print("  ⚠️  ΑΝΑΝΤΙΣΤΟΙΧΙΑ μεταξύ PaymentList και Modal!")
                else:
                    print("  ✅ Τα δεδομένα συμφωνούν")
                    
            else:
                print(f"  ❌ Σφάλμα στο transaction endpoint: {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ Exception στον έλεγχο modal: {e}")

def main():
    print("🔍 ΕΛΕΓΧΟΣ ΛΟΓΙΚΗΣ FRONTEND PAYMENTLIST")
    print("Μιμείται την ακριβή λογική του PaymentList.apartmentSummaries")
    
    summaries = test_frontend_logic()
    
    if summaries:
        compare_with_modal_logic(summaries)
    
    print("\n✅ ΕΛΕΓΧΟΣ ΟΛΟΚΛΗΡΩΘΗΚΕ")
    print("Αν υπάρχουν αναντιστοιχίες, το πρόβλημα μπορεί να είναι:")
    print("1. Στον PaymentSerializer.get_current_balance() υπολογισμό")
    print("2. Στον ApartmentTransactionViewSet._get_apartment_transactions()")
    print("3. Στη διαφορετική λογική υπολογισμού μεταξύ payments και transactions")

if __name__ == "__main__":
    main()
