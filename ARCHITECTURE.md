# Digital Concierge - Αρχιτεκτονική Συστήματος

## 📋 Περιγραφή

Το Digital Concierge είναι μια **ενοποιημένη** πλατφόρμα διαχείρισης κτιρίων και πολυκατοικιών που τρέχει πλήρως σε **Next.js 15**.

## 🎉 ΕΝΗΜΕΡΩΣΗ (2025-10-19)

**Η αρχιτεκτονική ενοποιήθηκε!** Όλη η λειτουργικότητα (auth, payments, subscriptions, main app) είναι τώρα στο Next.js app.

---

## 🏗️ Unified Next.js Architecture

### ✅ **Next.js App (Ενοποιημένη Εφαρμογή)**

**Τοποθεσία:** `/frontend/app/` & `/frontend/components/`
**Port:** `3000`
**Τεχνολογία:** Next.js 15.5.6 + TypeScript + Tailwind CSS

#### Σκοπός
Η Next.js εφαρμογή είναι η **ενοποιημένη εφαρμογή** που περιλαμβάνει:
- 🔐 **Authentication & Authorization** (Login, Register, OAuth)
- 💳 **Payments & Subscriptions** (Stripe integration)
- 🏢 **Main Dashboard** με όλα τα features διαχείρισης

#### Public Pages (No Auth Required)
```
/frontend/app/
├── page.tsx                # 🏠 Landing Page (Marketing)
├── login/page.tsx          # 🔑 Login Page
├── register/page.tsx       # ✍️ Registration Page
├── payment/
│   ├── page.tsx           # 💳 Stripe Payment Page
│   └── success/page.tsx   # ✅ Payment Success Page
└── auth/callback/page.tsx # 🔄 OAuth Callback Handler
```

#### Protected Pages (Dashboard - Auth Required)
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

## 🔄 Unified User Flow (Updated!)

```
1. Χρήστης επισκέπτεται το site
   ↓
2. Next.js App - Landing Page (/)
   ├─ Βλέπει features & pricing
   └─ Επιλέγει "Ξεκινήστε Τώρα"
   ↓
3. Next.js App - Registration (/register?plan=2)
   ├─ Εγγραφή με email/password
   └─ Ή OAuth με Google
   ↓
4. Next.js App - Payment (/payment)
   ├─ Stripe payment form
   └─ Επιλογή πλάνου & πληρωμή
   ↓
5. Next.js App - Success (/payment/success)
   ├─ Επιβεβαίωση πληρωμής
   └─ Auto-redirect σε 5 δευτερόλεπτα
   ↓
6. Next.js App - Dashboard (/dashboard)
   ├─ Full authenticated experience
   ├─ Financial, Buildings, Maintenance
   └─ Όλα τα features διαχείρισης
```

**Όλα σε ένα Next.js app!** 🎉

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
| **Next.js App** | ✅ Working | 3000 | **Unified App** - Auth, Payments, Dashboard |
| Django Backend | ✅ Working | 18000 | API server |
| PostgreSQL | ✅ Working | 5432 | Database |
| ~~React App~~ | ⚠️ Deprecated | ~~8080~~ | **Migrated to Next.js** |

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

1. **✅ ΕΝΟΠΟΙΗΜΕΝΗ ΑΡΧΙΤΕΚΤΟΝΙΚΗ** (2025-10-19): Όλη η λειτουργικότητα μεταφέρθηκε στο Next.js!
   - Landing Page με marketing content & pricing
   - Login & Registration pages
   - Stripe Payment integration
   - Success page με auto-redirect
   - Full dashboard με όλα τα features

2. **Tailwind CSS**: Χρησιμοποιεί CSS variables από το globals.css για dynamic theming

3. **Dependencies**: Όλα τα packages εγκατεστημένα με `--legacy-peer-deps`
   - Stripe: `@stripe/stripe-js`, `@stripe/react-stripe-js`
   - UI: `@radix-ui/*`, `lucide-react`, `framer-motion`
   - State: `@tanstack/react-query`
   - Utils: `date-fns`, `recharts`, `sonner`

4. **React App Status**: Η `/frontend/src/` React app είναι **deprecated** - όλη η λειτουργικότητα μεταφέρθηκε στο Next.js

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
