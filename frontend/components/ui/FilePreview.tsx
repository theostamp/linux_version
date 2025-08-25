'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FilePreviewProps {
  file: File | { name: string; size: number; type: string; url?: string };
  onRemove?: () => void;
  showPreview?: boolean;
  className?: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  showPreview = true,
  className = '',
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getFileIcon = (fileName: string, fileType: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType === 'application/pdf') return '📄';
    if (fileType.includes('word') || extension === 'doc' || extension === 'docx') return '📝';
    if (fileType.includes('excel') || extension === 'xls' || extension === 'xlsx') return '📊';
    if (fileType.includes('powerpoint') || extension === 'ppt' || extension === 'pptx') return '📈';
    if (fileType.includes('text/')) return '📄';
    
    return '📎';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePreview = async () => {
    if (!showPreview) return;
    
    setIsLoading(true);
    
    try {
      if ('url' in file && file.url) {
        // Αν είναι URL (από server)
        setPreviewUrl(file.url);
      } else if (file instanceof File) {
        // Αν είναι File object (από upload)
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    } catch (error) {
      console.error('Error creating preview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if ('url' in file && file.url) {
      // Download από URL
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (file instanceof File) {
      // Download από File object
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';

  return (
    <div className={`border rounded-lg p-4 bg-gray-50 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getFileIcon(file.name, file.type)}</span>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
              {file.name}
            </span>
            <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
            <Badge variant="secondary" className="text-xs mt-1 w-fit">
              {file.type || 'Unknown type'}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {showPreview && (isImage || isPdf) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={isLoading}
            >
              {isLoading ? 'Φόρτωση...' : 'Προεπισκόπηση'}
            </Button>
          )}
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
          >
            Λήψη
          </Button>
          
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-600 hover:text-red-700"
            >
              ✕
            </Button>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setPreviewUrl(null)}
        >
          <div 
            className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">{file.name}</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreviewUrl(null)}
              >
                ✕
              </Button>
            </div>
            
            <div className="flex justify-center">
              {isImage ? (
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : isPdf ? (
                <iframe
                  src={previewUrl}
                  width="100%"
                  height="600"
                  className="border-0"
                  title={file.name}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Προεπισκόπηση δεν είναι διαθέσιμη για αυτόν τον τύπο αρχείου</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={handleDownload}
                  >
                    Λήψη Αρχείου
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 