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

  const handleClick = (e: React.MouseEvent) => {
    // Only handle clicks if the pill is editable
    if (!editable) return;
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    
    // Determine if click was on left half (minutes) or right half (seconds)
    if (clickX < width / 2) {
      // Left half - minutes
      e.stopPropagation();
      e.preventDefault();
      onEditMinutes?.(e);
    } else {
      // Right half - seconds
      e.stopPropagation();
      e.preventDefault();
      onEditSeconds?.(e);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const touch = e.touches[0];
    
    startPos.current = { x: touch.clientX, y: touch.clientY };
    setIsDragging(false);
    
    // Check if clicked on minutes or seconds
    const clickedElement = target.closest('.minutes-click') ? 'minutes' 
                         : target.closest('.seconds-click') ? 'seconds' 
                         : null;
    
    if (clickedElement) {
      (startPos.current as any).clickTarget = clickedElement;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startPos.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - startPos.current.x);
    const deltaY = Math.abs(touch.clientY - startPos.current.y);
    
    if (deltaX > 5 || deltaY > 5) {
      // It's a drag - stop tracking
      setIsDragging(true);
      startPos.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!startPos.current) return;
    
    // If it wasn't a drag and we clicked on a number, increment it
    if (!isDragging) {
      const clickTarget = (startPos.current as any).clickTarget;
      if (clickTarget === 'minutes') {
        e.stopPropagation();
        e.preventDefault();
        onEditMinutes?.(e as any);
      } else if (clickTarget === 'seconds') {
        e.stopPropagation();
        e.preventDefault();
        onEditSeconds?.(e as any);
      }
    }
    
    startPos.current = null;
    setTimeout(() => setIsDragging(false), 0);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    
    startPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(false);
    
    // Check if clicked on minutes or seconds (or their children)
    const clickedElement = target.closest('.minutes-click') ? 'minutes' 
                         : target.closest('.seconds-click') ? 'seconds' 
                         : null;
    
    if (clickedElement) {
      (startPos.current as any).clickTarget = clickedElement;
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
        e.stopPropagation();
        e.preventDefault();
        onEditMinutes?.(e as any);
      } else if (clickTarget === 'seconds') {
        e.stopPropagation();
        e.preventDefault();
        onEditSeconds?.(e as any);
      }
    }
    
    startPos.current = null;
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
      className={`relative ${wobble ? 'wobble-once' : ''}`}
    >
      <div 
        className="bg-black rounded-full px-8 py-4 min-w-[200px] md:min-w-[140px] flex items-center justify-center gap-0" 
        style={{ WebkitTextSizeAdjust: 'none', textSizeAdjust: 'none', pointerEvents: 'auto' }}
        onClick={handleClick}
      >
        {editable ? (
          <>
            <span 
              className="text-white text-5xl md:text-3xl font-medium tracking-tight cursor-pointer select-none hover:opacity-80 active:scale-95 transition-all minutes-click"
              style={{ WebkitTextSizeAdjust: 'none', textSizeAdjust: 'none', fontSize, pointerEvents: 'none' }}
            >
              {minutes}
            </span>
            <span className="text-white text-5xl md:text-3xl font-medium tracking-tight" style={{ WebkitTextSizeAdjust: 'none', textSizeAdjust: 'none', fontSize, pointerEvents: 'none' }}>:</span>
            <span 
              className="text-white text-5xl md:text-3xl font-medium tracking-tight cursor-pointer select-none hover:opacity-80 active:scale-95 transition-all seconds-click"
              style={{ WebkitTextSizeAdjust: 'none', textSizeAdjust: 'none', fontSize, pointerEvents: 'none' }}
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
