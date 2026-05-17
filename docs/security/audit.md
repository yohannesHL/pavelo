# Security Audit — OWASP Top 10 (S10-05)

**Date:** Sprint 10 — Launch Prep
**Auditor:** Sage (Backend Engineer)
**Standard:** OWASP Top 10 (2021)

---

## Summary

| # | OWASP Category | Status | Notes |
|---|---|---|---|
| A01 | Broken Access Control | ✅ Mitigated | Protected routes, ownership checks, row-level filtering |
| A02 | Cryptographic Failures | ✅ Mitigated | Supabase handles password hashing (bcrypt), JWT signing. No secrets in code. |
| A03 | Injection | ✅ Mitigated | Prisma ORM (parameterized queries), Zod input validation, no raw SQL |
| A04 | Insecure Design | ✅ Addressed | Rate limiting, input bounds, progressive auth |
| A05 | Security Misconfiguration | ✅ Mitigated | Helmet security headers, CORS whitelist, env-based secrets |
| A06 | Vulnerable Components | ⚠️ Monitored | Dependabot enabled, lockfile audited |
| A07 | Auth Failures | ✅ Mitigated | Supabase Auth (bcrypt, JWT), token rotation, no token logging |
| A08 | Data Integrity Failures | ✅ Mitigated | Zod schema validation on all tRPC inputs, signed JWTs |
| A09 | Logging & Monitoring | ✅ Addressed | Structured logging (structlog/Fastify), OpenTelemetry in S10-08 |
| A10 | SSRF | ✅ Mitigated | Internal service URLs from env vars, no user-controlled fetch targets |

---

## Detailed Review

### A01: Broken Access Control

**Findings:**
- ✅ `protectedProcedure` middleware enforces JWT auth on sensitive routes
- ✅ Property CRUD checks `ownerId === ctx.userId` before update/delete
- ✅ Agency routes filter by `agencyId` from authenticated context
- ✅ Saved properties/searches scoped to `userId`
- ✅ Next.js middleware redirects unauthenticated users from protected pages

**Implementation:**
- `apps/api/src/router-helpers.ts` — `isAuthed` middleware
- `apps/api/src/context.ts` — JWT extraction from Authorization header
- `apps/web/src/middleware.ts` — Route protection

### A02: Cryptographic Failures

**Findings:**
- ✅ Passwords hashed by Supabase Auth (bcrypt)
- ✅ JWTs signed by Supabase with RSA keys
- ✅ No secrets in source code (all from env vars)
- ✅ `.env.example` uses placeholder values, `.env` in `.gitignore`
- ✅ HTTPS enforced in production (Cloudflare/Nginx)

### A03: Injection (SQL, XSS, Command)

**SQL Injection:**
- ✅ Prisma ORM uses parameterized queries — no raw SQL anywhere
- ✅ All user inputs validated via Zod schemas before database operations
- ✅ UUID format enforced on ID parameters (`z.string().uuid()`)

**XSS:**
- ✅ React auto-escapes all rendered content by default
- ✅ No `dangerouslySetInnerHTML` usage
- ✅ `react-markdown` with `remark-gfm` for safe markdown rendering
- ✅ Helmet CSP headers prevent inline script execution

**Command Injection:**
- ✅ No shell execution from user inputs
- ✅ Python services use structured APIs, no `os.system()` or `subprocess` with user data

### A04: Insecure Design

**Findings:**
- ✅ Rate limiting: 100 req/min global (Fastify `@fastify/rate-limit`)
- ✅ Auth-specific rate limiting: stricter on login endpoints
- ✅ Input bounds: string max lengths, number ranges on all Zod schemas
- ✅ File upload validation: type checking, size limits (`@fastify/multipart`)
- ✅ Pagination limits: max 50 items per page

### A05: Security Misconfiguration

**Findings:**
- ✅ `@fastify/helmet` registered — sets security headers
- ✅ CORS configured with explicit origin whitelist
- ✅ Rate limiting active
- ✅ No stack traces exposed in production errors
- ✅ Debug logging disabled in production

**Headers set by Helmet:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0` (deprecated but set)
- `Strict-Transport-Security` (in production with HTTPS)
- `Content-Security-Policy` (configurable)

### A06: Vulnerable Components

**Findings:**
- ⚠️ Regular dependency updates recommended
- ✅ `pnpm-lock.yaml` ensures deterministic installs
- ✅ GitHub Dependabot configured for automatic PR creation

**Recommendation:** Run `pnpm audit` monthly and before each release.

### A07: Authentication Failures

**Findings:**
- ✅ Supabase Auth handles all auth (bcrypt, JWT, session refresh)
- ✅ Token never logged (checked all `console.log`/`logger` calls)
- ✅ `authMiddleware` validates token on every request
- ✅ Session refresh via Next.js middleware (Supabase SSR)
- ✅ No password stored in application database

### A08: Software & Data Integrity Failures

**Findings:**
- ✅ All tRPC inputs validated with Zod schemas
- ✅ Property creation requires auth + valid schema
- ✅ JWTs cryptographically signed by Supabase
- ✅ No `eval()` or dynamic code execution

### A09: Security Logging & Monitoring

**Findings:**
- ✅ Fastify structured logging (JSON format)
- ✅ Python agent service uses `structlog`
- ✅ Auth failures logged with request metadata
- ✅ OpenTelemetry integration (S10-08) for distributed tracing

### A10: Server-Side Request Forgery (SSRF)

**Findings:**
- ✅ ML service URL from env var (`ML_SERVICE_URL`)
- ✅ Agent service URL from env var (`AGENT_SERVICE_URL`)
- ✅ No user-controlled URLs in `fetch()` calls
- ✅ Image URLs validated with `z.string().url()` (stored only, not fetched server-side)

---

## Rate Limiting Configuration

| Endpoint | Limit | Window |
|---|---|---|
| Global (all routes) | 100 requests | 1 minute |
| Auth endpoints | 10 requests | 1 minute |
| File upload | 20 requests | 1 minute |
| Search | 50 requests | 1 minute |

---

## Recommendations for Post-MVP

1. Add CSP nonce for inline scripts if any are introduced
2. Implement API key auth for service-to-service calls
3. Add request signing for webhook endpoints
4. Set up automated `pnpm audit` in CI pipeline
5. Consider WAF (Web Application Firewall) in production
6. Implement account lockout after failed login attempts
7. Add audit logging for admin actions
