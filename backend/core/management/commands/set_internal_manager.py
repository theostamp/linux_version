"""
Management command για να ορίσει έναν χρήστη ως εσωτερικό διαχειριστή ενός κτιρίου.

Χρήση:
    python manage.py set_internal_manager --email thodoris_st@hotmail.com --building 2
    python manage.py set_internal_manager --email thodoris_st@hotmail.com --building "Βουλής 6 -Demo"
"""

from django.core.management.base import BaseCommand, CommandError
from users.models import CustomUser
from buildings.models import Building, BuildingMembership


class Command(BaseCommand):
    help = 'Ορίζει έναν χρήστη ως εσωτερικό διαχειριστή ενός κτιρίου'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            required=True,
            help='Email του χρήστη που θα γίνει internal manager'
        )
        parser.add_argument(
            '--building',
            type=str,
            required=True,
            help='ID ή όνομα του κτιρίου'
        )

    def handle(self, *args, **options):
        email = options['email']
        building_identifier = options['building']

        # Βρες τον χρήστη
        try:
            user = CustomUser.objects.get(email=email)  # type: ignore[attr-defined]
            self.stdout.write(f"✅ Βρέθηκε χρήστης: {user.email} (ID: {user.id})")  # pyright: ignore[reportAttributeAccessIssue]
        except CustomUser.DoesNotExist:  # type: ignore[attr-defined]
            raise CommandError(f"❌ Δεν βρέθηκε χρήστης με email: {email}")

        # Βρες το κτίριο (με ID ή όνομα)
        try:
            building_id = int(building_identifier)
            building = Building.objects.get(id=building_id)  # type: ignore[attr-defined]
        except ValueError:
            # Αν δεν είναι αριθμός, ψάξε με όνομα
            try:
                building = Building.objects.get(name__icontains=building_identifier)  # type: ignore[attr-defined]
            except Building.DoesNotExist:  # type: ignore[attr-defined]
                raise CommandError(f"❌ Δεν βρέθηκε κτίριο με όνομα: {building_identifier}")
            except Building.MultipleObjectsReturned:  # type: ignore[attr-defined]
                buildings = Building.objects.filter(name__icontains=building_identifier)  # type: ignore[attr-defined]
                self.stdout.write(self.style.WARNING("⚠️ Βρέθηκαν πολλά κτίρια:"))  # type: ignore[attr-defined]
                for b in buildings:
                    self.stdout.write(f"   - ID: {b.id}, Όνομα: {b.name}")  # pyright: ignore[reportAttributeAccessIssue]
                raise CommandError("Χρησιμοποίησε το ID του κτιρίου αντί για το όνομα")
        except Building.DoesNotExist:  # type: ignore[attr-defined]
            raise CommandError(f"❌ Δεν βρέθηκε κτίριο με ID: {building_id}")

        self.stdout.write(f"✅ Βρέθηκε κτίριο: {building.name} (ID: {building.id})")  # pyright: ignore[reportAttributeAccessIssue]

        # Αφαίρεσε τον προηγούμενο internal_manager (αν υπάρχει)
        old_manager = building.internal_manager
        if old_manager and old_manager != user:
            self.stdout.write(f"📝 Αφαίρεση προηγούμενου internal_manager: {old_manager.email}")
            # Αν δεν είναι internal_manager σε άλλο κτίριο, άλλαξε τον ρόλο του
            other_buildings = Building.objects.filter(internal_manager=old_manager).exclude(id=building.id)  # type: ignore[attr-defined]
            if not other_buildings.exists() and old_manager.role == 'internal_manager':
                old_manager.role = 'resident'
                old_manager.save(update_fields=['role'])
                self.stdout.write(f"   ↪ Άλλαξε ρόλος σε 'resident' για: {old_manager.email}")

        # Όρισε τον νέο internal_manager
        building.internal_manager = user
        building.save(update_fields=['internal_manager'])
        self.stdout.write(f"✅ Ορίστηκε internal_manager: {user.email} για κτίριο: {building.name}")

        # Ενημέρωσε τον ρόλο του χρήστη
        if user.role != 'internal_manager':
            old_role = user.role
            user.role = 'internal_manager'
            user.save(update_fields=['role'])
            self.stdout.write(f"✅ Άλλαξε ρόλος χρήστη: {old_role} → internal_manager")
        else:
            self.stdout.write(f"ℹ️ Ο χρήστης είχε ήδη ρόλο: internal_manager")

        # Δημιούργησε/ενημέρωσε BuildingMembership
        membership, created = BuildingMembership.objects.get_or_create(  # type: ignore[attr-defined]
            resident=user,
            building=building,
            defaults={'role': 'internal_manager'}
        )
        if created:
            self.stdout.write(f"✅ Δημιουργήθηκε BuildingMembership για: {user.email}")
        else:
            if membership.role != 'internal_manager':
                membership.role = 'internal_manager'
                membership.save(update_fields=['role'])
                self.stdout.write(f"✅ Ενημερώθηκε BuildingMembership role: internal_manager")
            else:
                self.stdout.write(f"ℹ️ BuildingMembership υπήρχε ήδη με role: internal_manager")

        # Τελικό μήνυμα
        success_message = f"""
╔══════════════════════════════════════════════════════════════╗
║  ✅ ΕΠΙΤΥΧΙΑ! Ο χρήστης {user.email}
║  είναι τώρα internal_manager του κτιρίου "{building.name}"
╚══════════════════════════════════════════════════════════════╝
        """
        self.stdout.write(self.style.SUCCESS(success_message))  # type: ignore[attr-defined]

