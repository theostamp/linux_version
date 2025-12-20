from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Apartment
from .serializers import (
    ApartmentSerializer,
    ApartmentListSerializer,
    CreateApartmentSerializer,
    BulkCreateApartmentsSerializer
)
from buildings.models import Building
from core.mixins import RBACQuerySetMixin
from core.permissions import IsManagerOrSuperuser, IsAdmin, IsInternalManager, IsEnikos


class ApartmentViewSet(RBACQuerySetMixin, viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση διαμερισμάτων
    """
    queryset = Apartment.objects.select_related('building', 'owner_user', 'tenant_user').all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Επιλογή serializer ανάλογα με την ενέργεια"""
        if self.action == 'list':
            return ApartmentListSerializer
        elif self.action == 'create':
            return CreateApartmentSerializer
        elif self.action == 'bulk_create':
            return BulkCreateApartmentsSerializer
        return ApartmentSerializer
    
    def get_permissions(self):
        """Δικαιώματα ανάλογα με την ενέργεια"""
        if self.action in ['list', 'retrieve']:
            return [IsEnikos()]
        return [IsInternalManager()]
    
    def get_queryset(self):
        """Φιλτράρισμα με βάση το κτίριο και τα δικαιώματα χρήστη"""
        queryset = super().get_queryset()
        building_param = self.request.query_params.get('building')
        
        # Φιλτράρισμα ανά κτίριο αν δοθεί στην παράμετρο
        if building_param:
            try:
                queryset = queryset.filter(building_id=int(building_param))
            except (TypeError, ValueError):
                pass
        
        return queryset

    def list(self, request, *args, **kwargs):
        """Λίστα διαμερισμάτων με προαιρετικό φιλτράρισμα"""
        queryset = self.filter_queryset(self.get_queryset())
        building_id = request.query_params.get('building')
        
        # Ταξινόμηση
        ordering = request.query_params.get('ordering', 'number')
        if ordering in ['number', '-number', 'floor', '-floor', 'owner_name', '-owner_name']:
            queryset = queryset.order_by(ordering)
        
        # Φιλτράρισμα ανά κατάσταση
        status_filter = request.query_params.get('status')
        if status_filter == 'rented':
            queryset = queryset.filter(is_rented=True)
        elif status_filter == 'owned':
            queryset = queryset.filter(is_rented=False, owner_name__isnull=False)
        elif status_filter == 'empty':
            queryset = queryset.filter(owner_name='', tenant_name='')

        # Για το UI του γραφείου: "έχει πρόσβαση" = membership στο κτίριο + ενεργός λογαριασμός.
        # Το υπολογίζουμε χωρίς N+1 queries, μόνο όταν έχουμε building filter.
        membership_user_ids: set[int] = set()
        if building_id:
            from buildings.models import BuildingMembership
            # Συλλέγουμε όλους τους user ids που εμφανίζονται σε owner_user / tenant_user στη λίστα
            pairs = list(queryset.values_list('owner_user_id', 'tenant_user_id'))
            user_ids = {uid for pair in pairs for uid in pair if uid}
            if user_ids:
                membership_user_ids = set(
                    BuildingMembership.objects.filter(
                        building_id=building_id,
                        resident_id__in=user_ids
                    ).values_list('resident_id', flat=True)
                )

        ctx = self.get_serializer_context()
        ctx['membership_user_ids'] = membership_user_ids
        serializer = self.get_serializer(queryset, many=True, context=ctx)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='vacate')
    def vacate(self, request, pk=None):
        """
        POST /api/apartments/{id}/vacate/
        Αφαίρεση πρόσβασης/σύνδεσης χρήστη από διαμέρισμα όταν κάποιος μετακομίζει.

        Body:
          - type: "tenant" | "owner"   (required)
          - deactivate_user: boolean    (optional, default false)
        """
        apartment = self.get_object()
        resident_type = request.data.get('type')
        deactivate_user = bool(request.data.get('deactivate_user', False))

        if resident_type not in ['tenant', 'owner']:
            return Response({'error': 'Μη έγκυρος τύπος. Επιτρεπτά: tenant, owner'}, status=status.HTTP_400_BAD_REQUEST)

        building = apartment.building
        user = apartment.tenant_user if resident_type == 'tenant' else apartment.owner_user

        # 1) Καθαρισμός στοιχείων στο διαμέρισμα + unlink user
        if resident_type == 'tenant':
            apartment.tenant_name = ''
            apartment.tenant_phone = ''
            apartment.tenant_phone2 = ''
            apartment.tenant_email = ''
            apartment.tenant_user = None
            apartment.is_rented = False
            apartment.rent_start_date = None
            apartment.rent_end_date = None
        else:  # owner
            apartment.owner_name = ''
            apartment.owner_phone = ''
            apartment.owner_phone2 = ''
            apartment.owner_email = ''
            apartment.owner_user = None

        apartment.save()

        removed_membership = False
        removed_internal_manager = False

        # 2) Αφαίρεση membership από το κτίριο, μόνο αν ο χρήστης δεν έχει άλλο linked apartment στο ίδιο κτίριο
        if user:
            from buildings.models import BuildingMembership

            other_apts_count = Apartment.objects.filter(building=building).exclude(pk=apartment.pk).filter(
                Q(owner_user=user) | Q(tenant_user=user)
            ).count()

            if other_apts_count == 0:
                deleted, _ = BuildingMembership.objects.filter(building=building, resident=user).delete()
                removed_membership = deleted > 0

            # Αν ήταν internal_manager στο κτίριο, καθαρίζουμε και το πεδίο στο Building
            if getattr(building, 'internal_manager_id', None) == user.id:
                building.internal_manager = None
                building.save(update_fields=['internal_manager'])
                removed_internal_manager = True

            # 3) Προαιρετικό: απενεργοποίηση λογαριασμού (global) αν δεν έχει memberships πουθενά
            if deactivate_user:
                remaining = BuildingMembership.objects.filter(resident=user).exists()
                if not remaining:
                    try:
                        from django_tenants.utils import schema_context, get_public_schema_name
                        from users.models import CustomUser
                        with schema_context(get_public_schema_name()):
                            CustomUser.objects.filter(id=user.id).update(is_active=False)
                    except Exception:
                        # Δεν μπλοκάρουμε το vacate για αυτό
                        pass

        return Response({
            'message': 'Ο χρήστης αφαιρέθηκε από το διαμέρισμα.',
            'removed_membership': removed_membership,
            'removed_internal_manager': removed_internal_manager
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        """Μαζική δημιουργία διαμερισμάτων"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        building = data['building']
        start_number = data['start_number']
        end_number = data['end_number']
        floor_mapping = data.get('floor_mapping', {})
        
        apartments_created = []
        
        try:
            with transaction.atomic():
                for i in range(start_number, end_number + 1):
                    apartment_number = str(i)
                    floor = floor_mapping.get(apartment_number)
                    
                    apartment = Apartment.objects.create(
                        building=building,
                        number=apartment_number,
                        floor=floor
                    )
                    apartments_created.append(apartment)
                
                return Response({
                    'message': f'Δημιουργήθηκαν {len(apartments_created)} διαμερίσματα επιτυχώς',
                    'created_count': len(apartments_created),
                    'apartments': ApartmentListSerializer(apartments_created, many=True).data
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({
                'error': f'Σφάλμα κατά τη δημιουργία: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='by-building/(?P<building_id>[0-9]+)')
    def by_building(self, request, building_id=None):
        """Λήψη όλων των διαμερισμάτων ενός κτιρίου"""
        try:
            building = get_object_or_404(Building, id=building_id)
        except ValueError:
            return Response(
                {'error': 'Μη έγκυρο ID κτιρίου'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Έλεγχος δικαιωμάτων
        user = request.user
        
        # Προσωπικό γραφείου (Managers, Staff, Admins) έχουν πρόσβαση σε όλα τα κτίρια του tenant
        is_office_personnel = (
            user.is_superuser or 
            user.is_staff or 
            user.role in ['manager', 'office_staff', 'staff', 'admin'] or
            getattr(user, 'is_office_manager', False) or
            getattr(user, 'is_office_staff', False)
        )
        
        if is_office_personnel:
            pass  # Άδεια πρόσβαση σε όλο το προσωπικό
        else:
            # Έλεγχος αν ο χρήστης είναι manager του κτιρίου
            if building.manager != user:
                # Έλεγχος αν είναι εσωτερικός διαχειριστής
                if building.internal_manager == user:
                    pass # Οκ
                # Έλεγχος αν είναι ένοικος στο κτίριο (για read-only πρόσβαση ίσως;)
                # Σημείωση: Το by_building επιστρέφει λίστα διαμερισμάτων που ίσως δεν πρέπει να βλέπει ο απλός ένοικος όλα
                else:
                    return Response(
                        {'error': 'Δεν έχετε δικαίωμα πρόσβασης σε αυτό το κτίριο'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        try:
            # Δημιουργία όλων των διαμερισμάτων αν δεν υπάρχουν
            existing_apartments = Apartment.objects.filter(building=building)
            
            if not existing_apartments.exists() and building.apartments_count > 0:
                # Δημιουργία κενών διαμερισμάτων με get_or_create για αποφυγή duplicates
                apartments_created = []
                for i in range(1, building.apartments_count + 1):
                    apartment, created = Apartment.objects.get_or_create(
                        building=building,
                        number=str(i),
                        defaults={
                            'floor': None,
                            'owner_name': '',
                            'tenant_name': '',
                            'is_rented': False,
                            'is_closed': False
                        }
                    )
                    if created:
                        apartments_created.append(apartment)
                
                # Ενημέρωση του queryset με τα νέα διαμερίσματα
                existing_apartments = Apartment.objects.filter(building=building)
            
            serializer = ApartmentListSerializer(existing_apartments, many=True)
            return Response({
                'building': {
                    'id': building.id,
                    'name': building.name,
                    'address': building.address,
                    'apartments_count': building.apartments_count
                },
                'apartments': serializer.data
            })
        except Exception as e:
            print(f"Error in by_building action: {e}")
            return Response(
                {'error': f'Σφάλμα κατά την επεξεργασία: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='update-owner')
    def update_owner(self, request, pk=None):
        """Ενημέρωση στοιχείων ιδιοκτήτη"""
        apartment = self.get_object()
        
        owner_data = request.data
        apartment.identifier = owner_data.get('identifier', apartment.identifier)
        apartment.owner_name = owner_data.get('owner_name', apartment.owner_name)
        apartment.owner_phone = owner_data.get('owner_phone', apartment.owner_phone)
        apartment.owner_phone2 = owner_data.get('owner_phone2', apartment.owner_phone2)
        apartment.owner_email = owner_data.get('owner_email', apartment.owner_email)
        
        # Ενημέρωση χιλιοστών - υποστηρίζουμε και τα δύο πεδία για συμβατότητα
        if 'participation_mills' in owner_data:
            apartment.participation_mills = owner_data.get('participation_mills')
        elif 'ownership_percentage' in owner_data:
            # Για backward compatibility
            apartment.ownership_percentage = owner_data.get('ownership_percentage')
            
        # Ενημέρωση χιλιοστών θέρμανσης και ανελκυστήρα
        if 'heating_mills' in owner_data:
            apartment.heating_mills = owner_data.get('heating_mills')
        if 'elevator_mills' in owner_data:
            apartment.elevator_mills = owner_data.get('elevator_mills')
        
        apartment.save()
        
        serializer = self.get_serializer(apartment)
        return Response({
            'message': 'Τα στοιχεία του ιδιοκτήτη ενημερώθηκαν επιτυχώς',
            'apartment': serializer.data
        })
    
    @action(detail=True, methods=['post'], url_path='update-tenant')
    def update_tenant(self, request, pk=None):
        """Ενημέρωση στοιχείων ενοίκου"""
        apartment = self.get_object()
        
        tenant_data = request.data
        apartment.tenant_name = tenant_data.get('tenant_name', apartment.tenant_name)
        apartment.tenant_phone = tenant_data.get('tenant_phone', apartment.tenant_phone)
        apartment.tenant_phone2 = tenant_data.get('tenant_phone2', apartment.tenant_phone2)
        apartment.tenant_email = tenant_data.get('tenant_email', apartment.tenant_email)
        apartment.is_rented = tenant_data.get('is_rented', apartment.is_rented)
        apartment.is_closed = tenant_data.get('is_closed', apartment.is_closed)
        apartment.rent_start_date = tenant_data.get('rent_start_date', apartment.rent_start_date)
        apartment.rent_end_date = tenant_data.get('rent_end_date', apartment.rent_end_date)
        
        apartment.save()
        
        serializer = self.get_serializer(apartment)
        return Response({
            'message': 'Τα στοιχεία του ενοίκου ενημερώθηκαν επιτυχώς',
            'apartment': serializer.data
        })
    
    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        """Στατιστικά διαμερισμάτων"""
        queryset = self.filter_queryset(self.get_queryset())
        
        total_apartments = queryset.count()
        rented_apartments = queryset.filter(is_rented=True).count()
        owned_apartments = queryset.filter(is_rented=False, owner_name__isnull=False).exclude(owner_name='').count()
        empty_apartments = queryset.filter(owner_name='', tenant_name='').count()
        closed_apartments = queryset.filter(is_closed=True).count()
        
        return Response({
            'total_apartments': total_apartments,
            'rented_apartments': rented_apartments,
            'owned_apartments': owned_apartments,
            'empty_apartments': empty_apartments,
            'closed_apartments': closed_apartments,
            'occupancy_rate': round((rented_apartments + owned_apartments) / total_apartments * 100, 1) if total_apartments > 0 else 0
        })

    @action(detail=False, methods=['get'], url_path='residents/(?P<building_id>[0-9]+)')
    def residents(self, request, building_id=None):
        """Λίστα ενοικιαστών για QR code connection (χωρίς authentication)"""
        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            return Response(
                {'error': 'Το κτίριο δεν βρέθηκε'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Φέρνουμε όλα τα διαμερίσματα του κτιρίου
        apartments = Apartment.objects.filter(building=building)
        
        residents = []
        
        for apartment in apartments:
            # Προσθέτουμε ιδιοκτήτη αν υπάρχει
            if apartment.owner_name and not apartment.is_closed:
                residents.append({
                    'id': f"owner_{apartment.id}",
                    'apartment_id': apartment.id,
                    'apartment_number': apartment.number,
                    'name': apartment.owner_name,
                    'phone': apartment.owner_phone or '',
                    'email': apartment.owner_email or '',
                    'type': 'owner',
                    'is_rented': apartment.is_rented,
                    'has_email': bool(apartment.owner_email)
                })
            
            # Προσθέτουμε ενοικιαστή αν υπάρχει
            if apartment.tenant_name and apartment.is_rented:
                residents.append({
                    'id': f"tenant_{apartment.id}",
                    'apartment_id': apartment.id,
                    'apartment_number': apartment.number,
                    'name': apartment.tenant_name,
                    'phone': apartment.tenant_phone or '',
                    'email': apartment.tenant_email or '',
                    'type': 'tenant',
                    'is_rented': True,
                    'has_email': bool(apartment.tenant_email)
                })
        
        # Ταξινόμηση κατά όνομα
        residents.sort(key=lambda x: x['name'])
        
        return Response({
            'building': {
                'id': building.id,
                'name': building.name,
                'address': building.address
            },
            'residents': residents,
            'total_residents': len(residents)
        })

    @action(detail=False, methods=['get'], url_path='building-residents/(?P<building_id>[0-9]+)')
    def building_residents(self, request, building_id=None):
        """Λίστα ενοίκων και ιδιοκτητών για επιλογή διαχειριστή"""
        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            return Response(
                {'error': 'Το κτίριο δεν βρέθηκε'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Φέρνουμε όλα τα διαμερίσματα του κτιρίου
        apartments = Apartment.objects.filter(building=building)
        
        residents = []
        
        for apartment in apartments:
            # Προσθέτουμε ιδιοκτήτη αν υπάρχει όνομα και τηλέφωνο
            if apartment.owner_name and apartment.owner_phone and not apartment.is_closed:
                residents.append({
                    'id': f"owner_{apartment.id}",
                    'apartment_id': apartment.id,
                    'apartment_number': apartment.number,
                    'name': apartment.owner_name,
                    'phone': apartment.owner_phone,
                    'email': apartment.owner_email or '',
                    'type': 'owner',
                    'display_text': f"{apartment.owner_name} (Ιδιοκτήτης - Διαμέρισμα {apartment.number})",
                    'user_id': apartment.owner_user.id if apartment.owner_user else None,  # User ID για internal_manager_id
                })
            
            # Προσθέτουμε ενοικιαστή αν υπάρχει όνομα και τηλέφωνο
            if apartment.tenant_name and apartment.tenant_phone and apartment.is_rented:
                residents.append({
                    'id': f"tenant_{apartment.id}",
                    'apartment_id': apartment.id,
                    'apartment_number': apartment.number,
                    'name': apartment.tenant_name,
                    'phone': apartment.tenant_phone,
                    'email': apartment.tenant_email or '',
                    'type': 'tenant',
                    'display_text': f"{apartment.tenant_name} (Ενοίκος - Διαμέρισμα {apartment.number})",
                    'user_id': apartment.tenant_user.id if apartment.tenant_user else None,  # User ID για internal_manager_id
                })
        
        # Ταξινόμηση κατά όνομα
        residents.sort(key=lambda x: x['name'])
        
        return Response({
            'residents': residents,
            'total_residents': len(residents)
        })

    @action(detail=True, methods=['post'], url_path='update-email')
    def update_email(self, request, pk=None):
        """Ενημέρωση email ενοικιαστή/ιδιοκτήτη"""
        apartment = self.get_object()
        resident_type = request.data.get('type')  # 'owner' ή 'tenant'
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'error': 'Το email είναι υποχρεωτικό'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if resident_type == 'owner':
            apartment.owner_email = email
        elif resident_type == 'tenant':
            apartment.tenant_email = email
        else:
            return Response(
                {'error': 'Μη έγκυρος τύπος ενοικιαστή'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        apartment.save()
        
        return Response({
            'message': 'Το email ενημερώθηκε επιτυχώς',
            'apartment_id': apartment.id,
            'email': email
        }) 
