#!/usr/bin/env python3
import requests
import json

def add_mills_to_athens_building():
    base_url = "http://localhost:8000"
    headers = {"Host": "demo.localhost"}
    
    # Login first
    login_data = {
        "email": "admin@demo.localhost",
        "password": "admin123456"
    }
    
    print("Logging in...")
    login_response = requests.post(
        f"{base_url}/api/users/login/",
        headers=headers,
        json=login_data
    )
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        return
    
    login_result = login_response.json()
    access_token = login_result['access']
    
    # Add authorization header
    headers['Authorization'] = f"Bearer {access_token}"
    
    print("Login successful!")
    
    # Get apartments for building 1 (Αθηνών 12)
    print("Getting apartments for building 1...")
    apartments_response = requests.get(
        f"{base_url}/api/apartments/?building_id=1",
        headers=headers
    )
    
    if apartments_response.status_code != 200:
        print(f"Failed to get apartments: {apartments_response.text}")
        return
    
    apartments = apartments_response.json()
    print(f"Found {len(apartments)} apartments")
    
    # Define participation mills for each apartment
    # Total should be 1000 mills
    mills_data = {
        1: 160,  # 101
        2: 170,  # 102  
        3: 165,  # 103
        4: 175,  # 201
        5: 170,  # 202
        6: 160   # 203
    }
    
    updated_count = 0
    
    for apartment in apartments:
        apartment_id = apartment['id']
        apartment_number = apartment['number']
        
        if apartment_id in mills_data:
            mills = mills_data[apartment_id]
            
            # Update apartment with participation mills
            update_data = {
                'participation_mills': mills,
                'heating_mills': mills,
                'elevator_mills': mills
            }
            
            print(f"Updating apartment {apartment_number} (ID: {apartment_id}) with {mills} mills...")
            
            update_response = requests.patch(
                f"{base_url}/api/apartments/{apartment_id}/",
                headers=headers,
                json=update_data
            )
            
            if update_response.status_code == 200:
                print(f"✅ Updated apartment {apartment_number} with {mills} mills")
                updated_count += 1
            else:
                print(f"❌ Failed to update apartment {apartment_number}: {update_response.text}")
    
    print(f"\nUpdated {updated_count} apartments with participation mills")
    
    # Verify the updates
    print("\nVerifying updates...")
    apartments_response = requests.get(
        f"{base_url}/api/apartments/?building_id=1",
        headers=headers
    )
    
    if apartments_response.status_code == 200:
        apartments = apartments_response.json()
        total_mills = 0
        
        for apartment in apartments:
            apartment_id = apartment['id']
            apartment_number = apartment['number']
            mills = apartment.get('participation_mills')
            
            if mills:
                total_mills += mills
                print(f"  - {apartment_number}: {mills} mills")
            else:
                print(f"  - {apartment_number}: No mills set")
        
        print(f"\nTotal participation mills: {total_mills}")

if __name__ == "__main__":
    add_mills_to_athens_building()

