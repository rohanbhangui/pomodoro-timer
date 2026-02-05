interface TimeDisplayProps {
  time: string;
  editable?: boolean;
  onEdit?: () => void;
}

export default function TimeDisplay({ time, editable, onEdit }: TimeDisplayProps) {
  return (
    <div
      className={`text-6xl font-medium tracking-tight ${
        editable ? 'cursor-pointer select-none active:scale-95 transition-transform' : ''
      }`}
      onClick={editable ? onEdit : undefined}
    >
      {time}
    </div>
  );
}
