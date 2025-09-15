# 📁 Σύστημα "Άνοιγμα με" - File Open With System

## 🎯 Επισκόπηση

Το νέο σύστημα "Άνοιγμα με" προσθέτει δυνατότητες προβολής και διαχείρισης αρχείων στο New Concierge, επιτρέποντας στους χρήστες να επιλέξουν πώς θέλουν να προβάλουν τα εξαγόμενα αρχεία.

## 🚀 Χαρακτηριστικά

### ✨ Κύρια Λειτουργίες
- **Άμεση προβολή στο browser** (PDF, εικόνες)
- **Άνοιγμα σε νέα καρτέλα**
- **Λήψη αρχείου**
- **Άνοιγμα με εξωτερική εφαρμογή**
- **Προβολή σε modal overlay**
- **Άνοιγμα σε mobile app** (αν διαθέσιμο)

### 📱 Υποστηριζόμενοι Τύποι Αρχείων
- **PDF**: Προβολή με iframe ή άνοιγμα με PDF viewer
- **Εικόνες**: JPG, PNG, GIF, WebP
- **Excel**: XLSX, CSV
- **Έγγραφα**: DOCX, TXT, RTF
- **Άλλοι τύποι**: Γενική υποστήριξη με fallback options

## 🛠️ Components

### 1. FileOpenWith Component

Βασικό component για άνοιγμα αρχείων με πολλαπλές επιλογές.

```tsx
import FileOpenWith from '@/components/ui/FileOpenWith';

<FileOpenWith
  fileUrl="https://example.com/file.pdf"
  fileName="document.pdf"
  fileType="application/pdf"
  fileSize={1024000}
  variant="outline"
  size="default"
/>
```

#### Props
- `fileUrl`: URL του αρχείου
- `fileName`: Όνομα αρχείου
- `fileType`: MIME type (προαιρετικό)
- `fileSize`: Μέγεθος σε bytes (προαιρετικό)
- `className`: CSS classes (προαιρετικό)
- `variant`: Button variant (default: 'outline')
- `size`: Button size (default: 'default')

### 2. ExportWithOpen Component

Βελτιωμένο component για εξαγωγή με επιλογές άνοιγματος.

```tsx
import ExportWithOpen from '@/components/financial/ExportWithOpen';

<ExportWithOpen
  fileName="report.pdf"
  exportFunction={async () => exportReport('pdf')}
  fileType="pdf"
  onExportComplete={(blob, fileName) => console.log('Exported:', fileName)}
  variant="default"
  size="default"
  showPreview={true}
/>
```

#### Props
- `fileName`: Όνομα αρχείου για λήψη
- `exportFunction`: Async function που επιστρέφει Blob
- `fileType`: 'pdf' ή 'excel'
- `onExportComplete`: Callback μετά την εξαγωγή
- `variant`: Button variant
- `size`: Button size
- `showPreview`: Εάν να δείχνει επιλογή προβολής

### 3. useFileOpenWith Hook

Custom hook για προχωρημένη χρήση.

```tsx
import { useFileOpenWith } from '@/hooks/useFileOpenWith';

const { 
  isLoading,
  openFileFromUrl,
  previewFileInModal,
  downloadFile,
  exportAndPreview,
  exportAndDownload
} = useFileOpenWith();

// Χρήση
await openFileFromUrl('https://example.com/file.pdf', {
  fileName: 'document.pdf',
  fileType: 'application/pdf'
});
```

## 📋 Παραδείγματα Χρήσης

### 1. Βασική Εξαγωγή με Επιλογές

```tsx
// Στο ReportsManager
<ExportWithOpen
  fileName={`financial_report_${new Date().toISOString().split('T')[0]}.pdf`}
  exportFunction={async () => {
    const response = await api.get('/financial/reports/export_pdf/', {
      responseType: 'blob'
    });
    return response.data;
  }}
  fileType="pdf"
  showPreview={true}
/>
```

### 2. Προβολή Υπάρχοντος Αρχείου

```tsx
// Στο ExpenseDetail
{expense.attachment && (
  <FileOpenWith
    fileUrl={expense.attachment_url}
    fileName={expense.attachment.split('/').pop() || 'attachment'}
    fileType="application/pdf"
  />
)}
```

### 3. Custom Hook Χρήση

