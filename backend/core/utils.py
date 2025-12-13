
# backend/core/utils.py
from django.core.exceptions import ObjectDoesNotExist      
from rest_framework import exceptions
from buildings.models import Building
from django.db.models import Q
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

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
    # Στο πλαίσιο του tenant schema, οι managers και το προσωπικό γραφείου 
    # έχουν πρόσβαση σε ΟΛΑ τα κτίρια.
    # Δεν χρειάζεται να φιλτράρουμε με βάση το manager_id του Building,
    # καθώς η απομόνωση δεδομένων γίνεται ήδη μέσω του schema.
    
    # Επιβεβαίωση ότι ο χρήστης έχει ρόλο διαχείρισης
    is_management_staff = (
        user.is_staff or 
        user.role in ['manager', 'office_staff', 'staff', 'admin'] or
        getattr(user, 'is_office_manager', False) or
        getattr(user, 'is_office_staff', False)
    )
    
    if not is_management_staff:
        # Αν για κάποιο λόγο μπήκε εδώ χωρίς να είναι staff, fallback σε αυστηρό έλεγχο
        managed_ids = list(Building.objects.filter(manager_id=user.id).values_list("id", flat=True))
        if building_param and building_param != 'null':
            try:
                building_id = int(_validate_building_param(building_param))
                if building_id in managed_ids:
                     return base_queryset.filter(
                        Q(**{f"{building_field}_id": building_id}) | Q(**{f"{building_field}": None})
                    )
            except Exception:
                pass
            print("Manager (non-staff) δεν διαχειρίζεται αυτό το κτήριο.")
            return base_queryset.none()
        else:
             return base_queryset.filter(
                Q(**{f"{building_field}_id__in": managed_ids}) | Q(**{f"{building_field}": None})
            )

    # Για κανονικούς managers/staff του γραφείου, επιστρέφουμε τα πάντα (φιλτραρισμένα μόνο από το building_param αν υπάρχει)
    if building_param and building_param != 'null':
        try:
            building_id = int(_validate_building_param(building_param))
            print(f"Manager/Staff accessing building_id: {building_id}")
            return base_queryset.filter(
                Q(**{f"{building_field}_id": building_id}) | Q(**{f"{building_field}": None})
            )
        except Exception as e:
            print(f"[ERROR] building_id error: {e}")
            return base_queryset.none()
    else:
        # Αν building_param είναι null, επιστρέφουμε όλα τα κτίρια
        print("Manager/Staff: showing all buildings")
        return base_queryset

def _filter_for_internal_manager(base_queryset, user, building_param, building_field):
    """Filter για internal_manager - μπορεί να διαχειρίζεται ένα ή περισσότερα κτίρια"""
    managed_ids = list(Building.objects.filter(internal_manager_id=user.id).values_list("id", flat=True))
    print(f"Internal manager managed buildings: {managed_ids}")
    if building_param and building_param != 'null':
        building_id = _validate_building_param(building_param)
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
            print("Internal manager δεν διαχειρίζεται αυτό το κτήριο.")
            return base_queryset.none()
    else:
        # Αν building_param είναι null ή 'null', επιστρέφουμε όλα τα κτίρια που διαχειρίζεται + global
        print("Internal manager: showing all managed buildings")
        if managed_ids:
            return base_queryset.filter(
                Q(**{f"{building_field}_id__in": managed_ids}) | Q(**{f"{building_field}": None})
            )
        else:
            # Αν δεν διαχειρίζεται κανένα κτίριο, επιστρέφουμε μόνο global items
            return base_queryset.filter(**{f"{building_field}": None})

def _filter_for_resident(base_queryset, user, building_param, building_field):
    """
    Residents are linked to buildings via BuildingMembership (tenant schema),
    not via a user.profile.building field (which may not exist in this project).
    """
    try:
        from buildings.models import BuildingMembership

        resident_building_ids = list(
            BuildingMembership.objects.filter(resident=user).values_list("building_id", flat=True)
        )
        print(f"Resident building ids (memberships): {resident_building_ids}")

        # If resident has no memberships, still allow global items
        if not resident_building_ids:
            return base_queryset.filter(**{f"{building_field}": None})

        if building_param and building_param != "null":
            building_id = _validate_building_param(building_param)
            if building_id in resident_building_ids:
                return base_queryset.filter(
                    Q(**{f"{building_field}_id": building_id}) | Q(**{f"{building_field}": None})
                )
            print("Resident δεν ανήκει σε αυτό το κτήριο.")
            return base_queryset.none()

        # No building param: show all resident buildings + global
        return base_queryset.filter(
            Q(**{f"{building_field}_id__in": resident_building_ids}) | Q(**{f"{building_field}": None})
        )
    except Exception as e:
        print(f"Exception in resident filter: {e}")
        # In case of error, still show global items
        return base_queryset.filter(**{f"{building_field}": None})

def filter_queryset_by_user_and_building(request, base_queryset, building_field='building'):
    """
    Φιλτράρει queryset με βάση το building param και το ρόλο χρήστη (superuser, manager, internal_manager, resident).
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

    # Έλεγχος για internal_manager (πριν το resident filtering)
    user_role = getattr(user, "role", None)
    if user_role == "internal_manager":
        return _filter_for_internal_manager(base_queryset, user, building_param, building_field)

    return _filter_for_resident(base_queryset, user, building_param, building_field)


def publish_building_event(*, building_id: int, event_type: str, payload: dict):
    """Publish a realtime event to the building channel group.

    Reuses the chat group pattern `chat_{building_id}` and a generic handler `broadcast_event`.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        group_name = f"chat_{building_id}"
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "broadcast_event",
                "event": event_type,
                "payload": payload,
            },
        )
    except Exception:
        # In tests or when redis is not available, ignore realtime errors
        return
