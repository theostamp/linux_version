from __future__ import annotations

import os
from celery import Celery


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")

app = Celery("new_concierge_backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):  # pragma: no cover
    print(f"Request: {self.request!r}")


