# Kain build plan (Phase 1)

Status: **All nine phases are built and live at https://kain-two.vercel.app (sections 10–12). Google and Facebook sign-in still need your OAuth apps (section 12).**

Phase 1 was approved on Oct 8, 2026, and you then asked for the remaining phases in one go. Your answers are recorded in section 9.

---

## 1. What exists

- **This folder** holds only the kit: `KAIN_BUILD_PROMPT.md`, 9 screen designs and the logo in `design/`, and the reference MVP in `reference/mvp/`. There is no app code yet. I unpacked the kit and ran `git init` (the `.zip` is git-ignored because its contents are committed unpacked).
- **No Kain prototype on this PC.** I searched Documents, Desktop, IdeaProjects, OneDrive and Local Sites. The prompt says one is deployed on Vercel with about 46 ingredients, 18 recipes and dated prices. See question 1.
- **Tools on this machine:** Node 24.14, npm 11, pnpm, git, GitHub CLI, Supabase CLI and Docker. The Vercel CLI isn't needed until deploy.

## 2. What I checked in the kit

| Check | Result |
|---|---|
| Planner on the design inputs (₱350, 2 adults, 3 kids, 7 days) | Day 1 costs ₱291, with 31 shopping items totalling ₱2,122. Both match the Main and Week designs. Days 5–7 differ a little from the Week design's numbers, which are illustrative. |
| Parser on every example in §7.2 | Every example gives the expected unit price, and the unit-mismatch message matches. |
| Eatery numbers in §7.3 | ₱2,182, ₱5,132, 16.4 of 24.3 kg, 7.9 kg worth ₱2,950 and Sinigang ₱70 to break even all reproduce, **but only when gas and extras are ₱0.** With the default ₱3 they become ₱1,762, ₱4,712 and ₱130. See decision B. |
| §7.1 test: "shopping total ≤ budget when no day is flagged" | **Fails for 612 of 5,544 inputs** (₱150–800 × 1–6 adults × 0–6 kids × 1 or 7 days). Rounding up to whole cans, tali and packs pushes small plans over the budget. See decision A. |
| Planner speed | At most 4.4 ms for a 7-day plan on this PC, so well under 300 ms on a mid-range phone. It will still run in a Web Worker, as the spec asks. |
| Design files | They need a `support.js` runtime that isn't in the kit, so they can't be opened as-is. A few colours they use aren't in the §4 token table (see section 5). |

## 3. Stack

These are the current versions on npm, checked today.

| Layer | Choice |
|---|---|
| App | Next.js 16.4 (App Router), React 19.3, TypeScript |
| Styling | Tailwind CSS 4.3 with the §4 tokens as CSS variables |
| Icons and font | `lucide-react`; Plus Jakarta Sans via `next/font/google` |
| Backend | Supabase (`@supabase/supabase-js` 2.117, `@supabase/ssr` 0.12) |
| On-device data | Dexie 4.4 (IndexedDB) for prices and recipes. Zustand (about 1 kB) for app state saved on the device. |
| Offline | Serwist 9.5 |
| Tests | Vitest 5 for logic, Playwright 1.63 for screens |
| Motion | No animation library. React 19.3's built-in `<ViewTransition>` and CSS handle it (section 4). |

---

## 4. Screen transitions that feel like a native app

The goal is for moving between screens to feel like a native iOS or Android app. Taps respond instantly, screens slide and fade in the direction you're going, back gestures work, and a low-end Android phone shows no blank flashes or stutter.

### 4.1 Navigation model

