"""
🔐 Database Backup & Restore API

Provides endpoints for:
- Exporting database data to JSON format
- Importing/restoring data from JSON backup
- Selective backup (specific buildings, date ranges)
- Server-side backup storage with history
- Multiple storage location support (local, server, cloud)

Security:
- Admin-only access
- Audit logging of all operations
- Data validation on restore
"""

import json
import logging
import os
import uuid
from datetime import datetime, date
from decimal import Decimal
from django.http import HttpResponse
from django.conf import settings
from django.db import transaction as db_transaction
from django.db import models
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from buildings.models import Building
from apartments.models import Apartment
from .models import (
    Expense, Payment, Transaction, ApartmentShare, 
    ExpensePeriod, MonthlyBalance, FinancialReceipt
)

# Backup storage directory
BACKUP_DIR = os.path.join(settings.BASE_DIR, 'backups')

logger = logging.getLogger(__name__)


def _ensure_backup_dir():
    """Ensure backup directory exists"""
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
    return BACKUP_DIR


def _save_backup_to_server(backup_data, filename, user):
    """Save backup to server storage"""
    _ensure_backup_dir()
    
    filepath = os.path.join(BACKUP_DIR, filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(backup_data, f, cls=DecimalEncoder, indent=2, ensure_ascii=False)
    
    file_size = os.path.getsize(filepath)
    
    logger.info(f"[BACKUP] Saved to server: {filename} ({file_size} bytes)")
    
    return Response({
        'status': 'success',
        'message': f'✅ Backup αποθηκεύτηκε στον server: {filename}',
        'backup_id': backup_data['meta']['backup_id'],
        'filename': filename,
        'size_bytes': file_size,
        'storage': 'server'
    })


def _get_server_backups():
    """Get list of backups stored on server"""
    _ensure_backup_dir()
    
    backups = []
    for filename in os.listdir(BACKUP_DIR):
        if filename.endswith('.json'):
            filepath = os.path.join(BACKUP_DIR, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    meta = data.get('meta', {})
                    
                    backups.append({
                        'id': meta.get('backup_id', filename.replace('.json', '')),
                        'filename': filename,
                        'created_at': meta.get('created_at'),
                        'created_by': meta.get('created_by'),
                        'backup_type': meta.get('backup_type', 'unknown'),
                        'size_kb': round(os.path.getsize(filepath) / 1024, 1),
                        'storage': 'server',
                        'can_restore': True,
                        'statistics': meta.get('statistics', {})
                    })
            except Exception as e:
                logger.warning(f"[BACKUP] Error reading {filename}: {e}")
    
    # Sort by created_at descending
    backups.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    
    return backups


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal and date objects"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def backup_database(request):
    """
    🔐 Database Backup API
    
    GET: Get backup options and preview
    POST: Generate and download backup file
    
    Request Body (POST):
        - backup_type: 'full' | 'financial' | 'buildings'
        - building_ids: list[int] - Optional, specific buildings to backup
        - include_transactions: bool - Include transaction history
        - date_from: str - Optional, filter data from date (YYYY-MM-DD)
        - date_to: str - Optional, filter data to date (YYYY-MM-DD)
    
    Returns:
        JSON file download with backup data
    """
    user = request.user
    
    # Security check
    if not (user.is_superuser or user.is_staff or getattr(user, 'role', '') == 'admin'):
        return Response({
            'error': 'Δεν έχετε δικαιώματα. Απαιτείται ρόλος Admin.',
        }, status=status.HTTP_403_FORBIDDEN)
    
    # GET: Show backup options
    if request.method == 'GET':
        buildings = Building.objects.all()
        return Response({
            'status': 'ready',
            'message': '📦 Backup System Ready',
            'available_buildings': [
                {
                    'id': b.id,
                    'name': b.name,
                    'apartments_count': b.apartments.count(),
                }
                for b in buildings
            ],
            'backup_types': [
                {
                    'id': 'full',
                    'name': 'Πλήρες Backup',
                    'description': 'Όλα τα δεδομένα (κτίρια, διαμερίσματα, οικονομικά)',
                    'estimated_size': 'Large'
                },
                {
                    'id': 'financial',
                    'name': 'Οικονομικά Δεδομένα',
                    'description': 'Δαπάνες, πληρωμές, κινήσεις, υπόλοιπα',
                    'estimated_size': 'Medium'
                },
                {
                    'id': 'buildings',
                    'name': 'Δομή Κτιρίων',
                    'description': 'Κτίρια και διαμερίσματα (χωρίς οικονομικά)',
                    'estimated_size': 'Small'
                }
            ],
            'warnings': [
                '💾 Το backup μπορεί να πάρει λίγο χρόνο για μεγάλα δεδομένα',
                '🔒 Τα δεδομένα περιέχουν ευαίσθητες πληροφορίες',
                '📥 Αποθηκεύστε το αρχείο σε ασφαλή τοποθεσία'
            ]
        })
    
    # POST: Generate backup
    try:
        backup_type = request.data.get('backup_type', 'full')
        building_ids = request.data.get('building_ids', [])
        include_transactions = request.data.get('include_transactions', True)
        date_from = request.data.get('date_from')
        date_to = request.data.get('date_to')
        storage = request.data.get('storage', 'local')  # local, server, google_drive, etc.
        
        logger.info(f"[BACKUP] User {user.email} starting {backup_type} backup (storage: {storage})")
        
        # Build backup data
        backup_data = {
            'meta': {
                'version': '1.0',
                'created_at': datetime.now().isoformat(),
                'created_by': user.email,
                'backup_type': backup_type,
                'tenant': getattr(request, 'tenant', None) and request.tenant.schema_name or 'default',
            },
            'data': {}
        }
        
        # Filter buildings if specified
        buildings_qs = Building.objects.all()
        if building_ids:
            buildings_qs = buildings_qs.filter(id__in=building_ids)
        
        # Always include buildings and apartments
        if backup_type in ['full', 'buildings']:
            backup_data['data']['buildings'] = _serialize_buildings(buildings_qs)
            backup_data['data']['apartments'] = _serialize_apartments(buildings_qs)
        
        # Include financial data
        if backup_type in ['full', 'financial']:
            backup_data['data']['expenses'] = _serialize_expenses(
                buildings_qs, date_from, date_to
            )
            backup_data['data']['payments'] = _serialize_payments(
                buildings_qs, date_from, date_to
            )
            backup_data['data']['apartment_shares'] = _serialize_apartment_shares(
                buildings_qs, date_from, date_to
            )
            
            if include_transactions:
                backup_data['data']['transactions'] = _serialize_transactions(
                    buildings_qs, date_from, date_to
                )
            
            backup_data['data']['monthly_balances'] = _serialize_monthly_balances(
                buildings_qs
            )
        
        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_id = str(uuid.uuid4())[:8]
        filename = f"backup_{backup_type}_{timestamp}_{backup_id}.json"
        
        # Add statistics to meta
        backup_data['meta']['statistics'] = {
            key: len(value) if isinstance(value, list) else 0
            for key, value in backup_data['data'].items()
        }
        backup_data['meta']['backup_id'] = backup_id
        backup_data['meta']['storage'] = storage
        
        logger.info(f"[BACKUP] Completed: {backup_data['meta']['statistics']}")
        
        # Handle different storage locations
        if storage == 'server':
            # Save to server
            return _save_backup_to_server(backup_data, filename, user)
        elif storage in ['google_drive', 'dropbox', 'onedrive']:
            # Cloud storage - not yet implemented
            return Response({
                'status': 'error',
                'error': f'Cloud storage ({storage}) δεν είναι ακόμα διαθέσιμο'
            }, status=status.HTTP_501_NOT_IMPLEMENTED)
        else:
            # Default: local download
            response = HttpResponse(
                json.dumps(backup_data, cls=DecimalEncoder, indent=2, ensure_ascii=False),
                content_type='application/json'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        
    except Exception as e:
        logger.error(f"[BACKUP] Error: {e}", exc_info=True)
        return Response({
            'status': 'error',
            'error': f'Σφάλμα κατά το backup: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def restore_database(request):
    """
    🔄 Database Restore API
    
    GET: Get restore instructions and warnings
    POST: Restore data from backup file
    
    Request Body (POST):
        - backup_data: dict - The parsed JSON backup data
        - mode: 'preview' | 'merge' | 'replace'
          - preview: Show what would be restored without making changes
          - merge: Add new data, update existing (safe)
          - replace: Delete existing and replace with backup (dangerous)
        - confirm: str - Must be 'CONFIRM_RESTORE' for non-preview
    
    Returns:
        Preview or restoration results
    """
    user = request.user
    
    # Security check
    if not (user.is_superuser or user.is_staff or getattr(user, 'role', '') == 'admin'):
        return Response({
            'error': 'Δεν έχετε δικαιώματα. Απαιτείται ρόλος Admin.',
        }, status=status.HTTP_403_FORBIDDEN)
    
    # GET: Show restore instructions
    if request.method == 'GET':
        return Response({
            'status': 'ready',
            'message': '🔄 Restore System Ready',
            'restore_modes': [
                {
                    'id': 'preview',
                    'name': 'Προεπισκόπηση',
                    'description': 'Δείχνει τι θα γίνει χωρίς αλλαγές',
                    'danger_level': 'safe'
                },
                {
                    'id': 'merge',
                    'name': 'Συγχώνευση',
                    'description': 'Προσθέτει νέα δεδομένα, ενημερώνει υπάρχοντα',
                    'danger_level': 'medium'
                },
                {
                    'id': 'replace',
                    'name': 'Αντικατάσταση',
                    'description': 'Διαγράφει τα υπάρχοντα και επαναφέρει από backup',
                    'danger_level': 'critical'
                }
            ],
            'warnings': [
                '⚠️ Η επαναφορά μπορεί να αλλάξει ή διαγράψει δεδομένα',
                '🔒 Συνιστάται backup πριν την επαναφορά',
                '📋 Ελέγξτε την προεπισκόπηση πριν συνεχίσετε',
                '⏱️ Η διαδικασία μπορεί να διαρκέσει αρκετά λεπτά'
            ],
            'instructions': [
                '1. Επιλέξτε το αρχείο backup (.json)',
                '2. Κάντε προεπισκόπηση για να δείτε τι θα αλλάξει',
                '3. Επιλέξτε τρόπο επαναφοράς (merge ή replace)',
                '4. Επιβεβαιώστε και εκτελέστε'
            ]
        })
    
    # POST: Process restore
    try:
        backup_data = request.data.get('backup_data')
        mode = request.data.get('mode', 'preview')
        confirm = request.data.get('confirm', '')
        
        # Validate backup data
        if not backup_data:
            return Response({
                'status': 'error',
                'error': 'Δεν παρέχονται δεδομένα backup'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not isinstance(backup_data, dict) or 'meta' not in backup_data or 'data' not in backup_data:
            return Response({
                'status': 'error',
                'error': 'Μη έγκυρη μορφή αρχείου backup'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Preview mode
        if mode == 'preview':
            preview = _preview_restore(backup_data)
            return Response({
                'status': 'preview',
                'message': '📋 Προεπισκόπηση Επαναφοράς',
                'backup_info': {
                    'version': backup_data['meta'].get('version'),
                    'created_at': backup_data['meta'].get('created_at'),
                    'created_by': backup_data['meta'].get('created_by'),
                    'backup_type': backup_data['meta'].get('backup_type'),
                },
                'preview': preview,
                'next_step': 'Για να συνεχίσετε, στείλτε mode: "merge" ή "replace" με confirm: "CONFIRM_RESTORE"'
            })
        
        # Require confirmation for actual restore
        if confirm != 'CONFIRM_RESTORE':
            return Response({
                'status': 'error',
                'error': 'Απαιτείται επιβεβαίωση: confirm: "CONFIRM_RESTORE"'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.warning(f"[RESTORE] User {user.email} starting {mode} restore")
        
        # Execute restore
        if mode == 'merge':
            result = _execute_merge_restore(backup_data, user)
        elif mode == 'replace':
            result = _execute_replace_restore(backup_data, user)
        else:
            return Response({
                'status': 'error',
                'error': f'Άγνωστο mode: {mode}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"[RESTORE] Completed by {user.email}: {result}")
        
        return Response({
            'status': 'success',
            'message': '✅ Η επαναφορά ολοκληρώθηκε',
            'mode': mode,
            'result': result,
            'executed_by': user.email
        })
        
    except Exception as e:
        logger.error(f"[RESTORE] Error: {e}", exc_info=True)
        return Response({
            'status': 'error',
            'error': f'Σφάλμα κατά την επαναφορά: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# Serialization helpers for backup
# ============================================

def _serialize_buildings(buildings_qs):
    """Serialize buildings to JSON-compatible format"""
    return [
        {
            'id': b.id,
            'name': b.name,
            'address': b.address,
            'city': getattr(b, 'city', ''),
            'postal_code': getattr(b, 'postal_code', ''),
            'total_apartments': b.apartments.count(),
            'current_reserve': float(b.current_reserve or 0),
            'reserve_fund_goal': float(b.reserve_fund_goal or 0),
            'reserve_fund_duration_months': b.reserve_fund_duration_months,
            'management_fee': float(getattr(b, 'management_fee', 0) or 0),
            'created_at': b.created_at.isoformat() if hasattr(b, 'created_at') and b.created_at else None,
        }
        for b in buildings_qs
    ]


def _serialize_apartments(buildings_qs):
    """Serialize apartments to JSON-compatible format"""
    apartments = Apartment.objects.filter(building__in=buildings_qs)
    return [
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
            'tenant_name': a.tenant_name,
            'tenant_email': a.tenant_email,
            'is_rented': a.is_rented,
        }
        for a in apartments
    ]


def _serialize_expenses(buildings_qs, date_from=None, date_to=None):
    """Serialize expenses"""
    expenses = Expense.objects.filter(building__in=buildings_qs)
    if date_from:
        expenses = expenses.filter(date__gte=date_from)
    if date_to:
        expenses = expenses.filter(date__lte=date_to)
    
    return [
        {
            'id': e.id,
            'building_id': e.building_id,
            'title': e.title,
            'description': e.description,
            'category': e.category,
            'amount': float(e.amount),
            'date': e.date.isoformat() if e.date else None,
            'status': e.status,
            'payer_type': getattr(e, 'payer_type', 'owner'),
        }
        for e in expenses
    ]


def _serialize_payments(buildings_qs, date_from=None, date_to=None):
    """Serialize payments"""
    payments = Payment.objects.filter(apartment__building__in=buildings_qs)
    if date_from:
        payments = payments.filter(date__gte=date_from)
    if date_to:
        payments = payments.filter(date__lte=date_to)
    
    return [
        {
            'id': p.id,
            'apartment_id': p.apartment_id,
            'amount': float(p.amount),
            'date': p.date.isoformat() if p.date else None,
            'method': p.method,
            'notes': p.notes,
            'reference_number': p.reference_number,
        }
        for p in payments
    ]


def _serialize_transactions(buildings_qs, date_from=None, date_to=None):
    """Serialize transactions"""
    transactions = Transaction.objects.filter(building__in=buildings_qs)
    if date_from:
        transactions = transactions.filter(date__gte=date_from)
    if date_to:
        transactions = transactions.filter(date__lte=date_to)
    
    return [
        {
            'id': t.id,
            'building_id': t.building_id,
            'apartment_id': t.apartment_id,
            'apartment_number': t.apartment_number,
            'date': t.date.isoformat() if t.date else None,
            'type': t.type,
            'status': t.status,
            'description': t.description,
            'amount': float(t.amount),
            'balance_before': float(t.balance_before or 0),
            'balance_after': float(t.balance_after or 0),
        }
        for t in transactions
    ]


def _serialize_apartment_shares(buildings_qs, date_from=None, date_to=None):
    """Serialize apartment shares"""
    shares = ApartmentShare.objects.filter(apartment__building__in=buildings_qs)
    # Filter by period date if provided
    if date_from:
        shares = shares.filter(period__start_date__gte=date_from)
    if date_to:
        shares = shares.filter(period__end_date__lte=date_to)
    
    return [
        {
            'id': s.id,
            'apartment_id': s.apartment_id,
            'period_id': s.period_id,
            'total_amount': float(s.total_amount or 0),
            'amount_paid': float(s.amount_paid or 0),
        }
        for s in shares
    ]


def _serialize_monthly_balances(buildings_qs):
    """Serialize monthly balances"""
    balances = MonthlyBalance.objects.filter(building__in=buildings_qs)
    return [
        {
            'id': b.id,
            'building_id': b.building_id,
            'year': b.year,
            'month': b.month,
            'total_expenses': float(b.total_expenses or 0),
            'total_payments': float(b.total_payments or 0),
            'carry_forward': float(b.carry_forward or 0),
            'is_closed': b.is_closed,
        }
        for b in balances
    ]


# ============================================
# Restore helpers
# ============================================

def _preview_restore(backup_data):
    """Preview what would be restored"""
    data = backup_data.get('data', {})
    preview = {}
    
    for key, items in data.items():
        if isinstance(items, list):
            preview[key] = {
                'count': len(items),
                'sample': items[:3] if items else []
            }
    
    return preview


def _execute_merge_restore(backup_data, user):
    """Execute merge restore - add new, update existing"""
    data = backup_data.get('data', {})
    result = {
        'created': {},
        'updated': {},
        'skipped': {}
    }
    
    with db_transaction.atomic():
        # Restore buildings
        if 'buildings' in data:
            created, updated, skipped = 0, 0, 0
            for b_data in data['buildings']:
                building, was_created = Building.objects.update_or_create(
                    id=b_data['id'],
                    defaults={
                        'name': b_data['name'],
                        'address': b_data.get('address', ''),
                    }
                )
                if was_created:
                    created += 1
                else:
                    updated += 1
            result['created']['buildings'] = created
            result['updated']['buildings'] = updated
        
        # Restore apartments
        if 'apartments' in data:
            created, updated = 0, 0
            for a_data in data['apartments']:
                if not Building.objects.filter(id=a_data['building_id']).exists():
                    continue
                apartment, was_created = Apartment.objects.update_or_create(
                    id=a_data['id'],
                    defaults={
                        'building_id': a_data['building_id'],
                        'number': a_data['number'],
                        'floor': a_data.get('floor'),
                        'square_meters': a_data.get('square_meters'),
                        'participation_mills': a_data.get('participation_mills'),
                        'current_balance': a_data.get('current_balance', 0),
                        'owner_name': a_data.get('owner_name', ''),
                        'owner_email': a_data.get('owner_email', ''),
                    }
                )
                if was_created:
                    created += 1
                else:
                    updated += 1
            result['created']['apartments'] = created
            result['updated']['apartments'] = updated
        
        # Restore payments
        if 'payments' in data:
            created = 0
            for p_data in data['payments']:
                if not Apartment.objects.filter(id=p_data['apartment_id']).exists():
                    continue
                payment, was_created = Payment.objects.get_or_create(
                    id=p_data['id'],
                    defaults={
                        'apartment_id': p_data['apartment_id'],
                        'amount': p_data['amount'],
                        'date': p_data.get('date'),
                        'method': p_data.get('method', 'cash'),
                        'notes': p_data.get('notes', ''),
                    }
                )
                if was_created:
                    created += 1
            result['created']['payments'] = created
    
    return result


def _execute_replace_restore(backup_data, user):
    """Execute replace restore - delete existing, restore from backup"""
    data = backup_data.get('data', {})
    result = {
        'deleted': {},
        'created': {}
    }
    
    with db_transaction.atomic():
        # Delete existing financial data
        if 'transactions' in data:
            deleted = Transaction.objects.all().delete()[0]
            result['deleted']['transactions'] = deleted
        
        if 'payments' in data:
            deleted = Payment.objects.all().delete()[0]
            result['deleted']['payments'] = deleted
        
        if 'expenses' in data:
            deleted = Expense.objects.all().delete()[0]
            result['deleted']['expenses'] = deleted
        
        # Now restore using merge logic
        merge_result = _execute_merge_restore(backup_data, user)
        result['created'] = merge_result['created']
    
    return result


# ============================================
# Backup History Endpoints
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def backup_history(request):
    """
    📜 Get backup history from server storage
    
    Returns list of backups stored on the server
    """
    user = request.user
    
    # Security check
    if not (user.is_superuser or user.is_staff or getattr(user, 'role', '') == 'admin'):
        return Response({
            'error': 'Δεν έχετε δικαιώματα. Απαιτείται ρόλος Admin.',
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        backups = _get_server_backups()
        
        return Response({
            'status': 'success',
            'backups': backups,
            'total_count': len(backups),
            'storage_location': BACKUP_DIR
        })
    except Exception as e:
        logger.error(f"[BACKUP] Error getting history: {e}", exc_info=True)
        return Response({
            'status': 'error',
            'error': f'Σφάλμα: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def backup_detail(request, backup_id):
    """
    📦 Get or delete a specific backup
    
    GET: Download backup data (for restore)
    DELETE: Remove backup from server
    """
    user = request.user
    
    # Security check
    if not (user.is_superuser or user.is_staff or getattr(user, 'role', '') == 'admin'):
        return Response({
            'error': 'Δεν έχετε δικαιώματα. Απαιτείται ρόλος Admin.',
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Find backup file
    _ensure_backup_dir()
    backup_file = None
    
    for filename in os.listdir(BACKUP_DIR):
        if filename.endswith('.json') and backup_id in filename:
            backup_file = filename
            break
    
    if not backup_file:
        return Response({
            'status': 'error',
            'error': 'Backup δεν βρέθηκε'
        }, status=status.HTTP_404_NOT_FOUND)
    
    filepath = os.path.join(BACKUP_DIR, backup_file)
    
    if request.method == 'GET':
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                backup_data = json.load(f)
            
            return Response({
                'status': 'success',
                'backup_id': backup_id,
                'filename': backup_file,
                'backup_data': backup_data
            })
        except Exception as e:
            logger.error(f"[BACKUP] Error reading backup {backup_id}: {e}")
            return Response({
                'status': 'error',
                'error': f'Σφάλμα ανάγνωσης: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'DELETE':
        try:
            os.remove(filepath)
            logger.info(f"[BACKUP] Deleted backup {backup_file} by {user.email}")
            
            return Response({
                'status': 'success',
                'message': f'Το backup {backup_file} διαγράφηκε'
            })
        except Exception as e:
            logger.error(f"[BACKUP] Error deleting backup {backup_id}: {e}")
            return Response({
                'status': 'error',
                'error': f'Σφάλμα διαγραφής: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

