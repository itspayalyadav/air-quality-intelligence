"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocation } from "@/lib/location";
import { POLLUTANT_META } from "@/lib/aqi";
import { formatObservedAt } from "@/lib/format";
import type { AqiStandard } from "@/lib/types";
import { LocationButton } from "@/components/location-button";
import { BandPill } from "@/components/pollutant-grid";
import { ScaleStrip } from "@/components/aqi-hero";
import { AlertIcon, ArrowIcon, RefreshIcon } from "@/components/icons";

function observedLabel(iso: string) {
  return formatObservedAt(iso) ?? "time unavailable";
}

function ageLabel(iso: string) {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return null;
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
}

export function HeroReading({ className = "" }: { className?: string }) {
  const { air, place, error } = useLocation();

  return (
    <div
      className={`border border-line-strong bg-surface shadow-[0_40px_80px_-50px_rgba(23,28,36,0.55)] ${className}`}
      data-testid="hero-reading"
    >
      <div className="h-[3px] bg-accent" aria-hidden="true" />

      <div className="flex items-start justify-between gap-4 px-5 pt-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Live reading
          </p>
          <p className="mt-1 text-sm font-medium text-ink">{place.name}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 pt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[#15803d] motion-safe:animate-pulse"
            aria-hidden="true"
          />
          Modelled
        </span>
      </div>

      {air ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-3">
            <p
              className="tnum text-[56px] font-semibold leading-[0.85] tracking-[-0.04em]"
              style={{ color: air.usBand?.color ?? "var(--color-ink)" }}
              data-testid="hero-aqi"
            >
              {air.usAqi == null ? "-" : Math.round(air.usAqi)}
            </p>
            {air.usBand ? <BandPill band={air.usBand} /> : null}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line px-5 py-3">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">PM2.5</dt>
              <dd className="tnum mt-1 text-sm text-ink">
                {air.pollutants.pm2_5.value == null
                  ? "-"
                  : Math.round(air.pollutants.pm2_5.value)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">PM10</dt>
              <dd className="tnum mt-1 text-sm text-ink">
                {air.pollutants.pm10.value == null ? "-" : Math.round(air.pollutants.pm10.value)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">CPCB</dt>
              <dd className="tnum mt-1 text-sm text-ink">
                {air.cpcb?.aqi == null ? "-" : Math.round(air.cpcb.aqi)}
              </dd>
            </div>
          </dl>
          <p className="border-t border-line px-5 py-2.5 text-[10.5px] leading-relaxed text-ink-muted">
            US AQI, CAMS modelled hourly. Not a station measurement.
          </p>
        </>
      ) : error ? (
        <p className="px-5 py-6 text-sm leading-relaxed text-ink-soft" data-testid="hero-fallback">
          A live reading is not available right now. Nothing is filled in to look complete.
        </p>
      ) : (
        <div className="animate-pulse px-5 py-6" aria-hidden="true">
          <div className="h-12 w-24 bg-accent-soft" />
          <div className="mt-4 h-3 w-full bg-line" />
          <div className="mt-2 h-3 w-2/3 bg-line" />
        </div>
      )}
    </div>
  );
}

export function LiveAirSection() {
  const { air, place, loading, error, refresh } = useLocation();
  const [standard, setStandard] = useState<AqiStandard>("us");

  const value = standard === "us" ? (air?.usAqi ?? null) : (air?.cpcb?.aqi ?? null);
  const band = standard === "us" ? (air?.usBand ?? null) : (air?.cpcb?.band ?? null);
  const age = air ? ageLabel(air.observedAt) : null;

  return (
    <section id="live-air" aria-labelledby="live-air-heading" className="border-b border-line">
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          Live air intelligence
        </p>
        <h2
          id="live-air-heading"
          className="mt-4 max-w-[20ch] text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-ink"
        >
          A number you can trace back to its source.
        </h2>
        <p className="mt-5 max-w-xl text-[15px] leading-[1.7] text-ink-soft">
          This is the same reading the product uses. Change the city, switch between the US EPA
          index and the CPCB estimate, and see what each one actually represents.
        </p>

        <div className="mt-12 border border-line-strong bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#15803d]" aria-hidden="true" />
              <p className="text-sm font-medium text-ink">
                {place.name}
                {place.country ? (
                  <span className="font-normal text-ink-muted">, {place.country}</span>
                ) : null}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-ink-muted sm:inline">Change city</span>
              <LocationButton />
            </div>
          </div>

          {!air && error ? (
            <div className="px-5 py-10 sm:px-7" data-testid="live-fallback">
              <div className="flex items-start gap-3">
                <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
                <div>
                  <p className="text-base font-medium text-ink">
                    Live readings are unavailable right now
                  </p>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
                    {error.message} No value is invented to fill the gap. Try again, or open the
                    dashboard once the provider responds.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={refresh}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink disabled:opacity-60"
                    >
                      <RefreshIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                      Try again
                    </button>
                    <Link
                      href="/dashboard"
                      className="link-underline text-sm font-medium text-ink hover:text-accent"
                    >
                      Explore Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : !air ? (
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]" aria-hidden="true">
              <div className="animate-pulse px-5 py-10 sm:px-7">
                <div className="h-4 w-40 bg-line" />
                <div className="mt-6 h-20 w-48 bg-accent-soft" />
                <div className="mt-6 h-2 w-full bg-line" />
                <div className="mt-6 h-3 w-3/4 bg-line" />
              </div>
              <div className="grid grid-cols-2 border-t border-line lg:border-l lg:border-t-0">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="border-b border-line p-5 last:border-b-0 sm:p-6 even:border-l"
                  >
                    <div className="h-3 w-16 bg-line" />
                    <div className="mt-3 h-5 w-20 bg-line" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {error ? (
                <p className="border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-sm text-amber-900 sm:px-7">
                  Refresh failed, showing the last reading. {error.message}
                </p>
              ) : null}

              <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                <div className="flex flex-col border-b border-line bg-accent-soft/50 px-5 py-8 sm:px-7 lg:border-b-0 lg:border-r">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                      {standard === "us" ? "Open-Meteo US AQI" : "CPCB estimate"}
                    </p>
                    <div
                      className="inline-flex rounded-full border border-line-strong bg-surface p-0.5"
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
                              ? "bg-accent text-white"
                              : "text-ink-muted hover:text-ink"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-end gap-4">
                    <p
                      className="tnum text-[clamp(4.5rem,9vw,7rem)] font-semibold leading-[0.8] tracking-[-0.05em]"
                      style={{ color: band?.color ?? "var(--color-ink)" }}
                      data-testid="landing-aqi"
                    >
                      {value == null ? "-" : Math.round(value)}
                    </p>
                    <div className="flex flex-col gap-2 pb-1">
                      {band ? (
                        <span data-testid="landing-band">
                          <BandPill band={band} />
                        </span>
                      ) : (
                        <span className="text-sm text-ink-muted">Not available</span>
                      )}
                      <span className="text-xs text-ink-muted">
                        Observed {observedLabel(air.observedAt)}
                        {age ? ` (${age})` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="mt-8">
                    <ScaleStrip value={value} />
                  </div>

                  <p className="mt-auto max-w-md pt-6 text-xs leading-relaxed text-ink-soft">
                    {standard === "us" ? (
                      <>
                        US EPA AQI from CAMS modelled data, served by Open-Meteo. Not an official
                        CPCB reading or a regulatory station measurement.
                      </>
                    ) : air.cpcb ? (
                      <>
                        Calculated here from the modelled concentrations using CPCB breakpoints (
                        {air.cpcb.sampleSize} pollutants, driven by{" "}
                        {air.cpcb.dominant
                          ? POLLUTANT_META[air.cpcb.dominant].label
                          : "particulates"}
                        ). Not an official CPCB station reading.
                      </>
                    ) : (
                      <>
                        CPCB AQI needs at least three pollutants including PM2.5 or PM10. This
                        location does not have enough data for the estimate.
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-col">
                  <dl className="grid flex-1 grid-cols-2">
                    {[
                      {
                        label: "PM2.5",
                        value:
                          air.pollutants.pm2_5.value == null
                            ? "-"
                            : Math.round(air.pollutants.pm2_5.value),
                        unit: "µg/m³",
                      },
                      {
                        label: "PM10",
                        value:
                          air.pollutants.pm10.value == null
                            ? "-"
                            : Math.round(air.pollutants.pm10.value),
                        unit: "µg/m³",
                      },
                      {
                        label: "Temperature",
                        value:
                          air.weather?.temperatureC == null
                            ? "-"
                            : air.weather.temperatureC.toFixed(1),
                        unit: "°C",
                      },
                      {
                        label: "Wind",
                        value:
                          air.weather?.windKph == null
                            ? "-"
                            : air.weather.windKph.toFixed(1),
                        unit: air.weather?.windCompass
                          ? `km/h ${air.weather.windCompass}`
                          : "km/h",
                      },
                    ].map((item, index) => (
                      <div
                        key={item.label}
                        className={`p-5 sm:p-7 ${index < 2 ? "border-b border-line" : ""} ${
                          index % 2 === 1 ? "border-l border-line" : ""
                        }`}
                      >
                        <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                          {item.label}
                        </dt>
                        <dd className="tnum mt-2 text-[28px] font-medium leading-none text-ink">
                          {item.value}
                          <span className="ml-1.5 text-xs font-normal text-ink-muted">
                            {item.value === "-" ? "" : item.unit}
                          </span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="border-t border-line px-5 py-4 text-[11px] leading-relaxed text-ink-muted sm:px-7">
                    Concentrations are modelled hourly values. Source: Copernicus Atmosphere
                    Monitoring Service via Open-Meteo.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-4 sm:px-7">
                <p className="text-[11px] leading-relaxed text-ink-muted" data-testid="landing-source">
                  Modelled, not measured at a station. Air at your street can differ.
                </p>
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={refresh}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft transition hover:text-ink disabled:opacity-60"
                  >
                    <RefreshIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    {loading ? "Refreshing" : "Refresh"}
                  </button>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition hover:gap-2.5"
                  >
                    Explore Dashboard
                    <ArrowIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function AiContextPanel() {
  const { air, place } = useLocation();

  const rows = [
    { label: "Location", value: place.name },
    { label: "US AQI", value: air?.usAqi == null ? "not loaded" : String(Math.round(air.usAqi)) },
    { label: "CPCB estimate", value: air?.cpcb ? String(air.cpcb.aqi) : "not available" },
    {
      label: "Dominant pollutant",
      value: air?.cpcb?.dominant ? POLLUTANT_META[air.cpcb.dominant].label : "not available",
    },
    {
      label: "PM2.5",
      value:
        air?.pollutants.pm2_5.value == null
          ? "not loaded"
          : `${Math.round(air.pollutants.pm2_5.value)} µg/m³`,
    },
    {
      label: "Wind",
      value:
        air?.weather?.windKph == null
          ? "not loaded"
          : `${air.weather.windKph.toFixed(1)} km/h${
              air.weather.windCompass ? ` ${air.weather.windCompass}` : ""
            }`,
    },
  ];

  return (
    <div className="border border-line-strong bg-surface">
      <div className="h-[3px] bg-accent" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
          Sent with every question
        </p>
        <span className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">
          Server fetch
        </span>
      </div>
      <dl className="divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 px-5 py-3">
            <dt className="text-xs text-ink-muted">{row.label}</dt>
            <dd className="tnum text-right text-[13px] font-medium text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-line px-5 py-4 text-[11px] leading-relaxed text-ink-muted">
        The browser never supplies these numbers. The server fetches them for the selected place
        before calling the model.
      </p>
    </div>
  );
}
