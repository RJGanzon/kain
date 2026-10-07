# Build Kain: phone-first web app (Claude Code prompt)

You are building **Kain**, a phone-first web app for the Philippines. Kain helps low-income families get the most nutrition from a fixed food budget, and helps small eateries (carinderias) cost their menu and track what they sold. Both use the same engine of local market prices.

Read this whole file before you write any code. Then follow the build order in section 10, one phase at a time.

---

## 0. Files in this kit

```
KAIN_BUILD_PROMPT.md          this file
design/*.dc.html              the approved screen designs (9 screens, 390×844)
design/kain-logo.png          brand logo, 626×282, transparent PNG
reference/mvp/data.js         sample ingredients, recipes, nutrient targets (from the demo)
reference/mvp/app.js          working demo logic: planner, log parser, eatery maths
```

- **Design files:** use them as pixel references. Each one is plain HTML with inline styles inside an `<x-dc>` wrapper. Ignore the `<x-dc>`, `<helmet>`, `<sc-for>`, `<sc-if>` and `{{hole}}` syntax and the `DCLogic` class. Copy the layout, sizes, spacing, colours and copy text exactly. Where a value comes from `renderVals()`, read the script at the bottom of the file to see the sample data.
- **Reference MVP:** `app.js` already implements the planner, the purchase-log parser, spike alerts and substitutes. Port that logic to TypeScript and keep the behaviour the same. Section 7 is the spec.

---

## 1. Ground rules

1. **Inspect first.** If this repo already has a Kain prototype (it is deployed on Vercel), read it before changing anything. Keep its framework if it is React-based. Reuse its real ingredient and price dataset (about 46 ingredients, 18 recipes, dated prices) instead of the sample data. If you'd have to migrate frameworks, stop and ask me first.
2. **No fake data in production.** Sample prices from `reference/mvp/data.js` may be used only as seed data behind a visible "Sample data" label. Never present them as real market prices.
3. **Same inputs, same plan.** The planner must be deterministic: no randomness, and no AI calls for planning.
4. **Phone first.** Design for 390×844. Every screen must also work at 360 px wide with no horizontal scroll. Touch targets must be at least 44 px.
5. **Light theme only for now.** Use the white design exactly. Put colours in tokens so dark mode can be added later.
6. **Small, reviewable commits.** One commit per phase step, each with a clear message. Run tests before each commit.
7. **Ask before** adding a paid service, changing the database schema after phase 3, or deleting files you didn't create.

---

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| App | Next.js (App Router) + TypeScript | If the existing prototype uses Vite + React, stay on it |
| Styling | Tailwind CSS with the tokens in section 4 | No component library that fights the design |
| Icons | `lucide-react` | Stroke 2–2.2, size 20–22 in UI, 22 in the tab bar |
| Font | Plus Jakarta Sans 400, 500, 600, 700, 800 via `next/font/google` | Fallback: `system-ui, sans-serif` |
| Backend | Supabase (Postgres, Auth, Row Level Security, Edge Functions) | |
| Auth | Supabase Auth, OAuth 2.0 with Google and Facebook (PKCE) | Families can use Kain without an account |
| Offline | PWA via Serwist (or `next-pwa` if already in the repo) plus IndexedDB (Dexie) for prices and recipes | Planner runs fully on the device |
| Heavy compute | Planner runs in a Web Worker | Keeps the UI smooth on low-end Android |
| Voice | Web Speech API (`SpeechRecognition`, `lang: 'fil-PH'`, fallback `en-PH`) | Typed input always available |
| Tests | Vitest (logic), Playwright (screens at 390×844) | |
| Hosting | Vercel | |
| Payments | **Stub for now.** Later: PayMongo or Xendit (both support GCash and Maya) | Do not integrate real payments in this build |

---

## 3. Architecture (pipeline)

```
Price sources (contributor reports, user purchase logs, DA Bantay Presyo market, DA regional average, estimate)
  → prices table (dated, tiered, flagged if unusual)
  → current_prices view (best tier with a recent date, per ingredient per market)
  → synced to the phone (IndexedDB) → works offline

Family:  budget + family size + market
  → planner (Web Worker, deterministic) → meals per day, shopping list, nutrition coverage
Eatery:  menu + order size + pots cooked today
  → costing (cost and margin per order) → pots (kg cooked, sold, left) → profit now / if all sells
Log:     "isang kilo kamatis 110" (voice or typed)
  → parser → unit price → compare with current price
  → within ±30%: save as a user_log price (feeds back into prices)
  → outside ±30%: save but flag, do not use
```

---

## 4. Design system

Copy these exactly. They come from the approved screens in `design/`.

