'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

/**
 * BuildingRevealBackground Component
 *
 * Animated SVG background with scanning lines that reveal a building shape.
 * The building is positioned on the right side (1/4 of the screen width).
 * Uses GSAP for synchronized animations with infinite loop.
 */
export default function BuildingRevealBackground() {
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<gsap.core.Timeline | null>(null);

  // Get CSS variable value for SVG stroke (SVG doesn't reliably support CSS variables in attributes)
  const [strokeColor, setStrokeColor] = useState('#546E7A'); // Fallback: --text-secondary default value

  useEffect(() => {
    // Get CSS variable value on client side
    if (typeof window !== 'undefined') {
      const color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#546E7A';
      setStrokeColor(color);
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    // Cleanup previous animation if it exists
    if (animationRef.current) {
      animationRef.current.kill();
    }

    // Create GSAP Timeline with infinite repeat
    const tl = gsap.timeline({
      delay: 1,
      repeat: -1,
      repeatDelay: 2,
      defaults: { ease: 'power1.inOut' }
    });

    // Animation settings
    const scanDurationH = 6; // Horizontal scanner (moves vertically)
    const scanDurationV = 5; // Vertical scanner (moves horizontally)

    // Total distance based on viewBox (0 0 1000 600)
    const totalDistanceY = 650; // From y=-10 to y=640
    const totalDistanceX = 1100; // From x=-10 to x=1090

    // Start scanner movements simultaneously
    tl.to('#scanner-h', { y: totalDistanceY, duration: scanDurationH }, 'startScans');
    tl.to('#scanner-v', { x: totalDistanceX, duration: scanDurationV }, 'startScans');

    // Calculate when scanner reaches a specific position
    function calculateTriggerTime(targetPos: number, totalDist: number, duration: number): number {
      return ((targetPos + 10) / totalDist) * duration;
    }

    // Reveal horizontal building edges as horizontal scanner passes
    // Building horizontal lines at Y: 150, 300, 500
    const timeH1 = calculateTriggerTime(150, totalDistanceY, scanDurationH);
    const timeH2 = calculateTriggerTime(300, totalDistanceY, scanDurationH);
    const timeH3 = calculateTriggerTime(500, totalDistanceY, scanDurationH);

    tl.to('.h-edge-1', { strokeDashoffset: 0, duration: 0.8 }, `startScans+=${timeH1}`);
    tl.to('.h-edge-2', { strokeDashoffset: 0, duration: 0.8 }, `startScans+=${timeH2}`);
    tl.to('.h-edge-3', { strokeDashoffset: 0, duration: 0.8 }, `startScans+=${timeH3}`);

    // Reveal vertical building edges as vertical scanner passes
    // Building vertical lines at X: 780, 850, 950, 980
    const timeV1 = calculateTriggerTime(780, totalDistanceX, scanDurationV);
    const timeV2 = calculateTriggerTime(850, totalDistanceX, scanDurationV);
    const timeV3 = calculateTriggerTime(950, totalDistanceX, scanDurationV);
    const timeV4 = calculateTriggerTime(980, totalDistanceX, scanDurationV);

    tl.to('.v-edge-1', { strokeDashoffset: 0, duration: 1.5 }, `startScans+=${timeV1}`);
    tl.to('.v-edge-4', { strokeDashoffset: 0, duration: 1.5 }, `startScans+=${timeV2}`);
    tl.to('.v-edge-2', { strokeDashoffset: 0, duration: 1 }, `startScans+=${timeV3}`);
    tl.to('.v-edge-3', { strokeDashoffset: 0, duration: 1 }, `startScans+=${timeV4}`);

    // Fade out scanners at the end
    tl.to('#scanners', { opacity: 0, duration: 1 });

    // Store timeline reference for cleanup
    animationRef.current = tl;

    // Cleanup function
    return () => {
      if (animationRef.current) {
        animationRef.current.kill();
        animationRef.current = null;
      }
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      id="bg-animation"
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      className="fixed top-0 left-0 w-full h-full -z-10"
      style={{ pointerEvents: 'none' }}
    >
      {/* Building Group - Right side (1/4 of screen) */}
      <g id="building-group" strokeLinecap="round" opacity="0.32">
        {/* Horizontal building edges */}
        <g className="building-horizontals">
          <line
            x1="780"
            y1="150"
            x2="950"
            y2="150"
            className="b-edge h-edge-1"
            style={{ stroke: strokeColor }}
            strokeWidth="3"
            fill="none"
            strokeDasharray="1000"
            strokeDashoffset="1000"
          />
          <line
            x1="780"
            y1="300"
            x2="950"
            y2="300"
            className="b-edge h-edge-2"
            style={{ stroke: strokeColor }}
            strokeWidth="3"
            fill="none"
            strokeDasharray="1000"
            strokeDashoffset="1000"
          />
          <line
            x1="750"
            y1="500"
            x2="980"
            y2="500"
            className="b-edge h-edge-3"
            style={{ stroke: strokeColor }}
            strokeWidth="3"
            fill="none"
            strokeDasharray="1000"
            strokeDashoffset="1000"
          />
        </g>

        {/* Vertical building edges */}
        <g className="building-verticals">
          <line
            x1="780"
            y1="150"
            x2="780"
            y2="500"
            className="b-edge v-edge-1"
            style={{ stroke: strokeColor }}
            strokeWidth="3"
            fill="none"
            strokeDasharray="1000"
            strokeDashoffset="1000"
          />
          <line
            x1="950"
            y1="150"
            x2="950"
            y2="350"
            className="b-edge v-edge-2"
            style={{ stroke: strokeColor }}
            strokeWidth="3"
            fill="none"
            strokeDasharray="1000"
            strokeDashoffset="1000"
          />
          <line
            x1="980"
            y1="350"
            x2="980"
            y2="500"
            className="b-edge v-edge-3"
            style={{ stroke: strokeColor }}
            strokeWidth="3"
            fill="none"
            strokeDasharray="1000"
            strokeDashoffset="1000"
          />
          <line
            x1="850"
            y1="150"
            x2="850"
            y2="500"
            className="b-edge v-edge-4"
            style={{ stroke: strokeColor }}
            strokeWidth="3"
            fill="none"
            strokeDasharray="1000"
            strokeDashoffset="1000"
            opacity="0.5"
          />
        </g>
      </g>

      {/* Scanning Lines */}
      <g id="scanners" strokeWidth="1" opacity="0.25">
        {/* Horizontal scanner (moves vertically) */}
        <line
          id="scanner-h"
          x1="-100"
          y1="-10"
          x2="1100"
          y2="-10"
          style={{ stroke: strokeColor }}
        />
        {/* Vertical scanner (moves horizontally) */}
        <line
          id="scanner-v"
          x1="-10"
          y1="-100"
          x2="-10"
          y2="700"
          style={{ stroke: strokeColor }}
        />
      </g>
    </svg>
  );
}
