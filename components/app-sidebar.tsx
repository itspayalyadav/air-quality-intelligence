"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocation } from "@/lib/location";
import {
  ArrowIcon,
  ShieldIcon,
  SparkIcon,
  ThermometerIcon,
  WindIcon,
} from "./icons";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", Icon: ThermometerIcon },
  { href: "/decisions", label: "Decisions", Icon: ShieldIcon },
  { href: "/assistant", label: "Assistant", Icon: SparkIcon },
  { href: "/plan", label: "Daily plan", Icon: ArrowIcon },
  { href: "/indoor", label: "Indoor air", Icon: ShieldIcon },
  { href: "/impact", label: "Impact", Icon: ArrowIcon },
  { href: "/insights", label: "Insights", Icon: WindIcon },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { air, place } = useLocation();

  if (pathname === "/") return null;

  return (
    <aside className="hidden w-[228px] shrink-0 border-r border-line bg-surface/70 lg:block">
      <div className="sticky top-16 flex min-h-[calc(100vh-4rem)] flex-col px-4 py-6">
        <p className="eyebrow px-2">Workspace</p>
        <nav className="mt-4 space-y-1" aria-label="Workspace">
          {LINKS.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-accent text-white"
                    : "text-ink-soft hover:bg-accent-soft hover:text-ink"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
                <span
                  className={`bracket text-[11px] ${active ? "text-white/80" : "text-muted"}`}
                  aria-hidden="true"
                >
                  {active ? "▸" : "·"}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-line pt-5">
          <p className="eyebrow px-1">Current place</p>
          <p className="mt-2 truncate px-1 text-sm font-bold text-ink">{place.name}</p>
          <div className="mt-3 border-l-2 border-signal bg-canvas px-3 py-2.5">
            <p className="text-[11px] text-ink-muted">Live AQI</p>
            <p className="tnum text-xl font-extrabold leading-tight text-ink">
              {air ? (air.usAqi ?? "—") : "—"}
              {air?.cpcb ? (
                <span className="ml-1 text-[11px] font-semibold text-ink-muted">
                  / {air.cpcb.aqi} CPCB
                </span>
              ) : null}
            </p>
          </div>
          <p className="mt-4 px-1 text-[10px] leading-relaxed text-ink-muted">
            Modelled CAMS data via Open-Meteo. Not a station reading.
          </p>
        </div>
      </div>
    </aside>
  );
}
