export function ProgressRing({
  value,
  size = 88,
  stroke = 8,
  track = "var(--border)",
  bar = "var(--primary)",
  valueClassName = "",
  labelClassName = "text-muted-foreground",
}: {
  value: number;
  size?: number;
  stroke?: number;
  track?: string;
  bar?: string;
  valueClassName?: string;
  labelClassName?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={bar}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold leading-none ${valueClassName}`}>{value}%</span>
        <span className={`text-[10px] tracking-widest uppercase font-semibold ${labelClassName}`}>Selesai</span>
      </div>
    </div>
  );
}