### Colours

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FFFFFF` | Screen background |
| `surface` | `#F6F5F1` | Grouped panels, back buttons, segmented control track |
| `track` | `#F1EFE9` | Progress bar and nutrition bar tracks |
| `line` | `#ECEAE4` | Dividers, card borders |
| `line-strong` | `#DAD6CC` | Outline button border |
| `ink` | `#141210` | Text, primary buttons, dark cards |
| `muted` | `#6B665C` | Secondary text (passes 4.5:1 on white) |
| `on-brand` | `#3D3520` | Secondary text on yellow |
| `on-dark-muted` | `#CFC9BA` | Secondary text on ink cards |
| `brand` | `#FFC83A` | Kain yellow: active tab pill, hero card, highlights, progress fills |
| `brand-tint` | `#FFF4D1` | Soft yellow tiles and tips |
| `good` / `good-bg` | `#14663C` / `#E6F4EC` | Positive, checks, "Price added" |
| `good-bar` | `#1A7F4B` | Nutrition bar at 90% and above |
| `warn` / `warn-bg` | `#8A4F00` / `#FFF1DA` | Below break-even, margin 30–49% |
| `warn-bar` | `#D98B00` | Nutrition bar 60–89% |
| `bad` / `bad-bg` | `#8E1F14` / `#FDECEA` | Price spikes |
| `bad-bar` | `#C23A2B` | Nutrition bar below 60% |

### Type (Plus Jakarta Sans)

| Role | Size / weight / tracking |
|---|---|
| Hero number | 40–42 / 800 / -0.03em, line-height 1 |
| Page title | 28 / 800 / -0.02em |
| Sheet title | 22–24 / 800 / -0.02em |
| Section title | 17–18 / 800 |
| Row title | 15–16 / 700 |
| Body | 14–15 / 400–600, line-height 1.45 |
| Caption | 12–13 / 600, `muted` |
| Overline | 11 / 700, uppercase, letter-spacing 0.06em, `muted` |

Use tabular numbers (`font-variant-numeric: tabular-nums`) for all prices and quantities.

### Shape and spacing

- Screen padding is 20 px on the sides and 16 px at the top. Use 14–20 px gaps between blocks.
- Radius: pills 999, hero cards 24, cards 20, buttons 16–18, icon tiles 14, small chips 999.
- **Primary button:** `ink` fill, white text 16/800, height 56, radius 18.
- **Secondary button:** white with a 1 px `line-strong` border, height 54.
- **Icon button:** 44×44 circle on `surface`.
- **Segmented control:** `surface` track with 4 px padding. The selected segment is white with shadow `0 1px 3px rgba(20,18,16,.12)`.
- **Bottom tab bar:** height 84, white, 1 px `line` top border, 4 equal tabs (Plan, Eatery, Log, Prices). The active tab has its icon in a 56×30 `brand` pill and an 11/800 `ink` label. Inactive tabs are 11/700 `muted` with no pill.
- **Shadows:** only on floating elements (sign-in preview, selected segment). Cards use a border or a `surface` fill, not shadows.
- **No emoji.** Status uses pills such as "Price added", "▲ 41%" and "46% margin".

### Logo

Use `design/kain-logo.png`. It is 24–28 px tall in app headers and 58–66 px on the yellow headers (sign-in, Business plan). Never recolour or redraw it.

---

## 5. Screens

Build each screen to match its file in `design/`. Notes below cover behaviour the static file can't show.

### 5.1 Sign in (`SignIn.dc.html`)
- Yellow header, 330 px tall: logo, the line "More nutrition from every peso", and a black pill reading "Sign in" (or "Welcome" after sign-in).
- A white sheet with a 28 px top radius starts at y=310. It holds the heading, three green-check benefits, then the buttons at the bottom:
  - **Continue with Google** (ink button)
  - **Continue with Facebook** (outline button)
  - the text link **Plan meals without an account**, which goes to Set budget as a guest
  - the privacy line
- **Use the official Google and Facebook sign-in button assets** and follow their branding guidelines. Do not draw the logos yourself. The circles in the design are placeholders.
- States: `signin` → `connecting` (spinner, "Connecting to Google", Cancel) → role picker.
- Role picker: "How will you use Kain?" with two cards:
  - **For my family** (surface card, "Free") → Set budget
  - **For my eatery** (ink card, "3 dishes free") → Eatery
- Save the role to `profiles.role`. It can be changed later in Settings.

