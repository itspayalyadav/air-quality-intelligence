import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { usBand } from "../lib/aqi";
import { airFixture } from "./fixture";

const panel = (page: Page) =>
  page.getByRole("region", { name: "Health and activity guidance" });

async function mockAir(page: Page, overrides = {}) {
  await page.route("**/api/air*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(airFixture(overrides)),
    }),
  );
}

async function mockAi(page: Page, status: number, code: string, message: string) {
  await page.route("**/api/ai", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ error: { code, message } }),
    }),
  );
}

test.describe("API contracts", () => {
  test("/api/air rejects missing and non-numeric coordinates", async ({ request }) => {
    for (const query of ["", "?lat=0&lon=0abc", "?lat=NaN&lon=77"]) {
      const response = await request.get(`/api/air${query}`);
      expect(response.status()).toBe(400);
      expect((await response.json()).error.code).toBe("invalid_location");
    }
  });
});

test.describe("live data", () => {
  test("dashboard renders real readings from Open-Meteo", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("New Delhi");
    await expect(page.getByTestId("aqi-value")).toBeVisible({ timeout: 30_000 });

    const value = await page.getByTestId("aqi-value").innerText();
    expect(Number(value)).toBeGreaterThan(0);
    expect(Number(value)).toBeLessThanOrEqual(500);

    await expect(page.getByTestId("aqi-band")).toBeVisible();
    await expect(page.getByText(/US EPA AQI from CAMS modelled data/)).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
  });

  test("city search returns geocoded places", async ({ page }) => {
    await mockAir(page);
    await page.route("**/api/cities*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [
            {
              id: "19.07,72.87",
              name: "Mumbai",
              admin: "Maharashtra",
              country: "India",
              countryCode: "IN",
              latitude: 19.07,
              longitude: 72.87,
            },
          ],
        }),
      }),
    );

    await page.goto("/dashboard");
    await page.getByRole("button", { name: /New Delhi/ }).click();
    await page.getByLabel("Search for a city").fill("mumbai");
    await expect(page.getByRole("button", { name: /Mumbai/ })).toBeVisible();
  });
});

test.describe("failure states", () => {
  test("invalid location is reported instead of rendered blank", async ({ page }) => {
    await page.route("**/api/air*", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "invalid_location", message: "Latitude and longitude are required and must be valid." },
        }),
      }),
    );

    await page.goto("/dashboard");
    await expect(page.getByText(/Could not load readings/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("a missing API key is disclosed, never faked as an answer", async ({ page }) => {
    await mockAir(page);
    await mockAi(page, 503, "missing_key", "GEMINI_API_KEY is not configured.");

    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Generate briefing" }).click();

    await expect(page.getByText("Live AI is not configured")).toBeVisible();
    await expect(page.getByText(/no AI answer is generated/i)).toBeVisible();
  });

  test("a Gemini 503 is surfaced with an explanation and a retry", async ({ page }) => {
    await mockAir(page);
    await mockAi(page, 503, "busy", "The AI model is busy right now.");

    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Generate briefing" }).click();

    await expect(page.getByText("Gemini is busy")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("assistant refuses to invent an answer when the model fails", async ({ page }) => {
    await mockAir(page);
    await mockAi(page, 503, "busy", "The AI model is busy right now.");

    await page.goto("/assistant");
    await page.getByRole("button", { name: "Is it safe to run outside at 7pm?" }).click();

    await expect(page.getByText("Gemini is busy")).toBeVisible();
    await expect(page.getByText(/Nothing is wrong with your setup/)).toBeVisible();
  });
});

test.describe("AI briefing markdown", () => {
  const BRIEFING = [
    "**Kolkata Air Briefing**",
    "",
    "**Air Quality & Driver:** PM2.5 is driving today's reading.",
    "",
    "- Open windows before 7am.",
    "- Take the metro for the longer trip.",
  ].join("\n");

  async function mockBriefing(page: Page, text: string) {
    await mockAir(page);
    await page.route("**/api/ai", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ mode: "chat", text, model: "gemini-test", configured: true }),
      }),
    );
  }

  test("renders bold labels, paragraphs and bullets instead of raw markdown", async ({ page }) => {
    await mockBriefing(page, BRIEFING);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Generate briefing" }).click();

    await expect(page.locator("strong", { hasText: "Kolkata Air Briefing" })).toBeVisible();
    await expect(page.locator("strong", { hasText: "Air Quality & Driver:" })).toBeVisible();
    await expect(page.getByText("**Air Quality & Driver:**")).toHaveCount(0);
    await expect(page.locator("li", { hasText: "Open windows before 7am." })).toBeVisible();
    await expect(page.locator("li", { hasText: "Take the metro for the longer trip." })).toBeVisible();
    await expect(page.getByText("Generated by gemini-test")).toBeVisible();
  });

  test("shows a neutral message when the model returns empty text", async ({ page }) => {
    await mockBriefing(page, "   ");
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Generate briefing" }).click();

    await expect(page.getByText("No text came back from the model")).toBeVisible();
  });
});

test.describe("data honesty", () => {
  test("switching to CPCB shows the computed value and its caveat", async ({ page }) => {
    await mockAir(page);
    await page.goto("/dashboard");

    await expect(page.getByTestId("aqi-value")).toHaveText("172");
    await page.getByRole("button", { name: "CPCB AQI" }).click();
    await expect(page.getByTestId("aqi-value")).toHaveText("284");
    await expect(page.getByText(/not an official CPCB station reading/i)).toBeVisible();
  });

  test("stale readings are flagged", async ({ page }) => {
    await mockAir(page, { stale: true });
    await page.goto("/dashboard");
    await expect(page.getByText(/more than three hours old/i)).toBeVisible();
  });
});

