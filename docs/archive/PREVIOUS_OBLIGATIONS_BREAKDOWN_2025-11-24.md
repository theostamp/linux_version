# Διαχωρισμός Προηγούμενων Οφειλών Ιδιοκτήτη/Ενοίκου

**Ημερομηνία:** 24 Νοεμβρίου 2025  
**Feature:** Εμφάνιση διαχωρισμού προηγούμενων οφειλών στο Ειδοποιητήριο Πληρωμής  
**Αιτία:** Ο χρήστης χρειάζεται να ξέρει πόσες από τις προηγούμενες οφειλές ανήκουν στον ιδιοκτήτη vs ενοικιαστή

## Το Πρόβλημα

### Πριν την Αλλαγή

Στο modal "Ειδοποιητήριο Πληρωμής" εμφανιζόταν:

```
Ανάλυση Οφειλών

Παλαιότερες Οφειλές: 210,00 €
Ποσό Κοινοχρήστων: 100,00 €
Σύνολο Πληρωμών: 0,00 €

Δαπάνες Ενοίκου (Ε): -
Δαπάνες Ιδιοκτήτη (Δ): 100,00 €
```

**Πρόβλημα:** Οι "Παλαιότερες Οφειλές: 210€" δεν έδειχναν πόσες ανήκουν στον ιδιοκτήτη και πόσες στον ενοικιαστή!

### Γιατί Είναι Σημαντικό

1. **Διαχωρισμός Ευθυνών**
   - Ο ιδιοκτήτης πληρώνει μόνο τις δικές του οφειλές
   - Ο ενοικιαστής πληρώνει τις δικές του

2. **Νομική Σαφήνεια**
   - Διαφορετικές νομικές υποχρεώσεις ανά κατηγορία
   - Σημαντικό σε περίπτωση διαφωνίας

3. **Διαπραγμάτευση**
   - Αν ένας ενοικιαστής έφυγε με οφειλές
   - Ο ιδιοκτήτης μπορεί να ζητήσει αποζημίωση

4. **Διαφάνεια**
   - Ο ιδιοκτήτης βλέπει ξεκάθαρα τι χρωστάει

## Η Λύση

### Backend Changes

**Αρχείο:** `backend/financial/services.py`

Προσθήκη 2 νέων πεδίων στο API response:

```python
balances.append({
    # ... existing fields ...
    # 🔧 ΝΕΑ FIELDS 2025-11-24: Διαχωρισμός προηγούμενων οφειλών
    'previous_resident_expenses': previous_resident_expenses,  # Δαπάνες Ενοίκου (προηγούμενοι)
    'previous_owner_expenses': previous_owner_expenses,        # Δαπάνες Ιδιοκτήτη (προηγούμενοι)
    # ...
})
```

**Σημείωση:** Τα `previous_resident_expenses` και `previous_owner_expenses` ήδη υπολογίζονταν (γραμμές 1162-1195) αλλά **δεν επιστρέφονταν** στο response. Τώρα επιστρέφονται!

### Frontend Changes

**Αρχείο:** `public-app/src/components/financial/PaymentNotificationModal.tsx`

Νέα εμφάνιση με δενδροειδή δομή:

```tsx
<div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm font-semibold text-purple-900">Παλαιότερες Οφειλές:</span>
    <div className="font-bold text-lg text-purple-900">210,00 €</div>
  </div>
  
  {/* Διαχωρισμός Παλαιότερων Οφειλών */}
  <div className="ml-4 space-y-1 text-sm border-l-2 border-purple-300 pl-3">
    <div className="flex items-center justify-between text-red-700">
      <div className="flex items-center gap-2">
        <span className="text-xs">├─</span>
        <span>Δαπάνες Ιδιοκτήτη</span>
        <Badge variant="outline" className="bg-red-50 text-red-700">Δ</Badge>
      </div>
      <span className="font-medium">140,00 €</span>
    </div>
    <div className="flex items-center justify-between text-green-700">
      <div className="flex items-center gap-2">
        <span className="text-xs">└─</span>
        <span>Δαπάνες Ενοίκου</span>
        <Badge variant="outline" className="bg-green-50 text-green-700">Ε</Badge>
      </div>
      <span className="font-medium">70,00 €</span>
    </div>
  </div>
</div>
```

**TypeScript Interface Update:**

```typescript
interface ApartmentBalanceWithDetails {
  // ... existing fields ...
  // 🔧 ΝΕΑ FIELDS 2025-11-24: Διαχωρισμός προηγούμενων οφειλών
  previous_resident_expenses?: number;  // Δαπάνες Ενοίκου (προηγούμενοι)
  previous_owner_expenses?: number;     // Δαπάνες Ιδιοκτήτη (προηγούμενοι)
  // ...
}
```

