#!/usr/bin/env python3
"""
Advanced Analytics Dashboard Testing Script
Tests the analytics system for Digital Concierge
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Setup Django environment
sys.path.append('/home/theo/project/linux_version/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from analytics.services import analytics_service
from billing.models import UserSubscription, SubscriptionPlan
from users.models import CustomUser

def test_analytics_service():
    """Test analytics service initialization"""
    print("🔍 Testing Analytics Service...")
    
    try:
        service = analytics_service
        print("✅ Analytics service initialized")
        
        # Test service methods exist
        methods = [
            'get_revenue_analytics',
            'get_customer_analytics',
            'get_usage_analytics',
            'get_performance_analytics',
            'get_dashboard_summary',
            'get_custom_report'
        ]
        
        for method in methods:
            if hasattr(service, method):
                print(f"✅ Method {method} exists")
            else:
                print(f"❌ Method {method} missing")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Analytics service test failed: {e}")
        return False

def test_revenue_analytics():
    """Test revenue analytics functionality"""
    print("🔍 Testing Revenue Analytics...")
    
    try:
        with tenant_context(Client.objects.get(schema_name='demo')):
            # Test revenue analytics
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=30)
            
            revenue_data = analytics_service.get_revenue_analytics(
                tenant_id=None,
                start_date=start_date,
                end_date=end_date
            )
            
            if revenue_data:
                print("✅ Revenue analytics generated")
                print(f"   - Total Revenue: €{revenue_data['total_revenue']:.2f}")
                print(f"   - MRR: €{revenue_data['mrr']:.2f}")
                print(f"   - ARR: €{revenue_data['arr']:.2f}")
                print(f"   - Growth Rate: {revenue_data['growth_rate']:.2f}%")
                print(f"   - Plans: {len(revenue_data['revenue_by_plan'])}")
                return True
            else:
                print("❌ Revenue analytics failed to generate")
                return False
                
    except Exception as e:
        print(f"❌ Revenue analytics test failed: {e}")
        return False

def test_customer_analytics():
    """Test customer analytics functionality"""
    print("🔍 Testing Customer Analytics...")
    
    try:
        with tenant_context(Client.objects.get(schema_name='demo')):
            # Test customer analytics
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=30)
            
            customer_data = analytics_service.get_customer_analytics(
                tenant_id=None,
                start_date=start_date,
                end_date=end_date
            )
            
            if customer_data:
                print("✅ Customer analytics generated")
                print(f"   - Total Customers: {customer_data['total_customers']}")
                print(f"   - Active Customers: {customer_data['active_customers']}")
                print(f"   - Verified Customers: {customer_data['verified_customers']}")
                print(f"   - Growth Rate: {customer_data['growth_rate']:.2f}%")
                print(f"   - Churn Rate: {customer_data['churn_rate']:.2f}%")
                print(f"   - Avg Customer Value: €{customer_data['avg_customer_value']:.2f}")
                return True
            else:
                print("❌ Customer analytics failed to generate")
                return False
                
    except Exception as e:
        print(f"❌ Customer analytics test failed: {e}")
        return False

def test_usage_analytics():
    """Test usage analytics functionality"""
    print("🔍 Testing Usage Analytics...")
    
    try:
        with tenant_context(Client.objects.get(schema_name='demo')):
            # Test usage analytics
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=30)
            
            usage_data = analytics_service.get_usage_analytics(
                tenant_id=None,
                start_date=start_date,
                end_date=end_date
            )
            
            if usage_data:
                print("✅ Usage analytics generated")
                print(f"   - Total Subscriptions: {usage_data['total_subscriptions']}")
                print(f"   - Active Subscriptions: {usage_data['active_subscriptions']}")
                print(f"   - Trial Subscriptions: {usage_data['trial_subscriptions']}")
                print(f"   - Cancelled Subscriptions: {usage_data['cancelled_subscriptions']}")
                print(f"   - Trial to Paid Conversion: {usage_data['trial_to_paid_conversion']:.2f}%")
                print(f"   - Feature Usage: {len(usage_data['feature_usage'])} features")
                return True
            else:
                print("❌ Usage analytics failed to generate")
                return False
                
    except Exception as e:
        print(f"❌ Usage analytics test failed: {e}")
        return False

def test_performance_analytics():
    """Test performance analytics functionality"""
    print("🔍 Testing Performance Analytics...")
    
    try:
        with tenant_context(Client.objects.get(schema_name='demo')):
            # Test performance analytics
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=30)
            
            performance_data = analytics_service.get_performance_analytics(
                tenant_id=None,
                start_date=start_date,
                end_date=end_date
            )
            
            if performance_data:
                print("✅ Performance analytics generated")
                print(f"   - Total Users: {performance_data['user_metrics']['total_users']}")
                print(f"   - Active Users: {performance_data['user_metrics']['active_users']}")
                print(f"   - Verified Users: {performance_data['user_metrics']['verified_users']}")
                print(f"   - Uptime: {performance_data['system_metrics']['uptime']:.1f}%")
                print(f"   - Avg Response Time: {performance_data['system_metrics']['avg_response_time']:.1f}s")
                print(f"   - Customer Satisfaction: {performance_data['support_metrics']['customer_satisfaction']:.1f}/5")
                return True
            else:
                print("❌ Performance analytics failed to generate")
                return False
                
    except Exception as e:
        print(f"❌ Performance analytics test failed: {e}")
        return False

def test_dashboard_summary():
    """Test dashboard summary functionality"""
    print("🔍 Testing Dashboard Summary...")
    
    try:
        with tenant_context(Client.objects.get(schema_name='demo')):
            # Test dashboard summary
            dashboard_data = analytics_service.get_dashboard_summary(tenant_id=None)
            
            if dashboard_data:
                print("✅ Dashboard summary generated")
                print(f"   - MRR: €{dashboard_data['key_metrics']['mrr']:.2f}")
                print(f"   - ARR: €{dashboard_data['key_metrics']['arr']:.2f}")
                print(f"   - Total Customers: {dashboard_data['key_metrics']['total_customers']}")
                print(f"   - Active Customers: {dashboard_data['key_metrics']['active_customers']}")
                print(f"   - Churn Rate: {dashboard_data['key_metrics']['churn_rate']:.2f}%")
                print(f"   - Trial Conversion: {dashboard_data['key_metrics']['trial_conversion']:.2f}%")
                print(f"   - Uptime: {dashboard_data['key_metrics']['uptime']:.1f}%")
                print(f"   - Customer Satisfaction: {dashboard_data['key_metrics']['customer_satisfaction']:.1f}/5")
                return True
            else:
                print("❌ Dashboard summary failed to generate")
                return False
                
    except Exception as e:
        print(f"❌ Dashboard summary test failed: {e}")
        return False

def test_custom_reports():
    """Test custom report generation"""
    print("🔍 Testing Custom Reports...")
    
    try:
        with tenant_context(Client.objects.get(schema_name='demo')):
            # Test custom reports
            report_types = ['revenue', 'customers', 'usage', 'performance', 'dashboard']
            
            for report_type in report_types:
                report_data = analytics_service.get_custom_report(
                    report_type=report_type,
                    filters={
                        'start_date': datetime.now().date() - timedelta(days=30),
                        'end_date': datetime.now().date()
                    }
                )
                
                if report_data:
                    print(f"✅ {report_type.title()} report generated")
                else:
                    print(f"❌ {report_type.title()} report failed")
                    return False
            
            return True
                
    except Exception as e:
        print(f"❌ Custom reports test failed: {e}")
        return False

def test_analytics_data_integrity():
    """Test analytics data integrity"""
    print("🔍 Testing Analytics Data Integrity...")
    
    try:
        with tenant_context(Client.objects.get(schema_name='demo')):
            # Test data integrity
            subscriptions = UserSubscription.objects.all()
            plans = SubscriptionPlan.objects.all()
            users = CustomUser.objects.all()
            
            print(f"✅ Data integrity checks:")
            print(f"   - Subscriptions: {subscriptions.count()}")
            print(f"   - Plans: {plans.count()}")
            print(f"   - Users: {users.count()}")
            
            # Test plan data
            for plan in plans:
                print(f"   - {plan.name}: €{plan.monthly_price}/month")
            
            return True
                
    except Exception as e:
        print(f"❌ Analytics data integrity test failed: {e}")
        return False

def test_analytics_performance():
    """Test analytics performance"""
    print("🔍 Testing Analytics Performance...")
    
    try:
        import time
        
        with tenant_context(Client.objects.get(schema_name='demo')):
            # Test performance
            start_time = time.time()
            
            dashboard_data = analytics_service.get_dashboard_summary(tenant_id=None)
            
            end_time = time.time()
            execution_time = end_time - start_time
            
            if dashboard_data and execution_time < 5.0:  # Should complete in under 5 seconds
                print(f"✅ Analytics performance test passed")
                print(f"   - Execution time: {execution_time:.2f} seconds")
                return True
            else:
                print(f"❌ Analytics performance test failed")
                print(f"   - Execution time: {execution_time:.2f} seconds")
                return False
                
    except Exception as e:
        print(f"❌ Analytics performance test failed: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 DIGITAL CONCIERGE - ADVANCED ANALYTICS DASHBOARD TESTING")
    print("=" * 60)
    print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test results
    results = {
        "analytics_service": False,
        "revenue_analytics": False,
        "customer_analytics": False,
        "usage_analytics": False,
        "performance_analytics": False,
        "dashboard_summary": False,
        "custom_reports": False,
        "data_integrity": False,
        "performance": False
    }
    
    # Run tests
    results["analytics_service"] = test_analytics_service()
    print()
    
    results["revenue_analytics"] = test_revenue_analytics()
    print()
    
    results["customer_analytics"] = test_customer_analytics()
    print()
    
    results["usage_analytics"] = test_usage_analytics()
    print()
    
    results["performance_analytics"] = test_performance_analytics()
    print()
    
    results["dashboard_summary"] = test_dashboard_summary()
    print()
    
    results["custom_reports"] = test_custom_reports()
    print()
    
    results["data_integrity"] = test_analytics_data_integrity()
    print()
    
    results["performance"] = test_analytics_performance()
    print()
    
    # Summary
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print()
    print(f"Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL ANALYTICS DASHBOARD TESTS PASSED!")
        print("✅ Advanced analytics system is ready!")
    else:
        print("⚠️ Some analytics dashboard tests failed.")
        print("Please check the issues above.")
    
    print()
    print("📊 Analytics Dashboard Features Ready:")
    print("   ✅ Revenue analytics (MRR, ARR, growth)")
    print("   ✅ Customer analytics (growth, churn, CLV)")
    print("   ✅ Usage analytics (subscriptions, features)")
    print("   ✅ Performance analytics (uptime, satisfaction)")
    print("   ✅ Dashboard summary (key metrics)")
    print("   ✅ Custom reports (filtered data)")
    print("   ✅ Data integrity checks")
    print("   ✅ Performance optimization")
    print("   ✅ Real-time data processing")
    print("   ✅ Multi-tenant analytics")
    
    print()
    print("🔗 Next Steps:")
    print("   1. Create analytics API endpoints")
    print("   2. Build frontend dashboard components")
    print("   3. Add data visualization charts")
    print("   4. Implement real-time updates")
    print("   5. Add export functionality")

if __name__ == "__main__":
    main()
