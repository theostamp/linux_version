# backend/buildings/views.py
from rest_framework import viewsets, permissions # type: ignore
from rest_framework.authentication import SessionAuthentication, BasicAuthentication # type: ignore
# from rest_framework.permissions import IsAuthenticated # type: ignore # Το IsAuthenticated είναι ήδη στο permission_classes
from django.views.decorators.csrf import ensure_csrf_cookie # type: ignore
from django.http import JsonResponse # type: ignore

from .models import Building
from .serializers import BuildingSerializer
from core.permissions import IsManagerOrSuperuser # Βεβαιωθείτε ότι αυτή η κλάση υπάρχει και είναι σωστή

@ensure_csrf_cookie
def get_csrf_token(request):
    """Δίνει CSRF cookie χωρίς να χρειάζεται login"""
    return JsonResponse({"message": "CSRF cookie set"})

class BuildingViewSet(viewsets.ModelViewSet):
    """
    API endpoint που επιτρέπει την προβολή και επεξεργασία κτιρίων.
    • Superuser ⇒ βλέπει/γράφει τα πάντα  
    • Office-manager (staff user) ⇒ βλέπει/γράφει μόνο τα κτίρια που του έχουν ανατεθεί.
    • Residents (non-staff users) ⇒ δεν έχουν πρόσβαση σε αυτό το endpoint για τη λίστα κτιρίων.
                                      Η πρόσβασή τους σε πληροφορίες κτιρίου γίνεται μέσω άλλων αντικειμένων (π.χ. UserRequest).
    """
    # queryset = Building.objects.all().select_related("manager") # Αρχικό queryset
    serializer_class = BuildingSerializer

    # DRF setup για αυθεντικοποίηση και δικαιώματα
    # authentication_classes = [SessionAuthentication, BasicAuthentication] # Συνήθως ορίζεται global στο settings.py
                                                                        # ή αν θέλετε συγκεκριμένη αυθεντικοποίηση για αυτό το viewset.
                                                                        # Το JWTAuthentication θα πρέπει να είναι το κύριο αν χρησιμοποιείτε tokens.
    permission_classes = [permissions.IsAuthenticated, IsManagerOrSuperuser] # Πρώτα ελέγχει αν είναι αυθεντικοποιημένος, μετά τα custom δικαιώματα.

    def get_queryset(self):
        """
        Φιλτράρει το queryset ανάλογα με τον χρήστη.
        Οι Superusers βλέπουν όλα τα κτίρια.
        Οι Managers (staff users) βλέπουν μόνο τα κτίρια που τους έχουν ανατεθεί.
        """
        user = self.request.user
        base_queryset = Building.objects.all().select_related("manager").order_by('name') # Ξεκινάμε πάντα από ένα βασικό queryset

        if not user.is_authenticated: # Αν και το IsAuthenticated permission θα το μπλοκάρει
            return base_queryset.none()

        if user.is_superuser:
            return base_queryset
        elif user.is_staff: # Manager Office
            return base_queryset.filter(manager=user)
        else: # Residents ή άλλοι non-staff/non-superuser χρήστες
            # Για τη γενική λίστα κτιρίων, οι κάτοικοι δεν βλέπουν τίποτα από αυτό το ViewSet.
            return base_queryset.none()

    def perform_create(self, serializer):
        """
        Κατά τη δημιουργία ενός κτιρίου:
        - Αν ο χρήστης δεν είναι superuser (δηλαδή είναι manager/staff),
          το πεδίο 'manager' του νέου κτιρίου ορίζεται αυτόματα στον τρέχοντα χρήστη.
        - Αν ο χρήστης είναι superuser, μπορεί να ορίσει οποιονδήποτε manager (ή κανέναν) μέσω του payload.
          Αν δεν οριστεί manager από τον superuser στο payload, το πεδίο manager θα πάρει την τιμή που
          ορίζεται στο μοντέλο (π.χ., null=True, blank=True ή κάποιο default).
        """
        if not self.request.user.is_superuser and self.request.user.is_staff:
            # Αν ο χρήστης είναι staff (manager) αλλά όχι superuser,
            # τότε αυτός γίνεται αυτόματα ο manager του κτιρίου που δημιουργεί.
            # Σημείωση: Αυτό προϋποθέτει ότι οι managers μπορούν να δημιουργούν κτίρια.
            # Αν μόνο οι superusers μπορούν να δημιουργούν, τότε αυτή η συνθήκη πρέπει να αλλάξει
            # ή η δημιουργία να μπλοκάρεται από την IsManagerOrSuperuser.has_permission.
            # Η IsManagerOrSuperuser.has_permission (όπως την είχαμε ορίσει) επιτρέπει σε staff.
            serializer.save(manager=self.request.user)
        else:
            # Superuser: ο manager ορίζεται από τα δεδομένα που στέλνονται ή παραμένει κενός
            # αν το μοντέλο το επιτρέπει και δεν δόθηκε τιμή.
            # Αν ο superuser δεν στείλει manager, και το πεδίο manager στο μοντέλο Building
            # έχει null=True, blank=True, τότε θα δημιουργηθεί χωρίς manager.
            # Αν το πεδίο manager είναι υποχρεωτικό, ο serializer θα πετάξει σφάλμα αν δεν δοθεί.
            serializer.save()

    # Η IsManagerOrSuperuser.has_object_permission θα χειριστεί τα δικαιώματα για retrieve, update, delete:
    # - Superuser: μπορεί να κάνει τα πάντα.
    # - Manager: μπορεί να δει/επεξεργαστεί/διαγράψει ΜΟΝΟ τα κτίρια που έχει manager=request.user.