### 5.2 Set budget (`Setup.dc.html`)
- Big amount shown as "₱350" (56/800), with a slider from ₱150 to ₱800 in steps of ₱10 and quick chips for ₱250, ₱350 and ₱500.
- Steppers: adults and teens (min 1, 1 serving each) and kids aged 4–12 (min 0, 0.6 serving each).
- Plan for: Today or 7 days.
- "Build my plan" button, with a caption showing the servings per meal.
- Guests store these settings on the device. Signed-in users also store them in `family_settings`.

### 5.3 Today's plan (`Main.dc.html`)
- Header: logo, a market chip ("Pampang Market", opens a market picker) and a settings button that opens Set budget.
- Yellow hero card: plan cost today vs budget, a progress bar, and a "₱X left" chip. On the right, an 88 px ring shows nutrition met as a percentage.
- Meals list in one bordered card: Almusal, Tanghalian and Hapunan. Each row has an icon tile, the dish name, its main ingredients plus "with rice", and the cost.
- Shopping list row → Week screen.

### 5.4 Week and nutrition (`Week.dc.html`)
- 7 day chips, each showing its cost. The selected day is yellow.
- "Nutrition covered" card with six bars: Energy, Protein, Iron, Vitamin A, Calcium and Vitamin C. Bar colour follows the 90% and 60% thresholds. Show "100%+" when a value goes over 100%.
- Two tiles: "X of 7 days with fish, meat or eggs" and "₱X a day left".
- Shopping list with checkboxes (ticked state stays on the device), grouped by category, with the total.

### 5.5 Log a purchase (`Log.dc.html`)
- 96 px yellow mic button. While listening it shows a halo and the text "Listening… say item, amount and price".
- Text input with an Add button. The parsed preview card shows item, quantity and price → unit price, plus "Close to market price" (green) or "Far from market price" (warn).
- This week: plan total vs logged total, as two bars.
- Recent entries with status pills: "Price added" or "Unusual, not used".
- If speech recognition isn't available, hide the mic and say "Voice works in Chrome on Android. Typing works everywhere."

### 5.6 Eatery (`Eatery.dc.html`), with two tabs
- **Today's sales:**
  - Ink profit card: "Profit right now" (sales so far minus the cost of all food cooked today), "X of Y kg sold", and tiles for "If the rest sells" and "Still in the pots: X kg · ₱Y".
  - "Pots today" list: name, a sold bar, "X of Y kg sold · Z kg left", and on the right either profit so far (good colour) or "₱X to break even" (warn colour), with the if-all-sells profit underneath.
  - Each row opens Pot detail.
- **Menu costs:** spike alert banner, then each dish with its cost per order, selling price, grams per order, margin in pesos and a margin % pill (50% and up good, 30–49% warn, below 30% bad).
- Free plan: up to 3 dishes. Adding a 4th opens the Business plan screen.

### 5.7 Pot detail (`Pot.dc.html`)
- Header: dish name, "4.0 kg pot · cooked 10:30 am".
- Cooked, sold and left in kg, with "Left" highlighted. Sold bar with a break-even tick. Caption: "X of N orders sold · Y left · 1 order ≈ 160 g".
- Record a sale: `−` (undo), **+1 order** (yellow), **+5 orders** (ink). Each tap writes to `pot_sales` and updates everything immediately. It must work offline and sync later.
- Totals card:
  - Sales so far
  - Cost of the whole pot
  - **Profit so far** or **Still to break even**
  - Estimated if the rest sells
- Leftover tip, shown only when orders are left: "N orders (X kg) left. Selling them at ₱60 after 6 pm still brings in ₱Y." The late price is a per-dish setting.
- Add a secondary action, **Weigh the pot instead**. The user enters the kg left, and sold = cooked − left.

### 5.8 Business plan (`Business.dc.html`)
- Yellow header with the logo and a "for Business" pill. White sheet with ₱199 per month, five feature checks, a choice of GCash or Maya, and **Start Business plan**.
- **For this build:** set `profiles.plan = 'business'` behind a clearly labelled "Demo: activate without payment" flag. No real charge.

### 5.9 Market prices (`Prices.dc.html`)
- Search with Filipino and English aliases, plus filter chips: All, Fish, Meat, Vegetables, Pantry.
- Source legend in fallback order: 1 Contributor, 2 DA market, 3 DA average, 4 Estimate.
- Rows: name, source pill and date, price per unit, and a 4-week change pill (▲ 15% or more bad, ▲ under 15% warn, ▼ good, "steady" when under 3%).
- Free for everyone, including guests.

---

## 6. Data model (Supabase)