```tsx
const MyComponent = () => {
  const { exportAndPreview, isLoading } = useFileOpenWith();
  
  const handleExport = async () => {
    await exportAndPreview({
      format: 'pdf',
      fileName: 'my-report.pdf',
      exportFunction: async () => {
        // Export logic
        return blob;
      }
    });
  };
  
  return (
    <Button onClick={handleExport} disabled={isLoading}>
      {isLoading ? 'Εξαγωγή...' : 'Εξαγωγή & Προβολή'}
    </Button>
  );
};
```

## 🔧 Ενσωμάτωση σε Υπάρχοντα Components

### 1. Αντικατάσταση Υπάρχοντος Export Button

**Πριν:**
```tsx
<Button onClick={exportToPDF}>
  <Download className="h-4 w-4 mr-2" />
  Λήψη PDF
</Button>
```

**Μετά:**
```tsx
<ExportWithOpen
  fileName="report.pdf"
  exportFunction={exportToPDF}
  fileType="pdf"
  showPreview={true}
/>
```

### 2. Προσθήκη σε File Preview

```tsx
// Στο FilePreview component
<div className="flex items-center gap-2">
  <FilePreview file={file} />
  <FileOpenWith
    fileUrl={file.url}
    fileName={file.name}
    fileType={file.type}
    variant="ghost"
    size="sm"
  />
</div>
```

## 🎨 Customization

### 1. Προσαρμογή Μενού Επιλογών

```tsx
// Custom menu items στο FileOpenWith
const customMenuItems = [
  {
    label: 'Στείλε με Email',
    icon: <Mail className="h-4 w-4" />,
    onClick: () => sendViaEmail(fileUrl, fileName)
  }
];
```

### 2. Προσαρμογή Styling

```tsx
<FileOpenWith
  fileUrl={fileUrl}
  fileName={fileName}
  className="w-full bg-blue-600 hover:bg-blue-700"
  variant="default"
  size="lg"
/>
```

## 🔒 Ασφάλεια

### 1. File Type Validation
- Έλεγχος MIME types
- Περιορισμός επιτρεπόμενων τύπων
- Sanitization ονομάτων αρχείων

### 2. URL Validation
- Έλεγχος HTTPS URLs
- Domain whitelist
- CSRF protection

## 📱 Mobile Support

### 1. Responsive Design
- Προσαρμοσμένο UI για mobile
- Touch-friendly buttons
- Optimized modal sizes

### 2. Native App Integration
- Άνοιγμα με native apps (iOS/Android)
- Deep linking support
- App-specific handlers

## 🐛 Troubleshooting

### 1. Συνήθη Προβλήματα

**Πρόβλημα**: PDF δεν ανοίγει σε προβολή
**Λύση**: Έλεγχος CORS headers και file accessibility

**Πρόβλημα**: Εικόνες δεν εμφανίζονται
**Λύση**: Έλεγχος URL validity και network connectivity

**Πρόβλημα**: Excel αρχεία δεν ανοίγουν
**Λύση**: Χρήση εξωτερικής εφαρμογής (Microsoft Excel, LibreOffice)

### 2. Debug Mode

```tsx
// Ενεργοποίηση debug logging
const { openFileFromUrl } = useFileOpenWith();

// Με debug info
console.log('Opening file:', { fileUrl, fileName, fileType });
await openFileFromUrl(fileUrl, { fileName, fileType });
```

## 🚀 Μελλοντικές Βελτιώσεις

### 1. Planned Features
- [ ] Batch file operations
- [ ] File compression
- [ ] Cloud storage integration
- [ ] Advanced preview modes
- [ ] File conversion

### 2. Performance Optimizations
- [ ] Lazy loading για μεγάλα αρχεία
- [ ] Caching mechanism
- [ ] Progressive loading
- [ ] Memory management

## 📚 Πηγές και Documentation

- [MDN File API](https://developer.mozilla.org/en-US/docs/Web/API/File)
- [Blob API](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- [URL.createObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL)
- [React File Handling Best Practices](https://reactjs.org/docs/forms.html#the-file-input-tag)

---

**Δημιουργήθηκε**: Ιανουάριος 2025  
**Έκδοση**: 1.0.0  
**Κατάσταση**: ✅ Ετοιμο για χρήση
