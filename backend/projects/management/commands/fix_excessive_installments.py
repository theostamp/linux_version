"""
🚨 ΔΙΟΡΘΩΣΗ: Υπερβολικοί Αριθμοί Δόσεων

Management command για διόρθωση projects με υπερβολικές δόσεις (>60)
"""

from django.core.management.base import BaseCommand
from django.db.models import Count
from projects.models import Project
from financial.models import Expense
from decimal import Decimal

# Λογικό max δόσεων: 60 (5 χρόνια)
MAX_REASONABLE_INSTALLMENTS = 60
CUTOFF_YEAR = 2026

class Command(BaseCommand):
    help = 'Fix projects with excessive installments'

    def add_arguments(self, parser):
        parser.add_argument(
            '--live',
            action='store_true',
            help='Apply changes (default is dry-run)',
        )

    def handle(self, *args, **options):
        dry_run = not options['live']
        
        self.stdout.write("=" * 80)
        self.stdout.write("🔍 ΑΝΑΛΥΣΗ ΥΠΕΡΒΟΛΙΚΩΝ ΔΟΣΕΩΝ")
        self.stdout.write("=" * 80 + "\n")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\n⚠️ DRY RUN MODE - Δεν θα γίνουν αλλαγές\n"))
        else:
            self.stdout.write(self.style.ERROR("\n🔥 LIVE MODE - Θα γίνουν αλλαγές!\n"))
        
        # Βρες projects με πολλές δόσεις
        excessive_projects = Project.objects.filter(
            installments__gt=MAX_REASONABLE_INSTALLMENTS
        ).annotate(
            expense_count=Count('expense')
        )
        
        if not excessive_projects.exists():
            self.stdout.write(self.style.SUCCESS("✅ Δεν βρέθηκαν projects με υπερβολικές δόσεις"))
            return
        
        self.stdout.write(f"⚠️ Βρέθηκαν {excessive_projects.count()} projects με >{MAX_REASONABLE_INSTALLMENTS} δόσεις:\n")
        
        total_deleted = 0
        
        for project in excessive_projects:
            self.stdout.write(f"\n📋 Project: {project.title}")
            self.stdout.write(f"   ID: {project.id}")
            self.stdout.write(f"   Δόσεις: {project.installments}")
            self.stdout.write(f"   Expenses: {project.expense_count}")
            
            # Βρες τις δαπάνες του project
            expenses = Expense.objects.filter(project=project).order_by('date')
            if expenses.exists():
                first_expense = expenses.first()
                last_expense = expenses.last()
                self.stdout.write(f"   Πρώτη δαπάνη: {first_expense.date}")
                self.stdout.write(f"   Τελευταία δαπάνη: {last_expense.date}")
                
                # Μέτρα δαπάνες μετά το CUTOFF_YEAR
                future_expenses = expenses.filter(date__year__gt=CUTOFF_YEAR)
                count = future_expenses.count()
                
                if count > 0:
                    self.stdout.write(self.style.WARNING(f"   ⚠️ Δαπάνες μετά το {CUTOFF_YEAR}: {count}"))
                    
                    if not dry_run:
                        future_expenses.delete()
                        self.stdout.write(self.style.SUCCESS(f"   ✅ Διαγράφηκαν {count} δαπάνες"))
                    else:
                        self.stdout.write(f"   📝 DRY RUN: Θα διαγραφούν {count} δαπάνες")
                    
                    total_deleted += count
            
            # Υπολογισμός λογικού αριθμού δόσεων
            remaining_expenses = Expense.objects.filter(
                project=project,
                date__year__lte=CUTOFF_YEAR
            ).count()
            
            new_installments = min(remaining_expenses, MAX_REASONABLE_INSTALLMENTS)
            
            self.stdout.write(f"   📝 Ενημέρωση δόσεων: {project.installments} → {new_installments}")
            
            if not dry_run:
                project.installments = new_installments
                project.save()
                self.stdout.write(self.style.SUCCESS(f"   ✅ Ενημερώθηκε project.installments"))
            else:
                self.stdout.write(f"   📝 DRY RUN: Θα ενημερωθεί σε {new_installments}")
        
        # Σύνοψη
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("📊 ΣΥΝΟΨΗ")
        self.stdout.write("=" * 80)
        self.stdout.write(f"Projects με υπερβολικές δόσεις: {len(list(excessive_projects))}")
        self.stdout.write(f"Δαπάνες προς διαγραφή: {total_deleted}")
        self.stdout.write(f"Cutoff year: {CUTOFF_YEAR}")
        self.stdout.write(f"Max δόσεις: {MAX_REASONABLE_INSTALLMENTS}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\n⚠️ Αυτό ήταν DRY RUN. Τρέξε με --live για να εφαρμόσεις τις αλλαγές."))
        else:
            self.stdout.write(self.style.SUCCESS("\n✅ Διορθώσεις εφαρμόστηκαν!"))

