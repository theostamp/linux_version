from django.core.exceptions import ObjectDoesNotExist
from rest_framework import exceptions
from buildings.models import Building

def filter_queryset_by_user_and_building(request, base_queryset, building_field='building'):
    """
    Εφαρμόζει φίλτρο σε queryset με βάση:
    - το query param building
    - τον ρόλο του χρήστη (superuser, manager, resident)
    """
    user = getattr(request, "user", None)
    building_param = request.query_params.get("building")

    print(
        f"[filter_queryset_by_user_and_building] User: {user}, "
        f"is_authenticated: {getattr(user, 'is_authenticated', None)}, "
        f"is_superuser: {getattr(user, 'is_superuser', None)}, "
        f"is_staff: {getattr(user, 'is_staff', None)}, "
        f"building_param: {building_param}"
    )

    # Βασικός και απόλυτος έλεγχος για authentication.
    if not user or not hasattr(user, "is_authenticated") or not user.is_authenticated:
        print("User not authenticated ή δεν υπάρχει user object.")
        return base_queryset.none()

    # Φίλτρο building param (αν δοθεί).
    if building_param:
        try:
            building_id = int(building_param)
            base_queryset = base_queryset.filter(**{f"{building_field}_id": building_id})
            print(f"Filtered by building_id: {building_id}")
        except (ValueError, TypeError):
            print("Building param is not int")
            raise exceptions.ValidationError({"building": "Το ID του κτηρίου πρέπει να είναι αριθμός."})

    # Superuser βλέπει όλα.
    if getattr(user, "is_superuser", False):
        print("Superuser, return base_queryset")
        return base_queryset

    # Manager/staff βλέπει μόνο όσα διαχειρίζεται.
    if getattr(user, "is_staff", False):
        managed_ids = Building.objects.filter(manager=user).values_list("id", flat=True)
        print(f"Managed buildings: {list(managed_ids)}")
        return base_queryset.filter(**{f"{building_field}_id__in": managed_ids})

    # Resident: πρέπει να έχει profile με building.
    try:
        profile = getattr(user, "profile", None)
        print(f"User profile: {profile}")
        if not profile or not getattr(profile, "building", None):
            print("Profile ή building ΔΕΝ βρέθηκε στον χρήστη.")
            return base_queryset.none()
        print(f"Resident building: {profile.building}")
        return base_queryset.filter(**{f"{building_field}": profile.building})
    except (AttributeError, ObjectDoesNotExist) as e:
        print(f"Exception in resident filter: {e}")
        return base_queryset.none()
