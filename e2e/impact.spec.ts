import { expect, test, type Page } from "@playwright/test";
import { airFixture } from "./fixture";

async function mockAir(page: Page) {
  await page.route("**/api/air*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(airFixture()),
    }),
  );
}

test("commute impact table is interactive and explainable", async ({ page }) => {
  await mockAir(page);
  await page.route("**/api/ai", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        mode: "chat",
        text: "Your choice lowers your own footprint. Limits: it does not lower citywide AQI.",
        model: "gemini-test",
        configured: true,
      }),
    }),
  );

  await page.goto("/impact");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Compare everyday travel choices");
  await expect(page.getByRole("heading", { name: "Weekly CO₂e by mode" })).toBeVisible();

  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(8);
  await expect(page.getByText("you", { exact: true })).toHaveCount(1);

  await page.getByLabel("How you travel now").selectOption("metro");
  await expect(page.getByText(/Choosing .* instead of driving alone saves about/)).toBeVisible();

  await page.getByRole("button", { name: "Explain this" }).click();
  await expect(page.getByText(/Your choice lowers your own footprint/)).toBeVisible();
});
