# Third Space — Project Overview

A location-based web app to discover and post real-life activities near you. Users sign in with Google, drop activities on a map, and join others with one tap.

---

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui primitives
- **Auth + Database:** Supabase (Postgres + Auth + Realtime)
- **Maps:** Leaflet + OpenStreetMap (no API key)
- **Geocoding:** OpenStreetMap Nominatim (free)
- **Hosting:** Vercel

---

## Project Structure

```
src/
  app/                          # Next.js App Router pages
    layout.tsx                  # Root layout, fonts, metadata, <Toaster />
    page.tsx                    # Landing page (redirects to /map if signed in)
    loading.tsx                 # Global loading fallback
    opengraph-image.tsx         # Dynamic OG image for social shares
    login/page.tsx              # "Continue with Google" screen
    auth/callback/route.ts      # OAuth code exchange → session cookie
    map/page.tsx                # Main app: map + activity list (auth required)
    post/page.tsx               # Create activity form (auth required)
    activity/[id]/page.tsx      # Activity detail + join + participant list
    globals.css                 # Tailwind + CSS variables
    favicon.ico                 # App icon
  components/                   # React components (mix of Server & Client)
    ui/                         # shadcn/ui primitives (button, input, sonner, etc.)
    Map.tsx                     # Leaflet map wrapper (dynamic import, SSR disabled)
    MapClient.tsx               # Actual Leaflet map + markers logic
    LocationPicker.tsx          # Map for dropping a pin during posting
    LocationPickerClient.tsx    # Leaflet tap-to-pin logic
    PostForm.tsx                # Activity creation form (react-hook-form + zod)
    ActivityCard.tsx            # Single activity row in the sidebar list
    ActivityList.tsx            # Sidebar list with filters + deduping
    FiltersBar.tsx              # Date / location filter controls
    PinButton.tsx               # Pin up to 2 activities to top of list
    JoinButton.tsx              # Join activity button (calls join_activity RPC)
    JoinModal.tsx               # Modal asking for display name before joining
    DeleteActivityButton.tsx    # Host-only delete with confirm dialog
    ConfirmDialog.tsx           # Reusable destructive action confirm
    ParticipantsList.tsx        # Accordion of joined users
    ProfileMenu.tsx             # Avatar dropdown with sign out
    NavBar.tsx                  # Top bar with logo, live count, profile menu
    Logo.tsx                    # Brand mark
    SignInButton.tsx            # Starts Google OAuth flow
    ShareButton.tsx             # Share menu (WhatsApp / Reddit / X)
    SuccessModal.tsx            # Confetti modal after posting
    BlockingLoader.tsx          # Full-screen spinner during submit
    RealtimeRefresh.tsx         # WebSocket subscription + polling fallback
  hooks/
    usePinnedActivities.ts      # localStorage hook for pinned activities
  lib/
    supabase/
      client.ts                 # Browser Supabase client
      server.ts                 # Server Component Supabase client
      middleware.ts             # Session refresh + route protection logic
    types.ts                    # TypeScript types (Activity, Profile, JoinResult, etc.)
    utils.ts                    # cn() helper for Tailwind class merging
    geocoding.ts                # OpenStreetMap Nominatim wrapper
  proxy.ts                      # Next.js proxy (replaces middleware.ts) — wires updateSession
public/                         # Static assets (SVGs)
supabase/migrations/
  0001_init.sql                 # DB schema, RLS policies, triggers, RPC, realtime
  0002_participants_display_name_and_email.sql  # Adds email + display_name columns
```

---

## What Each File Does

### App Router Pages

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root HTML shell. Loads Plus Jakarta Sans font, sets metadata/OG tags, renders Toaster for notifications. |
| `app/page.tsx` | Landing page with animated CTA. Redirects signed-in users to `/map`. Shows setup warning if env vars missing. |
| `app/login/page.tsx` | Simple login screen. Passes `?next=` redirect to `SignInButton`. |
| `app/auth/callback/route.ts` | OAuth callback handler. Exchanges `?code=` for a Supabase session, then redirects to `?next=` or `/map`. |
| `app/map/page.tsx` | Main dashboard. Fetches activities from last 6 hours, renders `Map` + `ActivityList` side-by-side. |
| `app/post/page.tsx` | Form page. Passes `userId` to `PostForm`. Protected by proxy. |
| `app/activity/[id]/page.tsx` | Detail page. Fetches single activity + participants. Shows join button, host edit/delete, participant accordion. |

