# Kiosk Widgets System - Νέα Λειτουργικότητα

## Επισκόπηση

Δημιουργήθηκε ένα νέο σύστημα διαχείρισης widgets για το kiosk που επιτρέπει στον διαχειριστή να προσαρμόζει ποια widgets θα εμφανίζονται και σε ποια σειρά.

## Αρχιτεκτονική

### 1. Types & Interfaces (`frontend/types/kiosk-widgets.ts`)
- **KioskWidget**: Interface για κάθε widget
- **WidgetCategory**: Κατηγορίες widgets (main_slides, sidebar_widgets, top_bar_widgets, special_widgets)
- **WidgetPosition**: Θέσεις widgets (main_content, sidebar, top_bar, bottom_bar)
- **WidgetConfig**: Συνολική διαμόρφωση με widgets και ρυθμίσεις
- **AVAILABLE_WIDGETS**: Λίστα όλων των διαθέσιμων widgets
- **DEFAULT_WIDGET_CONFIG**: Προεπιλεγμένη διαμόρφωση

### 2. Hook για Διαχείριση (`frontend/hooks/useKioskWidgets.ts`)
- **useKioskWidgets**: Custom hook για τη διαχείριση των widgets
- Λειτουργίες: loadConfig, saveConfig, toggleWidget, updateWidgetOrder, updateWidgetSettings
- Αυτόματη φόρτωση και αποθήκευση ρυθμίσεων

### 3. API Endpoint (`frontend/app/api/kiosk/widgets/config/route.ts`)
- **GET**: Φόρτωση διαμόρφωσης widgets για συγκεκριμένο κτίριο
- **POST**: Αποθήκευση νέας διαμόρφωσης
- **DELETE**: Διαγραφή διαμόρφωσης (επαναφορά στα προεπιλεγμένα)

### 4. Σελίδα Διαχείρισης (`frontend/app/dashboard/kiosk-widgets/page.tsx`)
- Drag & Drop interface για αλλαγή σειράς widgets
- Checkbox για ενεργοποίηση/απενεργοποίηση widgets
- Γενικές ρυθμίσεις (διάρκεια slide, διάστημα ανανέωσης)
- Preview mode για προεπισκόπηση
- Επαναφορά στα προεπιλεγμένα

### 5. Widget Renderer (`frontend/components/KioskWidgetRenderer.tsx`)
- Νέο component που αντικαθιστά το KioskMode
- Χρησιμοποιεί το σύστημα widgets για εμφάνιση
- Δυναμική δημιουργία slides βάσει ενεργών widgets
- Υποστήριξη όλων των κατηγοριών widgets

## Διαθέσιμα Widgets

### Κύρια Slides (Main Slides)
1. **Dashboard Overview** - Συνολική επισκόπηση κτιρίου
2. **Building Statistics** - Στατιστικά διαμερισμάτων, κατοίκων, parking
3. **Emergency Contacts** - Τηλέφωνα έκτακτης ανάγκης
4. **Announcements** - Ανακοινώσεις σε ζεύγη
5. **Votes** - Ψηφοφορίες σε ζεύγη
6. **Financial Overview** - Οικονομική επισκόπηση
7. **Maintenance Overview** - Υπηρεσίες και συντήρηση
8. **Projects Overview** - Προσφορές και έργα

### Sidebar Widgets
9. **Current Time** - Τρέχουσα ώρα και ημερομηνία
10. **QR Code Connection** - Σύνδεση κινητών συσκευών
11. **Weather Widget (Sidebar)** - Καιρός με πρόγνωση
12. **Internal Manager Info** - Πληροφορίες εσωτερικού διαχειριστή
13. **Community Message** - Μήνυμα κοινότητας
14. **Advertising Banners (Sidebar)** - Χρήσιμες υπηρεσίες

### Top Bar Widgets
15. **Weather Widget (Top Bar)** - Απλός καιρός
16. **Advertising Banners (Top Bar)** - 2 banners με rotation

### Ειδικά Widgets
17. **News Ticker** - Τρέχουσα γραμμή ειδήσεων

## Χρήση

### Για Διαχειριστές
1. Πηγαίνετε στο **Dashboard → Kiosk Widgets**
2. Επιλέξτε ποια widgets θέλετε να εμφανίζονται
3. Αλλάξτε τη σειρά με drag & drop
4. Ρυθμίστε τις γενικές επιλογές
5. Χρησιμοποιήστε το Preview για να δείτε το αποτέλεσμα
6. Αποθηκεύστε τις αλλαγές

### Προεπιλεγμένη Διαμόρφωση
Όλα τα widgets είναι ενεργοποιημένα από προεπιλογή με τη σειρά που ορίζεται στο `DEFAULT_WIDGET_CONFIG`.

## Τεχνικές Λεπτομέρειες

### Αποθήκευση Δεδομένων
- Τα δεδομένα αποθηκεύονται σε memory (mock storage)
- Στο production θα πρέπει να γίνει integration με τη βάση δεδομένων
- Κάθε κτίριο έχει τη δική του διαμόρφωση

### Performance
- Widgets φορτώνονται δυναμικά βάσει των ενεργών επιλογών
- Lazy loading για μεγάλα widgets
- Caching των ρυθμίσεων

### Εκτασιμότητα
- Εύκολη προσθήκη νέων widgets
- Modular αρχιτεκτονική
- Type-safe με TypeScript

## Επόμενα Βήματα

1. **Database Integration**: Αποθήκευση ρυθμίσεων στη βάση δεδομένων
2. **Advanced Settings**: Περισσότερες επιλογές για κάθε widget
3. **Widget Templates**: Προκαθορισμένες διαμορφώσεις
4. **Analytics**: Στατιστικά χρήσης widgets
5. **Real-time Updates**: Αυτόματη ενημέρωση όταν αλλάζουν οι ρυθμίσεις

## Αρχεία που Δημιουργήθηκαν/Τροποποιήθηκαν

### Νέα Αρχεία
- `frontend/types/kiosk-widgets.ts`
- `frontend/hooks/useKioskWidgets.ts`
- `frontend/app/dashboard/kiosk-widgets/page.tsx`
- `frontend/app/api/kiosk/widgets/config/route.ts`
- `frontend/components/KioskWidgetRenderer.tsx`

### Τροποποιημένα Αρχεία
- `frontend/components/Sidebar.tsx` - Προσθήκη menu item
- `frontend/app/kiosk/page.tsx` - Χρήση νέου renderer

## Testing

Για να δοκιμάσετε τη νέα λειτουργικότητα:

1. Πηγαίνετε στο `/dashboard/kiosk-widgets`
2. Αλλάξτε τις ρυθμίσεις widgets
3. Πηγαίνετε στο `/kiosk` για να δείτε το αποτέλεσμα
4. Χρησιμοποιήστε το Preview mode για γρήγορη προεπισκόπηση

Η νέα λειτουργικότητα είναι πλήρως backward compatible και δεν επηρεάζει την υπάρχουσα λειτουργικότητα του kiosk.
