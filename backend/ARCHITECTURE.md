# Architecture Documentation

## Multi-Tenant Architecture Overview

This application uses **schema-based multi-tenancy** with `django-tenants`. Each customer (tenant) has their own isolated PostgreSQL schema, ensuring complete data separation.

## App Classification

### SHARED_APPS (Public Schema)

These apps run in the **public schema** and are shared across all tenants. They handle SaaS-level functionality.

```python
SHARED_APPS = [
    'django_tenants',       # Multi-tenancy framework
    'tenants',              # Client & Domain models
    'django.contrib.admin',
    'django.contrib.auth',
    'users',                # User authentication (public schema users)
    'billing',              # Stripe subscriptions for SaaS platform
    'corsheaders',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]
```

**Purpose:**
- Manage tenant creation and lifecycle
- Handle Stripe subscriptions for the SaaS platform itself
- User authentication for public schema
- Admin interface

**CRITICAL RULE:** SHARED apps must NOT import from TENANT apps at module level.

---

### TENANT_APPS (Tenant Schemas)

These apps run in **tenant-specific schemas**. Each tenant has their own tables for these apps.

```python
TENANT_APPS = [
    'rest_framework',
    'django_filters',

    # Core building management
    'buildings',           # Κτίρια
    'apartments',          # Διαμερίσματα
    'residents',           # Ένοικοι

    # Financial management (building payments, NOT Stripe)
    'financial',           # Κοινόχρηστα, πληρωμές κτιρίου, οφειλές

    # Communication & governance
    'announcements',       # Ανακοινώσεις
    'user_requests',       # Αναφορά Βλαβών (πρώην Αιτήματα)
    'votes',               # Ψηφοφορίες
    'chat',                # Chat
    'notifications',       # Ειδοποιήσεις

    # Operations
    'maintenance',         # Συντήρηση
    'projects',            # Έργα
    'todo_management',     # TODO lists
    'events',              # Events
    'obligations',         # Υποχρεώσεις

    # Collaboration
    'teams',               # Ομάδες
    'collaborators',       # Συνεργάτες

    # System
    'core',                # Middleware, permissions, utilities
    'public_info',         # Public information
    'document_parser',     # Document processing
    'data_migration',      # AI data migration
    'integrations',        # External APIs
    'kiosk',               # Kiosk widget system
]
```

**Purpose:**
- Building/apartment management
- Building financial operations (κοινόχρηστα, οφειλές)
- Resident communication
- Voting, announcements, requests
- Maintenance and project management

---

## Separation of Concerns

### Billing vs Financial

**⚠️ CRITICAL:** There are TWO completely separate payment systems:

#### 1. `billing/` - SaaS Subscription Payments
- **Schema:** Public (SHARED_APP)
- **Purpose:** Stripe subscriptions for the SaaS platform itself
- **Models:** SubscriptionPlan, UserSubscription, BillingCycle
- **Handles:** Platform subscriptions, tenant creation triggers, usage limits

#### 2. `financial/` - Building Payments
- **Schema:** Tenant-specific (TENANT_APP)
- **Purpose:** Building management payments (κοινόχρηστα, οφειλές)
- **Models:** Payment, Transaction, Expense, CommonExpense
- **Handles:** Building expenses, apartment payments, accounting

These are **completely independent** payment systems and should never be confused.

---

## Architectural Boundaries

### ✅ Allowed Imports

#### SHARED → SHARED
```python
# ✅ OK: billing importing from users (both SHARED)
from users.models import CustomUser
from users.services import EmailService
```

#### TENANT → TENANT
```python
# ✅ OK: buildings importing from apartments (both TENANT)
from apartments.models import Apartment
```

#### SHARED → TENANT (Inside schema_context)
```python
# ✅ OK: Inside schema_context block
from django_tenants.utils import schema_context

with schema_context('tenant-schema'):
    from buildings.models import Building  # OK - inside tenant schema
    building = Building.objects.create(name='Demo')
```

#### SHARED → TENANT (Function-scope with try/except)
```python
# ✅ ACCEPTABLE: Function-scope import with error handling
def get_building_name(self, obj):
    if obj.building_id:
        try:
            from buildings.models import Building  # Inside function, wrapped
            building = Building.objects.get(id=obj.building_id)
            return building.name
        except:
            return None  # Handle gracefully if table doesn't exist
```

---

### ❌ Forbidden Imports

#### SHARED → TENANT (Module level)
```python
# ❌ WRONG: Module-level import in SHARED app
from buildings.models import Building  # Violates architecture!

class SubscriptionService:
    def create_subscription(self):
        building = Building.objects.create(...)  # Will fail in public schema
```

**Why it's wrong:**
- SHARED apps run in public schema
- TENANT app tables don't exist in public schema
- Causes import errors or runtime failures

---

## Refactoring Examples

### Before: Architectural Violation

```python
# billing/services.py (SHARED app) ❌

from buildings.utils import create_demo_building_for_manager  # VIOLATION

class BillingService:
    def create_subscription(user, plan):
        # ... create subscription ...

        # Create tenant and demo building directly ❌
        with schema_context(schema_name):
            demo_building = create_demo_building_for_manager(user)
```

### After: Proper Separation

```python
# billing/services.py (SHARED app) ✅

from tenants.services import TenantService  # OK: SHARED → SHARED

class BillingService:
    def create_subscription(user, plan):
        # ... create subscription ...

        # Delegate tenant creation to TenantService ✅
        tenant_service = TenantService()
        tenant, domain = tenant_service.create_tenant_infrastructure(
            schema_name=safe_schema,
            user=user,
            paid_until=current_period_end,
            on_trial=bool(trial_days)
        )
```

