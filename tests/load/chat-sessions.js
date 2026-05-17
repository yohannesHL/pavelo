/**
 * k6 Concurrent Chat Sessions Test
 *
 * Simulates multiple users sending chat messages simultaneously.
 *
 * Run:
 *   k6 run tests/load/chat-sessions.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";
import { BASE_URL } from "./config.js";

export const options = {
  stages: [
    { duration: "15s", target: 10 },
    { duration: "30s", target: 30 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
    chat_message_duration: ["p(95)<1000"],
  },
};

const errorRate = new Rate("chat_errors");
const messageDuration = new Trend("chat_message_duration", true);

const conversationId = "00000000-0000-0000-0000-000000000099";

export default function () {
  group("Create Chat Message", () => {
    const payload = JSON.stringify({
      json: {
        conversationId,
        content: `Load test message from VU ${__VU}, iter ${__ITER}: Find me a 3 bed house in London under 500k`,
        role: "user",
      },
    });

    const res = http.post(
      `${BASE_URL}/trpc/conversation.sendMessage`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    messageDuration.add(res.timings.duration);

    check(res, {
      "message sent (status 200 or 401)": (r) =>
        r.status === 200 || r.status === 401,
    }) || errorRate.add(1);
  });

  sleep(1 + Math.random() * 2);

  group("List Conversations", () => {
    const url = `${BASE_URL}/trpc/conversation.list?input=${encodeURIComponent(
      JSON.stringify({ json: {} })
    )}`;
    const res = http.get(url);

    check(res, {
      "conversations listed": (r) => r.status === 200 || r.status === 401,
    }) || errorRate.add(1);
  });

  sleep(1);
}
