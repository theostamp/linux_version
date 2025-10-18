# Digital Concierge - Αρχιτεκτονική Συστήματος

## 📋 Περιγραφή

Το Digital Concierge είναι μια πλατφόρμα διαχείρισης κτιρίων και πολυκατοικιών που χρησιμοποιεί **δύο ξεχωριστές frontend εφαρμογές** για διαφορετικούς σκοπούς.

---

## 🏗️ Αρχιτεκτονική Εφαρμογών

### 1️⃣ React App (Create React App) - **Authentication & Subscriptions**

**Τοποθεσία:** `/frontend/src/`
**Port:** `8080`
**Τεχνολογία:** React 18 + React Router + react-scripts

#### Σκοπός
Η React εφαρμογή είναι το **"front door"** του συστήματος. Διαχειρίζεται:
- Αυθεντικοποίηση χρηστών (Authentication)
- OAuth Google Login
- Εγγραφή νέων χρηστών
- Διαχείριση συνδρομών (Subscriptions)
- Πληρωμές μέσω Stripe

#### Κύρια Components
```
/frontend/src/components/
├── LandingPage.jsx          # Landing page
├── RegistrationForm.jsx     # User registration
├── PaymentForm.jsx          # Stripe payments
├── SubscriptionManagement.jsx  # Subscription management
├── Dashboard.jsx            # Basic dashboard (redirects to Next.js)
├── AuthCallback.jsx         # OAuth callback handler
└── OAuthButtons.jsx         # Google OAuth buttons
```

#### Routes
```
/                  → Landing page
/register          → Registration form
/payment           → Payment form
/success           → Payment success page
/dashboard         → Basic dashboard (redirects to Next.js app)
/my-subscription   → Subscription management
/auth/callback     → OAuth callback
```

#### Scripts
```bash
npm start          # Start dev server on port 8080
npm run build      # Build for production
npm test           # Run tests
```

---

### 2️⃣ Next.js App - **Main Application**

**Τοποθεσία:** `/frontend/app/` & `/frontend/components/`
**Port:** `3000`
**Τεχνολογία:** Next.js 15.5.6 + TypeScript + Tailwind CSS

#### Σκοπός
Η Next.js εφαρμογή είναι η **κύρια εφαρμογή** μετά την αυθεντικοποίηση. Περιλαμβάνει όλα τα features διαχείρισης:

#### Features
```
/frontend/app/(dashboard)/
├── financial/           # Οικονομική διαχείριση
├── announcements/       # Ανακοινώσεις
├── votes/              # Ψηφοφορίες
├── requests/           # Αιτήματα κατοίκων
├── buildings/          # Διαχείριση κτιρίων
├── apartments/         # Διαχείριση διαμερισμάτων
├── maintenance/        # Συντήρηση
├── projects/           # Έργα
├── notifications/      # Ειδοποιήσεις
├── calendar/           # Ημερολόγιο
├── chat/              # Chat system
├── collaborators/      # Συνεργάτες
├── suppliers/         # Προμηθευτές
├── teams/             # Ομάδες
├── residents/         # Κάτοικοι
├── my-profile/        # Προφίλ χρήστη
├── my-subscription/   # Συνδρομή
├── kiosk/             # Kiosk mode (για οθόνες υποδοχής)
├── kiosk-management/  # Kiosk management
├── map-visualization/ # Χάρτης κτιρίων
├── data-migration/    # Migration tools
├── system-health/     # System health monitoring
└── financial-tests/   # Financial tests
```

#### Κύρια Components
```
/frontend/components/
├── Sidebar.tsx              # Κύριο sidebar με navigation
├── GlobalHeader.tsx         # Header με user menu
├── LayoutWrapper.tsx        # Main layout wrapper
├── AppProviders.tsx         # React Query & Auth providers
├── IntroWrapper.tsx         # Intro animation
├── financial/
│   └── FinancialPage.tsx   # Πλήρης οικονομική σελίδα
├── contexts/
│   ├── ReactQueryProvider.tsx  # React Query setup
│   └── AuthContext.tsx         # Authentication context
└── ui/                      # Shadcn UI components
    ├── button.tsx
    ├── dialog.tsx
    ├── toast.tsx
    └── ...
```

