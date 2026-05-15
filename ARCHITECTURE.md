# Third Space — Project Overview

A location-based web app to discover and post real-life activities near you. Users sign in with Google, drop activities on a map, and join others with one tap. College email verification and onboarding required for all new users.

---

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui primitives
- **Auth + Database:** Supabase (Postgres + Auth + Realtime)
- **Venues DB:** Separate Postgres with PostGIS (hosted on same Supabase project)
- **Maps:** Leaflet + OpenStreetMap (no API key)
- **Geocoding:** OpenStreetMap Nominatim (free)
- **Email:** Resend (OTP delivery for college email verification)
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
    auth/callback/route.ts      # OAuth code exchange → session + onboarding check
    onboarding/page.tsx         # Multi-step onboarding (college email → profile)
    map/page.tsx                # Main app: map + activity list (auth + onboarding required)
    post/page.tsx               # Create activity form (auth + onboarding required)
    activity/[id]/page.tsx      # Activity detail + join + participant list
    spaces/page.tsx             # Venues discovery map (auth + onboarding required)
    globals.css                 # Tailwind + CSS variables
    favicon.ico                 # App icon
    api/
      verify-college-email/route.ts  # POST: generate+send OTP, PUT: verify OTP
      update-profile/route.ts        # POST: save profile data, mark onboarding complete
      upload-avatar/route.ts         # POST: upload photo to Supabase avatars bucket
      venues/
        nearby/route.ts               # GET: venues near lat/lng
        [id]/route.ts                  # GET: venue detail + nearby activities
        [id]/tags/route.ts            # POST: upvote a vibe tag
        refresh-scores/route.ts       # POST: recalculate popularity scores
  components/                   # React components (mix of Server & Client)
    ui/                         # shadcn/ui primitives (button, input, sonner, etc.)
    OnboardingFlow.tsx          # Multi-step onboarding form (college email → OTP → profile)
    Map.tsx                     # Leaflet map wrapper (dynamic import, SSR disabled)
    MapClient.tsx               # Actual Leaflet map + markers + LocateControl + RadiusZoom
    MapShell.tsx                # Client shell for /map: single-row filter bar (category dropdown + radius cycle + date picker) + center state + ActivityList
    LocateControl.tsx           # "Go to my location" button on maps (Leaflet control)
    LocationPicker.tsx          # Map for dropping a pin during posting
    LocationPickerClient.tsx    # Leaflet tap-to-pin + LocateControl + initial geolocation + center tracking
    PostForm.tsx                # Activity creation form (react-hook-form + zod), accepts venue prop
    ActivityCard.tsx            # Single activity row in the sidebar list
    ActivityList.tsx            # Sidebar list with filters + deduping
    FiltersBar.tsx              # Legacy date / location filter controls (replaced by MapShell inline bar)
    PinButton.tsx               # Pin up to 2 activities to top of list
    JoinButton.tsx              # Join activity button (calls join_activity RPC)
    JoinModal.tsx               # Modal asking for display name before joining
    DeleteActivityButton.tsx    # Host-only delete with confirm dialog
    ConfirmDialog.tsx           # Reusable destructive action confirm
    ParticipantsList.tsx        # Accordion of joined users (clickable → ProfileViewer)
    ProfileViewer.tsx           # Modal showing participant profile. Self = full data + leave button; others = masked phone/email
    ProfileMenu.tsx             # Avatar dropdown with sign out
    NavBar.tsx                  # Top bar with logo, live count, profile menu
    Logo.tsx                    # Brand mark
    SignInButton.tsx            # Starts Google OAuth flow
    ShareButton.tsx             # Share menu (WhatsApp / Reddit / X)
    SuccessModal.tsx            # Confetti modal after posting
    BlockingLoader.tsx           # Full-screen spinner during submit
    RealtimeRefresh.tsx          # WebSocket subscription + polling fallback
    spaces/
      SpacesShell.tsx           # Main spaces page shell (map + list + sheet + floating + button)
      SpacesMap.tsx             # Leaflet map wrapper for venues
      SpacesMapClient.tsx        # Venue map + markers + LocateControl
      SpaceCard.tsx              # Single venue card in list (shows star rating + count)
      SpacesList.tsx             # Venue list with sorting
      SpacesFiltersBar.tsx       # Category + radius filters
      VenueSheet.tsx             # Bottom sheet with venue details, star rating, rate button, vibe tags, "Start an event here" button
      AddVenueModal.tsx          # Modal to suggest a new space (name, category, tags, location picker)
    StarRating.tsx             # Reusable star rating display + interactive selector + RatingModal
  hooks/
    usePinnedActivities.ts      # localStorage hook for pinned activities
  lib/
    supabase/
      client.ts                 # Browser Supabase client
      server.ts                 # Server Component Supabase client
      middleware.ts             # Session refresh + route protection (+ /spaces)
    college-domains.ts          # isCollegeEmail() + getCollegeName() from JSON
    auth-identity.ts            # resolveProfile() / resolveProfileId() — finds canonical profile via linked_user_id fallback
    onboarding.ts               # checkOnboarding() — uses resolveProfile() for linked accounts
    email.ts                    # sendOtpEmail() via Resend (dev mode fallback)
    types.ts                    # TypeScript types (Activity, Profile, Venue, JoinResult, etc.)
    utils.ts                    # cn() helper for Tailwind class merging
    geocoding.ts                # OpenStreetMap Nominatim wrapper (forward/reverse, optional lat/lon bias)
    venues/
      types.ts                  # Venue, VenueDetail, VenueWithDistance, VenueTag types
      client.ts                 # Browser fetch helpers for /api/venues/*
      pool.ts                   # Venues DB connection pool
      db.ts                     # getVenuesPool() singleton
      overpass.ts               # OSM Overpass fetch + scoring + address helpers
      scoring.ts                # Popularity score calculation
  proxy.ts                      # Next.js proxy (replaces middleware.ts) — wires updateSession
  data/
    indian_college_pairs.json   # 930 Indian college name → domain pairs
