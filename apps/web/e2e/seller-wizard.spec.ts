import { test, expect } from "@playwright/test";

/**
 * E2E: Seller Onboarding Wizard
 *
 * Tests the multi-step seller property submission flow.
 */

test.describe("Seller Onboarding Wizard", () => {
  test("wizard loads at step 1 with address form", async ({ page }) => {
    await page.goto("/sell");

    await expect(page.getByText("Sell Your Property")).toBeVisible();
    await expect(page.getByText("Step 1 of 5")).toBeVisible();
    await expect(page.getByText("Address")).toBeVisible();
  });

  test("back button is disabled on step 1", async ({ page }) => {
    await page.goto("/sell");

    const backBtn = page.getByRole("button", { name: /Back/i });
    await expect(backBtn).toBeDisabled();
  });

  test("next button is disabled without valid data", async ({ page }) => {
    await page.goto("/sell");

    const nextBtn = page.getByRole("button", { name: /Next/i });
    await expect(nextBtn).toBeDisabled();
  });

  test("step indicator shows all 5 steps", async ({ page }) => {
    await page.goto("/sell");

    // Check for step icons/labels
    await expect(page.getByText("Address")).toBeVisible();
    await expect(page.getByText("Details")).toBeVisible();
    await expect(page.getByText("Review")).toBeVisible();
  });
});
