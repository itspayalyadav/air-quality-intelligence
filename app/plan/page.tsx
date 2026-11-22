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

type Profile = {
  routine: string;
  outdoorActivity: string;
  transport: string;
  household: string;
  concerns: string;
};

const FIELDS: Array<{ key: keyof Profile; label: string; options: string[] }> = [
  {
    key: "routine",
    label: "A typical day looks like",
    options: ["Home all day", "Office, 9 to 6", "Shift work", "College schedule", "Mostly outdoors"],
  },
  {
    key: "outdoorActivity",
    label: "Time spent outdoors",
    options: ["Morning walk or run", "Evening walk", "Cycling", "Children play outside", "Very little"],
  },
  {
    key: "transport",
    label: "How you usually get around",
    options: ["Own car", "Two-wheeler", "Bus", "Metro or train", "Walk or cycle", "Mixed"],
  },
  {
    key: "household",
    label: "Home environment",
    options: [
      "Apartment, no purifier",
      "Apartment with purifier",
      "Independent house",
      "Shared or rented room",
    ],
  },
  {
    key: "concerns",
    label: "Main concern",
    options: ["General health", "Asthma or allergies", "A child at home", "An older adult at home", "Pregnancy"],
  },
];

const DEFAULT_PROFILE: Profile = {
  routine: FIELDS[0].options[1],
  outdoorActivity: FIELDS[1].options[0],
  transport: FIELDS[2].options[4],
  household: FIELDS[3].options[0],
  concerns: FIELDS[4].options[0],
};

export default function PlanPage() {
  const { air, place } = useLocation();
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const plan = useAiRequest<AiRecommendationsResponse<"plan">>();

  function generate() {
    if (!air) return;
    plan.run({
      mode: "plan",
      ...groundedRequest(air),
      profile,
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">Daily plan</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Today, adjusted for the air
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Tell it how your day works. Each item explains what to do, why it matters today, what you
          get from it, and what it will not fix.
        </p>
      </div>

      {air ? <ReadingChips air={air} place={place} /> : null}

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <SectionHeading eyebrow="Your day" title="Household profile" />
          <div className="space-y-3.5">
            {FIELDS.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`profile-${field.key}`}
                  className="mb-1.5 block text-xs font-medium text-ink-soft"
                >
                  {field.label}
                </label>
                <select
                  id={`profile-${field.key}`}
                  value={profile[field.key]}
                  onChange={(event) =>
                    setProfile((previous) => ({ ...previous, [field.key]: event.target.value }))
                  }
                  className={fieldClass}
                >
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={!air || plan.loading}
            className={`${buttonPrimary} mt-4 w-full`}
          >
            <SparkIcon className="h-4 w-4" />
            {plan.loading ? "Building plan" : plan.data ? "Regenerate plan" : "Build today's plan"}
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
            Your profile is sent with each request and nothing is stored on a server.
          </p>
        </Card>

        <Card>
          <SectionHeading eyebrow="Plan" title="Action by action" />
          <div aria-live="polite">
            {plan.loading ? <AiThinking label="Matching the plan to today's readings" /> : null}
            {plan.error ? <AiErrorPanel error={plan.error} onRetry={generate} /> : null}
            {plan.data ? (
              <>
                <RecommendationList set={plan.data.data} />
                <p className="mt-3 border-t border-line pt-2 text-[11px] text-ink-muted">
                  Generated by {plan.data.model} from the readings for {place.name}. Regenerate if
                  the reading changes.
                </p>
              </>
            ) : null}
            {!air ? (
              <EmptyState
                title="No reading yet"
                body="A plan is built around current pollution levels. Pick a location first."
              />
            ) : !plan.loading && !plan.error && !plan.data ? (
              <p className="rounded-xl border border-dashed border-line-strong bg-stone-50/60 px-4 py-6 text-sm text-ink-muted">
                Choose a profile and generate. The plan is not stored, so it always reflects the air
                you are breathing right now.
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
