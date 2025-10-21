# Generated migration to fix domain names with underscores
# Underscores violate RFC 1034/1035 and cause DisallowedHost exceptions in Django

from django.db import migrations


def migrate_underscores_to_hyphens(apps, schema_editor):
    """
    Replace underscores with hyphens in all domain names.
    This fixes RFC 1034/1035 compliance issues.
    """
    Domain = apps.get_model('tenants', 'Domain')

    updated_count = 0
    for domain in Domain.objects.all():
        if '_' in domain.domain:
            old_domain = domain.domain
            domain.domain = domain.domain.replace('_', '-')
            domain.save()
            print(f'✅ Migrated domain: {old_domain} -> {domain.domain}')
            updated_count += 1

    if updated_count > 0:
        print(f'\n🎉 Successfully migrated {updated_count} domain(s) to use hyphens instead of underscores')
    else:
        print('\n✅ No domains with underscores found - all domains are RFC compliant')


def reverse_migration(apps, schema_editor):
    """
    Reverse migration - NOT RECOMMENDED as it breaks RFC compliance.
    This is only provided for completeness.
    """
    Domain = apps.get_model('tenants', 'Domain')

    print('\n⚠️  WARNING: Reversing this migration will make domains non-RFC compliant!')
    print('This may cause DisallowedHost errors in Django.\n')

    # We can't reliably reverse this as we don't know which hyphens were originally underscores
    # So we just print a warning
    print('❌ Automatic reversal not supported - manual database changes required')


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0002_client_is_active_client_trial_days'),
    ]

    operations = [
        migrations.RunPython(migrate_underscores_to_hyphens, reverse_migration),
    ]
