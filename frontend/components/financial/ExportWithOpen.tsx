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
  Download, 
  Eye, 
  ExternalLink, 
  FileText, 
  FileSpreadsheet,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import FileOpenWith from '@/components/ui/FileOpenWith';

interface ExportWithOpenProps {
  fileName: string;
  exportFunction: (format: 'pdf' | 'excel') => Promise<Blob | void>;
  fileType: 'pdf' | 'excel';
  onExportComplete?: (blob: Blob, fileName: string) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showPreview?: boolean;
}

export const ExportWithOpen: React.FC<ExportWithOpenProps> = ({
  fileName,
  exportFunction,
  fileType,
  onExportComplete,
  className = '',
  variant = 'default',
  size = 'default',
  showPreview = true
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportedFileName, setExportedFileName] = useState<string>('');

  // Κανονική εξαγωγή και λήψη
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportFunction(fileType);
      if (blob) {
        setExportedBlob(blob);
        setExportedFileName(fileName);
        
        // Αυτόματη λήψη
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success(`${fileType.toUpperCase()} εξαγώθηκε επιτυχώς`);
        
        if (onExportComplete) {
          onExportComplete(blob, fileName);
        }
      }
    } catch (error) {
      console.error(`Σφάλμα εξαγωγής ${fileType}:`, error);
      toast.error(`Δεν ήταν δυνατή η εξαγωγή ${fileType.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Εξαγωγή και προβολή
  const handleExportAndPreview = async () => {
    setIsExporting(true);
    try {
      const blob = await exportFunction(fileType);
      if (blob) {
        setExportedBlob(blob);
        setExportedFileName(fileName);
        
        // Δημιουργία URL για προβολή
        const url = window.URL.createObjectURL(blob);
        
        if (fileType === 'pdf') {
          // Άμεση προβολή PDF σε νέα καρτέλα
          window.open(url, '_blank');
          toast.success('Το PDF ανοίχθηκε σε νέα καρτέλα');
        } else {
          // Για Excel, δείχνουμε μήνυμα
          toast.info('Για προβολή Excel αρχείων, χρησιμοποιήστε Microsoft Excel ή LibreOffice');
        }
        
        if (onExportComplete) {
          onExportComplete(blob, fileName);
        }
      }
    } catch (error) {
      console.error(`Σφάλμα εξαγωγής και προβολής ${fileType}:`, error);
      toast.error(`Δεν ήταν δυνατή η εξαγωγή ${fileType.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Εξαγωγή και άνοιγμα με εξωτερική εφαρμογή
  const handleExportAndOpenExternal = async () => {
    setIsExporting(true);
    try {
      const blob = await exportFunction(fileType);
      if (blob) {
        setExportedBlob(blob);
        setExportedFileName(fileName);
        
        // Αποθήκευση σε temp location και άνοιγμα
        const url = window.URL.createObjectURL(blob);
        
        // Δημιουργία temporary link για άνοιγμα με default app
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.download = fileName;
        
        // Προσπάθεια άνοιγματος με default application
        try {
          window.open(url, '_blank');
          toast.success(`Το ${fileType.toUpperCase()} ανοίχθηκε με την εξωτερική εφαρμογή`);
        } catch (error) {
          // Fallback σε κανονική λήψη
          a.click();
          toast.success(`${fileType.toUpperCase()} κατέβηκε επιτυχώς`);
        }
        
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
        
        if (onExportComplete) {
          onExportComplete(blob, fileName);
        }
      }
    } catch (error) {
      console.error(`Σφάλμα εξαγωγής ${fileType}:`, error);
      toast.error(`Δεν ήταν δυνατή η εξαγωγή ${fileType.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Icon ανάλογα με τον τύπο αρχείου
  const getFileIcon = () => {
    return fileType === 'pdf' ? <FileText className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Κύριο κουμπί εξαγωγής */}
      <Button
        onClick={handleExport}
        disabled={isExporting}
        variant={variant}
        size={size}
        className={className}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {isExporting ? 'Εξαγωγή...' : `Λήψη ${fileType.toUpperCase()}`}
      </Button>

      {/* Dropdown με επιπλέον επιλογές */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={isExporting}
            className="px-2"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Λήψη Αρχείου
          </DropdownMenuItem>
          
          {showPreview && fileType === 'pdf' && (
            <DropdownMenuItem onClick={handleExportAndPreview}>
              <Eye className="h-4 w-4 mr-2" />
              Προβολή σε Νέα Καρτέλα
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem onClick={handleExportAndOpenExternal}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Άνοιγμα με Εξωτερική Εφαρμογή
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <div className="px-2 py-1.5 text-sm text-gray-500">
            <div className="font-medium">{fileName}</div>
            <div className="capitalize">{fileType.toUpperCase()} Αρχείο</div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Αν υπάρχει exported blob, δείχνουμε το FileOpenWith */}
      {exportedBlob && (
        <FileOpenWith
          fileUrl={window.URL.createObjectURL(exportedBlob)}
          fileName={exportedFileName}
          fileType={fileType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}
          variant="ghost"
          size="sm"
        />
      )}
    </div>
  );
};

export default ExportWithOpen;
