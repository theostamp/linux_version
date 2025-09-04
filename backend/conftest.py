import pytest
from django.core.management import call_command
from django_tenants.utils import (
    get_tenant_model,
    get_tenant_domain_model,
    schema_context,
    schema_exists,
)


@pytest.fixture(scope="session", autouse=True)
def ensure_demo_tenant(django_db_setup, django_db_blocker):
    """
    Ensure the 'demo' tenant schema exists and is migrated before any tests run.

    This runs inside the Docker test environment and uses django-tenants utilities
    to create the tenant and apply tenant migrations if needed.
    """
    with django_db_blocker.unblock():
        TenantModel = get_tenant_model()
        DomainModel = get_tenant_domain_model()

        if not schema_exists("demo"):
            tenant = TenantModel(
                schema_name="demo",
                name="Demo Tenant",
                on_trial=True,
                is_active=True,
            )
            tenant.save()
            DomainModel.objects.get_or_create(
                domain="demo.localhost",
                tenant=tenant,
                defaults={"is_primary": True},
            )
            call_command("migrate_schemas", schema_name="demo", interactive=False, verbosity=0)
        else:
            tenant = TenantModel.objects.get(schema_name="demo")
            # Make sure tenant is up-to-date with migrations
            call_command("migrate_schemas", schema_name=tenant.schema_name, interactive=False, verbosity=0)

    yield


@pytest.fixture(autouse=True)
def use_demo_schema():
    """
    Automatically run each test within the 'demo' tenant schema context so that
    ORM operations target the correct tenant tables (e.g., buildings_building).
    """
    with schema_context("demo"):
        yield


