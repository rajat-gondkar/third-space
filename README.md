# Third Space

Discover and post real-life activities happening near you. V1: Google login, post an activity, see live pins on a map, join with one tap.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui · Supabase (Auth + Postgres + Realtime) · Leaflet + OpenStreetMap · Vercel.

---

## Quick start (≈ 10 minutes)

### 1. Install (already done if you’re seeing this)

```bash
npm install
```

### 2. Create a Supabase project

1. Go to <https://supabase.com>, sign in, **New project**.
2. Pick a region close to you, set a strong DB password (save it somewhere), wait ~2 min for provisioning.
3. Once ready, go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Add env vars

```bash
cp .env.local.example .env.local
# then paste the two values from step 2 into .env.local
```

### 4. Apply the database schema

1. In the Supabase dashboard, open **SQL editor → New query**.
2. Open `supabase/migrations/0001_init.sql` from this repo, copy the whole thing, paste it into the editor, click **Run**.
3. You should see three new tables under **Table editor**: `profiles`, `activities`, `participants`.

### 5. Set up Google OAuth

You need a Google OAuth client and to wire it into Supabase.

**Google Cloud Console:**

1. Go to <https://console.cloud.google.com> → create a project (or pick one).
2. **APIs & Services → OAuth consent screen** → choose **External**, fill in the app name + your email, save. (You can leave it in “Testing” mode for V1.)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**
   - **Authorized redirect URIs**: add the callback URL from Supabase. You’ll get it in the next step — come back here once you have it.

**Supabase dashboard:**

1. **Authentication → Providers → Google** → toggle on.
2. Copy the **Callback URL (for OAuth)** Supabase shows (looks like `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`).
3. Paste it back in the Google Cloud Console as an **Authorized redirect URI**, then copy the **Client ID** and **Client secret** from Google and paste them into Supabase. Save.
4. **Authentication → URL Configuration** → set **Site URL** to `http://localhost:3000` for local dev. Under **Redirect URLs** add:
   - `http://localhost:3000/auth/callback`
   - (later, when deploying) `https://YOUR-VERCEL-DOMAIN/auth/callback`

### 6. Run it

```bash
npm run dev
```

Open <http://localhost:3000>, click **Get started**, sign in with Google. You should land on `/map`.

---

## Deploying to Vercel (Day 7)

1. `git init && git add . && git commit -m "feat: V1"` then push to GitHub.
2. <https://vercel.com/new> → import the repo → it auto-detects Next.js.
3. Add the same two env vars from `.env.local` in **Settings → Environment Variables**.
4. After the first deploy, copy the Vercel domain and add it in Supabase under **Authentication → URL Configuration → Redirect URLs** (`https://<your-domain>/auth/callback`). Update **Site URL** too.

---

## Project structure

```
src/
  app/
    layout.tsx                # root layout + Toaster
    page.tsx                  # landing (redirects to /map if signed in)
    login/page.tsx            # "Continue with Google"
    auth/callback/route.ts    # OAuth exchange
    map/page.tsx              # map + list (protected)
    post/page.tsx             # create activity (protected)
    activity/[id]/page.tsx    # detail + Join (protected)
  components/
    Map.tsx / MapClient.tsx           # Leaflet, dynamic-imported, no-SSR
    LocationPicker.tsx / *Client.tsx  # tap-to-drop-pin map
    PostForm.tsx                      # react-hook-form + zod
    ActivityCard.tsx
    JoinButton.tsx                    # calls join_activity RPC
    RealtimeRefresh.tsx               # subscribes + debounced router.refresh()
    SignInButton.tsx / SignOutButton.tsx
    ui/                               # shadcn primitives (button, input, …)
  lib/
    supabase/{client,server,middleware}.ts
    types.ts                          # Activity, ActivityCategory, JoinResult
    utils.ts                          # cn()
  proxy.ts                            # protects /map, /post, /activity/* (Next 16 proxy)
supabase/migrations/0001_init.sql     # DB schema, RLS, RPC, realtime
```

---

## V1 scope (locked)

✅ Google login · post activity · map pins · live participant count · realtime refresh

🚫 **Not V1:** friends, profiles, chat, social feed, tags, reviews, filters, matching engine. See `.cursor/plans/third-space-v1-plan_*.plan.md` for the V2 backlog.

---

## Notes

- Leaflet is dynamic-imported with `ssr: false` because it touches `window` on import.
- The atomic `join_activity` Postgres function (in the migration) prevents races on `max_participants` via `select ... for update`.
- Activities older than 6 hours are filtered at query time — no cron needed.
- All security is enforced by Supabase RLS policies and the `security definer` join function. The client only needs the anon key.
