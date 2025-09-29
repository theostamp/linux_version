#!/usr/bin/env python3
import requests

def check_form_html():
    """Check the HTML of the building form page"""
    print("🔍 Checking Building Form HTML")
    print("=" * 40)
    
    form_url = "http://demo.localhost:8080/buildings/new"
    
    try:
        response = requests.get(form_url)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            html_content = response.text
            
            # Check for postal code related content
            print("\n📋 Checking for postal code content:")
            
            # Check for postal_code field
            if 'postal_code' in html_content:
                print("✅ 'postal_code' found in HTML")
            else:
                print("❌ 'postal_code' NOT found in HTML")
            
            # Check for postal code label
            if 'Ταχυδρομικός Κώδικας' in html_content:
                print("✅ 'Ταχυδρομικός Κώδικας' label found in HTML")
            else:
                print("❌ 'Ταχυδρομικός Κώδικας' label NOT found in HTML")
            
            # Check for required field indicator
            if 'required' in html_content:
                print("✅ 'required' attribute found in HTML")
            else:
                print("❌ 'required' attribute NOT found in HTML")
            
            # Check for Google Maps checkbox
            if 'Google Maps' in html_content:
                print("✅ 'Google Maps' checkbox found in HTML")
            else:
                print("❌ 'Google Maps' checkbox NOT found in HTML")
            
            # Check for useGoogleMaps state
            if 'useGoogleMaps' in html_content:
                print("✅ 'useGoogleMaps' state found in HTML")
            else:
                print("❌ 'useGoogleMaps' state NOT found in HTML")
            
            # Check for conditional rendering
            if 'useGoogleMaps ?' in html_content:
                print("✅ Conditional rendering found in HTML")
            else:
                print("❌ Conditional rendering NOT found in HTML")
            
            # Save HTML to file for inspection
            with open('building_form.html', 'w', encoding='utf-8') as f:
                f.write(html_content)
            print("\n💾 HTML saved to building_form.html for inspection")
            
        else:
            print(f"❌ Failed to access form: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_form_html() 