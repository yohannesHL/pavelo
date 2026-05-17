import { test, expect } from "@playwright/test";

/**
 * E2E: Agency Dashboard
 *
 * Tests the agency dashboard, analytics, and settings pages.
 */

test.describe("Agency Dashboard", () => {
  test("agency page loads with KPI cards and tabs", async ({ page }) => {
    await page.goto("/agency");

    await expect(page.getByText("Agency Dashboard")).toBeVisible();

    // KPI cards should be visible
    await expect(page.getByText("Active Conversations")).toBeVisible();
    await expect(page.getByText("Properties Listed")).toBeVisible();
    await expect(page.getByText("Leads This Month")).toBeVisible();

    // Tab navigation
    await expect(page.getByRole("button", { name: /Lead Pipeline/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /AI Conversations/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Team/i })).toBeVisible();
  });

  test("can switch between tabs", async ({ page }) => {
    await page.goto("/agency");

    // Click conversations tab
    await page.getByRole("button", { name: /AI Conversations/i }).click();

    // Click team tab
    await page.getByRole("button", { name: /Team/i }).click();

    // Click back to leads
    await page.getByRole("button", { name: /Lead Pipeline/i }).click();
  });

  test("analytics page loads with charts", async ({ page }) => {
    await page.goto("/agency/analytics");

    await expect(page.getByText("Conversation Analytics")).toBeVisible();
    await expect(page.getByText("Message Volume")).toBeVisible();
    await expect(page.getByText("Intent Distribution")).toBeVisible();

    // Date range picker
    await expect(page.getByRole("button", { name: "7 Days" })).toBeVisible();
    await expect(page.getByRole("button", { name: "30 Days" })).toBeVisible();
    await expect(page.getByRole("button", { name: "90 Days" })).toBeVisible();
  });

  test("analytics date range picker toggles", async ({ page }) => {
    await page.goto("/agency/analytics");

    await page.getByRole("button", { name: "7 Days" }).click();
    await page.getByRole("button", { name: "90 Days" }).click();
  });
});
