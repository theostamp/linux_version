import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface FileOpenOptions {
  fileName: string;
  fileType?: string;
  fileSize?: number;
}

interface ExportOptions {
  format: 'pdf' | 'excel';
  fileName: string;
  exportFunction: () => Promise<Blob | void>;
}

export const useFileOpenWith = () => {
  const [isLoading, setIsLoading] = useState(false);

  // Άμεση προβολή αρχείου από URL
  const openFileFromUrl = useCallback(async (url: string, options: FileOpenOptions) => {
    setIsLoading(true);
    try {
      // Έλεγχος αν το αρχείο υπάρχει
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error('Το αρχείο δεν βρέθηκε');
      }

      // Άνοιγμα σε νέα καρτέλα
      window.open(url, '_blank');
      toast.success(`Το ${options.fileName} άνοιξε σε νέα καρτέλα`);
    } catch (error) {
      console.error('Σφάλμα ανοίγματος αρχείου:', error);
      toast.error('Δεν ήταν δυνατό να ανοίξει το αρχείο');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Προβολή αρχείου σε modal overlay
  const previewFileInModal = useCallback(async (url: string, options: FileOpenOptions) => {
    setIsLoading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Το αρχείο δεν βρέθηκε');
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      // Δημιουργία modal
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.onclick = () => {
        document.body.removeChild(modal);
        window.URL.revokeObjectURL(objectUrl);
      };

      const content = document.createElement('div');
      content.className = 'bg-white rounded-lg p-4 max-w-6xl max-h-[90vh] overflow-auto';
      content.onclick = (e) => e.stopPropagation();

      // Header
      const header = document.createElement('div');
      header.className = 'flex justify-between items-center mb-4 border-b pb-2';
      header.innerHTML = `
        <h3 class="text-lg font-medium">${options.fileName}</h3>
        <button class="text-gray-500 hover:text-gray-700 text-xl font-bold" onclick="this.closest('.fixed').remove(); window.URL.revokeObjectURL('${objectUrl}')">×</button>
      `;

      // Content
      const fileContent = document.createElement('div');
      fileContent.className = 'flex justify-center';

      const fileType = options.fileType || 'application/octet-stream';
      
      if (fileType.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = objectUrl;
        img.alt = options.fileName;
        img.className = 'max-w-full max-h-[70vh] object-contain';
        img.onerror = () => {
          fileContent.innerHTML = '<p class="text-gray-500">Δεν ήταν δυνατή η προβολή της εικόνας</p>';
        };
        fileContent.appendChild(img);
      } else if (fileType === 'application/pdf') {
        const iframe = document.createElement('iframe');
        iframe.src = objectUrl;
        iframe.className = 'w-full h-[600px] border-0';
        iframe.title = options.fileName;
        iframe.onerror = () => {
          fileContent.innerHTML = '<p class="text-gray-500">Δεν ήταν δυνατή η προβολή του PDF</p>';
        };
        fileContent.appendChild(iframe);
      } else {
        fileContent.innerHTML = `
          <div class="text-center py-8">
            <p class="text-gray-500 mb-4">Προεπισκόπηση δεν είναι διαθέσιμη για αυτόν τον τύπο αρχείου</p>
            <button 
              onclick="window.open('${objectUrl}', '_blank')" 
              class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Άνοιγμα σε νέα καρτέλα
            </button>
          </div>
        `;
      }

      content.appendChild(header);
      content.appendChild(fileContent);
      modal.appendChild(content);
      document.body.appendChild(modal);

      toast.success('Το αρχείο προβάλλεται σε modal');
    } catch (error) {
      console.error('Σφάλμα προβολής αρχείου:', error);
      toast.error('Δεν ήταν δυνατή η προβολή του αρχείου');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Λήψη αρχείου
  const downloadFile = useCallback(async (url: string, fileName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Το αρχείο δεν βρέθηκε');
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
      
      toast.success('Το αρχείο κατέβηκε επιτυχώς');
    } catch (error) {
      console.error('Σφάλμα λήψης αρχείου:', error);
      toast.error('Δεν ήταν δυνατή η λήψη του αρχείου');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Εξαγωγή και άμεση προβολή
  const exportAndPreview = useCallback(async (options: ExportOptions) => {
    setIsLoading(true);
    try {
      const blob = await options.exportFunction();
      if (!blob) {
        throw new Error('Η εξαγωγή απέτυχε');
      }

      const objectUrl = window.URL.createObjectURL(blob);
      
      if (options.format === 'pdf') {
        // Άμεση προβολή PDF
        window.open(objectUrl, '_blank');
        toast.success('Το PDF ανοίχθηκε σε νέα καρτέλα');
      } else {
        // Για Excel, ενημερώνουμε τον χρήστη
        toast.info('Για προβολή Excel αρχείων, χρησιμοποιήστε Microsoft Excel ή LibreOffice');
      }

      // Αυτόματη λήψη επίσης
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = options.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Καθαρισμός μετά από λίγο
      setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 1000);

    } catch (error) {
      console.error('Σφάλμα εξαγωγής:', error);
      toast.error(`Δεν ήταν δυνατή η εξαγωγή ${options.format.toUpperCase()}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Εξαγωγή και λήψη
  const exportAndDownload = useCallback(async (options: ExportOptions) => {
    setIsLoading(true);
    try {
      const blob = await options.exportFunction();
      if (!blob) {
        throw new Error('Η εξαγωγή απέτυχε');
      }

      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = options.fileName;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
      
      toast.success(`${options.format.toUpperCase()} κατέβηκε επιτυχώς`);
    } catch (error) {
      console.error('Σφάλμα εξαγωγής:', error);
      toast.error(`Δεν ήταν δυνατή η εξαγωγή ${options.format.toUpperCase()}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    openFileFromUrl,
    previewFileInModal,
    downloadFile,
    exportAndPreview,
    exportAndDownload
  };
};

export default useFileOpenWith;
