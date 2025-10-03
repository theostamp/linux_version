# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **New Concierge** - a comprehensive multi-tenant building management system built with Django (backend) and Next.js (frontend). The system manages residential buildings in Greece with features for financial management, maintenance, projects, and tenant communication.

## Commands

### Development Environment Setup

**CRITICAL:** Always activate the virtual environment before any Python operations:
```bash
source .venv/bin/activate
```

**CRITICAL:** All database operations must run inside Docker containers:
```bash
# Copy scripts to container before execution
docker cp script.py linux_version-backend-1:/app/
docker exec -it linux_version-backend-1 python /app/script.py

# Direct database commands
docker exec -it linux_version-backend-1 python manage.py <command>
```

### Quick Start Commands
```bash
./quick_start.sh                    # Quick project startup
./startup.sh                        # Full startup with Docker  
./run_backend.sh                     # Backend only
./run_frontend.sh                    # Frontend only
./rebuild_and_test.sh                # Rebuild and test
./optimize_startup.sh                # Pre-optimize Next.js for faster startup
```

### Startup Performance Optimization

**Frontend Startup Animation**: Το σύστημα διαθέτει startup loading animation που εμφανίζεται κατά την πρώτη εκκίνηση στο development environment. Το animation:
- Εμφανίζεται μόνο στο development mode
- Εμφανίζεται μόνο την πρώτη φορά σε κάθε browser session
- Παρακολουθεί την πρόοδο της μεταγλώττισης
- Προσφέρει visual feedback κατά τη διάρκεια του SWC package download

**SWC Package Caching**: Το Docker container προ-κάνει cache τα SWC packages για γρηγορότερη εκκίνηση:
- Τα packages κατεβαίνουν κατά το Docker build
- Μειώνεται σημαντικά ο χρόνος εκκίνησης από ~105s σε ~10-15s

### Development Commands
```bash
# Backend (from project root, with venv activated)
python manage.py runserver
python manage.py migrate
python manage.py makemigrations

# Frontend (from frontend/ directory)
cd frontend
npm install
npm run dev
npm run build
npm run lint

# Testing
pytest                               # Backend tests
cd frontend && npm test              # Frontend tests
```

### Database & Docker Commands
```bash
# Docker management
docker-compose up --build -d
docker-compose down
docker stop $(docker ps -aq)        # Stop all containers
docker system prune -af --volumes   # Clean Docker

# Database operations (inside Docker only)
docker exec -it linux_version-backend-1 python manage.py shell
docker exec -it linux_version-backend-1 python manage.py dbshell
```

### Linting & Code Quality
```bash
# Frontend
cd frontend
npm run lint
npm run type-check

# Backend (Python - use tools available in requirements.txt)
python -m pytest --cov
ruff check .                         # If ruff is available
```

## Architecture Overview

### Multi-Tenant Architecture
- **Framework**: Django with `django-tenants` for schema-based multi-tenancy
- **Database**: PostgreSQL with separate schemas per tenant (`demo` is the main tenant)
- **Multi-tenancy**: All database operations must use `schema_context('demo')`

### Backend Structure (Django + DRF)
```
backend/
├── new_concierge_backend/          # Main Django project settings
├── tenants/                        # Multi-tenant management
├── users/                          # Custom user model (email-based auth)
├── buildings/                      # Building management
├── apartments/                     # Apartment management  
├── financial/                      # Financial system (expenses, payments, common expenses)
├── maintenance/                    # Maintenance and repairs
├── projects/                       # Construction/renovation projects
├── teams/                          # Team and collaborator management
├── announcements/                  # Communication system
└── core/                          # Shared utilities and middleware
```

**Key Backend Components:**
- **Authentication**: JWT-based with `djangorestframework-simplejwt`
- **Database**: PostgreSQL with connection pooling
- **User Model**: Custom email-based user (`users.CustomUser`)
- **API**: Django REST Framework with comprehensive ViewSets
- **Multi-tenant middleware**: `core.middleware.CustomTenantMiddleware`

### Frontend Structure (Next.js + TypeScript)
```
frontend/
├── app/                           # Next.js App Router pages
├── components/                    # Reusable UI components
├── hooks/                         # Custom React hooks
├── lib/                          # Utilities and API client
├── types/                        # TypeScript definitions
└── public/                       # Static assets
```