test.describe("health guidance", () => {
  test("shows the current US category with sensitive-group and action copy", async ({ page }) => {
    await mockAir(page);
    await page.goto("/dashboard");

    const guidance = panel(page);
    await expect(guidance).toContainText("Everyone may begin to experience health effects.");
    await expect(guidance.getByText("Unhealthy", { exact: true })).toBeVisible();
    await expect(guidance).toContainText("Reduce prolonged or heavy outdoor exertion for everyone.");
    await expect(guidance).toContainText("Sensitive groups should move workouts indoors.");
    await expect(guidance).toContainText("Keep windows closed and use a purifier if you have one.");
    await expect(guidance).toContainText("indoor air is not measured here");
  });

  test("switching to CPCB swaps the badge and the advice", async ({ page }) => {
    await mockAir(page);
    await page.goto("/dashboard");
    const guidance = panel(page);
    await expect(guidance.getByText("Unhealthy", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "CPCB AQI" }).click();

    await expect(guidance.getByText("Poor", { exact: true })).toBeVisible();
    await expect(guidance).toContainText("Breathing discomfort on prolonged exposure.");
    await expect(guidance).toContainText("Avoid outdoor exercise.");
    await expect(guidance).toContainText("Keep windows closed and run a purifier in the room you use most.");
    await expect(guidance).not.toContainText("Everyone may begin to experience health effects.");
  });

  test("Good readings get Good advice, not a hardcoded category", async ({ page }) => {
    await mockAir(page, { usAqi: 32, usBand: usBand(32) });
    await page.goto("/dashboard");

    const guidance = panel(page);
    await expect(guidance.getByText("Good", { exact: true })).toBeVisible();
    await expect(guidance).toContainText("Air quality is satisfactory and poses little risk to health.");
    await expect(guidance).toContainText("Normal outdoor activity is fine for everyone.");
    await expect(guidance).toContainText("A good day to open windows for ventilation.");
    await expect(guidance).not.toContainText("Favour early-morning outdoor time");
  });

  test("says so when no category is available instead of showing advice", async ({ page }) => {
    await mockAir(page, { usAqi: null, usBand: null, cpcb: null });
    await page.goto("/dashboard");

    const guidance = panel(page);
    await expect(guidance.getByText("Not available")).toBeVisible();
    await expect(guidance).toContainText("Guidance appears once this location has a current AQI");
    await expect(guidance).not.toContainText("What to do today");

    await page.getByRole("button", { name: "CPCB AQI" }).click();
    await expect(guidance).toContainText("Guidance appears once this location has a current AQI");
  });

  test("updates when fresh readings arrive", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/air*", (route) => {
      calls += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(calls === 1 ? airFixture() : airFixture({ usAqi: 32, usBand: usBand(32) })),
      });
    });

    await page.goto("/dashboard");
    const guidance = panel(page);
    await expect(guidance.getByText("Unhealthy", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(guidance.getByText("Good", { exact: true })).toBeVisible();
    await expect(guidance).toContainText("A good day to open windows for ventilation.");
  });

  test("updates when the city changes", async ({ page }) => {
    await page.route("**/api/air*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          route.request().url().includes("19.07")
            ? airFixture({ usAqi: 32, usBand: usBand(32) })
            : airFixture(),
        ),
      }),
    );
    await page.route("**/api/cities*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [
            {
              id: "19.07,72.87",
              name: "Mumbai",
              admin: "Maharashtra",
              country: "India",
              countryCode: "IN",
              latitude: 19.07,
              longitude: 72.87,
            },
          ],
        }),
      }),
    );

    await page.goto("/dashboard");
    const guidance = panel(page);
    await expect(guidance.getByText("Unhealthy", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /New Delhi/ }).click();
    await page.getByLabel("Search for a city").fill("mumbai");
    await page.getByRole("button", { name: /Mumbai/ }).click();

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mumbai");
    await expect(guidance.getByText("Good", { exact: true })).toBeVisible();
    await expect(guidance).toContainText("Normal outdoor activity is fine for everyone.");
  });
});

test.describe("responsive layout", () => {
  for (const viewport of [
    { name: "phone", width: 390, height: 844 },
    { name: "tablet", width: 834, height: 1112 },
    { name: "desktop", width: 1440, height: 900 },
  ]) {
    test(`no horizontal overflow on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await mockAir(page);
      await page.goto("/dashboard");
      await expect(page.getByTestId("aqi-value")).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1);
    });
  }

  test("navigation stays reachable on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockAir(page);
    await page.goto("/dashboard");

    const nav = page.getByRole("navigation", { name: "Main" }).last();
    await expect(nav).toBeVisible();

    await nav.getByRole("link", { name: "Assistant" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ask about the air");
  });
});

test.describe("accessibility", () => {
  for (const path of [
    "/",
    "/dashboard",
    "/assistant",
    "/plan",
    "/indoor",
    "/impact",
    "/insights",
  ]) {
    test(`${path} has no serious accessibility violations`, async ({ page }) => {
      await mockAir(page);
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const serious = results.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      );

      expect(
        serious.map((violation) => ({
          id: violation.id,
          nodes: violation.nodes.map((node) => node.target.join(" ")),
        })),
      ).toEqual([]);
    });
  }
});