| From → to | Kind | Motion |
|---|---|---|
| Plan ↔ Eatery ↔ Log ↔ Prices (tab bar) | **Tab** | Fade-through: the old content fades out (90 ms), then the new content fades in and settles from 98% scale (210 ms). The tab bar stays still while the yellow pill moves to the new tab. |
| Today → Week, Today → Set budget, Eatery → Pot detail | **Push** | The new screen slides in from the right (350 ms) while the screen underneath shifts 30% left and dims. Going back reverses it. |
| Business plan, market picker | **Sheet** | The sheet slides up over a dimmed backdrop (400 ms) and slides down to close (250 ms). You can also swipe it down to close. |
| Sign in → Connecting → role picker | **Flow** | The white sheet cross-fades between steps. Leaving onboarding pushes into the app. |
| Within a screen: segmented controls, day chips, filters, recording a sale | **State** | The segmented thumb slides across. Eatery's two views slide 24 px towards the tapped segment and fade. Bars and the nutrition ring animate to their new values. Filtered lists fade. |

### 4.2 How it works

- **Browser View Transitions, driven by React 19.3 `<ViewTransition>` and Next 16's `transitionTypes`.** Each navigation is tagged `tab`, `push`, `pop`, `sheet-up` or `sheet-down`, and CSS picks the animation for that tag. Animations use only transform and opacity, so the compositor runs them and they stay smooth while JavaScript is busy. The planner runs in a Worker, so it never holds up a transition.
- **One navigation helper.** Screens never call the router directly. They use `useNav()` (`push`, `back`, `tab`, `present`, `dismiss`) and `<NavLink>`, so every navigation gets the right direction.
- **The parent screen stays live underneath.** A pushed screen is drawn as a layer over its parent inside the parent's layout. For example, `plan/layout.tsx` always renders Today, and `/plan/week` sits on top of it. The parent keeps its scroll position and state, so Back is instant and returns you to the same spot.
- **System back behaves like an app.** Kain catches the Android back button or gesture and browser Back (popstate) and plays the `pop` animation. Opening a sheet adds a history entry, so Back closes the sheet first.
- **No double animation on iPhone.** When Safari has already animated its own swipe-back (`hasUAVisualTransition`), Kain skips its own animation.
- **Edge swipe-back on iPhone home-screen installs.** An installed app has no browser back gesture, so Kain adds one. Your finger drags the top screen off and reveals the live parent. Releasing past 35% of the width, or with a quick flick, goes back; otherwise the screen springs back. This is off on Android, where the system back gesture owns the screen edge.
- **No blank flashes.** Every screen is a client component fed from on-device data (IndexedDB and memory), and links are prefetched. The next screen is ready before its animation starts, so no spinners appear between screens.
- **An app-like shell:**
  - The shell is full height (`100dvh`), and each screen scrolls in its own container, so the tab bar and headers never move.
  - Safe-area insets keep content clear of the iPhone home indicator.
  - The shell has no pull-to-refresh or overscroll bounce.
  - There's no 300 ms tap delay or grey tap highlight, and buttons press down to 97% scale.
  - The status bar colour follows the screen: white, or yellow on Sign in and Business plan.
- **Reduced motion.** When the phone has "reduce motion" turned on, every transition becomes a 150 ms cross-fade and nothing slides.
- **Fallback.** A browser without View Transitions changes screens instantly and nothing breaks.

### 4.3 Motion tokens

| Token | Value | Used for |
|---|---|---|
| `--ease-ios` | `cubic-bezier(0.32, 0.72, 0, 1)` | Push, pop, sheets |
| `--ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Tab fade-through, changes within a screen |
| `--dur-push` | 350 ms | Push and pop |
| `--dur-tab-out` / `--dur-tab-in` | 90 ms / 210 ms | Tab fade-through |
| `--dur-sheet-up` / `--dur-sheet-down` | 400 ms / 250 ms | Sheets |
| `--dur-state` | 200–250 ms | Changes within a screen |
| `--dur-press` | 100 ms | Button press |

### 4.4 How I'll verify it

- **Playwright at 390×844.** Each navigation should play the expected transition type. Back and Forward from any screen should land on the right screen with its scroll restored, and Back should close an open sheet.
- **Chrome performance trace at 6× CPU slowdown.** Push, pop and tab transitions should drop no frames and cause no long tasks.
- **Real phones.** I'll check on an Android phone in Chrome, and on an iPhone in Safari and as a home-screen install. At the end of Phase 2 I'll ask you to try it on your own phone.

---

## 5. Design system notes

- The §4 tokens become CSS variables and are exposed to Tailwind 4 through `@theme`. The app is light only for now, but the token names are ready for a dark theme.
- The designs use some colours that aren't in the token table. I'll add these as tokens instead of hard-coding them:

| Hex | Used in | New token |
|---|---|---|
| `#B3271A` | Spike banner and log-preview icon strokes | `bad-icon` |
| `#E2DFD6` | Budget slider track, Pot sold-bar track, budget chip borders | `track-strong` |
| `#D6D2C8` | Shopping list checkbox border | `check-border` |
| `#ECEEF8` | Hapunan icon tile | `tile-night` |
| `#5C4600` | "DA market" tier text | `tier-da-fg` |
| `#3D3A33` | "DA average" tier text, Pot caption | `ink-soft` |
| `#57534A` / `#8A857A` | "Estimate" tier text and its dashed border | `tier-est-fg` / `tier-est-border` |