#### Styling
- **Tailwind CSS** με custom configuration
- **CSS Variables** για θέματα (light/dark mode)
- **Custom colors** βασισμένα στο `#0284C5` (brand color)

#### Scripts
```bash
npm run dev        # Start dev server on port 3000
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Lint code
```

---

## 🔄 User Flow

```
1. Χρήστης επισκέπτεται το site
   ↓
2. React App (port 8080)
   - Landing page
   - Registration/Login
   - OAuth Google
   - Payment/Subscription
   ↓
3. Μετά την αυθεντικοποίηση → Redirect στο Next.js App
   ↓
4. Next.js App (port 3000)
   - Full dashboard
   - Όλα τα features διαχείρισης
   - Financial, Buildings, Maintenance, κτλ.
```

---

## 🔧 Backend

**Τοποθεσία:** `/backend/`
**Port:** `18000` (ή `8000` μέσα σε Docker)
**Τεχνολογία:** Django + PostgreSQL

### API Endpoints
```
http://backend:8000/api/          # Main API
http://backend:8000/admin/        # Django admin
```

---

## 🎨 Design System

### Colors (από globals.css)
```css
--primary: #0284C5              /* Brand blue */
--secondary: Teal-600           /* Teal accent */
--success: Emerald-500          /* Success green */
--warning: Amber-500            /* Warning yellow */
--destructive: Red-500          /* Error red */
```

### Fonts
- **Body:** Open Sans
- **Headings:** Ubuntu Condensed

---

## 📦 Dependencies Overview

### React App
- react
- react-router-dom
- @stripe/react-stripe-js
- axios

### Next.js App
- next
- react
- react-dom
- typescript
- tailwindcss
- framer-motion
- @tanstack/react-query
- @radix-ui/* (UI components)
- lucide-react (icons)
- date-fns
- recharts
- sonner (toast notifications)

---

## 🚀 Deployment

### Development
```bash
# Start all services
docker-compose up

# React App: http://localhost:8080
# Next.js App: http://localhost:3000
# Django Backend: http://localhost:18000
```

### Production
```bash
# Build Next.js
cd frontend && npm run build

# Build React App
cd frontend && npm run build

# Start production
docker-compose -f docker-compose.prod.yml up
```

---

## ✅ Status

| Component | Status | Port | Notes |
|-----------|--------|------|-------|
| React App | ✅ Working | 8080 | Authentication & Subscriptions |
| Next.js App | ✅ Working | 3000 | Main application |
| Django Backend | ✅ Working | 18000 | API server |
| PostgreSQL | ✅ Working | 5432 | Database |

---

## 🔐 Environment Variables

### React App (.env)
```
REACT_APP_API_URL=http://localhost:18000/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Next.js App (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:18000/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 📝 Notes

1. **Δύο ξεχωριστές εφαρμογές**: Η React app διαχειρίζεται την αυθεντικοποίηση, η Next.js την κύρια εφαρμογή
2. **Tailwind CSS**: Ενημερώθηκε για να χρησιμοποιεί CSS variables από το globals.css
3. **Dependencies**: Όλα τα απαραίτητα packages έχουν εγκατασταθεί με `--legacy-peer-deps`
4. **Warnings**: Υπάρχουν μερικά warnings για lockfiles και icons, αλλά δεν επηρεάζουν τη λειτουργία

---

## 🛠️ Troubleshooting

### Next.js 500 Errors
Αν δεις 500 errors, πιθανόν λείπουν dependencies:
```bash
npm install <package-name> --legacy-peer-deps
```

### Tailwind CSS Issues
Βεβαιώσου ότι το `tailwind.config.js` χρησιμοποιεί CSS variables:
```js
colors: {
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  // ...
}
```

---

Ημερομηνία: 2025-10-19
Έκδοση: 1.0
