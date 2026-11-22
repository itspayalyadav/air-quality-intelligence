"use client";

import { useState } from "react";
import { useLocation } from "@/lib/location";
import { useAiRequest } from "@/lib/use-ai";
import { groundedRequest } from "@/lib/ai-client";
import { AiErrorPanel, AiThinking } from "@/components/ai-status";
import { RecommendationList } from "@/components/recommendation-list";
import { ReadingChips } from "@/components/reading-chips";
import { Card, EmptyState, SectionHeading, buttonPrimary, fieldClass } from "@/components/ui";
import { SparkIcon } from "@/components/icons";
import type { AiRecommendationsResponse } from "@/lib/types";

const BASICS = [
  {
    title: "Ventilation",
    body: "Short cross-draughts clear cooking moisture, CO₂ and volatile compounds fast. Ten focused minutes with two windows open usually beats a whole day with one window ajar.",
    limit:
      "On a high-pollution day the same burst also lets PM2.5 in. Check the outdoor number first — below roughly 30 µg/m³ PM2.5 is the easiest window.",
  },
  {
    title: "Kitchen smoke",
    body: "Switch the exhaust on before you light the flame and leave it running ten minutes after. Lids and a pressure cooker cut both fuel use and particulate release.",
    limit:
      "A chimney that recirculates filters grease, not fine particles. If it does not vent outdoors, open a window while cooking even on bad-air days.",
  },
  {
    title: "Air purifiers",
    body: "A HEPA unit reduces indoor particles in the room it serves. Match clean-air delivery rate to floor area and run it on the setting you can tolerate overnight.",
    limit:
      "HEPA does nothing for CO₂, carbon monoxide or most gases, needs the room closed to stay effective, and quieten down as filters load — replace them on schedule.",
  },
  {
    title: "Indoor sources",
    body: "Incense, mosquito coils, candles and frying are often the largest personal PM2.5 exposures of the day — larger than outdoor air in a closed room.",
    limit:
      "You cannot fully eliminate indoor particles. The honest goal is fewer sources plus filtered air, not a zero reading.",
  },
];

export default function IndoorPage() {
  const { air, place } = useLocation();
  const [household, setHousehold] = useState(
    "Two adults in a second-floor flat with a gas stove and no exhaust fan.",
  );
  const indoor = useAiRequest<AiRecommendationsResponse<"indoor">>();

  function generate() {
    if (!air) return;
    indoor.run({
      mode: "indoor",
      ...groundedRequest(air),
      household,
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">Indoor air</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Make the inside of your home better
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Outdoor pollution decides whether today is a ventilate day or a seal-the-windows day. These
          recommendations are specific to that call.
        </p>
      </div>

      {air ? (
        <ReadingChips air={air} place={place}>
          {air.pollutants.pm2_5.value != null ? (
            <span className="rounded-full border border-line bg-surface px-2.5 py-1">
              Outdoor PM2.5 {Math.round(air.pollutants.pm2_5.value)} µg/m³
            </span>
          ) : null}
        </ReadingChips>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <Card>
            <SectionHeading eyebrow="Context" title="Describe your home" />
            <label htmlFor="household" className="sr-only">
              Household description
            </label>
            <textarea
              id="household"
              value={household}
              onChange={(event) => setHousehold(event.target.value)}
              rows={4}
              maxLength={300}
              className={`${fieldClass} resize-y`}
            />
            <button
              type="button"
              onClick={generate}
              disabled={!air || indoor.loading || household.trim().length < 5}
              className={`${buttonPrimary} mt-3 w-full`}
            >
              <SparkIcon className="h-4 w-4" />
              {indoor.loading ? "Working" : indoor.data ? "Regenerate" : "Get indoor advice"}
            </button>
          </Card>

          <Card>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
              Always true
            </p>
            <ul className="mt-3 space-y-3">
              {BASICS.map((item) => (
                <li key={item.title}>
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{item.body}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                    <span className="font-medium">Limit: </span>
                    {item.limit}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card>
          <SectionHeading eyebrow="For today" title="Indoor recommendations" />
          <div aria-live="polite">
            {indoor.loading ? <AiThinking label="Checking the outdoor reading against your home" /> : null}
            {indoor.error ? <AiErrorPanel error={indoor.error} onRetry={generate} /> : null}
            {indoor.data ? (
              <>
                <RecommendationList set={indoor.data.data} />
                <p className="mt-3 border-t border-line pt-2 text-[11px] text-ink-muted">
                  Generated by {indoor.data.model}. Indoor air was not measured — only outdoor
                  conditions were known, so treat this as guidance, not a reading of your home.
                </p>
              </>
            ) : null}
            {!air ? (
              <EmptyState
                title="No outdoor reading yet"
                body="Whether to ventilate depends on the outdoor number. Pick a location first."
              />
            ) : !indoor.loading && !indoor.error && !indoor.data ? (
              <p className="rounded-xl border border-dashed border-line-strong bg-stone-50/60 px-4 py-6 text-sm text-ink-muted">
                Generate advice to get a ventilate-or-seal call for today, plus the specifics for your
                kitchen and floors.
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
