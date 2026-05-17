# Brainstorm — Sprint 1: Infrastructure Foundations
## Phase 1: Free Ideation

> **Date:** Sprint 1 kickoff
> **Facilitator:** Remy (Producer)
> **Topic:** How do we scaffold the entire Pavelo monorepo, design system, CI/CD, and service skeletons so that every subsequent sprint has a rock-solid foundation?

---

### 🎬 Remy (Producer) — Opening

Alright team. Sprint 1 is pure infrastructure. No user-facing features ship this sprint — but everything we build here is the foundation for the next 18 weeks. Every bad decision now compounds. Every good one pays dividends.

Each of you: pitch 2–3 ideas or positions on how we should approach your domain. Be specific. We'll debate in Phase 2.

---

### 📐 Kira (Product Designer)

**1. Onboarding-ready skeleton pages**
Even though Sprint 1 is infrastructure, I want us to scaffold placeholder pages for every core screen in the App Router — `/onboarding`, `/voice`, `/chat`, `/property/[id]`, `/saved`, `/market`, `/agent-dashboard`. Just empty layouts with the right route structure. When Sprint 2 kicks off, nobody is arguing about file placement — we just fill in the blanks. It should feel like walking into a new house with every room already labelled.

**2. Design tokens as the first PR, not an afterthought**
I've seen too many projects where the "design system" shows up in Sprint 5 and everything has to be restyled. I want our Inter / Playfair Display / JetBrains Mono typography scale, our navy/steel-blue/gold palette, and our radius tokens baked into the Tailwind config from day one. Every `shadcn/ui` component we init should already look like Pavelo, not like a default template.

**3. Accessibility audit baked into the component init**
When we run `shadcn/ui init`, I want us to verify that the base components pass WCAG 2.1 AA out of the box. If we have to override anything for our colour palette (contrast ratios on gold `#F4A261` against white, for example), let's catch it now. Nobody wants to fix 40 components in Sprint 9.

---

### 🎨 Milo (Art/Visual Director)

**1. Custom Tailwind 4 theme with CSS custom properties, not just config values**
Tailwind 4 supports native CSS variables as first-class theme values. I want us to define our entire token set — colours, typography, spacing, radii, motion durations — as CSS custom properties in a `tokens.css` file, then reference them in the Tailwind config. This gives us runtime theme switching later (light/dark, agency white-label) without rebuilding.

**2. Font loading strategy: `next/font` with display swap and preload**
We have three font families. That's a lot of weight. I want us to use `next/font/google` for Inter and Playfair Display, and `next/font/local` for JetBrains Mono (since we'll want the exact weights). All loaded in the root layout with `display: 'swap'`. No CLS from font loading, ever.

**3. A visual smoke test page at `/dev/tokens`**
I want a hidden dev-only page that renders every design token — all colours, all type scales, all radii, all motion curves — as a living style guide. This is our visual contract. If it looks wrong, we know immediately. It takes 30 minutes to build and saves hours of "is that the right blue?" conversations.

---

### 🖥️ Nova (Frontend Engineer)

**1. Next.js 15 App Router with strict TypeScript and `turbopack` for dev**
I want `strict: true` in `tsconfig.json` from the start. No `any` types sneaking in. And we should use `--turbopack` for the dev server — it's significantly faster than webpack for HMR. We can always fall back to webpack for production builds if needed, but dev speed matters when we have 10 sprints ahead.

**2. Minimal `shadcn/ui` init — only install what we need**
`shadcn/ui` lets you cherry-pick components. I do NOT want to init the full library. For Sprint 1, we need: `Button`, `Input`, `Card`, `Badge`, `Skeleton`, `Dialog`, `Dropdown Menu`, and maybe `Tabs`. That's it. We add components as needed in future sprints. Less surface area, less to maintain, less to audit.

**3. tRPC client setup in `apps/web` with React Query integration**
The frontend needs a typed API client from day one. I want the tRPC client configured with `@trpc/react-query` so we get full end-to-end type safety from Fastify → tRPC router → React hooks. This is one of the highest-leverage decisions in the whole stack. Also: we should put the tRPC AppRouter type export in `packages/shared` so both apps import from the same place.

---

### ⚙️ Sage (Backend Engineer)

**1. Prisma schema: start lean, schema-first**
For Sprint 1, the Prisma schema should have exactly three models: `User`, `Property`, and `Conversation`. No more. Each with the minimum fields needed for Sprint 2's auth and CRUD work. I want `uuid` primary keys everywhere, `createdAt`/`updatedAt` timestamps, and soft-delete (`deletedAt`) on every model from the start. We also need Supabase RLS policies — even in Sprint 1 — because retrofitting RLS is a nightmare.

**2. Fastify + tRPC with Zod: the triple threat**
The API gateway pattern should be: Fastify as the HTTP server, tRPC for the router, Zod for every input/output schema. I want a clean separation: `src/routes/` has tRPC procedure files, `src/middleware/` has auth and rate limiting, `src/lib/` has client singletons (Prisma, Redis, Supabase). Rate limiting goes in via `@fastify/rate-limit` from day one — not Sprint 10.

**3. Python services: FastAPI with Pydantic v2, `uv` for package management**
Both `services/agent` and `services/ml` should use the same skeleton: FastAPI, Pydantic v2 models, async everywhere, structured logging, a `/health` endpoint, and Docker with multi-stage builds. I'd advocate for `uv` over `poetry` for package management — it's significantly faster and the ecosystem has caught up. Each service gets its own `Dockerfile` and its own `pyproject.toml`.

---

### 🧪 Ivy (QA Engineer)

**1. Test infrastructure from Sprint 1 — not Sprint 10**
I want three test runners configured and passing their first test before this sprint ends: **Vitest** for TypeScript unit tests (frontend + API), **Playwright** for E2E (even if it's just "does the homepage render?"), and **pytest** for Python services. Every CI pipeline run must execute all three. If we skip this now, technical debt owns us by Sprint 5.

**2. Health check endpoints on every service**
Every service — web, API, agent, ML — needs a `GET /health` that returns `{ status: "ok", version: "..." }`. The CI pipeline should hit these after Docker Compose spins up. This is how we'll know deployments actually work, and it's trivially easy to add now.

**3. `.env.example` with EVERY variable documented**
I've been bitten by this on every project. The `.env.example` needs a comment above every variable explaining what it is, where to get it, and whether it's required or optional. Supabase URL, anon key, service role key, OpenAI key, Qdrant URL, Redis URL, database URL, Mapbox token — all documented. If a new dev can't `cp .env.example .env.local` and be running in 5 minutes, we've failed.

---

### 🎬 Remy (Producer) — My positions

**1. Docker Compose is a Sprint 1 hard requirement**
Local dev must work with a single `docker compose up -d` for infrastructure (Postgres, Redis) plus `pnpm dev` for services. No "works on my machine" excuses. This unblocks every other sprint.

**2. CI must be green before we merge Sprint 1**
The GitHub Actions pipeline needs to lint, type-check, and run at least one test per service. If CI is red, we don't ship. This is non-negotiable.

**3. Scope control: LiveKit and Qdrant are OUT of Sprint 1**
I see S1-08 in the sprint plan wants Qdrant cloud setup. I'm flagging this as a stretch goal. Sprint 1 is about the four core services running locally with typed contracts between them. Vector DB and voice infrastructure are Sprint 4 and Sprint 6 concerns. We can stub their Docker entries, but no integration work.

---

*Phase 1 complete. Moving to Phase 2: Discussion & Refinement.*
