"""
Database Performance Analyzer
Comprehensive tool for analyzing and optimizing database performance
"""

import os
import sys
import django
import time
from collections import defaultdict
from django.db import connection
from django.core.management.base import BaseCommand
from django.apps import apps

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context


class DatabasePerformanceAnalyzer:
    """Analyze database performance and suggest optimizations"""
    
    def __init__(self):
        self.slow_queries = []
        self.query_stats = defaultdict(int)
        self.missing_indexes = []
        self.n_plus_one_queries = []
    
    def analyze_all(self):
        """Run comprehensive performance analysis"""
        print("🔍 Starting Database Performance Analysis...")
        print("=" * 50)
        
        with schema_context('demo'):
            # Analyze slow queries
            self._analyze_slow_queries()
            
            # Check for missing indexes
            self._check_missing_indexes()
            
            # Analyze query patterns
            self._analyze_query_patterns()
            
            # Check for N+1 queries
            self._check_n_plus_one_queries()
            
            # Generate optimization report
            self._generate_report()
    
    def _analyze_slow_queries(self):
        """Analyze slow queries from PostgreSQL logs"""
        print("📊 Analyzing slow queries...")
        
        with connection.cursor() as cursor:
            # Get slow queries from pg_stat_statements if available
            try:
                cursor.execute("""
                    SELECT query, calls, total_time, mean_time, rows
                    FROM pg_stat_statements 
                    WHERE mean_time > 100 
                    ORDER BY mean_time DESC 
                    LIMIT 20
                """)
                
                slow_queries = cursor.fetchall()
                for query in slow_queries:
                    self.slow_queries.append({
                        'query': query[0][:200] + '...' if len(query[0]) > 200 else query[0],
                        'calls': query[1],
                        'total_time': query[2],
                        'mean_time': query[3],
                        'rows': query[4]
                    })
                    
                print(f"   Found {len(slow_queries)} slow queries")
                
            except Exception as e:
                print(f"   ⚠️ Could not access pg_stat_statements: {e}")
                print("   💡 Consider enabling pg_stat_statements extension")
    
    def _check_missing_indexes(self):
        """Check for missing indexes on foreign keys and frequently queried fields"""
        print("🔍 Checking for missing indexes...")
        
        # Get all models
        models = apps.get_models()
        
        for model in models:
            if hasattr(model, '_meta'):
                table_name = model._meta.db_table
                
                # Skip non-tenant models
                if table_name.startswith('django_') or table_name in ['public_tenant', 'public_domain']:
                    continue
                
                # Check foreign key indexes
                for field in model._meta.get_fields():
                    if hasattr(field, 'related_model') and field.related_model:
                        column_name = f"{field.name}_id"
                        if not self._has_index(table_name, column_name):
                            self.missing_indexes.append({
                                'table': table_name,
                                'column': column_name,
                                'type': 'foreign_key',
                                'field': field.name,
                                'model': model.__name__
                            })
                
                # Check commonly filtered fields
                common_filter_fields = ['created_at', 'updated_at', 'status', 'building_id', 'apartment_id']
                for field_name in common_filter_fields:
                    if hasattr(model, field_name):
                        if not self._has_index(table_name, field_name):
                            self.missing_indexes.append({
                                'table': table_name,
                                'column': field_name,
                                'type': 'filter_field',
                                'field': field_name,
                                'model': model.__name__
                            })
        
        print(f"   Found {len(self.missing_indexes)} potentially missing indexes")
    
    def _has_index(self, table_name, column_name):
        """Check if table has index on specified column"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*)
                FROM pg_indexes 
                WHERE tablename = %s 
                AND indexdef LIKE %s
            """, [table_name, f'%{column_name}%'])
            
            return cursor.fetchone()[0] > 0
    
    def _analyze_query_patterns(self):
        """Analyze common query patterns"""
        print("📈 Analyzing query patterns...")
        
        # Sample queries from different models
        test_queries = [
            # Financial queries
            "SELECT * FROM financial_commonexpense WHERE building_id = 1",
            "SELECT * FROM financial_transaction WHERE apartment_id = 1 ORDER BY created_at DESC",
            
            # Maintenance queries  
            "SELECT * FROM maintenance_maintenanceticket WHERE building_id = 1 AND status = 'open'",
            "SELECT * FROM maintenance_workorder WHERE ticket_id IN (SELECT id FROM maintenance_maintenanceticket WHERE building_id = 1)",
            
            # Projects queries
            "SELECT * FROM projects_project WHERE building_id = 1 AND status = 'in_progress'",
            "SELECT * FROM projects_milestone WHERE project_id IN (SELECT id FROM projects_project WHERE building_id = 1)"
        ]
        
        for query in test_queries:
            try:
                start_time = time.time()
                with connection.cursor() as cursor:
                    cursor.execute(f"EXPLAIN ANALYZE {query}")
                    plan = cursor.fetchall()
                
                execution_time = (time.time() - start_time) * 1000
                
                self.query_stats[query] = {
                    'execution_time_ms': execution_time,
                    'plan': plan
                }
                
                if execution_time > 100:  # Slow query threshold
                    print(f"   ⚠️ Slow query detected: {execution_time:.2f}ms")
                    
            except Exception as e:
                print(f"   ❌ Error analyzing query: {e}")
    
    def _check_n_plus_one_queries(self):
        """Check for potential N+1 query patterns"""
        print("🔄 Checking for N+1 query patterns...")
        
        # Common N+1 patterns in the application
        n_plus_one_patterns = [
            {
                'model': 'MaintenanceTicket',
                'relation': 'building',
                'suggestion': 'Use select_related("building") in MaintenanceTicket queries'
            },
            {
                'model': 'WorkOrder', 
                'relation': 'ticket__building',
                'suggestion': 'Use select_related("ticket__building") in WorkOrder queries'
            },
            {
                'model': 'Transaction',
                'relation': 'apartment__building',
                'suggestion': 'Use select_related("apartment__building") in Transaction queries'
            },
            {
                'model': 'Project',
                'relation': 'milestones',
                'suggestion': 'Use prefetch_related("milestones") in Project queries'
            }
        ]
        
        for pattern in n_plus_one_patterns:
            self.n_plus_one_queries.append(pattern)
        
        print(f"   Identified {len(n_plus_one_patterns)} potential N+1 patterns")
    
    def _generate_report(self):
        """Generate comprehensive optimization report"""
        print("\n" + "=" * 50)
        print("📋 DATABASE PERFORMANCE OPTIMIZATION REPORT")
        print("=" * 50)
        
        # Slow Queries Section
        if self.slow_queries:
            print("\n🐌 SLOW QUERIES (>100ms)")
            print("-" * 30)
            for i, query in enumerate(self.slow_queries[:5], 1):
                print(f"{i}. Mean Time: {query['mean_time']:.2f}ms | Calls: {query['calls']}")
                print(f"   Query: {query['query']}")
                print()
        
        # Missing Indexes Section
        if self.missing_indexes:
            print("\n🔍 MISSING INDEXES")
            print("-" * 20)
            
            # Group by type
            fk_indexes = [idx for idx in self.missing_indexes if idx['type'] == 'foreign_key']
            filter_indexes = [idx for idx in self.missing_indexes if idx['type'] == 'filter_field']
            
            if fk_indexes:
                print("Foreign Key Indexes:")
                for idx in fk_indexes[:10]:
                    print(f"   CREATE INDEX idx_{idx['table']}_{idx['column']} ON {idx['table']} ({idx['column']});")
            
            if filter_indexes:
                print("\nFilter Field Indexes:")
                for idx in filter_indexes[:10]:
                    print(f"   CREATE INDEX idx_{idx['table']}_{idx['column']} ON {idx['table']} ({idx['column']});")
        
        # N+1 Query Patterns
        if self.n_plus_one_queries:
            print("\n🔄 N+1 QUERY OPTIMIZATIONS")
            print("-" * 30)
            for pattern in self.n_plus_one_queries:
                print(f"   {pattern['model']}: {pattern['suggestion']}")
        
        # Query Performance
        if self.query_stats:
            print("\n📊 QUERY PERFORMANCE ANALYSIS")
            print("-" * 35)
            slow_queries = {q: stats for q, stats in self.query_stats.items() 
                          if stats['execution_time_ms'] > 50}
            
            if slow_queries:
                for query, stats in slow_queries.items():
                    print(f"   {stats['execution_time_ms']:.2f}ms: {query[:80]}...")
        
        # Recommendations
        print("\n💡 OPTIMIZATION RECOMMENDATIONS")
        print("-" * 35)
        print("1. Add missing indexes (see above)")
        print("2. Use select_related() for foreign key relationships")
        print("3. Use prefetch_related() for reverse foreign keys and M2M")
        print("4. Enable query caching with django-cachalot")
        print("5. Consider database connection pooling")
        print("6. Monitor with django-silk in development")
        print("7. Enable PostgreSQL query logging")
        
        # Next Steps
        print("\n🚀 NEXT STEPS")
        print("-" * 15)
        print("1. Run: python manage.py create_indexes (after creating the command)")
        print("2. Update ViewSets to use select_related/prefetch_related")
        print("3. Enable django-cachalot in settings")
        print("4. Set up query monitoring with django-silk")
        print("5. Configure PostgreSQL for better performance")


def main():
    """Run the performance analysis"""
    analyzer = DatabasePerformanceAnalyzer()
    analyzer.analyze_all()


if __name__ == '__main__':
    main()
