'use client';

import { useKeenSlider } from 'keen-slider/react';
import { useEffect, useRef } from 'react';
import { Announcement } from '@/lib/api';
import Link from 'next/link';
import { Bell, Calendar, ArrowRight } from 'lucide-react';

interface Props {
  announcements: Announcement[];
}

export default function AnnouncementsCarousel({ announcements }: Readonly<Props>) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mouseOver = useRef(false);

  const [sliderContainerRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: true,
    slides: {
      perView: 1,
      spacing: 0,
    },
    renderMode: 'performance',
  });

  useEffect(() => {
    const slider = instanceRef.current;
    if (!slider || !slider.track?.details) return;
  
    intervalRef.current = setInterval(() => {
      if (!mouseOver.current) {
        slider.next();
      }
    }, 8000); // Increased interval for better UX
  
    const container = sliderRef.current;
    if (container) {
      container.addEventListener('mouseenter', () => (mouseOver.current = true));
      container.addEventListener('mouseleave', () => (mouseOver.current = false));
    }
  
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (container) {
        container.removeEventListener('mouseenter', () => (mouseOver.current = true));
        container.removeEventListener('mouseleave', () => (mouseOver.current = false));
      }
    };
  }, [instanceRef]);
  
  // If no announcements, don't render anything
  if (!announcements || announcements.length === 0) {
    return null;
  }

  return (
    <div ref={sliderRef} className="relative">
      <div
        ref={sliderContainerRef}
        className="flex overflow-hidden relative w-full h-[200px] rounded-lg" // Reduced height
      >
        {announcements.slice(0, 3).map((a) => {
          const start = new Date(a.start_date);
          const end = new Date(a.end_date);
          const now = new Date();

          let status = 'Ενεργή';
          let statusColor = 'bg-green-100 text-green-700';
          if (now < start) {
            status = 'Προσεχώς';
            statusColor = 'bg-yellow-100 text-yellow-700';
          } else if (now > end) {
            status = 'Ληγμένη';
            statusColor = 'bg-gray-100 text-gray-700';
          }

          return (
            <Link
              key={a.id}
              href={`/announcements/${a.id}`}
              className="flex-shrink-0 w-full h-full px-6 py-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white transition-all duration-700 ease-in-out hover:from-blue-700 hover:to-blue-800"
              style={{ minWidth: '100%' }}
            >
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <Bell className="w-5 h-5 mr-2" />
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor}`}>
                        {status}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 opacity-70" />
                  </div>
                  <h2 className="text-xl font-bold mb-2 line-clamp-2">{a.title}</h2>
                  <p className="text-sm opacity-90 mb-3 line-clamp-2">
                    {a.description}
                  </p>
                </div>
                <div className="flex items-center text-xs opacity-80">
                  <Calendar className="w-3 h-3 mr-1" />
                  {start.toLocaleDateString('el-GR')} – {end.toLocaleDateString('el-GR')}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      
      {/* Navigation Dots */}
      {announcements.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {announcements.slice(0, 3).map((_, index) => (
            <button
              key={index}
              onClick={() => instanceRef.current?.moveToIdx(index)}
              className="w-2 h-2 rounded-full bg-blue-300 hover:bg-blue-400 transition-colors duration-200"
            />
          ))}
        </div>
      )}
    </div>
  );
}
