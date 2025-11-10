#!/usr/bin/env python3
"""
Fix the indentation error in services.py
"""

def fix_indentation():
    """Fix the indentation in services.py"""

    services_path = '/app/financial/services.py'

    # Read the file
    with open(services_path, 'r') as f:
        lines = f.readlines()

    # Find the problematic line
    for i, line in enumerate(lines):
        if i >= 1070 and i <= 1075:
            print(f"Line {i+1}: {line.rstrip()}")

    # Check if line 1071 has the proper indentation
    # It should be the method definition line
    if len(lines) > 1070:
        # Make sure the docstring is properly indented
        if '"""' in lines[1071] and not lines[1071].startswith('        '):
            print("Fixing indentation...")
            lines[1071] = '        ' + lines[1071].lstrip()

    # Write the fixed file
    with open(services_path, 'w') as f:
        f.writelines(lines)

    print("✅ Indentation fixed!")

if __name__ == '__main__':
    fix_indentation()