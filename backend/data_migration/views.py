from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import logging
from typing import Dict, Any, List
import re

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def analyze_form_images(request):
    """
    Αναλύει εικόνες φορμών κοινοχρήστων με AI και εξάγει δεδομένα
    """
    try:
        # Λήψη αρχείων από το request
        files = request.FILES.getlist('images')
        
        if not files:
            return Response(
                {'error': 'Δεν βρέθηκαν αρχεία εικόνων'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Αποθήκευση αρχείων προσωρινά
        saved_files = []
        for file in files:
            if file.content_type.startswith('image/'):
                file_path = default_storage.save(
                    f'temp_migration/{file.name}', 
                    ContentFile(file.read())
                )
                saved_files.append(file_path)

        # Πραγματική ανάλυση με AI
        from .ai_service import form_analyzer
        extracted_data = form_analyzer.analyze_form_images(saved_files)

        # Καθαρισμός προσωρινών αρχείων
        for file_path in saved_files:
            default_storage.delete(file_path)

        return Response({
            'success': True,
            'data': extracted_data,
            'message': f'Επιτυχής ανάλυση {len(files)} εικόνων'
        })

    except Exception as e:
        logger.error(f"Error in analyze_form_images: {str(e)}")
        return Response(
            {'error': f'Σφάλμα κατά την ανάλυση: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def simulate_ai_analysis(image_paths: List[str]) -> Dict[str, Any]:
    """
    Προσομοίωση ανάλυσης AI - εδώ θα μπει το πραγματικό AI service
    """
    # Προσομοίωση δεδομένων που θα εξάγονταν από AI
    return {
        'building_info': {
            'name': 'Κτίριο Παράδεισος',
            'address': 'Λεωφ. Συγγρού 123',
            'city': 'Αθήνα',
            'postal_code': '11741',
            'apartments_count': 24,
            'internal_manager_name': 'Γεώργιος Διαχειριστής',
            'internal_manager_phone': '2101234567',
            'management_office_name': 'Γραφείο Διαχείρισης Παράδεισος',
            'management_office_phone': '2102345678',
            'management_office_address': 'Λεωφ. Συγγρού 100, Αθήνα'
        },
        'apartments': [
            {
                'number': '1',
                'identifier': 'Α1',
                'floor': 1,
                'owner_name': 'Γεώργιος Παπαδόπουλος',
                'owner_phone': '2101234567',
                'owner_phone2': '6971234567',
                'owner_email': 'george@example.com',
                'ownership_percentage': 100.0,
                'square_meters': 85,
                'bedrooms': 2,
                'is_rented': False,
                'is_closed': False,
                'notes': 'Ιδιοκατοίκηση'
            },
            {
                'number': '2',
                'identifier': 'Α2',
                'floor': 1,
                'owner_name': 'Μαρία Κωνσταντίνου',
                'owner_phone': '2102345678',
                'owner_phone2': '6972345678',
                'owner_email': 'maria@example.com',
                'tenant_name': 'Νίκος Δημητρίου',
                'tenant_phone': '6973456789',
                'tenant_phone2': '2103456789',
                'tenant_email': 'nikos@example.com',
                'ownership_percentage': 100.0,
                'square_meters': 75,
                'bedrooms': 2,
                'is_rented': True,
                'is_closed': False,
                'rent_start_date': '2024-01-01',
                'rent_end_date': '2024-12-31',
                'notes': 'Ενοικιασμένο'
            },
            {
                'number': '3',
                'identifier': 'Α3',
                'floor': 1,
                'owner_name': 'Ελένη Παπαδοπούλου',
                'owner_phone': '2104567890',
                'owner_phone2': '',
                'owner_email': 'eleni@example.com',
                'ownership_percentage': 100.0,
                'square_meters': 90,
                'bedrooms': 3,
                'is_rented': False,
                'is_closed': True,
                'notes': 'Κλειστό διαμέρισμα'
            }
        ],
        'residents': [
            {
                'name': 'Γεώργιος Παπαδόπουλος',
                'email': 'george@example.com',
                'phone': '2101234567',
                'apartment': '1',
                'role': 'owner'
            },
            {
                'name': 'Μαρία Κωνσταντίνου',
                'email': 'maria@example.com',
                'phone': '2102345678',
                'apartment': '2',
                'role': 'owner'
            },
            {
                'name': 'Νίκος Δημητρίου',
                'email': 'nikos@example.com',
                'phone': '6973456789',
                'apartment': '2',
                'role': 'tenant'
            }
        ],
        'confidence_score': 0.85,
        'extraction_notes': [
            'Επιτυχής αναγνώριση όλων των πεδίων',
            'Αυτόματη επικύρωση τηλεφωνικών αριθμών',
            'Εντοπισμός 3 διαμερισμάτων από τη φόρμα'
        ]
    }

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def import_migrated_data(request):
    """
    Εισάγει τα εξαγόμενα δεδομένα στη βάση δεδομένων
    """
    try:
        data = request.data
        building_data = data.get('building_info')
        apartments_data = data.get('apartments', [])
        residents_data = data.get('residents', [])
        target_building_id = data.get('target_building_id')

        from buildings.models import Building
        from apartments.models import Apartment
        from users.models import CustomUser

        # Δημιουργία ή ενημέρωση κτιρίου
        if target_building_id == 'new':
            building = Building.objects.create(
                name=building_data['name'],
                address=building_data['address'],
                city=building_data.get('city', ''),
                postal_code=building_data.get('postal_code', ''),
                apartments_count=building_data.get('apartments_count', 0),
                internal_manager_apartment=building_data.get('internal_manager_apartment', ''),
                internal_manager_collection_schedule=building_data.get('internal_manager_collection_schedule', ''),
                internal_manager_name=building_data.get('internal_manager_name', ''),
                internal_manager_phone=building_data.get('internal_manager_phone', ''),
                management_office_name=building_data.get('management_office_name', ''),
                management_office_phone=building_data.get('management_office_phone', ''),
                management_office_address=building_data.get('management_office_address', '')
            )
        else:
            building = Building.objects.get(id=target_building_id)

        # Δημιουργία διαμερισμάτων
        created_apartments = []
        for apt_data in apartments_data:
            apartment = Apartment.objects.create(
                building=building,
                number=apt_data['number'],
                identifier=apt_data.get('identifier', ''),
                floor=apt_data.get('floor'),
                owner_name=apt_data['owner_name'],
                owner_phone=apt_data['owner_phone'],
                owner_phone2=apt_data.get('owner_phone2', ''),
                owner_email=apt_data['owner_email'],
                ownership_percentage=apt_data.get('ownership_percentage'),
                tenant_name=apt_data.get('tenant_name', ''),
                tenant_phone=apt_data.get('tenant_phone', ''),
                tenant_phone2=apt_data.get('tenant_phone2', ''),
                tenant_email=apt_data.get('tenant_email', ''),
                is_rented=apt_data.get('is_rented', False),
                is_closed=apt_data.get('is_closed', False),
                rent_start_date=apt_data.get('rent_start_date'),
                rent_end_date=apt_data.get('rent_end_date'),
                square_meters=apt_data.get('square_meters'),
                bedrooms=apt_data.get('bedrooms'),
                notes=apt_data.get('notes', '')
            )
            created_apartments.append(apartment)

        # Δημιουργία χρηστών για κατοίκους (αν χρειάζεται)
        created_users = []
        for resident_data in residents_data:
            # Έλεγχος αν υπάρχει ήδη χρήστης με αυτό το email
            user, created = CustomUser.objects.get_or_create(
                email=resident_data['email'],
                defaults={
                    'first_name': resident_data['name'].split()[0],
                    'last_name': ' '.join(resident_data['name'].split()[1:]) if len(resident_data['name'].split()) > 1 else '',
                    'phone': resident_data['phone'],
                    'is_active': True
                }
            )
            if created:
                created_users.append(user)

        return Response({
            'success': True,
            'message': f'Επιτυχής εισαγωγή: {len(created_apartments)} διαμερίσματα, {len(created_users)} χρήστες',
            'building_id': building.id,
            'apartments_created': len(created_apartments),
            'users_created': len(created_users)
        })

    except Exception as e:
        logger.error(f"Error in import_migrated_data: {str(e)}")
        return Response(
            {'error': f'Σφάλμα κατά την εισαγωγή: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def validate_migration_data(request):
    """
    Επικυρώνει τα εξαγόμενα δεδομένα πριν την εισαγωγή
    """
    try:
        data = request.data
        validation_results = {
            'is_valid': True,
            'errors': [],
            'warnings': [],
            'statistics': {}
        }

        # Επικύρωση δεδομένων κτιρίου
        building_data = data.get('building_info', {})
        if not building_data.get('name'):
            validation_results['errors'].append('Λείπει το όνομα του κτιρίου')
            validation_results['is_valid'] = False

        if not building_data.get('address'):
            validation_results['errors'].append('Λείπει η διεύθυνση του κτιρίου')
            validation_results['is_valid'] = False

        # Επικύρωση διαμερισμάτων
        apartments_data = data.get('apartments', [])
        apartment_numbers = []
        
        for i, apt in enumerate(apartments_data):
            if not apt.get('number'):
                validation_results['errors'].append(f'Διαμέρισμα {i+1}: Λείπει ο αριθμός')
                validation_results['is_valid'] = False
            
            if apt.get('number') in apartment_numbers:
                validation_results['errors'].append(f'Διαμέρισμα {i+1}: Διπλός αριθμός διαμερίσματος')
                validation_results['is_valid'] = False
            else:
                apartment_numbers.append(apt.get('number'))

            if not apt.get('owner_name'):
                validation_results['warnings'].append(f'Διαμέρισμα {apt.get("number", i+1)}: Λείπει όνομα ιδιοκτήτη')

            # Επικύρωση email
            if apt.get('owner_email') and not re.match(r'^[^@]+@[^@]+\.[^@]+$', apt['owner_email']):
                validation_results['warnings'].append(f'Διαμέρισμα {apt.get("number", i+1)}: Μη έγκυρο email ιδιοκτήτη')

            if apt.get('tenant_email') and not re.match(r'^[^@]+@[^@]+\.[^@]+$', apt['tenant_email']):
                validation_results['warnings'].append(f'Διαμέρισμα {apt.get("number", i+1)}: Μη έγκυρο email ενοίκου')

        # Στατιστικά
        validation_results['statistics'] = {
            'total_apartments': len(apartments_data),
            'rented_apartments': len([apt for apt in apartments_data if apt.get('is_rented')]),
            'owned_apartments': len([apt for apt in apartments_data if not apt.get('is_rented') and apt.get('owner_name')]),
            'empty_apartments': len([apt for apt in apartments_data if not apt.get('is_rented') and not apt.get('owner_name')]),
            'total_residents': len(data.get('residents', []))
        }

        return Response(validation_results)

    except Exception as e:
        logger.error(f"Error in validate_migration_data: {str(e)}")
        return Response(
            {'error': f'Σφάλμα κατά την επικύρωση: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_migration_templates(request):
    """
    Επιστρέφει πρότυπα για μετανάστευση δεδομένων
    """
    templates = {
        'csv_template': {
            'headers': [
                'Αριθμός Διαμερίσματος',
                'Διακριτικό',
                'Όροφος',
                'Όνομα Ιδιοκτήτη',
                'Τηλέφωνο Ιδιοκτήτη',
                'Δεύτερο Τηλέφωνο Ιδιοκτήτη',
                'Email Ιδιοκτήτη',
                'Όνομα Ενοίκου',
                'Τηλέφωνο Ενοίκου',
                'Δεύτερο Τηλέφωνο Ενοίκου',
                'Email Ενοίκου',
                'Τετραγωνικά Μέτρα',
                'Υπνοδωμάτια',
                'Ενοικιασμένο',
                'Κλειστό',
                'Χιλιοστά Ιδιοκτησίας',
                'Ημ/νία Έναρξης Ενοικίασης',
                'Ημ/νία Λήξης Ενοικίασης',
                'Σημειώσεις'
            ],
            'example_row': [
                '1',
                'Α1',
                '1',
                'Γεώργιος Παπαδόπουλος',
                '2101234567',
                '6971234567',
                'george@example.com',
                '',
                '',
                '',
                '',
                '85',
                '2',
                'Όχι',
                'Όχι',
                '100',
                '',
                '',
                'Ιδιοκατοίκηση'
            ]
        },
        'supported_formats': [
            'image/jpeg',
            'image/png',
            'image/jpg',
            'application/pdf'
        ],
        'max_file_size': '10MB',
        'max_files': 10
    }

    return Response(templates) 