- **Reference renders.** The design files can't render without their runtime, so I'll write a small script that fills in each design's sample data and saves a 390×844 PNG. Playwright then compares each built screen against its PNG.

## 6. App structure

### Routes

| Route | Screen | Presentation | Tab bar |
|---|---|---|---|
| `/signin` | Sign in → Connecting → role picker | flow | hidden |
| `/auth/callback` | OAuth PKCE code exchange (Phase 7) | n/a | n/a |
| `/plan` | Today's plan | tab | shown |
| `/plan/week` | Week and nutrition | push | stays |
| `/plan/setup` | Set budget | push | covered |
| `/eatery` | Eatery (Today's sales, Menu costs) | tab | shown |
| `/eatery/pot/[id]` | Pot detail | push | covered |
| `/log` | Log a purchase | tab | shown |
| `/prices` | Market prices | tab | shown |
| `/business` | Business plan | sheet | covered |
| `?sheet=market` | Market picker, from any tab | sheet | covered |

The first visit opens `/signin`. "Plan meals without an account" goes to `/plan/setup` as a guest. Later visits open on the last tab used.

### Folders

```
src/app/                 routes and layouts above
src/components/ui/       Button, IconButton, Card, Pill, Segmented, Stepper, Bar, Ring, TabBar, Sheet
src/components/screens/  one folder per screen
src/lib/nav/             useNav, NavLink, StackHost, swipe-back, transition CSS
src/lib/planner/         planner (pure TypeScript) and planner.worker.ts
src/lib/parser/          purchase-log parser
src/lib/eatery/          costing, pots, spike alerts, substitutes
src/lib/data/            Supabase client, Dexie database, sync, offline write queue
src/lib/store/           device state: family settings, ticked items, logs, pots
supabase/                migrations, seed, functions/log-purchase
tests/                   Vitest (logic) and Playwright (screens, transitions)
```

## 7. Logic decisions (went ahead as proposed)

**A. Shopping list over budget.** The reference planner leaves 4% headroom, but whole packs can cost more than that on small plans, so the §7.1 test can't pass with an exact port.
- I'll keep the reference search unchanged, then check the rounded shopping total.
- If the total is over budget, I'll re-run the plan with 2 points less headroom (0.94, then 0.92, and so on). This repeats until the list fits or a day gets flagged "Budget too small".
- The fix is still deterministic, and plans that already fit (89% of inputs) don't change.
- I tested it on all 612 failing inputs and it fixes every one. The worst case needed 0.66.

**B. Eatery test data and gas/extras.** The §7.3 expected numbers only work with extras at ₱0. In the test, I'll treat the sample's cost per order as all-in (extras ₱0). Real dishes will default to ₱3 extras, as the spec says.

**C. "Steady" change pill.** The design shows "steady" only at exactly 0%, but the spec says under 3%. I'll follow the spec.

**D. Contributor vs. "Your log".** The reference ranks both as tier 1. When both have a recent price, I'll use the newer one, then fall back down the tiers.

**E. Differences between markets.** The reference fakes price differences between markets with a hash. I won't port that. A market without its own price falls back to the DA average or an estimate, labelled as such.

## 8. Build phases

Each step is one commit with tests run first. I'll stop after each phase.

| Phase | Steps (one commit each) | What you'll be able to try |
|---|---|---|
| 1. Inspect and plan | This file | n/a |
| 2. Design system, shell and transitions | 2a scaffold (Next 16, TypeScript, Tailwind tokens, font, Vitest, Playwright) · 2b UI parts · 2c navigation shell and transitions (tabs, stack layers, `useNav`, sheets, swipe-back, reduced motion) · 2d the 9 screens with static sample data · 2e reference renders plus Playwright screenshot, 360 px and transition tests | All 9 screens, clickable on your phone, with the transitions and static data |
| 3. Data | Schema and RLS migrations · seed and `current_prices` view · typed client · Dexie sync | Local Supabase serving prices, with the "Sample data" label |
| 4. Family | Planner port and tests · Worker · wiring for Set budget, Today and Week | Real plans from your inputs |
| 5. Log | Parser and tests · voice input · `log-purchase` Edge Function · price feedback | Logging that updates market prices |
| 6. Eatery | Costing, pots and tests (§7.3 numbers) · record a sale and weigh the pot · spike alerts and substitutes | Working carinderia tools |
| 7. Auth | Google and Facebook OAuth with the official buttons · role picker · moving guest data into the account | Real sign-in |
| 8. PWA and offline | Serwist service worker · offline queue with "Saved, will sync" · install prompt | Works offline and installs to the home screen |
| 9. Business plan (demo) | Plan flag · 3-dish limit · upgrade sheet with "Demo: activate without payment" | The upgrade flow, with no real payments |

## 9. Questions and answers

**Answered Oct 8, 2026:** don't reuse the old prototype; build fresh, and create a new Vercel project (the old deployment is to be deleted). The other proposals (local Supabase for development, decisions A–E) went ahead as written.

1. **Where is the existing prototype?** The prompt says it's on Vercel, but it isn't on this PC. Its repo decides two things: whether we stay on its framework, and whether we use its real dataset. A GitHub link or a clone in this folder is enough. If you don't have it handy, I'll start on Next.js with the kit's sample data, labelled "Sample data", and swap in the real dataset at Phase 3. The transition design works the same on Vite + React Router, which also supports View Transitions.
2. **Supabase:** should I use a new project or an existing one? For development I'd run it locally (the Supabase CLI and Docker are installed), so hosted keys aren't needed until deploy. Is that OK?
3. **OAuth apps (Phase 7):** you'll need to create a Google Cloud OAuth client and a Facebook app. I'll give you the exact redirect URLs when we get there.
4. **Decisions A–E** in section 7: OK as proposed?

---

## 10. Phase 2 notes (screens and transitions)

### What's built
- **Screens:** all 9 screens, with sample data behind a "Sample data" label.
- **Transitions:** native-style transitions as described in section 4.
- **Interactive pieces:**
  - the market picker sheet
  - the budget slider and family steppers, saved on the device
  - shopping list ticks, saved on the device
  - week day nutrition
  - Eatery's two views
  - recording a sale and weighing the pot
  - price search and filters

### Where the app differs from the designs, on purpose
- **Sample data label.** "Sample data" sits next to the date, section titles or subtitles, as rule 2 requires.
- **Shopping list.** It shows all 31 items, grouped by category, and each row names its price source.
- **Week nutrition.** The card shows the daily average, as in the design. Tapping a day shows that day's numbers, and tapping it again returns to the average.
- **Weigh the pot instead.** Pot detail has this link (§5.7), which opens a sheet.
- **Tabular numbers.** Prices use tabular numbers (§4), so Today's lunch row wraps one word earlier than the design.
- **Google and Facebook buttons.** They keep the design's placeholder circles until Phase 7, which adds the official button assets.

### Static until a later phase

All three are now real: the plan and dates come from the planner (Phase 4), the Eatery "+" button opens the add-dish sheet up to the free limit (Phases 6 and 9), and Log a purchase uses the parser (Phase 5).

### Tests

| Command | What it runs |
|---|---|
| `npx vitest run` | Unit tests (nav history) |
| `npx playwright test` | Builds, starts the app and runs the browser tests (below) |
| `node scripts/render-designs.mjs` | Re-renders the design references |
| `FRAMES=1 npx playwright test frames` | Saves mid-transition frames |

The browser tests cover:
- every transition kind and history path
- each screen against its design at 390×844
- no horizontal scroll at 360 px
- touch targets of at least 44 px
- a full journey with no console errors
- transition speed with the CPU slowed 6×: every tap starts moving within 300 ms, measured at 34–254 ms

---

## 11. Phases 3–9: what was built

| Phase | What's in it |
|---|---|
| 3. Data | One migration with every table in §6, with row security on all of them. A `current_prices` view gives the best accepted tier from the last 14 days, then the latest estimate, plus the price 4 weeks earlier. The seed comes from `reference/mvp/data.js`, with every price marked `estimate` and the "Sample data" label on. Generated TypeScript types. The catalog is cached on the phone (IndexedDB via Dexie) and refreshed at most every 6 hours, timed for idle moments so it never competes with a tap. |
| 4. Family | The planner, ported to TypeScript and running in a Web Worker. It is deterministic (recipes are taken in id order) and applies decision A (headroom tightening). Set budget builds the new plan before Today slides back in. Today and Week use the live plan with real dates, and show "Budget too small" when nothing fits. |
| 5. Log | The parser, with additions: an ingredient's own name counts as an alias, "anim na itlog 51" works, and so does "250g". Voice input tries Filipino, then English. The `log-purchase` Edge Function and the shared ±30% check. "Your log" prices appear on the phone at once. An outbox sends writes when the phone is online and signed in. |
| 6. Eatery | Costing from today's prices (the design's per-order costs come out exactly). Menu, pots, sales, weighing the pot, and the late-price tip. Spike alerts and cheaper substitutes. The free plan's 3-dish limit. |
| 7. Auth | Google and Facebook sign-in through Supabase Auth (PKCE), with the official logos. The role picker. Account settings in Set budget (switch role, sign out). Guest data moves into a new account, and a returning account's data comes onto a new phone. The eatery needs an account when there's a backend. |
| 8. PWA | A Serwist service worker: the app shell and every screen are precached, page data is cached as it's used, and Supabase calls are never cached. An offline fallback page, web manifest and icons, iOS home-screen settings, the install card, and "Saved, will sync". |
| 9. Business | "Demo: activate without payment", behind `NEXT_PUBLIC_BUSINESS_DEMO` and the database's `business_demo` flag. No real charges; GCash and Maya stay a choice. |