```
markets            id, name, city
ingredients        id, name, aliases text[], category, unit ('kg'|'L'|'pc'|'bundle'|'can'|'pack'),
                   grams_per_unit, edible_portion, nutrients jsonb {kcal, protein_g, iron_mg, vita_ug, calcium_mg, vitc_mg} per 100 g edible
prices             id, ingredient_id, market_id, price, observed_at, source_tier
                   ('contributor'|'user_log'|'da_market'|'da_avg'|'estimate'), reported_by (nullable), status ('accepted'|'flagged')
current_prices     VIEW: per (ingredient, market), the accepted price with the best tier among
                   prices from the last 14 days, falling back down the tiers, then to the latest estimate
recipes            id, name, meal_type ('breakfast'|'ulam'), rice_g, default_price, order_g
recipe_items       recipe_id, ingredient_id, qty   (grams for kg items, ml for L items, count otherwise)
profiles           id (= auth.users.id), display_name, role ('family'|'eatery'), market_id, plan ('free'|'business')
family_settings    user_id, budget_per_day, adults, kids, days
purchase_logs      id, user_id, ingredient_id, qty, total_price, unit_price, market_id, logged_at, status
eatery_menu        id, user_id, recipe_id, price, order_g, late_price
pots               id, user_id, menu_item_id, date, cooked_kg, cooked_at
pot_sales          id, pot_id, orders (+n or -1), created_at
```

**Row Level Security:**
- Reference tables (`markets`, `ingredients`, `recipes`, `recipe_items`, `current_prices`) are readable by everyone, including anonymous users.
- User tables are readable and writable only by their owner.
- Users never insert into `prices` directly. The `log-purchase` Edge Function validates each entry and writes the price.

**Edge Functions:**
- `log-purchase`: takes `{ingredient_id, qty, total_price, market_id}` and recomputes the unit price. It compares that to `current_prices` (ignoring other user_log rows when the reference is itself a user log). Within ±30% it inserts a `user_log` price as accepted; otherwise it inserts it as flagged. It always inserts the `purchase_logs` row.
- Later, not now: `import-da-prices` (scheduled).

**Seed:** the repo's real dataset if one exists. Otherwise use `reference/mvp/data.js`, with every price marked `estimate` and the UI showing "Sample data".

---

## 7. Logic specs (port from `reference/mvp/app.js`, keep the behaviour)

### 7.1 Planner (family)
- **Servings per meal:** adult equivalents, AE = adults + 0.6 × kids.
- **Per-serving dish stats:** cost and nutrients from `recipe_items`, plus rice (`rice_g` of well-milled rice). Nutrients use grams × edible portion.
- **Daily targets per adult** (simplified FNRI PDRI, to be refined later): Energy 2000 kcal, Protein 60 g, Iron 18 mg, Vitamin A 600 µg RAE, Calcium 750 mg, Vitamin C 70 mg. Weights are 1.5 for energy and protein, 1 for the rest.
- **Each day**, try every breakfast × every pair of different ulam:
  - Cost = sum of the three dishes × AE. The combination must be ≤ **0.96 × daily budget** (headroom for rounding up to whole packs).
  - Score = Σ weight × min(coverage, 1) ÷ Σ weights, minus 0.04 × prior uses of the breakfast, minus 0.08 × prior uses of each ulam, minus 0.01 × cost ÷ budget.
  - Caps across the week: breakfast at most 3 times, each ulam at most 2. If nothing fits, relax the caps.
  - If still nothing fits the budget, return the cheapest combination and flag the day as over budget. The UI then shows "Budget too small. The cheapest plan costs ₱X a day."
  - Put the cheaper ulam at lunch and the other at dinner.
- **Shopping list rounding:**
  - kg items round up to the nearest 50 g.
  - L items (oil, toyo, suka, patis) round up to 10 ml and count as tingi.
  - Count items (eggs, cans, tali, packs) round up to whole units and show "N left over".
- **Day with fish, meat or eggs:** any dish that day has at least 30 g edible from the fish, meat, egg or canned categories.
- **Unit tests** (Vitest):
  - Same inputs give the same plan.
  - Shopping total stays ≤ the budget total whenever no day is flagged.
  - Over-budget fallback works.
  - Caps hold.

### 7.2 Purchase log parser
- Accepts Filipino and English, typed or spoken, for example:
  - "isang dosenang itlog 102" → itlog, 12 pc, ₱102, ₱8.50/pc
  - "kalahating kilo galunggong 140" → 500 g, ₱280/kg
  - "3 lata sardinas 78", "2 tali kangkong 40", "250 g bawang 35", "₱95 1 kilo talong", "kamatis 110" (defaults to 1 kg)
