# Sprint 8 — Memory, Valuation & Seller Flow — Done

## Summary

Sprint 8 delivers the **seller flow**, **AI valuation engine**, **cross-session memory consolidation**, and **interactive property tools**. This sprint transforms Pavelo from a buyer-only platform into a full buyer + seller experience, with rich interactive widgets for mortgage calculation, property comparison, and a Kanban-style saved properties board.

## Completed Tasks

### S8-01: Cross-session Memory Consolidation ✅
**Owner:** Sage (Backend)
- **Prisma models:** UserProfile, ViewingBooking, PushSubscription, SavedProperty, ValuationReport (6 new models)
- **Consolidation service** (`services/agent/src/memory/consolidation.py`): Extracts facts from Mem0, categorizes into budget/area/type/style/deal-breaker, deduplicates with latest-wins strategy
- **Consolidation endpoint:** `POST /api/v1/memory/consolidate/{user_id}`
- **tRPC memory router:** `getProfile`, `updatePreference`, `deleteMemory`, `consolidate`, `updateProfile`
- **REST profile endpoint** for agent → API writes: `POST /api/v1/memory/profile`

### S8-02: Memory Visualization ✅
**Owner:** Nova + Milo (Frontend + CSS)
- **MemoryProfileCard** component with navy header, gold budget accent
- **Overview tab:** Budget range (JetBrains Mono), preferred areas, property types, styles, deal-breakers — all with inline editing
- **Timeline tab:** Chronological memory list with category-colored dots, delete per memory
- **Memory settings page** at `/settings/memory`

### S8-03: Seller Onboarding Flow ✅
**Owner:** Nova + Milo
- **Seller wizard at `/sell`** — 5-step multi-step flow with animated transitions
- **Step 1 — Address:** Postcode search with demo lookup, manual entry fallback
- **Step 2 — Details:** Property type grid (6 types), beds/baths stepper, sqft/year inputs, tenure dropdown, EPC rating selector, features pill toggles (15 options)
- **Step 3 — Photos:** Drag-and-drop zone, multi-file upload, preview grid with cover badge, remove per photo
- **Step 4 — Description:** AI-assisted generation via agent endpoint with template fallback, character count, writing tips
- **Step 5 — Review:** Full summary of all sections, features tags, photo grid, AI valuation notice
- **Progress indicator** with step dots and completion checkmarks
- **Save draft** stub

### S8-04: AI Valuation Agent ✅
**Owner:** Sage
- **`generate_valuation` LangGraph tool** with full valuation pipeline
- **Comparable search:** Qdrant + ML service first, demo fallback with regional price data
- **Price per sqft analysis** with weighted average (closer comps weighted higher)
- **Market trend adjustment:** UK postcode → region mapping, trend multipliers
- **Value adjustments:** Bathroom premium, period property, new build, 10 feature types
- **Confidence scoring** based on comparable count, sqft data availability, year data
- **Methodology text generation** with structured explanation
- **Description generation tool** (`generate_description.py`) with OpenAI + template fallback

### S8-05: Valuation Report Visual ✅
**Owner:** Nova + Milo
- **ValuationReport component** — premium PDF-style in-browser report
- **Hero section:** Gold estimate value (Playfair Display, 5xl), low/mid/high range, animated confidence bar
- **Property summary:** Type, beds, baths, sqft stats cards, price per sqft
- **Value adjustments:** Itemized breakdown with green +£ amounts
- **Comparable table:** Address, price, sqft, £/sqft, distance, date — responsive with hidden columns on mobile
- **Methodology section:** Markdown-formatted explanation
- **Print-friendly CSS** with `@media print` rules, color-adjust for gradient backgrounds
- **Actions:** Print button, share link copy
- **Valuation page** at `/valuation/[id]`

### S8-06: Viewing Booking Tool ✅
**Owner:** Sage
- **`book_viewing` LangGraph tool** with date/time validation
- **tRPC viewing router:** `getSlots`, `book`, `cancel`, `list`, `confirm`
- **REST endpoints** for agent: `GET /api/v1/viewings/slots`, `POST /api/v1/viewings/book`
- **Slot-based availability:** 18 time slots per day, conflict detection
- **CRM webhook stub:** Outbound POST on booking creation
- **Booking limits:** Max 10 active bookings per user

### S8-07: Mortgage Calculator Widget ✅
**Owner:** Nova + Milo
- **MortgageCalculator component** — interactive, real-time calculation
- **Inputs:** Property price, deposit slider (5–50%), interest rate slider (1–10%), term slider (5–40 years)
- **Outputs:** Monthly payment (gold, 3xl), loan amount, LTV, total interest, total repayable, stamp duty (SDLT), total upfront
- **Affordability check:** Annual income input → mortgage-to-income ratio with traffic light indicator
- **Design:** JetBrains Mono for all numbers, gold for key figures, gradient result panel
- **Renders inline in chat** via visual payload or standalone

