"""
🔄 Automatic Database Backup Command

Usage:
    python manage.py auto_backup
    python manage.py auto_backup --keep=14  # Keep last 14 backups
    python manage.py auto_backup --tenant=demo  # Backup specific tenant
    python manage.py auto_backup --all-tenants  # Backup all tenants
    python manage.py auto_backup --notify  # Send email notification

For Railway cron:
    Add to railway.json or use Railway dashboard to schedule:
    "0 3 * * *" -> Runs at 03:00 every day
"""

import json
import os
import logging
from datetime import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.core.mail import send_mail
from django_tenants.utils import get_tenant_model, schema_context

from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment, Transaction, ApartmentShare, MonthlyBalance

logger = logging.getLogger(__name__)

# Default backup directory
BACKUP_DIR = os.path.join(settings.BASE_DIR, 'backups')

# Default retention: keep last 7 backups
DEFAULT_RETENTION = 7


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder for Decimal and datetime objects"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


class Command(BaseCommand):
    help = '🔄 Automatic database backup with retention policy'

    def add_arguments(self, parser):
        parser.add_argument(
            '--keep',
            type=int,
            default=DEFAULT_RETENTION,
            help=f'Number of backups to keep (default: {DEFAULT_RETENTION})'
        )
        parser.add_argument(
            '--tenant',
            type=str,
            help='Specific tenant schema to backup'
        )
        parser.add_argument(
            '--all-tenants',
            action='store_true',
            help='Backup all tenants'
        )
        parser.add_argument(
            '--notify',
            action='store_true',
            help='Send email notification on completion/failure'
        )
        parser.add_argument(
            '--notify-email',
            type=str,
            help='Email address for notifications (default: settings.ADMIN_EMAIL)'
        )

    def handle(self, *args, **options):
        keep = options['keep']
        tenant = options.get('tenant')
        all_tenants = options.get('all_tenants')
        notify = options.get('notify')
        notify_email = options.get('notify_email') or getattr(settings, 'ADMIN_EMAIL', None)
        
        self.stdout.write(self.style.WARNING('=' * 60))
        self.stdout.write(self.style.WARNING('🔄 AUTOMATIC BACKUP STARTED'))
        self.stdout.write(self.style.WARNING(f'   Time: {datetime.now().isoformat()}'))
        self.stdout.write(self.style.WARNING(f'   Retention: Keep last {keep} backups'))
        self.stdout.write(self.style.WARNING('=' * 60))
        
        # Ensure backup directory exists
        if not os.path.exists(BACKUP_DIR):
            os.makedirs(BACKUP_DIR)
            self.stdout.write(f'📁 Created backup directory: {BACKUP_DIR}')
        
        results = []
        
        try:
            if all_tenants:
                # Backup all tenants
                TenantModel = get_tenant_model()
                tenants = TenantModel.objects.exclude(schema_name='public')
                
                for t in tenants:
                    result = self._backup_tenant(t.schema_name)
                    results.append(result)
            elif tenant:
                # Backup specific tenant
                result = self._backup_tenant(tenant)
                results.append(result)
            else:
                # Default: backup 'demo' tenant or current
                result = self._backup_tenant('demo')
                results.append(result)
            
            # Cleanup old backups
            self._cleanup_old_backups(keep)
            
            # Summary
            successful = sum(1 for r in results if r['status'] == 'success')
            failed = len(results) - successful
            
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS('=' * 60))
            self.stdout.write(self.style.SUCCESS(f'✅ BACKUP COMPLETED'))
            self.stdout.write(self.style.SUCCESS(f'   Successful: {successful}'))
            if failed > 0:
                self.stdout.write(self.style.ERROR(f'   Failed: {failed}'))
            self.stdout.write(self.style.SUCCESS('=' * 60))
            
            # Send notification if requested
            if notify and notify_email:
                self._send_notification(notify_email, results, success=failed == 0)
                
        except Exception as e:
            logger.error(f'[AUTO_BACKUP] Error: {e}', exc_info=True)
            self.stdout.write(self.style.ERROR(f'❌ BACKUP FAILED: {e}'))
            
            if notify and notify_email:
                self._send_notification(notify_email, [{'status': 'error', 'error': str(e)}], success=False)
            
            raise CommandError(f'Backup failed: {e}')

    def _backup_tenant(self, schema_name):
        """Backup a specific tenant"""
        self.stdout.write(f'\n📦 Backing up tenant: {schema_name}')
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'auto_backup_{schema_name}_{timestamp}.json'
        filepath = os.path.join(BACKUP_DIR, filename)
        
        try:
            with schema_context(schema_name):
                backup_data = self._collect_backup_data(schema_name)
            
            # Write backup file
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, cls=DecimalEncoder, indent=2, ensure_ascii=False)
            
            file_size = os.path.getsize(filepath)
            
            self.stdout.write(self.style.SUCCESS(
                f'   ✅ Saved: {filename} ({file_size / 1024:.1f} KB)'
            ))
            
            return {
                'status': 'success',
                'tenant': schema_name,
                'filename': filename,
                'size_bytes': file_size,
                'statistics': backup_data['meta']['statistics']
            }
            
        except Exception as e:
            logger.error(f'[AUTO_BACKUP] Error backing up {schema_name}: {e}', exc_info=True)
            self.stdout.write(self.style.ERROR(f'   ❌ Failed: {e}'))
            
            return {
                'status': 'error',
                'tenant': schema_name,
                'error': str(e)
            }

    def _collect_backup_data(self, schema_name):
        """Collect all data for backup"""
        backup_data = {
            'meta': {
                'version': '1.0',
                'type': 'auto_backup',
                'created_at': datetime.now().isoformat(),
                'tenant': schema_name,
            },
            'data': {}
        }
        
        # Buildings
        buildings = Building.objects.all()
        backup_data['data']['buildings'] = [
            {
                'id': b.id,
                'name': b.name,
                'address': b.address,
                'current_reserve': float(b.current_reserve or 0),
            }
            for b in buildings
        ]
        
        # Apartments
        apartments = Apartment.objects.select_related('building').all()
        backup_data['data']['apartments'] = [
            {
                'id': a.id,
                'building_id': a.building_id,
                'number': a.number,
                'floor': a.floor,
                'square_meters': float(a.square_meters or 0),
                'participation_mills': float(a.participation_mills or 0),
                'current_balance': float(a.current_balance or 0),
                'owner_name': a.owner_name,
                'owner_email': a.owner_email,
            }
            for a in apartments
        ]
        
        # Expenses
        expenses = Expense.objects.all()
        backup_data['data']['expenses'] = [
            {
                'id': e.id,
                'building_id': e.building_id,
                'title': e.title,
                'amount': float(e.amount),
                'date': e.date.isoformat() if e.date else None,
                'category': e.category,
                'status': e.status,
            }
            for e in expenses
        ]
        
        # Payments
        payments = Payment.objects.select_related('apartment').all()
        backup_data['data']['payments'] = [
            {
                'id': p.id,
                'apartment_id': p.apartment_id,
                'amount': float(p.amount),
                'date': p.date.isoformat() if p.date else None,
                'method': p.method,
            }
            for p in payments
        ]
        
        # Transactions
        transactions = Transaction.objects.all()
        backup_data['data']['transactions'] = [
            {
                'id': t.id,
                'building_id': t.building_id,
                'apartment_id': t.apartment_id,
                'date': t.date.isoformat() if t.date else None,
                'type': t.type,
                'amount': float(t.amount),
                'description': t.description,
            }
            for t in transactions
        ]
        
        # Statistics
        backup_data['meta']['statistics'] = {
            'buildings': len(backup_data['data']['buildings']),
            'apartments': len(backup_data['data']['apartments']),
            'expenses': len(backup_data['data']['expenses']),
            'payments': len(backup_data['data']['payments']),
            'transactions': len(backup_data['data']['transactions']),
        }
        
        return backup_data

    def _cleanup_old_backups(self, keep):
        """Remove old backups, keeping only the most recent ones"""
        self.stdout.write(f'\n🧹 Cleaning up old backups (keeping last {keep})...')
        
        # Get all auto backup files
        backup_files = []
        for filename in os.listdir(BACKUP_DIR):
            if filename.startswith('auto_backup_') and filename.endswith('.json'):
                filepath = os.path.join(BACKUP_DIR, filename)
                mtime = os.path.getmtime(filepath)
                backup_files.append((filepath, mtime, filename))
        
        # Sort by modification time (newest first)
        backup_files.sort(key=lambda x: x[1], reverse=True)
        
        # Delete old backups
        deleted = 0
        for filepath, _, filename in backup_files[keep:]:
            try:
                os.remove(filepath)
                deleted += 1
                self.stdout.write(f'   🗑️ Deleted: {filename}')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'   ⚠️ Could not delete {filename}: {e}'))
        
        if deleted > 0:
            self.stdout.write(self.style.SUCCESS(f'   ✅ Deleted {deleted} old backup(s)'))
        else:
            self.stdout.write(f'   ✓ No old backups to delete')

    def _send_notification(self, email, results, success):
        """Send email notification"""
        try:
            subject = '✅ Backup Successful' if success else '❌ Backup Failed'
            
            message_lines = [
                f'Automatic Backup Report',
                f'Time: {datetime.now().isoformat()}',
                f'Status: {"Success" if success else "Failed"}',
                '',
                'Details:',
            ]
            
            for r in results:
                if r['status'] == 'success':
                    message_lines.append(f'  ✅ {r["tenant"]}: {r["filename"]} ({r["size_bytes"]} bytes)')
                else:
                    message_lines.append(f'  ❌ {r.get("tenant", "unknown")}: {r.get("error", "Unknown error")}')
            
            message = '\n'.join(message_lines)
            
            send_mail(
                subject=f'[NewConcierge] {subject}',
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@newconcierge.app'),
                recipient_list=[email],
                fail_silently=True,
            )
            
            self.stdout.write(f'📧 Notification sent to {email}')
            
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'⚠️ Could not send notification: {e}'))

