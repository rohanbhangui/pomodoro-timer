interface SwipeIndicatorProps {
  show: boolean;
}

export default function SwipeIndicator({ show }: SwipeIndicatorProps) {
  if (!show) return null;

  return (
    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
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
