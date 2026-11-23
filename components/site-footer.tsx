"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GITHUB_URL } from "@/lib/site";
import { Wordmark } from "./wordmark";
import { ArrowIcon } from "./icons";

const PRODUCT_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/decisions", label: "Decision engine" },
  { href: "/assistant", label: "AI Assistant" },
  { href: "/plan", label: "Daily plan" },
  { href: "/indoor", label: "Indoor air" },
  { href: "/impact", label: "Impact" },
  { href: "/insights", label: "Insights" },
];

const EXPLORE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#about", label: "About" },
];

const SOURCES = [
  { href: "https://open-meteo.com/", label: "Open-Meteo" },
  { href: "https://atmosphere.copernicus.eu/", label: "Copernicus CAMS" },
  { href: "https://cpcb.nic.in/", label: "CPCB" },
  { href: "https://ai.google.dev/gemini-api/docs", label: "Google Gemini" },
];

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="link-underline inline-block text-[13.5px] text-ink-soft transition-colors hover:text-ink"
      >
        {label}
      </Link>
    </li>
  );
}

function Column({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <FooterLink key={link.label} {...link} />
        ))}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname !== "/") {
    return (
      <footer className="mt-16 border-t-2 border-ink bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Wordmark href="/dashboard" />
            <Link href="/" className="link-underline text-sm text-ink-soft hover:text-ink">
              About Aeris
            </Link>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-soft">
            Readings are modelled forecasts from the Copernicus Atmosphere Monitoring Service,
            served through Open-Meteo. They are not measurements from a regulatory monitoring
            station and can differ from the air at your street. CPCB values shown here are
            calculated by this app from those modelled concentrations using CPCB breakpoints, and
            are not official CPCB readings. Nothing here is medical advice.
          </p>
          <p className="mt-3 text-xs text-ink-muted">
            Data from Open-Meteo, CAMS and CPCB breakpoints. AI by Google Gemini.
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="grid-lines border-t-2 border-ink">
      <div className="mx-auto max-w-[1440px] bg-canvas/80 px-5 pb-10 pt-16 sm:px-8 sm:pt-20 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_0.7fr_0.7fr_1fr]">
          <div>
            <Wordmark href="/" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-soft">
              Environmental intelligence for everyday decisions. Live readings, honest labels and
              guidance you can act on.
            </p>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="link-underline mt-5 inline-flex items-center gap-2 text-sm font-medium text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.1.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.94.36.31.68.92.68 1.85v2.75c0 .27.18.59.69.49A10 10 0 0 0 12 2Z" />
              </svg>
              GitHub repository
            </a>
          </div>

          <Column title="Product" links={PRODUCT_LINKS} />
          <Column title="Explore" links={EXPLORE_LINKS} />

          <div>
            <nav aria-label="Data sources">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Data
              </p>
              <ul className="mt-4 space-y-2.5">
                {SOURCES.map((source) => (
                  <li key={source.label}>
                    <a
                      href={source.href}
                      target="_blank"
                      rel="noreferrer"
                      className="link-underline inline-block text-[13.5px] text-ink-soft transition-colors hover:text-ink"
                    >
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="mt-6 text-[13px] leading-relaxed text-ink-muted">
              Modelled hourly values, not monitoring station measurements. CPCB index calculated by
              this app. Not medical advice.
            </p>
          </div>
        </div>

        <div className="mt-14 border-t border-line pt-8">
          <p className="max-w-4xl text-xs leading-relaxed text-ink-muted">
            Air quality data comes from the Copernicus Atmosphere Monitoring Service through
            Open-Meteo. US AQI is computed upstream; the CPCB estimate is calculated here from the
            same concentrations using CPCB breakpoints. Neither is an official reading from a
            regulatory station. Aeris is an independent project and is not affiliated with
            CPCB, Open-Meteo or Google.
          </p>
          <p className="mt-3 max-w-4xl text-xs leading-relaxed text-ink-muted">
            Photography:{" "}
            <a
              href="https://commons.wikimedia.org/wiki/File:City_in_the_Haze.jpg"
              target="_blank"
              rel="noreferrer"
              className="link-underline"
            >
              City in the Haze
            </a>{" "}
            by MohammedSuman22,{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0"
              target="_blank"
              rel="noreferrer"
              className="link-underline"
            >
              CC BY-SA 4.0
            </a>
            ;{" "}
            <a
              href="https://commons.wikimedia.org/wiki/File:Winter_Maidan_Morning_Kolkata.jpg"
              target="_blank"
              rel="noreferrer"
              className="link-underline"
            >
              Winter Maidan Morning Kolkata
            </a>{" "}
            by SukantaBhowmik, CC BY-SA 4.0;{" "}
            <a
              href="https://commons.wikimedia.org/wiki/File:Misty_Morning_in_Mysuru.jpg"
              target="_blank"
              rel="noreferrer"
              className="link-underline"
            >
              Misty Morning in Mysuru
            </a>{" "}
            by Pradyumnakp, CC0. Images cropped and resized; shared under the same licences.
          </p>

          <div className="mt-8 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-ink-muted">
            <p>© {new Date().getFullYear()} Aeris. All rights reserved.</p>
            <p>
              Built with Next.js, Open-Meteo and Gemini. Source on{" "}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="link-underline inline-flex items-center gap-1 text-ink"
              >
                GitHub
                <ArrowIcon className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
