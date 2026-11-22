import { expect, test, type Page } from "@playwright/test";
import { airFixture } from "./fixture";

async function mockAir(page: Page, overrides = {}) {
  await page.route("**/api/air*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(airFixture(overrides)),
    }),
  );
}

test.describe("landing page", () => {
  test("hero, navigation and primary actions are present", async ({ page }) => {
    await mockAir(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "The air you breathe. The choices you make.",
    );

    const nav = page.getByRole("navigation", { name: "Main" }).first();
    await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expect(nav.getByRole("link", { name: "How it works" })).toHaveAttribute(
      "href",
      "/#how-it-works",
    );
    await expect(nav.getByRole("link", { name: "Features" })).toHaveAttribute(
      "href",
      "/#features",
    );
    await expect(nav.getByRole("link", { name: "About" })).toHaveAttribute("href", "/#about");

    await expect(page.getByRole("link", { name: "Explore Dashboard" }).first()).toHaveAttribute(
      "href",
      "/dashboard",
    );
    await expect(page.getByRole("link", { name: "Explore Air Quality" })).toHaveAttribute(
      "href",
      "#live-air",
    );
    await expect(page.getByRole("link", { name: "Meet AI Assistant" }).first()).toHaveAttribute(
      "href",
      "/assistant",
    );
  });

  test("live section renders the real endpoint values and both indices", async ({ page }) => {
    await mockAir(page);
    await page.goto("/");

    await expect(page.getByTestId("landing-aqi")).toHaveText("172");
    await expect(page.getByTestId("landing-band")).toContainText("Unhealthy");
    await expect(page.getByText(/Open-Meteo US AQI/)).toBeVisible();
    await expect(page.getByTestId("landing-source")).toContainText(
      "Modelled, not measured at a station",
    );

    await page.getByRole("button", { name: "CPCB AQI" }).click();
    await expect(page.getByTestId("landing-aqi")).toHaveText("284");
    await expect(page.getByText(/not an official CPCB station reading/i)).toBeVisible();
  });

  test("a failed reading is disclosed rather than filled in", async ({ page }) => {
    await page.route("**/api/air*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "upstream_failed", message: "The air quality provider did not respond." },
        }),
      }),
    );

    await page.goto("/");
    await expect(page.getByTestId("live-fallback")).toBeVisible();
    await expect(page.getByText(/No value is invented to fill the gap/i)).toBeVisible();
    await expect(page.getByTestId("hero-fallback")).toBeVisible();
  });

  test("all landing anchors resolve to real sections", async ({ page }) => {
    await mockAir(page);
    await page.goto("/");

    for (const id of ["live-air", "features", "how-it-works", "about"]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }

    await expect(page.getByRole("link", { name: "Explore Dashboard" }).last()).toHaveAttribute(
      "href",
      "/dashboard",
    );
    await expect(page.getByRole("link", { name: "Meet AI Assistant" }).last()).toHaveAttribute(
      "href",
      "/assistant",
    );
    await expect(page.getByRole("link", { name: "Build today's plan" })).toHaveAttribute(
      "href",
      "/plan",
    );
    await expect(page.getByRole("link", { name: "Open indoor guidance" })).toHaveAttribute(
      "href",
      "/indoor",
    );
    await expect(page.getByRole("link", { name: "Compare a commute" })).toHaveAttribute(
      "href",
      "/impact",
    );
    await expect(page.getByRole("link", { name: "Read the insights" })).toHaveAttribute(
      "href",
      "/insights",
    );

    await expect(page.getByRole("contentinfo").getByRole("link", { name: "GitHub repository" }))
      .toHaveAttribute("href", "https://github.com/itspayalyadav/air-quality-intelligence");
  });

  test("the primary call to action reaches the dashboard", async ({ page }) => {
    await mockAir(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Explore Dashboard" }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("New Delhi");
  });

  test("the mobile menu opens, navigates and closes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockAir(page);
    await page.goto("/");

    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.locator("#site-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: "Features" })).toBeVisible();

    await menu.getByRole("link", { name: "Features" }).click();
    await expect(page).toHaveURL(/\/#features$/);
    await expect(menu).toHaveCount(0);
  });

  for (const viewport of [
    { name: "wide desktop", width: 1440, height: 900 },
    { name: "laptop", width: 1280, height: 800 },
    { name: "small laptop", width: 1024, height: 768 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "phone", width: 390, height: 844 },
    { name: "small phone", width: 360, height: 780 },
  ]) {
    test(`no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await mockAir(page);
      await page.goto("/");
      await expect(page.getByTestId("landing-aqi")).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1);
    });
  }
});
