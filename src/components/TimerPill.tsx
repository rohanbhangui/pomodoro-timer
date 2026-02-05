'use client';

import { useState, useEffect, useRef, forwardRef } from 'react';

interface TimerPillProps {
  time: string;
  progress: number; // 0 to 1, representing position from top to bottom
  editable?: boolean;
  onEditMinutes?: (e: React.MouseEvent) => void;
  onEditSeconds?: (e: React.MouseEvent) => void;
  animate?: boolean; // Whether to animate position changes
  wobble?: boolean; // Whether to apply wobble animation
}

const TimerPill = forwardRef<HTMLDivElement, TimerPillProps>(({ time, progress, editable, onEditMinutes, onEditSeconds, animate = true, wobble = false }, ref) => {
  const [minutes, seconds] = time.split(':');
  const [fontSize, setFontSize] = useState('1.875rem');
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  
  // Clamp progress between 0 and 1, allow negative for visual feedback
  const clampedProgress = Math.max(-0.1, Math.min(1, progress));
  
  // Set font size based on viewport
  useEffect(() => {
    const updateFontSize = () => {
      setFontSize(window.innerWidth < 768 ? '3rem' : '1.875rem');
    };
    updateFontSize();
    window.addEventListener('resize', updateFontSize);
    return () => window.removeEventListener('resize', updateFontSize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    startPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(false);
    
    // Store what was clicked for later
    if (target.classList.contains('minutes-click')) {
      (startPos.current as any).clickTarget = 'minutes';
    } else if (target.classList.contains('seconds-click')) {
      (startPos.current as any).clickTarget = 'seconds';
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPos.current) return;
    const deltaX = Math.abs(e.clientX - startPos.current.x);
    const deltaY = Math.abs(e.clientY - startPos.current.y);
    // If moved more than 5px in any direction, it's a drag
    if (deltaX > 5 || deltaY > 5) {
      setIsDragging(true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!startPos.current) return;
    
    // If it wasn't a drag and we clicked on a number, increment it
    if (!isDragging) {
      const clickTarget = (startPos.current as any).clickTarget;
      if (clickTarget === 'minutes') {
        e.stopPropagation(); // Only stop propagation for number clicks
        onEditMinutes?.(e as any);
      } else if (clickTarget === 'seconds') {
        e.stopPropagation(); // Only stop propagation for number clicks
        onEditSeconds?.(e as any);
      }
    }
    // If it was a drag, let the event bubble to parent for swipe handling
    
    startPos.current = null;
    // Delay resetting isDragging slightly to allow click events to check it
    setTimeout(() => setIsDragging(false), 0);
  };

  const handleMinutesClick = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onEditMinutes?.(e);
  };

  const handleSecondsClick = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onEditSeconds?.(e);
  };
  
  return (
    <div
      ref={ref}
      className={`absolute ${animate ? 'transition-all duration-1000 ease-linear' : ''} ${wobble ? 'wobble-once' : ''}`}
      style={{
        top: `${clampedProgress * 70 + 10}%`, // Start at 10%, end at 80%
        left: '50%',
        transform: 'translateX(-50%)',
        willChange: 'top',
      }}
    >
      <div 
        className="bg-black rounded-full px-8 py-4 min-w-[200px] md:min-w-[140px] flex items-center justify-center gap-0" 
        style={{ WebkitTextSizeAdjust: 'none', textSizeAdjust: 'none', pointerEvents: 'auto' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {editable ? (
          <>
            <span 
              className="text-white text-5xl md:text-3xl font-medium tracking-tight cursor-pointer select-none hover:opacity-80 active:scale-95 transition-all minutes-click"
              style={{ WebkitTextSizeAdjust: 'none', textSizeAdjust: 'none', fontSize }}
            >
              {minutes}
            </span>
            <span className="text-white text-5xl md:text-3xl font-medium tracking-tight" style={{ WebkitTextSizeAdjust: 'none', textSizeAdjust: 'none', fontSize }}>:</span>
            <span 
              className="text-white text-5xl md:text-3xl font-medium tracking-tight cursor-pointer select-none hover:opacity-80 active:scale-95 transition-all seconds-click"
              style={{ WebkitTextSizeAdjust: 'none', textSizeAdjust: 'none', fontSize }}
            >
              {seconds}
            </span>
          </>
        ) : (
          <span className="text-white text-5xl md:text-3xl font-medium tracking-tight" style={{ WebkitTextSizeAdjust: 'none', textSizeAdjust: 'none', fontSize }}>
            {time}
          </span>
        )}
      </div>
    </div>
  );
});

TimerPill.displayName = 'TimerPill';

export default TimerPill;
