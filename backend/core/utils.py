
# backend/core/utils.py
from django.core.exceptions import ObjectDoesNotExist      
from rest_framework import exceptions
from buildings.models import Building
from django.db.models import Q

def _validate_building_param(building_param):
    try:
        return int(building_param) if building_param is not None else None
    except (ValueError, TypeError):
        raise exceptions.ValidationError({"building": "Το ID του κτηρίου πρέπει να είναι αριθμός."})

def _filter_for_superuser(base_queryset, building_param, building_field):
    if building_param and building_param != 'null':
        building_id = _validate_building_param(building_param)
        print(f"Superuser filtered by building_id: {building_id}")
        # Include both specific building and global items (building=null)
        return base_queryset.filter(
            Q(**{f"{building_field}_id": building_id}) | Q(**{f"{building_field}": None})
        )
    # Αν building_param είναι null ή 'null', επιστρέφουμε όλα τα κτίρια
    print("Superuser: showing all buildings")
    return base_queryset

def _filter_for_manager(base_queryset, user, building_param, building_field):
    managed_ids = list(Building.objects.filter(manager=user).values_list("id", flat=True))
    print(f"Managed buildings: {managed_ids}")
    if building_param and building_param != 'null':
        building_id = _validate_building_param(building_param)
        print(f"[DEBUG] building_id type: {type(building_id)}, value: {building_id}")
        print(f"[DEBUG] managed_ids types: {[type(i) for i in managed_ids]}, values: {managed_ids}")
        # Ensure both are int for comparison
        try:
            building_id = int(building_id)
        except Exception as e:
            print(f"[ERROR] building_id could not be cast to int: {e}")
            return base_queryset.none()
        if building_id in managed_ids:
            # Include both specific building and global items (building=null)
            return base_queryset.filter(
                Q(**{f"{building_field}_id": building_id}) | Q(**{f"{building_field}": None})
            )
        else:
            print("Manager δεν διαχειρίζεται αυτό το κτήριο.")
            return base_queryset.none()
    else:
        # Αν building_param είναι null ή 'null', επιστρέφουμε όλα τα κτίρια που διαχειρίζεται + global
        print("Manager: showing all managed buildings")
        return base_queryset.filter(
            Q(**{f"{building_field}_id__in": managed_ids}) | Q(**{f"{building_field}": None})
        )

def _filter_for_resident(base_queryset, user, building_param, building_field):
    try:
        profile = getattr(user, "profile", None)
        if not profile or not getattr(profile, "building", None):
            print("Resident: profile ή building δεν υπάρχει")
            # Even if resident has no building, they should see global items
            return base_queryset.filter(**{f"{building_field}": None})
        resident_building_id = profile.building.id
        print(f"Resident building id: {resident_building_id}")
        if building_param and building_param != 'null':
            building_id = _validate_building_param(building_param)
            if building_id == resident_building_id:
                # Include both specific building and global items (building=null)
                return base_queryset.filter(
                    Q(**{f"{building_field}_id": building_id}) | Q(**{f"{building_field}": None})
                )
            else:
                print("Resident δεν ανήκει σε αυτό το κτήριο.")
                return base_queryset.none()
        else:
            # Αν building_param είναι null ή 'null', επιστρέφουμε το κτίριο του resident + global
            print("Resident: showing only their building + global")
            return base_queryset.filter(
                Q(**{f"{building_field}_id": resident_building_id}) | Q(**{f"{building_field}": None})
            )
    except (AttributeError, ObjectDoesNotExist) as e:
        print(f"Exception in resident filter: {e}")
        # In case of error, still show global items
        return base_queryset.filter(**{f"{building_field}": None})

def filter_queryset_by_user_and_building(request, base_queryset, building_field='building'):
    """
    Φιλτράρει queryset με βάση το building param και το ρόλο χρήστη (superuser, manager, resident).
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

    if not user or not getattr(user, "is_authenticated", False):
        print("User not authenticated ή δεν υπάρχει user object.")
        return base_queryset.none()

    # Αν δεν περνάει building parameter, θεωρούμε ότι είναι null
    if building_param is None:
        building_param = 'null'

    if getattr(user, "is_superuser", False):
        return _filter_for_superuser(base_queryset, building_param, building_field)

    if getattr(user, "is_staff", False):
        return _filter_for_manager(base_queryset, user, building_param, building_field)

    return _filter_for_resident(base_queryset, user, building_param, building_field)
