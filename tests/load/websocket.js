/**
 * k6 WebSocket Connection Limit Test
 *
 * Tests WebSocket connections (chat and agent communication).
 *
 * Run:
 *   k6 run tests/load/websocket.js
 */

import ws from "k6/ws";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";
import { WS_URL } from "./config.js";

export const options = {
  stages: [
    { duration: "15s", target: 10 },
    { duration: "30s", target: 50 },
    { duration: "15s", target: 100 },
    { duration: "30s", target: 100 },
    { duration: "15s", target: 0 },
  ],
  thresholds: {
    ws_connecting: ["p(95)<1000"],
    ws_session_duration: ["p(95)<60000"],
  },
};

const wsErrors = new Rate("ws_errors");

export default function () {
  const url = `${WS_URL}/ws`;

  const res = ws.connect(url, {}, function (socket) {
    socket.on("open", () => {
      socket.send(
        JSON.stringify({
          type: "init",
          payload: { userId: `load-test-${__VU}-${__ITER}` },
        })
      );
    });

    socket.on("message", (data) => {
      try {
        const msg = JSON.parse(data);
        check(msg, {
          "ws message has type": (m) => typeof m.type === "string",
        });
      } catch {
        // Non-JSON message is ok
      }
    });

    socket.on("error", () => {
      wsErrors.add(1);
    });

    // Keep connection alive for 5-15 seconds
    sleep(5 + Math.random() * 10);

    socket.close();
  });

  check(res, {
    "ws connected": (r) => r && r.status === 101,
  }) || wsErrors.add(1);
}
