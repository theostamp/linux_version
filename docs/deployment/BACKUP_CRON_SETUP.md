# 🔄 Automatic Backup Setup Guide

## Overview

Αυτόματο ημερήσιο backup με retention policy.

## Management Command

```bash
# Basic usage - backup 'demo' tenant
python manage.py auto_backup

# Keep last 14 backups instead of 7
python manage.py auto_backup --keep=14

# Backup specific tenant
python manage.py auto_backup --tenant=theo

# Backup all tenants
python manage.py auto_backup --all-tenants

# With email notification
python manage.py auto_backup --notify --notify-email=admin@example.com
```

## Features

- ✅ Full database backup (buildings, apartments, expenses, payments, transactions)
- ✅ Automatic retention policy (default: keep last 7 backups)
- ✅ Multi-tenant support
- ✅ Email notifications on success/failure
- ✅ JSON format (compatible with restore)

## Railway Cron Setup

### Option 1: Railway Cron Jobs (Recommended)

1. Go to Railway Dashboard → Your Project → Settings
2. Add a new **Cron Job**:
   - **Schedule**: `0 3 * * *` (03:00 every day)
   - **Command**: `python manage.py auto_backup --all-tenants --notify`

### Option 2: Using railway.json

Add to `railway.json`:

```json
{
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "cronSchedule": "0 3 * * *"
  }
}
```

### Option 3: Separate Worker Service

Create a separate Railway service for cron jobs:

1. Create new service from same repo
2. Set start command: `python manage.py auto_backup --all-tenants`
3. Configure as cron job in Railway

## Cron Schedule Examples

| Schedule | Description |
|----------|-------------|
| `0 3 * * *` | Every day at 03:00 |
| `0 */6 * * *` | Every 6 hours |
| `0 3 * * 0` | Every Sunday at 03:00 |
| `0 3 1 * *` | First day of month at 03:00 |

## Backup Location

Backups are stored in: `/app/backups/` (or `BASE_DIR/backups/`)

Filename format: `auto_backup_{tenant}_{YYYYMMDD_HHMMSS}.json`

## Email Notifications

To enable email notifications, ensure these settings in Django:

```python
# settings.py
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.example.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@example.com'
EMAIL_HOST_PASSWORD = 'your-password'
DEFAULT_FROM_EMAIL = 'noreply@newconcierge.app'
ADMIN_EMAIL = 'admin@example.com'  # For notifications
```

## Monitoring

Check backup status:
```bash
# List recent backups
ls -la backups/

# View backup content
cat backups/auto_backup_demo_20251202_030000.json | python -m json.tool | head -50
```

## Restore from Auto Backup

Use the Backup/Restore UI at `/admin/backup-restore`:
1. Go to Restore tab
2. Select "Τοπικό Αρχείο"
3. Upload the auto backup JSON file
4. Preview and restore

Or via API:
```bash
curl -X POST /api/financial/admin/restore/ \
  -H "Content-Type: application/json" \
  -d '{"backup_data": {...}, "mode": "merge", "confirm": "CONFIRM_RESTORE"}'
```

