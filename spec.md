# Wardrobe Ledger — Project Spec

> This document is the source of truth for any AI agent or developer working on this codebase. Read this before touching any file.
> Rename to `CLAUDE.md` if you want Claude Code to auto-load it on every session.

---

## 1. Project identity

**What:** Personal AI-classified wardrobe inventory and outfit system. Single user (Talal). Mobile-first. Used daily.

**Why it exists:** Replace messy mental tracking of a 100-200 item wardrobe with structured data + agentic AI workflows. Doubles as a portfolio piece demonstrating production-grade AI automation.

**User context:**
- **Talal Ali** — Technical PM at ConnectHear, building a personal AI consulting practice.
- Based in Karachi, Pakistan. Climate is hot 8 months/year, mild winter, monsoon season.
- Heavy n8n / Supabase / Next.js operator. Pragmatic, anti-fluff, ROI-driven.
- Communication style: direct, blunt, no corporate politeness, strong opinions called out.
- Wants you to act as a **system co-architect**, not a hand-holder. Don't over-explain. Don't ask for permission to make obvious calls. Make the call, state your reasoning, ship.

**Operating philosophy:** ROI → Effort → Scalability → Risk. In that order.

---

## 2. Tech stack (definitive)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 App Router | Talal's stack |
| Language | TypeScript strict | Type safety, types co-located in `src/lib/types.ts` |
| Hosting | Vercel | One-click deploy, free hobby tier |
| DB | Supabase Postgres | Talal's default backend |
| Storage | Supabase Storage (public bucket `wardrobe`) | Image hosting via UUID-based URLs |
| Styling | Tailwind CSS | Custom theme in `tailwind.config.ts` |
| Font | JetBrains Mono | Loaded from Google Fonts in `layout.tsx` |
| Icons | lucide-react | |
| AI: vision/classification | **Gemini 2.5 Flash** | Cheap, fast, structured JSON output, Talal's existing API |
| AI: reasoning (Sprint 2+) | **Claude API (Sonnet)** | When multi-step reasoning matters — outfit agent, etc. |
| Auth | Single-password cookie via middleware | No real auth — single user app |

**Do NOT add** without explicit reason: ORM (Prisma/Drizzle — Supabase JS client is enough), state managers (Zustand/Redux — local state fine), server components for forms (`'use client'` is correct here), or auth libraries (NextAuth, Clerk — overkill).

---

## 3. Architecture

```
┌─────────────────────────────────────────────────┐
│ Client (browser, mobile-first)                  │
│   - All UI under src/app/page.tsx + components  │
│   - Uses fetch() to /api/* — NEVER Supabase     │
│     directly                                    │
└──────────────────┬──────────────────────────────┘
                   │
                   │ HTTPS, cookie auth
                   ▼
┌─────────────────────────────────────────────────┐
│ Next.js middleware (src/middleware.ts)          │
│   - Checks app_pwd cookie on every request      │
│   - Redirects to /unlock or returns 401         │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ API routes (server only, runtime: nodejs)       │
│   POST /api/unlock      → set/clear cookie      │
│   GET  /api/items       → list all items        │
│   POST /api/items       → classify+upload+insert│
│   PATCH /api/items/:id  → update fields         │
│   DELETE /api/items/:id → remove row + image    │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────┐      ┌──────────────┐
│ Gemini API   │      │ Supabase     │
│ (classify)   │      │ (DB+storage) │
└──────────────┘      └──────────────┘
```

**POST /api/items flow** (the most complex):
1. Client resizes image (max 800px, JPEG q=0.8) → base64
2. Server: `classifyImage()` → Gemini structured JSON output (with 3x retry/backoff)
3. Server: upload base64 buffer → Supabase storage bucket `wardrobe`
4. Server: insert row in `items` table with `image_url` from public URL
5. If DB insert fails → orphan image cleaned up
6. Return full item record

---

## 4. File map

