import {
  buildDecisions,
  DEFAULT_PROFILE,
  type Decision,
  type DecisionId,
  type DecisionProfile,
} from "./decision-engine";
import type { AirData, Recommendation, RecommendationSet } from "./types";

/**
 * Rule-only Daily Plan used only when both Gemini models are temporarily
 * unavailable. It reuses the decision engine, so no reading is invented and
 * no deterministic verdict is changed.
 */

type PlanContext = {
  routine?: string;
  outdoorActivity?: string;
  transport?: string;
  household?: string;
  concerns?: string;
};

const DIFFICULTY: Record<string, Recommendation["difficulty"]> = {
  go: "easy",
  caution: "moderate",
  avoid: "hard",
  unknown: "moderate",
};

export function deterministicPlan(air: AirData, profile: PlanContext = {}): RecommendationSet {
  const text = Object.values(profile).filter(Boolean).join(" ").toLowerCase();
  const sensitive = /asthma|allerg|older adult|child|pregnan|respiratory|heart/.test(text);
  const intensity: DecisionProfile["intensity"] = /run|cycl|exercise|intense/.test(text)
    ? "intense"
    : /very little/.test(text)
      ? "light"
      : "normal";
  const commute: DecisionProfile["commute"] = /car|two-wheeler|scooter/.test(text)
    ? "car"
    : /walk|cycle|cycl/.test(text)
      ? "active"
      : "transit";

  const report = buildDecisions(air, { ...DEFAULT_PROFILE, sensitive, intensity, commute });
  const decisions = new Map<DecisionId, Decision>(
    report.decisions.map((decision) => [decision.id, decision]),
  );

  const item = (slot: string, id: DecisionId): Recommendation => {
    const decision = decisions.get(id);
    if (!decision) {
      return {
        slot,
        action: "Check a local air-quality advisory before making plans.",
        why: "Not enough data was available to apply a rule.",
        benefit: "Avoids acting on a guess.",
        difficulty: "easy",
        limitations: "No current index was available for this location.",
      };
    }
    return {
      slot,
      action: decision.action,
      why: decision.reason,
      benefit: "Keeps your exposure aligned with the current index and your declared context.",
      difficulty: DIFFICULTY[decision.stance] ?? "moderate",
      limitations: decision.uncertainty,
    };
  };

  return {
    summary: `AI is temporarily unavailable, so this plan uses Aeris's deterministic decision engine. ${report.topAction}`,
    items: [
      item("Morning", "ventilate"),
      item("Travel", "commute"),
      item("Outdoor activity", "exercise"),
      item("Indoor time", "outdoor"),
      {
        slot: "Evening",
        action: "Refresh the reading before making any evening outdoor plan.",
        why: "The plan is built from the current observation, not a forecast.",
        benefit: "Prevents acting on a reading that may no longer match the air outside.",
        difficulty: "easy",
        limitations: "This app does not provide hourly route-level forecasts.",
      },
    ],
  };
}
