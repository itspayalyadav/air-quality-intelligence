"use client";

import { useEffect, useRef, useState } from "react";
import { useLocation } from "@/lib/location";
import type { CityResult } from "@/lib/air";
import { readJson } from "@/lib/http";
import { ChevronIcon, CloseIcon, LocateIcon, SearchIcon } from "./icons";
import { fieldClass } from "./ui";

export function LocationButton() {
  const { place, setPlace, locate, locating, geoError } = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) triggerRef.current?.focus();
      wasOpenRef.current = false;
      return;
    }
    wasOpenRef.current = true;
    inputRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (active && !dialogRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/cities?q=${encodeURIComponent(query.trim())}`)
        .then((response) =>
          readJson<{ results?: CityResult[] }>(response, "Search failed."),
        )
        .then((body) => {
          if (cancelled) return;
          const found = body.results ?? [];
          setResults(found);
          setSearchError(found.length ? null : "No matching city found.");
        })
        .catch((cause: unknown) => {
          if (cancelled) return;
          setResults([]);
          setSearchError(cause instanceof Error ? cause.message : "Search failed.");
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function choose(city: CityResult) {
    setPlace({
      name: city.name,
      admin: city.admin,
      country: city.country,
      countryCode: city.countryCode,
      latitude: city.latitude,
      longitude: city.longitude,
    });
    setOpen(false);
    setQuery("");
    setResults([]);
    setToast(`Reading ${city.name}`);
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex max-w-[60vw] items-center gap-2 rounded-full border-2 border-ink/15 bg-surface px-3 py-1.5 text-sm font-bold text-ink transition hover:border-accent sm:max-w-none"
      >
        <LocateIcon className="h-3.5 w-3.5 text-accent" />
        <span className="truncate">{place.name}</span>
        <span className="bracket text-[11px] text-muted" aria-hidden="true">{"]"}</span>
        <ChevronIcon className="h-3.5 w-3.5 text-ink-muted" />
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Choose a location"
            className="panel fixed inset-x-3 top-20 z-50 rounded-xl p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Choose a location</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-ink-muted hover:bg-stone-100 hover:text-ink"
                aria-label="Close location picker"
              >
                <CloseIcon />
              </button>
            </div>

            <label className="sr-only" htmlFor="city-search">
              Search for a city
            </label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                id="city-search"
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery(value);
                  if (value.trim().length < 2) {
                    setResults([]);
                    setSearchError(null);
                    setSearching(false);
                  }
                }}
                placeholder="Search a city, e.g. Mumbai"
                className={`${fieldClass} pl-9`}
                autoComplete="off"
              />
            </div>

            <button
              type="button"
              onClick={locate}
              disabled={locating}
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink-soft transition hover:bg-stone-50 disabled:opacity-60"
            >
              <LocateIcon className="h-4 w-4" />
              {locating ? "Detecting your location…" : "Use my current location"}
            </button>

            {geoError ? (
              <p className="px-3 py-1 text-xs text-red-700" role="alert">
                {geoError}
              </p>
            ) : null}

            <div className="mt-2 max-h-72 overflow-y-auto">
              {searching ? <p className="px-3 py-2 text-sm text-ink-muted" role="status">Searching…</p> : null}
              {searchError && !searching ? (
                <p className="px-3 py-2 text-sm text-ink-muted" role="alert">{searchError}</p>
              ) : null}
              <ul>
                {results.map((city) => (
                  <li key={city.id}>
                    <button
                      type="button"
                      onClick={() => choose(city)}
                      className="flex w-full items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-stone-50"
                    >
                      <span className="text-sm text-ink">{city.name}</span>
                      <span className="truncate text-xs text-ink-muted">
                        {[city.admin, city.country].filter(Boolean).join(", ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border-2 border-ink bg-signal px-4 py-3 text-sm font-bold text-ink shadow-lg"
        >
          <span className="bracket text-base" aria-hidden="true">{"</>"}</span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
