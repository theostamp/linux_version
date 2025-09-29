# Find the exact location and content of update_project_schedule
import os

views_file = '/app/projects/views.py'
with open(views_file, 'r') as f:
    content = f.read()

# Find the function
start_idx = content.find('def update_project_schedule')
if start_idx == -1:
    print("Function not found!")
else:
    # Find the end of the function (next def or class)
    end_idx = content.find('\ndef ', start_idx + 1)
    if end_idx == -1:
        end_idx = content.find('\nclass ', start_idx + 1)
    
    if end_idx == -1:
        func_content = content[start_idx:]
    else:
        func_content = content[start_idx:end_idx]
    
    # Check if payment_terms is being saved
    if "'payment_terms':" in func_content:
        print("✅ payment_terms is already being saved in update_project_schedule")
    else:
        print("❌ payment_terms is NOT being saved in update_project_schedule")
        print("\nNeed to add it to the ScheduledMaintenance creation/update")
        
    # Show the defaults dict
    defaults_start = func_content.find('defaults={')
    if defaults_start != -1:
        defaults_end = func_content.find('}', defaults_start) + 1
        print("\nCurrent defaults:")
        print(func_content[defaults_start:defaults_end])
