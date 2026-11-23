import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`panel rounded-xl ${padded ? "p-5 sm:p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h2 className="display-sm text-xl text-ink sm:text-2xl">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Shared internal-page header with the Aeris bracket + signal motif. */
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-line-strong pb-6">
      <div className="min-w-0">
        <p className="eyebrow flex items-center gap-2">
          <span className="bracket text-sm" aria-hidden="true">
            {"</>"}
          </span>
          {eyebrow}
        </p>
        <h1 className="display-sm mt-3 text-3xl text-ink sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-line ${className}`} aria-hidden="true" />
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line-strong bg-canvas p-6">
      <p className="text-base font-bold tracking-tight text-ink">{title}</p>
      <p className="max-w-md text-sm leading-relaxed text-ink-soft">{body}</p>
      {action}
    </div>
  );
}

export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "signal";
}) {
  const styles = {
    neutral: "border-line-strong bg-canvas text-ink-soft",
    accent: "border-accent/30 bg-accent-soft text-accent",
    signal: "border-ink/20 bg-signal text-ink",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${styles}`}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <div className="panel-flat rounded-lg p-4">
      <p className="eyebrow">{label}</p>
      <p className="tnum mt-2 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      {note ? <p className="mt-1 text-[12px] leading-snug text-ink-muted">{note}</p> : null}
    </div>
  );
}

export const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50";

export const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-full border border-ink/20 bg-surface px-5 py-2.5 text-sm font-bold text-ink transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50";

export const buttonGhost =
  "inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-ink-soft transition hover:bg-accent-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

export const fieldClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";
