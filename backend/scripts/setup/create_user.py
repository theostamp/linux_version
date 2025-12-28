#!/usr/bin/env python3
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Check if user already exists
if not User.objects.filter(email='theostam1966@gmail.com').exists():
    User.objects.create_superuser(
        email='theostam1966@gmail.com',
        password='admin123',
        first_name='Theo',
        last_name='Stam'
    )
    print("✅ Superuser 'theostam1966@gmail.com' created successfully!")
else:
    print("ℹ️ Superuser 'theostam1966@gmail.com' already exists.")
    
    # Update password to make sure it's correct
    user = User.objects.get(email='theostam1966@gmail.com')
    user.set_password('admin123')
    user.save()
    print("✅ Password updated for existing user.") 