# Σχέδιο Refactoring του Design System

Αυτό το έγγραφο περιγράφει ένα σχέδιο δράσης για το refactoring του UI της εφαρμογής, με στόχο τη δημιουργία ενός συνεπoύς και κεντρικοποιημένου Design System.

## Στόχοι
1.  **Κεντρικοποίηση:** Να οριστούν όλα τα βασικά στοιχεία του design (χρώματα, spacing, τυπογραφία) σε ένα σημείο, στο `tailwind.config.ts`.
2.  **Συνέπεια:** Να εξαλειφθούν οι διπλότυποι ή ασυνεπείς components, ξεκινώντας από τα `Button` και `AppButton`.
3.  **Συντηρησιμότητα:** Να αντικατασταθούν οι "hardcoded" τιμές με μεταβλητές του theme, κάνοντας τις μελλοντικές αλλαγές ευκολότερες.

---

## Φάση 1: Κεντρικοποίηση του Design System στο `tailwind.config.ts`

**Οδηγία:** Αντικαταστήστε πλήρως το περιεχόμενο του αρχείου `public-app/tailwind.config.ts` με τον παρακάτω κώδικα. Αυτό θα δημιουργήσει μια ισχυρή βάση για το οπτικό στυλ της εφαρμογής.

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/lucide-react/dist/esm/**/*.js',
  ],
  theme: {
    extend: {
      // -- ΟΡΙΣΜΟΣ ΧΡΩΜΑΤΩΝ --
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Το υπάρχον teal χρώμα, ενσωματωμένο σωστά
        teal: {
          '50': '#f0fdfa',
          '100': '#ccfbf1',
          '200': '#99f6e4',
          '300': '#5eead4',
          '400': '#2dd4bf',
          '500': '#14b8a6', // Αυτό πιθανόν είναι το primary
          '600': '#0d9488',
          '700': '#0f766e',
      '800': '#115e59',
          '900': '#134e4a',
          '950': '#042f2e',
        },
      },
      // -- ΟΡΙΣΜΟΣ BORDER RADIUS --
      borderRadius: {
        lg: `var(--radius-lg)`,
        md: `var(--radius-md)`,
        sm: `var(--radius-sm)`,
      },
    },
  },
  plugins: [],
}

export default config;
```

**Σημείωση:** Ο παραπάνω κώδικας προϋποθέτει ότι θα ορίσετε τις αντίστοιχες CSS μεταβλητές HSL (π.χ. `--primary`, `--background`, κ.λπ.) στο global CSS αρχείο σας (`public-app/src/app/globals.css`). Αυτή είναι η standard πρακτική για theming σε Next.js/Tailwind εφαρμογές.

---

## Φάση 2: Ενοποίηση των Button Components

### 2.1 Ενημέρωση του Βασικού `Button` Component

**Οδηγία:** Ενημερώστε το αρχείο `public-app/src/components/ui/button.tsx` για να αφαιρέσετε τις hardcoded τιμές και να προσθέσετε το νέο animation variant.

**Αντικαταστήστε αυτόν τον κώδικα:**
```typescript
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-none text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-sm',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-[#005866] hover:text-white hover:shadow-md hover:scale-[1.01]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-md hover:scale-[1.01]',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-md hover:scale-[1.01]',
        outline: 'border-2 border-primary text-[#005866] dark:text-primary bg-background hover:bg-primary hover:text-primary-foreground hover:shadow-md',
        link: 'text-[#005866] dark:text-primary underline-offset-4 hover:underline hover:text-[#005866] dark:hover:text-primary shadow-none',
        ghost: 'text-[#005866] dark:text-primary hover:bg-accent hover:text-accent-foreground',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md hover:scale-[1.01]',
        warning: 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-md hover:scale-[1.01]',
      },
```

**Με αυτόν τον κώδικα:**
```typescript
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        success: 'bg-success text-success-foreground hover:bg-success/90',
        warning: 'bg-amber-500 text-white hover:bg-amber-600', // Warning needs theme color
      },
      animation: {
        none: '',
        scale: 'hover:shadow-md hover:scale-[1.01] transition-transform duration-200',
        lift: 'hover:-translate-y-0.5 transition-transform duration-150',
      },
```

**Σημαντικές Αλλαγές:**
*   Αφαιρέθηκαν οι hardcoded τιμές (`#005866`) και αντικαταστάθηκαν με μεταβλητές του theme (π.χ., `text-primary`).
*   Προστέθηκε ένα νέο `animation` variant με επιλογές `none`, `scale` (η παλιά συμπεριφορά), και `lift` (η συμπεριφορά του `AppButton`).
*   Άλλαξε το `rounded-none` σε `rounded-md` για ένα πιο μοντέρνο look, χρησιμοποιώντας τη μεταβλητή από το theme.

### 2.2 Αντικατάσταση του `AppButton`

**Οδηγία:** Πρέπει να αντικαταστήσετε όλες τις χρήσεις του `AppButton` με το `Button` component, χρησιμοποιώντας το νέο `animation` prop.

1.  **Αναζήτηση:** Κάντε μια αναζήτηση σε όλο το project για `import { AppButton }`.
2.  **Αντικατάσταση:** Σε κάθε αρχείο που το βρίσκετε, κάντε τις παρακάτω αλλαγές:
    *   Αλλάξτε το import από `import { AppButton } from '@/components/ui/AppButton'` σε `import { Button } from '@/components/ui/button'`.
    *   Αντικαταστήστε τη χρήση `<AppButton ... />` με `<Button animation="lift" ... />`.

---

## Φάση 3: Εκκαθάριση και Επαλήθευση

### 3.1 Διαγραφή Περιττού Αρχείου
**Οδηγία:** Αφού ολοκληρωθεί η αντικατάσταση από τη Φάση 2, διαγράψτε το αρχείο `public-app/src/components/ui/AppButton.tsx`.

### 3.2 Οπτική Επαλήθευση
**Οδηγία:** Εκτελέστε την εφαρμογή τοπικά (`npm run dev`) και πλοηγηθείτε σε διάφορες σελίδες.
*   Ελέγξτε ότι όλα τα buttons εμφανίζονται σωστά.
*   Βεβαιωθείτε ότι τα animations (`lift` και `scale`) λειτουργούν όπως αναμένεται.
*   Επιβεβαιώστε ότι τα χρώματα (`primary`, `destructive`, `success`, κ.λπ.) είναι συνεπή σε όλη την εφαρμογή.

Ακολουθώντας αυτό το σχέδιο, το UI της εφαρμογής θα γίνει πιο συνεπές, επαγγελματικό και εύκολο στη διαχείριση.