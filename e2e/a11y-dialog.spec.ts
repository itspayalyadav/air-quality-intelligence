import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { airFixture } from "./fixture";

test.describe("keyboard and dialog accessibility", () => {
  test("location dialog traps Tab, closes on Escape and restores focus", async ({ page }) => {
    await page.route("**/api/air*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(airFixture()),
      }),
    );
    await page.goto("/dashboard");

    const trigger = page.getByRole("button", { name: /New Delhi/ });
    await trigger.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Choose a location" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(page.getByLabel("Search for a city")).toBeFocused();

    // Cycle past the end and back: focus must never leave the dialog.
    for (let step = 0; step < 5; step += 1) {
      await page.keyboard.press("Tab");
      const inside = await dialog.evaluate((node) => node.contains(document.activeElement));
      expect(inside, `Tab step ${step + 1} left the dialog`).toBe(true);
    }
    await page.keyboard.press("Shift+Tab");
    expect(
      await dialog.evaluate((node) => node.contains(document.activeElement)),
    ).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("axe finds no serious violations while the location dialog is open", async ({ page }) => {
    await page.route("**/api/air*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(airFixture()),
      }),
    );
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /New Delhi/ }).click();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    );
    expect(serious.map((item) => `${item.id}: ${item.help}`)).toEqual([]);
  });

  test("mobile menu closes with Escape and returns focus to its toggle", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/air*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(airFixture()),
      }),
    );
    await page.goto("/");

    const scan = async () => {
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
        .analyze();
      const serious = results.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact ?? ""),
      );
      expect(serious.map((item) => `${item.id}: ${item.help}`)).toEqual([]);
    };

    await scan(); // closed menu: no dangling aria-controls IDREF
    const toggle = page.getByRole("button", { name: "Open menu" });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
    await scan();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  });

  test("announces the number of cities found", async ({ page }) => {
    await page.route("**/api/air*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(airFixture()),
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
    await page.getByRole("button", { name: /New Delhi/ }).click();
    await page.getByLabel("Search for a city").fill("mumbai");
    await expect(page.getByText("1 city found.")).toHaveCount(1);
  });

  test("reduced motion disables pulse animations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const animation = await page.evaluate(() => {
      const node = document.createElement("div");
      node.className = "animate-pulse";
      document.body.appendChild(node);
      const name = getComputedStyle(node).animationName;
      node.remove();
      return name;
    });
    expect(animation).toBe("none");
  });
});
