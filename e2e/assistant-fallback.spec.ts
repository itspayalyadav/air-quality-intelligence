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

test("assistant failure links to real rule-based decisions", async ({ page }) => {
  await mockAir(page);
  await page.route("**/api/ai", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "busy", message: "The AI model is busy right now." } }),
    }),
  );

  await page.goto("/assistant");
  await page.getByRole("button", { name: "Is it safe to run outside at 7pm?" }).click();

  const link = page.getByRole("link", { name: /rule-based decisions for these readings/ });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "/decisions");

  await link.click();
  await expect(page).toHaveURL(/\/decisions$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("What should I do");
});