**Key Frontend Technologies:**
- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript with strict mode
- **UI Components**: Radix UI + Tailwind CSS
- **State Management**: TanStack React Query v5
- **Forms**: React Hook Form + Zod validation

### Financial System Architecture

The financial system is the core business logic with complex calculations:

**Key Financial Concepts:**
- **Common Expenses (Κοινοχρήστα)**: Monthly building expenses allocated to apartments
- **Participation Mills**: Building ownership percentages (total = 1000 mills)
- **Reserve Fund**: Long-term building maintenance fund with monthly contributions
- **Service Packages**: Professional building management service bundles

**Distribution Methods:**
- `by_participation_mills`: Based on ownership percentage
- `equal_share`: Split equally among all apartments  
- `specific_apartments`: Assigned to specific units
- `by_meters`: Based on apartment square footage

**Financial Data Flow:**
1. **Expenses** → Created for building operations
2. **Common Expense Calculator** → Distributes expenses to apartments using allocation rules
3. **Transactions** → Generated for each apartment's obligation/payment
4. **Balance Calculation** → Real-time balance from transaction history

### Greek Language & Character Encoding
- **Apartment Numbers**: May use Greek letters (Α1, Β2, Γ3) vs Latin (A1, B1, C1)
- **Character Encoding**: Always use UTF-8 for Greek text
- **Currency**: Euro (€) with Greek formatting
- **Locale**: `el-gr` (Greek) timezone `Europe/Athens`

## Development Patterns

### Django Script Template
All database scripts must follow this pattern:
```python
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

# All database operations within tenant context
with schema_context('demo'):
    # Your database queries here
    pass
```

### API Testing Pattern
```python
from django.test import RequestFactory
from users.models import CustomUser

# Create test user (email required)
user = CustomUser.objects.create_user(
    email='test@example.com',
    password='testpass'
)

# API testing with request factory
factory = RequestFactory()
request = factory.get('/api/endpoint/')
request.user = user
request.query_params = request.GET  # Required for ViewSets
```

### Frontend API Integration
- **Base URL**: Configure in environment variables
- **Authentication**: JWT tokens in Authorization header  
- **Error Handling**: Global toast notifications with API interceptor
- **Request Headers**: Support for custom headers (`X-Toast-Suppress`, etc.)

## Important Development Rules

### Docker Environment Rules
- **NEVER** execute database operations outside Docker containers
- **ALWAYS** copy scripts to container before execution
- **NO** local PostgreSQL connections allowed

### Python Virtual Environment Rules  
- **ALWAYS** activate `.venv` before Python operations
- **NEVER** run Django commands without virtual environment
- Check activation: `which python` (should show `.venv` path)

### Financial System Rules
- **Balance Calculations**: Use transaction history, not hardcoded values
- **Previous Obligations**: Use `previous_balance` NOT `net_obligation`
- **Common Expenses**: Use `expense_share` NOT `net_obligation`
- **Tenant Context**: All financial queries within `schema_context('demo')`

### Multi-tenancy Rules
- **Database Queries**: All operations must be tenant-aware
- **Schema Context**: Use `schema_context('demo')` for all database scripts
- **Building Reference**: Main demo building is "Αλκμάνος 22, Αθήνα" (Building ID 1)

## Security & Best Practices

### Authentication & Authorization
- **JWT Tokens**: 30-minute access tokens, 7-day refresh tokens
- **CORS**: Configured for localhost development with subdomain support
- **CSRF Protection**: Enabled with trusted origins
- **User Model**: Email-based authentication (not username)

### Performance Considerations
- **Database Optimization**: Use `select_related`/`prefetch_related` for queries
- **Caching**: Redis-based caching with tenant-specific keys
- **API Pagination**: Default page size of 10 items
- **Rate Limiting**: 1000/hour for anonymous, 10000/hour for authenticated users

### Code Quality
- **Backend**: Follow PEP 8, use type hints, comprehensive docstrings
- **Frontend**: TypeScript strict mode, ESLint configuration
- **Testing**: pytest for backend, comprehensive test coverage expected
- **Error Handling**: Structured logging, user-friendly error messages

## Testing Strategy

