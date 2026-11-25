# Aeris — Urban Air Intelligence

**Know the air. Decide with confidence.**

Aeris is a decision-first air-quality assistant for people who live with polluted air. Most AQI apps stop at a number and a colour. Aeris answers the questions that actually change a day: *Should I go outside? Is it better to train indoors? Should I open the windows? Which commute is the safer, lower-emission choice?* — and shows exactly why each answer was given.

Selected vertical for **PromptWars Challenge 6: Urban Air Quality Assistant**.

> **Live deployment:** https://air-quality-intelligence-seven.vercel.app
>
> Source: https://github.com/itspayalyadav/air-quality-intelligence (public, `main` only)

---

## The problem

1. **The wrong index.** India's CPCB and the US EPA use different breakpoints. The same air scores differently on each. Apps routinely serve a US number labelled simply "AQI".
2. **No decision.** "Unhealthy for sensitive groups" does not tell a parent whether the 7 am school walk is fine.
3. **No honesty about the data.** These are modelled concentrations on an ~11 km grid, not a monitor on your street.

Aeris addresses all three: both indices side by side with the difference explained, an explainable decision engine built around *your* context, and a persistent disclosure of what the data actually is.

---

## The distinctive feature: an explainable decision engine

Aeris separates **deciding** from **explaining**:

```
Open-Meteo (CAMS + weather)
        │
        ▼
  lib/air.ts ── US AQI from provider, CPCB AQI computed locally
        │
        ▼
  lib/decision-engine.ts   ← deterministic. Owns every rule and threshold.
        │  verdict, score, evidence, rule trace, uncertainty
        ▼
  lib/ai.ts (Gemini)       ← explain-only. Receives the rule + evidence.
        │  plain-language explanation, validated JSON
        ▼
  /decisions UI            ← verdict first, AI explanation second
```

The model never computes an AQI, never changes a verdict, and never receives measurements from the browser. `/api/ai` re-fetches readings from trusted coordinates server-side, re-runs the engine, and hands Gemini the resulting decision as grounded input.

Four decisions are produced:

| Decision | Rule inputs | Example verdict |
|---|---|---|
| Go outside | AQI band severity, sensitivity, planned exertion | "Move plans indoors" |
| Exercise outside | Same, plus a heat bonus at ≥ 35 °C | "Exercise indoors today" |
| Ventilate home | AQI band severity ± PM2.5 trend direction | "Keep the windows closed" |
| Commute choice | AQI band severity, sensitivity, published emission factors | "Choose enclosed transit" |

Severity comes from `healthTierFor` (shared with the dashboard guidance), so a CPCB `Poor` band and a US `Unhealthy` band are treated consistently. User context can only **increase** caution, never decrease it. Rising pollution moves the ventilation call one step worse; falling pollution improves it. When either index is missing, the engine returns `unknown` and asks the user to check a local advisory — it does not guess.

Every decision exposes:

- **What is happening** — index, band, dominant pollutant, reading age.
- **Which measurements support it** — a labelled evidence list.
- **Why** — the exact rule and score (`<details>` trace in the UI).
- **What to do** — one concrete action.
- **What is uncertain** — model resolution, indoor air, route exposure, non-medical scope.

A `shortcut:` comment in `lib/rate-limit.ts` records the known ceiling of the in-memory rate limiter and its upgrade path.

---

## Features

| Page | What you get |
|---|---|
| **Landing** `/` | Editorial marketing page with a live modelled reading, data plate, environmental photography and product previews from the same API |
| **Dashboard** `/dashboard` | AQI hero with US/CPCB toggle, pollutant breakdown, seven-day PM2.5 trend, weather context, grounded AI briefing |
| **Decisions** `/decisions` | The deterministic decision engine: four explainable verdicts, context controls, rule traces, optional AI explanations |
| **Assistant** `/assistant` | Multi-turn chat grounded in the live reading, with suggested questions |
| **Daily plan** `/plan` | Five chronological actions from a short household profile |
| **Indoor** `/indoor` | Ventilate-or-seal call plus kitchen, dust and purifier guidance |
| **Impact** `/impact` | Eight travel modes compared in kg CO₂ with every factor printed |
| **Insights** `/insights` | Threshold alert, 24 h vs previous-48 h trend, and how to read the numbers |

---

## Architecture

```
Browser (client components)
   ├── LocationProvider ......... place in localStorage, refetches /api/air
   ├── GET  /api/air ............ Open-Meteo air + weather, computes CPCB AQI
   ├── GET  /api/cities ......... Open-Meteo geocoding, 24 h cache
   └── POST /api/ai ............. server-side re-fetch → Gemini
                                     modes: chat | plan | indoor | explain

lib/
   aqi.ts                US bands, CPCB bands + breakpoint computation
   air.ts                Open-Meteo clients, stale detection, coordinate validation
   decision-engine.ts    deterministic verdicts, evidence and rule traces  ← new
   health-guidance.ts    shared severity tiers
   history.ts            PM2.5 trend with a 10 % deadband
   impact.ts             deterministic travel-emission factors
   ai.ts                 Gemini client, fallback chain, prompts, zod validation
   rate-limit.ts         per-client token bucket (documented shortcut)
   location.tsx          place state + fetch lifecycle
```

