import type { RecommendationSet } from "@/lib/types";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { AlertIcon } from "./icons";

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: "bg-emerald-50 text-emerald-800 border-emerald-200",
  moderate: "bg-amber-50 text-amber-800 border-amber-200",
  hard: "bg-rose-50 text-rose-800 border-rose-200",
};

export function RecommendationList({ set }: { set: RecommendationSet }) {
  return (
    <div className="space-y-3">
      <p className="rounded-xl border border-line bg-stone-50/70 px-4 py-3 text-sm leading-relaxed text-ink">
        {set.summary}
      </p>

      <ol className="space-y-3">
        {set.items.map((item, index) => (
          <li key={`${item.slot}-${index}`} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                {item.slot}
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                  DIFFICULTY_STYLE[item.difficulty] ?? "border-line bg-stone-50 text-ink-soft"
                }`}
              >
                {item.difficulty}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium leading-snug text-ink">{item.action}</p>

            <dl className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">Why</dt>
                <dd className="text-[13px] leading-relaxed text-ink-soft">{item.why}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  Expected benefit
                </dt>
                <dd className="text-[13px] leading-relaxed text-ink-soft">{item.benefit}</dd>
              </div>
            </dl>

            <p className="mt-3 flex items-start gap-1.5 border-t border-line pt-2.5 text-[12px] leading-relaxed text-ink-muted">
              <AlertIcon className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                <span className="font-medium text-ink-soft">Limits: </span>
                {item.limitations}
              </span>
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AiText({ text }: { text: string }) {
  if (!text.trim()) {
    return (
      <p className="text-sm leading-relaxed text-ink-muted">
        No text came back from the model, so there is nothing to show. Try generating again.
      </p>
    );
  }

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-ink-soft">
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1: ({ children }) => <h3 className="text-base font-semibold text-ink">{children}</h3>,
          h2: ({ children }) => <h3 className="text-base font-semibold text-ink">{children}</h3>,
          h3: ({ children }) => <h4 className="text-sm font-semibold text-ink">{children}</h4>,
          h4: ({ children }) => <h5 className="text-sm font-semibold text-ink">{children}</h5>,
          h5: ({ children }) => <h6 className="text-sm font-semibold text-ink">{children}</h6>,
          h6: ({ children }) => <p className="text-sm font-semibold text-ink">{children}</p>,
          p: ({ children }) => {
            const raw = typeof children === "string" ? children : null;
            if (raw && /^limits:/i.test(raw.trim())) {
              return (
                <p className="rounded-lg border border-line bg-stone-50 px-3 py-2 text-[12px] leading-relaxed text-ink-muted">
                  {children}
                </p>
              );
            }
            return <p>{children}</p>;
          },
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-4">{children}</ol>,
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              className="underline decoration-line-strong underline-offset-2 hover:decoration-ink"
              rel="noreferrer noopener"
              target="_blank"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[12px] text-ink">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg border border-line bg-stone-50 p-3 text-[12px]">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-line-strong pl-3 text-ink-soft">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-line" />,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-line pb-1 pr-3 text-left font-medium text-ink">{children}</th>
          ),
          td: ({ children }) => <td className="border-b border-line py-1 pr-3 align-top">{children}</td>,
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
