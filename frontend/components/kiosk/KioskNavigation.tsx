'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Play, Pause, Settings } from 'lucide-react';

interface KioskNavigationProps {
  totalSlides: number;
  currentSlide: number;
  onSlideChange: (index: number) => void;
  showControls: boolean;
  autoSlide?: boolean;
  onToggleAutoSlide?: () => void;
  onShowSettings?: () => void;
}

export default function KioskNavigation({
  totalSlides,
  currentSlide,
  onSlideChange,
  showControls,
  autoSlide = false,
  onToggleAutoSlide,
  onShowSettings
}: KioskNavigationProps) {
  if (!showControls || totalSlides <= 1) {
    return null;
  }

  const handlePrevious = () => {
    const prevSlideIndex = currentSlide === 0 ? totalSlides - 1 : currentSlide - 1;
    onSlideChange(prevSlideIndex);
  };

  const handleNext = () => {
    const nextSlideIndex = (currentSlide + 1) % totalSlides;
    onSlideChange(nextSlideIndex);
  };

  return (
    <div className="bg-black bg-opacity-30 p-3 flex-shrink-0">
      <div className="flex items-center justify-between">
        {/* Previous Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevious}
          className="text-white hover:bg-white/20 border-0"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Προηγούμενο
        </Button>

        {/* Slide Indicators */}
        <div className="flex items-center space-x-2">
          {Array.from({ length: totalSlides }, (_, index) => (
            <button
              key={index}
              onClick={() => onSlideChange(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide
                  ? 'bg-white scale-125'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Auto-play Toggle */}
        {onToggleAutoSlide && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleAutoSlide}
            className="text-white hover:bg-white/20 border-0"
            title={autoSlide ? 'Pause auto-slide' : 'Start auto-slide'}
          >
            {autoSlide ? (
              <>
                <Pause className="w-4 h-4 mr-1" />
                Παύση
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                Αυτόματο
              </>
            )}
          </Button>
        )}

        {/* Next Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          className="text-white hover:bg-white/20 border-0"
        >
          Επόμενο
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Slide Counter */}
      <div className="text-center mt-2">
        <span className="text-xs text-white/75">
          Slide {currentSlide + 1} από {totalSlides}
        </span>
      </div>
    </div>
  );
}
