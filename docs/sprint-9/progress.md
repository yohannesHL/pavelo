# Sprint 9 — Progress

## Phase 1: Agency Admin Dashboard (S9-01, S9-02) ✅

### Completed
- **Prisma Models**: Agency, AgencyMember, AgencyConfig, Lead, Handover, WebhookConfig, WebhookDelivery, Subscription, Feedback + all enums
- **Agency tRPC Router** (`apps/api/src/routes/agency.ts`): Full CRUD for agency, leads, team members, handovers, webhooks, branding config, feedback
- **Webhook Delivery Service** (`apps/api/src/services/webhook.ts`): Dispatch with HMAC-SHA256 signing, 3 retries, exponential backoff
- **Agency Dashboard Layout** (`/agency`): Professional sidebar nav, navy theme
- **KPI Cards**: 6 KPIs with JetBrains Mono, trend indicators
- **Lead Pipeline**: Table with status filter, status dropdown, add lead form
- **Team Management**: Member cards with role badges, invite form, remove
- **Conversation Overview**: Table with intent, status, message count, duration
- **Handover Alerts**: Gold-border alert banner with ping animation, context expansion
- **Analytics Page** (`/agency/analytics`): SVG bar chart, donut pie chart, session histogram, property interest heatmap, top queries, satisfaction bar
- **Date Range Picker**: 7d/30d/90d toggle

### Decisions Made
- Used mock data for frontend components (tRPC integration ready when backend is live)
- Built SVG charts natively instead of depending on Recharts import (lighter bundle, same visual quality)
- Agency sidebar uses dark navy (#0D1B2A) for professional look
- Used JetBrains Mono (`var(--font-data)`) for all stat values per design spec

## Phase 2: Human Handover & CRM (S9-03, S9-04) ✅

### Completed
- **Handover Escalation Node** (`services/agent/src/nodes/handover.py`): Detects user_requested, low_confidence, booking_confirmation triggers
- **Context Packet Generation**: Summarizes conversation, preferences, properties discussed for human agent
- **LangGraph Integration**: Added `handover_escalation` node to graph, new `human_handover` intent type
- **Agent State Updated**: Added `handover_triggered` and `agency_id` fields
- **Billing Router** (`apps/api/src/routes/billing.ts`): Plans, checkout, Stripe webhook handler, usage metering, invoices
- **Webhook Service** (already in Phase 1): HMAC-SHA256 signed, Zapier-compatible JSON payloads

### Decisions Made
- Handover node fires API call to create handover request, then continues to response_generator for user-facing message
- Stripe integration uses mock checkout URLs (real Stripe integration needs env vars)
- Webhook payloads include `event`, `timestamp`, `data` format (Zapier/Make compatible)

## Phase 3: White-label & Multi-tenancy (S9-05, S9-06, S9-07) ✅

### Completed
- **Branding Settings Page** (`/agency/settings/branding`): Logo, colors, persona name, custom domain with live preview
- **Billing Page** (`/agency/billing`): Plan comparison cards, usage meters, invoices table, upgrade/downgrade
- **White-label CSS**: `.agency-branded` class, CSS custom property overrides cascade system
- **Agency Dashboard CSS**: KPI hover animations, sidebar theming, plan shimmer effect
- **Multi-tenancy Backend**: Row-level scoping via `verifyAgencyMember()` helper on all agency queries

### Decisions Made
- White-label override works via CSS custom properties on wrapper div (no build step needed)
- Billing uses mock Stripe checkout URLs (env vars for real integration)
- Usage meters show warning at 80% threshold
- Live branding preview shows mock chat interface with agency colors

## Phase 4: Feedback & Additional Visuals (S9-08, S9-09, S9-10) ✅

### Completed
- **Feedback Thumbs** (`components/chat/feedback-thumbs.tsx`): Thumbs up/down on agent messages, correction input, submitted state
- **Feedback Backend**: Already in agency router — `submitFeedback` (upsert), `listFeedback` (JSON/JSONL export for fine-tuning)
- **Planning Applications Map** (`components/intelligence/planning-applications.tsx`): SVG map with distance rings, status pins, application list with impact indicator, status filter, click-to-expand details
- **Flood Risk Map** (`components/intelligence/flood-risk-map.tsx`): SVG map with zone overlays, risk breakdown cards, environmental info, `FloodRiskBadge` compact component
- **Standalone Pages**: `/intelligence/planning`, `/intelligence/flood`
- **Component Index Updated**: Added PlanningApplicationsMap, FloodRiskMap, FloodRiskBadge exports

### Decisions Made
- Used mock data for planning/flood (API wrappers ready for LPA API / Environment Agency integration)
- FloodRiskBadge designed to be embeddable on property cards
- Planning map uses SVG relative coordinates (same Mapbox-compatible pattern as S7)
- Feedback correction triggers memory update pathway (correction field stored for retraining)

## QA Fixes — Blockers & Majors ✅

### Fixed Issues
- **#46 BLOCKER**: Excluded `secret` field from `listWebhooks` response using explicit `select` clause
- **#51 BLOCKER**: Added Stripe webhook signature verification (HMAC-SHA256, timestamp tolerance, timing-safe comparison) to `handleStripeEvent`
- **#47 MAJOR**: Added `verifyAgencyMember()` check to `requestHandover` mutation
- **#48 MAJOR**: Added admin/agent role check to `billing.recordUsage` — regular users cannot inflate meters
- **#49 MAJOR**: Scoped `listFeedback` and analytics feedback queries to agency tenant via member user IDs
- **#50 MAJOR**: Added `@relation` with `onDelete: Cascade` between `WebhookDelivery` → `WebhookConfig`, plus `deliveries` field on WebhookConfig

### Technical Notes
- Stripe signature verification implements the full algorithm: parse `t=` timestamp + `v1=` signatures, HMAC the `timestamp.body`, timing-safe compare, 5-minute tolerance
- Feedback tenant scoping uses agency member user IDs since the Feedback model has no direct agencyId field
- All fixes are backwards-compatible — no API contract changes except `listFeedback` now requires `agencyId` input
