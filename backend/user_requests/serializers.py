from rest_framework import serializers 
from .models import UserRequest
from buildings.models import Building

class UserRequestSerializer(serializers.ModelSerializer):
    # Expose building as a writable PK for creating/updating UserRequests
    building = serializers.PrimaryKeyRelatedField(
        queryset=Building.objects.all(),
    )
    
    # Display username of the creator, read-only
    created_by_username = serializers.CharField(source='created_by.username', read_only=True) 
    # Το πεδίο created_by στο μοντέλο είναι πιθανώς ForeignKey στον User.
    # Για να μην εκθέτουμε το ID του χρήστη, αλλά το username.

    # Use SerializerMethodField for supporter_count to handle annotated field
    supporter_count = serializers.SerializerMethodField()

    class Meta:
        model = UserRequest
        fields = [
            'id',
            'building', # To ID του κτιρίου
            'title',
            'description',
            'type',
            'status',
            'created_at',
            'created_by_username', # Το username του δημιουργού
            'supporter_count',     # Το πλήθος των υποστηρικτών
            'is_urgent',           # Προσθήκη του is_urgent αν δεν ήταν ήδη
            'updated_at',          # Προσθήκη του updated_at αν δεν ήταν ήδη
            # 'supporters' # Αν θέλετε να στέλνετε και τα IDs των supporters (μπορεί να είναι πολλά δεδομένα)
        ]
        read_only_fields = [
            'id',
            'status', # Συνήθως το status αλλάζει μέσω συγκεκριμένων actions, όχι απευθείας PATCH
            'created_at',
            'updated_at',
            'created_by_username', # Αυτό ορίζεται από το source και είναι read_only
            # Το supporter_count είναι τώρα SerializerMethodField, άρα είναι read-only από τη φύση του.
            # Δεν χρειάζεται να το προσθέσετε εδώ, αλλά δεν βλάπτει.
        ]

    def get_supporter_count(self, obj: UserRequest) -> int:
        """
        Returns the supporter count.
        Uses 'annotated_supporter_count' if available (from 'top' action's annotation),
        otherwise calculates it from the 'supporters' many-to-many field.
        """
        if hasattr(obj, 'annotated_supporter_count'):
            # This attribute is added by the .annotate() in the 'top' action
            return obj.annotated_supporter_count
        if hasattr(obj, 'supporters'): # Check if the instance has the 'supporters' manager
            return obj.supporters.count()
        return 0 # Default if something is wrong or no supporters field

    def validate_building(self, building: Building):
        user = self.context['request'].user
        if not user.is_authenticated:
             raise serializers.ValidationError("User not authenticated.")

        # Superusers μπορούν πάντα
        if user.is_superuser:
            return building
        
        # Managers μπορούν για τις πολυκατοικίες που διαχειρίζονται
        if user.is_staff and hasattr(building, 'manager') and building.manager == user:
            return building
        
        # Κάτοικοι (non-staff) μπορούν για την πολυκατοικία στην οποία ανήκουν
        # Αυτό προϋποθέτει ότι έχουμε τρόπο να ξέρουμε σε ποια πολυκατοικία ανήκει ο κάτοικος.
        # Παράδειγμα: αν το CustomUser έχει ένα ForeignKey 'assigned_building' ή ManyToManyField 'resident_in_buildings'
        # if not user.is_staff and hasattr(user, 'resident_profile') and user.resident_profile.building == building:
        # return building
        # Εναλλακτικά, αν ο κάτοικος μπορεί να δημιουργήσει αίτημα για οποιαδήποτε πολυκατοικία
        # (και μετά η εμφάνιση φιλτράρεται), τότε η παρακάτω συνθήκη είναι πιο απλή.
        # Προς το παρόν, ας υποθέσουμε ότι ένας κάτοικος μπορεί να δημιουργήσει αίτημα αν είναι απλά κάτοικος.
        # Η αντιστοίχιση με τη σωστή πολυκατοικία είναι σημαντική.
        # Αν δεν υπάρχει περιορισμός κτιρίου για κατοίκους κατά τη δημιουργία:
        if not user.is_staff: # Αν είναι κάτοικος
             # Εδώ θα μπορούσε να μπει λογική για να επιβεβαιώσει ότι το 'building' είναι έγκυρη επιλογή για τον κάτοικο.
             # Προς το παρόν, επιτρέπουμε αν είναι κάτοικος και έχει επιλέξει κάποιο building.
             return building

        raise serializers.ValidationError(
            "Δεν έχετε δικαίωμα δημιουργίας αιτήματος για αυτό το κτίριο, ή το κτίριο δεν είναι έγκυρο."
        )