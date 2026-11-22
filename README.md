# Aeris — Urban Air Intelligence

**Know the air. Decide with confidence.**

Aeris is a decision-first air-quality assistant for people who live with polluted air. Most AQI apps stop at a number and a colour. Aeris answers the questions that actually change a day: *Should I go outside? Is it better to train indoors? Should I open the windows? Which commute is the safer, lower-emission choice?* — and shows exactly why each answer was given.

Selected vertical for **PromptWars Challenge 6: Urban Air Quality Assistant**.

> Live deployment: **pending** (see [Deployment](#deployment)). The project is complete and verified locally; a Vercel production project has not been created because no authenticated Vercel account was available in the build environment.

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

- Primary model: `gemini-flash-lite-latest` (override with `GEMINI_MODEL`)
- Fallback: `gemini-flash-latest`
- Sequence: primary → primary after 700 ms → fallback (three attempts maximum)
- Timeouts and 400s are not retried; 403/404 moves to the next model
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
| `GEMINI_MODEL` | No | Defaults to `gemini-flash-lite-latest` |

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
- Rate limiting: 12 requests per client per minute with `Retry-After`
- Prompts forbid fabricated readings, citywide claims, medical diagnoses and invented station names
- Empty or wrong-shape model answers are discarded, not rendered
- No personal data is stored beyond a place name in `localStorage`

---

## Testing

Quality gates executed before delivery are recorded in the final submission report. The suite covers:

- US EPA and CPCB breakpoints at boundaries, clamping, the three-pollutant rule, the 500 ceiling
- Open-Meteo payload mapping, stale detection, weather-failure resilience, coordinate rejection
- Gemini: missing key, 503 retry, 404 fallback, non-retryable 400, malformed JSON, schema violations, prompt grounding
- Decision engine: standard selection, good/poor air, sensitivity and intensity escalation, heat bonus, rising/falling trend, stale evidence, missing-index honesty, rule traces
- Impact factors, rate limiting, history trend, HTTP error parsing
- Browser: live data, location search, invalid location, missing key, Gemini failure, US/CPCB toggle, responsive layouts at 390/834/1440 px, axe accessibility scans

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

The production deployment is managed as a separate Vercel project under the `payalkumari3321-9091` account. The production URL and verified smoke-test results are recorded in the final submission report.

---

## Licence

MIT. Built for Hack2Skill PromptWars Virtual Challenge 6.
