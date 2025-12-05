# backend/buildings/views.py

from rest_framework import viewsets, status  
from rest_framework.response import Response  
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt  
from django.http import JsonResponse  
from django.utils import timezone  
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Sum
from datetime import datetime, date
from decimal import Decimal
import logging

from .models import Building, BuildingMembership, ServicePackage
from .serializers import BuildingSerializer, BuildingMembershipSerializer, ServicePackageSerializer
from users.models import CustomUser
from financial.models import Expense, Transaction, Payment, MonthlyBalance
from financial.monthly_balance_service import MonthlyBalanceService
from financial.utils.date_helpers import get_month_first_day, parse_month_string
from notifications.services import NotificationEventService


@ensure_csrf_cookie
def get_csrf_token(request):
    """Δίνει CSRF cookie χωρίς να απαιτείται login"""
    return JsonResponse({"message": "CSRF cookie set"})


def _get_current_context_logic(request):
    """
    Helper function για το get_current_context logic.
    Χρησιμοποιείται και από το BuildingViewSet action και από το standalone view.
    """
    from .services import BuildingService
    from .serializers import BuildingContextSerializer
    
    try:
        # Resolve building από request (not required)
        building_dto = BuildingService.resolve_building_from_request(
            request,
            required=False
        )
        
        if not building_dto:
            return Response(
                {
                    'error': 'Δεν βρέθηκε κτίριο. Παρακαλώ επιλέξτε κτίριο.',
                    'code': 'NO_BUILDING_FOUND'
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Serialize το DTO
        serializer = BuildingContextSerializer(building_dto.to_dict())
        
        return Response(serializer.data)
        
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Error in get_current_context: {e}", exc_info=True)
        return Response(
            {
                'error': str(e),
                'code': 'BUILDING_CONTEXT_ERROR'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@csrf_exempt
def public_buildings_list(request):
    """
    Public endpoint for listing buildings (no authentication required)
    Used by kiosk mode - Simple Django view without DRF
    Uses the authenticated user's tenant schema if available, otherwise falls back to demo
    """
    try:
        from django_tenants.utils import schema_context
        from tenants.models import Client, Domain as TenantDomain
        
        # Determine which tenant schema to use
        schema_name = 'demo'  # Default fallback
        resolved_from = 'default'
        
        # Prefer tenant derived from request host (matches Django tenant routing)
        # Priority: X-Tenant-Host > x-forwarded-host > host (same as tenant middleware)
        # Note: Use request.META instead of request.headers to match middleware behavior
        # Railway Edge proxy sets X-Tenant-Host header with the actual custom domain
        tenant_host = request.META.get('HTTP_X_TENANT_HOST', '')
        forwarded_host = request.META.get('HTTP_X_FORWARDED_HOST', '')
        http_host = request.META.get('HTTP_HOST', '')
        
        # Priority: X-Tenant-Host > X-Forwarded-Host > HTTP_HOST
        if tenant_host:
            host = tenant_host.split(':')[0].lower()
            print(f"🔍 [PUBLIC BUILDINGS] Using X-Tenant-Host: '{host}'")
        elif forwarded_host:
            host = forwarded_host.split(':')[0].lower()
            print(f"🔍 [PUBLIC BUILDINGS] Using X-Forwarded-Host: '{host}'")
        elif http_host:
            host = http_host.split(':')[0].lower()
            print(f"🔍 [PUBLIC BUILDINGS] Using HTTP_HOST: '{host}'")
        else:
            host = request.get_host().split(':')[0].lower()
            print(f"🔍 [PUBLIC BUILDINGS] Using get_host(): '{host}'")
        
        # Filter out internal Railway hostnames - they don't have tenant domains
        if host and ('railway.app' in host or 'up.railway.app' in host):
            # If we got an internal Railway hostname, try to get the actual domain from X-Tenant-Host
            # which should have been set by the middleware or Railway Edge proxy
            if tenant_host:
                host = tenant_host.split(':')[0].lower()
                print(f"🔍 [PUBLIC BUILDINGS] Overriding internal hostname with X-Tenant-Host: '{host}'")
            else:
                # If no X-Tenant-Host, we can't determine tenant, use default
                print(f"⚠️ [PUBLIC BUILDINGS] Got internal Railway hostname '{host}' but no X-Tenant-Host header, using default schema")
                host = None
        
        if host:
            # Query must be done in public schema context for Domain model
            domain_entry = (
                TenantDomain.objects.using('default')
                .filter(domain__iexact=host)
                .select_related('tenant')
                .first()
            )
            if domain_entry and domain_entry.tenant:
                schema_name = domain_entry.tenant.schema_name
                resolved_from = f'domain:{host}'
                print(f"🔍 [PUBLIC BUILDINGS] Resolved schema '{schema_name}' from domain '{host}'")
            else:
                print(f"⚠️ [PUBLIC BUILDINGS] No domain entry found for host '{host}', will use default schema")
        
        # If host lookup failed, try to use authenticated user's tenant
        if resolved_from == 'default' and hasattr(request, 'user') and request.user.is_authenticated:
            if hasattr(request.user, 'tenant') and request.user.tenant:
                schema_name = request.user.tenant.schema_name
                resolved_from = 'user'
                print(f"🔍 [PUBLIC BUILDINGS] Using authenticated user's tenant: {schema_name}")
        
        # Verify schema exists before using it
        if not Client.objects.filter(schema_name=schema_name).exists():
            print(f"⚠️ [PUBLIC BUILDINGS] Schema {schema_name} (resolved via {resolved_from}) does not exist, falling back to demo")
            schema_name = 'demo'
            resolved_from = 'default'
        
        with schema_context(schema_name):
            # Get all buildings from database
            buildings = Building.objects.all().order_by('name')
            
            buildings_data = []
            for building in buildings:
                building_data = {
                    'id': building.id,
                    'name': building.name,
                    'address': building.address,
                    'city': building.city,
                    'postal_code': building.postal_code,
                    'apartments_count': building.apartments_count,
                    'internal_manager_name': building.internal_manager_name,
                    'internal_manager_phone': building.internal_manager_phone,
                    'management_office_name': building.management_office_name,
                    'management_office_phone': building.management_office_phone,
                    'management_office_address': building.management_office_address,
                    'street_view_image': building.street_view_image,
                    'latitude': str(building.latitude) if building.latitude else None,
                    'longitude': str(building.longitude) if building.longitude else None,
                    'created_at': building.created_at.isoformat() if building.created_at else None,
                    'updated_at': building.updated_at.isoformat() if building.updated_at else None
                }
                buildings_data.append(building_data)
            
            print(f"🔍 [PUBLIC BUILDINGS] Returning {len(buildings_data)} buildings from tenant: {schema_name} (resolved via {resolved_from})")
            return JsonResponse(buildings_data, safe=False)
        
    except Exception as e:
        print(f"❌ [PUBLIC BUILDINGS] Error: {e}")
        # Fallback to empty list if database error
        return JsonResponse([], safe=False)


class ServicePackageViewSet(viewsets.ModelViewSet):
    """ViewSet για τα πακέτα υπηρεσιών"""
    queryset = ServicePackage.objects.filter(is_active=True)
    serializer_class = ServicePackageSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active']
    
    def get_serializer_context(self):
        """Προσθήκη building_id στο context για τον υπολογισμό κόστους"""
        context = super().get_serializer_context()
        building_id = self.request.query_params.get('building_id')
        if building_id:
            context['building_id'] = building_id
        return context
    
    @action(detail=True, methods=['post'])
    def apply_to_building(self, request, pk=None):
        """Εφαρμογή πακέτου σε κτίριο"""
        try:
            service_package = self.get_object()
            
            # Handle both DRF request and Django request
            if hasattr(request, 'data'):
                building_id = request.data.get('building_id')
            else:
                import json
                try:
                    data = json.loads(request.body.decode('utf-8'))
                    building_id = data.get('building_id')
                except (json.JSONDecodeError, UnicodeDecodeError):
                    building_id = request.POST.get('building_id')
            
            if not building_id:
                return Response(
                    {'error': 'building_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            from datetime import date
            
            building = Building.objects.get(id=building_id)
            building.service_package = service_package
            building.management_fee_per_apartment = service_package.fee_per_apartment
            building.service_package_start_date = date.today()  # Ημερομηνία έναρξης = σήμερα
            building.save()
            
            return Response({
                'message': f'Πακέτο "{service_package.name}" εφαρμόστηκε επιτυχώς',
                'building_id': building.id,
                'service_package_id': service_package.id,
                'new_fee': float(service_package.fee_per_apartment),
                'start_date': building.service_package_start_date.isoformat() if building.service_package_start_date else None
            })
            
        except Building.DoesNotExist:
            return Response(
                {'error': 'Building not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BuildingViewSet(viewsets.ModelViewSet):  # <-- ΟΧΙ ReadOnlyModelViewSet
    queryset = Building.objects.all()
    serializer_class = BuildingSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]  # Explicitly set parser to avoid any issues

    def get_queryset(self):
        user = self.request.user
        logger = logging.getLogger(__name__)

        logger.info(
            f"[BuildingViewSet] get_queryset called for user: {user.email} (ID: {user.id}) "
            f"in tenant: {self.request.tenant.schema_name}"
        )

        # Superusers & staff -> όλα τα κτίρια
        if user.is_superuser or user.is_staff:
            logger.info(f"User is superuser/staff. Returning all buildings.")
            return Building.objects.all().order_by('id')

        # Managers -> μόνο τα κτίρια που διαχειρίζονται
        is_manager = hasattr(user, "is_manager") and user.is_manager
        if is_manager:
            queryset = Building.objects.filter(manager_id=user.id).order_by('id')
            building_ids = list(queryset.values_list('id', flat=True))
            logger.info(f"User is a manager. Found buildings: {building_ids} for manager ID: {user.id}")
            return queryset

        # Residents -> μόνο τα κτίρια στα οποία ανήκουν
        if BuildingMembership.objects.filter(resident=user).exists():
            # Use 'memberships' related_name (not default 'buildingmembership')
            queryset = Building.objects.filter(memberships__resident=user).order_by('id')
            building_ids = list(queryset.values_list('id', flat=True))
            logger.info(f"User is a resident. Found buildings by membership: {building_ids}")
            return queryset

        # Αν δεν υπάρχει ρόλος ή δεν υπάρχει αντιστοίχιση
        logger.warning(
            f"User {user.email} is not superuser, staff, manager, or resident with membership. "
            f"Returning empty queryset."
        )
        return Building.objects.none()

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve method to add debugging"""
        print(f"🔍 BuildingViewSet.retrieve() called for building {kwargs.get('pk')}")
        response = super().retrieve(request, *args, **kwargs)
        print(f"🔍 BuildingViewSet.retrieve() response: {response.data}")
        print(f"🔍 Response street view image: {response.data.get('street_view_image')}")
        return response

    def list(self, request, *args, **kwargs):
        """Override list method to add debugging"""
        print("🔍 BuildingViewSet.list() called")
        response = super().list(request, *args, **kwargs)
        print(f"🔍 BuildingViewSet.list() response count: {len(response.data.get('results', []))}")
        if response.data.get('results'):
            first_building = response.data['results'][0]
            print(f"🔍 First building street view image: {first_building.get('street_view_image')}")
        return response

    def perform_create(self, serializer):
        """
        Κατά τη δημιουργία ενός κτιρίου:
        - Αν είναι staff αλλά όχι superuser, το πεδίο 'manager' γίνεται ο τρέχων χρήστης.
        - Αν είναι superuser, μπορεί να καθορίσει οποιονδήποτε manager μέσω του payload.
        """
        if not self.request.user.is_superuser and self.request.user.is_staff:
            serializer.save(manager=self.request.user)
        else:
            serializer.save()

    def create(self, request, *args, **kwargs):
        """Override create method to add debugging"""
        print("🔍 BuildingViewSet.create() called")
        print(f"🔍 Request data: {request.data}")
        print(f"🔍 Request data type: {type(request.data)}")
        print(f"🔍 Request content type: {request.content_type}")
        print(f"🔍 Request method: {request.method}")
        print(f"🔍 Latitude from request: {request.data.get('latitude')} (type: {type(request.data.get('latitude'))})")
        print(f"🔍 Longitude from request: {request.data.get('longitude')} (type: {type(request.data.get('longitude'))})")
        print(f"🔍 Street view image from request: {request.data.get('street_view_image')} (type: {type(request.data.get('street_view_image'))})")
        
        # Check if data is a QueryDict (which might cause the array issue)
        if hasattr(request.data, 'getlist'):
            print("⚠️  Request.data is a QueryDict-like object")
            print(f"🔍 Latitude getlist: {request.data.getlist('latitude')}")
            print(f"🔍 Longitude getlist: {request.data.getlist('longitude')}")
            print(f"🔍 Street view image getlist: {request.data.getlist('street_view_image')}")
        
        response = super().create(request, *args, **kwargs)
        print(f"🔍 BuildingViewSet.create() response: {response.data}")
        print(f"🔍 Response street view image: {response.data.get('street_view_image')}")
        return response

    def update(self, request, *args, **kwargs):
        """Override update method to add debugging"""
        print("🔍 BuildingViewSet.update() called")
        print(f"🔍 Request data: {request.data}")
        print(f"🔍 Request data type: {type(request.data)}")
        print(f"🔍 Request content type: {request.content_type}")
        print(f"🔍 Request method: {request.method}")
        print(f"🔍 internal_manager_id from request: {request.data.get('internal_manager_id')} (type: {type(request.data.get('internal_manager_id'))})")
        print(f"🔍 Latitude from request: {request.data.get('latitude')} (type: {type(request.data.get('latitude'))})")
        print(f"🔍 Longitude from request: {request.data.get('longitude')} (type: {type(request.data.get('longitude'))})")
        print(f"🔍 Street view image from request: {request.data.get('street_view_image')} (type: {type(request.data.get('street_view_image'))})")
        
        # Check if data is a QueryDict (which might cause the array issue)
        if hasattr(request.data, 'getlist'):
            print("⚠️  Request.data is a QueryDict-like object")
            print(f"🔍 internal_manager_id getlist: {request.data.getlist('internal_manager_id')}")
            print(f"🔍 Latitude getlist: {request.data.getlist('latitude')}")
            print(f"🔍 Longitude getlist: {request.data.getlist('longitude')}")
            print(f"🔍 Street view image getlist: {request.data.getlist('street_view_image')}")
        
        response = super().update(request, *args, **kwargs)
        print(f"🔍 BuildingViewSet.update() response: {response.data}")
        print(f"🔍 Response street view image: {response.data.get('street_view_image')}")
        return response

    @action(detail=True, methods=['post'], url_path='cancel_reserve_fund')
    def cancel_reserve_fund(self, request, pk=None):
        """Ακύρωση ενεργού στόχου αποθεματικού και καθαρισμός μελλοντικών χρεώσεων."""
        building = self.get_object()
        logger = logging.getLogger(__name__)

        if not any([
            building.reserve_fund_goal,
            building.reserve_fund_duration_months,
            building.reserve_fund_start_date,
            building.reserve_fund_target_date
        ]):
            return Response(
                {"detail": "Δεν υπάρχει ενεργό πρόγραμμα αποθεματικού για αυτό το κτίριο."},
                status=status.HTTP_400_BAD_REQUEST
            )

        effective_month = request.data.get('effective_month')
        today = timezone.now().date()

        try:
            if effective_month:
                year, month_number = parse_month_string(effective_month)
                cancel_start_date = get_month_first_day(year, month_number)
            else:
                cancel_start_date = date(today.year, today.month, 1)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if building.reserve_fund_start_date:
            cancel_start_date = max(cancel_start_date, building.reserve_fund_start_date)

        cancel_start_datetime = timezone.make_aware(
            datetime.combine(cancel_start_date, datetime.min.time())
        )

        with transaction.atomic():
            future_expenses = Expense.objects.filter(
                building=building,
                category='reserve_fund',
                date__gte=cancel_start_date
            )
            expenses_count = future_expenses.count()
            expenses_total = future_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            future_expenses.delete()

            future_transactions = Transaction.objects.filter(
                building=building,
                type='reserve_fund_charge',
                date__gte=cancel_start_datetime
            )
            transactions_count = future_transactions.count()
            future_transactions.delete()

            credited_amount = Payment.objects.filter(
                apartment__building=building,
                reserve_fund_amount__gt=0,
                date__lt=cancel_start_date
            ).aggregate(total=Sum('reserve_fund_amount'))['total'] or Decimal('0.00')

            building.reserve_fund_goal = None
            building.reserve_fund_duration_months = None
            building.reserve_fund_start_date = None
            building.reserve_fund_target_date = None
            building.reserve_contribution_per_apartment = Decimal('0.00')
            building.save(update_fields=[
                'reserve_fund_goal',
                'reserve_fund_duration_months',
                'reserve_fund_start_date',
                'reserve_fund_target_date',
                'reserve_contribution_per_apartment'
            ])

        start_year, start_month = cancel_start_date.year, cancel_start_date.month
        monthly_service = MonthlyBalanceService(building)
        months_recalculated = 0

        last_balance = MonthlyBalance.objects.filter(building=building).order_by('-year', '-month').first()
        if last_balance:
            start_tuple = (start_year, start_month)
            end_tuple = (last_balance.year, last_balance.month)
            if start_tuple > end_tuple:
                monthly_service.create_or_update_monthly_balance(start_year, start_month, recalculate=True)
                months_recalculated = 1
            else:
                monthly_service.recalculate_all_months(
                    start_year=start_year,
                    start_month=start_month,
                    end_year=last_balance.year,
                    end_month=last_balance.month
                )
                months_recalculated = (
                    (last_balance.year - start_year) * 12 +
                    (last_balance.month - start_month) + 1
                )
        else:
            monthly_service.create_or_update_monthly_balance(start_year, start_month, recalculate=True)
            months_recalculated = 1

        try:
            NotificationEventService.create_event(
                event_type='common_expense',
                building=building,
                title="Ακύρωση στόχου αποθεματικού",
                description=(
                    f"Το πρόγραμμα αποθεματικού ακυρώθηκε από {cancel_start_date.strftime('%B %Y')} και μετά. "
                    f"Ποσό {credited_amount:.2f}€ παραμένει διαθέσιμο ως πίστωση."
                ),
                url=f"/financial?building={building.id}&tab=balances",
                icon="🏦"
            )
        except Exception as exc:
            logger.warning("Failed to create notification event for reserve fund cancellation: %s", exc)

        return Response({
            "status": "cancelled",
            "effective_month": cancel_start_date.strftime('%Y-%m'),
            "removed_expenses": expenses_count,
            "removed_expense_total": float(expenses_total),
            "removed_transactions": transactions_count,
            "credited_amount": float(credited_amount),
            "months_recalculated": months_recalculated
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="assign-resident")
    def assign_resident(self, request):
        """
        Επιτρέπει σε superusers, office managers ή staff users να αντιστοιχίσουν κάτοικο σε κτίριο.
        """
        user_email = request.data.get("user_email")
        building_id = request.data.get("building")
        role = request.data.get("role", "resident")

        if not request.user.is_authenticated or not (
            request.user.is_superuser or request.user.is_office_manager or request.user.is_staff
        ):
            return Response({"detail": "Απαγορεύεται."}, status=status.HTTP_403_FORBIDDEN)

        if not user_email or not building_id:
            return Response({"detail": "Απαιτείται email και ID κτιρίου."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.get(email=user_email)
            building = Building.objects.get(id=building_id)
        except CustomUser.DoesNotExist:
            return Response({"detail": "Ο χρήστης δεν βρέθηκε."}, status=status.HTTP_404_NOT_FOUND)
        except Building.DoesNotExist:
            return Response({"detail": "Το κτίριο δεν βρέθηκε."}, status=status.HTTP_404_NOT_FOUND)

        # Αν δεν είναι superuser, να ελέγξουμε αν είναι manager του συγκεκριμένου κτιρίου
        if not request.user.is_superuser and not request.user.is_staff and not request.user.is_manager_of(building):
            return Response({"detail": "Δεν έχετε δικαίωμα σε αυτό το κτίριο."}, status=status.HTTP_403_FORBIDDEN)

        membership, created = BuildingMembership.objects.update_or_create(
            resident=user,
            building=building,
            defaults={"role": role}
        )
        membership.created_at = membership.created_at or timezone.now()
        membership.save()

        return Response({
            "message": "Η αντιστοίχιση ολοκληρώθηκε επιτυχώς.",
            "membership_id": membership.id,
            "created": created
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="memberships")
    def list_memberships(self, request):
        """
        Επιστρέφει τα μέλη κτιρίου για τον τρέχοντα χρήστη.
        - Superuser: όλα
        - Office manager: μόνο όσα ανήκουν σε κτίρια που διαχειρίζεται
        """
        user = request.user
        building_id = request.query_params.get("building_id")

        if not user.is_authenticated:
            return Response({"detail": "Μη εξουσιοδοτημένος."}, status=status.HTTP_401_UNAUTHORIZED)

        queryset = BuildingMembership.objects.all()

        # Περιορισμός για office managers
        if user.is_office_manager and not user.is_superuser:
            queryset = queryset.filter(building__manager=user)

        if building_id:
            try:
                building = Building.objects.get(id=building_id)
            except Building.DoesNotExist:
                return Response({"detail": "Το κτίριο δεν βρέθηκε."}, status=status.HTTP_404_NOT_FOUND)

            if user.is_office_manager and not user.is_manager_of(building) and not user.is_superuser:
                return Response({"detail": "Δεν έχετε δικαίωμα σε αυτό το κτίριο."}, status=status.HTTP_403_FORBIDDEN)

            queryset = queryset.filter(building_id=building_id)

        serializer = BuildingMembershipSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="test-coordinates")
    def test_coordinates(self, request):
        """Test endpoint to debug coordinate data format"""
        print("🔍 Test coordinates endpoint called")
        print(f"🔍 Request data: {request.data}")
        print(f"🔍 Request data type: {type(request.data)}")
        print(f"🔍 Latitude: {request.data.get('latitude')} (type: {type(request.data.get('latitude'))})")
        print(f"🔍 Longitude: {request.data.get('longitude')} (type: {type(request.data.get('longitude'))})")
        
        return Response({
            "message": "Test completed",
            "received_data": request.data,
            "latitude_type": str(type(request.data.get('latitude'))),
            "longitude_type": str(type(request.data.get('longitude')))
        })
    
    # ========================================================================
    # NEW: Building Context API Endpoints
    # ========================================================================
    
    @action(detail=False, methods=['get'], url_path='current-context')
    def get_current_context(self, request):
        """
        Επιστρέφει το τρέχον building context με permissions.
        
        Χρήση από frontend για να πάρει το canonical building context.
        
        Query params:
        - building_id (optional): Συγκεκριμένο building ID
        - Χωρίς param: Πρώτο available building του user
        
        Returns:
            BuildingDTO serialized με BuildingContextSerializer
        
        Examples:
            GET /api/buildings/current-context/
            GET /api/buildings/current-context/?building_id=1
        
        Response:
            {
                "id": 1,
                "name": "Building Name",
                "apartments_count": 10,
                "permissions": {
                    "can_edit": true,
                    "can_delete": false,
                    "can_manage_financials": true,
                    "can_view": true
                },
                ...
            }
        """
        return _get_current_context_logic(request)
    
    @action(detail=False, methods=['get'], url_path='my-buildings')
    def get_my_buildings(self, request):
        """
        Επιστρέφει όλα τα κτίρια του χρήστη με permissions.
        
        Χρήση από frontend για dropdown selections, building switcher κλπ.
        
        Query params:
        - lightweight (optional): Αν true, επιστρέφει BuildingContextListSerializer
        
        Returns:
            List of BuildingDTO serialized
        
        Examples:
            GET /api/buildings/my-buildings/
            GET /api/buildings/my-buildings/?lightweight=true
        
        Response:
            [
                {
                    "id": 1,
                    "name": "Building 1",
                    "apartments_count": 10,
                    "permissions": {...},
                    ...
                },
                {
                    "id": 2,
                    "name": "Building 2",
                    "apartments_count": 5,
                    "permissions": {...},
                    ...
                }
            ]
        """
        from .services import BuildingService
        from .serializers import BuildingContextSerializer, BuildingContextListSerializer
        
        try:
            # Get all user buildings
            buildings = BuildingService.get_user_buildings(request.user, as_dto=True)
            
            # Choose serializer based on query param
            lightweight = request.query_params.get('lightweight', 'false').lower() == 'true'
            
            if lightweight:
                # Lightweight serializer (για dropdowns)
                serializer = BuildingContextListSerializer(
                    [b.to_dict() for b in buildings],
                    many=True
                )
            else:
                # Full context serializer
                serializer = BuildingContextSerializer(
                    [b.to_dict() for b in buildings],
                    many=True
                )
            
            return Response(serializer.data)
            
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Error in get_my_buildings: {e}", exc_info=True)
            return Response(
                {
                    'error': str(e),
                    'code': 'MY_BUILDINGS_ERROR'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='context')
    def get_building_context(self, request, pk=None):
        """
        Επιστρέφει το context για συγκεκριμένο building (με ID).
        
        Χρήση από frontend όταν θέλει να πάρει το context για specific building.
        
        URL:
            GET /api/buildings/{id}/context/
        
        Returns:
            BuildingDTO serialized με BuildingContextSerializer
        
        Examples:
            GET /api/buildings/1/context/
        
        Response:
            {
                "id": 1,
                "name": "Building Name",
                "permissions": {...},
                ...
            }
        """
        from .services import BuildingService
        from .serializers import BuildingContextSerializer
        
        try:
            # Get building με το ID και validate access
            building_dto = BuildingService.validate_building_access_or_fail(
                request,
                building_id=int(pk)
            )
            
            # Serialize το DTO
            serializer = BuildingContextSerializer(building_dto.to_dict())
            
            return Response(serializer.data)
            
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Error in get_building_context for building {pk}: {e}", exc_info=True)
            return Response(
                {
                    'error': str(e),
                    'code': 'BUILDING_CONTEXT_ERROR'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Standalone view function for current-context endpoint at /api/buildings/current-context/
# This allows the endpoint to be accessed without the /list/ prefix
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_context_view(request):
    """
    Standalone view function for /api/buildings/current-context/ endpoint.
    This wraps the BuildingViewSet.get_current_context action to allow
    accessing it at the root level instead of /api/buildings/list/current-context/
    """
    return _get_current_context_logic(request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_user_to_building(request):
    """
    POST /api/buildings/add-membership/
    
    Προσθέτει έναν υπάρχοντα χρήστη σε κτίριο (δημιουργεί BuildingMembership).
    Μόνο για managers και superusers.
    
    Body:
        {
            "user_id": 123,
            "building_id": 456,
            "role": "resident"  // optional, default: "resident"
        }
    """
    from core.permissions import IsManagerOrSuperuser
    
    # Έλεγχος δικαιωμάτων
    if not IsManagerOrSuperuser().has_permission(request, None):
        return Response({
            'error': 'Μόνο οι διαχειριστές μπορούν να προσθέσουν χρήστες σε κτίρια.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    user_id = request.data.get('user_id')
    building_id = request.data.get('building_id')
    role = request.data.get('role', 'resident')
    
    if not user_id or not building_id:
        return Response({
            'error': 'Απαιτούνται user_id και building_id'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = CustomUser.objects.get(id=user_id)
        building = Building.objects.get(id=building_id)
        
        # Έλεγχος αν υπάρχει ήδη membership
        existing = BuildingMembership.objects.filter(resident=user, building=building).first()
        if existing:
            return Response({
                'message': f'Ο χρήστης {user.email} είναι ήδη μέλος του κτιρίου {building.name}',
                'membership_id': existing.id
            }, status=status.HTTP_200_OK)
        
        # Δημιουργία membership
        membership = BuildingMembership.objects.create(
            resident=user,
            building=building,
            role=role
        )
        
        logger = logging.getLogger(__name__)
        logger.info(f"Created membership: user={user.email}, building={building.name}, role={role}")
        
        return Response({
            'message': f'Ο χρήστης {user.email} προστέθηκε στο κτίριο {building.name}',
            'membership_id': membership.id
        }, status=status.HTTP_201_CREATED)
        
    except CustomUser.DoesNotExist:
        return Response({
            'error': f'Δεν βρέθηκε χρήστης με ID {user_id}'
        }, status=status.HTTP_404_NOT_FOUND)
    except Building.DoesNotExist:
        return Response({
            'error': f'Δεν βρέθηκε κτίριο με ID {building_id}'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Error adding user to building: {e}", exc_info=True)
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)