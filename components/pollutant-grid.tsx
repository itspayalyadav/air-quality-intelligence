"use client";

import type { AirData, Band } from "@/lib/types";
import { POLLUTANT_KEYS, POLLUTANT_META, pollutantScale } from "@/lib/aqi";
import { SectionHeading, Skeleton } from "./ui";
import { AlertIcon } from "./icons";

export function PollutantGrid({ air }: { air: AirData }) {
  return (
    <section aria-labelledby="pollutants-heading">
      <SectionHeading
        eyebrow="Breakdown"
        title="What is in the air"
        description="Concentrations are modelled hourly values in micrograms per cubic metre. AQI is an index, not a concentration — the two are shown separately."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {POLLUTANT_KEYS.map((key) => {
          const reading = air.pollutants[key];
          const meta = POLLUTANT_META[key];
          const share = pollutantScale(key, reading?.value);
          const primary = air.cpcb?.dominant === key;
          return (
            <div
              key={key}
              className={`rounded-xl border bg-surface p-3.5 ${
                primary ? "border-stone-400" : "border-line"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium text-ink-soft">{meta.label}</span>
                {primary ? (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-accent">
                    driver
                  </span>
                ) : null}
              </div>
              <p className="tnum mt-1.5 font-mono text-xl text-ink">
                {reading?.value == null ? "—" : Math.round(reading.value)}
                <span className="ml-1 text-[10px] font-sans text-ink-muted">{meta.unit}</span>
              </p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-stone-500"
                  style={{ width: `${Math.round(share * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-ink-muted">
                {reading?.usSubIndex == null ? "no sub-index" : `US sub-index ${reading.usSubIndex}`}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function PollutantGridSkeleton() {
  return (
    <section>
      <SectionHeading eyebrow="Breakdown" title="What is in the air" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[104px]" />
        ))}
      </div>
    </section>
  );
}

export function StaleNotice({ air }: { air: AirData }) {
  if (!air.stale) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        This reading is from {new Date(air.observedAt).toLocaleString()} and is more than three
        hours old. Treat it as background, not as the air outside right now.
      </p>
    </div>
  );
}

export function BandPill({ band, label }: { band: Band; label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{ color: band.color, backgroundColor: band.soft, borderColor: band.border }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: band.color }} />
      {label ?? band.label}
    </span>
  );
}