```python
# tenants/services.py (SHARED app) ✅

class TenantService:
    def create_tenant_infrastructure(self, schema_name, user, paid_until, on_trial):
        with transaction.atomic():
            # 1. Create tenant
            tenant = self._create_tenant(schema_name, user, paid_until, on_trial)

            # 2. Create domain
            domain = self._create_domain(tenant, schema_name)

            # 3. Run migrations
            self._run_tenant_migrations(schema_name)

            # 4. Create tenant user
            self._create_tenant_user(user, schema_name)

            # 5. Create demo data ✅
            self._create_demo_data(schema_name)  # Inside schema_context

            return tenant, domain

    def _create_demo_data(self, schema_name):
        with schema_context(schema_name):
            # ✅ CORRECT: Import inside schema_context
            from buildings.models import Building
            from apartments.models import Apartment

            building = Building.objects.create(name='Αλκμάνος 22', ...)
```

---

## Module-Level Import Rules

### tenants/admin_views.py - BEFORE ❌

```python
# ❌ Module-level imports in SHARED app
from buildings.models import Building, BuildingMembership
from announcements.models import Announcement
from user_requests.models import UserRequest

class TenantCreatorAdminView(admin.ModelAdmin):
    def create_tenant_view(self, request):
        with schema_context(tenant.schema_name):
            building = Building.objects.create(...)  # Uses module import
```

### tenants/admin_views.py - AFTER ✅

```python
# ✅ Imports moved inside schema_context
class TenantCreatorAdminView(admin.ModelAdmin):
    def create_tenant_view(self, request):
        with schema_context(tenant.schema_name):
            # Import TENANT models inside schema_context
            from buildings.models import Building, BuildingMembership
            from announcements.models import Announcement
            from user_requests.models import UserRequest

            building = Building.objects.create(...)  # Now safe
```

---

## Middleware Considerations

### financial.audit.AuditMiddleware

This TENANT app middleware is in global MIDDLEWARE list, which is **acceptable** because:

1. Early return for non-financial endpoints:
   ```python
   def log_request(self, request, response):
       if not self.is_financial_endpoint(request.path):
           return  # No logging for non-financial paths
   ```

2. Only executes in tenant schemas (financial paths only exist in tenant routes)

3. No module-level TENANT imports - models accessed at runtime when in tenant schema

**Rule:** Middleware from TENANT apps is acceptable if it:
- Has early returns for non-tenant requests
- Doesn't import TENANT models at module level
- Only accesses tenant tables when in tenant schema

---

## Service Layer Responsibilities

### BillingService (billing/services.py)
**Responsibilities:**
- ✅ Create Stripe customers
- ✅ Create Stripe subscriptions
- ✅ Manage UserSubscription records
- ✅ Track billing cycles
- ✅ Enforce usage limits
- ❌ ~~Create tenants~~ → Delegate to TenantService
- ❌ ~~Create demo buildings~~ → Delegate to TenantService

### TenantService (tenants/services.py)
**Responsibilities:**
- ✅ Create tenant (Client) objects
- ✅ Create domains
- ✅ Run tenant migrations
- ✅ Create demo data (buildings, apartments)
- ✅ Create initial tenant users
- ❌ ~~Create Stripe subscriptions~~ → Leave to BillingService
- ❌ ~~Manage billing cycles~~ → Leave to BillingService

**Coordination:**
```python
# billing/views.py - Webhook handler
def stripe_webhook(request):
    # 1. BillingService creates subscription + Stripe objects
    subscription = BillingService.create_subscription(user, plan)

    # Inside create_subscription:
    # 2. TenantService creates tenant infrastructure
    tenant_service = TenantService()
    tenant, domain = tenant_service.create_tenant_infrastructure(...)

    # 3. BillingService links subscription to tenant
    subscription.tenant_domain = domain.domain
    subscription.save()
```

---

## Testing Architectural Boundaries

### Verify No Violations

```bash
# Check for TENANT imports in SHARED apps (billing, tenants, users)
grep -r "from buildings" billing/ tenants/ users/
grep -r "from financial" billing/ tenants/ users/
grep -r "from apartments" billing/ tenants/ users/

# Should only show:
# - Imports inside schema_context blocks ✅
# - Function-scope imports with try/except ✅
# - Comments (not actual imports) ✅
```

### System Check

```bash
docker compose exec backend python manage.py check --deploy
# Should show no architectural errors
```

---

## Summary

### Key Principles

1. **SHARED apps** = Public schema = SaaS platform management
2. **TENANT apps** = Tenant schemas = Per-customer application features
3. **SHARED → TENANT imports** = Only inside `schema_context()` or function scope
4. **Module-level imports** = Only SHARED → SHARED or TENANT → TENANT
5. **billing/** ≠ **financial/** = Completely different payment systems

### When in Doubt

Ask yourself:
1. "Will this table exist in the public schema?"
   - If NO → It's a TENANT app
2. "Does this functionality apply to the SaaS platform or to building management?"
   - SaaS platform → SHARED app
   - Building management → TENANT app
3. "Am I importing a TENANT model in a SHARED app?"
   - If YES → Move import inside `schema_context()` or function scope

---

## Migration Path

When refactoring violations:

1. **Identify the violation:** SHARED app importing TENANT app
2. **Determine context:** Where is the import used?
3. **Move import to correct scope:**
   - Inside `with schema_context()`
   - Inside function with try/except
   - Or refactor to delegate to appropriate service
4. **Test:** Verify `python manage.py check --deploy` passes
5. **Document:** Update this file if adding new patterns

---

*Last updated: 2025-01-22*
*Refactoring: Removed billing → buildings cross-dependency*
