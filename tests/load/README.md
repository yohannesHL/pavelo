# k6 Load Tests — Pavelo API

Performance testing suite for the Pavelo API using [k6](https://k6.io/).

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker
docker run --rm -i grafana/k6 run - <tests/load/api-endpoints.js
```

## Test Scripts

| Script | Description | Target |
|---|---|---|
| `api-endpoints.js` | API health, property list, search | p95 < 500ms, error < 1% |
| `websocket.js` | WebSocket connection limits | p95 connect < 1000ms |
| `chat-sessions.js` | Concurrent chat messages | p95 < 1000ms |

## Running Tests

```bash
# Smoke test (1 user, quick check)
k6 run --vus 1 --duration 10s tests/load/api-endpoints.js

# Load test (default stages — ramp to 100 users)
k6 run tests/load/api-endpoints.js

# Stress test with custom target
k6 run --env BASE_URL=http://localhost:4000 tests/load/api-endpoints.js

# WebSocket test
k6 run tests/load/websocket.js

# Chat concurrency test
k6 run tests/load/chat-sessions.js

# All tests with custom base URL
BASE_URL=https://api.pavelo.io k6 run tests/load/api-endpoints.js
```

## Thresholds

| Metric | Threshold |
|---|---|
| p95 response time | < 500ms |
| p99 response time | < 1000ms |
| Error rate | < 1% |
| WebSocket connect p95 | < 1000ms |
| Chat message p95 | < 1000ms |

## Configuration

Environment variables:
- `BASE_URL` — API base URL (default: `http://localhost:4000`)
- `WS_URL` — WebSocket URL (default: `ws://localhost:4000`)
- `WEB_URL` — Web app URL (default: `http://localhost:3000`)

Shared configuration is in `config.js`.
