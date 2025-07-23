'use client';

import { useKeenSlider } from 'keen-slider/react';
import { useEffect, useRef } from 'react';
import { Announcement } from '@/lib/api';
import Link from 'next/link';

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
    }, 6000);
  
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
  

  return (
    <div ref={sliderRef}>
      <div
        ref={sliderContainerRef}
        className="flex overflow-hidden relative w-full max-w-[1000%] mx-auto h-[300px] rounded-xl"
      >
        {announcements.slice(0, 3).map((a) => {
          const start = new Date(a.start_date);
          const end = new Date(a.end_date);
          const now = new Date();

          let status = 'Ενεργή';
          if (now < start) {
            status = 'Προσεχώς';
          } else if (now > end) {
            status = 'Ληγμένη';
          }

          return (
            <Link
              key={a.id}
              href={`/announcements/${a.id}`}
              className="flex-shrink-0 w-full h-full px-6 py-8 bg-blue-800 text-white transition-all duration-700 ease-in-out"
              style={{ minWidth: '100%' }}
            >
              <div className="flex flex-col justify-between h-full">
                <div>
                  <h2 className="text-3xl font-bold mb-3">{a.title}</h2>
                  <p className="text-sm opacity-80 mb-2">
                    {start.toLocaleDateString('el-GR')} – {end.toLocaleDateString('el-GR')} ({status})
                  </p>
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {a.description}
                  </p>
                </div>
                <div className="mt-6">
                  <span className="inline-block bg-white text-blue-800 text-xs font-semibold px-3 py-1 rounded">
                    Δες περισσότερα →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
