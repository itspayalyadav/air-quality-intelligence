"use client";

import { useMemo, useState } from "react";
import { useLocation } from "@/lib/location";
import { useAiRequest } from "@/lib/use-ai";
import { groundedRequest } from "@/lib/ai-client";
import {
  buildDecisions,
  DEFAULT_PROFILE,
  type Decision,
  type DecisionProfile,
  type Stance,
} from "@/lib/decision-engine";
import type { AiExplainResponse } from "@/lib/types";
import { AiErrorPanel, AiThinking } from "@/components/ai-status";
import { Card, PageHeading, SectionHeading, Skeleton, buttonPrimary, fieldClass } from "@/components/ui";
import { SparkIcon } from "@/components/icons";

const STANCE: Record<Stance, { label: string; className: string }> = {
  go: { label: "Favourable", className: "border-l-emerald-600 bg-emerald-50/50" },
  caution: { label: "Use care", className: "border-l-amber-500 bg-amber-50/50" },
  avoid: { label: "Avoid", className: "border-l-red-600 bg-red-50/50" },
  unknown: { label: "No data", className: "border-l-stone-400 bg-stone-50" },
};

function DecisionCard({
  decision,
  profile,
}: {
  decision: Decision;
  profile: DecisionProfile;
}) {
  const { air } = useLocation();
  const explain = useAiRequest<AiExplainResponse>();
  const style = STANCE[decision.stance];

  function askAi() {
    if (!air) return;
    explain.run({
      mode: "explain",
      ...groundedRequest(air),
      decisionId: decision.id,
      profile,
    });
  }

  return (
    <Card className={`border-l-4 ${style.className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
            {decision.title}
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">{decision.headline}</h3>
        </div>
        <span className="rounded-full border border-line-strong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-soft">
          {style.label}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{decision.reason}</p>
      <p className="mt-2 text-sm font-medium text-ink">{decision.action}</p>

      <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-line pt-4 sm:grid-cols-2">
        {decision.evidence.map((item) => (
          <div key={item.label}>
            <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{item.label}</dt>
            <dd className="mt-0.5 text-[13px] leading-snug text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-ink-soft hover:text-ink">
          How this verdict was decided
        </summary>
        <p className="mt-2 rounded-lg bg-stone-100/80 p-3 font-mono text-[12px] leading-relaxed text-ink">
          {decision.rule}
        </p>
      </details>

      <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">{decision.uncertainty}</p>

      <div className="mt-4 border-t border-line pt-4">
        <button type="button" onClick={askAi} disabled={explain.loading} className={buttonPrimary}>
          <SparkIcon className="h-4 w-4" />
          {explain.loading ? "Explaining" : explain.data ? "Regenerate explanation" : "Explain with AI"}
        </button>
        <div className="mt-3" aria-live="polite">
          {explain.loading ? <AiThinking label="Explaining the deterministic rule" /> : null}
          {explain.error ? (
            <AiErrorPanel error={explain.error} onRetry={askAi} />
          ) : null}
          {explain.data ? (
            <div className="rounded-xl border border-line bg-stone-50/70 p-4">
              <p className="text-sm font-medium text-ink">{explain.data.data.headline}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{explain.data.data.why}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                <span className="font-medium text-ink">Do:</span> {explain.data.data.whatToDo}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
                <span className="font-medium">Limits:</span> {explain.data.data.uncertainty}
              </p>
              <p className="mt-3 border-t border-line pt-2 text-[11px] text-ink-muted">
                AI explanation by {explain.data.model}. The verdict above is deterministic and was
                not changed by the model.
              </p>
            </div>
          ) : null}
          {!explain.loading && !explain.error && !explain.data ? (
            <p className="text-[12px] leading-relaxed text-ink-muted">
              The verdict above is computed by rules. Ask the AI for a plain-language explanation;
              it receives the rule and evidence but cannot change the decision.
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export default function DecisionsPage() {
  const { air, loading, error, refresh, place } = useLocation();
  const [profile, setProfile] = useState<DecisionProfile>(DEFAULT_PROFILE);
  const report = useMemo(() => (air ? buildDecisions(air, profile) : null), [air, profile]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeading
        eyebrow="Decision engine"
        title={`What should I do in ${place.name}?`}
        description="Four decisions made by transparent rules from the current readings and your context. The AI explains them; it never chooses them."
      />

      {error && !air ? (
        <Card className="border-amber-200 bg-amber-50/60">
          <p className="text-sm font-medium text-amber-900">Could not load readings for {place.name}</p>
          <p className="mt-1 text-sm text-amber-900">{error.message}</p>
          <button type="button" onClick={refresh} className={`${buttonPrimary} mt-3`}>
            Try again
          </button>
        </Card>
      ) : loading && !air ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : report && air ? (
        <div className="space-y-8">
          <Card>
            <SectionHeading
              eyebrow="Today's headline"
              title={report.topAction}
              description={`${report.standard ?? "No index"} AQI ${report.aqi ?? "unavailable"}${
                report.band ? ` · ${report.band}` : ""
              }${report.dominant ? ` · driven by ${report.dominant}` : ""} · ${report.location}`}
            />
            <fieldset className="grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
              <legend className="sr-only">Your context</legend>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={profile.sensitive}
                  onChange={(event) =>
                    setProfile((value) => ({ ...value, sensitive: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-line-strong accent-accent"
                />
                I am in a sensitive group
              </label>
              <label className="text-sm text-ink">
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-muted">
                  Planned exertion
                </span>
                <select
                  value={profile.intensity}
                  onChange={(event) =>
                    setProfile((value) => ({
                      ...value,
                      intensity: event.target.value as DecisionProfile["intensity"],
                    }))
                  }
                  className={fieldClass}
                >
                  <option value="light">Light</option>
                  <option value="normal">Normal</option>
                  <option value="intense">Intense</option>
                </select>
              </label>
              <label className="text-sm text-ink">
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-muted">
                  Usual commute
                </span>
                <select
                  value={profile.commute}
                  onChange={(event) =>
                    setProfile((value) => ({
                      ...value,
                      commute: event.target.value as DecisionProfile["commute"],
                    }))
                  }
                  className={fieldClass}
                >
                  <option value="active">Walk or cycle</option>
                  <option value="transit">Bus or metro</option>
                  <option value="car">Car</option>
                </select>
              </label>
            </fieldset>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {report.decisions.map((decision) => (
              <DecisionCard key={decision.id} decision={decision} profile={profile} />
            ))}
          </div>

          <Card>
            <SectionHeading
              eyebrow="Read this first"
              title="What these decisions do and do not know"
            />
            <ul className="list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-ink-soft">
              {report.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
