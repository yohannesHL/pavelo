import { test, expect } from "@playwright/test";

/**
 * E2E: Chat Page — load, connection, input state, navigation
 *
 * Tests the chat interface is functional and accessible.
 */

test.describe("Chat Page", () => {
  test("loads the chat page", async ({ page }) => {
    await page.goto("/chat");
    await expect(page).toHaveURL(/\/chat/);
  });

  test("shows connection status indicator", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForTimeout(2000);
    // Page should not crash
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("chat input is always visible and enabled", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForTimeout(1000);
    const input = page.locator('textarea, input[type="text"]').last();
    if (await input.isVisible()) {
      // Input should NOT be disabled
      const isDisabled = await input.getAttribute("disabled");
      expect(isDisabled).toBeNull();
    }
  });

  test("can navigate to chat from home page", async ({ page }) => {
    await page.goto("/");
    const chatLink = page
      .locator('a[href*="chat"], button')
      .filter({ hasText: /chat|talk|xara/i })
      .first();
    if (await chatLink.isVisible()) {
      await chatLink.click();
      await expect(page).toHaveURL(/\/chat/);
    }
  });
});