**The browser never supplies air-quality numbers to the AI.** `/api/ai` accepts only coordinates, place metadata, user context and a mode. All readings are fetched on the server.

### Gemini configuration

- Primary model: `gemini-3.8-flash` (override with `GEMINI_MODEL`)
- Fallback: `gemini-3.5-flash-lite`
- Sequence: primary → retry → fallback (three attempts maximum)
- 429/503 use exponential backoff (500 ms, 1000 ms) or a capped `Retry-After` hint; timeouts and 400s are not retried; 404 moves to the next model
- If both models are unavailable, Daily Plan falls back to the deterministic decision engine and labels the result as rule-based
- Structured output is validated with zod. A wrong-shape answer is discarded, never half-rendered
- Model availability should be re-checked against the [Gemini model list](https://ai.google.dev/gemini-api/docs/models) before changing `GEMINI_MODEL`

---

## Environmental data sources

- **Air quality:** Copernicus Atmosphere Monitoring Service (CAMS) via Open-Meteo — modelled, ~11 km resolution, hourly
- **Weather:** Open-Meteo forecast API
- **Geocoding:** Open-Meteo geocoding API
- **AI:** Google Gemini (server-side key only)

US AQI comes from the provider, which applies the EPA breakpoint table. CPCB AQI is computed locally in `lib/aqi.ts`, including the CO µg/m³ → mg/m³ conversion and the CPCB rule that at least three pollutants must be present, one of them PM2.5 or PM10. When the rule is not met the app returns `null` and shows a dash rather than inventing a number. Both are labelled **not an official CPCB station reading**.

---

## Installation

```bash
npm install
cp .env.example .env.local   # add your Gemini key (optional)
npm run dev
```

Open http://localhost:3000. Air-quality features work with no key; AI panels then explain that they are not configured.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | For AI features | Google AI Studio key. Server-side only — never exposed to the browser |
| `GEMINI_MODEL` | No | Defaults to `gemini-3.8-flash` |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical origin for metadata and sitemap. Set to the production URL on Vercel |

`.env*` is gitignored; `.env.example` is committed with placeholder names only.

### Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm start          # serve production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest unit tests
npm run test:e2e   # playwright (build first)
```

---

## Security and responsible AI

- API keys live only in server environment variables; no client-side key, no secrets in Git
- `/api/ai` validates every field with zod and rejects coordinates outside valid ranges
- Readings are fetched server-side, so a malicious client cannot make the model reason about invented pollution
- Rate limiting: AI 12, air 30 and city search 20 requests per client per minute with `Retry-After`. Only the platform-written `x-vercel-forwarded-for` header is trusted for client identity; spoofable headers are ignored
- Upstream Open-Meteo, geocoding and Gemini payloads are validated with Zod before use; malformed data becomes a controlled error, never a fabricated AQI
- Security headers on every route: Content-Security-Policy, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` and `Permissions-Policy`. `connect-src` is limited to the app origin because Gemini is called server-side
- CSP nonce evaluation: a per-request nonce in `proxy.ts` would require forcing dynamic rendering on every statically prerendered page, losing CDN caching. A report-only trial produced zero nonce attributes in the static HTML, so the current static policy with `script-src 'unsafe-inline'` is retained and documented as a trade-off
- The location dialog uses `aria-modal`, a Tab trap and focus restoration; the mobile menu restores focus to its toggle on close and only sets `aria-controls` while open
- Precise device coordinates are not persisted; `localStorage` writes are guarded for private browsing
- Error responses are explicitly `no-store`; AI place metadata is stripped of control characters before it reaches a prompt
- Explicit refreshes and precise device locations use `private, no-store` so they never enter a shared cache
- Public error responses use fixed copy; diagnostics stay in server logs
- Prompts forbid fabricated readings, citywide claims, medical diagnoses and invented station names
- Empty or wrong-shape model answers are discarded, not rendered
- No personal data is stored beyond a place name in `localStorage`

---

## Testing

All gates were run locally on Node 26.8.1 / npm 11.19.0 with these results:

| Gate | Command | Result |
|---|---|---|
| Strict TypeScript | `npm run typecheck` | passed |
| Lint | `npm run lint` | passed |
| Unit tests | `npm test` | 113 passed, 14 files |
| Build | `npm run build` | passed |
| Browser / axe / responsive | `npm run test:e2e` | 54 passed |
| Dependency audit | `npm run audit` | 0 high/critical vulnerabilities |

The suite covers:

- US EPA and CPCB breakpoints at boundaries, clamping, the three-pollutant rule, the 500 ceiling
- Open-Meteo payload mapping, stale detection, weather-failure resilience, coordinate rejection
- Gemini: missing key, 503 retry, 404 fallback, non-retryable 400, malformed JSON, schema violations, prompt grounding
- Decision engine: standard selection, good/poor air, sensitivity and intensity escalation, heat bonus, rising/falling trend, stale evidence, missing-index honesty, rule traces
- Impact factors, rate limiting, history trend, HTTP error parsing
- API route contracts: invalid bodies/coordinates, spoofed forwarding headers, missing key, refresh cache headers
- AI edge cases: timeout, blocked output, malformed envelope, 500 upstream, HTTP-date `Retry-After`, model fallback and serving-model reporting
- Browser: live data, location search result announcements, invalid location, missing key, Gemini failure, Assistant fallback link navigation, deterministic plan/indoor/explain fallbacks, interactive commute-impact table, US/CPCB toggle, responsive layouts at 360–1440 px, axe scans including open-dialog and best-practice rules, keyboard-only Tab-trap/Escape/focus-restoration tests, reduced-motion animation check

Local production-server smoke test: `/`, `/dashboard`, `/decisions`, `/plan`, `/indoor`, `/insights`, `/api/air`, `/api/cities`, `/robots.txt` and `/sitemap.xml` all returned 200; `/api/ai` returned 503 `missing_key` as designed when no key was set. A live Delhi reading returned PM2.5 99.7 µg/m³, US AQI 218 and CPCB AQI 231 with `observedAt` 2026-11-22T20:30 and `stale: false`. The same checks were repeated against the Vercel production URL after configuring the key; see [Deployment](#deployment).

---

## GenAI usage

Google Gemini (`gemini-3.8-flash` by default, with `gemini-3.5-flash-lite` as fallback, overridable with `GEMINI_MODEL`) is used **only to explain decisions that the deterministic engine has already made**. It writes plain-language copy for the four verdicts, the optional daily plan and indoor guidance, and the multi-turn assistant. It never calculates an AQI, changes a verdict, invents a measurement or supplies a medical claim.

Grounding controls in `lib/ai.ts`:

- The browser sends only coordinates and a place name. `/api/ai` re-fetches readings server-side from Open-Meteo; no client-supplied number reaches the prompt.
- The prompt receives the exact decision object, evidence list and rule trace. A shared rule set forbids fabricated readings, station names, citywide claims and diagnoses.
- Structured output is requested with a JSON schema, then validated with zod.
- Wrong-shape, empty or unparsable answers are discarded and the rule-based copy is shown instead.
- If no API key is configured, the deterministic verdicts still render; only the assistant is unavailable.
- If both models are temporarily unavailable, Daily Plan, Indoor and Explain return rule-based answers labelled `fallback: "deterministic"`. The Assistant keeps an honest 503 and links to the rule-based decisions; it never invents a chat answer.

Generated copy was reviewed manually across the dashboard, decisions, plan and indoor pages. No GenAI-generated image, video or audio is used; the photography in `public/images` is the source asset carried over from the audited project.

---

## Assumptions and limitations

- Modelled values can differ materially from a monitor on your street, especially near traffic
- CPCB AQI here is computed, not read from a station
- The rate limiter is per-instance memory on serverless, so it is a speed bump, not a hard quota
- Indoor air is never measured; indoor advice is derived from outdoor conditions only
- Ventilation rules use the index and PM2.5 trend only; they do not know window geometry, indoor sources or outdoor wind-driven transport
- Emission factors are published planning figures, not a lifecycle assessment
- No route-level pollution measurements exist; the commute decision compares emissions and exertion, not street-level exposure
- Nothing here is medical advice

---

## Deployment

Deployed as an independent Vercel project `payalkumari3321-9091/air-quality-intelligence`.

- **Production URL:** https://air-quality-intelligence-seven.vercel.app
- **Verification:** all eight pages plus `/robots.txt` and `/sitemap.xml` returned 200; `/api/air` returned a live Delhi reading (US AQI 218, CPCB AQI 231, PM2.5 99.7 µg/m³, `stale: false`); canonical URL and sitemap use the production origin; no browser console errors and no horizontal overflow at 1440, 834 or 390 px.
- **AI:** `GEMINI_API_KEY` is configured as an encrypted Vercel Secret (production only). Live `/api/ai` calls returned 200 with `gemini-3.8-flash` (fallback `gemini-3.5-flash-lite`); the explain response repeated the engine's exact rule and evidence, and the assistant's answer used the live PM2.5 reading. The key is never committed to Git.
- **Git auto-deploy:** the Vercel account is signed in with email, so it has no GitHub login connection. `vercel git connect` therefore fails; add a GitHub login connection in Vercel account settings to enable push-triggered deployments. Until then, deploy from the CLI with `vercel --prod --yes`.

---

## Licence

MIT. Built for Hack2Skill PromptWars Virtual Challenge 6.
