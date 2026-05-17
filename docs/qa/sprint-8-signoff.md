# Sprint 8 QA Sign-off — Memory, Valuation & Seller Flow

**QA Engineer:** Ivy  
**Date:** 2025-06-27  
**Branch:** `feature/sprint-8`  
**Sprint:** 8 — Memory, Valuation & Seller Flow

---

## Summary

Sprint 8 delivers 10 features spanning backend Python services, tRPC API routes, Prisma models, and React frontend components. The overall quality is **good** — architecture is well-structured, code is clean, and the feature set is comprehensive. However, **6 bugs** were found, including **4 major** issues that should be addressed before merge.

---

## Test Results

### Automated Checks

| Check | Result | Notes |
|-------|--------|-------|
| Python syntax — `consolidation.py` | ✅ PASS | Clean compile |
| Python syntax — `generate_valuation.py` | ✅ PASS | Clean compile |
| Python syntax — `generate_description.py` | ✅ PASS | Clean compile |
| Python syntax — `book_viewing.py` | ✅ PASS | Clean compile |
| SDLT calculation — 8 test cases | ✅ PASS | All thresholds correct (England 2024 rates) |
| Prisma schema — 6 new models | ✅ PASS | Valid structure, enums correct |
| tRPC routers registered | ✅ PASS | All 4 new routers (memory, viewing, savedProperty, push) in main router |
| Postcode region mapping | ❌ FAIL | 4/10 test postcodes misclassified — see #38 |
| Number extraction (dedup) | ❌ FAIL | Duplicate values for overlapping patterns — see #39 |

### Manual Code Review

| Feature | Status | Issues Found |
|---------|--------|--------------|
| **S8-01** Memory consolidation | ⚠️ | Duplicate number extraction (#39); `updateProfile` is `publicProcedure` (#40) |
| **S8-02** Memory visualization | ✅ | Clean. Profile card, timeline, inline editing, delete — all solid. Good ARIA labels. |
| **S8-03** Seller onboarding | ⚠️ | No step validation — can submit empty forms (#41) |
| **S8-04** AI valuation tool | ⚠️ | Region mapping bug for E/N/W London postcodes (#38); grammar in methodology (#43) |
| **S8-05** Valuation report | ✅ | Print CSS present and correct. `@media print` rules, `color-adjust`. Hero section, comparables table, methodology — all render correctly. |
| **S8-06** Viewing booking | ⚠️ | `confirm` endpoint lacks ownership check (#42); `book_viewing` tool has empty `user_id` (#44) |
| **S8-07** Mortgage calculator | ✅ | SDLT calculation verified correct. Sliders, affordability, real-time updates — clean. Good `aria-label` on inputs. |
| **S8-08** Comparison table | ✅ | 10 rows, best/worst highlighting, winner badge, responsive scroll — solid. |
| **S8-09** Saved board | ✅ | Kanban columns, move/remove/notes/tags, comparison mode integration — well built. |
| **S8-10** Push notifications | ✅ | Subscribe/unsubscribe, preferences with proper `role="switch"` and `aria-checked`. Stubs clearly marked. |

---

## Bugs Filed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| [#38](https://github.com/yohannesHL/pavelo/issues/38) | Postcode region mapping fails for E/N/W London postcodes | **major** | `generate_valuation.py` |
| [#39](https://github.com/yohannesHL/pavelo/issues/39) | Duplicate numbers extracted from budget text | minor | `consolidation.py` |
| [#40](https://github.com/yohannesHL/pavelo/issues/40) | `updateProfile` endpoint is `publicProcedure` — no auth | **major** | `memory.ts` |
| [#41](https://github.com/yohannesHL/pavelo/issues/41) | Seller wizard allows empty form submission | **major** | `sell/page.tsx` |
| [#42](https://github.com/yohannesHL/pavelo/issues/42) | `confirm` endpoint lacks ownership check | **major** | `viewing.ts` |
| [#43](https://github.com/yohannesHL/pavelo/issues/43) | Methodology text grammar error "a up trend" | minor | `generate_valuation.py` |
| [#44](https://github.com/yohannesHL/pavelo/issues/44) | `book_viewing` tool passes empty `user_id` | **major** | `book_viewing.py` |

**Total: 7 bugs — 4 major, 2 minor, 0 blockers**

---

## What's Working Well

- **SDLT calculator** — all 8 test cases pass against official HMRC thresholds. Correct band boundaries.
- **Mortgage calculator** — clean formula, proper handling of 0% rate edge case, solid affordability traffic-light logic.
- **Valuation pipeline** — well-architected: comparable search → base valuation → adjustments → confidence scoring. Fallback demo data ensures it always works.
- **Memory profile card** — excellent UX: inline editing, category-colored timeline dots, accessible delete buttons with proper `aria-label`.
- **Notification preferences** — proper `role="switch"` and `aria-checked` on toggles. Privacy notice included.
- **Print CSS** — `@media print` rules present, `print-color-adjust: exact` for gradients, `break-inside: avoid` for sections.
- **Comparison table** — correct best/worst highlighting logic, responsive with sticky row labels.
- **Saved board** — full Kanban implementation with comparison mode integration.
- **Code quality** — consistent naming, clear comments, proper TypeScript types, good error handling patterns.

---

## Observations (Not Bugs)

1. **No Prisma relations on new models:** `ViewingBooking`, `SavedProperty`, and `ValuationReport` store `propertyId`/`userId` as raw UUIDs without `@relation` directives. No foreign key constraints. This is likely intentional for flexibility but means no cascade deletes or referential integrity at the DB level.

2. **No tRPC route for ValuationReport:** The Prisma model exists but there's no API to save or retrieve reports. The `/valuation/[id]` page uses hardcoded demo data. This appears to be deferred to Sprint 9.

3. **`re` imported inside function:** `_extract_numbers()` in `consolidation.py` imports `re` inside the function body (line 219). Minor — works fine but re-imports on every call.

4. **Saved board uses demo data:** The Kanban board at `/saved` uses `DEMO_PROPERTIES` state with no tRPC integration yet. The tRPC `savedPropertyRouter` is ready, just not wired up to the UI.

5. **Seller flow "Save as draft"** is a stub button with no implementation — matches the done.md notes.

---

## Sign-off

### ❌ BLOCKED — 4 major issues require fixes before merge

The two **security issues** (#40 unauthenticated profile writes, #42 unauthorized booking confirmation) must be fixed. The **London postcode mapping bug** (#38) would cause incorrect valuations for a significant portion of London properties — a core use case. The **seller wizard validation** (#41) allows empty submissions.

**Recommendation:** Fix #38, #40, #41, #42, and #44 before merging to `main`. Issues #39 and #43 are minor and can ship as-is.

---

*Signed: Ivy, QA Engineer*
