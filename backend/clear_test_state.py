#!/usr/bin/env python3
"""
Clear the global test execution state
Useful for debugging or resetting stuck test sessions
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

def clear_test_state():
    """Clear the global test execution state"""
    try:
        from financial.tests_views import test_execution_state
        
        # Clear all state
        test_execution_state['is_running'] = False
        test_execution_state['current_test'] = ''
        test_execution_state['progress'] = 0
        test_execution_state['start_time'] = None
        test_execution_state['results'] = None
        test_execution_state['logs'] = []
        
        # Kill any running process
        if test_execution_state.get('process'):
            try:
                test_execution_state['process'].terminate()
                print("🔄 Terminated running test process")
            except:
                pass
        
        test_execution_state['process'] = None
        
        print("✅ Test state cleared successfully")
        print("   • is_running: False")
        print("   • current_test: ''")
        print("   • progress: 0")
        print("   • results: None")
        print("   • logs: []")
        print("   • process: None")
        
    except ImportError as e:
        print(f"❌ Error importing test state: {e}")
        print("Make sure you're running this from the backend container")
    except Exception as e:
        print(f"❌ Error clearing test state: {e}")

if __name__ == '__main__':
    print("🧹 Clearing Financial Tests execution state...")
    clear_test_state()