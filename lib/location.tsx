"use client";

/* eslint-disable react-hooks/set-state-in-effect --
   This provider is the bridge between two external systems: localStorage on mount and the
   /api/air fetch. Setting state inside those effects is the point of the effect, not a cascade. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AirData, Place } from "./types";
import { readJson } from "./http";

const DEFAULT_PLACE: Place = {
  name: "New Delhi",
  admin: "National Capital Territory of Delhi",
  country: "India",
  countryCode: "IN",
  latitude: 28.6139,
  longitude: 77.209,
};

const STORAGE_KEY = "aeris:place";

export type LocationError = { code: string; message: string } | null;

type LocationContextValue = {
  place: Place;
  air: AirData | null;
  loading: boolean;
  error: LocationError;
  geoError: string | null;
  locating: boolean;
  setPlace: (place: Place) => void;
  refresh: () => void;
  locate: () => void;
};

const LocationContext = createContext<LocationContextValue | null>(null);

function placeQuery(place: Place) {
  const params = new URLSearchParams({
    lat: String(place.latitude),
    lon: String(place.longitude),
    name: place.name,
  });
  if (place.admin) params.set("admin", place.admin);
  if (place.country) params.set("country", place.country);
  if (place.countryCode) params.set("countryCode", place.countryCode);
  return params.toString();
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [place, setPlaceState] = useState<Place>(DEFAULT_PLACE);
  const [air, setAir] = useState<AirData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LocationError>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [nonce, setNonce] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Place;
      if (Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude) && parsed.name) {
        setPlaceState(parsed);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    const refreshParam = nonce > 0 ? `&refresh=${nonce}` : "";
    fetch(`/api/air?${placeQuery(place)}${refreshParam}`, { signal: controller.signal })
      .then((response) => readJson<AirData>(response, "Could not load air quality data."))
      .then((data) => {
        if (id !== requestId.current) return;
        setAir(data);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (id !== requestId.current || (cause instanceof Error && cause.name === "AbortError")) {
          return;
        }
        setError({ code: "fetch_failed", message: cause instanceof Error ? cause.message : "Network error." });
        setLoading(false);
      });

    return () => controller.abort();
  }, [place, nonce]);

  const setPlace = useCallback((next: Place) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setGeoError(null);
    setPlaceState(next);
  }, []);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("This browser does not support location detection. Search for your city instead.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setPlace({
          name: "Your location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (geo) => {
        setLocating(false);
        setGeoError(
          geo.code === geo.PERMISSION_DENIED
            ? "Location permission was denied. Search for your city instead."
            : "Could not detect your location. Search for your city instead.",
        );
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }, [setPlace]);

  const value = useMemo(
    () => ({ place, air, loading, error, geoError, locating, setPlace, refresh, locate }),
    [place, air, loading, error, geoError, locating, setPlace, refresh, locate],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error("useLocation must be used inside LocationProvider");
  return context;
}
