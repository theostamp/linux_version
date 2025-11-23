# Plan: Διόρθωση αναντιστοιχιών δεδομένων μεταξύ κτιρίων (kiosk, votes, announcements)

## Στόχος
Να σταματήσει η εμφάνιση δεδομένων άλλου κτιρίου σε σελίδες kiosk-display, votes και announcements, εξασφαλίζοντας σωστή δρομολόγηση tenant/building και συνεπή φιλτράρισμα.

## Υποθέσεις / πιθανά αίτια
- Λανθασμένη προτεραιοποίηση παραμέτρων `building_id`/`building` σε client hooks/components.
- Public API proxy δεν περνά σωστά Host / X-Tenant-Host προς backend (επιστρέφει tenant `public` αντί `theo`).
- Κλήσεις σε endpoints χωρίς απαιτούμενο `building` query.
- Stale data σε React Query / hooks (παλιό building cache).

## Βήματα (ενημερώνονται καθώς προχωράμε)
1. **Χαρτογράφηση client κλήσεων** (kiosk, votes, announcements): έλεγχος endpoints, query params και headers. ☐
2. **Έλεγχος proxy λογικής Host/X-Tenant-Host** για public routes (`/api/public-info/[buildingId]`, `/api/kiosk-scenes-active`, `/api/announcements`). ☐
3. **Διασταύρωση με backend logs** για να δούμε ποιο tenant επιλέγεται στις προβληματικές κλήσεις. ☐
4. **Διορθώσεις client**: ενοποίηση helper για public fetches με σωστά params/headers, προτεραιότητα `building_id`, ακύρωση stale responses. ☐
5. **Διορθώσεις proxy/backend (αν χρειαστεί)**: σταθερή ρύθμιση tenant host και fallback. ☐
6. **Έλεγχος σε περιβάλλον παραγωγής**: επιβεβαίωση σε kiosk-display, συγκεκριμένο vote και announcements. ☐

## Πρόοδος / Σημειώσεις
- ✅ (23/11) Διορθώθηκε host forwarding σε kiosk scenes/widgets proxies (`kiosk-scenes-active`, `kiosk-widgets-public`) ώστε να στέλνουν το πραγματικό host.
- 🚧 Εντοπίστηκε ότι κι άλλα public routes έχουν hardcoded `demo.localhost` (kiosk-latest-bill, financial/common-expenses/issue, tenants/accept-invite, public-info). Θα τα περάσουμε σε κοινή λογική tenant forwarding.
- 🚧 Announcements/votes χρησιμοποιούν ήδη tenantProxy. Απαιτείται έλεγχος αν το client στέλνει σωστά `building_id` και αν το tenantProxy forwardάρει σωστά σε όλα τα περιβάλλοντα (βλέπουμε ακόμα 308 και πιθανό cross-tenant).
- 🚧 Προστέθηκε προσωρινό logging στους proxies `announcements` και `votes` (routes και [...path]) για να δούμε host/search params στο production.
