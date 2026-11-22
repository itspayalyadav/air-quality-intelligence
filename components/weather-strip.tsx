import type { Weather } from "@/lib/types";
import { Card, EmptyState } from "./ui";
import { DropIcon, ThermometerIcon, WindIcon } from "./icons";

function metric(value: number | null, unit: string, digits = 0) {
  if (value == null) return "—";
  return `${value.toFixed(digits)}${unit}`;
}

export function WeatherStrip({ weather }: { weather: Weather | null }) {
  if (!weather) {
    return (
      <Card>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
          Weather context
        </p>
        <EmptyState
          title="Weather data unavailable"
          body="Wind and humidity explain a lot about how pollution disperses. This reading could not be fetched, so no weather context is shown rather than a guess."
        />
      </Card>
    );
  }

  const items = [
    {
      icon: <ThermometerIcon className="h-4 w-4" />,
      label: "Temperature",
      value: metric(weather.temperatureC, "°C", 1),
    },
    {
      icon: <DropIcon className="h-4 w-4" />,
      label: "Humidity",
      value: metric(weather.humidityPct, "%"),
    },
    {
      icon: <WindIcon className="h-4 w-4" />,
      label: "Wind",
      value:
        weather.windKph == null
          ? "—"
          : `${weather.windKph.toFixed(1)} km/h${weather.windCompass ? ` ${weather.windCompass}` : ""}`,
    },
  ];

  const still = weather.windKph != null && weather.windKph < 6;

  return (
    <Card>
      <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
        Weather context
      </p>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs text-ink-muted">
              <span className="text-ink-muted">{item.icon}</span>
              {item.label}
            </span>
            <span className="tnum whitespace-nowrap font-mono text-sm text-ink">{item.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-muted">
        {still
          ? "Winds are light. Pollutants are dispersing slowly, so concentrations can build up through the evening."
          : "Moving air helps disperse pollutants. Wind direction also tells you whether smoke is being carried toward you."}
      </p>
    </Card>
  );
}
