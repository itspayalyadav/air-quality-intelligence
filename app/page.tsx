import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AiContextPanel, HeroReading, LiveAirSection } from "@/components/landing/live-air";
import { FeatureShowcase } from "@/components/landing/feature-showcase";
import { RevealObserver } from "@/components/landing/reveal-observer";
import { ArrowIcon, SparkIcon } from "@/components/icons";
import { SHARE_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SHARE_IMAGE.url],
  },
};

const STEPS = [
  {
    title: "Select your city",
    body: "Use your location or search for a city. The dashboard fetches modelled hourly readings for that place.",
  },
  {
    title: "Read what is actually there",
    body: "US and CPCB indices stay separate, every pollutant is listed, and the observation time is always visible.",
  },
  {
    title: "Decide what to do today",
    body: "Time a walk, change a commute, open a window. Each suggestion stays tied to the reading behind it.",
  },
];

const REFUSALS = [
  {
    title: "No invented numbers",
    body: "If the provider returns nothing, the interface shows the gap instead of filling it in.",
  },
  {
    title: "No station claims",
    body: "Readings are described as modelled because that is what they are. CPCB figures are estimates computed here.",
  },
  {
    title: "No medical advice",
    body: "Guidance describes exposure and comfort. It does not diagnose, prescribe or promise an outcome.",
  },
];

const LIMITS = [
  "It cannot see your street, your room or the air inside a building.",
  "It does not know your medical history and does not offer treatment advice.",
  "It will not fill a missing reading with a guessed value.",
];

