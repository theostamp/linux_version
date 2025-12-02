# Playwright End-to-End Tests

## Περιγραφή
Τα σενάρια Playwright καλύπτουν τα βασικά flows πρόσβασης ανά ρόλο (resident, internal manager, office manager/staff, superuser) στο production/staging περιβάλλον (`https://theo.newconcierge.app`). Κάθε σενάριο συνδέεται με πραγματικά credentials που παρέχονται μέσω environment variables.

## Βήματα εγκατάστασης
```bash
cd public-app
npm install
npm install -D @playwright/test
npx playwright install
```

## Environment variables
Δημιούργησε ένα αρχείο π.χ. `public-app/.env.playwright` (ή `.env.playwright.local`) και όρισε:

```
PLAYWRIGHT_BASE_URL=https://theo.newconcierge.app

PLAYWRIGHT_RESIDENT_EMAIL=
PLAYWRIGHT_RESIDENT_PASSWORD=

PLAYWRIGHT_INTERNAL_MANAGER_EMAIL=
PLAYWRIGHT_INTERNAL_MANAGER_PASSWORD=

PLAYWRIGHT_OFFICE_MANAGER_EMAIL=
PLAYWRIGHT_OFFICE_MANAGER_PASSWORD=

PLAYWRIGHT_SUPERUSER_EMAIL=
PLAYWRIGHT_SUPERUSER_PASSWORD=
```

- Τα σενάρια που δεν διαθέτουν credentials παραλείπονται αυτόματα (`test.skip` με μήνυμα).
- Μπορείς να χρησιμοποιήσεις διαφορετικό `PLAYWRIGHT_BASE_URL` (π.χ. staging) εφόσον τα credentials ισχύουν εκεί.

## Εκτέλεση
```bash
cd public-app
npm run test:e2e          # headless
npm run test:e2e:headed   # headed debugging
```

### Reports
- HTML report: `npx playwright show-report`
- Traces: αποθηκεύονται αυτόματα για αποτυχημένα tests (ρυθμισμένο σε `on-first-retry`).

## Διαχείριση secrets
Μην αποθηκεύεις τα πραγματικά credentials στο repo. Χρησιμοποίησε `.env.playwright`/`.env.playwright.local` και πρόσθεσέ το στο `.gitignore` (ή φόρτωσέ το μέσω secret manager στο CI).

