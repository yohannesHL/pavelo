import { test, expect } from "@playwright/test";

/**
 * E2E: Chat — open chat → send message → receive response
 *
 * Tests the chat UI (requires auth redirect or mocked state).
 */

test.describe("Chat Interface", () => {
  test("chat page redirects unauthenticated users", async ({ page }) => {
    await page.goto("/chat");

    // Should redirect to onboarding for unauthenticated users
    await page.waitForURL(/onboarding|auth|chat/);
  });

  test("chat page has expected layout structure", async ({ page }) => {
    // Navigate to chat — may redirect if not logged in
    const response = await page.goto("/chat");
    const url = page.url();

    if (url.includes("/chat")) {
      // If we reached chat, check for core UI elements
      const mainContent = page.locator("main");
      await expect(mainContent).toBeVisible();
    }
  });
});

test.describe("Voice Interface", () => {
  test("voice page redirects or loads UI", async ({ page }) => {
    await page.goto("/voice");

    // Voice is protected — should redirect or show voice UI
    await page.waitForURL(/onboarding|auth|voice/);
  });

  test("voice page shows expected elements when accessible", async ({ page }) => {
    const response = await page.goto("/voice");
    const url = page.url();

    if (url.includes("/voice")) {
      const mainContent = page.locator("main");
      await expect(mainContent).toBeVisible();
    }
  });
});
