import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.contrib.auth import get_user_model
from buildings.models import Building
from apartments.models import Apartment
from maintenance.models import Contractor, MaintenanceTicket, WorkOrder, ServiceReceipt, ScheduledMaintenance
from projects.models import Project, Offer, Milestone, RFQ
from todo_management.models import TodoCategory, TodoItem

User = get_user_model()

def seed_maintenance_projects_data():
    """Seed demo data for maintenance and projects modules"""
    
    with schema_context('demo'):
        print("🌱 Seeding Maintenance & Projects demo data...")
        
        # Get existing building and users
        try:
            building = Building.objects.get(name__icontains='Αραχώβης')
            print(f"✅ Found building: {building.name}")
        except Building.DoesNotExist:
            print("❌ Building 'Αραχώβης' not found. Please ensure building data exists.")
            return
        
        # Get or create users
        admin_user, created = User.objects.get_or_create(
            email='admin@demo.com',
            defaults={'is_staff': True, 'is_superuser': True}
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            print("✅ Created admin user")
        
        manager_user, created = User.objects.get_or_create(
            email='manager@demo.com',
            defaults={'is_staff': True}
        )
        if created:
            manager_user.set_password('manager123')
            manager_user.save()
            print("✅ Created manager user")
        
        tenant_user, created = User.objects.get_or_create(
            email='tenant@demo.com',
            defaults={'role': 'tenant'}
        )
        if created:
            tenant_user.set_password('tenant123')
            tenant_user.save()
            print("✅ Created tenant user")
        
        # Seed Contractors
        contractors_data = [
            {
                'name': 'Ηλεκτρολογικές Υπηρεσίες Αθήνας',
                'service_type': 'electrical',
                'contact_person': 'Γιάννης Παπαδόπουλος',
                'phone': '2101234567',
                'email': 'info@electrical-athens.gr',
                'address': 'Πατησίων 123, Αθήνα',
                'hourly_rate': Decimal('45.00'),
                'status': 'active'
            },
            {
                'name': 'Υδραυλικά Έργα Μαρούσι',
                'service_type': 'plumbing',
                'contact_person': 'Κώστας Γεωργίου',
                'phone': '2109876543',
                'email': 'kostas@plumbing-marousi.gr',
                'address': 'Κηφισίας 45, Μαρούσι',
                'hourly_rate': Decimal('40.00'),
                'status': 'active'
            },
            {
                'name': 'Συντήρηση Ανελκυστήρων ΑΕ',
                'service_type': 'elevator',
                'contact_person': 'Μαρία Δημητρίου',
                'phone': '2105555555',
                'email': 'maria@elevator-service.gr',
                'address': 'Βουλιαγμένης 200, Γλυφάδα',
                'hourly_rate': Decimal('60.00'),
                'status': 'active'
            },
            {
                'name': 'Καθαριότητα & Φύλαξη',
                'service_type': 'cleaning',
                'contact_person': 'Άννα Κωνσταντίνου',
                'phone': '2103333333',
                'email': 'anna@cleaning-service.gr',
                'address': 'Συγγρού 150, Αθήνα',
                'hourly_rate': Decimal('25.00'),
                'status': 'active'
            }
        ]
        
        contractors = []
        for contractor_data in contractors_data:
            contractor, created = Contractor.objects.get_or_create(
                name=contractor_data['name'],
                defaults=contractor_data
            )
            contractors.append(contractor)
            if created:
                print(f"✅ Created contractor: {contractor.name}")
        
        # Seed Todo Categories for Maintenance
        todo_categories_data = [
            {'name': 'Συντήρηση', 'color': '#FF6B6B', 'icon': 'wrench'},
            {'name': 'Επισκευές', 'color': '#4ECDC4', 'icon': 'hammer'},
            {'name': 'Έργα', 'color': '#45B7D1', 'icon': 'construction'},
            {'name': 'Προσφορές', 'color': '#96CEB4', 'icon': 'file-text'},
        ]
        
        todo_categories = []
        for cat_data in todo_categories_data:
            category, created = TodoCategory.objects.get_or_create(
                name=cat_data['name'],
                defaults=cat_data
            )
            todo_categories.append(category)
            if created:
                print(f"✅ Created todo category: {category.name}")
        
        # Seed Maintenance Tickets
        tickets_data = [
            {
                'title': 'Βλάβη στον ανελκυστήρα',
                'description': 'Ο ανελκυστήρας κολλάει μεταξύ 2ου και 3ου ορόφου',
                'category': 'elevator',
                'priority': 'high',
                'status': 'open',
                'reporter': tenant_user,
                'building': building,
                'apartment': None,  # Common area
                'estimated_cost': Decimal('500.00')
            },
            {
                'title': 'Διαρροή στον κοινόχρηστο χώρο',
                'description': 'Διαρροή νερού στο ισόγειο κοντά στις ταχυδρομικές θυρίδες',
                'category': 'plumbing',
                'priority': 'medium',
                'status': 'triaged',
                'reporter': tenant_user,
                'building': building,
                'apartment': None,
                'estimated_cost': Decimal('200.00')
            },
            {
                'title': 'Προβλήματα φωτισμού στην είσοδο',
                'description': 'Δεν λειτουργούν 3 από τις 5 λάμπες στην κεντρική είσοδο',
                'category': 'electrical',
                'priority': 'medium',
                'status': 'in_progress',
                'reporter': manager_user,
                'building': building,
                'apartment': None,
                'estimated_cost': Decimal('150.00')
            },
            {
                'title': 'Καθαρισμός κοινόχρηστων χώρων',
                'description': 'Εβδομαδιαίος καθαρισμός κλιμακοστασίου και εισόδου',
                'category': 'cleaning',
                'priority': 'low',
                'status': 'completed',
                'reporter': manager_user,
                'building': building,
                'apartment': None,
                'estimated_cost': Decimal('100.00')
            }
        ]
        
        tickets = []
        for ticket_data in tickets_data:
            ticket, created = MaintenanceTicket.objects.get_or_create(
                title=ticket_data['title'],
                building=ticket_data['building'],
                defaults=ticket_data
            )
            tickets.append(ticket)
            if created:
                print(f"✅ Created maintenance ticket: {ticket.title}")
        
        # Seed Work Orders
        work_orders_data = [
            {
                'ticket': tickets[0],  # Elevator issue
                'contractor': contractors[2],  # Elevator service
                'status': 'scheduled',
                'scheduled_at': datetime.now() + timedelta(days=2),
                'estimated_hours': 4,
                'estimated_cost': Decimal('500.00'),
                'notes': 'Προγραμματισμένη επισκευή ανελκυστήρα'
            },
            {
                'ticket': tickets[1],  # Plumbing issue
                'contractor': contractors[1],  # Plumbing service
                'status': 'assigned',
                'scheduled_at': datetime.now() + timedelta(days=1),
                'estimated_hours': 2,
                'estimated_cost': Decimal('200.00'),
                'notes': 'Επισκευή διαρροής'
            },
            {
                'ticket': tickets[2],  # Electrical issue
                'contractor': contractors[0],  # Electrical service
                'status': 'in_progress',
                'scheduled_at': datetime.now() - timedelta(hours=2),
                'estimated_hours': 3,
                'estimated_cost': Decimal('150.00'),
                'notes': 'Αντικατάσταση λαμπτήρων LED'
            }
        ]
        
        work_orders = []
        for wo_data in work_orders_data:
            work_order, created = WorkOrder.objects.get_or_create(
                ticket=wo_data['ticket'],
                contractor=wo_data['contractor'],
                defaults=wo_data
            )
            work_orders.append(work_order)
            if created:
                print(f"✅ Created work order for: {work_order.ticket.title}")
        
        # Seed Service Receipts
        receipts_data = [
            {
                'contractor': contractors[3],  # Cleaning service
                'building': building,
                'amount': Decimal('400.00'),
                'description': 'Μηνιαίος καθαρισμός κοινόχρηστων χώρων - Σεπτέμβριος 2025',
                'service_date': datetime.now() - timedelta(days=5),
                'receipt_number': 'CLN-2025-001',
                'payment_status': 'paid',
                'payment_date': datetime.now() - timedelta(days=2)
            },
            {
                'contractor': contractors[0],  # Electrical service
                'building': building,
                'amount': Decimal('180.00'),
                'description': 'Επισκευή φωτισμού εισόδου',
                'service_date': datetime.now() - timedelta(days=3),
                'receipt_number': 'ELE-2025-001',
                'payment_status': 'pending'
            }
        ]
        
        for receipt_data in receipts_data:
            receipt, created = ServiceReceipt.objects.get_or_create(
                receipt_number=receipt_data['receipt_number'],
                defaults=receipt_data
            )
            if created:
                print(f"✅ Created service receipt: {receipt.receipt_number}")
        
        # Seed Scheduled Maintenance
        scheduled_data = [
            {
                'building': building,
                'title': 'Ετήσιος έλεγχος ανελκυστήρα',
                'description': 'Υποχρεωτικός ετήσιος έλεγχος ασφαλείας ανελκυστήρα',
                'maintenance_type': 'inspection',
                'contractor': contractors[2],
                'scheduled_date': datetime.now() + timedelta(days=30),
                'estimated_cost': Decimal('300.00'),
                'recurrence_type': 'yearly',
                'status': 'scheduled'
            },
            {
                'building': building,
                'title': 'Μηνιαίος καθαρισμός δεξαμενής',
                'description': 'Καθαρισμός και απολύμανση δεξαμενής νερού',
                'maintenance_type': 'cleaning',
                'contractor': contractors[3],
                'scheduled_date': datetime.now() + timedelta(days=15),
                'estimated_cost': Decimal('150.00'),
                'recurrence_type': 'monthly',
                'status': 'scheduled'
            }
        ]
        
        for sched_data in scheduled_data:
            scheduled, created = ScheduledMaintenance.objects.get_or_create(
                title=sched_data['title'],
                building=sched_data['building'],
                defaults=sched_data
            )
            if created:
                print(f"✅ Created scheduled maintenance: {scheduled.title}")
        
        # Seed Projects
        projects_data = [
            {
                'title': 'Ανακαίνιση κοινόχρηστων χώρων',
                'description': 'Πλήρης ανακαίνιση εισόδου και κλιμακοστασίου',
                'building': building,
                'project_type': 'renovation',
                'status': 'planning',
                'budget': Decimal('15000.00'),
                'start_date': datetime.now() + timedelta(days=60),
                'estimated_end_date': datetime.now() + timedelta(days=120),
                'created_by': manager_user
            },
            {
                'title': 'Εγκατάσταση ηλιακών συλλεκτών',
                'description': 'Εγκατάσταση ηλιακών συλλεκτών για οικονομία ενέργειας',
                'building': building,
                'project_type': 'energy_efficiency',
                'status': 'in_progress',
                'budget': Decimal('25000.00'),
                'start_date': datetime.now() - timedelta(days=15),
                'estimated_end_date': datetime.now() + timedelta(days=45),
                'created_by': admin_user
            }
        ]
        
        projects = []
        for proj_data in projects_data:
            project, created = Project.objects.get_or_create(
                title=proj_data['title'],
                building=proj_data['building'],
                defaults=proj_data
            )
            projects.append(project)
            if created:
                print(f"✅ Created project: {project.title}")
        
        # Seed RFQs and Offers
        rfq_data = {
            'title': 'Προσφορά για ανακαίνιση κοινόχρηστων χώρων',
            'description': 'Ζητείται προσφορά για πλήρη ανακαίνιση εισόδου και κλιμακοστασίου',
            'building': building,
            'project': projects[0],
            'budget_range_min': Decimal('10000.00'),
            'budget_range_max': Decimal('20000.00'),
            'deadline': datetime.now() + timedelta(days=30),
            'status': 'sent',
            'created_by': manager_user
        }
        
        rfq, created = RFQ.objects.get_or_create(
            title=rfq_data['title'],
            building=rfq_data['building'],
            defaults=rfq_data
        )
        if created:
            print(f"✅ Created RFQ: {rfq.title}")
        
        # Seed Offers
        offers_data = [
            {
                'rfq': rfq,
                'vendor_name': 'Κατασκευαστική Αθήνας ΑΕ',
                'vendor_email': 'info@construction-athens.gr',
                'vendor_phone': '2107777777',
                'amount': Decimal('16500.00'),
                'description': 'Πλήρης ανακαίνιση με υλικά premium ποιότητας',
                'valid_until': datetime.now() + timedelta(days=45),
                'status': 'received',
                'submitted_at': datetime.now() - timedelta(days=5)
            },
            {
                'rfq': rfq,
                'vendor_name': 'Οικοδομικές Εργασίες Πειραιάς',
                'vendor_email': 'contact@construction-piraeus.gr',
                'vendor_phone': '2108888888',
                'amount': Decimal('14200.00'),
                'description': 'Οικονομική λύση με καλή ποιότητα υλικών',
                'valid_until': datetime.now() + timedelta(days=40),
                'status': 'received',
                'submitted_at': datetime.now() - timedelta(days=3)
            }
        ]
        
        offers = []
        for offer_data in offers_data:
            offer, created = Offer.objects.get_or_create(
                rfq=offer_data['rfq'],
                vendor_name=offer_data['vendor_name'],
                defaults=offer_data
            )
            offers.append(offer)
            if created:
                print(f"✅ Created offer from: {offer.vendor_name}")
        
        # Seed Milestones
        milestones_data = [
            {
                'project': projects[1],  # Solar panels project
                'title': 'Μελέτη και άδειες',
                'description': 'Εκπόνηση μελέτης και έκδοση απαραίτητων αδειών',
                'due_date': datetime.now() + timedelta(days=15),
                'budget': Decimal('3000.00'),
                'status': 'in_progress',
                'completion_percentage': 75
            },
            {
                'project': projects[1],
                'title': 'Προμήθεια υλικών',
                'description': 'Παραγγελία και παραλαβή ηλιακών συλλεκτών',
                'due_date': datetime.now() + timedelta(days=25),
                'budget': Decimal('15000.00'),
                'status': 'pending',
                'completion_percentage': 0
            },
            {
                'project': projects[1],
                'title': 'Εγκατάσταση συστήματος',
                'description': 'Εγκατάσταση ηλιακών συλλεκτών και συνδέσεων',
                'due_date': datetime.now() + timedelta(days=45),
                'budget': Decimal('7000.00'),
                'status': 'pending',
                'completion_percentage': 0
            }
        ]
        
        for milestone_data in milestones_data:
            milestone, created = Milestone.objects.get_or_create(
                project=milestone_data['project'],
                title=milestone_data['title'],
                defaults=milestone_data
            )
            if created:
                print(f"✅ Created milestone: {milestone.title}")
        
        # Seed Todo Items linked to maintenance/projects
        todo_items_data = [
            {
                'title': 'Επικοινωνία με συνεργείο ανελκυστήρα',
                'description': 'Τηλεφωνική επικοινωνία για προγραμματισμό επισκευής',
                'category': todo_categories[0],  # Συντήρηση
                'due_date': datetime.now() + timedelta(days=1),
                'priority': 'high',
                'status': 'pending',
                'assigned_to': manager_user,
                'created_by': admin_user
            },
            {
                'title': 'Έλεγχος προσφορών ανακαίνισης',
                'description': 'Αξιολόγηση και σύγκριση προσφορών για την ανακαίνιση',
                'category': todo_categories[3],  # Προσφορές
                'due_date': datetime.now() + timedelta(days=7),
                'priority': 'medium',
                'status': 'pending',
                'assigned_to': admin_user,
                'created_by': manager_user
            },
            {
                'title': 'Ενημέρωση ιδιοκτητών για έργο ηλιακών',
                'description': 'Αποστολή ενημερωτικού email για την πρόοδο του έργου',
                'category': todo_categories[2],  # Έργα
                'due_date': datetime.now() + timedelta(days=3),
                'priority': 'medium',
                'status': 'pending',
                'assigned_to': manager_user,
                'created_by': admin_user
            }
        ]
        
        for todo_data in todo_items_data:
            todo_item, created = TodoItem.objects.get_or_create(
                title=todo_data['title'],
                created_by=todo_data['created_by'],
                defaults=todo_data
            )
            if created:
                print(f"✅ Created todo item: {todo_item.title}")
        
        print("\n🎉 Maintenance & Projects demo data seeding completed!")
        print("\n📊 Summary:")
        print(f"   • {len(contractors)} Contractors")
        print(f"   • {len(tickets)} Maintenance Tickets")
        print(f"   • {len(work_orders)} Work Orders")
        print(f"   • {ServiceReceipt.objects.count()} Service Receipts")
        print(f"   • {ScheduledMaintenance.objects.count()} Scheduled Maintenance")
        print(f"   • {len(projects)} Projects")
        print(f"   • 1 RFQ with {len(offers)} Offers")
        print(f"   • {Milestone.objects.count()} Milestones")
        print(f"   • {len(todo_categories)} Todo Categories")
        print(f"   • {TodoItem.objects.count()} Todo Items")
        print("\n🔑 Demo Users Created:")
        print("   • admin@demo.com / admin123 (Admin)")
        print("   • manager@demo.com / manager123 (Manager)")
        print("   • tenant@demo.com / tenant123 (Tenant)")


if __name__ == '__main__':
    seed_maintenance_projects_data()
