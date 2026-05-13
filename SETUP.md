# Third Space — Full Setup Guide

> A from-scratch walkthrough for setting up Third Space locally, wiring it
> up to Supabase + Google OAuth, and deploying it to Vercel.
>
> Audience: a junior developer who has never used Next.js / Supabase /
> Vercel before. Every step explains *what* you click, *where* the values
> come from, and what to do when something errors out.

---

## Table of contents

1. [What you're building (high level)](#1-what-youre-building-high-level)
2. [Prerequisites](#2-prerequisites)
3. [Clone the repo and install dependencies](#3-clone-the-repo-and-install-dependencies)
4. [Supabase setup](#4-supabase-setup)
   - 4.1 [Create the Supabase project](#41-create-the-supabase-project)
   - 4.2 [Find the Project URL and anon key](#42-find-the-project-url-and-anon-key)
   - 4.3 [Apply the database schema](#43-apply-the-database-schema)
   - 4.4 [Confirm Realtime is enabled](#44-confirm-realtime-is-enabled)
5. [Google OAuth setup](#5-google-oauth-setup)
   - 5.1 [Create a Google Cloud project](#51-create-a-google-cloud-project)
   - 5.2 [Configure the OAuth consent screen](#52-configure-the-oauth-consent-screen)
   - 5.3 [Create the OAuth Client ID + Secret](#53-create-the-oauth-client-id--secret)
   - 5.4 [Wire the credentials into Supabase](#54-wire-the-credentials-into-supabase)
   - 5.5 [Configure Site URL and Redirect URLs](#55-configure-site-url-and-redirect-urls)
6. [Environment variables](#6-environment-variables)
7. [Run it locally and smoke-test](#7-run-it-locally-and-smoke-test)
8. [Project structure cheatsheet](#8-project-structure-cheatsheet)
9. [Deploy to Vercel](#9-deploy-to-vercel)
   - 9.1 [Push to GitHub](#91-push-to-github)
   - 9.2 [Import the repo on Vercel](#92-import-the-repo-on-vercel)
   - 9.3 [Add environment variables on Vercel](#93-add-environment-variables-on-vercel)
   - 9.4 [Update Supabase and Google with the production URL](#94-update-supabase-and-google-with-the-production-url)
   - 9.5 [(Optional) Tune Vercel function region](#95-optional-tune-vercel-function-region)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. What you're building (high level)

A small location-based "find people doing things near you" web app.

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn-style components
- **Auth**: Supabase Auth with Google as the only identity provider
- **Database**: Supabase Postgres (`profiles`, `activities`, `participants` tables)
- **Realtime**: Supabase Realtime push (over WebSocket) for live participant counts and new-activity pop-ins, with a 15-30s polling safety net
- **Maps**: Leaflet + OpenStreetMap tiles (no API key needed)
- **Geocoding**: OpenStreetMap Nominatim (free, no API key)
- **Hosting**: Vercel (free hobby tier is plenty for V1)

Three external services to set up in this order:

1. **Supabase** — gives you the DB + Auth backend.
2. **Google Cloud Console** — gives you the OAuth Client ID + Secret that you paste into Supabase.
3. **Vercel** — hosts the Next.js app and connects to your GitHub repo.

You'll bounce between Supabase and Google Cloud one time to wire OAuth — the dependency goes: *Supabase gives you a callback URL → you give it to Google → Google gives you Client ID + Secret → you give them back to Supabase*.

---

## 2. Prerequisites

Before you start, make sure you have:

- **Node.js 20+** installed. Check with `node --version`. If you don't, install via [nvm](https://github.com/nvm-sh/nvm).
- **npm** (ships with Node) or `pnpm` / `yarn` if you prefer — examples below use `npm`.
- **Git** installed. Check with `git --version`.
- A **GitHub account** (for deployment).
- A **Google account** (for OAuth + Google Cloud Console).
- A **Supabase account** (free tier — sign up at <https://supabase.com>).
- A **Vercel account** (free tier — sign up at <https://vercel.com>, ideally with the same GitHub login).

A code editor that handles TypeScript well (VS Code or Cursor).

---

## 3. Clone the repo and install dependencies

```bash
git clone https://github.com/Sarvesh0007/third-space.git
cd third-space
npm install
```

### Gotcha: `npm install` fails with `EACCES: permission denied`

This usually means your global npm cache directory (`~/.npm`) has files owned by `root` from an earlier `sudo npm` you don't remember running. Two safe ways out:

**Option A — point npm at a fresh, writable cache (recommended, no `sudo`):**

```bash
npm install --cache /tmp/npm-cache-thirdspace
```

This tells npm to use a temporary cache that's owned by your user. Every subsequent `npm install` should work normally afterwards.

**Option B — fix the global cache permissions (one-time):**

```bash
sudo chown -R $(whoami) ~/.npm
```

Don't `sudo npm install` — it will keep biting you. The two options above are clean fixes.

### Gotcha: `npm warn TAR_ENTRY_ERROR EPERM`

Harmless. It's a few macOS metadata files inside one of the published tarballs that npm can't write. Installation still succeeds — ignore the warning.

---

## 4. Supabase setup

### 4.1 Create the Supabase project

1. Sign in at <https://supabase.com>.
2. Click **New project** (top right).
3. Pick an **organisation** (your free personal org is fine).
4. Fill in:
   - **Project name**: `third-space` (or whatever you want — this is just a label)
   - **Database password**: click **Generate a password** and **save it somewhere safe** (1Password / Bitwarden). You won't need it for V1, but you'd need it later for direct DB access.
   - **Region**: pick the one closest to your users. If your users are in India, **`Mumbai (ap-south-1)`** is the best choice. If they're in the US, `us-east-1`. Region affects every page load latency — **picking the right region here can be the difference between 200ms and 1.5s per request**.
   - **Pricing plan**: Free.
5. Click **Create new project**. Provisioning takes ~2 minutes; let it finish (you'll see "Setting up project…").

### 4.2 Find the Project URL and anon key

Your project gives you two pieces of information you need to plug into the app: a **Project URL** (where your database lives) and an **anon public API key** (the key the browser uses to talk to your database, gated by Row-Level Security).

There are two ways to get to them. **Path A** is what you'll do every time after the first setup; **Path B** is the shortcut the dashboard gives you the first time the project is provisioned.

#### Path A — the "Project Settings → API" page (always works)

This is the canonical location and the one you should remember.

1. Make sure your project is selected. The current project name shows at the top of the left sidebar, next to the Supabase logo. If you see "Select a project", click the dropdown and pick your project.
2. In the **left sidebar**, scroll down to the bottom and click the **⚙️ gear icon** labelled **Project Settings**.
   - On smaller screens it may appear as just the gear with no label — it's always the last item.
3. A second, narrower sidebar opens up on the left with a list of settings categories (**General**, **Database**, **API**, **Auth**, **Storage**, **Edge Functions**, **Add-ons**, **Billing**, etc.).
4. Click **API** in that inner sidebar.
5. You'll land on a page titled **API Settings** (sometimes "Project API"). It's split into a few sections, from top to bottom:

   1. **Project URL** — A single read-only text field. The value looks like:

      ```
      https://abcdefghijklmnop.supabase.co
      ```

      The `abcdefghijklmnop` part is your project's unique reference (also called the "project ref"). Click the small **copy icon** on the right of the field to copy the full URL. This goes into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`.

   2. **Project API Keys** — A table or section with one or more keys. You'll see at least two rows:

      | Key name shown in dashboard | What it looks like | What to do with it |
      |---|---|---|
      | **`anon` / `public`** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (about 200 characters, three dot-separated chunks) | **Click the eye icon to reveal**, then click the copy icon. This goes into `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
      | **`service_role` / `secret`** | Looks similar but a *different* string | **Do not use this.** It bypasses Row-Level Security entirely. Never paste it into a `NEXT_PUBLIC_*` variable or commit it anywhere. We don't need it for V1. |

   3. **JWT Settings** — leave the defaults alone for V1.

6. If you ever see the dashboard call this page "API Keys" or "Data API" instead of "API" — same place, Supabase has renamed it a few times. Look for the section called **Project URL** and the table called **Project API Keys** and you're in the right spot.

#### Path B — the homepage shortcut (only available right after creation)

When you first land on your brand-new project's home, Supabase shows you a **"Connecting to your new project"** card in the middle of the page with the Project URL and anon key already visible and copy-able. You can grab the two values from there directly. After you navigate away once, this card disappears and you have to use Path A.

#### What "the anon key" actually is, and why it's safe to ship to the browser

The anon key is a JWT (JSON Web Token) signed with your project's secret. It tells Supabase "this request is coming from an *unauthenticated* visitor; apply the public Row-Level Security policies." Every request your browser code makes uses this key. Anyone visiting your site can read it from the network tab.

The reason that's fine is **Row-Level Security**. Our `0001_init.sql` migration sets up policies like:

```sql
create policy "activities read all"
  on public.activities for select
  to authenticated
  using (true);
```

That means: even *with* the anon key, a request can only read what the policy lets it read. The anon key alone doesn't grant any data access — it just identifies the request as anonymous, and the policies do the gating.

The `service_role` key is the opposite — it bypasses every policy. That's why it must only ever be used in trusted server contexts (and we don't use it at all in this V1).

#### Quick copy-paste check

Once you've copied both values, they should look roughly like this (these are fake — yours will be different):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://dfoxofpmsekaqbcusvff.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb3hvZnBtc2VrYXFiY3VzdmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAwMDAwMDAsImV4cCI6MjA0NTU3NjAwMH0.fake_signature_here
```

If your URL doesn't end in `.supabase.co` or your key doesn't start with `eyJ`, you've grabbed the wrong value — go back and try again.

Hold onto these two values; you'll paste them into your local `.env.local` in [section 6](#6-environment-variables).

### 4.3 Apply the database schema

The repo has one SQL migration that creates all the tables, RLS policies, triggers, and the atomic-join RPC. You just run it once.

1. In the Supabase dashboard, click **SQL editor** in the left sidebar.
2. Click **+ New query** (top right of the editor pane).
3. Open the file `supabase/migrations/0001_init.sql` from this repo in your code editor.
4. **Select all** (`Cmd/Ctrl+A`), **Copy** (`Cmd/Ctrl+C`).
5. **Paste** into the Supabase SQL editor.
6. Click **Run** (bottom right, or `Cmd/Ctrl+Enter`).
7. You should see "Success. No rows returned" with a small green checkmark.

Verify it worked:

1. Click **Table Editor** in the left sidebar.
2. You should see three tables under the `public` schema:
   - `profiles`
   - `activities`
   - `participants`

The migration is idempotent (it uses `create table if not exists`, `drop policy if exists`, etc.), so you can re-run it safely.

> 💡 **Note for sharing**: The file `supabase/migrations/0001_init.sql` is safe to share with anyone — it contains only schema, RLS policies, and stored procedures. No secrets, no data. Hand it to teammates so they can spin up their own dev Supabase project the same way.

### 4.4 Confirm Realtime is enabled

The migration also adds `activities` and `participants` to the `supabase_realtime` publication (lines 215-236 of the SQL). To confirm:

1. In the dashboard, click **Database** in the left sidebar → **Publications**.
2. You should see `supabase_realtime` with the **`activities`** and **`participants`** tables enabled.

If not (e.g. the migration was edited or partially run), tick both checkboxes manually.

---

## 5. Google OAuth setup

This is the most fiddly part because you have to ping-pong between Google Cloud Console and Supabase. The flow is:

```
[Supabase]  Auth → Providers → Google     →  copy the Callback URL
[Google]    APIs → Credentials → OAuth ID  →  paste the URL, get Client ID + Secret
[Supabase]  paste Client ID + Secret, save
```

### 5.1 Create a Google Cloud project

1. Go to <https://console.cloud.google.com>.
2. Top of the page, click the **project switcher** (next to the Google Cloud logo) → **New Project**.
3. Fill in:
   - **Project name**: `third-space` (just a label)
   - **Organisation**: usually "No organisation" for personal accounts.
4. Click **Create**. Wait ~10 seconds.
5. Make sure the new project is **selected** in the project switcher (the name should appear next to the logo).

### 5.2 Configure the OAuth consent screen

You can't create OAuth credentials until you've set up the consent screen — this is the screen users see when they click "Sign in with Google" ("Third Space wants access to your name, email…").

1. Left sidebar → **APIs & Services** → **OAuth consent screen**.
2. **User Type**: pick **External**, click **Create**.
3. Fill in the **App information**:
   - **App name**: `Third Space`
   - **User support email**: your email
   - **App logo**: optional, skip for V1
4. Scroll down to **Developer contact information**:
   - **Email addresses**: your email
5. Click **Save and continue**.
6. **Scopes** screen: don't add any scopes manually. Click **Save and continue**.
7. **Test users** screen: while the app is in "Testing" mode (which is fine for V1), only listed test users can sign in. Add your own Gmail address here. Click **Save and continue**.
8. **Summary** → **Back to dashboard**.

> 💡 **Why "Testing" mode is fine**: V1 has up to 100 test users with no Google review needed. When you're ready for the public, click **Publish app** on the consent screen page. That triggers Google's verification flow, which can take a few weeks — only do it when you actually need to.

### 5.3 Create the OAuth Client ID + Secret

1. Left sidebar → **APIs & Services** → **Credentials**.
2. Click **+ Create Credentials** (top) → **OAuth client ID**.
3. **Application type**: **Web application**.
4. **Name**: `Third Space Web` (just a label, users won't see it).
5. **Authorized JavaScript origins**: skip — Supabase handles the OAuth flow on its domain.
6. **Authorized redirect URIs**: this is the **one piece you need from Supabase first**. Open a new tab, go to your Supabase dashboard:
   - **Authentication** → **Providers** → **Google**.
   - Toggle **Enable Google** on (don't fill in Client ID / Secret yet).
   - You'll see a field labelled **Callback URL (for OAuth)** with a value like:
     ```
     https://abcdefghijk.supabase.co/auth/v1/callback
     ```
     (where `abcdefghijk` is your project's unique reference). Copy this exact URL.
7. Back in Google Cloud Console, paste that URL under **Authorized redirect URIs** → click **+ Add URI** if needed.
8. Click **Create**.

A modal pops up with two values:

| What Google shows you | Format | What it's for |
|---|---|---|
| **Client ID** | `1234567890-abc123def456.apps.googleusercontent.com` | Public identifier, goes into Supabase |
| **Client secret** | `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx` | Secret, also goes into Supabase. Treat like a password. |

> ⚠️ **DO NOT** paste your Google **project name** here by accident. The Client ID always ends in `.apps.googleusercontent.com`, the secret always starts with `GOCSPX-`. If you see Supabase warn `Client IDs should not contain spaces`, you've copied the wrong value — go back to **Credentials → OAuth 2.0 Client IDs → your client** to copy the right one.

Click **Download JSON** if you want a backup, then **OK**.

### 5.4 Wire the credentials into Supabase

Back in your Supabase tab, **Authentication → Providers → Google**:

1. **Client ID**: paste the `…apps.googleusercontent.com` value.
2. **Client Secret**: paste the `GOCSPX-…` value.
3. Click **Save** at the bottom of the panel.

You should now see Google listed as an **Enabled** provider.

### 5.5 Configure Site URL and Redirect URLs

This is the step most people skip and then wonder why the callback fails.

1. Still in Supabase, **Authentication** → **URL Configuration**.
2. **Site URL**: set to `http://localhost:3000` for local development.
3. **Redirect URLs**: this is an allow-list. Add **all** the URLs that your app will redirect back to after OAuth:
   - `http://localhost:3000/auth/callback` (for local dev)
   - Add your Vercel domain later, once you've deployed (e.g. `https://third-space.vercel.app/auth/callback`).
4. Click **Save**.

> ⚠️ **Note**: during the OAuth flow, the user is briefly bounced through `<your-project>.supabase.co/auth/v1/callback` — that's expected and is **not** what goes into the Redirect URLs field above. The Redirect URLs field is for **your app's** callback (`/auth/callback`), not Supabase's.

---

## 6. Environment variables

1. Copy the example file:

   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` in your editor and fill in the two values from step 4.2:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. Save. Don't commit `.env.local` to git — it's already in `.gitignore`.

> 💡 The `NEXT_PUBLIC_` prefix is important: it tells Next.js this variable is safe to bundle into client-side code. The anon key is designed to be public; the `service_role` key is **not** — never give a key `NEXT_PUBLIC_` if it shouldn't ship to the browser.

---

## 7. Run it locally and smoke-test

```bash
npm run dev
```

Open <http://localhost:3000> in your browser. You should see the landing page with the "Third Space" logo and a gradient headline.

Smoke test:

1. Click **Get started — it's free**.
2. You land on `/login`. Click **Continue with Google**.
3. Google shows you the consent screen (might also show "Google hasn't verified this app — Advanced → Go to Third Space (unsafe)" while you're in Testing mode; that's expected, click through).
4. Pick your Google account → **Allow**.
5. You bounce through `https://<project>.supabase.co/auth/v1/callback?code=…` → `http://localhost:3000/auth/callback?code=…` → `/map`.
6. You should see the map centered on Bangalore (default), the NavBar with your name + avatar, and an empty "Happening now" panel.
7. Click **Post**, fill in a test activity (title, drop a pin, set a time in the next hour), click **Post activity**.
8. You should see the success modal with confetti, then the activity detail page.
9. Navigate back to `/map` — your activity should be on the map as a pin and in the list.

If any of those steps break, jump to the [Troubleshooting](#10-troubleshooting) section.

---

## 8. Project structure cheatsheet

```
src/
  app/
    layout.tsx                      # root layout, font, metadata, Toaster
    page.tsx                        # homepage (CTA changes based on auth)
    opengraph-image.tsx             # dynamic OG image for social shares
    login/page.tsx                  # "Continue with Google"
    auth/callback/route.ts          # OAuth code-exchange handler
    map/page.tsx                    # main app: map + activity list (auth-required)
    post/page.tsx                   # create-activity form (auth-required)
    activity/[id]/page.tsx          # activity detail + Join + (host-only) Delete
  components/
    NavBar.tsx                      # top bar with logo, "happening now", profile menu
    Logo.tsx                        # the brand mark
    Map.tsx / MapClient.tsx         # Leaflet map (dynamic-imported, no-SSR)
    LocationPicker.tsx / *Client.tsx# tap-to-drop-pin map for the post form
    PostForm.tsx                    # react-hook-form + zod + 2-way geocoding
    ActivityCard.tsx                # the rows in "happening now"
    ActivityList.tsx                # filters + pinning + dedupe
    FiltersBar.tsx                  # today / date / location filters
    PinButton.tsx                   # pin up to 2 activities to the top
    ShareButton.tsx                 # portal'd menu: WhatsApp / Reddit / X
    JoinButton.tsx                  # calls join_activity Postgres RPC
    DeleteActivityButton.tsx        # host-only, opens ConfirmDialog
    ProfileMenu.tsx                 # avatar + sign out
    SuccessModal.tsx                # confetti modal after posting
    ConfirmDialog.tsx               # reusable destructive-action confirm
    BlockingLoader.tsx              # full-screen spinner during submit + redirect
    RealtimeRefresh.tsx             # push (WS) + 15s polling fallback
    SignInButton.tsx                # Google OAuth start
    ui/                             # shadcn-style primitives
  hooks/
    usePinnedActivities.ts          # localStorage + useSyncExternalStore
  lib/
    supabase/{client,server,middleware}.ts
    geocoding.ts                    # OpenStreetMap Nominatim wrapper
    types.ts                        # Activity, ActivityCategory, JoinResult
    utils.ts                        # cn() helper
  proxy.ts                          # Next.js 16 middleware (was middleware.ts)
supabase/migrations/0001_init.sql   # full schema, RLS, triggers, RPC, realtime publication
```

Server vs Client component cheatsheet:

- Files marked `"use client"` at the top run on both the server (for initial HTML) and the browser (for interactivity).
- Files without that directive (most `app/*/page.tsx`) are **Server Components** — they can do `await supabase.from(...)` and never ship that code to the browser.

---

## 9. Deploy to Vercel

### 9.1 Push to GitHub

If you cloned this repo and have push access, skip this step. Otherwise, create your own copy:

```bash
# from inside the project directory
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/<your-username>/third-space.git
git push -u origin main
```

> 💡 **Pushing to a different GitHub account than the one you use elsewhere?** The simplest path is to use the [GitHub CLI](https://cli.github.com): `brew install gh` → `gh auth login` → pick the account → it will set up the credential helper automatically. After that `git push` "just works" without interactive password prompts.

### 9.2 Import the repo on Vercel

1. Go to <https://vercel.com/new>.
2. **Continue with GitHub** if you haven't already linked your account.
3. Find your `third-space` repo in the list → click **Import**.
4. Vercel auto-detects Next.js. Don't change any build settings.
5. **Don't deploy yet** — first add the env vars (next step). If you accidentally hit deploy without env vars, the build will succeed but the runtime app won't be able to talk to Supabase.

### 9.3 Add environment variables on Vercel

In the import screen (or under **Project Settings → Environment Variables** after the first deploy):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | The same value as in your local `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same |
| `NEXT_PUBLIC_SITE_URL` *(optional)* | Once you know your final Vercel domain, set this to e.g. `https://third-space.vercel.app`. Used by the metadata helper to emit absolute URLs for OG images. |

For each one, leave the environment toggles (Production / Preview / Development) all checked unless you have a reason to scope them.

Click **Deploy**. The first build takes ~2-3 minutes.

When it's done, you'll get a domain like `https://third-space-abc123.vercel.app`. Click **Visit** to confirm the home page loads.

### 9.4 Update Supabase and Google with the production URL

The OAuth flow will fail until you tell Supabase and Google about the new domain.

**In Supabase** → **Authentication** → **URL Configuration**:

1. **Site URL**: change to your Vercel domain, e.g. `https://third-space.vercel.app`.
2. **Redirect URLs**: keep the localhost one *and* add the production one:
   - `http://localhost:3000/auth/callback`
   - `https://third-space.vercel.app/auth/callback`

Click **Save**.

**In Google Cloud Console** → **APIs & Services** → **Credentials** → your OAuth Client ID:

The Supabase callback URL is the same one as before (`https://<project>.supabase.co/auth/v1/callback`) — that doesn't change between local and production. So **you don't need to update the Google config** for the basic flow.

**If you ever add a custom domain** later (e.g. `https://thirdspace.app`):

1. Add it to Vercel (Settings → Domains).
2. Add `https://thirdspace.app/auth/callback` to Supabase's Redirect URLs.
3. Change Supabase's Site URL to the custom domain.
4. Update `NEXT_PUBLIC_SITE_URL` on Vercel to the custom domain.

### 9.5 (Optional) Tune Vercel function region

Every request to a Next.js server route (which is most of this app) runs on a Vercel serverless function. By default Vercel picks `Washington D.C. (iad1)`. If your Supabase project is in Mumbai (`ap-south-1`), having functions in DC means every DB query crosses 12,000km — adds ~250ms to every page load.

To fix:

1. Vercel dashboard → your project → **Settings** → **Functions**.
2. **Function Region** → pick the region closest to your Supabase project. For Mumbai Supabase, that's `Mumbai (bom1)`.
3. Save. Next deploy will use the new region.

Combined with the realtime/polling setup, this gives sub-100ms server response times on most pages instead of 500-1500ms.

---

## 10. Troubleshooting

### `npm install` fails with `EACCES`

See [section 3](#gotcha-npm-install-fails-with-eacces-permission-denied).

### `npm run dev` hangs / crashes with `uv_interface_addresses`

If you're running the dev server inside a sandboxed environment (e.g. inside the Cursor agent's shell), the sandbox can block `os.networkInterfaces()` and Next.js will crash on startup. Run `npm run dev` in your **own terminal app** (Terminal.app / iTerm / your IDE's terminal) instead.

### Clicking **Continue with Google** shows `Unsupported provider: provider is not enabled`

You forgot to toggle Google on in Supabase, or didn't paste the Client ID / Secret. Go to **Supabase → Authentication → Providers → Google** and confirm:

- Toggle is **On**.
- Client ID field has a value ending in `.apps.googleusercontent.com`.
- Client Secret field has a value starting with `GOCSPX-`.
- You clicked **Save**.

### Supabase shows `Client IDs should not contain spaces`

You pasted the wrong value. Most likely you copied the **project name** from Google Cloud (e.g. "Third Space Web") instead of the Client ID. Go back to **Google Cloud → APIs & Services → Credentials → OAuth 2.0 Client IDs → click your client** to find the real values.

### After Google sign-in I see "Google hasn't verified this app"

Expected while your OAuth consent screen is in Testing mode. Click **Advanced → Go to Third Space (unsafe)**. This warning goes away once you submit the app for Google's verification, which is only required to lift the 100-test-user cap.

### After sign-in I'm redirected to localhost when on production (or vice versa)

You probably:

- Forgot to add the production URL to **Supabase → Authentication → URL Configuration → Redirect URLs**, **or**
- Forgot to change **Site URL** to the production URL.

Both are described in [section 9.4](#94-update-supabase-and-google-with-the-production-url).

### The map / cards don't update when others post

The push (WebSocket) channel may have dropped. The 15s polling fallback should catch it — wait up to 15s, or switch tabs and back (we explicitly refresh on visibility change).

If updates *never* arrive (even after 30s), check the **Database → Publications** page in Supabase: `supabase_realtime` must include `activities` and `participants`. If it doesn't, re-run the migration (it's idempotent).

### Activity created twice on a single click

We have three layers of protection against this now:
- A synchronous re-entry guard (`submitLockRef`) in `PostForm.onSubmit`.
- The `participants` row is added by a DB trigger only — the client doesn't double-insert.
- `ActivityList` and `MapClient` dedupe by `id` defensively.

If you still see duplicates, check the Supabase **Database → Logs** to see whether two inserts actually hit the DB. If yes, it's a different bug; if no, your UI is showing stale data — refresh the page.

### White screen on the deployed site for ~30 seconds after a push

Vercel is mid-deploy. The new build briefly takes over while the previous one is torn down. Waiting 30-60 seconds resolves it. To avoid users seeing this:

- Push to a feature branch and use Vercel's automatic **preview deploys** (each push to a non-`main` branch gets its own `*-git-feature-*.vercel.app` URL).
- Only merge to `main` once you've smoke-tested the preview.

### Page navigations feel slow (>1 second per click)

Most likely your Supabase region is far from your Vercel function region, and every server-rendered page does multiple round-trips. See [section 9.5](#95-optional-tune-vercel-function-region) — moving your Vercel functions to the same region as Supabase is usually the biggest single win.

You can confirm this in your dev terminal: every server request prints a timing breakdown like:

```
GET /map 200 in 1474ms (next.js: 15ms, proxy.ts: 739ms, application-code: 720ms)
```

`proxy.ts: 739ms` means the middleware's Supabase Auth call is what's taking the time. `application-code: 720ms` means the page-level Supabase queries. Both shrink dramatically once Vercel and Supabase are in the same region.

### Anything else

- Supabase logs: **Dashboard → Logs** (filter by `Auth` or `Postgres`).
- Vercel logs: **Project → Logs** tab (filter by Function / Build).
- Next.js dev: `npm run dev` prints request timings as it serves each page.

---

## Useful commands reference

```bash
# Local dev
npm run dev                  # Next.js dev server on :3000
npm run build                # Production build (catches type + lint errors)
npm run start                # Run the production build locally
npm run lint                 # ESLint

# Database (re-run the migration anytime — it's idempotent)
# Just paste supabase/migrations/0001_init.sql into Supabase SQL editor.

# Git
git status
git checkout -b feat/my-feature
git add . && git commit -m "feat: …"
git push -u origin feat/my-feature   # Vercel auto-creates a preview deploy
```

---

## Next steps

- The V1 scope (locked) and V2 backlog live in `.cursor/plans/third-space-v1-plan_*.plan.md`.
- For day-to-day docs (what the project is, what's in scope), see `README.md`.
- For the schema and RPC, see `supabase/migrations/0001_init.sql` (well-commented).

Happy hacking. ✌️