### Components

| File | Purpose |
|------|---------|
| `Map.tsx` / `MapClient.tsx` | `Map` dynamically imports `MapClient` with `ssr: false` because Leaflet needs `window`. Renders pins for all activities. |
| `LocationPicker.tsx` / `*Client.tsx` | Same SSR-safe pattern. Lets user tap the map to drop a pin; reverse-geocodes it via Nominatim. |
| `PostForm.tsx` | Full activity creation form. Validates with zod, debounced address search, location picker, blocking loader on submit. |
| `ActivityCard.tsx` | Compact card showing title, time, location, participant count, category emoji. |
| `ActivityList.tsx` | Renders `FiltersBar` + list of `ActivityCard`s. Supports pinning, deduping, empty states. |
| `JoinButton.tsx` | Client component. Calls `join_activity` Postgres RPC. Handles "full", "already_joined", "ok" states. |
| `JoinModal.tsx` | Asks for a display name before joining. Prefills from profile or Google metadata. |
| `RealtimeRefresh.tsx` | Subscribes to Supabase Realtime on `activities` + `participants`. Debounced `router.refresh()` keeps UI live. Falls back to 15s polling. |
| `DeleteActivityButton.tsx` | Opens `ConfirmDialog`, then calls `supabase.from("activities").delete()`. Only visible to host. |
| `NavBar.tsx` | Fixed top bar. Logo, "Happening now" live count, Post button (on map), `ProfileMenu`. |

### Lib / Utilities

| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` | Creates browser Supabase client using `@supabase/ssr`. Used in Client Components. |
| `lib/supabase/server.ts` | Creates server Supabase client using `cookies()`. Used in Server Components / Route Handlers. |
| `lib/supabase/middleware.ts` | `updateSession()` — refreshes auth session from cookie, redirects unauthenticated users away from `/map`, `/post`, `/activity/*`. |
| `lib/types.ts` | All TypeScript types: `Activity`, `Profile`, `Participant`, `ActivityWithCount`, `JoinResult`, category constants. |
| `lib/geocoding.ts` | `forwardGeocode(query)` → address suggestions. `reverseGeocode(lat, lng)` → place name. Uses Nominatim. |
| `proxy.ts` | Next.js 16 proxy file. Exports `proxy()` that calls `updateSession()`. Matcher skips static files. |

### Database (Supabase)

| Migration | What it sets up |
|-----------|-----------------|
| `0001_init.sql` | `profiles`, `activities`, `participants` tables. RLS policies. Triggers: auto-create profile on signup, auto-add host as participant. `join_activity()` RPC with atomic `for update` lock. Realtime publication. |
| `0002_participants_display_name_and_email.sql` | Adds `profiles.email`, `participants.display_name`. Updates `handle_new_user` trigger and `join_activity` RPC to accept optional display name. |

---

## Data Flow

1. **Auth:** Google OAuth → Supabase Auth → session cookie stored by browser.
2. **Session:** `proxy.ts` runs on every request → `updateSession()` refreshes the cookie → pages get the current user.
3. **Protected pages:** Server Components call `await createClient()` → `getUser()`. If null, `redirect("/login")`.
4. **Data fetching:** Server Components query Supabase directly (`await supabase.from(...)`). Results passed as props to Client Components.
5. **Mutations:** Client Components call `supabase.from(...)` or `supabase.rpc("join_activity", ...)`.
6. **Realtime:** `RealtimeRefresh` subscribes to Postgres changes → debounced `router.refresh()` re-runs Server Components.

---

## Key Conventions

- **Server Components** = default. No `"use client"`. Can `await` DB calls. Code never ships to browser.
- **Client Components** = marked `"use client"`. Used for interactivity: forms, maps, buttons, modals, hooks.
- **Leaflet** is always dynamic-imported with `ssr: false` because it accesses `window` on import.
- **All security** is enforced by Supabase RLS + the `security definer` `join_activity` function. The anon key is public by design.
- **Env vars:** Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required. No secrets in `.env.local`.
