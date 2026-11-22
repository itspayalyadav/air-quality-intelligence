"use client";

import { useEffect, useRef, useState } from "react";
import { useLocation } from "@/lib/location";
import { useAiRequest } from "@/lib/use-ai";
import { groundedRequest } from "@/lib/ai-client";
import { AiErrorPanel, AiThinking } from "@/components/ai-status";
import { AiText } from "@/components/recommendation-list";
import { ReadingChips } from "@/components/reading-chips";
import { Card, EmptyState, buttonPrimary, fieldClass } from "@/components/ui";
import { ArrowIcon, SparkIcon } from "@/components/icons";
import type { AiTextResponse } from "@/lib/types";

type Turn = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Is it safe to run outside at 7pm?",
  "Which pollutant should I worry about most right now?",
  "How do I get to work with less exposure?",
  "Should I ventilate my flat today?",
  "What does this CPCB number actually mean?",
];

export default function AssistantPage() {
  const { air, place } = useLocation();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const chat = useAiRequest<AiTextResponse>();
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length, chat.loading]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || !air || chat.loading) return;

    const history = turns.slice(-8);
    setTurns((previous) => [...previous, { role: "user", content: text }]);
    setDraft("");

    const payload = await chat.run({
      mode: "chat",
      ...groundedRequest(air),
      message: text,
      history,
    });

    if (payload) {
      setTurns((previous) => [...previous, { role: "assistant", content: payload.text }]);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">Assistant</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Ask about the air where you are
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Every answer is grounded in a server-side fetch of the readings for {place.name}. The model
          never sees air quality numbers typed by the browser, and it is told to say what is missing
          rather than invent it.
        </p>
      </div>

      {air ? (
        <ReadingChips air={air} place={place} className="mb-4">
          {air.cpcb ? (
            <span className="rounded-full border border-line bg-surface px-2.5 py-1">
              CPCB {air.cpcb.aqi}
            </span>
          ) : null}
          <span className="text-ink-muted">
            updated {new Date(air.observedAt).toLocaleString()}
          </span>
        </ReadingChips>
      ) : (
        <EmptyState
          title="Waiting for readings"
          body="The assistant needs a current reading to ground its answers. Pick a city from the location control."
        />
      )}

      <Card padded={false} className="overflow-hidden">
        <div ref={threadRef} className="max-h-[52vh] space-y-5 overflow-y-auto px-5 py-5 sm:px-6" aria-live="polite">
          {turns.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-soft">
                Ask anything about today&apos;s air. Useful starting points:
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    disabled={!air || chat.loading}
                    className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-left text-xs text-ink-soft transition hover:border-stone-400 hover:text-ink disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {turns.map((turn, index) =>
            turn.role === "user" ? (
              <div key={index} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm leading-relaxed text-white">
                  {turn.content}
                </p>
              </div>
            ) : (
              <div key={index} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <SparkIcon className="h-3.5 w-3.5" />
                </span>
                <div className="max-w-[88%]">
                  <AiText text={turn.content} />
                </div>
              </div>
            ),
          )}

          {chat.loading ? (
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <SparkIcon className="h-3.5 w-3.5" />
              </span>
              <AiThinking label="Reading the current measurements" />
            </div>
          ) : null}

          {chat.error ? <AiErrorPanel error={chat.error} /> : null}
        </div>

        <form
          className="border-t border-line bg-stone-50/60 p-3 sm:p-4"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <label htmlFor="assistant-input" className="sr-only">
            Your question about the air quality
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id="assistant-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send(draft);
                }
              }}
              rows={1}
              maxLength={800}
              placeholder={air ? "e.g. Is 6am better than 6pm for a walk today?" : "Waiting for a reading…"}
              disabled={!air || chat.loading}
              className={`${fieldClass} max-h-32 min-h-[46px] resize-y`}
            />
            <button
              type="submit"
              disabled={!air || chat.loading || draft.trim().length < 2}
              className={buttonPrimary}
            >
              Send
              <ArrowIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-ink-muted">
            Answers are generated by Gemini from modelled readings. Enter to send, Shift+Enter for a
            new line.
          </p>
        </form>
      </Card>
    </div>
  );
}
