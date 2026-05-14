# Changes Log

### College Email Verification + Onboarding Flow

**New files:**

- `supabase/migrations/0003_onboarding_profiles.sql` — Adds `phone`, `age`, `gender`, `college_email`, `college_email_verified`, `college_name`, `onboarding_complete` columns to `profiles`. Creates `college_email_verifications` table (OTP storage). Creates `avatars` storage bucket with RLS.
- `src/data/indian_college_pairs.json` — 930 Indian college name/domain pairs.
- `src/lib/college-domains.ts` — `isCollegeEmail()` and `getCollegeName()` lookups from the JSON.
- `src/lib/onboarding.ts` — `checkOnboarding()` helper. Checks `onboarding_complete` flag and detects linked college email accounts.
- `src/lib/email.ts` — `sendOtpEmail()` using Resend. Falls back to dev mode (shows OTP on screen) when `RESEND_API_KEY` is empty.
- `src/app/onboarding/page.tsx` — Onboarding page server component. Detects college vs non-college email, redirects already-onboarded users.
- `src/components/OnboardingFlow.tsx` — Multi-step client form: college email input → OTP verification → profile form (name, age, gender, phone, photo).
- `src/app/api/verify-college-email/route.ts` — `POST` generates + sends OTP, `PUT` verifies OTP and links college email to profile.
- `src/app/api/update-profile/route.ts` — `POST` saves profile data, sets `onboarding_complete = true`.
- `src/app/api/upload-avatar/route.ts` — `POST` uploads photo to Supabase `avatars` bucket.

**Modified files:**

- `src/app/auth/callback/route.ts` — After OAuth, checks if account needs onboarding. If user signed in with a college email already linked to another account, copies profile data automatically.
- `src/app/map/page.tsx` — Redirects to `/onboarding` if not onboarded. Detects linked college email accounts.
- `src/app/post/page.tsx` — Same onboarding guard.
- `src/app/activity/[id]/page.tsx` — Same onboarding guard.
- `src/app/spaces/page.tsx` — Same onboarding guard.
- `src/lib/supabase/middleware.ts` — Added `/spaces` to protected routes.
- `src/lib/types.ts` — `Profile` type now includes `phone`, `age`, `gender`, `college_email`, `college_email_verified`, `college_name`, `onboarding_complete`.
- `.env.local` — Added `RESEND_API_KEY`.

**Flow:**

1. **College email login** (e.g. `name@iitb.ac.in`) → straight to profile onboarding.
2. **Non-college email** (e.g. gmail.com) → asked for college email → OTP sent → verify → profile onboarding.
3. If someone initially onboarded with Gmail and linked their college email, then later logs in directly with that college email → system detects the link, copies profile data, skips onboarding entirely.

---

### Spaces Feature (Venue Discovery)

**New files:**

- `db/venues/schema.sql` — PostGIS schema: `categories`, `venues`, `venue_tags` tables.
- `db/venues/seed.ts` — Seeds venues from OpenStreetMap Overpass API.
- `db/venues/overpass.ts` — `fetchVenuesFromOverpass()`, `derivePopularityScore()`, `addressFromTags()`.
- `db/venues/pool.ts` / `db.ts` — Separate Postgres connection pool for venues DB.
- `src/lib/venues/types.ts` — `Venue`, `VenueWithDistance`, `VenueDetail`, `VenueTag`, category types.
- `src/lib/venues/client.ts` — Browser fetch helpers for `/api/venues/*`.
- `src/lib/venues/scoring.ts` — Popularity scoring (OSM quality + activity density + tag engagement).
- `src/app/spaces/page.tsx` — Spaces page (auth-protected).
- `src/components/spaces/` — `SpacesShell`, `SpacesMap`, `SpacesMapClient`, `SpaceCard`, `VenueSheet`, `SpacesFiltersBar`, `SpacesList`.
- `src/app/api/venues/nearby/route.ts` — `GET` venues near lat/lng.
- `src/app/api/venues/[id]/route.ts` — `GET` venue detail + nearby activities.
- `src/app/api/venues/[id]/tags/route.ts` — `POST` upvote a vibe tag.
- `src/app/api/venues/refresh-scores/route.ts` — `POST` recalculate popularity scores.
- `vercel.json` — Daily cron at 3 AM for score refresh.

**Modified files:**

- `package.json` — Added `pg`, `@types/pg`, `tsx`, `server-only`, `boring-avatars`, `canvas-confetti`, `@types/canvas-confetti`. Added `venues:seed` script.
- `.env.local` — Added `VENUES_DATABASE_URL`, `OVERPASS_API_URL`, `CRON_SECRET`.

---

### Activity → Spaces Link

**Modified files:**

- `src/components/spaces/VenueSheet.tsx` — Added "Start an event here" button linking to `/post?lat=...&lng=...&name=...&address=...`.
- `src/app/post/page.tsx` — Reads `lat`, `lng`, `name`, `address` from search params, passes as `venue` prop to `PostForm`.
- `src/components/PostForm.tsx` — Accepts optional `venue` prop. Pre-fills location name, pins the map, centers map on venue coordinates when coming from Spaces.

---

### Map Locate Button

**New files:**

- `src/components/LocateControl.tsx` — Leaflet control rendering a crosshair button below zoom controls. Uses `navigator.geolocation` to fly the map to the user's current position.

**Modified files:**

- `src/components/MapClient.tsx` — Added `<LocateControl />`.
- `src/components/spaces/SpacesMapClient.tsx` — Added `<LocateControl />`.

---

### Utility Scripts

- `scripts/wipe-users.ts` — Wipes all user data (auth.users, profiles, participants, activities, college_email_verifications). Run with `npx tsx scripts/wipe-users.ts`.
- `db/venues/apply-schema.ts` — Applies `0003_onboarding_profiles.sql` to Supabase.
- `db/venues/run-refresh.ts` — Manually refreshes venue popularity scores.