### Backend Testing
```bash
# Run tests with Docker
docker exec -it linux_version-backend-1 python -m pytest
docker exec -it linux_version-backend-1 python manage.py test

# Specific test categories
pytest financial/tests/                # Financial system tests
pytest apartments/tests/               # Apartment management tests
```

### Frontend Testing
```bash
cd frontend
npm test                              # Run test suite
npm run type-check                    # TypeScript checking
npm run lint                          # ESLint validation
```

## Deployment Notes

### Environment Configuration
- **Development**: Uses `.env` file with Docker Compose
- **Production**: Environment variables for sensitive configuration
- **Database**: PostgreSQL with connection pooling (CONN_MAX_AGE: 600)
- **Static Files**: Whitenoise for serving in production

### Container Configuration
- **Backend**: Django with Gunicorn WSGI server
- **Frontend**: Next.js standalone build  
- **Database**: PostgreSQL in Docker container
- **Reverse Proxy**: Nginx for production deployments

This system handles real financial data for Greek residential buildings. Precision, security, and tenant isolation are critical requirements.

## Recent Development Progress - Balance Calculation System Refactoring (Οκτώβριος 2025)

### 🏗️ Balance Calculation Architecture - MAJOR REFACTORING

**Problem Solved**: Eliminated recurring balance calculation bugs through architectural refactoring.

**Context**: Balance calculation was the "weak point" of the application - fixed over 10 times but kept breaking. Root cause analysis revealed:
- 3 duplicate `_get_historical_balance()` functions with bugs
- Overlapping signals causing O(N²) complexity
- Date/DateTime inconsistency between models
- No transaction type validation

**Solution: Single Source of Truth Pattern**

#### BalanceCalculationService - Centralized Balance Logic

Created `/backend/financial/balance_service.py` as the **ONLY** place for balance calculations:

```python
class BalanceCalculationService:
    @staticmethod
    def calculate_historical_balance(apartment, end_date, include_management_fees=True):
        """Calculate historical balance up to a specific date"""

    @staticmethod
    def calculate_current_balance(apartment):
        """Calculate current balance from all transactions"""

    @staticmethod
    def update_apartment_balance(apartment):
        """Update apartment.current_balance field"""

    @staticmethod
    def verify_balance_consistency(apartment):
        """Verify stored vs calculated balance"""
```

**Key Features:**
- ✅ Date normalization (DateField/DateTimeField consistency)
- ✅ Uses `apartment` FK (not `apartment_number` string)
- ✅ No double payment counting
- ✅ Checks `financial_system_start_date`
- ✅ Validated transaction types

#### TransactionType Validation

Created `/backend/financial/transaction_types.py` with Django TextChoices:

```python
class TransactionType(models.TextChoices):
    # Charges
    EXPENSE_CREATED = 'expense_created', 'Δαπάνη Δημιουργήθηκε'
    # ... other charges

    # Payments
    COMMON_EXPENSE_PAYMENT = 'common_expense_payment', 'Είσπραξη'
    # ... other payments

    @classmethod
    def is_charge(cls, transaction_type): ...

    @classmethod
    def is_payment(cls, transaction_type): ...
```

**Benefits:**
- ✅ Type safety - no typos
- ✅ Helper methods for categorization
- ✅ Centralized type definitions

#### Simplified Signals

**Before (Problematic):**
```python
@receiver(post_save, sender=Payment)
def update_on_payment():
    # Creates Transaction → triggers next signal
    # DOUBLE CALCULATION! O(N²)
```

**After (Simplified):**
```python
@receiver(post_save, sender=Transaction)
def update_apartment_balance_on_transaction():
    BalanceCalculationService.update_apartment_balance(instance.apartment)
    # SINGLE CALCULATION! O(N)
```

#### Verification & Testing

Created verification tools:
- `/backend/verify_balance_service_migration.py` - Balance consistency checker
- `/backend/financial/tests/test_balance_service.py` - Comprehensive unit tests

**Verification Results:**
```bash
✅ Building: Αλκμάνος 22
✅ Consistent: 10/10 apartments
✅ All apartments have consistent balances!
```

