# backend/user_requests/views.py

from rest_framework import viewsets, permissions, status # Προσθήκη status για Response
from rest_framework.decorators import action # type: ignore # <--- ΠΡΟΣΘΕΣΤΕ ΑΥΤΗ ΤΗ ΓΡΑΜΜΗ
from rest_framework.response import Response
from django.db.models import Count, Q
from .models import UserRequest
from .serializers import UserRequestSerializer
# Βεβαιωθείτε ότι οι παρακάτω imports είναι σωστές και τα αρχεία υπάρχουν
from core.permissions import UserRequestOwnerOrManagerPermission 
from buildings.models import Building 

class UserRequestViewSet(viewsets.ModelViewSet):
    serializer_class = UserRequestSerializer
    permission_classes = [UserRequestOwnerOrManagerPermission] 

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return UserRequest.objects.none()

        if user.is_superuser:
            return UserRequest.objects.all().order_by('-created_at')
        
        if user.is_staff: # Είναι Manager Office
            # Οι Managers βλέπουν αιτήματα από τις πολυκατοικίες που διαχειρίζονται
            # Αυτό προϋποθέτει ότι το CustomUser (manager) έχει ένα M2M πεδίο 'managed_buildings'
            # ή το Building έχει ένα ForeignKey 'manager' στον User.
            # Ας υποθέσουμε ότι το Building έχει ένα ForeignKey 'manager'.
            managed_building_ids = Building.objects.filter(manager=user).values_list('id', flat=True)
            if not managed_building_ids: # Αν δεν διαχειρίζεται κτίρια, δεν βλέπει κανένα αίτημα
                return UserRequest.objects.none()
            return UserRequest.objects.filter(building_id__in=managed_building_ids).order_by('-created_at')
        else: # Είναι Resident (όχι staff, όχι superuser)
            # Οι κάτοικοι βλέπουν αιτήματα που έχουν δημιουργήσει οι ίδιοι
            # ΚΑΙ (προαιρετικά) όλα τα αιτήματα από την/τις πολυκατοικίες στις οποίες ανήκουν.
            # Για την ώρα, στη list view, ας τους επιτρέψουμε να δουν αιτήματα από τα κτίριά τους.
            # Αυτό απαιτεί έναν τρόπο να συνδέσουμε τον χρήστη-κάτοικο με τα κτίριά του.
            # Παράδειγμα: αν το CustomUser έχει ένα M2M 'resident_in_buildings'
            # ή ένα ForeignKey 'primary_building' στο προφίλ του.
            # Ας υποθέσουμε ότι υπάρχει ένα μοντέλο ResidentProfile που συνδέεται με τον User και το Building.
            # try:
            #     resident_profile = user.resident_profile # Αν υπάρχει one-to-one 'resident_profile'
            #     if resident_profile and resident_profile.building:
            #         return UserRequest.objects.filter(
            #             Q(building=resident_profile.building) | Q(created_by=user)
            #         ).distinct().order_by('-created_at')
            # except AttributeError: # Αν δεν υπάρχει resident_profile ή building
            #     return UserRequest.objects.filter(created_by=user).order_by('-created_at')
            
            # Για απλότητα τώρα, οι κάτοικοι βλέπουν τα δικά τους + αυτά της πολυκατοικίας τους (αν υπάρχει τρόπος να βρεθεί).
            # Αν δεν υπάρχει σαφής τρόπος, ας επιστρέψουμε μόνο τα δικά τους για τη λίστα προς το παρόν.
            # Η has_object_permission θα χειριστεί την πρόσβαση σε μεμονωμένα αντικείμενα.
            # Εναλλακτικά, για να επιτρέψουμε να δουν όλα (όπως πριν) και η has_object_permission να περιορίσει:
            # return UserRequest.objects.all().order_by('-created_at') 
            # Αλλά αυτό δεν είναι ιδανικό για τη λίστα.
            # Ας πούμε ότι προς το παρόν βλέπουν μόνο τα δικά τους στη λίστα για απλότητα,
            # μέχρι να οριστεί η σχέση κατοίκου-κτιρίου.
            return UserRequest.objects.filter(created_by=user).order_by('-created_at')


    def perform_create(self, serializer):
        # Η επικύρωση του building γίνεται στο UserRequestSerializer.
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='top', permission_classes=[permissions.IsAuthenticated]) # Όλοι οι αυθεντικοποιημένοι μπορούν να δουν τα top
    def top(self, request):
        """
        GET /api/user-requests/top/
        Returns the 10 requests with the most supporters.
        """
        qs = (
            UserRequest.objects
            .annotate(annotated_supporter_count=Count('supporters'))
            .order_by('-annotated_supporter_count')[:10]
        )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='support', permission_classes=[permissions.IsAuthenticated]) # Όλοι οι αυθεντικοποιημένοι μπορούν να προσπαθήσουν να κάνουν support
    def support(self, request, pk=None):
        user_request = self.get_object() # Αυτό καλεί την check_object_permissions (UserRequestOwnerOrManagerPermission)
        user = request.user
        
        # Η UserRequestOwnerOrManagerPermission θα πρέπει να επιτρέπει σε έναν κάτοικο του κτιρίου
        # ή στον manager του κτιρίου να κάνει support, όχι μόνο στον owner.
        # Αυτό μπορεί να χρειαστεί προσαρμογή στην has_object_permission της UserRequestOwnerOrManagerPermission
        # για την 'support' action αν θέλετε πιο χαλαρά δικαιώματα για support.
        # Προς το παρόν, η has_object_permission είναι αυστηρή.

        if user in user_request.supporters.all():
            user_request.supporters.remove(user)
            status_message = "You are no longer supporting this request."
            supported = False
        else:
            user_request.supporters.add(user)
            status_message = "You are now supporting this request."
            supported = True
        
        # user_request.save() # Δεν είναι απαραίτητο το save() για M2M add/remove εκτός αν έχετε signals ή θέλετε να ανανεώσετε updated_at
        return Response({
            'status': status_message,
            'supporter_count': user_request.supporters.count(),
            'supported': supported
        }, status=status.HTTP_200_OK)
