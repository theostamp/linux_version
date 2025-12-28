import os
import django
import sys
import random
import time
from datetime import timedelta
from django.utils import timezone

# Setup Django environment
sys.path.append('/home/theo/project/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from buildings.models import Building
from iot_heating.models import HeatingDevice, HeatingSession, TelemetryLog
from django_tenants.utils import schema_context

def simulate_heating_data(schema_name='demo'):
    print(f"🌡️ Starting Heating Simulation for tenant: {schema_name}")

    with schema_context(schema_name):
        # 1. Get or Create a Target Building
        building = Building.objects.first()
        if not building:
            print("❌ No building found via Building.objects.first(). Please create one first.")
            return

        print(f"🏢 Target Building: {building.name}")

        # 2. Setup Virtual Devices (Thermostats)
        devices_config = [
            {'name': 'Central Boiler', 'type': 'shelly_1', 'id': 'SHELLY-BOILER-01'},
            {'name': 'Apartment A1 Thermostat', 'type': 'virtual', 'id': 'VIRT-A1-THERM'},
            {'name': 'Apartment B2 Thermostat', 'type': 'virtual', 'id': 'VIRT-B2-THERM'},
        ]

        created_devices = []
        for conf in devices_config:
            device, created = HeatingDevice.objects.get_or_create(
                device_id=conf['id'],
                defaults={
                    'name': conf['name'],
                    'device_type': conf['type'],
                    'building': building,
                    'is_active': True
                }
            )
            created_devices.append(device)
            status_icon = "✨ Created" if created else "✅ Exists"
            print(f"   {status_icon} Device: {device.name} ({device.device_id})")

        # 3. Simulate Historical Sessions (Last 7 days)
        print("\n📜 Generating Historical Data (Last 7 days)...")
        now = timezone.now()

        for day in range(7):
            date = now - timedelta(days=day)
            # Simulate 2-4 heating sessions per day
            sessions_count = random.randint(2, 4)

            for _ in range(sessions_count):
                # Random start time between 07:00 and 23:00
                hour = random.randint(7, 22)
                minute = random.randint(0, 59)
                start_time = date.replace(hour=hour, minute=minute, second=0)

                # Duration 30-180 minutes
                duration = random.randint(30, 180)
                end_time = start_time + timedelta(minutes=duration)

                # Pick a random device
                device = random.choice(created_devices)

                # Create session if not exists
                if not HeatingSession.objects.filter(device=device, started_at=start_time).exists():
                    HeatingSession.objects.create(
                        device=device,
                        started_at=start_time,
                        ended_at=end_time,
                        is_billed=True  # Historical data assumed billed
                    )
                    # print(f"      + Session: {device.name} | {start_time.strftime('%H:%M')} - {end_time.strftime('%H:%M')} ({duration} min)")

        print("   ✓ History generation complete.")

        # 4. Simulate Live Status (Current State)
        print("\n⚡ Simulating LIVE Status...")
        # Force one device to be ON right now
        active_device = created_devices[0] # Central Boiler

        # Close any open session first
        active_session = active_device.sessions.filter(ended_at__isnull=True).first()
        if not active_session:
            print(f"   🔥 Turning ON: {active_device.name}")
            active_device.current_status = True
            active_device.last_seen = now
            active_device.save()

            HeatingSession.objects.create(
                device=active_device,
                started_at=now - timedelta(minutes=random.randint(5, 45)) # Started a while ago
            )
        else:
            print(f"   🔥 Device {active_device.name} is ALREADY ON (Duration: {active_session.duration_minutes} min)")

        print("\n✅ Simulation Complete. You can now query the API.")

if __name__ == "__main__":
    # You can pass tenant schema as arg, default to 'demo'
    tenant = sys.argv[1] if len(sys.argv) > 1 else 'demo'
    simulate_heating_data(tenant)
