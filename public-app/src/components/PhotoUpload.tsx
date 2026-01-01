'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Upload } from 'lucide-react';

interface PhotoUploadProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
  maxSizeMB?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export default function PhotoUpload({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  maxSizeMB = 5,
  maxWidth = 1920,
  maxHeight = 1080,
}: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          } else {
            resolve(file);
          }
        }, file.type, 0.8);
      };

      img.onerror = () => {
        resolve(file);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;

    setUploading(true);

    try {
      const validFiles: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const validImageTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
          'image/webp', 'image/svg+xml', 'image/svg'
        ];

        const isValidImage = validImageTypes.includes(file.type) ||
                           file.name.toLowerCase().match(/\.(svg|jpg|jpeg|png|gif|webp)$/i);

        if (!isValidImage) {
          alert(`Το αρχείο ${file.name} δεν είναι υποστηριζόμενος τύπος εικόνας.`);
          continue;
        }

        if (file.size > maxSizeMB * 1024 * 1024) {
          alert(`Το αρχείο ${file.name} είναι πολύ μεγάλο. Μέγιστο μέγεθος: ${maxSizeMB}MB`);
          continue;
        }

        if (photos.length + validFiles.length >= maxPhotos) {
          alert(`Μπορείτε να ανεβάσετε μέχρι ${maxPhotos} φωτογραφίες.`);
          break;
        }

        const resizedFile = await resizeImage(file);
        validFiles.push(resizedFile);
      }

      if (validFiles.length > 0) {
        onPhotosChange([...photos, ...validFiles]);
      }
    } catch (error) {
      console.error('[PhotoUpload] Error processing files:', error);
      alert('Σφάλμα κατά την επεξεργασία των αρχείων.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-200 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <div className="space-y-2">
          <div className="flex justify-center">
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600">
            Σύρετε φωτογραφίες εδώ ή{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              επιλέξτε αρχεία
            </button>
          </p>
          <p className="text-xs text-gray-500">
            Μέγιστο {maxPhotos} φωτογραφίες, {maxSizeMB}MB το καθένα
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || photos.length >= maxPhotos}
        className="w-full"
      >
        {uploading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Επεξεργασία...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Προσθήκη Φωτογραφιών
          </div>
        )}
      </Button>

      {photos.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Προεπισκόπηση φωτογραφιών:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Αφαίρεση φωτογραφίας"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {(photo.size / 1024 / 1024).toFixed(1)}MB
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Οι φωτογραφίες θα γίνουν αυτόματα resize για καλύτερη απόδοση (εκτός SVG)</p>
        <p>• Υποστηριζόμενοι τύποι: JPG, PNG, GIF, SVG, WebP</p>
        <p>• Μέγιστο μέγεθος ανά φωτογραφία: {maxSizeMB}MB</p>
        <p>• Μέγιστο πλήθος φωτογραφιών: {maxPhotos}</p>
      </div>
    </div>
  );
}
