# backend/users/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.text import slugify
from django.core.exceptions import ValidationError
from django.db import transaction
import time

from .models import CustomUser
from tenants.models import Client, Domain


@receiver(post_save, sender=CustomUser)
def create_tenant_for_user(sender, instance, created, **kwargs):
    """
    Αυτόματη δημιουργία tenant όταν δημιουργείται ένας νέος user.
    Το tenant θα έχει το ίδιο όνομα με τον user (slugified).
    """
    if not created:  # Μόνο όταν δημιουργείται νέος user
        return
    
    # Παράλειψη για superusers (δεν χρειάζονται tenant)
    if instance.is_superuser:
        return
    
    try:
        with transaction.atomic():
            # Δημιουργία slug από το email του user
            email_prefix = instance.email.split('@')[0]
            tenant_name = slugify(email_prefix)
            
            # Έλεγχος αν το tenant_name είναι έγκυρο schema name
            if not tenant_name or len(tenant_name) < 1:
                tenant_name = f"tenant_{int(time.time())}"
            
            # Έλεγχος αν υπάρχει ήδη tenant με αυτό το όνομα
            if Client.objects.filter(schema_name=tenant_name).exists():
                # Αν υπάρχει, προσθέτουμε timestamp
                import time
                tenant_name = f"{tenant_name}_{int(time.time())}"
            
            # Δημιουργία tenant με συγκεκριμένο schema_name
            tenant = Client.objects.create(
                name=instance.get_full_name() or email_prefix,
                schema_name=tenant_name,  # Εξασφαλίζουμε ότι το schema_name είναι σωστό
                paid_until='2025-12-31',  # Default τιμή
                on_trial=True,
                is_active=True
            )
            
            # Δημιουργία domain
            domain_name = f"{tenant_name}.localhost"
            Domain.objects.create(
                domain=domain_name,
                tenant=tenant,
                is_primary=True
            )
            
            print(f"✅ Δημιουργήθηκε αυτόματα tenant '{tenant.name}' με domain '{domain_name}' για τον user '{instance.email}'")
            
    except ValidationError as e:
        print(f"❌ Σφάλμα στη δημιουργία tenant για τον user '{instance.email}': {e}")
    except Exception as e:
        print(f"❌ Απρόσμενο σφάλμα στη δημιουργία tenant για τον user '{instance.email}': {e}")


@receiver(post_save, sender=CustomUser)
def update_tenant_name(sender, instance, created, **kwargs):
    """
    Ενημέρωση του ονόματος του tenant όταν αλλάζει το όνομα του user.
    """
    if created:  # Μόνο για υπάρχοντες users
        return
    
    try:
        # Βρίσκουμε το tenant που ανήκει στον user
        tenant = Client.objects.filter(schema_name=slugify(instance.email.split('@')[0])).first()
        if tenant:
            new_name = instance.get_full_name() or instance.email.split('@')[0]
            if tenant.name != new_name:
                tenant.name = new_name
                tenant.save()
                print(f"✅ Ενημερώθηκε το όνομα του tenant σε '{new_name}' για τον user '{instance.email}'")
    except Exception as e:
        print(f"❌ Σφάλμα στην ενημέρωση του tenant για τον user '{instance.email}': {e}") 