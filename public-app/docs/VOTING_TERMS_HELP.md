# 📜 Voting Terms Help

This note explains where residents meet the “Όροι Χρήσης / Πολιτική Απορρήτου” messaging before they cast (pre-)votes so you can keep help pages or release notes in sync.

## 1. Purpose
- The platform now treats voting input as a **recorded declaration of will**, not a decision-maker. Users must accept the Terms before submitting a vote, and the system logs the fact that they consented (email + timestamp + version).
- The Terms panel consists of the written “Όροι Χρήσης Πλατφόρμας & Ηλεκτρονική Αποδοχή” plus the concise Πολιτική Απορρήτου, both surfaced through modals.

## 2. Where users see the consent block

### ❖ In‑app pre‑voting (assembly page / pre‑voting form)
- At the bottom of `PreVotingForm` (see `public-app/src/components/assemblies/PreVotingForm.tsx`), there is a `LegalConsent` block with:
  - An explicit checkbox labeled “Έχω διαβάσει και αποδέχομαι...”
  - Two buttons (`Όροι Χρήσης` / `Πολιτική Απορρήτου`) that open the modals with the articles we drafted
  - A short footnote reminding the user that acceptance is recorded with date/time + email
- All vote controls are disabled until the checkbox is ticked.

### ❖ Email voting link (`/vote-by-email/[token]`)
- Before the “Υποβολή Ψήφων” button there is the exact same `LegalConsent` block (shared component) so external voters must also check the box.
- The submit button is disabled until the Terms are accepted, and a helper text reminds them to check the box when all choices are selected.

## 3. Modal contents
- The “Όροι Χρήσης” modal lists Articles 1–8 and explains the platform’s scope, the role of the Κανονισμός, how electronic identification works (email-only), and that the system merely records will.
- The “Πολιτική Απορρήτου” modal covers controller/contact info, data categories, purposes, legal bases, retention, rights, and security (Articles 1–11).
- Version metadata (`TERMS_VERSION = v1.0`) is shown at the end of the terms modal so you can link release notes to the stored version.

## 4. Tracking
- When a resident ticks the box, `terms_accepted`, `terms_version`, and `terms_accepted_via` are sent either:
  - From the app via `/assembly-attendees/{id}/vote/` with `terms_accepted_via: 'app_pre_vote'`
  - From the email link via `/api/vote-by-email/[token]` with `terms_accepted_via: 'email_link'`
- The backend updates the `AssemblyAttendee` record (new fields: `terms_accepted_at`, `terms_accepted_version`, `terms_accepted_via`) so future audits know who consented.

## 5. Testing/verifying for help documentation
- Confirm the checkbox appears before the vote summary on both flows and that the button enabling logic respects it.
- Open both modals to review the exact language (Terms modal includes version; Privacy modal lists data categories + rights).
- Check the backend data (or logs) to ensure `terms_accepted_at` is set when a vote is recorded via any source.
- When writing help articles for residents or admins, refer to this doc so the wording stays aligned with the actual modals.

If you need a screenshot or want to publish this as part of resident-facing help, I can also capture the current UI or export the modal text to a PDF.
