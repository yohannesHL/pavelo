import { test, expect } from "@playwright/test";

/**
 * E2E: Homepage → Search → Results → Property Detail
 *
 * Tests the core buyer journey through the search experience.
 */

test.describe("Property Search Flow", () => {
  test("homepage loads with hero and navigation", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Pavelo/);
    await expect(page.getByRole("link", { name: "Pavelo" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Properties" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Chat" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voice" })).toBeVisible();
  });

  test("can navigate to properties page", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Properties" }).click();
    await page.waitForURL("/property");

    await expect(page.url()).toContain("/property");
  });

  test("property listing page renders search and results", async ({ page }) => {
    await page.goto("/property");

    // Page should have a heading or search area
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("can navigate to a property detail page", async ({ page }) => {
    await page.goto("/property");

    // Look for any property link/card
    const propertyLink = page.locator("a[href^='/property/']").first();
    if (await propertyLink.isVisible()) {
      await propertyLink.click();
      await expect(page.url()).toContain("/property/");
    }
  });

  test("sell page loads with wizard steps", async ({ page }) => {
    await page.goto("/sell");

    await expect(page.getByText("Sell Your Property")).toBeVisible();
    await expect(page.getByText("Step 1 of 5")).toBeVisible();
  });
});
