"use client";

import { useState } from "react";
import type { AirData, AqiStandard } from "@/lib/types";
import { formatObservedAt } from "@/lib/format";
import { BandPill } from "./pollutant-grid";
import { Card } from "./ui";
import { HealthGuidance } from "./health-guidance";
import { RefreshIcon } from "./icons";

export function AqiHero({
  air,
  onRefresh,
  refreshing,
}: {
  air: AirData;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [standard, setStandard] = useState<AqiStandard>("us");

  const cpcb = air.cpcb;
  const value = standard === "us" ? air.usAqi : cpcb?.aqi ?? null;
  const band = standard === "us" ? air.usBand : cpcb?.band ?? null;

  const updatedLabel = formatObservedAt(air.observedAt) ?? air.observedAt;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="rise flex flex-col justify-between">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
              Current air quality
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {[air.place.name, air.place.admin].filter(Boolean).join(", ")}
              {air.place.country ? <span className="text-ink-muted"> · {air.place.country}</span> : null}
            </p>
          </div>

          <div
            className="inline-flex rounded-full border border-line bg-stone-50 p-0.5"
            role="group"
            aria-label="AQI standard"
          >
            {(
              [
                { id: "us", label: "US AQI" },
                { id: "cpcb", label: "CPCB AQI" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={standard === option.id}
                onClick={() => setStandard(option.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  standard === option.id
                    ? "bg-surface text-ink shadow-sm ring-1 ring-line"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-end gap-4">
          <p
            data-testid="aqi-value"
            className="tnum text-[76px] font-semibold leading-[0.85] tracking-[-0.03em] sm:text-[92px]"
            style={{ color: band?.color ?? "#78716c" }}
          >
            {value == null ? "—" : Math.round(value)}
          </p>
          <div className="mb-2 flex flex-col gap-2">
            {band ? (
              <span data-testid="aqi-band">
                <BandPill band={band} />
              </span>
            ) : (
              <span className="text-sm text-ink-muted">Not available</span>
            )}
            <span className="text-xs text-ink-muted">{updatedLabel}</span>
          </div>
        </div>

        <div className="mt-5">
          <ScaleStrip value={value} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-xs leading-relaxed text-ink-muted">
            {standard === "us" ? (
              <>
                US EPA AQI from CAMS modelled data, served by Open-Meteo. This is{" "}
                <strong className="font-medium text-ink-soft">not</strong> an official CPCB reading.
              </>
            ) : cpcb ? (
              <>
                Calculated here from the modelled concentrations using CPCB breakpoints ({cpcb.sampleSize}{" "}
                pollutants, driven by {cpcb.dominant ? cpcb.dominant.replace("_", ".") : "particulates"}).
                Not an official CPCB station reading.
              </>
            ) : (
              <>CPCB AQI needs at least three pollutants including PM2.5 or PM10. Not enough data is available for this location.</>
            )}
          </p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-stone-400 hover:text-ink disabled:opacity-60"
          >
            <RefreshIcon className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </Card>

      <HealthGuidance band={band} value={value} />
    </div>
  );
}

export function ScaleStrip({ value }: { value: number | null }) {
  const segments = [
    { width: 10, color: "#15803d" },
    { width: 10, color: "#b45309" },
    { width: 10, color: "#c2410c" },
    { width: 20, color: "#b91c1c" },
    { width: 25, color: "#7e22ce" },
    { width: 25, color: "#9f1239" },
  ];
  const position = value == null ? null : Math.min(100, Math.max(0, (value / 500) * 100));

  return (
    <div>
      <div className="relative flex h-1.5 w-full overflow-hidden rounded-full">
        {segments.map((segment, index) => (
          <div
            key={index}
            style={{ width: `${segment.width}%`, backgroundColor: segment.color, opacity: 0.85 }}
          />
        ))}
        {position != null ? (
          <div
            className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-ink"
            style={{ left: `calc(${position}% - 1px)` }}
          />
        ) : null}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-ink-muted">
        <span>0</span>
        <span>100</span>
        <span>200</span>
        <span>300</span>
        <span>500</span>
      </div>
    </div>
  );
}
