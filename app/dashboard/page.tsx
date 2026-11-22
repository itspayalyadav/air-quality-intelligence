"use client";

import Link from "next/link";
import { useLocation } from "@/lib/location";
import { useAiRequest } from "@/lib/use-ai";
import { groundedRequest } from "@/lib/ai-client";
import type { AiTextResponse } from "@/lib/types";
import { AqiHero } from "@/components/aqi-hero";
import { PollutantGrid, PollutantGridSkeleton, StaleNotice } from "@/components/pollutant-grid";
import { TrendChart } from "@/components/trend-chart";
import { WeatherStrip } from "@/components/weather-strip";
import { AiErrorPanel, AiThinking } from "@/components/ai-status";
import { AiText } from "@/components/recommendation-list";
import { Card, SectionHeading, Skeleton, buttonPrimary, buttonSecondary } from "@/components/ui";
import { ArrowIcon, SparkIcon } from "@/components/icons";

const QUICK_LINKS = [
  { href: "/decisions", title: "See today's decisions", body: "Four explainable calls made by rules, not by the AI." },
  { href: "/assistant", title: "Ask about today", body: "Questions answered from the current readings." },
  { href: "/plan", title: "Build today's plan", body: "A routine built around these pollution levels." },
  { href: "/indoor", title: "Indoor air", body: "When to ventilate, and when to keep windows shut." },
  { href: "/impact", title: "Compare a commute", body: "Car, bus or metro — in kilograms of CO₂." },
];

export default function DashboardPage() {
  const { air, loading, error, refresh, place } = useLocation();
  const briefing = useAiRequest<AiTextResponse>();

  function generateBriefing() {
    if (!air) return;
    briefing.run({
      mode: "chat",
      ...groundedRequest(air),
      message:
        "Write a short personal briefing for today. Cover: what the air is like right now and which pollutant is driving it, the best window for outdoor activity, one change to my commute, and one thing to do at home. Keep it under 140 words.",
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
            Air quality dashboard
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {place.name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Modelled hourly readings, with US and CPCB index side by side.
          </p>
        </div>
        <Link href="/assistant" className={buttonSecondary}>
          <SparkIcon className="h-4 w-4" />
          Open assistant
        </Link>
      </div>

      {error && !air ? (
        <Card className="border-amber-200 bg-amber-50/60">
          <p className="text-sm font-medium text-amber-900">Could not load readings for {place.name}</p>
          <p className="mt-1 text-sm text-amber-900">{error.message}</p>
          <button type="button" onClick={refresh} className={`${buttonPrimary} mt-3`}>
            Try again
          </button>
        </Card>
      ) : loading && !air ? (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
          <PollutantGridSkeleton />
        </div>
      ) : air ? (
        <div className="space-y-8">
          {error ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm text-amber-900">
              Refresh failed, showing the last reading we loaded. {error.message}
            </p>
          ) : null}

          <StaleNotice air={air} />

          <AqiHero air={air} onRefresh={refresh} refreshing={loading} />

          <PollutantGrid air={air} />

          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <Card>
              <SectionHeading
                eyebrow="Historical trend"
                title="PM2.5 over the last seven days"
                description="Hourly modelled concentrations. Spikes usually track crop-residue smoke, traffic peaks and still, cold nights."
              />
              <TrendChart history={air.history} />
            </Card>
            <WeatherStrip weather={air.weather} />
          </div>

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
                  Personalised
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink sm:text-xl">
                  AI briefing for {air.place.name}
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">
                  Generated from the readings on this page by Gemini. The model receives the
                  measurements from the server, so it cannot answer from air quality it was not given.
                </p>
              </div>
              <button
                type="button"
                onClick={generateBriefing}
                disabled={briefing.loading}
                className={buttonPrimary}
              >
                <SparkIcon className="h-4 w-4" />
                {briefing.loading ? "Writing" : briefing.data ? "Regenerate" : "Generate briefing"}
              </button>
            </div>

            <div className="mt-4" aria-live="polite">
              {briefing.loading ? <AiThinking /> : null}
              {briefing.error ? (
                <AiErrorPanel error={briefing.error} onRetry={generateBriefing} />
              ) : null}
              {briefing.data ? (
                <div className="rounded-xl border border-line bg-stone-50/60 p-4">
                  <AiText text={briefing.data.text} />
                  <p className="mt-3 border-t border-line pt-2 text-[11px] text-ink-muted">
                    Generated by {briefing.data.model} from the readings above. Verify anything you
                    plan to act on.
                  </p>
                </div>
              ) : null}
              {!briefing.loading && !briefing.error && !briefing.data ? (
                <p className="rounded-xl border border-dashed border-line-strong bg-stone-50/60 px-4 py-6 text-sm text-ink-muted">
                  Nothing generated yet. The briefing is on demand so it always matches the reading
                  you are looking at, instead of being cached from yesterday.
                </p>
              ) : null}
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-xl border border-line bg-surface p-4 transition hover:border-stone-400"
              >
                <p className="flex items-center justify-between text-sm font-medium text-ink">
                  {link.title}
                  <ArrowIcon className="h-3.5 w-3.5 text-ink-muted transition group-hover:translate-x-0.5" />
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{link.body}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