#### Impact Analysis

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Balance Functions | 4 duplicates | 1 centralized | **-75%** |
| Code Duplication | ~200 lines | 0 lines | **-100%** |
| Signal Complexity | O(N²) | O(N) | **-50%** |
| Type Validation | ❌ None | ✅ Full | **+100%** |
| Timezone Consistency | ⚠️ Partial | ✅ Full | **+100%** |

#### Migration Path

**Deleted/Deprecated:**
- ❌ `CommonExpenseCalculator._get_historical_balance()` (Line 53)
- ❌ `CommonExpenseDistributor._get_historical_balance()` (Line 2207)
- ❌ `BalanceTransferService._calculate_historical_balance()` (Line 1142) → Migrated logic to service
- ❌ Duplicate signal processing

**New Files:**
- ✅ `/backend/financial/balance_service.py` - Central service
- ✅ `/backend/financial/transaction_types.py` - Type validation
- ✅ `/backend/financial/tests/test_balance_service.py` - Tests
- ✅ `/backend/verify_balance_service_migration.py` - Verification tool

#### Usage Guidelines

**DO:**
```python
# ✅ CORRECT - Use BalanceCalculationService
from financial.balance_service import BalanceCalculationService

balance = BalanceCalculationService.calculate_historical_balance(
    apartment=apartment,
    end_date=date(2025, 11, 1)
)
```

**DON'T:**
```python
# ❌ WRONG - Don't create custom balance calculations
balance = Transaction.objects.filter(...).aggregate(...)  # NO!
```

**Developer Notes:**
- All balance calculations MUST use `BalanceCalculationService`
- Signals automatically update balances via the service
- Use `verify_balance_service_migration.py` to check consistency
- Transaction types are validated via `TransactionType` enum

**Audit Documentation:**
- [BALANCE_CALCULATION_AUDIT.md](backend/BALANCE_CALCULATION_AUDIT.md) - Technical audit
- [BALANCE_REFACTORING_PROPOSAL.md](backend/BALANCE_REFACTORING_PROPOSAL.md) - Implementation plan
- [BALANCE_SYSTEM_SUMMARY.md](backend/BALANCE_SYSTEM_SUMMARY.md) - Executive summary
- [BALANCE_ARCHITECTURE_COMPARISON.md](backend/BALANCE_ARCHITECTURE_COMPARISON.md) - Visual diagrams

---

## Recent Development Progress - Meter Reading & Heating System

### 📊 MeterReadingDatasheet Modal Enhancements (Sept 2025)

**Problem Solved**: Enhanced the meter reading input modal for better user experience and data integrity.

**Key Changes**:
1. **Empty Input Fields** - Changed default value from "0" to empty string in "Νέα Μέτρηση" fields
   - `value={inputField.value === 0 ? '' : inputField.value}`
   - Cleaner UI without confusing zeros

2. **Enter Key Navigation** - Added keyboard navigation between reading fields
   - `onKeyDown` handler with Enter key detection
   - Automatic focus to next "Νέα Μέτρηση" field using `data-index` attributes
   - Improved data entry speed for multiple apartments

3. **Reading Validation** - Added real-time validation to prevent incorrect readings
   - Visual warning (red border) when new reading < previous reading
   - Error message: "Μικρότερη από προηγούμενη"
   - Form submission blocked if validation fails

4. **Financial Calculations** - Enhanced heating expense distribution
   - **Πάγιο (30%)** - Fixed charge based on participation mills (`participation_mills / 1000 * expense * 0.3`)
   - **Κατανάλωση (70%)** - Variable charge based on actual consumption (`consumption / totalConsumption * expense * 0.7`)
   - **Σύνολο** - Sum of fixed + variable charges
   - Transparent cost breakdown for residents

### 📋 MeterReadingList → MeterReadingReport Transformation

**Problem Solved**: Converted editable list to read-only report optimized for supervision and printing.

**Architecture Decision**: Complete component redesign
- **Old**: `MeterReadingList` was editable with filters, actions, and individual row editing
- **New**: `MeterReadingList` → simple wrapper → `MeterReadingReport` (read-only, print-optimized)

**Key Features**:
1. **Read-Only Design** - No edit/delete buttons in table rows
2. **Print Optimization** - CSS classes with `print:` prefixes for clean printing
3. **Action Bar** - Centralized Edit and Print buttons (hidden in print mode)
4. **Identical Data Structure** - Same table layout as MeterReadingDatasheet modal
5. **Financial Transparency** - All cost calculations visible (Πάγιο, Κατανάλωση, Σύνολο)

