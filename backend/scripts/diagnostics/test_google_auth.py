#!/usr/bin/env python
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from google.oauth2 import service_account
from google.cloud import documentai_v1
import json

def test_google_auth():
    """Test Google Cloud authentication step by step"""

    print("=" * 60)
    print("Testing Google Cloud Authentication")
    print("=" * 60)

    # Step 1: Check credentials file
    creds_path = '/app/backend/credentials/google-document-ai-credentials.json'
    print(f"\n1. Credentials file: {creds_path}")

    if not os.path.exists(creds_path):
        print("   ✗ File not found!")
        return

    print("   ✓ File exists")

    # Step 2: Load and validate credentials
    try:
        with open(creds_path, 'r') as f:
            creds_data = json.load(f)

        print("\n2. Credentials content:")
        print(f"   - Type: {creds_data.get('type')}")
        print(f"   - Project ID: {creds_data.get('project_id')}")
        print(f"   - Client Email: {creds_data.get('client_email')}")
        print(f"   - Private Key ID: {creds_data.get('private_key_id')[:20]}...")

        if not creds_data.get('private_key'):
            print("   ✗ Missing private key!")
            return

        print("   ✓ Credentials structure looks valid")

    except Exception as e:
        print(f"   ✗ Error loading credentials: {e}")
        return

    # Step 3: Create credentials object
    print("\n3. Creating credentials object...")
    try:
        credentials = service_account.Credentials.from_service_account_file(
            creds_path,
            scopes=['https://www.googleapis.com/auth/cloud-platform']
        )
        print("   ✓ Credentials object created")
        print(f"   - Service Account: {credentials.service_account_email}")
        print(f"   - Project: {credentials.project_id if hasattr(credentials, 'project_id') else 'N/A'}")

    except Exception as e:
        print(f"   ✗ Error creating credentials: {e}")
        return

    # Step 4: Test Document AI client creation
    print("\n4. Creating Document AI client...")
    try:
        client = documentai_v1.DocumentProcessorServiceClient(credentials=credentials)
        print("   ✓ Document AI client created")

    except Exception as e:
        print(f"   ✗ Error creating client: {e}")
        return

    # Step 5: Test API call (list processors)
    print("\n5. Testing API call (list processors)...")
    project_id = creds_data.get('project_id')
    location = 'eu'  # or 'us' depending on your setup

    try:
        parent = f"projects/{project_id}/locations/{location}"
        print(f"   Parent: {parent}")

        # Try to list processors
        processors = client.list_processors(parent=parent)

        print("   ✓ API call successful!")
        print("   Processors found:")

        count = 0
        for processor in processors:
            count += 1
            print(f"   - {processor.name}")
            print(f"     Type: {processor.type_}")
            print(f"     Display Name: {processor.display_name}")
            print(f"     State: {processor.state}")

        if count == 0:
            print("   ⚠️ No processors found. You may need to create one.")

    except Exception as e:
        print(f"   ✗ API call failed: {e}")

        # Parse error for more info
        error_str = str(e)
        if "403" in error_str:
            print("\n   📋 Possible solutions:")
            print("   1. Enable Document AI API in Google Cloud Console")
            print("   2. Grant 'Document AI API User' role to service account")
            print("   3. Check billing is enabled for the project")
        elif "401" in error_str:
            print("\n   📋 Possible solutions:")
            print("   1. Check if service account is active")
            print("   2. Regenerate service account key")
            print("   3. Verify project ID is correct")
        elif "404" in error_str:
            print("\n   📋 Possible solutions:")
            print("   1. Check if location is correct (eu vs us)")
            print("   2. Verify project ID is correct")

    print("\n" + "=" * 60)
    print("Test complete")
    print("=" * 60)

if __name__ == "__main__":
    test_google_auth()