# hodi

A quiet daily journal for one person. Next.js (static export) + Firebase + Vercel.
Open it and today's page is already there, cursor ready.

Plan, invariants and the reasoning behind every decision: [`roadmap/ROADMAP.md`](roadmap/ROADMAP.md).

| | |
|---|---|
| Live | https://hodi.kyphan38.com (after Stage 0) |
| Firebase project | `kyphan38-hodi-app`, database `(default)`, `asia-southeast1` |
| Access | one email - checked on the login screen **and inside `firestore.rules`** |
| Server | none. Static files only; the browser talks straight to Firestore |
| Offline | Firestore persistent cache + a localStorage draft on every keystroke |
| Fonts | system stack only, no web font |

---

## What is different from the other apps

fina, logi and noda each have a server guard and an API. hodi stores only text,
so it has neither:

- **Static export** (`output: 'export'`). Pages that need a date use a query
  string (`/day/?d=2026-10-04`, `/review/?p=2026-W40`) because a static export
  has no open-ended dynamic routes.
- **Client-only sign-in.** No session cookie, no `firebase-admin`, no `jose`
  pin. Firebase Auth keeps the session in IndexedDB.
- **Rules are the only gate**, so they check `request.auth.token.email` (and
  `email_verified`) as well as the uid. A stranger who signs in with Google to
  this project cannot read or write anything, not even under their own uid.
- **Service worker serves HTML stale-while-revalidate**, not network-first. The
  page appears at once even on a bad connection; a new build is used on the
  next open. Data never comes from the SW - it lives in Firestore's own cache.
- **"Paper" UI.** One warm background, no cards, no tab bar - just
  `days · settings` in a corner that fades while you type.

## A day starts at 04:00

Writing at 01:00 still belongs to the page before. Every "today" goes through
`dayOf()` in `src/lib/day.ts`. Leave the app open past 04:00 and it moves to the
new page when you come back to it (or after 10 minutes without typing).

## Never losing a word

`src/hooks/usePage.ts`, in order of what happens on each keystroke:

1. The text goes into a localStorage draft at once (keyed by uid and page).
2. About 1 s later it is written to Firestore. Offline, the write waits in the
   persistent cache and goes out on reconnect.
3. Hiding the tab, leaving the page or unmounting flushes the pending save.

If the page changed somewhere else while this device still had unsaved text,
the two versions are **merged** (`mergeTexts`), never overwritten. The dot in
the corner tells you where the text is: hollow = on this device, filled = synced.

## Time stamps

Come back to the page after more than an hour and the first keystroke inserts
`— 21:40` on its own line. It is real text (it shows in the export), uses
`insertText` so ⌘Z removes it, does not count as words, and is shown faint when
reading.

## Firestore reads

| When | Reads |
|---|---|
| Open today | 1 (today's doc), from cache first |
| Any page in the app | one listener on `entries` and one on `reviews` for the whole session |

About 365 docs a year. Far from the 50k/day free tier.

## Shortcuts (Mac)

| Key | Where | Does |
|---|---|---|
| ⌘S | any editor | saves now (instead of the browser's "save page") |
| ⌘E | a past day | edit / back to reading |
| ← → | a past day | older / newer written day (swipe on iPhone) |
| / | anywhere | search |
| Esc | anywhere | leave the editor, then go to today |

## Setup (Stage 0, owner)

1. Firebase Console → new project `kyphan38-hodi-app`.
2. Authentication → enable Google. Settings → Authorized domains → add `hodi.kyphan38.com`.
3. Firestore → create `(default)` in `asia-southeast1`.
4. Project settings → add a Web app → copy the config into `.env.local` (see `.env.example`),
   plus `NEXT_PUBLIC_ALLOWED_USER_EMAIL` and `ALLOWED_USER_EMAIL`.
5. `npm run rules && firebase deploy --only firestore:rules,firestore:indexes`
6. Vercel → import the repo, add the `NEXT_PUBLIC_*` variables, domain `hodi.kyphan38.com`.

## Commands

```bash
npm install
npm run dev            # needs .env.local
npm run emu            # auth + firestore emulators (needs Java 21, see traps)
npm run dev:emu        # app against the emulators, no real project needed
npm test               # node:test, TZ=Asia/Ho_Chi_Minh
npm run typecheck
npm run lint
npm run build          # static site in out/
npm run rules          # firestore.rules from the template (email from .env.local)
npm run icons          # PNG icons from public/branding/hodi-icon.svg
node scripts/seed-emu.mjs <uid>   # a year of sample pages in the EMULATOR only
```

## Stage log

| Stage | Status | Date |
|---|---|---|
| 0 Setup | waiting for owner | |
| 1 Skeleton + Today | done | 2026-10-05 |
| 2 Days | done | 2026-10-05 |
| 3 Review + export | done | 2026-10-05 |
| 4 Details + launch | code done; deploy and iPhone check after Stage 0 | 2026-10-05 |

## Traps that cost a round trip

- **firebase-tools needs Java 21.** The default `java` here is 17. Run the
  emulators with `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run emu`.
- **Emulator sign-in skips the Google popup.** Popup and redirect need a
  cross-origin iframe that test browsers block, so `dev:emu` signs in with a
  fake Google credential for the allowed email (emulator only).
- **`firestore.rules` is generated and gitignored.** Edit
  `firestore.rules.template`, then `npm run rules`. Deploying without running it
  deploys whatever old file is on disk.
- **No service worker in dev.** It registers only in a production build, so test
  offline-open with `npm run build` and a static server on `out/`.
