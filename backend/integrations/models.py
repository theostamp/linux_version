"""
Models for external integrations
"""

from django.db import models

# This app currently uses existing models from other apps.
# Google Calendar integration extends the Building model
# via database migration to add calendar-related fields.