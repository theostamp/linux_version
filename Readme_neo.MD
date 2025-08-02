
# Καθάρισε όλα τα migrations εκτός από __init__.py
find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
find . -path "*/migrations/*.pyc" -delete

<!-- Με όλα default (θα ζητήσει μόνο το password του manager) -->

docker compose exec backend python scripts/create_tenant_and_migrate.py galatsi



<!-- Με όλα CLI παραμέτρους -->

docker compose exec backend python scripts/create_tenant_and_migrate.py mytenant -p mypass123 \
    --manager-email=admin@mytenant.com \
    --resident-email=user@mytenant.com \
    --resident-password=residentpass


<!-- A. Κάνε τον manager@neo.com super-user (1 γραμμή) -->

docker compose exec backend \
  python manage.py shell -c "
from django_tenants.utils import schema_context
from django.contrib.auth import get_user_model
with schema_context('neo'):
    u = get_user_model().objects.get(email='manager@neo.com')
    u.is_superuser = True
    u.save()
    print('✔︎ έγινε superuser')
"
<!-- Μετά κάνε refresh στη σελίδα admin· θα δεις όλα τα μοντέλα. -->

<!-- B. Πρόσθεσέ τον στο Group “Managers”
Το script initial_user_setup.py (που τρέχει μόνο στο public schema) έχει φτιάξει Groups & Permissions, αλλά στο schema neo δεν υπάρχουν ακόμη.

Δημιούργησε τα Groups & Permissions στο schema neo: -->


docker compose exec backend \
  python manage.py shell -c "
from django_tenants.utils import schema_context
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
with schema_context('neo'):
    managers, _ = Group.objects.get_or_create(name='Managers')
    # πάρε όλα τα perms για Building, Announcement κ.λπ. όπως στο initial_user_setup
    for model in ['building','announcement','vote','userrequest','obligation']:
        try:
            ct = ContentType.objects.get(model=model)
            managers.permissions.add(*Permission.objects.filter(content_type=ct))
        except ContentType.DoesNotExist:
            pass
    print('✔︎ Managers group έτοιμο')
"


<!-- Τώρα μπορείς να προσθέσεις τον manager στο Group “Managers” και να του δώσεις τα σωστά δικαιώματα. -->
docker compose exec backend \
  python manage.py shell -c "
from django_tenants.utils import schema_context
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
with schema_context('neo'):
    u = get_user_model().objects.get(
        email='manager@neo.com'
    )
    managers = Group.objects.get(name='Managers')
    u.groups.add(managers)
    print('✔︎ προστέθηκε στο group Managers')
"
<!-- Τώρα ο manager θα δει μόνο τα μοντέλα που ανήκουν στους «Managers». -->
Γ. Δημιούργησε νέο super-user μέσα στο schema neo
docker compose exec backend \
  python manage.py shell -c "
from django_tenants.utils import schema_context         
from django.contrib.auth import get_user_model
with schema_context('neo'):
    get_user_model().objects.create_superuser(
        email='admin@neo.com',
        password='neoAdmin123',
        first_name='Neo',
        last_name='Admin'
    )
    print('✔︎ superuser admin@neo.com δημιουργήθηκε')
"

<!-- Πώς να το αυτοματοποιήσουμε στο create_tenant_auto.py -->
Αν θέλεις το script να βάζει πάντα τον manager στο Group (ή να τον κάνει super-user), προσθέτεις μετά τη δημιουργία του χρήστη:

```python
# μετά το manager = CustomUser.objects.create_user(...)
from django.contrib.auth.models import Group
managers_group, _ = Group.objects.get_or_create(name="Managers")
manager.groups.add(managers_group)   # ή manager.is_superuser = True
manager.save()
```
Έτσι, κάθε νέος tenant θα έχει έτοιμο διαχειριστή με σωστά δικαιώματα.
<!-- A. Κάνε τον            
Πώς να το αυτοματοποιήσουμε στο create_tenant_auto.py
Αν θέλεις το script να βάζει πάντα τον manager στο Group (ή να τον κάνει super-user), προσθέτεις μετά τη δημιουργία του χρήστη:

```python
# μετά το manager = CustomUser.objects.create_user(...)
from django.contrib.auth.models import Group
managers_group, _ = Group.objects.get_or_create(name="Managers")
manager.groups.add(managers_group)   # ή manager.is_superuser = True
manager.save()
```
Έτσι, κάθε νέος tenant θα έχει έτοιμο διαχειριστή με σωστά δικαιώματα.


    u.groups.add(managers)
    print('✔︎ προστέθηκε στο group')
"
Refresh – θα δει μόνο τα μοντέλα που ανήκουν στους «Managers».

Γ. Δημιούργησε νέο super-user μέσα στο schema neo
bash
Αντιγραφή
Επεξεργασία
docker compose exec backend \
  python manage.py shell -c "
from django_tenants.utils import schema_context
from django.contrib.auth import get_user_model
with schema_context('neo'):
    get_user_model().objects.create_superuser(
        email='admin@neo.com',
        password='neoAdmin123',
        first_name='Neo',
        last_name='Admin'
    )
    print('✔︎ superuser admin@neo.com δημιουργήθηκε')
"
Πώς να το αυτοματοποιήσουμε στο create_tenant_auto.py
Αν θέλεις το script να βάζει πάντα τον manager στο Group (ή να τον κάνει super-user), προσθέτεις μετά τη δημιουργία του χρήστη:

python
Αντιγραφή
Επεξεργασία
# μετά το manager = CustomUser.objects.create_user(...)
from django.contrib.auth.models import Group
managers_group, _ = Group.objects.get_or_create(name="Managers")
manager.groups.add(managers_group)   # ή manager.is_superuser = True
manager.save()
Έτσι, κάθε νέος tenant θα έχει έτοιμο διαχειριστή με σωστά δικαιώματα.

