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
from core.permissions import IsManagerOrSuperuser


class ApartmentViewSet(viewsets.ModelViewSet):
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
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrSuperuser()]
    
    def get_queryset(self):
        """Φιλτράρισμα με βάση το κτίριο και τα δικαιώματα χρήστη"""
        queryset = self.queryset
        user = self.request.user
        building_id = self.request.query_params.get('building')
        
        # Φιλτράρισμα ανά κτίριο
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        # Δικαιώματα χρήστη
        if user.is_superuser:
            return queryset
        elif user.is_staff:
            # Managers μπορούν να βλέπουν διαμερίσματα από κτίρια που διαχειρίζονται
            managed_buildings = Building.objects.filter(manager=user)
            return queryset.filter(building__in=managed_buildings)
        else:
            # Κανονικοί χρήστες βλέπουν μόνο τα διαμερίσματά τους
            return queryset.filter(
                Q(owner_user=user) | Q(tenant_user=user)
            )
    
    def list(self, request, *args, **kwargs):
        """Λίστα διαμερισμάτων με προαιρετικό φιλτράρισμα"""
        queryset = self.filter_queryset(self.get_queryset())
        
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
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
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
    
    @action(detail=False, methods=['get'], url_path='by-building/(?P<building_id>[^/.]+)')
    def by_building(self, request, building_id=None):
        """Λήψη όλων των διαμερισμάτων ενός κτιρίου"""
        building = get_object_or_404(Building, id=building_id)
        
        # Έλεγχος δικαιωμάτων
        user = request.user
        if not user.is_superuser and not user.is_staff:
            return Response(
                {'error': 'Δεν έχετε δικαίωμα πρόσβασης'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.is_staff and not user.is_superuser:
            if building.manager != user:
                return Response(
                    {'error': 'Δεν έχετε δικαίωμα πρόσβασης σε αυτό το κτίριο'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Δημιουργία όλων των διαμερισμάτων αν δεν υπάρχουν
        existing_apartments = Apartment.objects.filter(building=building)
        
        if not existing_apartments.exists() and building.apartments_count > 0:
            # Δημιουργία κενών διαμερισμάτων
            apartments_to_create = []
            for i in range(1, building.apartments_count + 1):
                apartments_to_create.append(
                    Apartment(building=building, number=str(i))
                )
            
            Apartment.objects.bulk_create(apartments_to_create)
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
        apartment.ownership_percentage = owner_data.get('ownership_percentage', apartment.ownership_percentage)
        
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
        building_id = request.query_params.get('building')
        queryset = self.get_queryset()
        
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        total = queryset.count()
        rented = queryset.filter(is_rented=True).count()
        owned = queryset.filter(is_rented=False, owner_name__isnull=False).exclude(owner_name='').count()
        empty = queryset.filter(owner_name='', tenant_name='').count()
        
        return Response({
            'total': total,
            'rented': rented,
            'owned': owned,
            'empty': empty,
            'occupancy_rate': round((rented + owned) / total * 100, 1) if total > 0 else 0
        }) 