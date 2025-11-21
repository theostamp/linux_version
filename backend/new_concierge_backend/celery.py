from __future__ import annotations

import os
from celery import Celery
from celery.schedules import crontab


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")

app = Celery("new_concierge_backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


# Celery Beat schedule for periodic tasks
app.conf.beat_schedule = {
    # Check for monthly tasks every hour
    'check-monthly-tasks-hourly': {
        'task': 'notifications.tasks.check_and_execute_monthly_tasks',
        'schedule': crontab(minute=0),  # Every hour at :00
    },
    # Create management fees on the 1st day of each month at 3:00 AM
    'create-monthly-management-fees': {
        'task': 'financial.tasks.create_monthly_management_fees',
        'schedule': crontab(minute=0, hour=3, day_of_month=1),  # 1st of month at 3:00 AM
    },
    # Daily reminder one day before general assemblies
    'send-general-assembly-reminders-daily': {
        'task': 'notifications.tasks.send_general_assembly_reminders',
        'schedule': crontab(minute=0, hour=9),  # 09:00 daily
    },
}


@app.task(bind=True)
def debug_task(self):  # pragma: no cover
    print(f"Request: {self.request!r}")

