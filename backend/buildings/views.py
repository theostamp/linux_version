# backend/buildings/views.py

from rest_framework import viewsets, status  
from rest_framework.response import Response  
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt  
from django.http import JsonResponse  
from django.utils import timezone  
from django_filters.rest_framework import DjangoFilterBackend

from .models import Building, BuildingMembership, ServicePackage
from .serializers import BuildingSerializer, BuildingMembershipSerializer, ServicePackageSerializer
from users.models import CustomUser


@ensure_csrf_cookie
def get_csrf_token(request):
    """Δίνει CSRF cookie χωρίς να απαιτείται login"""
    return JsonResponse({"message": "CSRF cookie set"})

@csrf_exempt
def public_buildings_list(request):
    """
    Public endpoint for listing buildings (no authentication required)
    Used by kiosk mode - Simple Django view without DRF
    Always uses demo tenant since that's where the building data is
    """
    try:
        # Always use demo tenant context since that's where the data is
        from django_tenants.utils import schema_context
        
        with schema_context('demo'):
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
            
            print(f"🔍 [PUBLIC BUILDINGS] Returning {len(buildings_data)} buildings from demo tenant")
            return JsonResponse(buildings_data, safe=False)
        
    except Exception as e:
        print(f"❌ [PUBLIC BUILDINGS] Error: {e}")
        # Fallback to static data if database error
        fallback_data = [
            {
                'id': 3,
                'name': "Σόλωνος 8, Αθήνα 106 73",
                'address': "Σόλωνος 8, Αθήνα 106 73, Ελλάδα",
                'city': "Αθήνα",
                'postal_code': "10673",
                'apartments_count': 12,
                'internal_manager_name': "Νίκος Δημητρίου",
                'internal_manager_phone': "2103456789",
                'management_office_name': "Compuyterme",
                'management_office_phone': "21055566368",
                'management_office_address': "Αθήνα, Ελλάδα",
                'street_view_image': None,
                'latitude': "37.9838",
                'longitude': "23.7275",
                'created_at': "2024-01-01T00:00:00Z",
                'updated_at': "2024-01-01T00:00:00Z"
            }
        ]
        return JsonResponse(fallback_data, safe=False)


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

        # Superusers & staff -> όλα τα κτίρια
        if user.is_superuser or user.is_staff:
            return Building.objects.all()

        # Managers -> μόνο τα κτίρια που διαχειρίζονται
        if hasattr(user, "is_manager") and user.is_manager:
            return Building.objects.filter(manager_id=user.id)

        # Residents -> μόνο τα κτίρια στα οποία ανήκουν
        if BuildingMembership.objects.filter(resident=user).exists():
            return Building.objects.filter(buildingmembership__resident=user)

        # Αν δεν υπάρχει ρόλος ή δεν υπάρχει αντιστοίχιση
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
        print(f"🔍 Latitude from request: {request.data.get('latitude')} (type: {type(request.data.get('latitude'))})")
        print(f"🔍 Longitude from request: {request.data.get('longitude')} (type: {type(request.data.get('longitude'))})")
        print(f"🔍 Street view image from request: {request.data.get('street_view_image')} (type: {type(request.data.get('street_view_image'))})")
        
        # Check if data is a QueryDict (which might cause the array issue)
        if hasattr(request.data, 'getlist'):
            print("⚠️  Request.data is a QueryDict-like object")
            print(f"🔍 Latitude getlist: {request.data.getlist('latitude')}")
            print(f"🔍 Longitude getlist: {request.data.getlist('longitude')}")
            print(f"🔍 Street view image getlist: {request.data.getlist('street_view_image')}")
        
        response = super().update(request, *args, **kwargs)
        print(f"🔍 BuildingViewSet.update() response: {response.data}")
        print(f"🔍 Response street view image: {response.data.get('street_view_image')}")
        return response

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
