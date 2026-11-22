import type { AiPlace, Place } from "./types";

export type GroundedRequest = { lat: number; lon: number; place: AiPlace };

/**
 * Coordinates and place for `/api/ai`. The server re-fetches the readings from
 * the coordinates, so no measurement ever travels from the browser.
 */
export function groundedRequest({ place }: { place: Place }): GroundedRequest {
  const { latitude, longitude, name, admin, country, countryCode } = place;
  return { lat: latitude, lon: longitude, place: { name, admin, country, countryCode } };
}
