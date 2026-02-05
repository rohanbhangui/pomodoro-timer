interface SwipeIndicatorProps {
  show: boolean;
  pillProgress: number; // 0 to 1, same as pill's progress value
}

export default function SwipeIndicator({ show, pillProgress }: SwipeIndicatorProps) {
  if (!show) return null;

  // Position above the pill - pill is at (1 - pillProgress) * 60 + 15
  const pillTop = (1 - pillProgress) * 60 + 15;

  return (
    <div 
      className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce"
      style={{ top: `calc(${pillTop}% - 120px)` }}
    >
      <div className="text-sm font-medium opacity-60 text-center leading-tight w-15">
        Swipe up<br />to start
      </div>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-60"
      >
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    </div>
  );
}
