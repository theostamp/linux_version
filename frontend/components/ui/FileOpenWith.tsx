'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Eye, 
  Download, 
  ExternalLink, 
  FileText, 
  Image, 
  FileSpreadsheet,
  Monitor,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';

interface FileOpenWithProps {
  fileUrl: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export const FileOpenWith: React.FC<FileOpenWithProps> = ({
  fileUrl,
  fileName,
  fileType = 'application/octet-stream',
  fileSize,
  className = '',
  variant = 'outline',
  size = 'default'
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Καθορισμός τύπου αρχείου
  const getFileCategory = (type: string, name: string): 'image' | 'pdf' | 'excel' | 'document' | 'other' => {
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'pdf';
    if (type.includes('excel') || type.includes('spreadsheet') || 
        name.toLowerCase().match(/\.(xlsx?|csv)$/)) return 'excel';
    if (type.includes('word') || type.includes('document') || 
        name.toLowerCase().match(/\.(docx?|txt|rtf)$/)) return 'document';
    return 'other';
  };

  const fileCategory = getFileCategory(fileType, fileName);

  // Άμεση προβολή στο browser
  const openInBrowser = () => {
    try {
      window.open(fileUrl, '_blank');
      toast.success('Το αρχείο άνοιξε σε νέα καρτέλα');
    } catch (error) {
      console.error('Σφάλμα ανοίγματος αρχείου:', error);
      toast.error('Δεν ήταν δυνατό να ανοίξει το αρχείο');
    }
  };

  // Προβολή σε modal overlay
  const openInModal = () => {
    setIsLoading(true);
    try {
      // Δημιουργία modal για προβολή
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.onclick = () => document.body.removeChild(modal);

      const content = document.createElement('div');
      content.className = 'bg-white rounded-lg p-4 max-w-6xl max-h-[90vh] overflow-auto';
      content.onclick = (e) => e.stopPropagation();

      // Header με κλείσιμο
      const header = document.createElement('div');
      header.className = 'flex justify-between items-center mb-4 border-b pb-2';
      header.innerHTML = `
        <h3 class="text-lg font-medium">${fileName}</h3>
        <button class="text-gray-500 hover:text-gray-700 text-xl font-bold" onclick="this.closest('.fixed').remove()">×</button>
      `;

      // Content ανάλογα με τον τύπο αρχείου
      const fileContent = document.createElement('div');
      fileContent.className = 'flex justify-center';

      if (fileCategory === 'image') {
        const img = document.createElement('img');
        img.src = fileUrl;
        img.alt = fileName;
        img.className = 'max-w-full max-h-[70vh] object-contain';
        img.onerror = () => {
          fileContent.innerHTML = '<p class="text-gray-500">Δεν ήταν δυνατή η προβολή της εικόνας</p>';
        };
        fileContent.appendChild(img);
      } else if (fileCategory === 'pdf') {
        const iframe = document.createElement('iframe');
        iframe.src = fileUrl;
        iframe.className = 'w-full h-[600px] border-0';
        iframe.title = fileName;
        iframe.onerror = () => {
          fileContent.innerHTML = '<p class="text-gray-500">Δεν ήταν δυνατή η προβολή του PDF</p>';
        };
        fileContent.appendChild(iframe);
      } else {
        fileContent.innerHTML = `
          <div class="text-center py-8">
            <p class="text-gray-500 mb-4">Προεπισκόπηση δεν είναι διαθέσιμη για αυτόν τον τύπο αρχείου</p>
            <button 
              onclick="window.open('${fileUrl}', '_blank')" 
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
      console.error('Σφάλμα δημιουργίας modal:', error);
      toast.error('Δεν ήταν δυνατή η προβολή του αρχείου');
    } finally {
      setIsLoading(false);
    }
  };

  // Λήψη αρχείου
  const downloadFile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Το αρχείο κατέβηκε επιτυχώς');
    } catch (error) {
      console.error('Σφάλμα λήψης αρχείου:', error);
      toast.error('Δεν ήταν δυνατή η λήψη του αρχείου');
    } finally {
      setIsLoading(false);
    }
  };

  // Άνοιγμα με εξωτερική εφαρμογή (για desktop)
  const openWithExternalApp = () => {
    // Για desktop εφαρμογές - ανοίγει το αρχείο με το default application
    window.location.href = fileUrl;
    toast.success('Το αρχείο ανοίγει με την εξωτερική εφαρμογή');
  };

  // Άνοιγμα σε mobile app (αν υπάρχει)
  const openInMobileApp = () => {
    // Προσπάθεια ανοίγματος σε mobile app αν είναι διαθέσιμη
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Για mobile, προσπαθούμε να ανοίξουμε με την default εφαρμογή
      window.open(fileUrl, '_system');
    } else {
      // Για desktop, ανοίγουμε με το default browser
      openInBrowser();
    }
    
    toast.success('Το αρχείο ανοίγει με την εφαρμογή της συσκευής');
  };

  // Επιλογές μενού ανάλογα με τον τύπο αρχείου
  const getMenuItems = () => {
    const items = [];

    // Πάντα διαθέσιμες επιλογές
    items.push(
      <DropdownMenuItem key="download" onClick={downloadFile}>
        <Download className="h-4 w-4 mr-2" />
        Λήψη Αρχείου
      </DropdownMenuItem>
    );

    // Προβολή ανάλογα με τον τύπο
    if (fileCategory === 'pdf' || fileCategory === 'image') {
      items.push(
        <DropdownMenuItem key="modal" onClick={openInModal}>
          <Eye className="h-4 w-4 mr-2" />
          Προβολή Εδώ
        </DropdownMenuItem>
      );
    }

    items.push(
      <DropdownMenuItem key="browser" onClick={openInBrowser}>
        <ExternalLink className="h-4 w-4 mr-2" />
        Άνοιγμα σε Νέα Καρτέλα
      </DropdownMenuItem>
    );

    if (fileCategory !== 'other') {
      items.push(
        <DropdownMenuSeparator key="separator" />
      );
      
      items.push(
        <DropdownMenuItem key="external" onClick={openWithExternalApp}>
          <Monitor className="h-4 w-4 mr-2" />
          Άνοιγμα με Εξωτερική Εφαρμογή
        </DropdownMenuItem>
      );

      items.push(
        <DropdownMenuItem key="mobile" onClick={openInMobileApp}>
          <Smartphone className="h-4 w-4 mr-2" />
          Άνοιγμα σε Εφαρμογή Συσκευής
        </DropdownMenuItem>
      );
    }

    return items;
  };

  // Icon ανάλογα με τον τύπο αρχείου
  const getFileIcon = () => {
    switch (fileCategory) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'excel': return <FileSpreadsheet className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
          ) : (
            getFileIcon()
          )}
          <span className="ml-2">
            {isLoading ? 'Φόρτωση...' : 'Άνοιγμα με'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {getMenuItems()}
        
        {/* Πληροφορίες αρχείου */}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-sm text-gray-500">
          <div className="font-medium">{fileName}</div>
          {fileSize && (
            <div>{(fileSize / 1024).toFixed(1)} KB</div>
          )}
          <div className="capitalize">{fileCategory}</div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FileOpenWith;