```
src/
├── middleware.ts           Password gate, runs on every route
├── lib/
│   ├── types.ts            ALL enums + Item/Classification types — single source of truth
│   ├── supabase.ts         supabaseAdmin (service role, SERVER ONLY)
│   ├── gemini.ts           classifyImage() + emptyClassification() fallback
│   └── image.ts            resizeToBase64() + itemsToCsv() — client utilities
├── app/
│   ├── layout.tsx          Root layout, font loading
│   ├── globals.css         Tailwind + base styles
│   ├── page.tsx            Main inventory UI (client component)
│   ├── unlock/page.tsx     Password screen
│   └── api/
│       ├── unlock/route.ts        POST set cookie, DELETE clear cookie
│       ├── items/route.ts         GET list, POST classify+create
│       └── items/[id]/route.ts    PATCH, DELETE
└── components/
    ├── Chip.tsx            Tag pill (used everywhere)
    ├── DropZone.tsx        Drag/drop + file/camera input (label-wrapped, mobile-safe)
    ├── ItemCard.tsx        Grid item display
    └── ItemEditor.tsx      Modal for editing all fields

supabase/schema.sql         Run this in Supabase SQL editor on first setup
public/manifest.json        PWA installable
```

---

## 5. Data schema

### `items` table

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK, auto-generated |
| `name` | text | Human label, AI-suggested |
| `image_url` | text | Public Supabase Storage URL |
| `storage_path` | text | Filename in bucket (for cleanup) |
| `category` | text | enum: Top/Bottom/Outerwear/Shoes/Accessory/Underlayer |
| `subcategory` | text | free text (T-shirt, Polo, etc.) |
| `color_primary` | text | dominant color name |
| `color_secondary` | text \| null | |
| `pattern` | text | enum: Solid/Striped/Checked/Graphic/Textured/Other |
| `material_guess` | text | enum: Cotton/Linen/Denim/Wool/Synthetic/Blend/Leather/Unknown |
| `weight` | text | enum: Light/Medium/Heavy |
| `formality` | int | 1-5 (1=gym, 5=formal) |
| `sleeve_length` | text | enum: Sleeveless/Short/3-4/Long/N-A |
| `season_tags` | text[] | Summer, Winter, Monsoon, All-year |
| `context_tags` | text[] | Gym, Office, Casual, Going-out, Home |
| `fit` | text | enum: Slim/Regular/Relaxed/Oversized/Unknown |
| `status` | text | enum: Clean/Dirty/At-cleaners/Storage/Retired |
| `confidence` | float | AI's 0-1 confidence; <0.7 flags for review |
| `notes` | text | brand, defects, notes |
| `created_at` | timestamptz | auto |
| `updated_at` | timestamptz | auto-bumped via trigger |

**All enums live in `src/lib/types.ts` as `as const` arrays.** Adding/changing values: update both the SQL CHECK (none currently — kept loose) AND the types.ts arrays. Don't drift.

### Coming later (Sprint 2+)
- `outfits` — composed outfits with FK to items
- `wear_log` — wear events (item_id, worn_at, context, weather)
- `laundry_batches` — laundry tracking

---

## 6. Conventions

### API routes
- Always `runtime = 'nodejs'`. Edge runtime breaks Supabase storage uploads.
- Always validate request body. Return 400 on missing fields with `{ error: '...' }`.
- Return shapes: success `{ item }` / `{ items }` / `{ ok: true }`, errors `{ error: string }` with appropriate status code.
- Whitelist updatable fields in PATCH (see `items/[id]/route.ts`). Never spread arbitrary input into DB updates.
- Use `console.error()` for server-side errors. Vercel captures these.

### Client-side
- All data access through `fetch('/api/...')`. Never `createClient()` in components.
- Use `'use client'` directive on any component with hooks or event handlers.
- Local state with `useState` is fine; no need for global state managers yet.
- Optimistic UI is OK for fast feedback (e.g., add to queue immediately, resolve after API response).