- Number words: isa/isang, dalawa/dalawang, tatlo/tatlong, apat, lima/limang, anim, kalahati/kalahating, plus `1/2`, `1/4` and digits.
- Units: kilo/kg, gramo/g, piraso/pc, dosena/dozen (×12), tali/bundle, lata/can, pack/pakete/sachet, litro/L, ml.
- The item is matched by the longest alias. The price is the number after ₱/php/pesos, or else the last number that isn't the quantity.
- Clear error messages for: no item ("Add the item name, like "kamatis" or "itlog"."), no price, or a unit mismatch ("Itlog is priced per pc. Try "1 pc itlog 100".").
- Unit tests cover every example above.

### 7.3 Eatery maths
- Orders in a pot = cooked_kg ÷ order_kg. Pot cost = orders × ingredient cost per order (plus a gas and extras setting per order, default ₱3).
- Sales so far = orders sold × price.
- **Profit right now = sales so far − cost of everything cooked today.** Unsold food counts as cost.
- If everything sells = total orders × price − cost. Break-even = ceil(pot cost ÷ price) orders.
- **Spike alert:** an ingredient used by the menu is up 15% or more vs 4 weeks ago. Show "Adds up to ₱X per serving (dish)" and the number of dishes affected.
- **Cheaper substitute:** same group (galunggong/bangus/tilapia; kangkong/pechay/malunggay; sitaw/okra; repolyo/pechay), compared by cost per edible gram. Suggest it when it saves at least 10% and more than ₱0.50 per order.
- Unit tests use the sample day from `Eatery.dc.html`. Expected results: profit right now ₱2,182, if all sells ₱5,132, 16.4 of 24.3 kg sold, 7.9 kg left worth ₱2,950, and Sinigang na Bangus ₱70 to break even.

---

## 8. Auth flow

```
Sign in screen → supabase.auth.signInWithOAuth({ provider: 'google' | 'facebook', options: { redirectTo: <origin>/auth/callback } })
  → provider consent (scopes: Google `email profile`, Facebook `email public_profile`)
  → /auth/callback exchanges the code for a session (PKCE)
  → no profile yet? → role picker → upsert profiles (role, market_id)
  → family → Set budget · eatery → Eatery
Guest ("Plan meals without an account") → everything on the device; on later sign-in, move device data into the account
```

Eatery features and the Business plan need sign-in. Planning, prices and logging work as a guest.

---

## 9. Offline and performance

- On first load, cache the app shell, the logo, the font, and the `ingredients`, `recipes` and `current_prices` for the chosen market in IndexedDB. Refresh prices when online, at most every 6 hours, and show "Prices from Oct 5" when they're stale.
- Queue writes (purchase logs, pot sales) while offline and sync them when back online. Show a small "Saved, will sync" note.
- Keep the JS bundle small. The planner runs in a Web Worker and must return in under 300 ms on a mid-range Android phone for a 7-day plan.

---

## 10. Build order (one phase at a time; stop and show me after each)

1. **Inspect and plan.** Read the repo and this kit. Write `docs/PLAN.md` covering what exists, what you'll reuse and any questions. Wait for my OK.
2. **Design system and shell.** Tokens, font, tab bar, buttons, cards, pills and segmented control. Build all 9 screens with static sample data, matching `design/` at 390×844.
3. **Data.** Supabase schema, RLS, seed and `current_prices` view. Typed client and IndexedDB sync.
4. **Family.** Planner (Web Worker) wired to Set budget, Today's plan and Week, with planner tests.
5. **Log.** Parser, voice input, `log-purchase` Edge Function and price feedback, with parser tests.
6. **Eatery.** Menu costing, pots, record sale, weigh the pot, spike alerts and substitutes, with eatery maths tests.
7. **Auth.** Google and Facebook OAuth, role picker, guest-to-account migration.
8. **PWA and offline.** Service worker, offline queue, install prompt.
9. **Business plan (demo).** Plan flag, 3-dish limit, upgrade screen. No real payments.

## 11. Definition of done

- [ ] All 9 screens match `design/` at 390×844, checked with Playwright screenshots, and have no horizontal scroll at 360 px
- [ ] Vitest passes for the planner, parser and eatery maths, including the exact expected numbers in 7.3
- [ ] Planner is deterministic and the shopping total stays within budget when no day is over budget
- [ ] Prices show their source tier and date everywhere. Sample data is labelled as sample
- [ ] Guest can plan, log and view prices with no account, including offline after the first visit
- [ ] Google and Facebook sign-in work with the official button assets. The role is saved
- [ ] Pot sales recorded offline sync correctly when back online
- [ ] Unusual logged prices (outside ±30%) are saved but never change `current_prices`
- [ ] Lighthouse PWA installable, and accessibility score of at least 90 on Today's plan
- [ ] No secrets in the client. RLS is on for every user table
