import { describe, it, expect } from "vitest";
import { fetchApi } from "./helpers";

describe("API Health", () => {
  it("returns 200 on /health", async () => {
    const res = await fetchApi("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});

describe("API tRPC", () => {
  it("returns error for unauthenticated conversation.list", async () => {
    const res = await fetchApi("/trpc/conversation.list?input=%7B%7D");
    expect(res.status).toBe(401);
  });
});