## Μετά την Αλλαγή

### Νέα Εμφάνιση

```
Ανάλυση Οφειλών

┌─────────────────────────────────────────┐
│ Παλαιότερες Οφειλές:        210,00 €    │
│ ├─ Δαπάνες Ιδιοκτήτη (Δ):   140,00 €    │
│ └─ Δαπάνες Ενοίκου (Ε):      70,00 €    │
└─────────────────────────────────────────┘

Ποσό Κοινοχρήστων (Τρέχων): 100,00 €
Σύνολο Πληρωμών: 0,00 €
```

### Visual Design

- 🟣 **Purple background** για τις παλαιότερες οφειλές (ξεχωριστό από τρέχοντες)
- 🔴 **Red text** για δαπάνες ιδιοκτήτη
- 🟢 **Green text** για δαπάνες ενοίκου
- 📊 **Tree structure** (├─, └─) για οπτική ιεραρχία
- 🏷️ **Badges** (Δ, Ε) για γρήγορη αναγνώριση

## Πλεονεκτήματα

1. ✅ **Διαφάνεια:** Ξεκάθαρος διαχωρισμός ευθυνών
2. ✅ **Νομική Ασφάλεια:** Τεκμηρίωση ποιος χρωστάει τι
3. ✅ **User Experience:** Εύκολη κατανόηση των οφειλών
4. ✅ **Consistent Design:** Χρησιμοποιεί τα ίδια χρώματα (Δ=κόκκινο, Ε=πράσινο)
5. ✅ **Backward Compatible:** Αν δεν υπάρχουν τα πεδία, δεν σπάει το UI

## Αρχεία που Τροποποιήθηκαν

### Backend
- `backend/financial/services.py`
  - Προσθήκη `previous_resident_expenses` στο response
  - Προσθήκη `previous_owner_expenses` στο response

### Frontend
- `public-app/src/components/financial/PaymentNotificationModal.tsx`
  - Νέο UI για διαχωρισμό παλαιότερων οφειλών
  - Tree structure με badges
  
- `public-app/src/components/financial/ApartmentBalancesTab.tsx`
  - TypeScript interface update

## Testing Checklist

- [ ] Επισκεφτείτε: `https://theo.newconcierge.app/financial?building=2&tab=balances&month=2025-12`
- [ ] Κάντε κλικ στο κουμπί "Ενημέρωση" για ένα διαμέρισμα
- [ ] Ελέγξτε ότι εμφανίζεται η ενότητα "Παλαιότερες Οφειλές" με:
  - ✅ Συνολικό ποσό
  - ✅ Διαχωρισμό Ιδιοκτήτη (Δ) - κόκκινο
  - ✅ Διαχωρισμό Ενοίκου (Ε) - πράσινο
- [ ] Ελέγξτε ότι το άθροισμα ταιριάζει με το συνολικό
- [ ] Δοκιμάστε και σε διαμέρισμα χωρίς προηγούμενες οφειλές

## Παράδειγμα Χρήσης

### Σενάριο 1: Διαμέρισμα με Μικτές Οφειλές

```
Διαμέρισμα 1 (Οκτώβριος 2025):
- Ιδιοκτήτης οφείλει: 140€ από προηγούμενους μήνες
- Ενοικιαστής οφείλει: 70€ από προηγούμενους μήνες
- Τρέχων μήνας: 100€ (μόνο ιδιοκτήτης)

Εμφάνιση:
  Παλαιότερες Οφειλές: 210€
    ├─ Δαπάνες Ιδιοκτήτη (Δ): 140€
    └─ Δαπάνες Ενοίκου (Ε): 70€
  Τρέχων Μήνας: 100€
  ΣΥΝΟΛΟ: 310€
```

### Σενάριο 2: Διαμέρισμα με Μόνο Ιδιοκτήτη

```
Διαμέρισμα 5 (Οκτώβριος 2025):
- Ιδιοκτήτης οφείλει: 85€ από προηγούμενους μήνες
- Τρέχων μήνας: 50€

Εμφάνιση:
  Παλαιότερες Οφειλές: 85€
    └─ Δαπάνες Ιδιοκτήτη (Δ): 85€
  Τρέχων Μήνας: 50€
  ΣΥΝΟΛΟ: 135€
```

## Συμπέρασμα

Η προσθήκη αυτή παρέχει **διαφάνεια** και **σαφήνεια** στις οικονομικές υποχρεώσεις κάθε διαμερίσματος, κάνοντας ξεκάθαρο ποιος χρωστάει τι. Είναι ιδιαίτερα χρήσιμη σε περιπτώσεις με ενοικιαστές ή διαφωνίες.

**Status:** ✅ ΟΛΟΚΛΗΡΩΘΗΚΕ

