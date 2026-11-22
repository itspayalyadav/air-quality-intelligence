"use client";

import { useLocation } from "@/lib/location";
import { pmTrend } from "@/lib/history";
import type { AirData } from "@/lib/types";
import { PollutantGrid, StaleNotice } from "@/components/pollutant-grid";
import { TrendChart } from "@/components/trend-chart";
import { WeatherStrip } from "@/components/weather-strip";
import { Card, EmptyState, SectionHeading, Skeleton } from "@/components/ui";
import { AlertIcon } from "@/components/icons";

function thresholdAlert(air: AirData) {
  if (air.usAqi != null && air.usAqi >= 151) {
    return `US AQI ${Math.round(air.usAqi)} — ${air.usBand?.label}. Sensitive groups should avoid outdoor exertion.`;
  }
  if (air.cpcb && air.cpcb.aqi >= 201) {
    return `CPCB AQI ${air.cpcb.aqi} — ${air.cpcb.band.label}. Reduce outdoor exposure where you can.`;
  }
  return null;
}

export default function InsightsPage() {
  const { air, place, loading, error } = useLocation();

  const trend = air ? pmTrend(air.history) : null;
  const todayAvg = trend?.last24 ?? null;
  const trendDirection = trend?.direction ?? null;
  const alert = air ? thresholdAlert(air) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">Insights</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {place.name} in context
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Pollutant breakdown, seven-day history and the weather that decides how fast today&apos;s
          pollution clears.
        </p>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm text-amber-900">
          {error.message}
        </p>
      ) : null}

      {alert ? (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3" role="status">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
          <div>
            <p className="text-sm font-medium text-red-900">Threshold alert</p>
            <p className="text-sm text-red-900">{alert}</p>
            <p className="mt-1 text-[11px] text-red-800">
              Evaluated when this page loads. Push notifications are not configured, so you will not
              be alerted while the app is closed.
            </p>
          </div>
        </div>
      ) : null}

      {!air && loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : !air && !loading ? (
        <EmptyState title="No data" body="Pick a location to load insights." />
      ) : air ? (
        <div className="space-y-6">
          <StaleNotice air={air} />

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">US AQI</p>
              <p
                className="tnum mt-2 text-4xl font-semibold"
                style={{ color: air.usBand?.color ?? "#1c1917" }}
              >
                {air.usAqi == null ? "—" : Math.round(air.usAqi)}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{air.usBand?.label ?? "Unavailable"}</p>
              <p className="mt-2 text-[11px] text-ink-muted">EPA index on modelled CAMS data</p>
            </Card>
            <Card>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">CPCB AQI</p>
              <p className="tnum mt-2 text-4xl font-semibold" style={{ color: air.cpcb?.band.color ?? "#1c1917" }}>
                {air.cpcb ? air.cpcb.aqi : "—"}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{air.cpcb?.band.label ?? "Not computable"}</p>
              <p className="mt-2 text-[11px] text-ink-muted">
                {air.cpcb
                  ? `Computed here from ${air.cpcb.sampleSize} pollutants`
                  : "Needs 3+ pollutants including PM2.5 or PM10"}
              </p>
            </Card>
            <Card>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
                Last 24 h PM2.5
              </p>
              <p className="tnum mt-2 text-4xl font-semibold text-ink">
                {todayAvg == null ? "—" : todayAvg.toFixed(1)}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                µg/m³ average
                {trendDirection ? (
                  <span className="text-ink-muted"> · {trendDirection} vs the two days before</span>
                ) : null}
              </p>
              <p className="mt-2 text-[11px] text-ink-muted">
                India&apos;s 24 h standard for PM2.5 is 60 µg/m³
              </p>
            </Card>
          </div>

          <PollutantGrid air={air} />

          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <Card>
              <SectionHeading
                eyebrow="History"
                title="Hourly PM2.5, last seven days"
                description="Modelled hourly values. Winter nights with low wind are usually the peaks."
              />
              <TrendChart history={air.history} />
            </Card>
            <WeatherStrip weather={air.weather} />
          </div>

          <Card>
            <SectionHeading eyebrow="Reading the numbers" title="How to interpret this page" />
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-ink">AQI is not a concentration</dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                  An index maps a concentration onto a 0–500 scale so different pollutants can be
                  compared. 150 US AQI is a different concentration for PM2.5 than for ozone.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-ink">US AQI vs CPCB AQI</dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                  The two systems use different breakpoints, so the same air scores differently. US
                  AQI comes from the provider; CPCB AQI here is computed from concentrations using
                  CPCB breakpoints.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-ink">Modelled, not measured</dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                  Figures come from CAMS regional models at roughly 11 km resolution. A monitor on
                  your street can read noticeably higher or lower, especially near traffic.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-ink">Weather decides dispersion</dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                  Low wind and a shallow inversion trap pollution near the ground. A windy day can
                  halve concentrations without anyone changing what they burn.
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