### Decisions made along the way

| Decision | Why |
|---|---|
| Pot detail is `/eatery/pot?id=…` | Pots are created on the phone (offline), so their ids can't be known when the site is built. |
| `pot_sales` has a `user_id` column (not in §6) | Simple, fast row security; a trigger checks it matches the pot's owner. |
| `prices.market_id` may be empty | A regional price (DA average, estimate) that applies to every market. |
| `eatery_menu.extras` (gas and extras per order) | §7.3 calls it "a setting per order"; it defaults to ₱3 and can be changed per dish. |
| Tests sign in with locally minted sessions | Real Google/Facebook logins need your OAuth apps. Email login stays off. |
| The eatery runs on the phone only when there's no backend | So a demo copy without Supabase is still usable; with a backend it needs an account, as §8 says. |
| "Installable" is checked with Chrome's own installability check | Lighthouse 12 removed its PWA category. |

### Fixed along the way

- **Planner worker under the service worker:** Turbopack's worker loader reads its setup from its URL fragment, and a cached response dropped it. It now has its own service-worker rule, covered by a test.
- **Outbox:** it now goes round again when something is queued mid-upload.
- **Speed:** date formatters are now made once (Week had been creating about 60 per render).

### Definition of done (§11)

| Item | Status |
|---|---|
| All 9 screens match `design/` at 390×844; no horizontal scroll at 360 px | Done. 0.4–6.9% of pixels differ (sample label, real data, lucide icons). The 360 px and 44 px touch-target checks pass. |
| Vitest for the planner, parser and eatery maths, including the §7.3 numbers | Done. 61 unit tests, including ₱2,182 / ₱5,132 / 16.4 of 24.3 kg / ₱2,950 / ₱70. |
| Planner is deterministic; shopping total stays within budget when no day is over | Done. Tested across 1,176 inputs, and with shuffled input. |
| Prices show their source tier and date everywhere; sample data is labelled | Done. |
| A guest can plan, log and view prices offline after the first visit | Done (browser test). |
| Google and Facebook sign-in with the official assets; the role is saved | Built, and tested with test sessions. **The real logins need your OAuth apps** (section 12). |
| Pot sales recorded offline sync when back online | Done (browser test). |
| Unusual logged prices are saved but never change `current_prices` | Done (database test). |
| Installable; accessibility of at least 90 on Today's plan | Done. No Chrome installability errors; Lighthouse accessibility is 100. |
| No secrets in the client; RLS on every user table | Done. Only the public URL and publishable key reach the app; database tests check ownership. |

