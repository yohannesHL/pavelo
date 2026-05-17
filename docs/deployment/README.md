# Pavelo — Deployment Guide

## Overview

Pavelo consists of 4 services + infrastructure:

| Service | Port | Technology | Dockerfile |
|---|---|---|---|
| Web (Frontend) | 3000 | Next.js 15 | `apps/web/Dockerfile` |
| API (Gateway) | 4000 | Fastify / tRPC | `apps/api/Dockerfile` |
| Agent | 8000 | Python / LangGraph | `services/agent/Dockerfile` |
| ML | 8001 | Python / FastAPI | `services/ml/Dockerfile` |

Infrastructure:
- PostgreSQL (Supabase or self-hosted)
- Redis
- Qdrant (vector DB)
- LiveKit (WebRTC)

---

## Docker Deployment

### Quick Start

```bash
# Build and start all services
docker compose -f docker-compose.production.yml up -d --build

# Check status
docker compose -f docker-compose.production.yml ps
```

### Individual Service Builds

```bash
# Web
docker build -t pavelo-web -f apps/web/Dockerfile .

# API
docker build -t pavelo-api -f apps/api/Dockerfile .

# Agent
docker build -t pavelo-agent -f services/agent/Dockerfile .

# ML
docker build -t pavelo-ml -f services/ml/Dockerfile .
```

---

## Environment Setup

Copy `.env.production.example` and fill in all values:

```bash
cp .env.production.example .env.production
```

### Required Services

1. **Supabase** — Create project at supabase.com
   - Get `NEXT_PUBLIC_SUPABASE_URL` and keys from Settings > API
   - Run Prisma migrations against the Supabase database

2. **OpenAI** — Get API key from platform.openai.com

3. **Qdrant** — Self-hosted or Qdrant Cloud
   - For production: use Qdrant Cloud for managed hosting

4. **LiveKit** — Self-hosted or LiveKit Cloud
   - For voice features: get API key/secret

5. **Redis** — Self-hosted or managed (Upstash, Redis Cloud)

---

## Hosting Options

### Option A: Railway / Render (Recommended for MVP)

1. Connect GitHub repo
2. Deploy each service as a separate project
3. Set environment variables
4. Use managed PostgreSQL + Redis add-ons

### Option B: VPS with Docker Compose

1. Provision a VPS (4GB+ RAM recommended)
2. Install Docker and Docker Compose
3. Clone repo and set up `.env.production`
4. Run `docker compose -f docker-compose.production.yml up -d`
5. Set up Nginx reverse proxy with SSL

### Option C: Kubernetes

Use the Dockerfiles to build images and create K8s manifests.

---

## Reverse Proxy (Nginx)

See `nginx.conf` for a production-ready configuration with:
- SSL termination (Let's Encrypt)
- WebSocket proxying
- Gzip compression
- Security headers
- Rate limiting

```bash
# Install certbot
sudo certbot --nginx -d api.pavelo.io -d pavelo.io
```

---

## CDN Configuration

Recommended: **Cloudflare** (free tier)

1. Point DNS to Cloudflare
2. Enable "Full (strict)" SSL
3. Enable:
   - Auto Minify (JS, CSS, HTML)
   - Brotli compression
   - Browser Cache TTL: 4 hours
   - Edge Cache TTL: 2 hours (for static assets)
4. Page Rules:
   - `pavelo.io/api/*` → Cache Level: Bypass
   - `pavelo.io/_next/static/*` → Cache Level: Cache Everything, Edge TTL: 30 days

---

## Database Migrations

```bash
# Run migrations against production database
DATABASE_URL="postgresql://..." pnpm exec prisma migrate deploy

# Seed initial data (if needed)
DATABASE_URL="postgresql://..." pnpm exec prisma db seed
```

---

## Monitoring

### Health Checks

All services expose `/health` endpoints:

```bash
curl http://localhost:4000/health   # API
curl http://localhost:8000/health   # Agent
curl http://localhost:8001/health   # ML
```

### Observability

```bash
# Start Grafana + Prometheus
docker compose -f docker-compose.observability.yml up -d

# Grafana: http://localhost:3001 (admin/admin)
```

### Metrics Endpoint

```bash
curl http://localhost:4000/api/v1/metrics
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| DB connection refused | Check `DATABASE_URL`, ensure PostgreSQL is running |
| Redis connection error | Check `REDIS_URL`, ensure Redis is running |
| Qdrant not responding | Check `QDRANT_URL`, verify Qdrant container health |
| Voice not working | Verify LiveKit, Deepgram, Cartesia keys |
| Slow searches | Check Qdrant memory, Redis cache hit rate |
