import { describe, expect, it } from "vitest";
import { groundedRequest } from "@/lib/ai-client";

describe("groundedRequest", () => {
  it("sends coordinates separately and drops them from the place", () => {
    const request = groundedRequest({
      place: {
        name: "New Delhi",
        admin: "National Capital Territory of Delhi",
        country: "India",
        countryCode: "IN",
        latitude: 28.6139,
        longitude: 77.209,
      },
    });

    expect(request).toEqual({
      lat: 28.6139,
      lon: 77.209,
      place: {
        name: "New Delhi",
        admin: "National Capital Territory of Delhi",
        country: "India",
        countryCode: "IN",
      },
    });
  });
});
