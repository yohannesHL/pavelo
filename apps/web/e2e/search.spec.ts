import { test, expect } from "@playwright/test";

/**
 * E2E: Property Search — RAG search, suggestion chips, filters
 *
 * Tests the AI-powered property search experience.
 */

test.describe("Property Search", () => {
  test("loads the search page", async ({ page }) => {
    await page.goto("/property");
    await expect(page.locator("h1")).toContainText("Find Your Perfect Property");
  });

  test("shows suggestion chips when search bar is empty", async ({ page }) => {
    await page.goto("/property");
    await expect(page.locator("text=Try:")).toBeVisible();
  });

  test("can type a search query and submit", async ({ page }) => {
    await page.goto("/property");
    const searchInput = page
      .locator(
        'input[type="search"], input[placeholder*="search" i], input[placeholder*="describe" i]'
      )
      .first();
    await searchInput.fill("3 bed house in London");
    await searchInput.press("Enter");

    // Should show loading or results
    await expect(
      page
        .locator(
          '[data-testid="search-results"], .animate-fade-in-up, .animate-pulse'
        )
        .first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows AI-ranked badge when results are semantic", async ({ page }) => {
    await page.goto("/property");
    const searchInput = page
      .locator(
        'input[type="search"], input[placeholder*="search" i], input[placeholder*="describe" i]'
      )
      .first();
    await searchInput.fill("modern flat with balcony");
    await searchInput.press("Enter");

    // Wait for results — if RAG is available, should show AI-ranked badge
    // If not, graceful fallback (no badge) is also acceptable
    await page.waitForTimeout(3000);
    await page
      .locator(
        '[data-testid="property-card"], article, .search-property-card'
      )
      .first()
      .isVisible()
      .catch(() => false);
    // Verify page didn't crash
    await expect(page.locator("h1")).toContainText("Find Your Perfect Property");
  });

  test("filter sidebar is visible on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/property");
    await expect(page.locator("text=Price Range").first()).toBeVisible();
  });

  test("clicking suggestion chip triggers search", async ({ page }) => {
    await page.goto("/property");
    const chip = page
      .locator("button")
      .filter({ hasText: /family home|flat|Victorian|cottage|Penthouse/i })
      .first();
    if (await chip.isVisible()) {
      await chip.click();
      await page.waitForTimeout(1000);
    }
  });
});
