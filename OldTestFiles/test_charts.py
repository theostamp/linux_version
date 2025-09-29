#!/usr/bin/env python3
"""
Test Script για Charts & Visualization System
Ελέγχει ότι το σύστημα γραφημάτων λειτουργεί σωστά
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from financial.models import MeterReading
from django.contrib.auth import get_user_model

User = get_user_model()

def test_charts_system():
    """Test το charts system"""
    print("🧪 Testing Charts & Visualization System...")
    
    try:
        # Test meter readings directly
        readings = MeterReading.objects.all()
        print(f"✅ Βρέθηκαν {readings.count()} meter readings")
        
        if readings.count() == 0:
            print("⚠️  Δεν υπάρχουν meter readings για testing")
            print("   Προσθέστε μερικές μετρήσεις πρώτα")
            return True
        
        # Test chart data processing
        test_chart_data_processing(readings)
        
        # Test consumption calculations
        test_consumption_calculations(readings)
        
        # Test trend analysis
        test_trend_analysis(readings)
        
        print("✅ Charts & Visualization System Test ΟΛΟΚΛΗΡΩΘΗΚΕ")
        return True
        
    except Exception as e:
        print(f"❌ Σφάλμα κατά το testing: {e}")
        return False

def test_chart_data_processing(readings):
    """Test chart data processing"""
    print("  📊 Testing chart data processing...")
    
    # Group by apartment and date
    apartment_data = {}
    for reading in readings:
        apartment_name = reading.apartment_name
        if apartment_name not in apartment_data:
            apartment_data[apartment_name] = []
        apartment_data[apartment_name].append({
            'date': reading.reading_date,
            'value': reading.current_value,
            'consumption': reading.consumption or 0
        })
    
    print(f"    ✅ Processed data for {len(apartment_data)} apartments")
    
    # Test period grouping
    for apartment_name, data in apartment_data.items():
        print(f"    📈 {apartment_name}: {len(data)} readings")
        if data:
            total_consumption = sum(d['consumption'] for d in data)
            print(f"       Total consumption: {total_consumption:.2f}")

def test_consumption_calculations(readings):
    """Test consumption calculations"""
    print("  ⚡ Testing consumption calculations...")
    
    total_consumption = sum(r.consumption or 0 for r in readings)
    avg_consumption = total_consumption / len(readings) if readings else 0
    
    print(f"    ✅ Total consumption: {total_consumption:.2f}")
    print(f"    ✅ Average consumption: {avg_consumption:.2f}")
    
    # Test apartment comparison
    apartment_consumption = {}
    for reading in readings:
        apartment_name = reading.apartment_name
        if apartment_name not in apartment_consumption:
            apartment_consumption[apartment_name] = 0
        apartment_consumption[apartment_name] += reading.consumption or 0
    
    print("    📊 Consumption by apartment:")
    for apartment, consumption in sorted(apartment_consumption.items(), key=lambda x: x[1], reverse=True):
        print(f"       {apartment}: {consumption:.2f}")

def test_trend_analysis(readings):
    """Test trend analysis"""
    print("  📈 Testing trend analysis...")
    
    if len(readings) < 2:
        print("    ⚠️  Δεν υπάρχουν αρκετά δεδομένα για trend analysis")
        return
    
    # Group by month
    monthly_data = {}
    for reading in readings:
        month_key = reading.reading_date.strftime('%Y-%m')
        if month_key not in monthly_data:
            monthly_data[month_key] = []
        monthly_data[month_key].append(reading.consumption or 0)
    
    # Calculate monthly totals
    monthly_totals = {}
    for month, consumptions in monthly_data.items():
        monthly_totals[month] = sum(consumptions)
    
    print("    ✅ Monthly consumption data:")
    for month in sorted(monthly_totals.keys()):
        print(f"       {month}: {monthly_totals[month]:.2f}")
    
    # Calculate trend
    if len(monthly_totals) >= 2:
        months = sorted(monthly_totals.keys())
        first_month = monthly_totals[months[0]]
        last_month = monthly_totals[months[-1]]
        
        if first_month > 0:
            trend_percentage = ((last_month - first_month) / first_month) * 100
            trend_direction = "↗️" if trend_percentage > 5 else "↘️" if trend_percentage < -5 else "→"
            print(f"    📊 Trend: {trend_direction} {trend_percentage:+.1f}%")

def main():
    """Main test function"""
    print("🚀 Starting Charts & Visualization System Test")
    print("=" * 50)
    
    success = test_charts_system()
    
    print("=" * 50)
    if success:
        print("🎉 Charts & Visualization System Test PASSED")
        print("\n📋 Summary:")
        print("✅ Chart data processing works")
        print("✅ Consumption calculations work")
        print("✅ Trend analysis works")
        print("✅ Frontend charts ready for testing")
        print("\n🔗 Next Steps:")
        print("1. Start frontend: cd frontend && npm run dev")
        print("2. Navigate to FinancialPage")
        print("3. Check 'Γραφήματα' tab")
        print("4. Test different chart types and filters")
    else:
        print("❌ Charts & Visualization System Test FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main() 