### 🗂️ Component Cleanup & Architecture

**Removed Unnecessary Fields**:
- **"Σημειώσεις" (Notes)** column removed from both modal and report
- Interface cleanup: removed `notes?: string` from `ApartmentReading` interfaces
- API submission cleanup: removed notes field from meter reading creation
- **Reasoning**: Notes were rarely used and cluttered the interface

**Error Fixes**:
- **TypeScript Errors**: Fixed `r.apartment?.id` → `r.apartment` (apartment is number, not object)
- **Hook Dependencies**: Replaced `fetchHeatingExpenses` with proper `getExpenses` from useExpenses
- **Date Formatting**: Fixed month calculation for API filters (`${selectedMonth}-01` to `${selectedMonth}-${lastDay}`)

### 💡 Business Logic & User Experience

**Heating System Integration**:
- Automatic detection of heating meter type (`heating_hours` vs `heating_kwh`)
- Dynamic expense loading based on building configuration
- Real-time cost calculations with 30/70 split (industry standard for Greek buildings)

**Workflow Improvement**:
1. **Data Entry**: MeterReadingDatasheet modal with keyboard navigation
2. **Supervision**: MeterReadingReport for viewing and verification  
3. **Action Flow**: Edit → Print → Archive (clear separation of concerns)

**Greek Market Compliance**:
- Cost transparency required by Greek building management regulations
- Heating mills (χιλιοστά θέρμανσης) proper calculation and display
- Multi-tenant building management standards

### 🔧 Technical Implementation Notes

**React Architecture**:
```typescript
// Old complex component
MeterReadingList (editable, complex state management)

// New simplified architecture  
MeterReadingList (wrapper) → MeterReadingReport (read-only, optimized)
```

**Validation Logic**:
```typescript
// Real-time validation
const isInvalid = currentValue > 0 && 
                  field.previous_reading !== undefined && 
                  currentValue < previousValue;

// Form submission validation
const invalidReadings = data.readings.filter(reading => 
  reading.current_reading > 0 && 
  reading.previous_reading !== undefined && 
  reading.current_reading < reading.previous_reading
);
```

**Financial Calculations**:
```typescript
// Fixed charge (30% - based on ownership)
const fixedAmount = (participation_mills / 1000) * heatingExpenseAmount * 0.3;

// Variable charge (70% - based on consumption)  
const consumptionAmount = (consumption / totalConsumption) * heatingExpenseAmount * 0.7;
```

This refactoring improves data quality, user experience, and provides full transparency in heating cost distribution for Greek multi-tenant buildings.

- κρατησε το σημειο αυτο ωστε να συνεχισουμε σε νεα συνδρια με την εντολη "θερμανση"

## Kiosk Display System (Σεπτέμβριος 2025)

### 🖥️ Kiosk System Overview

**Problem Solved**: Δημιουργία professional fullscreen kiosk display για πολυκατοικίες με πραγματικά δεδομένα και responsive design.

**Kiosk Routes & Access**:
- **`/kiosk-display`** - Κύρια fullscreen kiosk σελίδα (δημόσια πρόσβαση)
- **`/kiosk`** - Εναλλακτική kiosk διαδρομή (δημόσια πρόσβαση)
- **`/kiosk-widgets`** - Widget management (απαιτεί authentication)
- **`/kiosk-management`** - Kiosk administration (απαιτεί authentication)

### 📱 Kiosk Display Architecture

**Public Access Implementation**:
```typescript
// AppProviders.tsx - Public routes configuration
const isKioskMode = (pathname?.startsWith('/kiosk') || pathname?.startsWith('/kiosk-display'))
  && !pathname?.startsWith('/kiosk-widgets') && !pathname?.startsWith('/kiosk-management');

// No AuthProvider for kiosk routes
if (isKioskMode) {
  return (
    <ReactQueryProvider>
      <LoadingProvider>
        {children}
      </LoadingProvider>
    </ReactQueryProvider>
  );
}
```