### Styling
- Tailwind utility classes preferred. Custom CSS only in `globals.css` for things Tailwind can't express (scrollbar, animations, select arrow).
- Color tokens: use `accent` (amber #fb923c) for CTA / brand, `zinc` for everything else.
- Mobile-first: use raw Tailwind (sm/md breakpoints) for desktop overrides.
- No emojis in UI unless explicitly requested.

### Naming
- Components: `PascalCase.tsx`, default + named exports as appropriate.
- Routes: kebab-case folders (`items`, `unlock`).
- Utility files: lowercase (`gemini.ts`, `image.ts`).
- Types/Enums: PascalCase types, SCREAMING_SNAKE_CASE for `as const` enum arrays at module top.

### Error handling
- Gemini failures: catch, log, return `emptyClassification()` and let the user edit manually. Never block image upload on AI failure.
- Storage upload failures: surface to user, don't swallow.
- DB insert failure after upload: clean up orphaned image (best-effort).

---

## 7. Anti-patterns — DO NOT

- ❌ **Don't expose `SUPABASE_SERVICE_ROLE_KEY` to the client.** It's server-only. Use API routes.
- ❌ **Don't add a `NEXT_PUBLIC_SUPABASE_ANON_KEY`** unless we explicitly enable client-side Supabase (we don't yet).
- ❌ **Don't add user accounts / multi-tenancy.** This is a single-user app. If/when we expand, that's a re-architecture, not a feature add.
- ❌ **Don't bypass middleware.** New API routes are automatically protected. New public paths require explicit allowlist in `middleware.ts`.
- ❌ **Don't use Edge runtime for routes that touch Supabase storage.** Stick with `nodejs`.
- ❌ **Don't add new top-level dependencies without justification.** Talal hates dependency bloat. If lodash for one helper, write the helper instead.
- ❌ **Don't use Make/Zapier as solutions.** This codebase prefers n8n / direct API.
- ❌ **Don't add a UI library (shadcn, Material, etc.).** The custom Tailwind+lucide design is intentional.
- ❌ **Don't migrate to Drizzle/Prisma.** Supabase JS client is sufficient.
- ❌ **Don't change the schema casually.** Adding optional fields is fine. Renaming or removing fields requires migration script in `supabase/`.
- ❌ **Don't sweeten responses with corporate fluff or excessive disclaimers.** Talal will ask if he wants more detail.

---

## 8. Decision framework

For any non-trivial decision (new feature, library swap, schema change), evaluate in order:

1. **ROI** — what does Talal actually get out of this? If <50% confidence it's worth shipping, push back instead of building.
2. **Effort** — small, medium, large. Always offer the smallest version that solves the problem first.
3. **Scalability** — does it survive 1000 items? 5 years? Don't optimize prematurely but don't paint into corners.
4. **Risk** — security, data loss, vendor lock-in. Flag all three explicitly when present.

State your evaluation when proposing changes. Talal can override but wants to see the reasoning.

---

## 9. How to communicate with Talal

- **Direct, blunt, sometimes sarcastic is welcome.** No "great question!" or "I'd be happy to help."
- **Strong opinions, called out.** "I think X because Y. Push back if you disagree."
- **Short responses by default.** Deep dives only when explicitly asked.
- **Default code answer structure:** Problem → Proposed Architecture → Implementation Steps → Risks/Edge Cases → Next Actions.
- **Always provide full, copy-pasteable code.** No "you can adapt this." No snippets that hide complexity.
- **When unsure**, ask 1-2 high-signal questions OR make a reasonable assumption and proceed (state it).
- **Treat ERPNext/Frappe questions as expert-level**, not beginner config. Same for n8n.
- **Open-source / self-hosted preferred** when reasonable. Pragmatic over ideological.

---

## 10. Roadmap (Sprints)

### ✅ Sprint 1 — Inventory (current)
Photo → Gemini classify → Supabase DB + storage. Single-user, password-gated.

### Sprint 2 — Daily outfit agent
**Goal:** Each morning, propose 2-3 weather/context-appropriate outfits from clean items.

**Architecture:**
- Trigger: morning cron OR manual button in UI
- Inputs: weather (Karachi via Open-Meteo, free), calendar (Google Calendar API, OAuth), clean items query
- Logic: agentic — planner picks combos using formality + weight + sleeve + color-matching heuristics; verifier checks coherence; output formatted as recommendations with reasoning
- Storage: new `outfit_suggestions` table (date, items, reasoning, accepted bool)
- Notification: optional Slack/Telegram via webhook

