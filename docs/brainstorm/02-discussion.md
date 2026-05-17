# Brainstorm — Sprint 1: Infrastructure Foundations
## Phase 2: Discussion & Refinement

> **Facilitator:** Remy (Producer)
> **Format:** Open debate. Reference each other by name. Challenge assumptions.

---

### 🎬 Remy

Good pitches, everyone. Let's get into it. I see a few areas where we're not aligned. Let me surface them.

**Conflict 1:** Milo wants a `/dev/tokens` visual smoke test page and CSS custom properties for future theme switching. Nova wants minimal surface area and only what's needed for Sprint 1. Are we over-investing in design infrastructure?

**Conflict 2:** Sage wants RLS policies in Sprint 1. Ivy wants full test infrastructure across three runners. I want to ship in two weeks. Something has to give — or does it?

Let's debate. Milo, Nova — you're up first.

---

### 🎨 Milo

Nova, I hear you on "minimal surface area," and I actually agree with your `shadcn/ui` cherry-pick approach. But the tokens page is different. It's not a feature — it's a **contract**. When I say `#1B3A6B` is our primary navy, I need a rendered page that proves it looks right next to `#2E86AB` and `#F4A261`. Tailwind config files are not visual — they're code. I need pixels.

Also, the CSS custom properties thing isn't scope creep. Tailwind 4 expects you to define your theme this way. It's literally the default pattern now. If we hard-code values into a JS config instead, we're fighting the framework. I'm asking us to do it *the Tailwind 4 way*, not some extra thing.

### 🖥️ Nova

Milo, fair point on Tailwind 4's CSS-first config — you're right, that's the idiomatic path now. I'll concede on that. The CSS custom properties approach is actually cleaner for tree-shaking too.

But the `/dev/tokens` page — can we make it a Storybook story instead of a route? I don't want dev-only routes polluting the App Router. If we're already setting up `shadcn/ui`, we could have a Storybook with a "Design Tokens" page that shows everything. Same visual contract, cleaner architecture.

### 🎨 Milo

Storybook works if it's actually set up in Sprint 1. Is it?

### 🖥️ Nova

Honestly? I'd cut Storybook from Sprint 1. It's useful but it's not blocking anything. We can add it in Sprint 2 when we're actually building UI components. For Sprint 1, I'd rather spend that time on bulletproof tRPC client setup and making sure Turbopack dev works smoothly.

### 📐 Kira

I'm with Nova on cutting Storybook for Sprint 1, but Milo, I really want your tokens page somehow. What if it's a simple `.tsx` page at `app/(dev)/tokens/page.tsx` inside a route group that we exclude from production builds? Route groups are free in the App Router — they don't add to the bundle. And Kira needs to see the colour palette rendered before Sprint 2 starts, or we'll be doing ad-hoc accessibility fixes for weeks.

### 🎨 Milo

I like that. Route group `(dev)` with a tokens page. Clean.

### 🖥️ Nova

Fine. I can live with that. It's a single file. But let me be clear: no Storybook in Sprint 1. That's Sprint 2 at earliest.

### 🎬 Remy

**Decision: Tokens page in a `(dev)` route group. No Storybook in Sprint 1.** Moving on.

---

### 🎬 Remy

Sage, Ivy — the RLS and testing question. Sage, you want Supabase RLS policies on Day 1. Ivy, you want three test runners green in CI. Both are "do it right" investments. But we have 28 story points across 10 tasks in two weeks. Where does the time come from?

### ⚙️ Sage

Remy, RLS isn't optional — it's a security requirement. Section 9 of the PROJECT_BRIEF says "Row-level security (RLS) — enabled on all Supabase tables for multi-tenancy isolation." If we ship Sprint 1 without RLS and Sprint 2 adds auth, we have an entire sprint where the database is wide open. Even in dev, that's a bad habit. The policies for Sprint 1 are trivial — `User` table with `auth.uid() = id`, `Property` table with public read. Ten lines of SQL.

### 🧪 Ivy

I'm going to back Sage here, and I'll tell you why: if we don't set up RLS now, I guarantee it'll be a Sprint 10 blocker when we try to do the security audit. Every table added in Sprints 2–9 will need retroactive policies. That's expensive.

