# 🏗️ Σχέδιο Refactoring: Ενιαία Ταυτοποίηση Κτιρίου

## 📋 Περίληψη

**Στόχος**: Δημιουργία ενιαίου συστήματος ταυτοποίησης κτιρίου σε όλη την εφαρμογή (frontend + backend) που εξαλείφει ad-hoc props, selectors και validation errors σχετικά με "no building selected".

**Κύρια Προβλήματα που Επιλύονται**:
1. ❌ Πολλαπλά components περνούν `buildingId` ως prop ad-hoc
2. ❌ Inconsistent validation στο backend (κάποιες views ελέγχουν building, άλλες όχι)
3. ❌ Management commands που σπάνε επειδή δεν υπάρχει building context
4. ❌ Διαφορετικοί τρόποι πρόσβασης: `request.query_params.get('building')`, `request.data.get('building_id')`, props κλπ.

---

## 🎯 ΦΑΣΗ 1: Backend - Κεντρική Ταυτοποίηση & Validation

### 1.1 Canonical Building DTO

**Αρχείο**: `/backend/buildings/dto.py` (ΝΕΟ)

```python
from dataclasses import dataclass
from typing import Optional
from decimal import Decimal


@dataclass
class BuildingDTO:
    """
    Canonical representation του Building για χρήση σε όλο το backend.
    Περιέχει μόνο τα πεδία που χρειάζονται για business logic.
    """
    id: int
    name: str
    apartments_count: int
    manager_id: Optional[int]
    
    # Financial settings
    current_reserve: Decimal
    management_fee_per_apartment: Decimal
    reserve_contribution_per_apartment: Decimal
    heating_system: str
    heating_fixed_percentage: int
    
    # Permissions flags (calculated)
    can_edit: bool = False
    can_delete: bool = False
    can_manage_financials: bool = False
    
    @classmethod
    def from_model(cls, building, user=None):
        """
        Δημιουργεί DTO από Building model με auto-calculation των permissions.
        """
        dto = cls(
            id=building.id,
            name=building.name,
            apartments_count=building.apartments_count,
            manager_id=building.manager_id,
            current_reserve=building.current_reserve,
            management_fee_per_apartment=building.management_fee_per_apartment,
            reserve_contribution_per_apartment=building.reserve_contribution_per_apartment,
            heating_system=building.heating_system,
            heating_fixed_percentage=building.heating_fixed_percentage,
        )
        
        # Calculate permissions if user provided
        if user:
            dto.can_edit = user.is_superuser or user.is_staff or (
                hasattr(user, 'is_manager') and building.manager_id == user.id
            )
            dto.can_delete = user.is_superuser
            dto.can_manage_financials = dto.can_edit
        
        return dto
    
    def to_dict(self):
        """Serialization για JSON responses"""
        return {
            'id': self.id,
            'name': self.name,
            'apartments_count': self.apartments_count,
            'manager_id': self.manager_id,
            'current_reserve': float(self.current_reserve),
            'management_fee_per_apartment': float(self.management_fee_per_apartment),
            'reserve_contribution_per_apartment': float(self.reserve_contribution_per_apartment),
            'heating_system': self.heating_system,
            'heating_fixed_percentage': self.heating_fixed_percentage,
            'permissions': {
                'can_edit': self.can_edit,
                'can_delete': self.can_delete,
                'can_manage_financials': self.can_manage_financials,
            }
        }
```

---

### 1.2 BuildingService - Κεντρική Υπηρεσία

**Αρχείο**: `/backend/buildings/services.py` (ΝΕΟ)

