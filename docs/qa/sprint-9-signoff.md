# Sprint 9 QA Sign-off — Agent Dashboard, B2B & Integrations

**QA Engineer:** Ivy  
**Date:** 2025-01-28  
**Branch:** `feature/sprint-9`  
**Sprint Scope:** S9-01 through S9-10 (10 tasks, 4 phases)

---

## Summary

Sprint 9 delivers a substantial body of work: agency dashboard, analytics, human handover, CRM webhooks, white-label branding, multi-tenancy, Stripe billing, feedback, planning applications, and flood risk. The **architecture is solid** — Prisma models are well-designed, tRPC routes are properly structured, and the Python agent handover node is clean. However, there are **2 blockers** related to security, plus several major issues around multi-tenancy data leakage.

---

## Test Results

### Static Analysis

| Check | Result |
|---|---|
| Python syntax (handover.py, state.py) | ✅ PASS |
| TypeScript compilation (web — Sprint 9 files) | ✅ PASS (0 S9-specific errors) |
| TypeScript compilation (API — Sprint 9 files) | ⚠️ 8 implicit-any warnings (#55) |
| Next.js build | ❌ FAIL (Google Fonts network timeout — not S9-related) |
| Prisma schema validation | ⚠️ Missing relation on WebhookDelivery (#50) |

### Component-by-Component Review

#### S9-01: Agency Dashboard ✅ (with caveats)
- [x] KPI cards render 6 metrics with trend indicators
- [x] Lead pipeline: filterable table, status dropdown works
- [x] Team management: member cards, invite form, role badge, remove button
- [x] Conversation overview: table with intent, status, messages, duration
- [x] Handover alerts: gold-border banner, animated ping, context expansion
- [x] Dark navy sidebar layout with 4 nav items
- [ ] KPI cards use hardcoded mock data, not wired to tRPC endpoint (#53)
- [ ] "Save Lead" form button has no onClick handler (#52)

#### S9-02: Analytics ✅ (with caveats)
- [x] SVG bar chart for message volume
- [x] SVG donut chart for intent distribution
- [x] Horizontal bar histogram for session duration
- [x] Property interest heatmap (views + inquiries)
- [x] Top queries ranked list
- [x] Satisfaction breakdown (thumbs up/down bar)
- [x] Date range picker (7d/30d/90d) renders correctly
- [ ] Date range picker doesn't filter data (#54)
- [ ] Backend analytics query uses global feedback, not agency-scoped (#49)

#### S9-03: Human Handover ✅
- [x] Python handover node with 3 trigger types (user_requested, low_confidence, booking_confirmation)
- [x] Keyword detection for explicit human requests (12 phrases)
- [x] Confidence threshold check (< 0.3)
- [x] Context packet generation (summary, preferences, properties)
- [x] API call to create handover request
- [x] Visual payload for frontend notification
- [x] Handover node wired into LangGraph (graph.py)
- [x] Handover status tracking (pending/accepted/in_progress/completed)
- [ ] requestHandover endpoint missing agency membership check (#47)

#### S9-04: CRM Webhooks ✅
- [x] HMAC-SHA256 signing via `X-Pavelo-Signature` header
- [x] 3 retries with exponential backoff (1s, 2s, 4s)
- [x] 10s timeout per delivery attempt
- [x] Non-retryable 4xx detection
- [x] Webhook config CRUD (create, update, delete, list)
- [x] Delivery log with status code, response, attempts
- [x] 4 event types (lead.created, viewing.booked, valuation.requested, handover.requested)
- [x] Admin-only access on webhook CRUD
- [ ] **BLOCKER:** listWebhooks returns raw secrets in response (#46)
- [ ] WebhookDelivery missing @relation to WebhookConfig (#50)

#### S9-05: White-label ✅
- [x] Branding settings page at /agency/settings/branding
- [x] Logo URL, primary/accent color pickers, persona name, custom domain
- [x] Live preview with mock chat interface
- [x] CSS custom property override display
- [x] Color validation (hex regex in API)
- [x] Persona name max 50 chars
- [x] No dangerouslySetInnerHTML or eval — XSS-safe

#### S9-06: Multi-tenancy ✅ (with caveats)
- [x] Agency membership verification helper (`verifyAgencyMember`, `verifyAgencyAdmin`)
- [x] All agency CRUD scoped by agencyId
- [x] Lead queries scoped by agencyId
- [x] Team queries scoped by agencyId
- [x] Webhook queries scoped by agencyId + admin check
- [x] Handover queries scoped by agencyId
- [x] `@@unique([agencyId, userId])` on AgencyMember prevents duplicates
- [ ] Feedback queries NOT scoped by agency — cross-tenant leakage (#49)
- [ ] requestHandover not checking agency membership (#47)
- [ ] recordUsage not checking agency admin (#48)

#### S9-07: Stripe Billing ✅ (with caveats)
- [x] 3 plan tiers (Starter $49, Growth $149, Enterprise $399)
- [x] Plan comparison page with feature lists
- [x] Usage meters (properties, voice minutes, team members) with limit warnings
- [x] Invoice history table
- [x] Mock checkout URL generation
- [x] Webhook handler for invoice.paid, subscription.updated, subscription.deleted
- [ ] **BLOCKER:** handleStripeEvent is a public procedure with NO signature verification (#51)
- [ ] recordUsage has no admin check (#48)

#### S9-08: Feedback ✅ (with caveats)
- [x] Feedback model with messageId, userId, rating (1-5), correction, comment
- [x] Upsert logic (one feedback per user per message)
- [x] `@@unique([messageId, userId])` constraint
- [x] JSONL export format for fine-tuning pipelines
- [x] Rating filter on list endpoint
- [ ] listFeedback not scoped by agency — returns ALL feedback (#49)

#### S9-09: Planning Applications ✅
- [x] SVG map with distance rings (50m, 150m, 300m)
- [x] Status pins (pending=yellow, approved=green, refused=red)
- [x] Impact indicators (High <50m, Medium <150m, Low ≥150m)
- [x] Pin click → expanded detail with reference, LPA, dates
- [x] Status filter (all/pending/approved/refused)
- [x] Standalone page at /intelligence/planning
- [x] Coordinate projection (lat/lng → SVG via Mercator approximation)
- [x] Sorted by distance

#### S9-10: Flood Risk ✅
- [x] SVG zone overlays with transparency
- [x] FloodRiskBadge component (very_low/low/medium/high)
- [x] Risk breakdown (river, surface water, reservoir)
- [x] Environmental info (nearest watercourse, distance, historical flooding)
- [x] Zone click → detail panel with source icon and description
- [x] Compact mode for property cards
- [x] Full mode with map + details side-by-side
- [x] Standalone page at /intelligence/flood
- [x] River Thames simplified path on map

---

## Prisma Schema Review

| Model | Relations | Indexes | Cascade Delete | Verdict |
|---|---|---|---|---|
| Agency | ✅ members, config, webhooks, leads, handovers, subscription | ✅ slug, plan | N/A (root) | ✅ |
| AgencyMember | ✅ agency | ✅ agencyId, userId | ✅ Cascade | ✅ |
| AgencyConfig | ✅ agency (1:1 unique) | ✅ agencyId | ✅ Cascade | ✅ |
| Lead | ✅ agency | ✅ agencyId, status, createdAt | ✅ Cascade | ✅ |
| Handover | ✅ agency | ✅ agencyId, status, conversationId | ✅ Cascade | ✅ |
| WebhookConfig | ✅ agency | ✅ agencyId, active | ✅ Cascade | ✅ |
| WebhookDelivery | ❌ No relation to WebhookConfig | ✅ webhookId, event, createdAt | ❌ Missing | ⚠️ #50 |
| Subscription | ✅ agency (1:1 unique) | ✅ agencyId, stripeCustomerId, status | ✅ Cascade | ✅ |
| Feedback | ✅ unique(messageId, userId) | ✅ messageId, userId, rating, createdAt | N/A | ✅ |

---

## tRPC Router Registration

- [x] `agencyRouter` registered at `appRouter.agency` (router.ts line 519)
- [x] `billingRouter` registered at `appRouter.billing` (router.ts line 522)
- [x] Both imported from correct paths

---

## Security Findings

| # | Finding | Severity | Issue |
|---|---|---|---|
| 1 | Webhook secrets returned in listWebhooks response | **BLOCKER** | #46 |
| 2 | Stripe webhook handler has no signature verification | **BLOCKER** | #51 |
| 3 | requestHandover allows any authenticated user to create handovers for any agency | Major | #47 |
| 4 | recordUsage allows any authenticated user to inflate any agency's meters | Major | #48 |
| 5 | Feedback queries leak cross-tenant data | Major | #49 |
| 6 | WebhookDelivery has no foreign key constraint | Major | #50 |
| 7 | White-label: no XSS vectors found (colors validated, no innerHTML) | ✅ Safe | — |
| 8 | Agency routes properly gated by protectedProcedure | ✅ Safe | — |

---

## Issues Filed

| # | Title | Severity | Issue |
|---|---|---|---|
| 1 | Webhook secrets exposed in listWebhooks API response | Blocker | [#46](https://github.com/yohannesHL/pavelo/issues/46) |
| 2 | requestHandover missing agency membership verification | Major | [#47](https://github.com/yohannesHL/pavelo/issues/47) |
| 3 | billing.recordUsage missing agency admin verification | Major | [#48](https://github.com/yohannesHL/pavelo/issues/48) |
| 4 | listFeedback and analytics feedback query not scoped by agency | Major | [#49](https://github.com/yohannesHL/pavelo/issues/49) |
| 5 | WebhookDelivery missing Prisma relation to WebhookConfig | Major | [#50](https://github.com/yohannesHL/pavelo/issues/50) |
| 6 | Stripe webhook handler is public with no signature verification | Blocker | [#51](https://github.com/yohannesHL/pavelo/issues/51) |
| 7 | Add Lead form Save button has no onClick handler | Minor | [#52](https://github.com/yohannesHL/pavelo/issues/52) |
| 8 | KPI cards use hardcoded mock data | Minor | [#53](https://github.com/yohannesHL/pavelo/issues/53) |
| 9 | Analytics date range picker doesn't filter data | Minor | [#54](https://github.com/yohannesHL/pavelo/issues/54) |
| 10 | TypeScript implicit-any errors in agency.ts and billing.ts | Minor | [#55](https://github.com/yohannesHL/pavelo/issues/55) |

**Total: 10 issues** — 2 blockers, 4 major, 4 minor

---

## What's Solid

Credit where due:

- **Webhook delivery service** is well-architected: HMAC signing, retry with backoff, timeout, delivery logging
- **Handover escalation node** in Python is clean: 3 trigger types, keyword matching, confidence threshold, context packet
- **Planning applications map** SVG rendering is impressive: coordinate projection, distance rings, interactive pins
- **Flood risk map** with zone overlays, risk breakdown, compact/full modes — excellent visual work
- **Prisma schema** is comprehensive with proper indexes, enums, and cascade deletes (except WebhookDelivery)
- **White-label preview** with live CSS custom property display is a nice touch
- **Agency layout** with sidebar nav is professional
- **Billing page** with usage meters and plan comparison follows Stripe design patterns well

---

## Sign-off

### ❌ BLOCKED

Sprint 9 is **blocked from release** due to 2 security blockers:

1. **#46 — Webhook secrets exposed:** Raw HMAC secrets returned in API responses. One-line fix (add `select` to exclude `secret` field).
2. **#51 — Stripe webhook unprotected:** Public tRPC procedure with no signature verification. Any attacker can manipulate subscription state.

Once these 2 blockers are fixed, the 4 major issues (#47, #48, #49, #50) should also be addressed before production — they represent multi-tenancy data leakage and missing authorization checks.

The minor issues (#52, #53, #54, #55) are acceptable for a sprint milestone but should be tracked for Sprint 10 hardening.
