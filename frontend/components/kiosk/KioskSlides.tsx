'use client';

import { useState, useEffect, useRef } from 'react';
import { KioskSlide } from '@/types/kiosk';
import { LAYOUT_CONFIGS } from '@/lib/kiosk/config';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { renderWidget } from './widgets';

interface KioskSlidesProps {
  slides: KioskSlide[];
  currentSlide: number;
  onSlideChange: (index: number) => void;
  autoSlide: boolean;
  slideDuration: number;
  isLoading: boolean;
  error?: string | null;
}

export default function KioskSlides({
  slides,
  currentSlide,
  onSlideChange,
  autoSlide,
  slideDuration,
  isLoading,
  error
}: KioskSlidesProps) {
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoSlide);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Auto-slide functionality
  useEffect(() => {
    if (isAutoPlaying && slides.length > 1) {
      intervalRef.current = setInterval(() => {
        const nextSlideIndex = (currentSlide + 1) % slides.length;
        onSlideChange(nextSlideIndex);
      }, slideDuration * 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoPlaying, currentSlide, slides.length, slideDuration, onSlideChange]);

  // Sync with external autoSlide prop
  useEffect(() => {
    setIsAutoPlaying(autoSlide);
  }, [autoSlide]);

  // Touch/swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && slides.length > 1) {
      const nextSlideIndex = (currentSlide + 1) % slides.length;
      onSlideChange(nextSlideIndex);
    }
    if (isRightSwipe && slides.length > 1) {
      const prevSlideIndex = currentSlide === 0 ? slides.length - 1 : currentSlide - 1;
      onSlideChange(prevSlideIndex);
    }
  };

  // Handle previous slide
  const handlePrevious = () => {
    if (slides.length > 1) {
      const prevSlideIndex = currentSlide === 0 ? slides.length - 1 : currentSlide - 1;
      onSlideChange(prevSlideIndex);
    }
  };

  // Handle next slide
  const handleNext = () => {
    if (slides.length > 1) {
      const nextSlideIndex = (currentSlide + 1) % slides.length;
      onSlideChange(nextSlideIndex);
    }
  };

  // Toggle auto-play
  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg text-white">Φόρτωση slides...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Σφάλμα</h2>
          <p className="text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  // No slides state
  if (slides.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📺</div>
          <h2 className="text-xl font-bold text-white mb-2">Δεν υπάρχουν slides</h2>
          <p className="text-gray-300">Προσθέστε widgets για να δημιουργήσετε slides</p>
        </div>
      </div>
    );
  }

  const currentSlideData = slides[currentSlide];

  return (
    <div className="h-full relative overflow-hidden">
      {/* Slide Navigation Controls */}
      {slides.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/20 hover:bg-black/40 text-white border-0"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/20 hover:bg-black/40 text-white border-0"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}

      {/* Auto-play Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleAutoPlay}
        className="absolute top-4 right-4 z-10 bg-black/20 hover:bg-black/40 text-white border-0"
      >
        {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>

      {/* Slide Content */}
      <div
        className="h-full w-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="h-full w-full"
          >
            <SlideContent slide={currentSlideData} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide Indicator */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => onSlideChange(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide
                  ? 'bg-white scale-125'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Slide Content Component
interface SlideContentProps {
  slide: KioskSlide;
}

function SlideContent({ slide }: SlideContentProps) {
  const layoutConfig = LAYOUT_CONFIGS[slide.layout];

  if (!layoutConfig) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-4xl mb-2">❌</div>
          <p className="text-red-200">Invalid layout: {slide.layout}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full w-full p-4 grid gap-4"
      style={{
        gridTemplate: layoutConfig.gridTemplate
      }}
    >
      {slide.widgets.map((widget, index) => (
        <div
          key={widget.id}
          className="bg-gradient-to-br from-slate-900/50 via-blue-900/30 to-indigo-900/50 backdrop-blur-sm rounded-xl border border-blue-500/20 shadow-lg overflow-hidden"
        >
          <div className="bg-black bg-opacity-20 p-2 border-b border-blue-500/20">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-300 rounded"></div>
              <h3 className="text-sm font-semibold text-white truncate">
                {widget.name}
              </h3>
            </div>
          </div>
          
          <div className="p-3 h-full overflow-hidden">
            {renderWidget(widget.id as any, {
              data: {}, // Will be populated by parent component
              isLoading: false,
              error: null,
              settings: widget.settings
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