```python
from typing import Optional, List
from django.core.exceptions import PermissionDenied, ValidationError
from .models import Building, BuildingMembership
from .dto import BuildingDTO
from users.models import CustomUser


class BuildingService:
    """
    Κεντρική υπηρεσία για τη διαχείριση building context.
    
    Παρέχει:
    - Validation του building access
    - Resolution του building από request
    - Permissions checking
    - Caching (future improvement)
    """
    
    @staticmethod
    def resolve_building_from_request(request, required: bool = True) -> Optional[BuildingDTO]:
        """
        Κεντρική μέθοδος για resolution του building από request.
        
        Ελέγχει με σειρά προτεραιότητας:
        1. URL path parameter (pk)
        2. Query parameter: ?building=X ή ?building_id=X
        3. Request body: {"building": X} ή {"building_id": X}
        4. User's first available building (fallback)
        
        Args:
            request: Django/DRF request object
            required: Αν True, κάνει raise ValidationError αν δεν βρεθεί building
        
        Returns:
            BuildingDTO ή None
        
        Raises:
            ValidationError: Αν required=True και δεν βρεθεί building
            PermissionDenied: Αν ο user δεν έχει πρόσβαση στο building
        """
        building_id = None
        user = request.user
        
        # 1. Try URL path parameter (for detail views like /buildings/{id}/)
        if hasattr(request, 'resolver_match') and request.resolver_match:
            building_id = request.resolver_match.kwargs.get('pk') or \
                         request.resolver_match.kwargs.get('building_id')
        
        # 2. Try query params
        if not building_id:
            query_params = getattr(request, 'query_params', request.GET)
            building_id = query_params.get('building') or query_params.get('building_id')
        
        # 3. Try request body
        if not building_id and request.method in ['POST', 'PUT', 'PATCH']:
            data = getattr(request, 'data', {})
            building_id = data.get('building') or data.get('building_id')
        
        # 4. Fallback: User's first available building
        if not building_id and not required:
            buildings = BuildingService.get_user_buildings(user)
            if buildings:
                building_id = buildings[0].id
        
        # Validation
        if not building_id:
            if required:
                raise ValidationError({
                    'building': 'Δεν καθορίστηκε κτίριο. Παρακαλώ επιλέξτε κτίριο.'
                })
            return None
        
        # Get building and check permissions
        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            raise ValidationError({
                'building': f'Το κτίριο με ID {building_id} δεν βρέθηκε.'
            })
        
        # Permission check
        if not BuildingService.user_has_access(user, building):
            raise PermissionDenied(
                f'Δεν έχετε δικαίωμα πρόσβασης στο κτίριο "{building.name}".'
            )
        
        return BuildingDTO.from_model(building, user)
    
    @staticmethod
    def user_has_access(user: CustomUser, building: Building) -> bool:
        """
        Ελέγχει αν ο χρήστης έχει πρόσβαση στο συγκεκριμένο κτίριο.
        
        Πρόσβαση έχουν:
        - Superusers & staff
        - Managers του κτιρίου
        - Residents με BuildingMembership
        """
        if not user or not user.is_authenticated:
            return False
        
        if user.is_superuser or user.is_staff:
            return True
        
        # Manager check
        if hasattr(user, 'is_manager') and user.is_manager:
            if building.manager_id == user.id:
                return True
        
        # Resident check
        return BuildingMembership.objects.filter(
            building=building,
            resident=user
        ).exists()
    
    @staticmethod
    def get_user_buildings(user: CustomUser) -> List[BuildingDTO]:
        """
        Επιστρέφει όλα τα κτίρια στα οποία έχει πρόσβαση ο χρήστης.
        """
        if not user or not user.is_authenticated:
            return []
        
        if user.is_superuser or user.is_staff:
            buildings = Building.objects.all().order_by('name')
        elif hasattr(user, 'is_manager') and user.is_manager:
            buildings = Building.objects.filter(manager_id=user.id).order_by('name')
        else:
            buildings = Building.objects.filter(
                buildingmembership__resident=user
            ).distinct().order_by('name')
        
        return [BuildingDTO.from_model(b, user) for b in buildings]
    
    @staticmethod
    def validate_building_access_or_fail(request, building_id: int) -> BuildingDTO:
        """
        Shortcut για validation με exception.
        Χρήση σε views που ΠΑΝΤΑ απαιτούν building.
        """
        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            raise ValidationError({'building': f'Το κτίριο με ID {building_id} δεν βρέθηκε.'})
        
        if not BuildingService.user_has_access(request.user, building):
            raise PermissionDenied(f'Δεν έχετε πρόσβαση στο κτίριο "{building.name}".')
        
        return BuildingDTO.from_model(building, request.user)
```

---

### 1.3 BuildingContextMixin - DRF Mixin για Views

**Αρχείο**: `/backend/buildings/mixins.py` (ΝΕΟ)

