"""
Management Command: delete_future_expenses

Διαγράφει δαπάνες με ημερομηνία στο μέλλον (management fees, reserve fund κλπ)
που δημιουργήθηκαν λανθασμένα και προκαλούν σύγχυση στους υπολογισμούς.

Χρήση:
    # Dry run (εμφάνιση χωρίς διαγραφή):
    python manage.py delete_future_expenses --dry-run
    
    # Διαγραφή:
    python manage.py delete_future_expenses
    
    # Διαγραφή για συγκεκριμένο κτίριο:
    python manage.py delete_future_expenses --building-id 2

Δημιουργήθηκε: 2025-12-05
"""

from datetime import date
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count

from financial.models import Expense
from financial.utils.date_helpers import get_next_month_start
from buildings.models import Building


class Command(BaseCommand):
    help = 'Διαγράφει δαπάνες με ημερομηνία στο μέλλον'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Εμφάνιση δαπανών χωρίς διαγραφή'
        )
        parser.add_argument(
            '--building-id',
            type=int,
            help='ID κτιρίου (προαιρετικό - αν δεν δοθεί, επεξεργάζεται όλα τα κτίρια)'
        )
        parser.add_argument(
            '--category',
            type=str,
            choices=['management_fees', 'reserve_fund', 'all'],
            default='all',
            help='Κατηγορία δαπανών (default: all)'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        building_id = options.get('building_id')
        category = options.get('category', 'all')
        
        today = date.today()
        next_month_start = get_next_month_start(today)
        
        self.stdout.write(self.style.NOTICE(
            f"\n{'='*60}\n"
            f"🗑️  ΔΙΑΓΡΑΦΗ ΜΕΛΛΟΝΤΙΚΩΝ ΔΑΠΑΝΩΝ\n"
            f"{'='*60}\n"
            f"Σημερινή ημερομηνία: {today}\n"
            f"Μελλοντικές δαπάνες: ημερομηνία ≥ {next_month_start} (επόμενος μήνας και μετά)\n"
            f"{'Dry run: ΝΑΙ (δεν θα γίνει διαγραφή)' if dry_run else 'ΠΡΟΣΟΧΗ: Θα γίνει ΠΡΑΓΜΑΤΙΚΗ διαγραφή!'}\n"
        ))
        
        # Βασικό query για μελλοντικές δαπάνες
        future_expenses = Expense.objects.filter(date__gte=next_month_start)
        
        # Φίλτρο κτιρίου
        if building_id:
            future_expenses = future_expenses.filter(building_id=building_id)
            building = Building.objects.get(id=building_id)
            self.stdout.write(f"Κτίριο: {building.name}\n")
        
        # Φίλτρο κατηγορίας
        if category != 'all':
            future_expenses = future_expenses.filter(category=category)
            self.stdout.write(f"Κατηγορία: {category}\n")
        
        self.stdout.write(f"{'='*60}\n\n")
        
        # Στατιστικά ανά κατηγορία
        stats = future_expenses.values('category').annotate(
            count=Count('id')
        ).order_by('category')
        
        total_count = future_expenses.count()
        total_amount = sum(exp.amount for exp in future_expenses)
        
        if total_count == 0:
            self.stdout.write(self.style.SUCCESS(
                "✅ Δεν βρέθηκαν μελλοντικές δαπάνες για διαγραφή!\n"
            ))
            return
        
        self.stdout.write(f"📊 Βρέθηκαν {total_count} μελλοντικές δαπάνες:\n\n")
        
        for stat in stats:
            self.stdout.write(f"  • {stat['category']}: {stat['count']} δαπάνες\n")
        
        self.stdout.write(f"\n💰 Συνολικό ποσό: {total_amount:,.2f} €\n\n")
        
        # Λίστα δαπανών
        self.stdout.write("📋 Λίστα μελλοντικών δαπανών:\n")
        self.stdout.write("-" * 80 + "\n")
        
        for exp in future_expenses.order_by('date', 'building__name')[:50]:
            self.stdout.write(
                f"  [{exp.id}] {exp.date} | {exp.building.name[:20]:<20} | "
                f"{exp.category:<15} | {exp.amount:>10,.2f} € | {exp.title[:30]}\n"
            )
        
        if total_count > 50:
            self.stdout.write(f"  ... και {total_count - 50} ακόμη\n")
        
        self.stdout.write("-" * 80 + "\n\n")
        
        if dry_run:
            self.stdout.write(self.style.WARNING(
                "⚠️  DRY RUN - Δεν έγινε διαγραφή.\n"
                "   Τρέξτε χωρίς --dry-run για πραγματική διαγραφή.\n"
            ))
        else:
            # Επιβεβαίωση
            self.stdout.write(self.style.WARNING(
                f"⚠️  ΠΡΟΣΟΧΗ: Θα διαγραφούν {total_count} δαπάνες ({total_amount:,.2f} €)!\n"
            ))
            
            with transaction.atomic():
                deleted_count, _ = future_expenses.delete()
                
                self.stdout.write(self.style.SUCCESS(
                    f"\n✅ Διαγράφηκαν επιτυχώς {deleted_count} μελλοντικές δαπάνες!\n"
                ))
