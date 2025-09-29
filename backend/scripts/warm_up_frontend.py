#!/usr/bin/env python
"""
🔥 Frontend Warm-up Script
===========================
Αυτό το script κάνει warm-up το Next.js frontend
προ-compilάροντας τις σελίδες για γρήγορη φόρτωση.
"""

import requests
import time
import threading
import sys
import os

def warm_up_page(url, page_name):
    """Κάνει warm-up μια σελίδα"""
    try:
        print(f"🔄 Warming up {page_name}...")
        start_time = time.time()
        response = requests.get(url, timeout=120)  # 2 λεπτά timeout
        elapsed_time = time.time() - start_time

        if response.status_code == 200:
            print(f"✅ {page_name} warmed up in {elapsed_time:.2f}s")
        else:
            print(f"⚠️ {page_name} responded with status {response.status_code}")
    except requests.exceptions.Timeout:
        print(f"⏱️ {page_name} timeout (but probably compiled)")
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to {page_name}")
    except Exception as e:
        print(f"❌ Error warming up {page_name}: {str(e)}")

def warm_up_frontend(host="localhost", port=3001):
    """
    Κάνει warm-up το frontend με το να ζητάει τις κύριες σελίδες
    ώστε να γίνει το compile και να είναι γρήγορες στη χρήση

    Args:
        host: Το hostname του frontend (default: localhost)
        port: Το port του frontend (default: 3001)
    """
    print(f"\n🔥 Frontend Warm-up for http://{host}:{port}")
    print("=" * 60)

    base_url = f"http://{host}:{port}"

    # Κύριες σελίδες για warm-up
    pages = [
        ("/", "Home Page"),
        ("/login", "Login Page"),
        ("/dashboard", "Dashboard"),
        ("/financial", "Financial Page"),
        ("/apartments", "Apartments"),
        ("/buildings", "Buildings"),
        ("/maintenance", "Maintenance"),
        ("/maintenance/scheduled", "Scheduled Maintenance"),
        ("/announcements", "Announcements"),
        ("/projects", "Projects"),
        ("/projects/offers", "Project Offers"),
        ("/projects/contracts", "Contracts")
    ]

    # Check if frontend is responding
    print("\n🔍 Checking frontend availability...")
    try:
        response = requests.get(base_url, timeout=5)
        print("✅ Frontend is responding\n")
    except:
        print("⚠️ Frontend not responding yet. Waiting 10 seconds...")
        time.sleep(10)

    # Πρώτα κάνουμε warm-up τη βασική σελίδα (αυτή παίρνει το περισσότερο χρόνο)
    print("📄 Warming up main page (this may take ~50 seconds on first run)...")
    warm_up_page(base_url + pages[0][0], pages[0][1])

    # Μετά κάνουμε warm-up τις υπόλοιπες σελίδες παράλληλα
    print("\n📄 Warming up other pages in parallel...")
    threads = []
    for page_path, page_name in pages[1:]:
        url = base_url + page_path
        thread = threading.Thread(target=warm_up_page, args=(url, page_name))
        thread.start()
        threads.append(thread)
        time.sleep(1)  # Μικρή καθυστέρηση μεταξύ των threads

    # Περιμένουμε να τελειώσουν όλα τα threads
    print("\n⏳ Waiting for all pages to compile...")
    for thread in threads:
        thread.join(timeout=120)

    print("\n" + "=" * 60)
    print("✅ Frontend warm-up completed!")
    print("   All pages are now compiled and will load quickly")
    print("   Users will experience fast page loads")
    print("=" * 60)

def main():
    """Κύρια συνάρτηση"""
    # Μπορούμε να πάρουμε host και port από environment variables
    host = os.environ.get('FRONTEND_HOST', 'localhost')
    port = int(os.environ.get('FRONTEND_PORT', 3001))

    # Αν δοθούν arguments στο command line
    if len(sys.argv) > 1:
        host = sys.argv[1]
    if len(sys.argv) > 2:
        port = int(sys.argv[2])

    try:
        warm_up_frontend(host, port)
        return 0
    except KeyboardInterrupt:
        print("\n⚠️ Warm-up interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Error during warm-up: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())