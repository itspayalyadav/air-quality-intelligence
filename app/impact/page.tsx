"use client";

import { useMemo, useState } from "react";
import { useLocation } from "@/lib/location";
import { useAiRequest } from "@/lib/use-ai";
import { groundedRequest } from "@/lib/ai-client";
import { computeImpact, formatKg, TRAVEL_MODES, weeklyDistance } from "@/lib/impact";
import { AiErrorPanel, AiThinking } from "@/components/ai-status";
import { AiText } from "@/components/recommendation-list";
import { Card, SectionHeading, buttonPrimary, fieldClass } from "@/components/ui";
import { SparkIcon } from "@/components/icons";
import type { AiTextResponse } from "@/lib/types";

export default function ImpactPage() {
  const { air } = useLocation();
  const [oneWayKm, setOneWayKm] = useState(8);
  const [tripsPerWeek, setTripsPerWeek] = useState(10);
  const [mode, setMode] = useState("car");
  const explain = useAiRequest<AiTextResponse>();

  const rows = useMemo(
    () => computeImpact({ oneWayKm, tripsPerWeek, mode }).sort((a, b) => a.weeklyGrams - b.weeklyGrams),
    [oneWayKm, tripsPerWeek, mode],
  );
  const distance = weeklyDistance({ oneWayKm, tripsPerWeek, mode });
  const carRow = rows.find((row) => row.mode.id === "car");
  const selected = rows.find((row) => row.mode.id === mode);

  function explainNumbers() {
    if (!air || !selected) return;
    explain.run({
      mode: "chat",
      ...groundedRequest(air),
      message: `I travel ${oneWayKm} km each way, ${tripsPerWeek} trips a week, so ${distance.toFixed(
        0,
      )} passenger-km weekly. My current option is "${selected.mode.label}" (${selected.mode.gramsPerPassengerKm} g CO2e per passenger-km). Compared with driving alone (150 g/km) that is ${
        selected.savedVersusCarGrams >= 0 ? "a saving" : "an increase"
      } of ${formatKg(Math.abs(selected.savedVersusCarGrams))} CO2e per week. Using only these numbers, explain in three short paragraphs: what this change does do, what it does not do to city air pollution, and what would matter more locally today.`,
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">Impact</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Compare everyday travel choices
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Emission factors are published planning figures, and every one of them is shown below the
          table. Switching mode changes your own footprint; it does not, on its own, change citywide AQI.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <SectionHeading eyebrow="Your commute" title="Inputs" />
          <div className="space-y-3.5">
            <div>
              <label htmlFor="distance" className="mb-1.5 block text-xs font-medium text-ink-soft">
                One-way distance (km)
              </label>
              <input
                id="distance"
                type="number"
                min={0.5}
                max={200}
                step={0.5}
                value={oneWayKm}
                onChange={(event) => setOneWayKm(Number(event.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="trips" className="mb-1.5 block text-xs font-medium text-ink-soft">
                Trips per week (one way)
              </label>
              <input
                id="trips"
                type="number"
                min={1}
                max={30}
                step={1}
                value={tripsPerWeek}
                onChange={(event) => setTripsPerWeek(Number(event.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="mode" className="mb-1.5 block text-xs font-medium text-ink-soft">
                How you travel now
              </label>
              <select
                id="mode"
                value={mode}
                onChange={(event) => setMode(event.target.value)}
                className={fieldClass}
              >
                {TRAVEL_MODES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="tnum mt-4 rounded-xl bg-stone-50 px-3 py-2 text-xs text-ink-soft">
            {distance.toFixed(0)} passenger-km per week
          </p>
        </Card>

        <Card>
          <SectionHeading
            eyebrow="Comparison"
            title="Weekly CO₂e by mode"
            description="Sorted cleanest first. Your current choice is highlighted."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <caption className="sr-only">Estimated weekly carbon dioxide equivalent for each travel mode</caption>
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-muted">
                  <th scope="col" className="pb-2 font-medium">Mode</th>
                  <th scope="col" className="pb-2 text-right font-medium">Weekly CO₂e</th>
                  <th scope="col" className="pb-2 text-right font-medium">vs driving alone</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isCurrent = row.mode.id === mode;
                  return (
                    <tr
                      key={row.mode.id}
                      className={`border-b border-line/70 last:border-0 ${isCurrent ? "bg-accent-soft/60" : ""}`}
                    >
                      <th scope="row" className="py-2.5 pr-3 text-left font-normal text-ink">
                        <span className="flex items-center gap-2">
                          {row.mode.label}
                          {isCurrent ? (
                            <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-medium text-white">
                              you
                            </span>
                          ) : null}
                        </span>
                      </th>
                      <td className="tnum py-2.5 text-right font-mono text-ink">
                        {formatKg(row.weeklyGrams)}
                      </td>
                      <td className="tnum py-2.5 text-right font-mono text-ink-soft">
                        {row.mode.id === "car"
                          ? "—"
                          : `${row.savedVersusCarGrams >= 0 ? "−" : "+"}${formatKg(
                              Math.abs(row.savedVersusCarGrams),
                            )}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selected && carRow ? (
            <p className="mt-3 rounded-xl border border-line bg-stone-50 px-3 py-2 text-[13px] leading-relaxed text-ink-soft">
              {selected.mode.id === "car" ? (
                <>Driving alone is the baseline. The cleanest option in this list saves{" "}
                  {formatKg(carRow.weeklyGrams - (rows[0]?.weeklyGrams ?? 0))} a week.</>
              ) : (
                <>
                  Choosing {selected.mode.label.toLowerCase()} instead of driving alone saves about{" "}
                  <strong className="font-medium text-ink">{formatKg(selected.savedVersusCarGrams)}</strong> of
                  CO₂e each week.
                </>
              )}
            </p>
          ) : null}
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeading
            eyebrow="AI explanation"
            title="What these numbers do and do not mean"
            description="Gemini explains the calculation above and the local reading. It is not allowed to add numbers of its own."
          />
          <button
            type="button"
            onClick={explainNumbers}
            disabled={!air || explain.loading}
            className={buttonPrimary}
          >
            <SparkIcon className="h-4 w-4" />
            {explain.loading ? "Explaining" : "Explain this"}
          </button>
        </div>
        <div aria-live="polite">
          {explain.loading ? <AiThinking label="Working through the comparison" /> : null}
          {explain.error ? <AiErrorPanel error={explain.error} onRetry={explainNumbers} /> : null}
          {explain.data ? (
            <div className="rounded-xl border border-line bg-stone-50/60 p-4">
              <AiText text={explain.data.text} />
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="mt-5">
        <SectionHeading eyebrow="Assumptions" title="Where these factors come from" />
        <ul className="grid gap-2 sm:grid-cols-2">
          {TRAVEL_MODES.map((option) => (
            <li key={option.id} className="rounded-lg border border-line px-3 py-2 text-[12px] leading-relaxed text-ink-soft">
              <span className="font-medium text-ink">{option.label}</span> — {option.gramsPerPassengerKm} g per
              passenger-km. {option.assumption}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">
          These are indicative factors for comparing options, not a measured lifecycle assessment. Load
          factors, driving style, fuel type and grid mix move the real number considerably.
        </p>
      </Card>
    </div>
  );
}
