"""
Management command για διαγραφή προσκλήσεων ενός χρήστη (όχι του ίδιου του χρήστη).
"""

from django.core.management.base import BaseCommand, CommandError
from users.models_invitation import TenantInvitation
from users.models import CustomUser


class Command(BaseCommand):
    help = 'Διαγράφει όλες τις προσκλήσεις ενός χρήστη (όχι τον ίδιο τον χρήστη)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            required=True,
            help='Email του χρήστη του οποίου οι προσκλήσεις θα διαγραφούν'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Εμφάνιση μόνο (χωρίς διαγραφή)'
        )

    def handle(self, *args, **options):
        email = options['email']
        dry_run = options['dry_run']

        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('🗑️  ΔΙΑΓΡΑΦΗ ΠΡΟΣΚΛΗΣΕΩΝ ΧΡΗΣΤΗ'))
        self.stdout.write(self.style.SUCCESS('=' * 60 + '\n'))

        # Έλεγχος αν υπάρχει ο χρήστης
        try:
            user = CustomUser.objects.get(email=email)
            self.stdout.write(f"✅ Βρέθηκε χρήστης: {user.email} (ID: {user.id})")
        except CustomUser.DoesNotExist:
            self.stdout.write(self.style.WARNING(f"⚠️ Ο χρήστης {email} δεν υπάρχει στη βάση"))
            self.stdout.write(self.style.WARNING("Θα διαγραφούν οι προσκλήσεις με αυτό το email ανεξάρτητα από το αν υπάρχει χρήστης.\n"))

        # Εύρεση προσκλήσεων
        # 1. Προσκλήσεις που στάλθηκαν σε αυτό το email
        invitations_by_email = TenantInvitation.objects.filter(email=email)
        
        # 2. Προσκλήσεις που δημιούργησαν αυτόν τον χρήστη (αν υπάρχει)
        invitations_by_user = TenantInvitation.objects.none()
        if 'user' in locals():
            invitations_by_user = TenantInvitation.objects.filter(created_user=user)
        
        # 3. Προσκλήσεις που στάλθηκαν από αυτόν τον χρήστη (αν υπάρχει)
        invitations_sent_by_user = TenantInvitation.objects.none()
        if 'user' in locals():
            invitations_sent_by_user = TenantInvitation.objects.filter(invited_by=user)

        # Σύνολο προσκλήσεων
        all_invitations = invitations_by_email | invitations_by_user | invitations_sent_by_user
        all_invitations = all_invitations.distinct()

        total_count = all_invitations.count()

        if total_count == 0:
            self.stdout.write(self.style.WARNING("ℹ️ Δεν βρέθηκαν προσκλήσεις για αυτόν τον χρήστη."))
            return

        self.stdout.write(f"\n📋 Βρέθηκαν {total_count} προσκλήσεις:")
        self.stdout.write(f"   - Με email: {email}: {invitations_by_email.count()}")
        if 'user' in locals():
            self.stdout.write(f"   - Δημιουργήθηκαν από: {invitations_by_user.count()}")
            self.stdout.write(f"   - Στάλθηκαν από: {invitations_sent_by_user.count()}")

        # Εμφάνιση λεπτομερειών
        self.stdout.write(f"\n📝 Λεπτομέρειες προσκλήσεων:")
        for inv in all_invitations[:10]:  # Εμφάνιση πρώτων 10
            self.stdout.write(f"   - ID: {inv.id}, Email: {inv.email}, Status: {inv.status}, Invited by: {inv.invited_by.email if inv.invited_by else 'N/A'}")
        if total_count > 10:
            self.stdout.write(f"   ... και {total_count - 10} ακόμα")

        if dry_run:
            self.stdout.write(self.style.WARNING(f"\n🔍 DRY RUN: Θα διαγραφούν {total_count} προσκλήσεις"))
            self.stdout.write(self.style.WARNING("Χρησιμοποίησε χωρίς --dry-run για πραγματική διαγραφή"))
            return

        # Επιβεβαίωση
        self.stdout.write(self.style.WARNING(f"\n⚠️  Θα διαγραφούν {total_count} προσκλήσεις"))
        self.stdout.write(self.style.WARNING("Ο χρήστης ΔΕΝ θα διαγραφεί, μόνο οι προσκλήσεις!"))

        # Διαγραφή
        deleted_count = 0
        for inv in all_invitations:
            try:
                inv.delete()
                deleted_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Σφάλμα διαγραφής προσκλήσης {inv.id}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"\n✅ Διαγράφηκαν {deleted_count} από {total_count} προσκλήσεις"))
        self.stdout.write(self.style.SUCCESS(f"✅ Ο χρήστης {email} παραμένει στη βάση"))

        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60 + '\n'))

