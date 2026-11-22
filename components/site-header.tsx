"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LocationButton } from "./location-button";
import { Wordmark } from "./wordmark";
import { ArrowIcon, CloseIcon } from "./icons";

const APP_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/decisions", label: "Decisions" },
  { href: "/assistant", label: "Assistant" },
  { href: "/plan", label: "Daily plan" },
  { href: "/indoor", label: "Indoor" },
  { href: "/impact", label: "Impact" },
  { href: "/insights", label: "Insights" },
];

const MARKET_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#about", label: "About" },
];

function AppNavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition ${
        active
          ? "bg-accent text-white"
          : "text-ink-soft hover:bg-accent-soft hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname === "/") {
    return (
      <header
        data-nav="marketing"
        className="sticky top-0 z-40 border-b backdrop-blur-md"
      >
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
          <Wordmark href="/" />

          <nav className="hidden items-center gap-9 lg:flex" aria-label="Main">
            {MARKET_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                aria-current={link.href === "/" ? "page" : undefined}
                className="link-underline text-[13px] font-medium tracking-[-0.005em] text-ink-soft transition-colors hover:text-ink aria-[current=page]:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/dashboard"
              className="lift inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-ink"
            >
              Explore Dashboard
              <ArrowIcon className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href="/dashboard"
              className="hidden items-center rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-white sm:inline-flex"
            >
              Explore Dashboard
            </Link>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="-mr-1 flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-accent-soft"
            >
              {open ? (
                <CloseIcon className="h-5 w-5" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 9h16M4 15h11" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {open ? (
          <div
            id="site-menu"
            className="menu-in border-y border-line bg-canvas lg:hidden"
          >
            <nav className="mx-auto max-w-[1440px] px-5 pb-6 pt-2 sm:px-8" aria-label="Mobile">
              <ul>
                {MARKET_LINKS.map((link, index) => (
                  <li key={link.label} style={{ "--i": index } as React.CSSProperties}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between border-b border-line py-4 text-[17px] font-medium tracking-[-0.01em] text-ink"
                    >
                      {link.label}
                      <ArrowIcon className="h-4 w-4 text-ink-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
              <div
                className="pt-6"
                style={{ "--i": MARKET_LINKS.length } as React.CSSProperties}
              >
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-3.5 text-sm font-semibold text-white"
                >
                  Explore Dashboard
                </Link>
              </div>
            </nav>
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-3">
          <Wordmark href="/dashboard" />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {APP_LINKS.map((link) => (
              <AppNavLink key={link.href} {...link} active={pathname === link.href} />
            ))}
          </nav>

          <LocationButton />
        </div>

        <nav
          className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pb-3 lg:hidden"
          aria-label="Main"
        >
          {APP_LINKS.map((link) => (
            <AppNavLink key={link.href} {...link} active={pathname === link.href} />
          ))}
        </nav>
      </div>
    </header>
  );
}