But Sage, I need to push back on your `Conversation` model. You said three models: `User`, `Property`, `Conversation`. Do we actually need `Conversation` in Sprint 1? We're not building chat until Sprint 5.

### ⚙️ Sage

...Fair. We need `User` and `Property` for Sprint 2's auth and CRUD. `Conversation` can wait until Sprint 4 or 5. Two models is enough.

### 🧪 Ivy

Good. And on my test infrastructure ask — I'll compromise. Vitest and pytest are non-negotiable for Sprint 1. Playwright E2E can be Sprint 2 when we have actual pages to test. One less test runner to configure means more time for everything else.

### 🎬 Remy

**Decision: Two Prisma models (User, Property) with RLS from Sprint 1. Vitest + pytest in CI. Playwright deferred to Sprint 2.**

---

### 🖥️ Nova

Sage, question on tRPC. Where does the `AppRouter` type live? I need to import it in `apps/web` for the typed client. If it lives in `apps/api`, that's a cross-workspace dependency. If it lives in `packages/shared`, we need the tRPC router definition there too, which is weird.

### ⚙️ Sage

The router definition stays in `apps/api`. The `AppRouter` type gets exported from `apps/api/src/router.ts`. In `apps/web`, you import it as a **type-only import** via TypeScript project references or pnpm workspace protocol: `import type { AppRouter } from '@pavelo/api/router'`. No runtime dependency, just the type. Turborepo handles the build order.

### 🖥️ Nova

That works. We'll need `"@pavelo/api": "workspace:*"` in the web app's `package.json` and the `exports` field in `apps/api/package.json` to expose the type. Let's make sure we document that in the setup instructions.

### ⚙️ Sage

Agreed. And the `packages/shared` package should have the Zod schemas for domain types — `Property`, `User`, etc. — that both the frontend and backend import for validation. The tRPC types layer on top of those.

---

### 📐 Kira

Quick question for the room. The placeholder pages I mentioned — the skeleton App Router structure for `/onboarding`, `/voice`, `/chat`, etc. — is that in scope or out?

### 🎬 Remy

In scope, but only as empty route files. A `page.tsx` that returns `<div>Coming in Sprint N</div>` with the right layout nesting. No actual UI. This is five minutes of work per route and it confirms our routing architecture early. Kira, you own the route structure spec. Nova builds the files.

### 📐 Kira

Perfect. I'll write up the route map.

---

### 🧪 Ivy

One more thing. Sage, your Python services — you mentioned `uv` over `poetry`. I'm supportive, but we need to make sure CI can install from `uv` lockfiles. GitHub Actions has `uv` support now via `astral-sh/setup-uv`, but it's newer. Have we tested this?

### ⚙️ Sage

Good flag. `uv` has a `uv pip install -r requirements.txt` compat mode and `uv sync` for lockfile installs. The GitHub Action works — I've used it on other projects. We'll pin a `uv` version in CI so it doesn't break under us.

### 🧪 Ivy

Pin it. And I want a CI step that does `uv sync --frozen` — meaning it fails if the lockfile is out of date. No silent dependency drift.

### ⚙️ Sage

Done.

---

### 🎬 Remy

One last topic. **Qdrant in Sprint 1 — yes or no?**

The PRD's S1-08 says "Qdrant cloud setup: collections, schema, API key management, Python client wrapper." That's vector DB infrastructure. We don't use it until Sprint 4 (Hybrid RAG Search). Do we set it up now or later?

### ⚙️ Sage

I'd add a Qdrant container to `docker-compose.yml` so it's there for local dev, but I would NOT set up cloud, collections, or the client wrapper. That's Sprint 4 work. Having the container means the agent and ML services can start writing integration tests against it early if they want.

### 🖥️ Nova

Agree. Docker entry only. No integration code.

### 🧪 Ivy

Same. And same logic for LiveKit — Docker entry with no integration code. Just so it's in the compose file when Sprint 6 comes around.

### 🎬 Remy

**Decision: Qdrant and LiveKit get Docker Compose entries as stubs. No client code, no cloud setup, no collection schemas. Those are Sprint 4 and Sprint 6 respectively.**

---

*Phase 2 complete. Moving to Phase 3: Final Decisions.*
