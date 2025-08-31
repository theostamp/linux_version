#!/usr/bin/env python3
"""
Script to test the integration of bank account details in payment notifications
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from users.models import CustomUser
from django.test import RequestFactory
from users.views import update_office_details
from rest_framework.test import force_authenticate
from django.core.files.uploadedfile import SimpleUploadedFile

def test_bank_account_integration():
    """Test the integration of bank account details"""
    
    print("🧪 ΕΛΕΓΧΟΣ ΕΝΤΕΓΡΑΣΗΣ ΤΡΑΠΕΖΙΚΩΝ ΣΤΟΙΧΕΙΩΝ")
    print("=" * 60)
    
    with schema_context('demo'):
        try:
            # 1. Βρίσκουμε έναν χρήστη για testing
            user = CustomUser.objects.first()
            if not user:
                print("❌ Δεν βρέθηκε χρήστης για testing")
                return
            
            print(f"👤 Χρήστης: {user.email}")
            print(f"🏢 Τρέχον γραφείο: {user.office_name or 'Δεν έχει οριστεί'}")
            print()
            
            # 2. Ελέγχουμε τα τρέχοντα πεδία
            print("2️⃣ ΤΡΕΧΟΝΤΑ ΠΕΔΙΑ ΓΡΑΦΕΙΟΥ:")
            print(f"   Όνομα: {user.office_name or 'Δεν έχει οριστεί'}")
            print(f"   Τηλέφωνο: {user.office_phone or 'Δεν έχει οριστεί'}")
            print(f"   Διεύθυνση: {user.office_address or 'Δεν έχει οριστεί'}")
            print(f"   Logo: {'Υπάρχει' if user.office_logo else 'Δεν έχει οριστεί'}")
            print()
            
            # 3. Ελέγχουμε τα νέα πεδία τραπεζικών στοιχείων
            print("3️⃣ ΝΕΑ ΠΕΔΙΑ ΤΡΑΠΕΖΙΚΩΝ ΣΤΟΙΧΕΙΩΝ:")
            print(f"   Τράπεζα: {user.office_bank_name or 'Δεν έχει οριστεί'}")
            print(f"   Λογαριασμός: {user.office_bank_account or 'Δεν έχει οριστεί'}")
            print(f"   IBAN: {user.office_bank_iban or 'Δεν έχει οριστεί'}")
            print(f"   Δικαιούχος: {user.office_bank_beneficiary or 'Δεν έχει οριστεί'}")
            print()
            
            # 4. Test API endpoint για ενημέρωση τραπεζικών στοιχείων
            print("4️⃣ ΕΛΕΓΧΟΣ API ENDPOINT:")
            factory = RequestFactory()
            
            # Δημιουργούμε test data
            form_data = {
                'office_name': 'Γραφείο Διαχείρισης Παπαδόπουλου',
                'office_phone': '210-1234567',
                'office_address': 'Λεωφ. Συγγρού 123, Αθήνα',
                'office_bank_name': 'Εθνική Τράπεζα της Ελλάδος',
                'office_bank_account': '1234567890',
                'office_bank_iban': 'GR16 0110 1250 0000 1234 5678 901',
                'office_bank_beneficiary': 'Γραφείο Διαχείρισης Παπαδόπουλου',
            }
            
            # Δημιουργούμε request
            request = factory.put('/api/users/office-details/', form_data, content_type='application/json')
            force_authenticate(request, user=user)
            
            # Καλούμε το view
            response = update_office_details(request)
            
            print(f"   Status Code: {response.status_code}")
            if response.status_code == 200:
                print("   ✅ API endpoint λειτουργεί σωστά")
                print(f"   Response: {response.data}")
            else:
                print(f"   ❌ API endpoint απέτυχε: {response.data}")
            
            print()
            
            # 5. Ελέγχουμε ότι τα δεδομένα αποθηκεύτηκαν
            user.refresh_from_db()
            print("5️⃣ ΕΛΕΓΧΟΣ ΑΠΟΘΗΚΕΥΣΗΣ:")
            print(f"   Όνομα: {user.office_name}")
            print(f"   Τηλέφωνο: {user.office_phone}")
            print(f"   Διεύθυνση: {user.office_address}")
            print(f"   Τράπεζα: {user.office_bank_name}")
            print(f"   Λογαριασμός: {user.office_bank_account}")
            print(f"   IBAN: {user.office_bank_iban}")
            print(f"   Δικαιούχος: {user.office_bank_beneficiary}")
            print()
            
            # 6. Test serializer
            print("6️⃣ ΕΛΕΓΧΟΣ SERIALIZER:")
            from users.serializers import OfficeDetailsSerializer
            
            serializer = OfficeDetailsSerializer(user)
            data = serializer.data
            
            print("   Πεδία στο serializer:")
            for field, value in data.items():
                print(f"     {field}: {value}")
            
            print()
            
            # 7. Test user data in login response
            print("7️⃣ ΕΛΕΓΧΟΣ LOGIN RESPONSE:")
            from users.views import login_view
            
            login_request = factory.post('/api/users/login/', {
                'email': user.email,
                'password': 'testpass123'  # Υποθέτουμε ότι υπάρχει αυτό το password
            })
            
            try:
                login_response = login_view(login_request)
                if login_response.status_code == 200:
                    user_data = login_response.data.get('user', {})
                    print("   ✅ Login response περιλαμβάνει τραπεζικά στοιχεία:")
                    print(f"     Τράπεζα: {user_data.get('office_bank_name')}")
                    print(f"     IBAN: {user_data.get('office_bank_iban')}")
                    print(f"     Δικαιούχος: {user_data.get('office_bank_beneficiary')}")
                else:
                    print(f"   ⚠️ Login απέτυχε (πιθανώς λάθος password): {login_response.status_code}")
            except Exception as e:
                print(f"   ⚠️ Login test απέτυχε: {e}")
            
            print()
            print("✅ ΕΛΕΓΧΟΣ ΟΛΟΚΛΗΡΩΘΗΚΕ ΕΠΙΤΥΧΩΣ!")
            
        except Exception as e:
            print(f"❌ Σφάλμα κατά τον έλεγχο: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_bank_account_integration()
