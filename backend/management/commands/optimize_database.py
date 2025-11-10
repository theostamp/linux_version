"""
Django Management Command for Database Optimization
Automatically applies performance optimizations based on analysis
"""

import os
from django.core.management.base import BaseCommand
from django.db import connection
from django_tenants.utils import schema_context


class Command(BaseCommand):
    help = 'Optimize database performance by adding indexes and analyzing queries'

    def add_arguments(self, parser):
        parser.add_argument(
            '--analyze-only',
            action='store_true',
            help='Only analyze performance, do not apply changes',
        )
        parser.add_argument(
            '--apply-indexes',
            action='store_true', 
            help='Apply recommended database indexes',
        )
        parser.add_argument(
            '--tenant',
            type=str,
            default='demo',
            help='Tenant schema to optimize (default: demo)',
        )

    def handle(self, *args, **options):
        tenant = options['tenant']
        analyze_only = options['analyze_only']
        apply_indexes = options['apply_indexes']

        self.stdout.write(
            self.style.SUCCESS(f'🚀 Starting database optimization for tenant: {tenant}')
        )

        with schema_context(tenant):
            if analyze_only:
                self._analyze_performance()
            elif apply_indexes:
                self._apply_indexes()
            else:
                self._analyze_performance()
                self._apply_indexes()

    def _analyze_performance(self):
        """Analyze current database performance"""
        self.stdout.write("📊 Analyzing database performance...")
        
        with connection.cursor() as cursor:
            # Check table sizes
            cursor.execute("""
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
                FROM pg_tables 
                WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
                ORDER BY size_bytes DESC
                LIMIT 10
            """)
            
            tables = cursor.fetchall()
            self.stdout.write("\n📋 Largest Tables:")
            for table in tables:
                self.stdout.write(f"   {table[1]}: {table[2]}")

            # Check for missing indexes on foreign keys
            cursor.execute("""
                SELECT 
                    t.table_name,
                    c.column_name,
                    c.constraint_name
                FROM information_schema.table_constraints t
                JOIN information_schema.constraint_column_usage c 
                    ON c.constraint_name = t.constraint_name
                WHERE t.constraint_type = 'FOREIGN KEY'
                AND t.table_schema = current_schema()
                AND NOT EXISTS (
                    SELECT 1 FROM pg_indexes 
                    WHERE tablename = t.table_name 
                    AND indexdef LIKE '%' || c.column_name || '%'
                )
            """)
            
            missing_fk_indexes = cursor.fetchall()
            if missing_fk_indexes:
                self.stdout.write(f"\n⚠️  Found {len(missing_fk_indexes)} foreign keys without indexes")
                for fk in missing_fk_indexes[:5]:
                    self.stdout.write(f"   {fk[0]}.{fk[1]}")

    def _apply_indexes(self):
        """Apply recommended database indexes"""
        self.stdout.write("🔧 Applying database optimizations...")
        
        # Recommended indexes based on common query patterns
        indexes = [
            # Financial system indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_transaction_apartment_created ON financial_transaction (apartment_id, created_at DESC)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_transaction_building_month ON financial_transaction (apartment_id, date_trunc('month', created_at))",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_commonexpense_building_month ON financial_commonexpense (building_id, month, year)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_apartmentbalance_apartment ON financial_apartmentbalance (apartment_id)",
            
            # Maintenance system indexes  
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_ticket_building_status ON maintenance_maintenanceticket (building_id, status)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_ticket_created ON maintenance_maintenanceticket (created_at DESC)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_workorder_ticket ON maintenance_workorder (ticket_id)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_workorder_contractor ON maintenance_workorder (contractor_id)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_workorder_status ON maintenance_workorder (status, scheduled_at)",
            
            # Projects system indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_project_building_status ON projects_project (building_id, status)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_milestone_project ON projects_milestone (project_id, due_date)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_offer_rfq ON projects_offer (rfq_id, status)",
            
            # Buildings and apartments
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apartments_apartment_building ON apartments_apartment (building_id, apartment_number)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buildings_building_name ON buildings_building (name)",
            
            # User management
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_customuser_email ON users_customuser (email)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_customuser_role ON users_customuser (role)",
            
            # Todo management
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_todo_item_assigned ON todo_management_todoitem (assigned_to_id, status)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_todo_item_due_date ON todo_management_todoitem (due_date, status)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_todo_category_name ON todo_management_todocategory (name)",
        ]
        
        successful_indexes = 0
        failed_indexes = 0
        
        with connection.cursor() as cursor:
            for index_sql in indexes:
                try:
                    self.stdout.write(f"   Creating index: {index_sql.split('idx_')[1].split(' ')[0]}")
                    cursor.execute(index_sql)
                    successful_indexes += 1
                except Exception as e:
                    if "already exists" not in str(e):
                        self.stdout.write(
                            self.style.WARNING(f"   ⚠️ Failed to create index: {e}")
                        )
                        failed_indexes += 1
                    else:
                        self.stdout.write("   ✅ Index already exists")
                        successful_indexes += 1

        self.stdout.write(
            self.style.SUCCESS(f"\n✅ Applied {successful_indexes} indexes successfully")
        )
        if failed_indexes > 0:
            self.stdout.write(
                self.style.WARNING(f"⚠️ {failed_indexes} indexes failed to create")
            )

        # Update table statistics
        self.stdout.write("📊 Updating table statistics...")
        with connection.cursor() as cursor:
            cursor.execute("ANALYZE;")
        
        self.stdout.write(self.style.SUCCESS("✅ Database optimization completed!"))
        
        # Provide next steps
        self.stdout.write("\n💡 Next Steps:")
        self.stdout.write("1. Monitor query performance with django-silk")
        self.stdout.write("2. Update ViewSets to use select_related/prefetch_related")
        self.stdout.write("3. Enable query caching with django-cachalot")
        self.stdout.write("4. Run performance analysis: python performance_analyzer.py")
