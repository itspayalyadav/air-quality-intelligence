"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocation } from "@/lib/location";
import { POLLUTANT_KEYS, POLLUTANT_META } from "@/lib/aqi";
import { computeImpact, formatKg, TRAVEL_MODES } from "@/lib/impact";
import { BandPill } from "@/components/pollutant-grid";
import { TrendChart } from "@/components/trend-chart";
import { ScaleStrip } from "@/components/aqi-hero";
import { ArrowIcon, SparkIcon } from "@/components/icons";

function FeatureLink({
  href,
  label,
  tone = "light",
}: {
  href: string;
  label: string;
  tone?: "light" | "dark";
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 text-sm font-semibold ${
        tone === "dark" ? "text-canvas" : "text-accent"
      }`}
    >
      <span className="link-underline">{label}</span>
      <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}

function Unavailable({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-line-strong px-5 py-8">
      <p className="max-w-sm text-sm leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}

export function FeatureShowcase() {
  const { air, place, loading } = useLocation();
  const [distance, setDistance] = useState(7);
  const [mode, setMode] = useState("car");

  const pm25 = air?.pollutants.pm2_5.value ?? null;
  const ventilate = pm25 != null ? pm25 < 30 : null;

  const impact = computeImpact({ oneWayKm: distance, tripsPerWeek: 10, mode });
  const compareIds = ["car", "bus", "metro", "cycle"];
  const compare = compareIds
    .map((id) => impact.find((row) => row.mode.id === id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const baseline = Math.max(...compare.map((row) => row.weeklyGrams), 1);
  const selected = TRAVEL_MODES.find((item) => item.id === mode) ?? TRAVEL_MODES[0];

  return (
    <section id="features" aria-labelledby="features-heading" className="border-b-2 border-ink">
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <h2
          id="features-heading"
          className="max-w-[22ch] text-[clamp(2rem,4vw,3.4rem)] font-extrabold leading-[1.02] tracking-[-0.05em] text-ink"
        >
          Six ways to work with the same reading.
        </h2>
        <p className="mt-5 max-w-xl text-[15px] leading-[1.7] text-ink-soft">
          One live data source, six different jobs. The panels below read the same endpoint as the
          product, so what you see here is what the app shows.
        </p>

        <div className="mt-16 space-y-24 sm:mt-20 sm:space-y-28">
          {/* 01 Dashboard: live instrument plate */}
          <article className="border-t-2 border-ink pt-10" data-reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <h3 className="max-w-[22ch] text-[clamp(1.6rem,2.6vw,2.3rem)] font-extrabold leading-[1.06] tracking-[-0.045em] text-ink">
                  Every pollutant, on one screen.
                </h3>
                <p className="mt-3 max-w-lg text-[15px] leading-[1.7] text-ink-soft">
                  US and CPCB indices side by side, six concentrations, weather context and a seven
                  day trend. The dashboard is the reference every other screen links back to.
                </p>
              </div>
              <FeatureLink href="/dashboard" label="Explore Dashboard" />
            </div>

            <div className="mt-8 panel">
              <div className="h-[3px] bg-accent" aria-hidden="true" />
              {air ? (
                <>
                  <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
                    <div className="border-b border-line bg-signal-soft p-5 sm:p-7 lg:border-b-0 lg:border-r">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                        US AQI, {place.name}
                      </p>
                      <div className="mt-3 flex flex-wrap items-end gap-3">
                        <p
                          className="tnum text-[64px] font-semibold leading-[0.8] tracking-[-0.05em]"
                          style={{ color: air.usBand?.color ?? "var(--color-ink)" }}
                        >
                          {air.usAqi == null ? "-" : Math.round(air.usAqi)}
                        </p>
                        {air.usBand ? <BandPill band={air.usBand} /> : null}
                      </div>
                      <div className="mt-6">
                        <ScaleStrip value={air.usAqi} />
                      </div>
                      <p className="mt-5 text-[11px] leading-relaxed text-ink-muted">
                        {loading ? "Refreshing the reading." : "Live modelled reading."}
                      </p>
                    </div>

                    <div>
                      <dl className="grid grid-cols-2 sm:grid-cols-3">
                        {POLLUTANT_KEYS.map((key, index) => (
                          <div
                            key={key}
                            className={`p-4 sm:p-5 ${index % 3 !== 2 ? "sm:border-r" : ""} ${
                              index < 3 ? "border-b" : ""
                            } border-line`}
                          >
                            <dt className="text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                              {POLLUTANT_META[key].label}
                            </dt>
                            <dd className="tnum mt-1.5 text-lg font-medium text-ink">
                              {air.pollutants[key].value == null
                                ? "-"
                                : Math.round(air.pollutants[key].value ?? 0)}
                              <span className="ml-1 text-[10px] font-normal text-ink-muted">
                                {POLLUTANT_META[key].unit}
                              </span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <p className="border-t border-line px-4 py-3 text-[11px] text-ink-muted sm:px-5">
                        {air.weather
                          ? `${air.weather.temperatureC?.toFixed(1) ?? "-"} °C, ${
                              air.weather.humidityPct ?? "-"
                            }% humidity, ${air.weather.windKph?.toFixed(1) ?? "-"} km/h${
                              air.weather.windCompass ? ` ${air.weather.windCompass}` : ""
                            }`
                          : "Weather context unavailable for this reading."}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-5">
                  <Unavailable>
                    Live preview unavailable. The dashboard will try the same endpoint and say so
                    plainly if it fails.
                  </Unavailable>
                </div>
              )}
            </div>
          </article>

          {/* 02 Assistant: dark product surface */}
          <article className="border-t-2 border-ink pt-10" data-reveal>
            <h3 className="max-w-[26ch] text-[clamp(1.6rem,2.6vw,2.3rem)] font-extrabold leading-[1.06] tracking-[-0.045em] text-ink">
              A conversation anchored in today&apos;s numbers.
            </h3>
            <p className="mt-3 max-w-lg text-[15px] leading-[1.7] text-ink-soft">
              The assistant receives the current reading for your city from the server, then answers
              in plain language. It is told to name what is missing rather than invent a value.
            </p>
            <div className="mt-6">
              <FeatureLink href="/assistant" label="Meet AI Assistant" />
            </div>

            <div className="mt-8 bg-ink text-canvas">
              <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
                <div className="border-b border-white/15 p-5 sm:p-8 lg:border-b-0 lg:border-r">
                  <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-4">
                    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-soft">
                      <SparkIcon className="h-3.5 w-3.5" />
                      Aeris assistant
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/60">
                      {place.name}
                    </p>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <p className="max-w-[85%] bg-white/10 px-4 py-2.5 text-[13px] leading-relaxed text-white/90">
                      Is it safe to run outside at 7pm today?
                    </p>
                  </div>

                  <div className="mt-3 flex gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center bg-accent text-[10px] font-semibold text-white">
                      AI
                    </span>
                    <div className="max-w-[86%] border border-white/15 px-4 py-3 text-[13px] leading-relaxed text-white/80">
                      <p>
                        At this reading, an evening run means a longer exposure than usual. If you
                        go, a shorter loop earlier in the day is the lower-exposure choice.
                      </p>
                      <p className="mt-2 text-[11px] text-white/50">
                        Based on the current reading. Not medical advice.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2">
                    <span className="flex-1 border border-white/20 px-3 py-2.5 text-[12px] text-white/55">
                      Ask about today&apos;s air
                    </span>
                    <span className="bg-accent px-4 py-2.5 text-[12px] font-semibold text-white">
                      Send
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                    Grounding for this answer
                  </p>
                  <dl className="mt-4 divide-y divide-white/10">
                    {[
                      { label: "City", value: place.name },
                      {
                        label: "US AQI",
                        value: air?.usAqi == null ? "not loaded" : String(Math.round(air.usAqi)),
                      },
                      {
                        label: "PM2.5",
                        value:
                          pm25 == null ? "not loaded" : `${Math.round(pm25)} µg/m³`,
                      },
                      {
                        label: "Dominant",
                        value: air?.cpcb?.dominant
                          ? POLLUTANT_META[air.cpcb.dominant].label
                          : "not available",
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-baseline justify-between gap-3 py-2.5"
                      >
                        <dt className="text-[11px] text-white/55">{row.label}</dt>
                        <dd className="tnum text-right text-[12px] font-medium text-white">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 text-[11px] leading-relaxed text-white/55">
                    If Gemini is unavailable, the page says so instead of writing something
                    plausible.
                  </p>
                </div>
              </div>
            </div>
          </article>

          {/* 03 Planner: soft blue band */}
          <article className="-mx-5 border-y border-line bg-signal-soft px-5 py-12 sm:-mx-8 sm:px-8 sm:py-14 lg:-mx-12 lg:px-12" data-reveal>
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div className="flex flex-col">
                <h3 className="max-w-[18ch] text-[clamp(1.6rem,2.6vw,2.3rem)] font-extrabold leading-[1.06] tracking-[-0.045em] text-ink">
                  A day arranged around the reading.
                </h3>
                <p className="mt-3 max-w-sm text-[15px] leading-[1.7] text-ink-soft">
                  Tell the planner how you spend your day. It builds a routine around current
                  pollution levels, not generic advice.
                </p>
                <div className="mt-6 lg:mt-auto lg:pt-10">
                  <FeatureLink href="/plan" label="Build today's plan" />
                </div>
              </div>

              <ol>
                {[
                  {
                    slot: "Morning",
                    body: "A suggested window for a walk or a run, with the reason attached to it.",
                  },
                  {
                    slot: "Afternoon",
                    body: "The commute option with the lowest exposure for today's air.",
                  },
                  {
                    slot: "Evening",
                    body: "Ventilate or seal the house, and what to run indoors if you have it.",
                  },
                ].map((item, index) => (
                  <li
                    key={item.slot}
                    className="grid grid-cols-[46px_1fr] gap-5 border-t border-ink/15 py-5 sm:grid-cols-[70px_1fr] sm:gap-8 sm:py-6"
                  >
                    <span className="font-serif text-3xl italic leading-[1.1] text-accent sm:text-4xl">
                      0{index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.slot}</p>
                      <p className="mt-1 max-w-md text-sm leading-relaxed text-ink-soft">
                        {item.body}
                      </p>
                    </div>
                  </li>
                ))}
                <li className="border-t border-ink/15 pt-5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft">
                    Guidance for the current reading
                  </p>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink">
                    {air?.usBand?.activity ??
                      "The plan reads the live band before it writes a single suggestion."}
                  </p>
                </li>
              </ol>
            </div>
          </article>

          {/* 04 Indoor: asymmetric decision panels */}
          <article className="border-t-2 border-ink pt-10" data-reveal>
            <h3 className="max-w-[26ch] text-[clamp(1.6rem,2.6vw,2.3rem)] font-extrabold leading-[1.06] tracking-[-0.045em] text-ink">
              A decision about your windows, not just a number.
            </h3>
            <p className="mt-3 max-w-lg text-[15px] leading-[1.7] text-ink-soft">
              The indoor screen turns the outdoor reading into a ventilate or seal call, then gets
              specific about kitchens, purifiers and the limits of each suggestion.
            </p>
            <div className="mt-6">
              <FeatureLink href="/indoor" label="Open indoor guidance" />
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[0.62fr_1.38fr] lg:items-start">
              <div className="panel p-6 sm:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Outdoor PM2.5
                </p>
                <p className="tnum mt-3 text-[56px] font-semibold leading-none tracking-[-0.04em] text-ink">
                  {pm25 == null ? "-" : Math.round(pm25)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">µg/m³ in {place.name}</p>
                <p className="mt-6 border-t border-line pt-4 text-[12px] leading-relaxed text-ink-soft">
                  This is the outdoor reading. Indoor air is never measured by this product.
                </p>
              </div>

              <div className="border border-ink/15 bg-accent-soft p-6 sm:p-8 lg:mt-14">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                  Today&apos;s call
                </p>
                <p className="mt-3 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
                  {ventilate == null
                    ? "Waiting for a reading"
                    : ventilate
                      ? "Open the windows"
                      : "Keep them closed"}
                </p>
                <p className="mt-4 max-w-lg text-[13px] leading-relaxed text-ink-soft">
                  {ventilate == null
                    ? "The indoor screen waits for the outdoor number before making a call."
                    : ventilate
                      ? "Outdoor particles are low enough for a short cross-draught. Ten focused minutes usually beats a window left ajar all day."
                      : "Outdoor particles are elevated. Filter the air you have and keep the kitchen exhaust running while you cook."}
                </p>
                <p className="mt-4 text-[10.5px] leading-relaxed text-ink-muted">
                  Threshold: about 30 µg/m³ PM2.5. Guidance only, not a measurement of your home.
                </p>
              </div>
            </div>
          </article>

          {/* 05 Impact: interactive comparison */}
          <article className="border-t-2 border-ink pt-10" data-reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <h3 className="max-w-[20ch] text-[clamp(1.6rem,2.6vw,2.3rem)] font-extrabold leading-[1.06] tracking-[-0.045em] text-ink">
                  Make the trade-off visible.
                </h3>
                <p className="mt-3 max-w-lg text-[15px] leading-[1.7] text-ink-soft">
                  Compare a weekly commute by car, bus, metro or cycle. Every figure is a printed
                  assumption, not a silent estimate.
                </p>
              </div>
              <FeatureLink href="/impact" label="Compare a commute" />
            </div>

            <div className="mt-8 panel p-5 sm:p-8">
              <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
                <div>
                  <div className="flex items-end justify-between gap-4">
                    <label
                      htmlFor="impact-distance"
                      className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted"
                    >
                      One way distance
                    </label>
                    <span className="tnum text-lg font-medium text-ink">{distance} km</span>
                  </div>
                  <input
                    id="impact-distance"
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={distance}
                    onChange={(event) => setDistance(Number(event.target.value))}
                    className="mt-3 w-full accent-[#315cff]"
                  />
                  <p className="mt-2 text-[11px] text-ink-muted">Ten round trips each week.</p>

                  <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Your usual mode
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {TRAVEL_MODES.filter((item) =>
                      ["car", "two-wheeler", "bus", "metro", "cycle", "auto"].includes(item.id),
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={mode === item.id}
                        onClick={() => setMode(item.id)}
                        className={`rounded-full border px-2.5 py-2 text-left text-[11px] leading-tight transition ${
                          mode === item.id
                            ? "border-accent bg-accent text-white"
                            : "border-line-strong text-ink-soft hover:border-ink-muted hover:text-ink"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      Weekly CO₂ by mode
                    </p>
                    <p className="text-[11px] text-ink-muted">{distance * 2 * 10} km total</p>
                  </div>
                  <div className="mt-6 space-y-5">
                    {compare.map((row) => {
                      const active = row.mode.id === mode;
                      return (
                        <div key={row.mode.id}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span
                              className={`text-xs ${
                                active ? "font-semibold text-ink" : "text-ink-soft"
                              }`}
                            >
                              {row.mode.label}
                            </span>
                            <span className="tnum text-xs text-ink">
                              {formatKg(row.weeklyGrams)} CO₂
                            </span>
                          </div>
                          <div
                            className={`mt-2 h-1.5 ${active ? "bg-accent" : "bg-ink/25"}`}
                            style={{
                              width: `${Math.max(1.5, (row.weeklyGrams / baseline) * 100)}%`,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-7 border-t border-line pt-4 text-[11px] leading-relaxed text-ink-muted">
                    Planning figure, not a measurement. {selected.assumption} Your selection:{" "}
                    {selected.label.toLowerCase()}.
                  </p>
                </div>
              </div>
            </div>
          </article>

          {/* 06 Insights: real chart, right aligned heading */}
          <article className="border-t-2 border-ink pt-10" data-reveal>
            <div className="flex flex-col gap-4 lg:items-end lg:text-right">
              <h3 className="max-w-[26ch] text-[clamp(1.6rem,2.6vw,2.3rem)] font-extrabold leading-[1.06] tracking-[-0.045em] text-ink">
                A spike means more with context.
              </h3>
              <p className="max-w-lg text-[15px] leading-[1.7] text-ink-soft">
                Seven days of hourly PM2.5 for {place.name}, the India 24 hour standard marked, and
                the weather that decides how fast today&apos;s pollution clears.
              </p>
              <FeatureLink href="/insights" label="Read the insights" />
            </div>

            <div className="mt-8 panel p-5 sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  PM2.5, last seven days
                </p>
                <p className="text-[11px] text-ink-muted">
                  Measured in µg/m³, modelled hourly
                </p>
              </div>
              <div className="pt-6">
                {air ? (
                  <TrendChart history={air.history} />
                ) : (
                  <Unavailable>
                    History is fetched with the current reading. There is nothing to plot until that
                    request succeeds.
                  </Unavailable>
                )}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
