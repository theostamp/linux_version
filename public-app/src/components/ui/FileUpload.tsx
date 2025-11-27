'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  onFileRemove?: (file: File) => void;
  selectedFiles?: File[];
  label?: string;
  placeholder?: string;
  multiple?: boolean;
  accept?: string;
  maxSize?: number; // in MB
  maxFiles?: number;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  onFileRemove,
  selectedFiles = [],
  label = 'Επισυναπτόμενα Αρχεία',
  placeholder = 'Κάντε κλικ για επιλογή αρχείων ή σύρετε εδώ',
  multiple = true,
  accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx',
  maxSize = 10, // 10MB default
  maxFiles = 5,
  disabled = false,
  required = false,
  error,
}) => {
  const { toast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `Το αρχείο "${file.name}" είναι πολύ μεγάλο. Μέγιστο μέγεθος: ${maxSize}MB`;
    }

    // Check file type
    const acceptedTypes = accept.split(',').map(type => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const fileType = file.type;

    const isAccepted = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExtension === type.toLowerCase();
      }
      return fileType === type;
    });

    if (!isAccepted) {
      return `Το αρχείο "${file.name}" δεν είναι υποστηριζόμενος τύπος. Επιτρεπόμενοι τύποι: ${accept}`;
    }

    return null;
  }, [accept, maxSize]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Check max files limit
    if (selectedFiles.length + fileArray.length > maxFiles) {
      toast({
        title: 'Πάρα πολλά αρχεία',
        description: `Μπορείτε να επιλέξετε μέχρι ${maxFiles} αρχεία.`,
        variant: 'destructive',
      });
      return;
    }

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      errors.forEach(error => {
        toast({
          title: 'Σφάλμα αρχείου',
          description: error,
          variant: 'destructive',
        });
      });
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [selectedFiles.length, maxFiles, validateFile, onFilesSelected, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input value to allow selecting the same file again
    if (e.target) {
      e.target.value = '';
    }
  }, [handleFileSelect]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png': return '🖼️';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      default: return '📎';
    }
  };

  return (
    <div className="space-y-4">
      {label && (
        <Label className={required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}>
          {label}
        </Label>
      )}

      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-500' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={disabled ? undefined : handleClick}
      >
        <div className="space-y-2">
          <div className="text-4xl">📁</div>
          <p className="text-sm text-gray-600">{placeholder}</p>
          <p className="text-xs text-gray-500">
            Επιτρεπόμενοι τύποι: {accept} | Μέγιστο μέγεθος: {maxSize}MB | Μέγιστο αρχεία: {maxFiles}
          </p>
          {!disabled && (
            <Button type="button" variant="outline" size="sm">
              Επιλογή Αρχείων
            </Button>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Επιλεγμένα Αρχεία ({selectedFiles.length})</Label>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getFileIcon(file.name)}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                  </div>
                </div>
                {onFileRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onFileRemove(file)}
                    className="text-red-600 hover:text-red-700"
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* File Type Info */}
      <div className="text-xs text-gray-500">
        <p><strong>Υποστηριζόμενοι τύποι:</strong> {accept}</p>
        <p><strong>Μέγιστο μέγεθος ανά αρχείο:</strong> {maxSize}MB</p>
        <p><strong>Μέγιστο αριθμό αρχείων:</strong> {maxFiles}</p>
      </div>
    </div>
  );
}; 