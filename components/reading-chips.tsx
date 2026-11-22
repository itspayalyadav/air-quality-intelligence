import type { AirData, Place } from "@/lib/types";
import { BandPill } from "./pollutant-grid";

/** Place, US AQI and band chips shown above the AI tools. */
export function ReadingChips({
  air,
  place,
  className = "mb-5",
  children,
}: {
  air: AirData;
  place: Place;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`${className} flex flex-wrap items-center gap-2 text-xs text-ink-soft`}>
      <span className="rounded-full border border-line bg-surface px-2.5 py-1">{place.name}</span>
      {air.usAqi != null ? (
        <span className="rounded-full border border-line bg-surface px-2.5 py-1">
          US AQI {Math.round(air.usAqi)}
        </span>
      ) : null}
      {air.usBand ? <BandPill band={air.usBand} /> : null}
      {children}
    </div>
  );
}