export default function LandingPage() {
  return (
    <>
      <RevealObserver />

      <section className="relative border-b border-line">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
            <div className="px-5 pb-10 pt-12 sm:px-8 sm:pt-16 lg:flex lg:flex-col lg:justify-center lg:py-20 lg:pl-12 lg:pr-12">
              <h1 className="hero-in max-w-[20ch] text-[clamp(2.7rem,5vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-ink">
                The air you breathe.{" "}
                <span className="mt-1.5 block pb-2 font-serif text-[0.96em] font-normal italic leading-[1.08] tracking-[-0.02em] text-accent sm:text-[0.98em]">
                  The choices you make.
                </span>
              </h1>

              <p className="hero-in mt-7 max-w-[42ch] text-[17px] leading-[1.65] text-ink-soft [animation-delay:120ms]">
                Live, modelled air quality for your city, explained clearly and tied to the choices
                you make today.
              </p>

              <div className="hero-in mt-8 flex flex-wrap gap-3 [animation-delay:220ms]">
                <Link
                  href="#live-air"
                  className="lift inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-ink"
                >
                  Explore Air Quality
                  <ArrowIcon className="h-4 w-4" />
                </Link>
                <Link
                  href="/assistant"
                  className="lift inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line-strong px-5 py-3 text-sm font-semibold text-ink hover:border-ink hover:bg-surface"
                >
                  <SparkIcon className="h-4 w-4" />
                  Meet AI Assistant
                </Link>
              </div>
            </div>

            <div className="relative min-h-[440px] sm:min-h-[540px] lg:min-h-[660px]">
              <div className="absolute inset-0 overflow-hidden">
                <Image
                  src="/images/hero-city-haze.jpg"
                  alt="A city skyline of high-rise towers rising above dense green tree canopy in morning haze."
                  fill
                  preload
                  sizes="(max-width: 1024px) 100vw, 53vw"
                  className="parallax object-cover object-center"
                />
                <div className="absolute inset-0 bg-ink/5" aria-hidden="true" />
                <div
                  className="absolute inset-0 hidden lg:block lg:bg-[linear-gradient(90deg,#f5f3ee_0%,rgba(245,243,238,0.55)_9%,rgba(245,243,238,0)_26%)]"
                  aria-hidden="true"
                />
              </div>

              <HeroReading className="absolute bottom-5 left-5 right-5 sm:left-8 sm:right-auto sm:w-[330px] lg:-left-8 lg:bottom-14 lg:w-[320px]" />
            </div>
          </div>
        </div>
      </section>

      <LiveAirSection />

      <section id="about" aria-labelledby="about-heading" className="border-b border-line">
        <div className="relative">
          <div className="relative h-[46vh] min-h-[300px] max-h-[540px] overflow-hidden">
            <Image
              src="/images/story-maidan-haze.jpg"
              alt="A herder walking a flock of goats across a wide urban maidan, with a tower and the sun dissolving into morning haze."
              fill
              sizes="100vw"
              className="parallax object-cover object-center"
            />
            <div className="absolute inset-0 bg-ink/10" aria-hidden="true" />
          </div>

          <div className="relative z-10 -mt-16 max-w-[1080px] bg-canvas px-5 py-9 sm:-mt-20 sm:px-8 sm:py-12 lg:-mt-24 lg:px-12 lg:py-14">
            <div className="grid gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:gap-16">
              <div>
                <h2
                  id="about-heading"
                  className="max-w-[15ch] text-[clamp(1.9rem,3.4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-ink"
                >
                  You cannot see the air. You can learn to read it.
                </h2>
                <p className="mt-7 max-w-[24ch] font-serif text-[clamp(1.35rem,1.9vw,1.75rem)] italic leading-[1.3] text-accent">
                  The air is shared. What you notice, you can act on.
                </p>
              </div>

              <div className="space-y-5 text-[16px] leading-[1.75] text-ink-soft">
                <p>
                  Air quality is a mixture, not a score. Fine particles, ozone, nitrogen dioxide
                  and sulphur dioxide behave differently, peak at different hours and come from
                  different places.
                </p>
                <p>
                  A clear view is not proof of clean air, and a grey morning is not proof of the
                  worst. Still air traps pollution near the ground while wind moves it between
                  streets.
                </p>
                <p>
                  The useful question is not whether today is good or bad. It is what is in the
                  air now, what is driving it, and what you can reasonably change about the next
                  few hours.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-10 sm:px-8 lg:px-12">
          <div className="grid gap-8 border-t border-line-strong pt-8 md:grid-cols-3 md:gap-12">
            {REFUSALS.map((item) => (
              <div key={item.title}>
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-ink-soft">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FeatureShowcase />

      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        className="border-b border-line bg-accent-soft/40"
      >
        <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-20 sm:px-8 sm:pt-24 lg:px-12">
          <h2
            id="how-heading"
            className="max-w-[24ch] text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-ink"
          >
            Three steps, and the source stays attached.
          </h2>

          <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
            {STEPS.map((step, index) => (
              <li key={step.title} className="border-t border-ink/20 pt-6">
                <span className="font-serif text-4xl italic leading-[1.1] text-accent sm:text-5xl">
                  0{index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative h-[38vh] min-h-[240px] max-h-[420px] overflow-hidden">
          <Image
            src="/images/story-fog-street.jpg"
            alt="A foggy early morning street in Mysuru, framed by tree branches, with an auto-rickshaw disappearing into the mist."
            fill
            sizes="100vw"
            className="parallax object-cover object-center"
          />
        </div>
      </section>

      <section aria-labelledby="ai-heading" className="border-b border-line">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
          <h2
            id="ai-heading"
            className="max-w-[20ch] text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-ink"
          >
            Context first, then the answer.
          </h2>
          <p className="mt-5 max-w-xl text-[15px] leading-[1.7] text-ink-soft">
            Ask a question and the server fetches the current reading for your selected place before
            the model is called. The browser does not supply the numbers.
          </p>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div data-reveal>
              <AiContextPanel />
              <p className="mt-4 text-[11px] leading-relaxed text-ink-muted">
                Live values for your selected city. They change when the reading changes, not when
                the page copy does.
              </p>
            </div>

            <div className="lg:pt-2" data-reveal>
              <p className="max-w-xl text-[15px] leading-[1.7] text-ink-soft">
                That context includes both indices, the pollutant concentrations, the dominant
                pollutant and the weather. The model is instructed to name what it does not know.
                If Gemini is unavailable, the page says so instead of writing something plausible.
              </p>

              <div className="mt-8 border-t border-line-strong pt-6">
                <h3 className="text-sm font-semibold text-ink">What it will not do</h3>
                <ul className="mt-4 space-y-3">
                  {LIMITS.map((limit) => (
                    <li
                      key={limit}
                      className="flex gap-3 text-sm leading-relaxed text-ink-soft"
                    >
                      <span
                        className="mt-2 h-px w-4 shrink-0 bg-accent"
                        aria-hidden="true"
                      />
                      {limit}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/assistant"
                className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent"
              >
                <span className="link-underline">Meet AI Assistant</span>
                <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-accent text-white">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div data-reveal>
            <h2 className="max-w-[18ch] pb-2 font-serif text-[clamp(2.5rem,5.2vw,4.6rem)] italic leading-[1.08] tracking-[-0.02em]">
              Better awareness starts with a single breath.
            </h2>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/dashboard"
                className="lift inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-ink hover:bg-accent-soft"
              >
                Explore Dashboard
                <ArrowIcon className="h-4 w-4" />
              </Link>
              <p className="text-sm text-white/80">
                No account. No installation. Just the reading.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
