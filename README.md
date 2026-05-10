# Wardrobe Ledger

AI-classified wardrobe inventory. Snap a photo, Gemini classifies it across 14 fields, lands in Supabase. Deploy to Vercel, use from phone.

**Stack:** Next.js 14 (App Router) · Supabase (Postgres + Storage) · Gemini 2.5 Flash · Tailwind · Mobile-first PWA

---

## Setup (one-time, ~15 min)

### 1. Install

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine)
2. Open **SQL Editor** → paste contents of `supabase/schema.sql` → run
3. Open **Storage** → New bucket:
   - Name: `wardrobe`
   - Public: **ON**
   - File size limit: `5 MB`
   - Allowed MIME types: `image/*`
4. Settings → API → copy:
   - `Project URL` → goes in `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` key (the secret one) → goes in `SUPABASE_SERVICE_ROLE_KEY`

### 3. Gemini API key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Create API key → copy → goes in `GEMINI_API_KEY`

### 4. Env file

```bash
cp .env.example .env.local
# Fill in the values
```

Set `APP_PASSWORD` to a long random string. This is what gates the app.

### 5. Run locally

```bash
npm run dev
```

Open `http://localhost:3000` → enter password → upload a test photo → confirm classification works.

---

## Deploy to Vercel

```bash
git init
git add .
git commit -m "init wardrobe ledger"
gh repo create wardrobe-app --private --source=. --push
# OR push manually to a remote you create on github.com
```

Then:

1. [vercel.com/new](https://vercel.com/new) → Import the repo
2. Framework: Next.js (auto-detected)
3. **Add the environment variables** from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `APP_PASSWORD`
4. Deploy

The Vercel URL is your app. Bookmark it on your phone, "Add to Home Screen" for an installable PWA.

---

## Architecture

```
Client (browser)
  ↓ fetch
Next.js API routes (server, auth-gated by middleware)
  ├─ /api/unlock    → set password cookie
  ├─ /api/items     → GET list, POST create
  └─ /api/items/[id] → PATCH, DELETE

POST /api/items flow:
  client resizes photo → base64
  → Gemini 2.5 Flash classifies (structured JSON output)
  → Supabase storage upload (image)
  → Supabase items table insert (record + image_url)
  → returns full item to client
```

**Auth:** Single shared password. Middleware checks an httpOnly cookie on every request. No real auth — this is a personal tool.

**Data ownership:** All your data lives in your Supabase project. You can run SQL queries directly, export CSV from the app, or hook up n8n/Frappe directly to the Postgres for downstream automations.

---

## Cost (rough)

- Supabase free tier: 500MB DB + 1GB storage. Easily handles 1000+ items.
- Vercel hobby tier: free, plenty of bandwidth for personal use.
- Gemini 2.5 Flash: ~$0.001 per classification. 200 items ≈ $0.20 total.

---

## Roadmap (Sprints)

- **Sprint 1 ✅** — Inventory: photo → AI classify → DB
- **Sprint 2** — Outfit agent: weather + calendar + clean items → daily outfit suggestion
- **Sprint 3** — Wear logger + laundry tracker
- **Sprint 4** — Visual outfit preview (Nano Banana composites)
- **Sprint 5** — CLIP embeddings + visual similarity ("find tops that match this jacket")

---

## Common issues

**"Storage upload failed"** — Bucket doesn't exist or isn't public. Re-check step 2.3.

**"Wrong password"** — `APP_PASSWORD` env not set, or doesn't match what you typed. Vercel env changes require a redeploy.

**Camera button does nothing on iOS** — Make sure you're on HTTPS (Vercel deploys are). Camera input only works over secure context.

**Gemini errors** — Free tier has rate limits (15 RPM on 2.5 Flash). The classifier auto-retries with backoff. If you hit limits, slow down batches.

---

## Schema reference

See `src/lib/types.ts` for all fields. The 14 classified fields:

| Field | AI confidence |
|---|---|
| category, subcategory, color_primary, pattern, sleeve_length | High |
| color_secondary, weight, material_guess, formality | Medium |
| fit, season_tags, context_tags | Low (often needs your edit) |
| name, notes | Generated, easy to refine |

`status` defaults to `Clean`. `last_worn` and `wear_count` come in Sprint 3.
