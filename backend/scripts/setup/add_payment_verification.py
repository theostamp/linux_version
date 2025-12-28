#!/usr/bin/env python
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment

def add_payment_verification():
    """
    Προσθήκη πεδίου is_verified στο μοντέλο Payment και επιβεβαίωση των παλαιότερων πληρωμών.
    """
    print("🚀 ΠΡΟΣΘΗΚΗ ΣΥΣΤΗΜΑΤΟΣ ΕΠΙΒΕΒΑΙΩΣΗΣ ΠΛΗΡΩΜΩΝ")
    print("=" * 50)
    
    with schema_context('demo'):
        # 1. Έλεγχος αν υπάρχει ήδη το πεδίο
        has_is_verified = False
        
        try:
            # Έλεγχος για is_verified
            Payment._meta.get_field('is_verified')
            has_is_verified = True
            print("✅ Το πεδίο is_verified υπάρχει ήδη στο μοντέλο Payment")
        except:
            print("ℹ️ Το πεδίο is_verified δεν υπάρχει στο μοντέλο Payment")
        
        if not has_is_verified:
            print("\n📋 ΔΙΑΔΙΚΑΣΙΑ ΔΗΜΙΟΥΡΓΙΑΣ MIGRATION")
            print("-" * 50)
            print("Για να προσθέσετε το πεδίο is_verified στο μοντέλο Payment, ακολουθήστε τα παρακάτω βήματα:")
            
            print("\n1. Δημιουργήστε ένα νέο αρχείο στο backend/financial/migrations/ με το παρακάτω περιεχόμενο:")
            print("-" * 50)
            migration_code = """# -*- coding: utf-8 -*-
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('financial', '0014_payment_reserve_fund_amount'),  # Αλλάξτε αν χρειάζεται το όνομα της τελευταίας μετανάστευσης
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='is_verified',
            field=models.BooleanField(default=False, verbose_name='Επιβεβαιωμένη'),
        ),
    ]"""
            print(migration_code)
            print("-" * 50)
            
            print("\n2. Ενημερώστε το μοντέλο Payment στο backend/financial/models.py με το νέο πεδίο:")
            print("-" * 50)
            model_code = """class Payment(models.Model):
    # ... υπάρχοντα πεδία ...
    is_verified = models.BooleanField(default=False, verbose_name="Επιβεβαιωμένη")
    # ... υπόλοιπα πεδία ..."""
            print(model_code)
            print("-" * 50)
            
            print("\n3. Εφαρμόστε τη μετανάστευση με την εντολή:")
            print("   docker exec -it linux_version-backend-1 python manage.py migrate financial")
        
        # 2. Δημιουργία script για την επιβεβαίωση των παλαιότερων πληρωμών
        print("\n📋 ΔΙΑΔΙΚΑΣΙΑ ΕΠΙΒΕΒΑΙΩΣΗΣ ΠΑΛΑΙΩΝ ΠΛΗΡΩΜΩΝ")
        print("-" * 50)
        
        verification_script = """#!/usr/bin/env python
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment

def verify_existing_payments():
    \"\"\"
    Επιβεβαίωση όλων των παλαιών πληρωμών πριν από μια συγκεκριμένη ημερομηνία.
    \"\"\"
    with schema_context('demo'):
        # Εύρεση των παλαιότερων πληρωμών (όχι πρόσφατων)
        from datetime import datetime, timedelta
        cutoff_date = datetime.now().date() - timedelta(days=30)  # Πληρωμές παλαιότερες από 30 ημέρες
        
        older_payments = Payment.objects.filter(date__lt=cutoff_date, is_verified=False)
        print(f"🔍 Βρέθηκαν {older_payments.count()} παλαιότερες μη επιβεβαιωμένες πληρωμές")
        
        # Επιβεβαίωση των παλαιών πληρωμών
        verified_count = 0
        for payment in older_payments:
            payment.is_verified = True
            payment.save()
            verified_count += 1
            if verified_count % 10 == 0:
                print(f"✅ Επιβεβαιώθηκαν {verified_count} πληρωμές...")
        
        print(f"\\n✅ Επιβεβαιώθηκαν συνολικά {verified_count} πληρωμές")
        
        # Εμφάνιση των εκκρεμών πληρωμών
        pending_payments = Payment.objects.filter(is_verified=False)
        print(f"⚠️ Παραμένουν {pending_payments.count()} μη επιβεβαιωμένες πληρωμές")
        
        if pending_payments.count() > 0:
            print("\\n📋 Λίστα εκκρεμών πληρωμών:")
            print(f"{'ID':<5} {'Διαμέρισμα':<15} {'Ημερομηνία':<15} {'Ποσό':<10} {'Μέθοδος':<20}")
            print("-" * 70)
            
            for payment in pending_payments:
                print(f"{payment.id:<5} {payment.apartment.number:<15} {payment.date.strftime('%d/%m/%Y'):<15} {float(payment.amount):<10.2f} {payment.get_method_display():<20}")

if __name__ == '__main__':
    verify_existing_payments()
"""
        
        print("Αποθηκεύστε το παρακάτω script ως verify_existing_payments.py και εκτελέστε το αφού προσθέσετε το πεδίο is_verified:")
        print("-" * 50)
        print(verification_script)
        print("-" * 50)
        
        # 3. Ενημέρωση του API για επιβεβαίωση πληρωμών
        print("\n📋 ΕΝΗΜΕΡΩΣΗ API ΓΙΑ ΕΠΙΒΕΒΑΙΩΣΗ ΠΛΗΡΩΜΩΝ")
        print("-" * 50)
        
        api_code = """# Στο backend/financial/views.py, προσθέστε ένα νέο action στο PaymentViewSet:

@action(detail=True, methods=['post'])
def verify(self, request, pk=None):
    \"\"\"Επιβεβαίωση πληρωμής\"\"\"
    try:
        payment = self.get_object()
        
        if payment.is_verified:
            return Response({
                'success': False,
                'message': 'Η πληρωμή είναι ήδη επιβεβαιωμένη'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        payment.is_verified = True
        payment.save()
        
        FinancialAuditLog.log_payment_action(
            user=self.request.user,
            action='VERIFY',
            payment=payment,
            request=self.request
        )
        
        return Response({
            'success': True,
            'message': 'Η πληρωμή επιβεβαιώθηκε επιτυχώς'
        })
        
    except Payment.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Η πληρωμή δεν βρέθηκε'
        }, status=status.HTTP_404_NOT_FOUND)"""
        
        print(api_code)
        
        # 4. Προσθήκη στο frontend
        print("\n📋 ΕΝΗΜΕΡΩΣΗ FRONTEND")
        print("-" * 50)
        
        frontend_code = """// Στο frontend/components/financial/PaymentList.tsx, προσθέστε ένα κουμπί επιβεβαίωσης:

// Προσθήκη μιας νέας συνάρτησης στο hook usePayments:
const verifyPayment = async (paymentId: number) => {
  try {
    const response = await api.post(`/financial/payments/${paymentId}/verify/`);
    toast.success('Η πληρωμή επιβεβαιώθηκε επιτυχώς');
    return response.data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    toast.error('Σφάλμα κατά την επιβεβαίωση της πληρωμής');
    throw error;
  }
};

// Προσθήκη κουμπιού επιβεβαίωσης στη λίστα:
{!payment.is_verified && (
  <Button 
    variant="ghost" 
    size="sm" 
    onClick={() => handleVerifyPayment(payment.id)}
    title="Επιβεβαίωση"
  >
    <CheckCircle className="h-4 w-4" />
  </Button>
)}"""
        
        print(frontend_code)
        
        print("\n🎯 ΣΥΜΠΕΡΑΣΜΑ")
        print("-" * 50)
        print("Με τις παραπάνω αλλαγές θα προστεθεί ένα πλήρες σύστημα επιβεβαίωσης πληρωμών:")
        print("1. Πεδίο is_verified στο μοντέλο Payment")
        print("2. API endpoint για επιβεβαίωση πληρωμών")
        print("3. Κουμπί επιβεβαίωσης στο frontend")
        print("4. Script για επιβεβαίωση παλαιότερων πληρωμών")
        print("\nΜετά την υλοποίηση, θα είναι εύκολος ο εντοπισμός των 10 εκκρεμών πληρωμών και η επιβεβαίωσή τους.")

if __name__ == '__main__':
    add_payment_verification()