```python
from rest_framework.exceptions import ValidationError
from .services import BuildingService
from .dto import BuildingDTO


class BuildingContextMixin:
    """
    Mixin για DRF ViewSets που χρειάζονται building context.
    
    Χρήση:
        class ExpenseViewSet(BuildingContextMixin, viewsets.ModelViewSet):
            building_required = True  # Default: True
            
            def list(self, request):
                building = self.get_building_context()
                # ... use building ...
    """
    
    building_required = True  # Override στο ViewSet αν χρειάζεται
    
    def get_building_context(self) -> BuildingDTO:
        """
        Επιστρέφει το BuildingDTO για το τρέχον request.
        Cached στο request για performance.
        """
        if not hasattr(self.request, '_building_context'):
            self.request._building_context = BuildingService.resolve_building_from_request(
                self.request,
                required=self.building_required
            )
        return self.request._building_context
    
    def get_queryset(self):
        """
        Override του default get_queryset για auto-filtering με building.
        """
        queryset = super().get_queryset()
        
        # Αν το model έχει building field, φιλτράρουμε αυτόματα
        if hasattr(queryset.model, 'building'):
            building = self.get_building_context()
            if building:
                queryset = queryset.filter(building_id=building.id)
        
        return queryset
```

---

### 1.4 Ενημέρωση Serializers

**Αρχείο**: `/backend/buildings/serializers.py`

Προσθήκη BuildingContextSerializer:

```python
class BuildingContextSerializer(serializers.Serializer):
    """
    Serializer για το BuildingDTO που επιστρέφεται στο frontend.
    """
    id = serializers.IntegerField()
    name = serializers.CharField()
    apartments_count = serializers.IntegerField()
    manager_id = serializers.IntegerField(allow_null=True)
    current_reserve = serializers.DecimalField(max_digits=10, decimal_places=2)
    management_fee_per_apartment = serializers.DecimalField(max_digits=8, decimal_places=2)
    reserve_contribution_per_apartment = serializers.DecimalField(max_digits=6, decimal_places=2)
    heating_system = serializers.CharField()
    heating_fixed_percentage = serializers.IntegerField()
    permissions = serializers.DictField()
```

---

### 1.5 API Endpoint για Building Context

**Αρχείο**: `/backend/buildings/views.py`

Προσθήκη action στο BuildingViewSet:

```python
from .services import BuildingService
from .serializers import BuildingContextSerializer

class BuildingViewSet(viewsets.ModelViewSet):
    # ... existing code ...
    
    @action(detail=False, methods=['get'], url_path='current-context')
    def get_current_context(self, request):
        """
        Επιστρέφει το τρέχον building context με permissions.
        
        Query params:
        - building_id (optional): Συγκεκριμένο building
        - Χωρίς param: Πρώτο available building του user
        
        Returns:
            BuildingDTO με permissions
        """
        building = BuildingService.resolve_building_from_request(
            request,
            required=False
        )
        
        if not building:
            return Response({
                'error': 'Δεν βρέθηκε κτίριο. Παρακαλώ επιλέξτε κτίριο.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = BuildingContextSerializer(building.to_dict())
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='my-buildings')
    def get_my_buildings(self, request):
        """
        Επιστρέφει όλα τα κτίρια του χρήστη με permissions.
        """
        buildings = BuildingService.get_user_buildings(request.user)
        data = [b.to_dict() for b in buildings]
        return Response(data)
```

---

### 1.6 Middleware για Request-level Building Context (Προαιρετικό)

**Αρχείο**: `/backend/buildings/middleware.py` (ΝΕΟ - OPTIONAL)

```python
from .services import BuildingService


class BuildingContextMiddleware:
    """
    Middleware που προσθέτει building context στο request.
    
    ΠΡΟΣΟΧΗ: Αυτό είναι optional και μπορεί να επηρεάσει performance.
    Χρησιμοποιήστε το μόνο αν θέλετε global building context.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Pre-resolve building για το request (non-required)
        if request.user.is_authenticated:
            try:
                request.building_context = BuildingService.resolve_building_from_request(
                    request,
                    required=False
                )
            except Exception:
                request.building_context = None
        else:
            request.building_context = None
        
        response = self.get_response(request)
        return response
```

---

### 1.7 Ενημέρωση Existing Views

**Αρχεία που χρειάζονται refactoring**:

1. `/backend/financial/views.py`
2. `/backend/financial/views_payment.py`
3. `/backend/projects/views.py`
4. `/backend/maintenance/views.py`
5. `/backend/notifications/views.py`

**Παράδειγμα refactoring (ExpenseViewSet)**:

