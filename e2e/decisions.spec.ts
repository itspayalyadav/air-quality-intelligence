import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { cpcbBand } from "../lib/aqi";
import { airFixture } from "./fixture";

async function mockAir(page: Page, aqi: number) {
  await page.route("**/api/air*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        airFixture({
          history: {
            time: Array.from({ length: 72 }, (_, index) => String(index)),
            pm25: Array.from({ length: 72 }, () => 40),
          },
          usAqi: aqi,
          cpcb: {
            aqi,
            band: cpcbBand(aqi),
            subIndices: { pm2_5: aqi },
            sampleSize: 6,
            dominant: "pm2_5",
          },
        }),
      ),
    }),
  );
}

test.describe("decision engine", () => {
  test("shows four grounded verdicts with auditable rules", async ({ page }) => {
    await mockAir(page, 284);
    await page.goto("/decisions");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("What should I do");
    for (const title of ["Go outside", "Exercise outside", "Ventilate home", "Commute choice"]) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }
    await expect(page.getByText("Avoid", { exact: true })).toHaveCount(4);
    await page.getByText("How this verdict was decided").first().click();
    await expect(page.getByText(/CPCB tier/).first()).toBeVisible();
  });

  test("a sensitive user changes the deterministic verdict without any AI call", async ({ page }) => {
    await mockAir(page, 150);
    await page.goto("/decisions");

    // Ventilation is deliberately one step stricter at the same index level.
    await expect(page.getByText("Use care", { exact: true })).toHaveCount(3);
    await expect(page.getByText("Avoid", { exact: true })).toHaveCount(1);
    await page.getByLabel("I am in a sensitive group").check();
    await expect(page.getByText("Avoid", { exact: true })).toHaveCount(4);
  });

  test("honest AI failure keeps the rule-based verdict visible", async ({ page }) => {
    await mockAir(page, 284);
    await page.route("**/api/ai", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "missing_key", message: "not configured" } }),
      }),
    );
    await page.goto("/decisions");

    await page.getByRole("button", { name: "Explain with AI" }).first().click();
    await expect(page.getByText("Live AI is not configured")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Move plans indoors", exact: true }),
    ).toBeVisible();
  });

  test("no serious or critical accessibility violations", async ({ page }) => {
    await mockAir(page, 284);
    await page.goto("/decisions");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    );
    expect(serious.map((item) => `${item.id}: ${item.help}`)).toEqual([]);
  });
});
