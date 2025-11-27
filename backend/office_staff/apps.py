# backend/office_staff/apps.py

from django.apps import AppConfig


class OfficeStaffConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'office_staff'
    verbose_name = 'Υπάλληλοι Γραφείου'