```python
# ΠΡΙΝ
class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('building', 'supplier').all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, ExpensePermission]
    
    def get_queryset(self):
        building_id = self.request.query_params.get('building')
        if building_id:
            return self.queryset.filter(building_id=building_id)
        return self.queryset

# ΜΕΤΑ
from buildings.mixins import BuildingContextMixin

class ExpenseViewSet(BuildingContextMixin, viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('building', 'supplier').all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, ExpensePermission]
    building_required = True  # Expenses ΠΑΝΤΑ χρειάζονται building
    
    # get_queryset() κληρονομείται αυτόματα από το mixin
    
    def create(self, request, *args, **kwargs):
        building = self.get_building_context()
        # Χρήση του building.id για validation κλπ
        return super().create(request, *args, **kwargs)
```

---

### 1.8 Management Commands Update

**Στρατηγική**:

Όλα τα management commands που χρειάζονται building πρέπει να:
1. Δέχονται `--building` ή `--building-id` argument
2. Χρησιμοποιούν BuildingService για validation

**Παράδειγμα**:

```python
from django.core.management.base import BaseCommand
from buildings.services import BuildingService
from buildings.models import Building


class Command(BaseCommand):
    help = 'Create management fees for a building'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--building',
            type=int,
            required=True,
            help='Building ID'
        )
    
    def handle(self, *args, **options):
        building_id = options['building']
        
        # Validation through service (without request, use direct model check)
        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Building with ID {building_id} not found')
            )
            return
        
        # Business logic με το building object
        self.stdout.write(
            self.style.SUCCESS(f'Processing building: {building.name}')
        )
        # ...
```

---

## 🎨 ΦΑΣΗ 2: Frontend - BuildingContext Refactoring

### 2.1 Enhanced BuildingContext

**Αρχείο**: `/public-app/src/components/contexts/BuildingContext.tsx`

**Αλλαγές**:

```typescript
interface BuildingContextType {
  // Existing
  buildings: Building[];
  currentBuilding: Building | null;
  selectedBuilding: Building | null;
  setCurrentBuilding: (building: Building | null) => void;
  setSelectedBuilding: (building: Building | null) => void;
  setBuildings: React.Dispatch<React.SetStateAction<Building[]>>;
  refreshBuildings: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  
  // ✨ ΝΕΑ
  buildingContext: BuildingContext | null;  // Full DTO από backend
  permissions: BuildingPermissions | null;  // Extracted permissions
  refreshBuildingContext: () => Promise<void>;
}

interface BuildingContext {
  id: number;
  name: string;
  apartments_count: number;
  manager_id: number | null;
  current_reserve: number;
  management_fee_per_apartment: number;
  reserve_contribution_per_apartment: number;
  heating_system: string;
  heating_fixed_percentage: number;
  permissions: BuildingPermissions;
}

interface BuildingPermissions {
  can_edit: boolean;
  can_delete: boolean;
  can_manage_financials: boolean;
}
```

**Implementation**:

```typescript
export const BuildingProvider = ({ children }: { children: ReactNode }) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [currentBuilding, setCurrentBuilding] = useState<Building | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [buildingContext, setBuildingContext] = useState<BuildingContext | null>(null);
  const [permissions, setPermissions] = useState<BuildingPermissions | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { isLoading: authLoading, user } = useAuth();

  // Fetch building context from new API endpoint
  const fetchBuildingContext = useCallback(async (buildingId: number) => {
    try {
      const response = await api.get(`/buildings/current-context/?building_id=${buildingId}`);
      const data = response.data;
      setBuildingContext(data);
      setPermissions(data.permissions);
      console.log('[BuildingContext] Loaded building context:', data);
    } catch (err) {
      console.error('[BuildingContext] Failed to load building context:', err);
      setBuildingContext(null);
      setPermissions(null);
    }
  }, []);

  const refreshBuildingContext = useCallback(async () => {
    if (selectedBuilding?.id) {
      await fetchBuildingContext(selectedBuilding.id);
    }
  }, [selectedBuilding?.id, fetchBuildingContext]);

  // Auto-fetch context when selectedBuilding changes
  useEffect(() => {
    if (selectedBuilding?.id) {
      fetchBuildingContext(selectedBuilding.id);
    } else {
      setBuildingContext(null);
      setPermissions(null);
    }
  }, [selectedBuilding?.id, fetchBuildingContext]);

  // ... rest of existing code ...

  const contextValue = React.useMemo(
    () => ({
      buildings,
      currentBuilding,
      selectedBuilding,
      setCurrentBuilding: setCurrentBuildingWithStorage,
      setSelectedBuilding: setSelectedBuildingWithStorage,
      setBuildings,
      refreshBuildings,
      buildingContext,
      permissions,
      refreshBuildingContext,
      isLoading,
      error,
    }),
    [
      buildings,
      currentBuilding,
      selectedBuilding,
      buildingContext,
      permissions,
      setCurrentBuildingWithStorage,
      setSelectedBuildingWithStorage,
      setBuildings,
      refreshBuildings,
      refreshBuildingContext,
      isLoading,
      error
    ]
  );

  return (
    <BuildingContext.Provider value={contextValue}>
      {children}
    </BuildingContext.Provider>
  );
};
```

