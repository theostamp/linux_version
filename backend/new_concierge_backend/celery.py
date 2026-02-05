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
    # Celery beat heartbeat (health check) every 5 minutes
    'celery-beat-heartbeat': {
        'task': 'notifications.tasks.record_scheduler_heartbeat',
        'schedule': crontab(minute='*/5'),
    },
    # Check for monthly tasks every hour
    'check-monthly-tasks-hourly': {
        'task': 'notifications.tasks.check_and_execute_monthly_tasks',
        'schedule': crontab(minute=0),  # Every hour at :00
    },
    # Ensure next month's common expense auto-send tasks exist
    'ensure-common-expense-auto-tasks-daily': {
        'task': 'notifications.tasks.ensure_common_expense_auto_tasks',
        'schedule': crontab(minute=15, hour=0),  # 00:15 daily
    },
    # Create management fees on the 1st day of each month at 3:00 AM
    'create-monthly-management-fees': {
        'task': 'financial.tasks.create_monthly_management_fees',
        'schedule': crontab(minute=0, hour=3, day_of_month=1),  # 1st of month at 3:00 AM
    },
    # Daily reminder one day before general assemblies (legacy)
    'send-general-assembly-reminders-daily': {
        'task': 'notifications.tasks.send_general_assembly_reminders',
        'schedule': crontab(minute=0, hour=9),  # 09:00 daily
    },
    # Assembly email reminders - check every hour from 8-10 AM
    'check-assembly-email-reminders': {
        'task': 'assemblies.tasks.check_and_send_assembly_reminders',
        'schedule': crontab(minute=0, hour='8,9,10'),  # 08:00, 09:00, 10:00 daily
    },
    # Pre-voting open reminders (daily at 09:00)
    'check-pre-voting-open-reminders-daily': {
        'task': 'assemblies.tasks.check_and_send_pre_voting_open_reminders',
        'schedule': crontab(minute=0, hour=9),  # 09:00 daily
    },
    # Weekly debt reminders (Mon 09:00) - min debt 50€, min overdue 20 days
    'send-weekly-debt-reminders': {
        'task': 'notifications.tasks.send_daily_debt_reminders_if_not_sent_this_week',
        'schedule': crontab(minute=0, hour=9, day_of_week='mon'),
        'args': (50.0, 20),
    },
    # Follow-up call TODOs for unpaid debt reminders (daily at 09:30)
    'create-debt-followup-call-todos': {
        'task': 'notifications.tasks.create_debt_followup_call_todos',
        'schedule': crontab(minute=30, hour=9),
        'args': (),
    },
    # Retry failed notification recipients (email) every 30 minutes
    'retry-failed-notification-recipients': {
        'task': 'notifications.tasks.retry_failed_notification_recipients',
        'schedule': crontab(minute='*/30'),
        'args': (),
    },
    # MailerSend webhook events processing (public schema -> tenants)
    'process-mailersend-webhook-events': {
        'task': 'email_webhooks.tasks.process_mailersend_webhook_events',
        'schedule': crontab(minute='*/5'),
        'args': (),
    },
    # Finalize email batch statuses after report window
    'finalize-email-batches': {
        'task': 'email_webhooks.tasks.finalize_email_batches',
        'schedule': crontab(minute='*/10'),
        'args': (30,),
    },
    # Ad Portal trial reminders (7/3/1 days) + trial end notices
    'ad-portal-trial-reminders-daily': {
        'task': 'ad_portal.tasks.check_ad_portal_trials_daily',
        'schedule': crontab(minute=0, hour=10),  # 10:00 daily
    },
    # Ad Portal daily snapshots (fast reporting)
    'ad-portal-daily-snapshots': {
        'task': 'ad_portal.tasks.compute_ad_portal_daily_snapshots',
        'schedule': crontab(minute=20, hour=2),  # 02:20 daily
        'args': (30,),
    },
}

try:
    from django.conf import settings

    if not getattr(settings, "ENABLE_CELERY_BEAT", False):
        app.conf.beat_schedule = {}
except Exception:
    # Fail safe: keep schedule if settings cannot be loaded
    pass


@app.task(bind=True)
def debug_task(self):  # pragma: no cover
    print(f"Request: {self.request!r}")
