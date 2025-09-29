# Kiosk Canvas Editor - Visual Drag & Drop Interface

## 🎨 Επισκόπηση

Το **Kiosk Canvas Editor** είναι ένα νέο visual interface που επιτρέπει στους διαχειριστές να δημιουργούν το layout του kiosk με drag & drop functionality. Αντί για απλές λίστες, τώρα μπορείτε να "ζωγραφίσετε" το kiosk σας σε ένα visual canvas!

## ✨ Βασικά Χαρακτηριστικά

### 🎯 Visual Canvas Interface
- **Grid-based Layout**: 8x12 grid system με δυνατότητα προσαρμογής
- **Drag & Drop**: Σύρετε widgets από την παλέτα στο canvas
- **Real-time Preview**: Δείτε αμέσως πώς θα φαίνεται το kiosk
- **Responsive Design**: Λειτουργεί σε όλες τις συσκευές

### 🎨 Widget Palette
- **Available Widgets**: Όλα τα διαθέσιμα widgets σε μια πλευρική παλέτα
- **Category Organization**: Widgets οργανωμένα ανά κατηγορία
- **Visual Icons**: Κάθε widget έχει το δικό του εικονίδιο
- **Smart Filtering**: Μόνο τα μη-τοποθετημένα widgets εμφανίζονται

### 🔧 Canvas Controls
- **Grid Size**: Προσαρμόστε το μέγεθος του grid (4-12 rows, 6-16 cols)
- **Widget Positioning**: Κάντε κλικ για να τοποθετήσετε widgets
- **Remove Widgets**: Αφαιρέστε widgets με ένα κλικ
- **Save Layout**: Αποθηκεύστε το layout για μελλοντική χρήση

## 🚀 Πώς να το Χρησιμοποιήσετε

### 1. Πρόσβαση στο Canvas Editor
```
Dashboard → Kiosk Widgets → Canvas Editor (toggle button)
```

### 2. Βασική Χρήση
1. **Επιλέξτε Widget**: Κάντε κλικ σε ένα widget από την παλέτα
2. **Τοποθετήστε**: Κάντε κλικ σε μια θέση στο canvas
3. **Αφαιρέστε**: Κάντε κλικ στο κουμπί "X" του widget
4. **Αποθηκεύστε**: Κάντε κλικ στο "Αποθήκευση Layout"

### 3. Προχωρημένες Λειτουργίες
- **Grid Size**: Χρησιμοποιήστε τα +/- κουμπιά για να αλλάξετε το μέγεθος
- **Preview Mode**: Δείτε πώς θα φαίνεται το kiosk
- **Reset Layout**: Επαναφέρετε όλα τα widgets στην παλέτα

## 🏗️ Τεχνική Υλοποίηση

### 📦 Dependencies
```json
{
  "@dnd-kit/core": "^6.0.8",
  "@dnd-kit/sortable": "^7.0.2", 
  "@dnd-kit/utilities": "^3.2.1"
}
```

### 🎯 Key Components

#### `KioskCanvasEditor.tsx`
- Κύριο component του canvas editor
- Διαχειρίζεται το drag & drop logic
- Render το grid και την παλέτα

#### `DraggableWidget.tsx` (embedded)
- Drag & drop widget component
- Υποστηρίζει και palette και canvas mode
- Visual feedback κατά το drag

#### `CanvasGrid.tsx` (embedded)
- Grid visualization component
- Cell click handling
- Widget positioning logic

### 🔄 Data Flow
```
Widget Palette → Drag → Canvas Grid → Save → API → Database
```

### 📊 State Management
- **Grid State**: Current grid size and occupied cells
- **Widget State**: Available vs placed widgets
- **Drag State**: Currently dragged widget
- **Preview State**: Preview mode toggle

## 🎨 UI/UX Features

### Visual Feedback
- **Drag Preview**: Widget becomes semi-transparent during drag
- **Hover Effects**: Cells highlight when hoverable
- **Occupied Cells**: Blue background for occupied cells
- **Widget Names**: Display widget names in grid cells

### Responsive Design
- **Mobile Friendly**: Touch-friendly drag & drop
- **Tablet Optimized**: Larger touch targets
- **Desktop Enhanced**: Keyboard shortcuts support

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and descriptions
- **High Contrast**: Clear visual indicators

## 🔧 Configuration

### Grid Settings
```typescript
const GRID_SIZE = {
  rows: 8,    // Default rows
  cols: 12,   // Default columns
};

const CELL_SIZE = 60; // Pixels per cell
```

### Widget Sizing
```typescript
// Default widget sizes
const DEFAULT_SIZES = {
  main_slides: { rowSpan: 3, colSpan: 4 },
  sidebar_widgets: { rowSpan: 2, colSpan: 2 },
  top_bar_widgets: { rowSpan: 1, colSpan: 3 },
  special_widgets: { rowSpan: 1, colSpan: 12 },
};
```

## 🚀 Future Enhancements

### Planned Features
- **Widget Resizing**: Drag to resize widgets
- **Snap to Grid**: Automatic grid alignment
- **Templates**: Pre-made layout templates
- **Undo/Redo**: Action history
- **Collaborative Editing**: Multiple users editing

### Advanced Features
- **Widget Customization**: In-canvas widget settings
- **Animation Preview**: See transitions in preview
- **Export/Import**: Share layouts between buildings
- **Version Control**: Layout history and rollback

## 🐛 Troubleshooting

### Common Issues

#### Widgets Not Dragging
- **Solution**: Check if @dnd-kit is properly installed
- **Debug**: Check browser console for errors

#### Grid Not Updating
- **Solution**: Refresh the page
- **Debug**: Check if widgets are properly saved

#### Permission Errors
- **Solution**: Check building permissions
- **Debug**: Verify user role and building access

### Performance Tips
- **Large Grids**: Use smaller grid sizes for better performance
- **Many Widgets**: Limit widgets per category
- **Browser**: Use modern browsers for best experience

## 📱 Browser Support

### Supported Browsers
- **Chrome**: 90+ ✅
- **Firefox**: 88+ ✅
- **Safari**: 14+ ✅
- **Edge**: 90+ ✅

### Mobile Support
- **iOS Safari**: 14+ ✅
- **Chrome Mobile**: 90+ ✅
- **Samsung Internet**: 14+ ✅

## 🎯 Best Practices

### Layout Design
1. **Start Simple**: Begin with basic layouts
2. **Group Related**: Place related widgets together
3. **Balance**: Distribute widgets evenly
4. **Test**: Always preview before saving

### Performance
1. **Limit Widgets**: Don't overcrowd the canvas
2. **Optimize Grid**: Use appropriate grid sizes
3. **Save Regularly**: Save your work frequently
4. **Test on Devices**: Preview on actual kiosk devices

## 🔗 Related Documentation

- [Kiosk Widgets System](./KIOSK_WIDGETS_README.md)
- [Widget Development Guide](./WIDGET_DEVELOPMENT.md)
- [API Documentation](./API_DOCUMENTATION.md)

---

## 🎉 Συμπέρασμα

Το **Kiosk Canvas Editor** μεταμορφώνει τη διαχείριση του kiosk από μια απλή λίστα σε μια δημιουργική, visual εμπειρία. Με drag & drop functionality, real-time preview, και intuitive controls, οι διαχειριστές μπορούν τώρα να δημιουργούν όμορφα και λειτουργικά kiosk layouts με ευκολία!

**Happy Designing! 🎨✨**
