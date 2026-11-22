import type { Band } from "@/lib/types";
import { healthTierFor, splitActivity, TIER_COPY } from "@/lib/health-guidance";
import { BandPill } from "./pollutant-grid";
import { AlertIcon, CheckIcon, ShieldIcon, UsersIcon, WindIcon } from "./icons";

const eyebrow = "text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft";

export function HealthGuidance({ band, value }: { band: Band | null; value: number | null }) {
  const copy = band ? TIER_COPY[healthTierFor(band, value)] : null;
  const { outdoor, actions } = splitActivity(band?.activity ?? "");
  // short band strings have no actions, so the tier supplies one; two is plenty.
  const toDo = (actions.length ? actions : copy ? [copy.action] : []).slice(0, 2);

  return (
    <section
      aria-label="Health and activity guidance"
      className="rise flex flex-col rounded-2xl border p-5 sm:p-6"
      style={{ backgroundColor: band?.soft ?? "#fafaf9", borderColor: band?.border ?? "#e7e5e4" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: band?.color ?? "#1c1917" }}
        >
          <ShieldIcon className="h-4 w-4" />
          Health and activity guidance
        </h2>
        {band ? (
          <BandPill band={band} />
        ) : (
          <span className="text-xs font-medium text-ink-muted">Not available</span>
        )}
      </div>

      {band && copy ? (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{band.guidance}</p>

          <div className="mt-4 border-t pt-4" style={{ borderColor: band.border }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={`flex items-center gap-1.5 ${eyebrow}`}>
                <WindIcon className="h-3.5 w-3.5" />
                Outdoor activity
              </h3>
              <span
                className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                style={{ color: band.color, backgroundColor: "#ffffff", borderColor: band.border }}
              >
                {copy.status}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink">{outdoor}</p>
          </div>

          <div
            className="mt-4 grid gap-4 border-t pt-4 xl:grid-cols-2 xl:gap-5"
            style={{ borderColor: band.border }}
          >
            <div>
              <h3 className={`flex items-center gap-1.5 ${eyebrow}`}>
                <UsersIcon className="h-3.5 w-3.5" />
                Sensitive groups
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink">{copy.sensitive}</p>
              {copy.precaution ? (
                <p className="mt-2 flex gap-1.5 text-xs leading-relaxed text-ink-soft">
                  <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {copy.precaution}
                </p>
              ) : null}
            </div>

            <div
              className="border-t pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0"
              style={{ borderColor: band.border }}
            >
              <h3 className={`flex items-center gap-1.5 ${eyebrow}`}>
                <CheckIcon className="h-3.5 w-3.5" />
                What to do today
              </h3>
              <ul className="mt-2 space-y-1.5">
                {toDo.map((action) => (
                  <li key={action} className="flex gap-2 text-sm leading-relaxed text-ink">
                    <span className="mt-1 shrink-0" style={{ color: band.color }}>
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-ink-muted">
            Outdoor only: these are modelled outdoor readings, and indoor air is not measured here.
            General guidance, not medical advice.
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Guidance appears once this location has a current AQI category for the selected standard.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            Nothing is shown rather than invented advice. Try Refresh, or switch the AQI standard.
          </p>
        </>
      )}
    </section>
  );
}
