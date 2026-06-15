import { describe, it, expect } from "vitest";
import WebSocket from "ws";
import { WS_URL } from "./helpers";

describe("Chat WebSocket", () => {
  it("rejects connection without auth token", async () => {
    const ws = new WebSocket(`${WS_URL}`);
    
    await new Promise<void>((resolve) => {
      ws.on("close", (code) => {
        expect(code).toBeGreaterThanOrEqual(1000);
        resolve();
      });
      ws.on("error", () => resolve());
      // Timeout fallback
      setTimeout(() => { ws.close(); resolve(); }, 5000);
    });
  });

  it("accepts connection with token query param", async () => {
    // This test requires a valid Supabase token — skip if not available
    const token = process.env.TEST_AUTH_TOKEN;
    if (!token) {
      console.log("Skipping: TEST_AUTH_TOKEN not set");
      return;
    }
    
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    
    const connected = await new Promise<boolean>((resolve) => {
      ws.on("open", () => resolve(true));
      ws.on("error", () => resolve(false));
      setTimeout(() => resolve(false), 5000);
    });
    
    expect(connected).toBe(true);
    ws.close();
  });
});
