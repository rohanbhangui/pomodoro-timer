interface TimerPillProps {
  time: string;
  progress: number; // 0 to 1, representing position from top to bottom
  editable?: boolean;
  onEditMinutes?: (e: React.MouseEvent) => void;
  onEditSeconds?: (e: React.MouseEvent) => void;
  animate?: boolean; // Whether to animate position changes
  wobble?: boolean; // Whether to apply wobble animation
}

export default function TimerPill({ time, progress, editable, onEditMinutes, onEditSeconds, animate = true, wobble = false }: TimerPillProps) {
  const [minutes, seconds] = time.split(':');
  
  // Clamp progress between 0 and 1, allow negative for visual feedback
  const clampedProgress = Math.max(-0.1, Math.min(1, progress));
  
  return (
    <div
      className={`absolute ${animate ? 'transition-all duration-1000 ease-linear' : ''} ${wobble ? 'wobble-once' : ''}`}
      style={{
        top: `${clampedProgress * 70 + 10}%`, // Start at 10%, end at 80%
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      <div className="bg-black rounded-full px-8 py-4 min-w-[200px] md:min-w-[140px] flex items-center justify-center gap-0" style={{ WebkitTextSizeAdjust: 'none', textSizeAdjust: 'none' }}>
        {editable ? (
          <>
            <span 
              className="text-white text-5xl md:text-3xl font-medium tracking-tight cursor-pointer select-none hover:opacity-80 active:scale-95 transition-all"
              style={{ WebkitTextSizeAdjust: 'none', textSizeAdjust: 'none', fontSize: window.innerWidth < 768 ? '3rem' : '1.875rem' }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onEditMinutes?.(e);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {minutes}
            </span>
            <span className="text-white text-5xl md:text-3xl font-medium tracking-tight" style={{ WebkitTextSizeAdjust: 'none', textSizeAdjust: 'none', fontSize: window.innerWidth < 768 ? '3rem' : '1.875rem' }}>:</span>
            <span 
              className="text-white text-5xl md:text-3xl font-medium tracking-tight cursor-pointer select-none hover:opacity-80 active:scale-95 transition-all"
              style={{ WebkitTextSizeAdjust: 'none', textSizeAdjust: 'none', fontSize: window.innerWidth < 768 ? '3rem' : '1.875rem' }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onEditSeconds?.(e);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {seconds}
            </span>
          </>
        ) : (
          <span className="text-white text-5xl md:text-3xl font-medium tracking-tight" style={{ WebkitTextSizeAdjust: 'none', textSizeAdjust: 'none', fontSize: window.innerWidth < 768 ? '3rem' : '1.875rem' }}>
            {time}
          </span>
        )}
      </div>
    </div>
  );
}
