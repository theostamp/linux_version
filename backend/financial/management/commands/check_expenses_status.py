from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context
from financial.models import Expense
from buildings.models import Building
from datetime import datetime

class Command(BaseCommand):
    help = 'Check expenses status for Alkmanos building'

    def handle(self, *args, **options):
        with schema_context('demo'):
            building = Building.objects.filter(id=4).first()
            if not building:
                self.stdout.write(self.style.ERROR("❌ Δεν βρέθηκε κτίριο Αλκμάνος (ID: 4)"))
                return
            
            self.stdout.write(f"🏢 Κτίριο: {building.name}")
            self.stdout.write(f"🏠 Διαμερίσματα: {building.apartments_count}")
            self.stdout.write(f"💰 Αμοιβή διαχείρισης: {building.management_fee_per_apartment}€/διαμέρισμα")
            self.stdout.write(f"💵 Συνολική αμοιβή: {building.management_fee_per_apartment * building.apartments_count}€")
            
            # Έλεγχος αποθεματικού
            self.stdout.write("\n📊 ΑΠΟΘΕΜΑΤΙΚΟ:")
            self.stdout.write(f"   Στόχος: {building.reserve_fund_goal}€")
            self.stdout.write(f"   Διάρκεια: {building.reserve_fund_duration_months} μήνες")
            self.stdout.write(f"   Μηνιαία εισφορά: {building.reserve_fund_goal / building.reserve_fund_duration_months if building.reserve_fund_duration_months else 0}€")
            
            # Έλεγχος δαπανών
            self.stdout.write("\n💸 ΔΑΠΑΝΕΣ:")
            
            # Όλες οι δαπάνες
            all_expenses = Expense.objects.filter(building=building)
            total_expenses = sum(exp.amount for exp in all_expenses)
            
            self.stdout.write(f"   Συνολικές δαπάνες: {len(all_expenses)}")
            self.stdout.write(f"   Συνολικό ποσό: {total_expenses}€")
            
            if len(all_expenses) == 0:
                self.stdout.write(self.style.WARNING("   ⚠️  ΔΕΝ ΥΠΑΡΧΟΥΝ ΔΑΠΑΝΕΣ ΣΤΟ ΣΥΣΤΗΜΑ!"))
                self.stdout.write("   ❓ Αυτό εξηγεί γιατί τα 'Τρέχοντα έξοδα' είναι 0,00€")
            else:
                for expense in all_expenses:
                    self.stdout.write(f"   - {expense.title}: {expense.amount}€ ({expense.date})")
            
            # Έλεγχος τρέχοντος μήνα
            current_month = datetime.now().month
            current_year = datetime.now().year
            
            monthly_expenses = Expense.objects.filter(
                building=building,
                date__year=current_year,
                date__month=current_month
            )
            monthly_total = sum(exp.amount for exp in monthly_expenses)
            
            self.stdout.write(f"\n📅 ΤΡΕΧΩΝ ΜΗΝΑΣ ({current_month}/{current_year}):")
            self.stdout.write(f"   Δαπάνες τρέχοντος μήνα: {len(monthly_expenses)}")
            self.stdout.write(f"   Ποσό τρέχοντος μήνα: {monthly_total}€")
            
            # Σύνοψη
            self.stdout.write("\n📋 ΣΥΝΟΨΗ:")
            self.stdout.write("   🔍 Πρόβλημα: Τα 'Συνολικά έξοδα' περιλαμβάνουν το αποθεματικό")
            self.stdout.write("   💡 Λύση: Το αποθεματικό δεν είναι έξοδο, είναι εισφορά")
            self.stdout.write(f"   ✅ Σωστή λογική: Έξοδα = {monthly_total}€, Εισφορά = {building.reserve_fund_goal / building.reserve_fund_duration_months if building.reserve_fund_duration_months else 0}€")
            
            if len(all_expenses) == 0 and building.reserve_fund_goal > 0:
                self.stdout.write(self.style.SUCCESS("\n🎯 ΕΠΙΒΕΒΑΙΩΣΗ: Χωρίς δαπάνες, τα 'Τρέχοντα έξοδα' πρέπει να είναι 0€!"))


