# Map Visualization Feature

## Overview
Η σελίδα οπτικοποίησης χάρτη επιτρέπει την προβολή όλων των κτιρίων σε διαδραστικό χάρτη Google Maps με πινέζες (markers).

## Δυνατότητες

### 🗺️ Διαδραστικός Χάρτης
- Προβολή κτιρίων ως πινέζες στον χάρτη
- Εφέ drop animation κατά τη φόρτωση
- Εφέ bounce animation στο hover
- Προσαρμοσμένα εικονίδια πινέζων

### 🔍 Φίλτρα Αναζήτησης
- Αναζήτηση με βάση όνομα κτιρίου
- Αναζήτηση με βάση διεύθυνση
- Αναζήτηση με βάση πόλη
- Φιλτράρισμα ανά πόλη
- Επιλογή εμφάνισης μόνο κτιρίων με συντεταγμένες

### 📊 Στατιστικά
- Συνολικός αριθμός κτιρίων
- Κτίρια με συντεταγμένες
- Κτίρια χωρίς συντεταγμένες
- Αριθμός εμφανιζόμενων κτιρίων

### 💬 Πληροφορίες Κτιρίων
- Info windows με λεπτομέρειες κτιρίου
- Στοιχεία διεύθυνσης
- Αριθμός διαμερισμάτων
- Σύνδεσμος για άνοιγμα σε Google Maps

### 📤 Εξαγωγή Δεδομένων
- Εξαγωγή σε CSV format
- Περιλαμβάνει όλα τα στοιχεία κτιρίων
- Συντεταγμένες σε format lat,lng

## Προαπαιτούμενα

### Google Maps API Setup
1. Ενεργοποίηση Google Maps JavaScript API
2. Ενεργοποίηση Places API (New)
3. Δημιουργία API key με κατάλληλους περιορισμούς
4. Προσθήκη API key στο `frontend/.env.local`

### Δεδομένα Κτιρίων
Τα κτίρια πρέπει να έχουν αποθηκευμένες συντεταγμένες (coordinates) για να εμφανιστούν στον χάρτη.

## Χρήση

### Πρόσβαση
1. Σύνδεση στο σύστημα
2. Πλοήγηση στο "Οπτικοποίηση Χάρτη" από το sidebar menu
3. Η σελίδα είναι διαθέσιμη για managers, staff και superusers

### Φιλτράρισμα
1. Χρήση του πεδίου αναζήτησης για γρήγορη αναζήτηση
2. Επιλογή πόλης από το dropdown
3. Επιλογή/αποεπιλογή του checkbox για κτίρια με συντεταγμένες

### Διαδρασία με Χάρτη
1. Κλικ σε πινέζα για προβολή λεπτομερειών
2. Χρήση ελέγχων χάρτη για zoom/pan
3. Επιλογή τύπου χάρτη (roadmap, satellite, etc.)

## Τεχνική Υλοποίηση

### Components
- `GoogleMapsVisualization.tsx` - Κύριο component χάρτη
- `MapVisualizationPage.tsx` - Σελίδα με φίλτρα και στατιστικά

### Dependencies
- `@googlemaps/js-api-loader` - Φόρτωση Google Maps API
- `lucide-react` - Εικονίδια
- `@/lib/api` - API calls για κτίρια

### TypeScript Types
Επεκτάσεις στο `frontend/types/google-maps.d.ts` για:
- Google Maps Map, Marker, InfoWindow
- LatLng, LatLngBounds
- Animation, Icon, Symbol

## Troubleshooting

### Χάρτης δεν φορτώνει
- Έλεγχος Google Maps API key
- Έλεγχος network connectivity
- Έλεγχος browser console για errors

### Δεν εμφανίζονται πινέζες
- Έλεγχος αν τα κτίρια έχουν συντεταγμένες
- Έλεγχος φίλτρων αναζήτησης
- Έλεγχος API response για κτίρια

### Performance Issues
- Χρήση φίλτρων για μείωση αριθμού κτιρίων
- Έλεγχος network latency
- Έλεγχος browser memory usage

## Future Enhancements
- Clustering για μεγάλο αριθμό κτιρίων
- Heatmap visualization
- Routing μεταξύ κτιρίων
- Street View integration
- Custom map styles
- Export σε άλλες μορφές (KML, GeoJSON) 