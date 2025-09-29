#!/usr/bin/env python3
"""
Frontend Test Script για Charts & Visualization System
Ελέγχει ότι τα frontend components υπάρχουν και είναι σωστά δομημένα
"""

import os
import sys

def test_chart_components():
    """Test ότι τα chart components υπάρχουν"""
    print("🧪 Testing Frontend Chart Components...")
    
    # Check if chart components exist
    chart_files = [
        'frontend/components/financial/charts/MeterReadingChart.tsx',
        'frontend/components/financial/charts/ConsumptionChart.tsx',
        'frontend/components/financial/charts/TrendAnalysis.tsx',
        'frontend/components/financial/charts/ChartsContainer.tsx',
        'frontend/components/financial/BulkImportWizard.tsx',
        'frontend/hooks/useChartData.ts',
    ]
    
    missing_files = []
    existing_files = []
    
    for file_path in chart_files:
        if os.path.exists(file_path):
            existing_files.append(file_path)
            print(f"✅ {file_path}")
        else:
            missing_files.append(file_path)
            print(f"❌ {file_path}")
    
    print("\n📊 Summary:")
    print(f"✅ Existing files: {len(existing_files)}")
    print(f"❌ Missing files: {len(missing_files)}")
    
    return len(missing_files) == 0

def test_package_dependencies():
    """Test ότι οι απαραίτητες βιβλιοθήκες είναι εγκατεστημένες"""
    print("\n📦 Testing Package Dependencies...")
    
    # Check package.json for required dependencies
    package_json_path = 'frontend/package.json'
    if not os.path.exists(package_json_path):
        print("❌ package.json not found")
        return False
    
    try:
        import json
        with open(package_json_path, 'r') as f:
            package_data = json.load(f)
        
        required_deps = ['recharts', 'react-dropzone']
        missing_deps = []
        existing_deps = []
        
        dependencies = package_data.get('dependencies', {})
        
        for dep in required_deps:
            if dep in dependencies:
                existing_deps.append(dep)
                print(f"✅ {dep}: {dependencies[dep]}")
            else:
                missing_deps.append(dep)
                print(f"❌ {dep}: Not found")
        
        print("\n📊 Dependencies Summary:")
        print(f"✅ Existing: {len(existing_deps)}")
        print(f"❌ Missing: {len(missing_deps)}")
        
        return len(missing_deps) == 0
        
    except Exception as e:
        print(f"❌ Error reading package.json: {e}")
        return False

def test_index_exports():
    """Test ότι τα components είναι exported στο index.ts"""
    print("\n📤 Testing Index Exports...")
    
    index_path = 'frontend/components/financial/index.ts'
    if not os.path.exists(index_path):
        print("❌ index.ts not found")
        return False
    
    try:
        with open(index_path, 'r') as f:
            content = f.read()
        
        required_exports = [
            'MeterReadingChart',
            'ConsumptionChart', 
            'TrendAnalysis',
            'ChartsContainer',
            'BulkImportWizard'
        ]
        
        missing_exports = []
        existing_exports = []
        
        for export_name in required_exports:
            if export_name in content:
                existing_exports.append(export_name)
                print(f"✅ {export_name}")
            else:
                missing_exports.append(export_name)
                print(f"❌ {export_name}")
        
        print("\n📊 Exports Summary:")
        print(f"✅ Existing: {len(existing_exports)}")
        print(f"❌ Missing: {len(missing_exports)}")
        
        return len(missing_exports) == 0
        
    except Exception as e:
        print(f"❌ Error reading index.ts: {e}")
        return False

def test_financial_page_integration():
    """Test ότι το FinancialPage έχει ενσωματώσει τα charts"""
    print("\n🔗 Testing FinancialPage Integration...")
    
    financial_page_path = 'frontend/components/financial/FinancialPage.tsx'
    if not os.path.exists(financial_page_path):
        print("❌ FinancialPage.tsx not found")
        return False
    
    try:
        with open(financial_page_path, 'r') as f:
            content = f.read()
        
        required_integrations = [
            'ChartsContainer',
            'BulkImportWizard',
            'PieChart',
            'charts'
        ]
        
        missing_integrations = []
        existing_integrations = []
        
        for integration in required_integrations:
            if integration in content:
                existing_integrations.append(integration)
                print(f"✅ {integration}")
            else:
                missing_integrations.append(integration)
                print(f"❌ {integration}")
        
        print("\n📊 Integration Summary:")
        print(f"✅ Existing: {len(existing_integrations)}")
        print(f"❌ Missing: {len(missing_integrations)}")
        
        return len(missing_integrations) == 0
        
    except Exception as e:
        print(f"❌ Error reading FinancialPage.tsx: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Starting Frontend Charts & Visualization System Test")
    print("=" * 60)
    
    tests = [
        ("Chart Components", test_chart_components),
        ("Package Dependencies", test_package_dependencies),
        ("Index Exports", test_index_exports),
        ("FinancialPage Integration", test_financial_page_integration),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        result = test_func()
        results.append((test_name, result))
    
    print("\n" + "=" * 60)
    print("📋 FINAL RESULTS:")
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status} {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\n📊 Summary: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("\n🎉 Frontend Charts & Visualization System Test PASSED")
        print("\n🔗 Next Steps:")
        print("1. Start frontend: cd frontend && npm run dev")
        print("2. Navigate to FinancialPage")
        print("3. Check 'Γραφήματα' tab for charts")
        print("4. Check 'Μετρητές' tab for bulk import")
        print("5. Test different chart types and filters")
    else:
        print("\n❌ Frontend Charts & Visualization System Test FAILED")
        print("Please fix the issues above before proceeding")
        sys.exit(1)

if __name__ == "__main__":
    main() 