### S8-08: Property Comparison Table ✅
**Owner:** Nova + Milo
- **PropertyComparisonTable component** — 2-4 properties side by side
- **10 comparison rows:** Price, bedrooms, bathrooms, sqft, price/sqft, type, area, school rating, crime score, transport score
- **Highlighting:** Green background for best values, red for worst (per row)
- **"🏆 Best Value" badge** on lowest price/sqft property
- **Responsive:** Sticky row labels, horizontal scroll on mobile
- **VisualPayloadRenderer** updated for `mortgage_calculator` and `property_comparison` types

### S8-09: Saved Properties Board ✅
**Owner:** Nova + Milo + Sage
- **Kanban board at `/saved`** with 4 columns: Interested / Shortlisted / Visited / Rejected
- **Property cards:** Title, price (gold JetBrains Mono), stats, tags, notes preview, date added
- **Actions:** Click-to-move between columns, edit notes (inline textarea), remove, tag management
- **Comparison mode:** Select 2-4 → compare button → inline PropertyComparisonTable
- **Share shortlist:** Copy shortlist names to clipboard
- **Kanban CSS:** Column headers with accent colors, card shadows, smooth layout animations
- **tRPC savedProperty router:** `save`, `list`, `move`, `updateNotes`, `updateTags`, `remove`

### S8-10: Push Notification Service ✅
**Owner:** Sage + Nova
- **tRPC push router:** `subscribe`, `unsubscribe`, `updatePreferences`, `getPreferences`
- **PushSubscription Prisma model** with VAPID keys (p256dh, auth), per-type preferences JSON
- **sendPushNotification function** (web-push API stub, ready for production)
- **Trigger functions:** `triggerPropertyAlert`, `triggerViewingReminder`, `triggerPriceDrop`
- **Notification preferences page** at `/settings/notifications` — toggle switches per type with proper ARIA roles
- **Service worker ready** — stub for registration in production

## New Files Created

### Backend (Sage)
- `apps/api/prisma/schema.prisma` — 6 new models added
- `apps/api/src/routes/memory.ts` — Memory profile tRPC router
- `apps/api/src/routes/viewing.ts` — Viewing booking tRPC router
- `apps/api/src/routes/saved-property.ts` — Saved properties tRPC router
- `apps/api/src/routes/push.ts` — Push notification router + send functions
- `services/agent/src/memory/consolidation.py` — Memory consolidation service
- `services/agent/src/tools/generate_valuation.py` — AI valuation tool
- `services/agent/src/tools/generate_description.py` — Description generation tool
- `services/agent/src/tools/book_viewing.py` — Viewing booking tool

### Frontend (Nova + Milo)
- `apps/web/src/components/memory/memory-profile-card.tsx` — Memory profile card
- `apps/web/src/components/seller/step-address.tsx` — Address lookup step
- `apps/web/src/components/seller/step-details.tsx` — Property details step
- `apps/web/src/components/seller/step-photos.tsx` — Photo upload step
- `apps/web/src/components/seller/step-description.tsx` — AI description step
- `apps/web/src/components/seller/step-review.tsx` — Review & submit step
- `apps/web/src/components/valuation/valuation-report.tsx` — Valuation report
- `apps/web/src/components/chat/mortgage-calculator.tsx` — Mortgage calculator
- `apps/web/src/components/chat/property-comparison-table.tsx` — Comparison table
- `apps/web/src/app/sell/page.tsx` — Seller onboarding page
- `apps/web/src/app/valuation/[id]/page.tsx` — Valuation report page
- `apps/web/src/app/settings/memory/page.tsx` — Memory settings page
- `apps/web/src/app/settings/notifications/page.tsx` — Notification preferences
- `apps/web/src/app/saved/page.tsx` — Saved properties board (replaced stub)

## Design Decisions

1. **Memory deduplication:** Latest-wins strategy for conflicting preferences — simpler than merge conflicts, matches user expectation that most recent statement is truth
2. **Valuation confidence:** Capped at 0.95 — never claim 100% confidence for an AI estimate. Spread widens (±15%) at low confidence, narrows (±5%) at high confidence
3. **Comparable fallback:** When ML service/Qdrant unavailable, generate realistic demo comparables using regional price-per-sqft averages — ensures the feature always works
4. **Kanban columns:** Chose click-to-move over drag-and-drop for simplicity and mobile compatibility. Drag would require a library like `@dnd-kit` (Sprint 10 polish candidate)
5. **Push notifications:** Implemented as stubs with proper preference checking — actual web-push send requires VAPID keys set up in production environment

## Handoff Notes for Sprint 9

- Memory consolidation should be triggered on a schedule (e.g., daily cron) in production
- Valuation reports need a `shareToken` generation flow for public read-only URLs
- The seller flow currently uses demo postcode lookup — integrate with postcode.io or Ordnance Survey API
- Viewing booking confirmation emails need Resend integration (endpoint ready, just needs the send call)
- Push notification service worker (`/sw.js`) needs to be created for production
- The Kanban board would benefit from drag-and-drop via `@dnd-kit` in Sprint 10
