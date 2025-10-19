# backend/buildings/utils.py
"""
Utility functions for building management
"""
import logging
from django.utils import timezone
from .models import Building, BuildingMembership
from apartments.models import Apartment

logger = logging.getLogger(__name__)


def create_demo_building_for_manager(user):
    """
    Create a demo building with sample data for a new manager.
    This helps new users understand the system by providing realistic example data.

    Args:
        user: The manager user who will own this demo building

    Returns:
        Building instance or None if creation fails
    """
    try:
        # Check if user already has buildings
        existing_buildings = Building.objects.filter(manager_id=user.id).count()
        if existing_buildings > 0:
            logger.info(f"User {user.email} already has {existing_buildings} buildings, skipping demo creation")
            return None

        # Create demo building (use manager_id instead of manager FK)
        demo_building = Building.objects.create(
            name='🎓 Demo Building - Αλκμάνος 22',
            address='Αλκμάνος 22, Αθήνα 115 28, Ελλάδα',
            city='Αθήνα',
            postal_code='11528',
            apartments_count=10,
            manager_id=user.id,  # Store user ID from public schema
            internal_manager_name=f'{user.first_name} {user.last_name}' if user.first_name else user.email,
            internal_manager_phone='2101234567',
            heating_fixed_percentage=30.0,
            latitude=37.9838,
            longitude=23.7275,
            description='Αυτό είναι ένα δοκιμαστικό κτίριο με δείγματα δεδομένων για να εξοικειωθείτε με το σύστημα. Μπορείτε να το διαγράψετε ή να το τροποποιήσετε ανά πάσα στιγμή.'
        )

        logger.info(f"Created demo building '{demo_building.name}' for user {user.email}")

        # Note: We don't create BuildingMembership for the manager because:
        # 1. BuildingMembership.resident is a ForeignKey to CustomUser (public schema)
        # 2. In multi-tenant architecture, tenant schema can't have FK to public schema
        # 3. The manager relationship is handled via Building.manager_id (integer field)
        # 4. BuildingMembership is primarily for residents/owners within the tenant

        logger.info(f"Manager {user.email} owns demo building via manager_id={user.id}")

        # Create sample apartments with realistic Greek data (TOTAL MILLS = 1000)
        apartments_data = [
            {'number': 'Α1', 'floor': 0, 'owner_name': 'Θεοδώρος Σταματιάδης', 'owner_phone': '2101234567', 'owner_email': 'owner1@example.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 85, 'bedrooms': 2, 'participation_mills': 100, 'heating_mills': 100, 'elevator_mills': 100},
            {'number': 'Α2', 'floor': 0, 'owner_name': 'Ελένη Δημητρίου', 'owner_phone': '2103456789', 'owner_email': 'owner2@example.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 90, 'bedrooms': 2, 'participation_mills': 97, 'heating_mills': 105, 'elevator_mills': 97},
            {'number': 'Α3', 'floor': 0, 'owner_name': 'Νικόλαος Αλεξίου', 'owner_phone': '2104567890', 'owner_email': 'owner3@example.com', 'tenant_name': 'Ανδρέας Παπαγεωργίου', 'tenant_phone': '2105678901', 'tenant_email': 'tenant1@example.com', 'is_rented': True, 'square_meters': 75, 'bedrooms': 1, 'participation_mills': 88, 'heating_mills': 92, 'elevator_mills': 88},
            {'number': 'Β1', 'floor': 1, 'owner_name': 'Αικατερίνη Σταματίου', 'owner_phone': '2106789012', 'owner_email': 'owner4@example.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 95, 'bedrooms': 3, 'participation_mills': 110, 'heating_mills': 115, 'elevator_mills': 110},
            {'number': 'Β2', 'floor': 1, 'owner_name': 'Δημήτριος Κωνσταντίνου', 'owner_phone': '2107890123', 'owner_email': 'owner5@example.com', 'tenant_name': 'Σοφία Παπαδοπούλου', 'tenant_phone': '2108901234', 'tenant_email': 'tenant2@example.com', 'is_rented': True, 'square_meters': 92, 'bedrooms': 2, 'participation_mills': 105, 'heating_mills': 108, 'elevator_mills': 105},
            {'number': 'Β3', 'floor': 1, 'owner_name': 'Ιωάννης Μιχαηλίδης', 'owner_phone': '2109012345', 'owner_email': 'owner6@example.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 88, 'bedrooms': 2, 'participation_mills': 98, 'heating_mills': 102, 'elevator_mills': 98},
            {'number': 'Γ1', 'floor': 2, 'owner_name': 'Αννα Παπαδοπούλου', 'owner_phone': '2100123456', 'owner_email': 'owner7@example.com', 'tenant_name': 'Χρήστος Γεωργίου', 'tenant_phone': '2101234567', 'tenant_email': 'tenant3@example.com', 'is_rented': True, 'square_meters': 82, 'bedrooms': 2, 'participation_mills': 92, 'heating_mills': 95, 'elevator_mills': 92},
            {'number': 'Γ2', 'floor': 2, 'owner_name': 'Παναγιώτης Αντωνίου', 'owner_phone': '2102345678', 'owner_email': 'owner8@example.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 100, 'bedrooms': 3, 'participation_mills': 115, 'heating_mills': 100, 'elevator_mills': 115},
            {'number': 'Γ3', 'floor': 2, 'owner_name': 'Ευαγγελία Κωνσταντίνου', 'owner_phone': '2103456789', 'owner_email': 'owner9@example.com', 'tenant_name': 'Δημήτριος Παπαδόπουλος', 'tenant_phone': '2104567890', 'tenant_email': 'tenant4@example.com', 'is_rented': True, 'square_meters': 96, 'bedrooms': 3, 'participation_mills': 108, 'heating_mills': 100, 'elevator_mills': 108},
            {'number': 'Δ1', 'floor': 3, 'owner_name': 'Μιχαήλ Γεωργίου', 'owner_phone': '2105678901', 'owner_email': 'owner10@example.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 78, 'bedrooms': 1, 'participation_mills': 87, 'heating_mills': 83, 'elevator_mills': 87}
        ]

        # Verify mills total to 1000
        total_participation = sum(apt['participation_mills'] for apt in apartments_data)
        total_heating = sum(apt['heating_mills'] for apt in apartments_data)
        total_elevator = sum(apt['elevator_mills'] for apt in apartments_data)

        if total_participation != 1000 or total_heating != 1000 or total_elevator != 1000:
            logger.error(f"Mills validation failed: participation={total_participation}, heating={total_heating}, elevator={total_elevator}")
            raise ValueError("Demo building mills don't add up to 1000")

        # Create apartments
        created_count = 0
        for apt_data in apartments_data:
            apartment = Apartment.objects.create(
                building=demo_building,
                number=apt_data['number'],
                identifier=apt_data['number'],
                floor=apt_data['floor'],
                owner_name=apt_data['owner_name'],
                owner_phone=apt_data['owner_phone'],
                owner_email=apt_data['owner_email'],
                tenant_name=apt_data['tenant_name'],
                tenant_phone=apt_data['tenant_phone'],
                tenant_email=apt_data['tenant_email'],
                is_rented=apt_data['is_rented'],
                square_meters=apt_data['square_meters'],
                bedrooms=apt_data['bedrooms'],
                participation_mills=apt_data['participation_mills'],
                heating_mills=apt_data['heating_mills'],
                elevator_mills=apt_data['elevator_mills'],
                notes=f"Δοκιμαστικό διαμέρισμα {apt_data['number']} - Μπορείτε να το τροποποιήσετε ή να το διαγράψετε"
            )
            created_count += 1

        logger.info(f"Created {created_count} demo apartments for building '{demo_building.name}'")

        # Create sample announcement
        from announcements.models import Announcement
        Announcement.objects.create(
            title='🎓 Καλώς ήρθατε στο Demo Building!',
            description='Αυτό είναι ένα δοκιμαστικό κτίριο με δείγματα δεδομένων για να εξοικειωθείτε με το σύστημα. Μπορείτε να δημιουργήσετε ανακοινώσεις, ψηφοφορίες, αιτήματα και πολλά άλλα. Όταν είστε έτοιμοι, μπορείτε να διαγράψετε αυτό το κτίριο και να δημιουργήσετε το δικό σας!',
            building=demo_building,
            author=user,
            is_active=True,
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=365)
        )

        logger.info(f"Created welcome announcement for demo building")

        # Create sample user request
        from user_requests.models import UserRequest
        UserRequest.objects.create(
            title='🎓 Δοκιμαστικό αίτημα - Φωτισμός εισόδου',
            description='Αυτό είναι ένα δοκιμαστικό αίτημα για να δείτε πώς λειτουργεί το σύστημα διαχείρισης αιτημάτων. Μπορείτε να το διαγράψετε ή να το επεξεργαστείτε.',
            building=demo_building,
            created_by=user,
            type='maintenance',
            priority='medium',
            status='open'
        )

        logger.info(f"Created sample user request for demo building")

        return demo_building

    except Exception as e:
        logger.error(f"Failed to create demo building for user {user.email}: {e}")
        import traceback
        traceback.print_exc()
        return None