**LLM:** Use **Claude Sonnet** here. Reasoning matters more than cost. Function calling for tool use (get_weather, get_calendar, query_items, propose_outfit, verify_outfit).

### Sprint 3 — Wear logger + laundry tracker
- "Wore this today" button → logs to `wear_log`, sets status=Dirty, increments wear_count, updates last_worn
- Laundry queue view: grouped Dirty items, mark batch sent/returned
- Cost-per-wear surfacing on item cards

### Sprint 4 — Visual outfit preview
- Pick 3-4 items → Nano Banana (Google's paid image gen) composites them on a model
- "What does this combo look like?" before committing
- Saves rendered preview in storage tied to outfit_suggestion record

### Sprint 5 — Visual similarity (CLIP + pgvector)
- Embed all item images via CLIP (Vertex AI multimodal embeddings or self-hosted)
- Add pgvector to Supabase, store embeddings
- "Find tops that match this jacket" via cosine similarity
- Powers shopping intercept ("does this product fill a gap?")

### Backlog
- Pack-for-trip agent (destination + days + occasions → pack list)
- Shopping intercept (paste product URL → fits-or-duplicates analysis)
- Gap analyzer (weekly cron, surfaces missing categories/colors)
- Content engine (auto-generated outfit shots for TikTok)

**Forward-compat:** When adding fields to `items` for future sprints, prefer optional/nullable. Don't break existing rows.

---

## 11. Quick reference

### Environment variables
| Var | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Full DB access, bypasses RLS |
| `GEMINI_API_KEY` | **server only** | Vision classification |
| `APP_PASSWORD` | **server only** | Single-password gate |

### Common commands
```bash
npm run dev              # local dev server
npm run build            # production build (run before deploying)
npx tsc --noEmit         # typecheck only

# Supabase migrations: paste SQL into Dashboard > SQL Editor
# Don't use supabase CLI unless we adopt it project-wide
```

### Adding a new field to items
1. Write migration SQL, append to `supabase/schema.sql` AND run in Supabase SQL editor
2. Add field to `Item` interface in `src/lib/types.ts`
3. Add to whitelist in `src/app/api/items/[id]/route.ts` PATCH handler if user-editable
4. Update `ItemEditor.tsx` if it should appear in the UI
5. Update `itemsToCsv()` cols array in `src/lib/image.ts`
6. Update `gemini.ts` PROMPT + RESPONSE_SCHEMA if AI should classify it

### Adding a new API route
1. Create `src/app/api/<name>/route.ts` with named exports for HTTP methods
2. `export const runtime = 'nodejs'` at top
3. Validate input, return `{ error }` on bad request
4. If route should be public, add to `PUBLIC_PATHS` array in `src/middleware.ts`

### Adding a new component
1. `src/components/<PascalName>.tsx`
2. `'use client'` at top if it uses hooks
3. Named export, typed props interface
4. Tailwind for styling, follow existing token usage (`bg-zinc-900`, `border-zinc-800`, `text-accent`)

---

## 12. Debugging cheatsheet

| Symptom | Likely cause |
|---|---|
| 401 on every request | `APP_PASSWORD` env not set or cookie cleared. Hit `/unlock` again. |
| Image uploads but no row | Check Supabase logs — RLS or column constraint. |
| Image fails upload | Bucket missing, not public, or service_role key wrong. |
| Classification returns garbage | Check Gemini quota; image may be too small/blurry. Confidence will be low. |
| Build fails on Vercel | Env vars missing on Vercel side — must set explicitly per-environment. |
| TypeScript errors after schema change | Forgot to update `src/lib/types.ts`. |
| Mobile camera button no-op | Must be HTTPS. Localhost over HTTP can't access camera. Use Vercel preview URL. |

---

## 13. When in doubt

- Ask Talal directly via the conversation — but only after attempting the obvious thing.
- Lean toward shipping the smallest working version. Iterate from real usage, not theoretical edge cases.
- Optimize for Talal's *actual workflow* (mobile, batch uploads, fast classification) over theoretical generality.
- If a new sprint pulls the architecture in a new direction, propose the change to this spec FIRST before implementing.
