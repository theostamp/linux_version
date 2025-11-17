"""
Unit Tests για την κρίσιμη ροή: Έγκριση Προσφοράς → ScheduledMaintenance → Expenses

🔴 ΚΡΙΣΙΜΑ TESTS - ΜΗΝ ΑΠΕΝΕΡΓΟΠΟΙΗΣΕΤΕ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Αυτά τα tests επαληθεύουν την ολοκληρωμένη ροή
από την έγκριση προσφοράς μέχρι τη δημιουργία δαπανών.

Εκτέλεση:
    docker exec -it linux_version-backend-1 python -m pytest projects/tests/test_offer_approval_flow.py -v

Δείτε: OFFER_PROJECT_EXPENSE_ARCHITECTURE.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context
from rest_framework.test import APIClient
from decimal import Decimal

from projects.models import Project, Offer
from maintenance.models import ScheduledMaintenance
from financial.models import Expense
from buildings.models import Building
from tenants.models import Client, Domain

User = get_user_model()


class OfferApprovalFlowTest(TransactionTestCase):
    """
    🔴 ΚΡΙΣΙΜΟ TEST: Επαλήθευση της πλήρους ροής έγκρισης προσφοράς
    """

    def setUp(self):
        # Δημιουργία demo tenant
        self.tenant = Client.objects.create(
            name='Test Tenant',
            schema_name='test_tenant'
        )

        # Δημιουργία domain για τον tenant
        Domain.objects.create(
            domain='test.localhost',
            tenant=self.tenant,
            is_primary=True
        )

        with schema_context(self.tenant.schema_name):
            # Δημιουργία χρήστη admin
            self.admin_user = User.objects.create_superuser(
                email='admin@test.com',
                password='testpass123'
            )

            # Δημιουργία κτιρίου
            self.building = Building.objects.create(
                name='Test Building',
                address='Test Address 123',
                city='Athens',
                postal_code='12345'
            )

            # Δημιουργία έργου
            self.project = Project.objects.create(
                title='Αντικατάσταση Λέβητα',
                description='Test description',
                building=self.building,
                estimated_cost=Decimal('5000.00'),
                status='planning',
                created_by=self.admin_user
            )

            # Δημιουργία προσφοράς
            self.offer = Offer.objects.create(
                project=self.project,
                contractor_name='Test Contractor',
                contractor_phone='2101234567',
                contractor_email='contractor@test.com',
                amount=Decimal('6500.00'),
                payment_method='installments',
                installments=6,
                advance_payment=Decimal('2000.00'),
                status='submitted'
            )

            # API Client με authentication
            self.client = APIClient()
            self.client.force_authenticate(user=self.admin_user)

    def test_01_offer_approval_creates_scheduled_maintenance(self):
        """
        Test 1: Έγκριση προσφοράς πρέπει να δημιουργεί ScheduledMaintenance
        """
        with schema_context(self.tenant.schema_name):
            # Επαλήθευση αρχικής κατάστασης
            self.assertEqual(self.offer.status, 'submitted')
            self.assertFalse(
                ScheduledMaintenance.objects.filter(linked_project=self.project).exists(),
                "Δεν πρέπει να υπάρχει ScheduledMaintenance πριν την έγκριση"
            )

            # Κλήση του approve endpoint
            response = self.client.post(f'/api/projects/offers/{self.offer.id}/approve/')

            # Επαλήθευση response
            self.assertEqual(response.status_code, 200, "Το approve endpoint πρέπει να επιστρέφει 200")

            # Επαλήθευση ότι η προσφορά εγκρίθηκε
            self.offer.refresh_from_db()
            self.assertEqual(self.offer.status, 'accepted', "Η προσφορά πρέπει να έχει status 'accepted'")

            # Επαλήθευση ότι το project ενημερώθηκε
            self.project.refresh_from_db()
            self.assertEqual(self.project.status, 'approved', "Το project πρέπει να έχει status 'approved'")
            self.assertEqual(self.project.final_cost, self.offer.amount, "Το final_cost πρέπει να ταιριάζει με offer amount")
            self.assertEqual(self.project.selected_contractor, self.offer.contractor_name, "Ο contractor πρέπει να έχει αντιγραφεί")

            # 🔴 ΚΡΙΣΙΜΟ: Επαλήθευση ότι δημιουργήθηκε ScheduledMaintenance
            scheduled_maintenance = ScheduledMaintenance.objects.filter(
                linked_project=self.project
            ).first()

            self.assertIsNotNone(
                scheduled_maintenance,
                "⚠️ ΚΡΙΣΙΜΟ: Πρέπει να δημιουργηθεί ScheduledMaintenance μετά την έγκριση!"
            )

            # Επαλήθευση πεδίων ScheduledMaintenance
            self.assertEqual(scheduled_maintenance.title, self.project.title)
            self.assertEqual(scheduled_maintenance.total_cost, self.offer.amount)
            self.assertEqual(scheduled_maintenance.contractor_name, self.offer.contractor_name)
            self.assertEqual(scheduled_maintenance.contractor_phone, self.offer.contractor_phone)
            self.assertEqual(scheduled_maintenance.contractor_email, self.offer.contractor_email)
            self.assertEqual(scheduled_maintenance.payment_method, self.offer.payment_method)
            self.assertEqual(scheduled_maintenance.installments, self.offer.installments)

    def test_02_offer_approval_creates_expenses(self):
        """
        Test 2: Έγκριση προσφοράς με δόσεις πρέπει να δημιουργεί Expenses
        """
        with schema_context(self.tenant.schema_name):
            # Επαλήθευση αρχικής κατάστασης
            initial_expense_count = Expense.objects.count()

            # Κλήση του approve endpoint
            response = self.client.post(f'/api/projects/offers/{self.offer.id}/approve/')
            self.assertEqual(response.status_code, 200)

            # 🔴 ΚΡΙΣΙΜΟ: Επαλήθευση ότι δημιουργήθηκαν δαπάνες
            expenses = Expense.objects.filter(
                building=self.building,
                title__icontains=self.project.title
            ).order_by('date')

            # Με 6 δόσεις πρέπει να δημιουργηθούν 7 δαπάνες (Προκαταβολή + 6 δόσεις)
            expected_expense_count = 7  # 1 προκαταβολή + 6 δόσεις
            self.assertEqual(
                expenses.count(),
                expected_expense_count,
                f"⚠️ ΚΡΙΣΙΜΟ: Πρέπει να δημιουργηθούν {expected_expense_count} δαπάνες (1 προκαταβολή + 6 δόσεις)"
            )

            # Κάθε δαπάνη έργου πρέπει να χρεώνεται στους ιδιοκτήτες
            for expense in expenses:
                self.assertEqual(
                    expense.payer_responsibility,
                    'owner',
                    f"Οι δαπάνες έργων πρέπει να έχουν payer_responsibility='owner' (expense {expense.id})"
                )

            # Επαλήθευση προκαταβολής
            advance_expense = expenses.filter(title__icontains='Προκαταβολή').first()
            self.assertIsNotNone(advance_expense, "Πρέπει να υπάρχει δαπάνη προκαταβολής")
            self.assertEqual(advance_expense.amount, self.offer.advance_payment)

            # Επαλήθευση δόσεων
            installment_expenses = expenses.filter(title__icontains='Δόση')
            self.assertEqual(installment_expenses.count(), 6, "Πρέπει να υπάρχουν 6 δόσεις")

            # Υπολογισμός αναμενόμενου ποσού δόσης
            remaining_amount = self.offer.amount - self.offer.advance_payment
            expected_installment_amount = remaining_amount / 6

            for expense in installment_expenses:
                self.assertAlmostEqual(
                    float(expense.amount),
                    float(expected_installment_amount),
                    places=2,
                    msg=f"Κάθε δόση πρέπει να είναι {expected_installment_amount}€"
                )

    def test_03_manual_status_change_does_not_create_scheduled_maintenance(self):
        """
        Test 3: Χειροκίνητη αλλαγή status ΔΕΝ πρέπει να δημιουργεί ScheduledMaintenance
        """
        with schema_context(self.tenant.schema_name):
            # Χειροκίνητη αλλαγή status με PATCH (ΛΑΘΟΣ ΤΡΟΠΟΣ)
            response = self.client.patch(
                f'/api/projects/offers/{self.offer.id}/',
                {'status': 'accepted'},
                format='json'
            )

            # Ακόμα και αν η αλλαγή status επιτύχει...
            self.offer.refresh_from_db()

            # ...ΔΕΝ πρέπει να δημιουργηθεί ScheduledMaintenance
            scheduled_maintenance_exists = ScheduledMaintenance.objects.filter(
                linked_project=self.project
            ).exists()

            self.assertFalse(
                scheduled_maintenance_exists,
                "⚠️ Χειροκίνητη αλλαγή status ΔΕΝ πρέπει να δημιουργεί ScheduledMaintenance - χρειάζεται το /approve/ endpoint"
            )

    def test_04_approve_endpoint_is_idempotent(self):
        """
        Test 4: Το approve endpoint πρέπει να είναι idempotent (ασφαλές για πολλαπλές κλήσεις)
        """
        with schema_context(self.tenant.schema_name):
            # Πρώτη κλήση
            response1 = self.client.post(f'/api/projects/offers/{self.offer.id}/approve/')
            self.assertEqual(response1.status_code, 200)

            # Μέτρηση δαπανών μετά την πρώτη κλήση
            expense_count_after_first = Expense.objects.filter(
                building=self.building,
                title__icontains=self.project.title
            ).count()

            # Δεύτερη κλήση (δεν πρέπει να δημιουργήσει διπλά)
            response2 = self.client.post(f'/api/projects/offers/{self.offer.id}/approve/')

            # Μέτρηση δαπανών μετά τη δεύτερη κλήση
            expense_count_after_second = Expense.objects.filter(
                building=self.building,
                title__icontains=self.project.title
            ).count()

            # Δεν πρέπει να δημιουργηθούν επιπλέον δαπάνες
            self.assertEqual(
                expense_count_after_first,
                expense_count_after_second,
                "Πολλαπλές κλήσεις του approve δεν πρέπει να δημιουργούν διπλές δαπάνες"
            )

            # Πρέπει να υπάρχει μόνο ένα ScheduledMaintenance
            sm_count = ScheduledMaintenance.objects.filter(
                linked_project=self.project
            ).count()
            self.assertEqual(sm_count, 1, "Πρέπει να υπάρχει μόνο ένα ScheduledMaintenance ανά project")


def run_critical_tests():
    """
    Συνάρτηση για γρήγορη εκτέλεση των κρίσιμων tests

    Χρήση:
        python -c "from projects.tests.test_offer_approval_flow import run_critical_tests; run_critical_tests()"
    """
    import unittest
    from django.test.utils import get_runner
    from django.conf import settings

    TestRunner = get_runner(settings)
    test_runner = TestRunner(verbosity=2, interactive=True, keepdb=True)

    suite = unittest.TestLoader().loadTestsFromTestCase(OfferApprovalFlowTest)
    failures = test_runner.run_suite(suite)

    if failures:
        print("\n⚠️ ΠΡΟΣΟΧΗ: Κάποια tests απέτυχαν!")
        print("Ελέγξτε το OFFER_PROJECT_EXPENSE_ARCHITECTURE.md")
    else:
        print("\n✅ Όλα τα κρίσιμα tests πέρασαν επιτυχώς!")

    return failures