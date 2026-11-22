/**
 * Deterministic trip-emissions estimates. Everything here is an assumption the
 * UI prints next to the result — these are planning figures, not measurements.
 */

export type TravelMode = {
  id: string;
  label: string;
  gramsPerPassengerKm: number;
  assumption: string;
};

export const TRAVEL_MODES: TravelMode[] = [
  {
    id: "car",
    label: "Petrol car, alone",
    gramsPerPassengerKm: 150,
    assumption: "Mid-size petrol car emitting about 150 g CO₂ per km, one occupant.",
  },
  {
    id: "carpool",
    label: "Petrol car, 3 people",
    gramsPerPassengerKm: 50,
    assumption: "The same 150 g/km car split across three occupants.",
  },
  {
    id: "two-wheeler",
    label: "Petrol two-wheeler",
    gramsPerPassengerKm: 50,
    assumption: "Typical 100–125 cc motorcycle or scooter, one rider.",
  },
  {
    id: "auto",
    label: "CNG auto-rickshaw, shared",
    gramsPerPassengerKm: 30,
    assumption: "CNG three-wheeler at roughly 60 g/km shared between two passengers.",
  },
  {
    id: "bus",
    label: "City bus",
    gramsPerPassengerKm: 25,
    assumption: "Average urban bus occupancy, roughly 25 g per passenger-km.",
  },
  {
    id: "metro",
    label: "Metro / suburban rail",
    gramsPerPassengerKm: 20,
    assumption: "Indian metro at average occupancy on a coal-heavy grid, 15–30 g per passenger-km.",
  },
  {
    id: "cycle",
    label: "Cycle or walk",
    gramsPerPassengerKm: 0,
    assumption: "No tailpipe emissions. Food-cycle emissions are excluded.",
  },
  {
    id: "ev",
    label: "Electric car",
    gramsPerPassengerKm: 105,
    assumption: "0.15 kWh/km on an Indian grid emitting about 0.71 kg CO₂ per kWh.",
  },
];

export type TripInput = {
  oneWayKm: number;
  tripsPerWeek: number;
  mode: string;
};

export type ImpactRow = {
  mode: TravelMode;
  weeklyGrams: number;
  savedVersusCarGrams: number;
  percentOfCar: number;
};

export function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function weeklyDistance(input: TripInput) {
  const km = clampNumber(input.oneWayKm, 0, 500);
  const trips = clampNumber(input.tripsPerWeek, 0, 30);
  return km * 2 * trips;
}

export function computeImpact(input: TripInput): ImpactRow[] {
  const distance = weeklyDistance(input);
  const baseline =
    (TRAVEL_MODES.find((m) => m.id === "car")?.gramsPerPassengerKm ?? 150) * distance;

  return TRAVEL_MODES.map((mode) => {
    const weeklyGrams = mode.gramsPerPassengerKm * distance;
    return {
      mode,
      weeklyGrams,
      savedVersusCarGrams: baseline - weeklyGrams,
      percentOfCar: baseline > 0 ? (weeklyGrams / baseline) * 100 : 0,
    };
  });
}

export function formatKg(grams: number) {
  const kg = grams / 1000;
  if (Math.abs(kg) < 0.1) return `${Math.round(grams)} g`;
  return `${kg.toFixed(kg < 10 ? 1 : 0)} kg`;
}