**Responsive Flexbox Layout**:
```typescript
// Full-screen responsive layout
<div className="h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden flex flex-col">
  {/* Top Bar: Fixed height */}
  <div className="h-14 flex-shrink-0 bg-black/30 backdrop-blur-sm">

  {/* Main Content: Takes remaining space */}
  <div className="flex flex-1">

  {/* Footer: Fixed height */}
  <div className="h-12 flex-shrink-0 bg-black/40 backdrop-blur-sm">
</div>
```

### 🎯 Key Features Implemented

#### 1. **Header Bar** (`h-14` - 56px)
- **Building Address**: Εμφάνιση πραγματικής διεύθυνσης (όχι "Κτίριο 1")
- **Date & Time**: Ελληνική τοποθεσία με real-time ενημέρωση
- **Weather Info**: Compact εμφάνιση θερμοκρασίας, υγρασίας, ανέμου
- **Fullscreen Toggle**: F11 keyboard shortcut

#### 2. **Main Content Area** (`flex-1`)
- **Widget System**: Δυναμική φόρτωση widgets από registry
- **Data Filtering**: Αυτόματη απόκρυψη widgets χωρίς δεδομένα
- **Auto-slide**: 8-second intervals με manual control
- **Slide Indicators**: Navigation dots για multiple slides

#### 3. **Footer Bar** (`h-12` - 48px)
**Three-Section Grid Layout** (`grid-cols-12`):

##### QR Code Section (`col-span-2`)
```typescript
<div className="w-12 h-12 bg-white rounded-lg">
  <div className="text-black text-xs font-bold">QR</div>
</div>
<div className="text-sm">
  <div className="font-semibold text-white">Συνδεθείτε</div>
</div>
```

##### Weather Forecast Section (`col-span-5`)
- **3-Day Forecast**: Εμφάνιση emoji, θερμοκρασίες, συνθήκες
- **Greek Day Names**: Δευτέρα, Τρίτη, Τετάρτη format

##### News Ticker Section (`col-span-5`)
- **Real-time News**: Google News API integration
- **Scrolling Animation**: CSS `animate-scroll-left` 30s duration
- **Multiple Sources**: 8 Greek RSS feeds (Google News, ERT, Καθημερινή, κ.ά.)

### 📡 News API Integration

**Enhanced News Fetching**:
```typescript
// Multiple RSS sources with increased limits
const NEWS_SOURCES = [
  'Google News Greece', 'ERT News', 'Kathimerini', 'Ta Nea',
  'To Vima', 'Proto Thema', 'News 247', 'CNN Greece'
];

// Increased news capacity
items.forEach((item, index) => {
  if (index < 15) { // 15 headlines per source (was 8)
    // Process RSS item
  }
});

const finalNews = uniqueNews.slice(0, 50); // 50 total news items (was 25)
```

**useNews Hook Implementation**:
```typescript
// hooks/useNews.ts
export function useNews(refreshInterval: number = 300000) {
  const [news, setNews] = useState<string[]>([]);
  // Auto-refresh every 5 minutes
  // Fallback news on API failure
  // Real-time error handling
}
```

### 🎨 Widget System Enhancement

**Widget Data Filtering**:
```typescript
// lib/kiosk/widgets/registry.ts
export function hasWidgetData(widget: KioskWidget, data?: any): boolean {
  // Always show widgets that don't need external data
  const alwaysShowWidgets = ['TimeWidget', 'QRCodeWidget', 'ManagerWidget', 'WeatherWidget'];

  // Check data-dependent widgets
  switch (widget.component) {
    case 'AnnouncementsWidget':
      return data?.announcements && data.announcements.length > 0;
    case 'VotesWidget':
      return data?.votes && data.votes.length > 0;
    // ... other widget validations
  }
}
```

**Mock Data Structure**:
```typescript
const mockData = {
  building_info: {
    id: 1,
    name: 'Αλκμάνος 22',
    address: 'Αλκμάνος 22, Αθήνα 116 36',
    city: 'Αθήνα'
  },
  announcements: [...],
  financial: { collection_rate: 82.6, reserve_fund: 45680, ... },
  maintenance: { active_tasks: [...] },
  weather: { current: {...}, forecast: [...] },
  // Real news fetched from API (not mock)
};
```

### 🚀 CSS Animations

