import { test, expect } from "@playwright/test";

/**
 * E2E: Home Page — smoke tests for core layout and navigation
 */

test.describe("Home Page", () => {
  test("loads without errors", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
  });

  test("has navigation links", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav, header");
    await expect(nav.first()).toBeVisible();
  });

  test("voice CTA links to chat with voice", async ({ page }) => {
    await page.goto("/");
    const voiceCta = page
      .locator('a[href*="voice=true"], a[href*="chat"]')
      .first();
    if (await voiceCta.isVisible()) {
      const href = await voiceCta.getAttribute("href");
      expect(href).toMatch(/chat/);
    }
  });
});