---

### 2.2 Refactoring Components

**Στόχος**: Όλα τα components να τραβούν building από context, ΟΧΙ από props.

#### 2.2.1 Παράδειγμα: FinancialPage

**ΠΡΙΝ**:
```typescript
// /public-app/src/app/(dashboard)/financial/page.tsx
export default function Financial() {
  const searchParams = useSearchParams();
  const buildingId = searchParams.get('building');
  // ... pass buildingId as prop ...
  return <FinancialPage buildingId={buildingId} />;
}
```

**ΜΕΤΑ**:
```typescript
// /public-app/src/app/(dashboard)/financial/page.tsx
export default function Financial() {
  const { selectedBuilding, buildingContext, permissions, isLoading } = useBuilding();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!selectedBuilding) {
    return <NoBuildingSelected />;
  }
  
  // ΟΛΑ τα δεδομένα από context
  return (
    <FinancialPage 
      building={selectedBuilding}
      context={buildingContext}
      permissions={permissions}
    />
  );
}
```

#### 2.2.2 Components που χρειάζονται refactoring

**Priority 1 (Κύρια μενού)**:
1. `/public-app/src/app/(dashboard)/financial/page.tsx`
2. `/public-app/src/components/financial/FinancialPage.tsx`
3. `/public-app/src/components/financial/calculator/`
4. `/public-app/src/app/(dashboard)/maintenance/page.tsx`
5. `/public-app/src/app/(dashboard)/projects/page.tsx`

**Priority 2 (Modals & Widgets)**:
6. `/public-app/src/components/financial/CommonExpenseModal.tsx`
7. `/public-app/src/components/financial/PaymentNotificationModal.tsx`
8. `/public-app/src/app/kiosk-display/page.tsx`
9. `/public-app/src/components/dashboard/`

**Priority 3 (Charts & Reports)**:
10. `/public-app/src/components/financial/charts/`
11. Όλα τα components στο `/public-app/src/components/financial/calculator/tabs/`

---

### 2.3 Validation Helper (Frontend)

**Αρχείο**: `/public-app/src/lib/buildingValidation.ts` (ΝΕΟ)

```typescript
import type { Building } from '@/lib/api';
import type { BuildingPermissions } from '@/components/contexts/BuildingContext';

export class BuildingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BuildingValidationError';
  }
}

export const validateBuildingAccess = (
  building: Building | null,
  action: 'view' | 'edit' | 'delete' | 'manage_financials',
  permissions?: BuildingPermissions | null
): void => {
  if (!building) {
    throw new BuildingValidationError('Δεν έχει επιλεγεί κτίριο. Παρακαλώ επιλέξτε ένα κτίριο.');
  }

  if (!permissions) {
    // Fallback: Allow view, deny everything else
    if (action !== 'view') {
      throw new BuildingValidationError('Δεν έχετε δικαίωμα για αυτή την ενέργεια.');
    }
    return;
  }

  switch (action) {
    case 'edit':
      if (!permissions.can_edit) {
        throw new BuildingValidationError('Δεν έχετε δικαίωμα επεξεργασίας αυτού του κτιρίου.');
      }
      break;
    case 'delete':
      if (!permissions.can_delete) {
        throw new BuildingValidationError('Δεν έχετε δικαίωμα διαγραφής αυτού του κτιρίου.');
      }
      break;
    case 'manage_financials':
      if (!permissions.can_manage_financials) {
        throw new BuildingValidationError('Δεν έχετε δικαίωμα διαχείρισης των οικονομικών του κτιρίου.');
      }
      break;
    case 'view':
      // Always allowed if building exists
      break;
  }
};

export const useBuildingValidation = () => {
  const { selectedBuilding, permissions } = useBuilding();

  const validateAction = useCallback(
    (action: 'view' | 'edit' | 'delete' | 'manage_financials') => {
      try {
        validateBuildingAccess(selectedBuilding, action, permissions);
        return true;
      } catch (error) {
        if (error instanceof BuildingValidationError) {
          toast.error(error.message);
        }
        return false;
      }
    },
    [selectedBuilding, permissions]
  );

  return { validateAction };
};
```