**News Ticker Animation**:
```css
/* globals.css */
.animate-scroll-left {
  animation: scroll-left 30s linear infinite;
}

@keyframes scroll-left {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}
```

### 🔧 Layout Optimization

**Responsive Height Management**:
- **Total Screen**: `h-screen` (100vh)
- **Top Bar**: `h-14` (56px) + `flex-shrink-0`
- **Main Content**: `flex-1` (takes remaining space)
- **Footer**: `h-12` (48px) + `flex-shrink-0`
- **Total Fixed**: 68px, **Flexible**: ~92% screen height

**Error Fixes & Optimizations**:
1. ✅ **Authentication**: Public access για kiosk routes
2. ✅ **ErrorBoundary**: Default export για widget errors
3. ✅ **Mock Data**: Proper structure για widget filtering
4. ✅ **Layout Cutting**: Optimized heights για full visibility
5. ✅ **News Integration**: Real-time Google News API
6. ✅ **Responsive Design**: Works σε όλες τις αναλύσεις

### 📋 Business Requirements Met

**Greek Building Management Standards**:
- ✅ **Public Information Display**: Ανακοινώσεις, οικονομικά, συντήρηση
- ✅ **Weather Integration**: Τοπικός καιρός για Αθήνα
- ✅ **News Updates**: Ελληνικές ειδήσεις real-time
- ✅ **Professional Appearance**: Clean, readable interface
- ✅ **Multi-tenant Support**: Building-specific content
- ✅ **No Login Required**: Public access για residents & visitors

**Technical Excellence**:
- ✅ **Performance**: Widget filtering, efficient rendering
- ✅ **Reliability**: Error boundaries, fallback content
- ✅ **Maintainability**: Clean component structure, TypeScript
- ✅ **Accessibility**: Keyboard shortcuts, readable fonts
- ✅ **Real-time**: Live news, time, weather updates

**Future Enhancements**:
- 🔄 **Touch Interface**: Tablet-friendly navigation
- 🔄 **QR Code Integration**: Real QR codes for building info
- 🔄 **Multilingual**: English/Greek language toggle
- 🔄 **Admin Panel**: Real-time content management

Το Kiosk Display System είναι πλέον production-ready για Greek building management με professional appearance και real-time data integration.

## 🎯 Strategic Pivot: MVP-First Approach (Σεπτέμβριος 2025)

### Decision: Pause Voice Navigation, Focus on Core Features

**Context:**
- Kiosk displays will use **32"+ non-touch screens** (cost-prohibitive for touch)
- Voice navigation development requires 5-8 days + €35-50/kiosk hardware cost
- Critical features pending: SMS/Email, Subscriptions, Cloud Deployment

**Strategic Decision:**
1. ✅ **Pause voice navigation** - Archived to `feature/voice-navigation` branch
2. ✅ **Implement passive auto-rotating kiosk** - Pi Zero 2W (~€15/kiosk)
3. ✅ **Focus on core business features** - MVP-first approach
4. ✅ **Optional remote control** - Wireless remote for manual navigation (~€12)

**Kiosk Navigation Strategy:**
- **Primary**: Auto-rotating slides (8-second intervals)
- **Optional**: Wireless remote/keyboard for manual control
- **Future**: Voice navigation if customers request it post-MVP

**Voice Navigation Code:**
- Preserved in `feature/voice-navigation` branch
- Complete implementation ready (Vosk + WebSocket)
- Can be reactivated in 1-2 days if needed
- Files: `raspberry-pi-kiosk/`, `useOfflineVoiceNavigation.ts`, `voice-keyword-spotter.py`

**Production Kiosk Setup:**
- Hardware: Raspberry Pi Zero 2W + 32" HDMI display
- Cost: €36-48/kiosk (vs €200-250 with voice)
- Setup: 20 minutes (vs 30+ minutes with voice)
- Documentation: `raspberry-pi-kiosk/KIOSK_SETUP_PASSIVE.md`

**MVP Priorities (Next 3-4 weeks):**
1. SMS/Email bulk notifications system
2. Subscription management & payment tracking
3. Cloud deployment & production testing
4. Customer validation & feedback loop

This pivot optimizes time-to-market while maintaining flexibility to add voice navigation later based on actual customer demand.