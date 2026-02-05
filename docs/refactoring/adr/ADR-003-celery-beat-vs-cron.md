# ADR-003: Scheduling Strategy (Celery Beat vs Cron)

Date: 2026-02-05  
Status: Accepted

## Context
- Notifications and scheduled tasks exist in `backend/notifications/tasks.py`.  
- Celery is configured but defaults to eager mode: `backend/new_concierge_backend/settings/base.py` (`CELERY_TASK_ALWAYS_EAGER=True`).  
- There is evidence of `django_celery_beat` usage in `backend/migrate_public_schema.py`.

Problem: periodic tasks (monthly notifications, debt reminders) do not run unless a scheduler is configured.

## Options
1. **Celery beat + worker** (with `django_celery_beat`)  
   - Use Celery beat schedule; store schedules in DB; standard for Django/Celery.
2. **Cron + management commands**  
   - OS‑level cron triggers tasks via `manage.py` commands.
3. **External scheduler service**  
   - Use cloud scheduler to hit endpoints.

## Decision
Adopt **Option 1: Celery beat + worker**, controlled by feature flag `ENABLE_CELERY_BEAT`.

## Consequences
- **Pros**: consistent with existing Celery setup; flexible schedules; observable via `django_celery_beat` DB.  
- **Cons**: requires running additional process (beat) and Redis broker; additional operational config.  
- **Mitigations**: explicit docs and health endpoint for last run/failures; fallback manual trigger endpoints remain.

## References
- `backend/notifications/tasks.py` (scheduled tasks)  
- `backend/new_concierge_backend/settings/base.py` (Celery config)  
- `backend/migrate_public_schema.py` (celery beat migrations)