---

### 2.4 API Client Update

**Αρχείο**: `/public-app/src/lib/api.ts`

Προσθήκη:

```typescript
export interface BuildingContext {
  id: number;
  name: string;
  apartments_count: number;
  manager_id: number | null;
  current_reserve: number;
  management_fee_per_apartment: number;
  reserve_contribution_per_apartment: number;
  heating_system: string;
  heating_fixed_percentage: number;
  permissions: {
    can_edit: boolean;
    can_delete: boolean;
    can_manage_financials: boolean;
  };
}

export const fetchBuildingContext = async (buildingId?: number): Promise<BuildingContext> => {
  const url = buildingId 
    ? `/buildings/current-context/?building_id=${buildingId}`
    : '/buildings/current-context/';
  const response = await api.get<BuildingContext>(url);
  return response.data;
};

export const fetchMyBuildings = async (): Promise<BuildingContext[]> => {
  const response = await api.get<BuildingContext[]>('/buildings/my-buildings/');
  return response.data;
};
```

---

## 📊 ΦΑΣΗ 3: Migration Strategy

### 3.1 Σειρά Υλοποίησης

**Week 1: Backend Foundation**
- [ ] Day 1-2: Δημιουργία BuildingDTO, BuildingService
- [ ] Day 3: Δημιουργία BuildingContextMixin
- [ ] Day 4: API endpoints (current-context, my-buildings)
- [ ] Day 5: Tests για BuildingService

**Week 2: Backend Integration**
- [ ] Day 1-2: Refactor ExpenseViewSet, PaymentViewSet
- [ ] Day 3: Refactor ProjectViewSet, MaintenanceViewSet
- [ ] Day 4: Update management commands
- [ ] Day 5: Integration tests

**Week 3: Frontend Foundation**
- [ ] Day 1-2: Enhanced BuildingContext
- [ ] Day 3: Validation helpers
- [ ] Day 4: API client updates
- [ ] Day 5: Tests για context

**Week 4: Frontend Integration**
- [ ] Day 1-2: Refactor FinancialPage, calculators
- [ ] Day 3: Refactor modals (CommonExpenseModal, PaymentNotificationModal)
- [ ] Day 4: Refactor kiosk-display
- [ ] Day 5: End-to-end tests

**Week 5: Cleanup & Documentation**
- [ ] Day 1-2: Remove deprecated code
- [ ] Day 3: Performance optimization
- [ ] Day 4: Documentation
- [ ] Day 5: Final QA & deployment

---

### 3.2 Backward Compatibility

**Κατά τη μετάβαση**:

1. **Dual Support**: Τα views να υποστηρίζουν και το παλιό και το νέο σύστημα για 1 sprint
2. **Deprecation Warnings**: Console warnings στο frontend όταν χρησιμοποιούνται παλιά patterns
3. **Gradual Rollout**: Ένα feature κάθε φορά (π.χ. πρώτα Financial, μετά Maintenance κλπ)

---

### 3.3 Testing Strategy

**Backend Tests**:

```python
# /backend/buildings/tests/test_building_service.py
from django.test import TestCase, RequestFactory
from buildings.services import BuildingService
from buildings.models import Building
from users.models import CustomUser

class BuildingServiceTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = CustomUser.objects.create_user(
            email='test@example.com',
            password='test123'
        )
        self.building = Building.objects.create(
            name='Test Building',
            address='123 Test St',
            apartments_count=10,
            manager_id=self.user.id
        )
    
    def test_resolve_building_from_query_params(self):
        request = self.factory.get(f'/?building={self.building.id}')
        request.user = self.user
        
        building_dto = BuildingService.resolve_building_from_request(request)
        
        self.assertEqual(building_dto.id, self.building.id)
        self.assertEqual(building_dto.name, 'Test Building')
        self.assertTrue(building_dto.can_edit)
    
    def test_resolve_building_without_permission(self):
        other_user = CustomUser.objects.create_user(
            email='other@example.com',
            password='test123'
        )
        request = self.factory.get(f'/?building={self.building.id}')
        request.user = other_user
        
        with self.assertRaises(PermissionDenied):
            BuildingService.resolve_building_from_request(request)
    
    def test_resolve_building_required_but_missing(self):
        request = self.factory.get('/')
        request.user = self.user
        
        with self.assertRaises(ValidationError):
            BuildingService.resolve_building_from_request(request, required=True)
```

