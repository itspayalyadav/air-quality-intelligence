import type { AirData, Recommendation, RecommendationSet } from "./types";

/**
 * Rule-only indoor guidance. Shared by the indoor page's "Always true" list and
 * by the API when both Gemini models are unavailable. Indoor air is never
 * measured here; the ventilate-or-seal call uses outdoor PM2.5 only.
 */
export const INDOOR_BASICS = [
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
  {
    title: "Dust and cleaning",
    body: "Wet-mop and use a vacuum with a sealed HEPA filter; dry sweeping and compressed air lift settled particles back into the room you breathe.",
    limit:
      "Cleaning changes indoor particles only. It does not change outdoor air, and the benefit depends on how well the room is sealed.",
  },
] as const;

export function deterministicIndoorPlan(air: AirData): RecommendationSet {
  const pm25 = air.pollutants.pm2_5.value;
  const level = pm25 == null ? "unavailable" : `${Math.round(pm25)} µg/m³`;
  const ventilate = pm25 != null && pm25 < 30;
  const measured = pm25 != null;

  const summary = !measured
    ? "Outdoor PM2.5 is unavailable, so this rule set cannot make a ventilate-or-seal call. The general indoor rules below still apply, and indoor air was not measured."
    : ventilate
      ? `Outdoor PM2.5 is ${level}, below the 30 µg/m³ guide used by these rules, so a short ventilation window is the easier choice. Indoor air was not measured.`
      : `Outdoor PM2.5 is ${level}, above the 30 µg/m³ guide used by these rules, so keep windows closed and prioritise source control and filtration. Indoor air was not measured.`;

  const items: Recommendation[] = INDOOR_BASICS.map((basic) => ({
    slot: basic.title,
    action: basic.body,
    why: measured
      ? `Chosen from the standing indoor rule set with outdoor PM2.5 at ${level}.`
      : "Chosen from the standing indoor rule set; the outdoor reading is unavailable.",
    benefit: "Reduces personal exposure or indoor particle sources; it does not lower outdoor pollution.",
    difficulty: "easy",
    limitations: basic.limit,
  }));

  return { summary, items };
}
