from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime
from financial.models import Expense
from todo_management.models import TodoCategory, TodoItem


class Command(BaseCommand):
    help = "Συγχρονισμός υπάρχουσων δαπανών στο ημερολόγιο"

    def add_arguments(self, parser):
        parser.add_argument(
            '--building-id',
            type=int,
            help='ID του κτιρίου (αν δεν δοθεί, επεξεργάζεται όλα τα κτίρια)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Εμφάνιση τι θα γίνει χωρίς να γίνουν αλλαγές',
        )

    def handle(self, *args, **options):
        building_id = options.get('building_id')
        dry_run = options.get('dry_run', False)
        
        User = get_user_model()
        actor = User.objects.filter(is_superuser=True).first()
        
        if not actor:
            self.stdout.write(
                self.style.ERROR('Δεν βρέθηκε superuser για την εκτέλεση')
            )
            return
        
        # Φίλτρο δαπανών
        expenses_query = Expense.objects.filter(add_to_calendar=True)
        if building_id:
            expenses_query = expenses_query.filter(building_id=building_id)
        
        expenses = expenses_query.select_related('building')
        
        self.stdout.write(f"Βρέθηκαν {expenses.count()} δαπάνες για συγχρονισμό")
        
        created = 0
        skipped = 0
        
        for expense in expenses:
            # Έλεγχος αν υπάρχει ήδη TodoItem για αυτή τη δαπάνη
            existing_todo = TodoItem.objects.filter(
                building=expense.building,
                tags__contains=[f"expense:{expense.id}"]
            ).exists()
            
            if existing_todo:
                skipped += 1
                continue
            
            if not dry_run:
                # Δημιουργία κατηγορίας αν δεν υπάρχει
                category, _ = TodoCategory.objects.get_or_create(
                    building_id=expense.building.id,
                    name="Λειτουργικές Δαπάνες",
                    defaults={
                        "icon": "trending-up",
                        "color": "blue",
                        "description": "Αυτόματα TODOs από λειτουργικές δαπάνες",
                    },
                )
                
                # Προσδιορισμός ημερομηνίας λήξης
                if expense.due_date:
                    due_dt = timezone.make_aware(datetime.combine(expense.due_date, datetime.min.time()))
                else:
                    due_dt = timezone.make_aware(datetime.combine(expense.date, datetime.min.time()))
                
                # Δημιουργία TodoItem
                TodoItem.objects.create(
                    title=f"Πληρωμή: {expense.title}",
                    description=f"Δαπάνη €{expense.amount} - {expense.get_category_display()}",
                    category=category,
                    building=expense.building,
                    apartment=None,
                    priority="medium",
                    status="pending",
                    due_date=due_dt,
                    created_by=actor,
                    tags=["expense", f"expense:{expense.id}", expense.category]
                )
            
            created += 1
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'DRY RUN: Θα δημιουργηθούν {created} TODOs, θα παραληφθούν {skipped} (υπάρχουν ήδη)')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'Δημιουργήθηκαν {created} TODOs, παραλείφθηκαν {skipped} (υπάρχουν ήδη)')
            )
