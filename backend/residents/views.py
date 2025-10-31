from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Resident
from .serializers import ResidentSerializer
from buildings.models import Building
from core.permissions import IsManagerOrSuperuser

User = get_user_model()


class ResidentViewSet(viewsets.ModelViewSet):
    queryset = Resident.objects.all()
    serializer_class = ResidentSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsManagerOrSuperuser()]

    def get_queryset(self):
        """
        Φιλτράρει τους κατοίκους με βάση το κτίριο και τον ρόλο του χρήστη
        """
        user = self.request.user
        building_param = self.request.query_params.get('building')
        
        queryset = Resident.objects.select_related('user', 'building').all()
        
        # Superuser βλέπει όλους
        if user.is_superuser:
            if building_param:
                return queryset.filter(building_id=building_param)
            return queryset
        
        # Staff/Manager βλέπει μόνο τα κτίρια που διαχειρίζεται
        if user.is_staff:
            if building_param:
                # Έλεγχος αν το κτίριο ανήκει στον manager
                try:
                    building = Building.objects.get(id=building_param, manager=user)
                    return queryset.filter(building=building)
                except Building.DoesNotExist:
                    return queryset.none()
            return queryset.filter(building__manager=user)
        
        # Resident βλέπει μόνο το κτίριο του
        return queryset.filter(user=user)

    @action(detail=False, methods=['post'], url_path='create-with-user')
    def create_with_user(self, request):
        """
        Δημιουργεί έναν νέο χρήστη και τον αντιστοιχίζει ως κάτοικο σε ένα κτίριο
        """
        try:
            with transaction.atomic():
                # Εξαγωγή δεδομένων από το request
                email = request.data.get('email')
                first_name = request.data.get('first_name')
                last_name = request.data.get('last_name')
                password = request.data.get('password')
                apartment = request.data.get('apartment')
                building_id = request.data.get('building_id')
                role = request.data.get('role', 'tenant')
                phone = request.data.get('phone', '')

                # Επιβεβαίωση ότι υπάρχουν όλα τα απαραίτητα πεδία
                if not all([email, first_name, last_name, password, apartment, building_id]):
                    return Response({
                        'error': 'Όλα τα πεδία είναι υποχρεωτικά'
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Έλεγχος αν υπάρχει ήδη χρήστης με αυτό το email
                if User.objects.filter(email=email).exists():
                    return Response({
                        'error': 'Υπάρχει ήδη χρήστης με αυτό το email'
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Έλεγχος αν το κτίριο υπάρχει
                try:
                    building = Building.objects.get(id=building_id)
                except Building.DoesNotExist:
                    return Response({
                        'error': 'Το κτίριο δεν βρέθηκε'
                    }, status=status.HTTP_404_NOT_FOUND)

                # Έλεγχος αν υπάρχει ήδη κάτοικος σε αυτό το διαμέρισμα
                if Resident.objects.filter(building=building, apartment=apartment).exists():
                    return Response({
                        'error': f'Υπάρχει ήδη κάτοικος στο διαμέρισμα {apartment}'
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Δημιουργία νέου χρήστη
                # Note: Don't set CustomUser.role='resident' - that's for Resident.role (apartment level)
                # CustomUser.role (SystemRole) can only be 'superuser', 'admin', or 'manager'
                user = User.objects.create_user(
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=password,
                    role=None  # No SystemRole - will have Resident.role instead
                )

                # Δημιουργία κατοίκου
                resident = Resident.objects.create(
                    user=user,
                    building=building,
                    apartment=apartment,
                    role=role,
                    phone=phone
                )

                serializer = self.get_serializer(resident)
                return Response({
                    'message': 'Ο κάτοικος δημιουργήθηκε επιτυχώς',
                    'resident': serializer.data
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'error': f'Σφάλμα κατά τη δημιουργία: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['delete'], url_path='remove')
    def remove_resident(self, request, pk=None):
        """
        Αφαιρεί έναν κάτοικο από το κτίριο (διαγράφει τον Resident record)
        """
        try:
            resident = self.get_object()
            user = resident.user
            
            # Διαγραφή του resident record
            resident.delete()
            
            # Διαγραφή του user αν δεν έχει άλλες αντιστοιχίσεις
            if not Resident.objects.filter(user=user).exists():
                user.delete()
                message = 'Ο κάτοικος και ο λογαριασμός του διαγράφηκαν επιτυχώς'
            else:
                message = 'Ο κάτοικος αφαιρέθηκε από το κτίριο επιτυχώς'
            
            return Response({
                'message': message
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Σφάλμα κατά τη διαγραφή: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 