public/                         # Static assets (SVGs)
supabase/migrations/
  0001_init.sql                 # DB schema, RLS policies, triggers, RPC, realtime
  0002_participants_display_name_and_email.sql  # Adds email + display_name columns
  0003_onboarding_profiles.sql  # Adds onboarding columns, OTP table, avatars bucket
  0004_link_accounts.sql        # ON UPDATE CASCADE on profile FKs + unique verified college_email index + trigger merge for seamless login (superseded by 0005)
  0005_bidirectional_linking.sql # linked_user_id column + resolve_canonical_id() function + normalised triggers + updated RLS for bidirectional account linking
  0006_venue_ratings.sql         # venue_ratings table, avg_rating/rating_count columns, auto-recalc trigger, backfill
  0007_venue_submissions.sql     # venue_submissions table + approve_venue_submission() function for admin approval workflow
db/venues/
  schema.sql                    # PostGIS schema: categories, venues, venue_tags
  seed.ts                       # Seeds OSM venues for a city
scripts/
  wipe-users.ts                 # Wipes all user data for testing onboarding flow
vercel.json                     # Daily cron for venue score refresh

```

---

## What Each File Does

### App Router Pages

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root HTML shell. Loads Plus Jakarta Sans font, sets metadata/OG tags, renders Toaster. |
| `app/page.tsx` | Landing page with animated CTA. Redirects signed-in users to `/map`. |
| `app/login/page.tsx` | Login screen. Passes `?next=` redirect to `SignInButton`. |
| `app/auth/callback/route.ts` | OAuth callback. Exchanges code for session, checks `onboarding_complete`, detects linked college email accounts, redirects accordingly. |
| `app/onboarding/page.tsx` | Multi-step onboarding. If college email → profile form. If Gmail etc → college email verification → OTP → profile form. |
| `app/map/page.tsx` | Main dashboard. Fetches activities from last 6 hours, renders Map + ActivityList. Redirects to `/onboarding` if not onboarded. |
| `app/post/page.tsx` | Activity creation form. Reads venue query params from Spaces to pre-fill location. Onboarding guard. |
| `app/activity/[id]/page.tsx` | Activity detail + join + participant list. Onboarding guard. |
| `app/spaces/page.tsx` | Venue discovery map. Onboarding guard. Floating + button to suggest new spaces. |
| `app/admin/page.tsx` | Admin page to review pending venue submissions. Approve / Reject actions. No auth gate (prototype). |

### API Routes

| File | Purpose |
|------|---------|
| `api/verify-college-email/route.ts` | `POST` validates college domain, generates OTP, stores it, sends it via Resend. `PUT` verifies OTP and links college email to profile. |
| `api/update-profile/route.ts` | `POST` saves name, age, gender, phone, avatar. Sets `onboarding_complete = true`. |
| `api/upload-avatar/route.ts` | `POST` uploads photo to Supabase `avatars` bucket, returns public URL. |
| `api/venues/nearby/route.ts` | `GET` returns venues near a lat/lng with optional filters. |
| `api/venues/[id]/route.ts` | `GET` returns venue detail + nearby activities. |
| `api/venues/[id]/tags/route.ts` | `POST` upvotes a vibe tag on a venue. |
| `api/venues/[id]/rate/route.ts` | `POST` submits or updates a 1–5 star rating for a venue. Auto-recalculates avg_rating via DB trigger. |
| `api/venues/submit/route.ts` | `POST` creates a pending venue submission (name, category, tags, lat/lng). Reverse-geocodes address automatically. |
| `api/venues/submissions/route.ts` | `GET` returns all pending submissions with submitter info. |
| `api/venues/submissions/[id]/approve/route.ts` | `POST` calls `approve_venue_submission()` DB function → inserts into venues, marks approved. |
| `api/venues/submissions/[id]/reject/route.ts` | `POST` marks submission as rejected. |
| `api/venues/refresh-scores/route.ts` | `POST` recalculates popularity scores for all venues. |

### Components

| File | Purpose |
|------|---------|
| `OnboardingFlow.tsx` | Three-step form: college email input → OTP verification → profile (name, age, gender, phone, photo). |
| `Map.tsx` / `MapClient.tsx` | Leaflet map with activity pins. Dynamic-imported, SSR-disabled. Includes `LocateControl`. |
| `MapShell.tsx` | Client shell for /map: single-row filter bar (category dropdown + radius cycle + date picker) + center state + ActivityList. |
| `LocateControl.tsx` | Leaflet control: crosshair button that flies the map to the user's GPS location. |
| `LocationPicker.tsx` / `LocationPickerClient.tsx` | Tap-to-pin map for posting. Auto-geolocates on mount + tracks center for geocoding bias. |
| `PostForm.tsx` | Activity creation form. Accepts optional `venue` prop to pre-fill location from Spaces. |
| `VenueSheet.tsx` | Bottom sheet: venue details, star rating, rate button, real vibe tags (no defaults), "Start an event here". |
| `StarRating.tsx` | Reusable star rating display + interactive 5-star selector + `RatingModal` popup. |
| `AddVenueModal.tsx` | Suggest a new space: name, category, tags, location picker. Submits to admin review. |
| `ProfileViewer.tsx` | Participant profile modal. Self = full data + leave button; others = masked phone/email. |
| `ParticipantsList.tsx` | Accordion of joined users with age/gender badges. Clickable → ProfileViewer. |
| `BottomNav.tsx` | Mobile bottom nav (Activities / Spaces tabs). Hidden on login/onboarding/landing. |

### Lib / Utilities

| File | Purpose |
|------|---------|
| `lib/college-domains.ts` | `isCollegeEmail(email)` checks against 930 Indian college domains. `getCollegeName(email)` returns the college name. |
| `lib/auth-identity.ts` | `resolveProfile()` / `resolveProfileId()` — finds canonical profile via `linked_user_id` fallback for bidirectional account linking. |
| `lib/onboarding.ts` | `checkOnboarding(supabase, userId, email?)` checks `onboarding_complete` flag. Uses `resolveProfile()` for linked accounts. |
| `lib/email.ts` | `sendOtpEmail(to, otp)` sends a styled OTP email via Resend. Falls back to dev mode (returns `dev: true`) when `RESEND_API_KEY` is empty. |
| `lib/types.ts` | `Profile` type includes `phone`, `age`, `gender`, `college_email`, `college_email_verified`, `college_name`, `onboarding_complete`. |
| `lib/geocoding.ts` | OpenStreetMap Nominatim wrapper (forward/reverse, optional lat/lon bias for prioritising nearby results). |
| `lib/venues/scoring.ts` | Popularity score: weighted blend of OSM quality (25%), activity density (35%), tag engagement (25%), user rating (15%). |

### Database (Supabase)

| Migration | What it sets up |
|-----------|-----------------|
| `0001_init.sql` | `profiles`, `activities`, `participants` tables. RLS policies. Triggers: auto-create profile on signup, auto-add host as participant. `join_activity()` RPC with atomic `for update` lock. Realtime publication. |
| `0002_participants_display_name_and_email.sql` | Adds `profiles.email`, `participants.display_name`. Updates `handle_new_user` trigger and `join_activity` RPC to accept optional display name. |
| `0003_onboarding_profiles.sql` | Adds `phone`, `age`, `gender`, `college_email`, `college_email_verified`, `college_name`, `onboarding_complete` to `profiles`. Creates `college_email_verifications` table with RLS. Creates `avatars` storage bucket with public read + authenticated upload policies. |
| `0005_bidirectional_linking.sql` | `linked_user_id` column + `resolve_canonical_id()` function. Normalised triggers: `normalize_activity_host`, updated `join_activity` RPC, updated RLS policies. Both Gmail and college email point to same profile. |
| `0006_venue_ratings.sql` | `venue_ratings` table, `avg_rating`/`rating_count` columns on `venues`, auto-recalc trigger, backfill. |
| `0007_venue_submissions.sql` | `venue_submissions` table + `approve_venue_submission()` function. Admin approval workflow for user-suggested spaces. |

### Venues Database (PostGIS)

| File | What it sets up |
|------|-----------------|
| `db/venues/schema.sql` | `categories`, `venues` (with PostGIS geography column), `venue_tags` tables. `avg_rating`/`rating_count` on venues. Spatial index on venue locations. |
| `db/venues/seed.ts` | Fetches venues from OpenStreetMap Overpass API and inserts them. Run with `npm run venues:seed -- --city Bengaluru`. |

---

## Data Flow

1. **Auth:** Google OAuth → Supabase Auth → session cookie stored by browser.
2. **Session:** `proxy.ts` runs on every request → `updateSession()` refreshes the cookie → pages get the current user.
3. **Onboarding check:** After OAuth, `auth/callback` checks `onboarding_complete`. If false → `/onboarding`. If user signed in with a college email already linked to another profile, links the accounts via `linked_user_id`.
4. **Protected pages:** Server Components call `checkOnboarding(supabase, userId, email)`. If not onboarded → redirect to `/onboarding`.
5. **College email verification:** Non-college Google login → user enters college email → OTP sent via Resend → user enters OTP → college email linked to profile.
6. **Bidirectional linking:** Logging in with either Gmail or the linked college email resolves to the same canonical profile via `resolve_canonical_id()`.
7. **Data fetching:** Server Components query Supabase directly. Results passed as props to Client Components.
8. **Mutations:** Client Components call `supabase.from(...)` or `supabase.rpc("join_activity", ...)`.
9. **Realtime:** `RealtimeRefresh` subscribes to Postgres changes → debounced `router.refresh()` re-runs Server Components.
10. **Venue scoring:** Vercel cron hits `/api/venues/refresh-scores` daily → recalculates popularity based on OSM quality + activity density + tag engagement + user ratings.
11. **Venue ratings:** Users click Rate → `POST /api/venues/[id]/rate` upserts `venue_ratings` → DB trigger recalculates `avg_rating`.
12. **Venue submissions:** User clicks + on Spaces → fills `AddVenueModal` → `POST /api/venues/submit` → admin reviews at `/admin` → approve inserts into `venues` + copies tags.

---

## Key Conventions

- **Server Components** = default. No `"use client"`. Can `await` DB calls. Code never ships to browser.
- **Client Components** = marked `"use client"`. Used for interactivity: forms, maps, buttons, modals, hooks.
- **Leaflet** is always dynamic-imported with `ssr: false` because it accesses `window` on import.
- **All security** is enforced by Supabase RLS + the `security definer` `join_activity` function. The anon key is public by design.
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VENUES_DATABASE_URL` (PostGIS), `OVERPASS_API_URL`, `RESEND_API_KEY`, `CRON_SECRET`. Only the two `NEXT_PUBLIC_*` vars are strictly required without the Spaces feature.
- **OTP email:** When `RESEND_API_KEY` is empty, OTPs are shown on screen (dev mode). Set the key to send real emails. Free tier only sends to your own email until you verify a custom domain.