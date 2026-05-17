import { test, expect } from "@playwright/test";

/**
 * E2E: Auth flows — signup → login → logout
 *
 * Tests the authentication journey.
 * NOTE: Uses real Supabase in local dev mode; tests are designed
 * to work without requiring actual account creation.
 */

test.describe("Authentication", () => {
  test("login page renders form fields", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("login form validates required fields", async ({ page }) => {
    await page.goto("/auth/login");

    // Submit without filling fields — HTML5 validation prevents submission
    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("signup page renders with onboarding link", async ({ page }) => {
    await page.goto("/auth/signup");

    await expect(page.getByText("Create an account")).toBeVisible();
    await expect(page.getByRole("link", { name: /Begin Onboarding/i })).toBeVisible();
  });

  test("can navigate from login to signup", async ({ page }) => {
    await page.goto("/auth/login");

    await page.getByRole("link", { name: /Get started/i }).click();
    await page.waitForURL("/onboarding");
    await expect(page.url()).toContain("/onboarding");
  });

  test("onboarding page loads with role selection", async ({ page }) => {
    await page.goto("/onboarding");

    // Role selection should be visible (buyer, seller, agent)
    await expect(page.getByText(/buyer|Buyer/i).first()).toBeVisible();
  });

  test("protected routes redirect unauthenticated users", async ({ page }) => {
    await page.goto("/dashboard");

    // Should redirect to onboarding since not authenticated
    await page.waitForURL(/onboarding|auth/);
    await expect(page.url()).toMatch(/onboarding|auth/);
  });
});
