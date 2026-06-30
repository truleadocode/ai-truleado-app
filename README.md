# Truleado

AI-powered influencer–brand matchmaking. Brands submit campaign briefs, an AI agent ("Sarah") matches them against creators in the network, and creators see tailored opportunities in their dashboard. Lives at **app.truleado.com**.

## Stack

- **Next.js 14** (App Router, Server Components, Route Handlers)
- **Supabase** — Postgres, Auth, Storage, RLS, Realtime
- **Google Gemini** (`gemini-2.5-flash`) — onboarding chat + screenshot/brief parsing
- **Resend** — transactional email (match / confirmation notifications)
- **Tailwind CSS + shadcn/ui** — single, unified design system
- **lucide-react** — icons (no emoji as structural icons)

## Getting Started

```bash
npm install
npm run dev
```

The app runs on **http://localhost:3001**.

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server on port 3001 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint |

## Environment

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon (public) key
SUPABASE_SERVICE_ROLE_KEY=       # Service role key — SERVER-SIDE ONLY
GEMINI_API_KEY=                  # Google Gemini API key
RESEND_API_KEY=                  # Resend API key (transactional email)
NEXT_PUBLIC_SITE_URL=            # e.g. http://localhost:3001
```

> **Security:** the service role key must only ever be used in server-side code
> (Route Handlers / Server Components) via `createServiceClient()` — never expose
> it to the client.

## Roles & Flows

- **Creators** sign in with **Google OAuth**, onboard via a conversational chat
  with Sarah (answers extracted by Gemini), upload platform screenshots for
  AI analysis, then see matched opportunities at `/dashboard`.
- **Brands / Agencies** sign up with **email + password**, create a brief
  (from scratch via chat or by uploading a PDF), and review their creator
  shortlist at `/advertiser/dashboard`.

### Conventions

- All currency is stored in **cents** (integer) and displayed as **EUR (€)**.
- Creators never see a brand's name until the gig is explicitly revealed.

## Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Role selector (Creator / Brand) |
| `/onboarding` | Creator onboarding chat with Sarah |
| `/dashboard` | Creator opportunities feed |
| `/advertiser` | Brand entry / onboarding |
| `/advertiser/dashboard` | Brand briefs + shortlists |
| `/admin` | Internal admin dashboard (password-gated) |

### Admin dashboard

`/admin` is protected by a password gate (cookie-backed session). It shows
account counts plus detail tables for influencers and advertisers. The password
is currently hardcoded in `app/admin/page.tsx` — **move it to an `ADMIN_PASSWORD`
env var before any public deployment.**

## Design System

The UI is fully on **Tailwind + shadcn/ui**. Colors are driven by semantic
tokens defined in `app/globals.css` and `tailwind.config.ts` (`bg-card`,
`text-muted-foreground`, brand `gold` / `green` / `red` / `blue`, etc.) — no
inline `var(--token)` styling and no hardcoded hex in components.