**Frontend Tests**:

```typescript
// /public-app/src/components/contexts/__tests__/BuildingContext.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { BuildingProvider, useBuilding } from '../BuildingContext';
import { AuthProvider } from '../AuthContext';

describe('BuildingContext', () => {
  it('should load building context when building is selected', async () => {
    const { result } = renderHook(() => useBuilding(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <BuildingProvider>{children}</BuildingProvider>
        </AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSelectedBuilding({ id: 1, name: 'Test Building', /* ... */ });
    });

    await waitFor(() => {
      expect(result.current.buildingContext).not.toBeNull();
      expect(result.current.permissions).not.toBeNull();
    });
  });
});
```

---

## 🚨 Κρίσιμα Σημεία Προσοχής

### ❌ Πιθανά Προβλήματα

1. **Performance**: Το BuildingService.resolve_building_from_request() καλείται πολλές φορές
   - **Λύση**: Caching στο request object (`request._building_context`)

2. **Race Conditions**: Στο frontend, πολλαπλά components μπορεί να ζητούν building context ταυτόχρονα
   - **Λύση**: Single source of truth στο context με useEffect dependencies

3. **Kiosk Mode**: Το kiosk display δεν έχει authentication
   - **Λύση**: Ξεχωριστό endpoint `/buildings/public-context/` για kiosk

4. **Management Commands**: Δεν έχουν request object
   - **Λύση**: Direct model access + manual validation

---

## ✅ Success Criteria

### Backend
- [ ] Όλα τα ViewSets χρησιμοποιούν BuildingContextMixin
- [ ] Κανένα `request.query_params.get('building')` ad-hoc
- [ ] Όλα τα management commands δέχονται `--building` argument
- [ ] 100% test coverage για BuildingService

### Frontend
- [ ] Κανένα component δεν παίρνει `buildingId` ως prop
- [ ] Όλα τα components χρησιμοποιούν `useBuilding()`
- [ ] Permissions checking σε όλα τα actions
- [ ] Zero "no building selected" errors στα logs

### UX
- [ ] Smooth building switching (no page reload)
- [ ] Clear error messages όταν λείπει building
- [ ] Permissions-based UI (hide/disable buttons based on permissions)

---

## 📚 Documentation

### For Developers

**Νέο Pattern για Backend Views**:
```python
from buildings.mixins import BuildingContextMixin

class MyViewSet(BuildingContextMixin, viewsets.ModelViewSet):
    building_required = True
    
    def my_action(self, request):
        building = self.get_building_context()
        # Use building.id, building.name, building.permissions etc.
```

**Νέο Pattern για Frontend Components**:
```typescript
const MyComponent = () => {
  const { selectedBuilding, buildingContext, permissions } = useBuilding();
  const { validateAction } = useBuildingValidation();
  
  const handleEdit = () => {
    if (!validateAction('edit')) return;
    // Proceed with edit
  };
  
  return (
    <>
      {permissions?.can_edit && (
        <button onClick={handleEdit}>Edit</button>
      )}
    </>
  );
};
```

---

## 🎯 Τελικός Στόχος

Μετά το refactoring:

✅ **Backend**: Κάθε view/serializer/command έχει **ένα σημείο** για building resolution και validation (BuildingService)

✅ **Frontend**: Κάθε component τραβάει building από **ένα context** (BuildingContext)

✅ **Permissions**: Κάθε action ελέγχεται μέσω **ενιαίου συστήματος** (BuildingDTO.permissions)

✅ **No More Ad-hoc**: Zero ad-hoc props, zero manual validation, zero "no building selected" errors

---

## 📞 Support & Questions

Για οποιαδήποτε απορία κατά την υλοποίηση:
- Backend: Αναφορά στο BuildingService documentation
- Frontend: Αναφορά στο BuildingContext documentation
- Testing: Παραδείγματα στο `/tests/` directory

---

**Ημερομηνία Δημιουργίας**: 2025-11-19
**Έκδοση**: 1.0
**Status**: 📋 Ready for Implementation

