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
}


@app.task(bind=True)
def debug_task(self):  # pragma: no cover
    print(f"Request: {self.request!r}")


