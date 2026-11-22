import { EmptyState } from "./ui";
import type { History } from "@/lib/types";

export function TrendChart({ history }: { history: History }) {
  const points = history.pm25
    .map((value, index) => ({ value, time: history.time[index] }))
    .filter((point): point is { value: number; time: string } => point.value != null && Boolean(point.time));

  if (points.length < 6) {
    return (
      <EmptyState
        title="No trend for this location"
        body="Historical concentrations were not returned for this place. Future readings will appear here once the provider has them."
      />
    );
  }

  const peak = Math.max(...points.map((point) => point.value), 60);
  const scaleMax = Math.ceil(peak / 20) * 20;
  const width = 600;
  const height = 180;

  const x = (index: number) => (index / (points.length - 1)) * width;
  const y = (value: number) => height - (Math.min(value, scaleMax) / scaleMax) * height;

  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  const threshold60 = y(60);
  const last24 = points.slice(-24);
  const average24 = last24.reduce((sum, point) => sum + point.value, 0) / last24.length;

  const labelOf = (index: number) =>
    new Date(points[index].time).toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-ink-soft">
          Last 24 h average{" "}
          <span className="tnum font-mono text-ink">{average24.toFixed(1)} µg/m³</span>
        </p>
        <p className="text-xs text-ink-muted">peak {Math.round(peak)} µg/m³</p>
      </div>

      <div className="relative h-44 w-full sm:h-52">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`PM2.5 over the last seven days. Peak ${Math.round(peak)} micrograms per cubic metre, last 24 hour average ${average24.toFixed(1)}.`}
        >
          <defs>
            <linearGradient id="pm25-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#57534e" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#57534e" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              x1={0}
              x2={width}
              y1={height * fraction}
              y2={height * fraction}
              stroke="#e7e5e4"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <line
            x1={0}
            x2={width}
            y1={threshold60}
            y2={threshold60}
            stroke="#b91c1c"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.5}
            vectorEffect="non-scaling-stroke"
          />

          <path d={area} fill="url(#pm25-fill)" />
          <path
            d={line}
            fill="none"
            stroke="#1c1917"
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-ink-muted">
        <span>{labelOf(0)}</span>
        <span className="hidden sm:inline">{labelOf(Math.floor(points.length / 2))}</span>
        <span>{labelOf(points.length - 1)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-ink" /> hourly PM2.5
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded border-t border-dashed border-red-700" /> India 24 h standard, 60 µg/m³
        </span>
      </div>
    </div>
  );
}
