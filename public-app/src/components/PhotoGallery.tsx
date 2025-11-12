'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoGalleryProps {
  photos: string[];
  title?: string;
}

export default function PhotoGallery({ photos, title = "Φωτογραφίες του Προβλήματος" }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  const openLightbox = (index: number) => {
    setSelectedPhoto(index);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
  };

  const nextPhoto = () => {
    if (selectedPhoto !== null) {
      setSelectedPhoto((selectedPhoto + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (selectedPhoto !== null) {
      setSelectedPhoto(selectedPhoto === 0 ? photos.length - 1 : selectedPhoto - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedPhoto === null) return;
    
    switch (e.key) {
      case 'Escape':
        closeLightbox();
        break;
      case 'ArrowRight':
        nextPhoto();
        break;
      case 'ArrowLeft':
        prevPhoto();
        break;
    }
  };

  if (!photos || photos.length === 0) {
    return null;
  }

  return (
    <>
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">📸 {title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <div 
              key={index} 
              className="relative group"
            >
              <img
                src={photo}
                alt={`Φωτογραφία ${index + 1} του προβλήματος`}
                className="w-full h-48 object-cover rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => openLightbox(index)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div 
                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center pointer-events-none"
              >
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white">
                  <ZoomIn className="w-8 h-8" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Κλικ στις φωτογραφίες για μεγέθυνση • Χρησιμοποιήστε τα βελάκια για πλοήγηση • ESC για έξοδο
        </p>
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto !== null && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="relative max-w-4xl max-h-full p-4">
            {/* Close button */}
            <Button
              onClick={closeLightbox}
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Navigation buttons */}
            {photos.length > 1 && (
              <>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevPhoto();
                  }}
                  variant="secondary"
                  size="sm"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextPhoto();
                  }}
                  variant="secondary"
                  size="sm"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Photo */}
            <img
              src={photos[selectedPhoto]}
              alt={`Φωτογραφία ${selectedPhoto + 1} του προβλήματος`}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Photo counter */}
            {photos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {selectedPhoto + 1} / {photos.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