### Running it locally

| Command | What it does |
|---|---|
| `npm run db:start` | Starts local Supabase (Docker) with the migration and seed |
| `supabase functions serve` | Serves `log-purchase` locally |
| `npm run dev` | Runs the app at http://localhost:3000 (uses `.env.local`) |
| `npx vitest run` | Unit tests (planner, parser, eatery, nav, price check) |
| `npm run test:db` | Database and Edge Function tests (needs the two commands above) |
| `npx playwright test` | Builds the app and runs the browser tests |
| `PERF=1 npx playwright test --project perf` | Transition timing with the CPU slowed 6× (run on a quiet machine) |

---

## 12. Live deployment

| Piece | Where | State |
|---|---|---|
| App | Vercel project `kain` (rjganzons-projects), https://kain-two.vercel.app | Deployed Oct 8, 2026 from this repo with `vercel deploy --prod`. `.vercelignore` keeps `.env.local` and the tests out of uploads. |
| Settings on Vercel (production) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_BUSINESS_DEMO=1` | Only public values; no secrets. |
| Database | Supabase project `Kain` (`xlogulbdjcqjenlkkmcy`, Singapore) | The migration is applied and the seed loaded (3 markets, 36 ingredients, 22 recipes, sample prices). It was empty before. |
| Edge Function | `log-purchase` on the same project | Deployed. |
| Check on production | Phone-sized browser | Plan, prices from Supabase cached on the phone, eatery sign-in gate, service worker active, no console errors. |

The old Kain deployment isn't in this Vercel account, so nothing was removed.

### Still needs you

1. **Sign-in URLs.** In Supabase → Authentication → URL Configuration, set the Site URL to `https://kain-two.vercel.app` and add `https://kain-two.vercel.app/auth/callback` to the redirect URLs. Keep `http://localhost:3000/auth/callback` if you want local sign-in too.
2. **Google and Facebook.**
   - Create a Google OAuth client and a Facebook app.
   - Both use the redirect URI `https://xlogulbdjcqjenlkkmcy.supabase.co/auth/v1/callback`.
   - Switch the providers on in Supabase → Authentication → Providers with their keys.
   - Until then, the buttons explain that sign-in isn't switched on, and families can still use everything without an account.
3. **Real prices.** Load dated market prices into `prices` (contributor, DA market or DA average tiers). Then set `sample_prices` to off in `app_flags`, and the "Sample data" labels disappear.
4. **Redeploying.** After changes, run `npx vercel deploy --prod` from this folder. Database changes go out with `supabase db push`, and function changes with `supabase functions deploy log-purchase --use-api` (the project is linked).
