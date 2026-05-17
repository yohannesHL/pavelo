/**
 * k6 Load Test Configuration
 *
 * Shared thresholds and settings for all load test scripts.
 */

/** @type {import('k6/options').Options} */
export const defaultOptions = {
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
    http_reqs: ["rate>10"],
  },
  insecureSkipTLSVerify: true,
};

export const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";
export const WS_URL = __ENV.WS_URL || "ws://localhost:4000";
export const WEB_URL = __ENV.WEB_URL || "http://localhost:3000";

/**
 * Smoke test: quick validation
 */
export const smokeTestOptions = {
  ...defaultOptions,
  vus: 1,
  duration: "10s",
};

/**
 * Load test: moderate concurrent users
 */
export const loadTestOptions = {
  ...defaultOptions,
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 100 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 0 },
  ],
};

/**
 * Stress test: find breaking point
 */
export const stressTestOptions = {
  ...defaultOptions,
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 200 },
    { duration: "1m", target: 500 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    http_req_failed: ["rate<0.05"],
  },
};
