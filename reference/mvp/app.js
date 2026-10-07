/* ============================================================
   KAIN MVP APP
   Pipeline:  prices (tiered) -> per-serving dish stats ->
              family planner (exact-budget search) / eatery costing ->
              purchase log -> logged prices feed back into prices
   Everything runs in the browser; same inputs give the same plan.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const peso = (v, d = 0) => '₱' + Number(v).toLocaleString('en-PH', { minimumFractionDigits: d, maximumFractionDigits: d });
  const peso2 = (v) => peso(v, 2);
  const pct = (v) => Math.round(v * 100) + '%';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ING = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));
  const REC = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
  const TODAY = new Date();
  const isoDay = (d) => d.toISOString().slice(0, 10);
  const fmtDate = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

  /* ---------- state (saved per device) ---------- */
  const KEY = 'kain-mvp-v1';
  const defaults = () => ({
    tab: 'plan',
    market: MARKETS[0],
    family: { budget: 350, adults: 2, kids: 3, days: 7 },
    day: 0,
    eatery: {
      business: false,
      extras: 3,
      menu: [
        { id: 'munggo', price: 50, batch: 30 },
        { id: 'pinakbet', price: 60, batch: 25 },
        { id: 'amanok', price: 85, batch: 25 },
      ],
    },
    logs: null,
  });
  let S = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) S = Object.assign(defaults(), JSON.parse(raw));
  } catch (e) { /* storage unavailable: run in memory */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  /* ---------- prices ---------- */
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
  function marketFactor(id) {
    const m = MARKETS.indexOf(S.market);
    if (m <= 0) return 1;
    return 0.94 + hash(S.market + id) * 0.12; // sample variation between markets
  }
  function logOverride(id) {
    if (!S.logs) return null;
    const used = S.logs.filter((l) => l.ingId === id && l.status === 'used').sort((a, b) => b.ts - a.ts);
    return used[0] || null;
  }
  function priceInfo(id) {
    const ing = ING[id];
    const f = marketFactor(id);
    const base = ing.price * f;
    const prev = ing.prev * f;
    const lo = logOverride(id);
    if (lo) return { price: lo.unitPrice, prev, tier: 'log', date: isoDay(new Date(lo.ts)), base };
    return { price: base, prev, tier: ing.tier, date: ing.date, base };
  }
  function history(id) {
    const p = priceInfo(id);
    const pts = [];
    for (let k = 0; k <= 4; k++) {
      const lin = p.prev + (p.price - p.prev) * (k / 4);
      const wig = k === 0 || k === 4 ? 0 : (hash(id + k) - 0.5) * 0.04 * p.prev;
      pts.push(lin + wig);
    }
    return pts;
  }

  /* ---------- per-serving maths ---------- */
  function grams(ing, qty) {
    if (ing.unit === 'kg') return qty;
    if (ing.unit === 'L') return (qty * ing.g) / 1000;
    return qty * ing.g;
  }
  function cost(ing, qty, price) {
    if (ing.unit === 'kg' || ing.unit === 'L') return (qty / 1000) * price;
    return qty * price;
  }
  function dishStats(rid, withRice) {
    const r = REC[rid];
    const items = Object.assign({}, r.items);
    if (withRice && r.rice) items.bigas = (items.bigas || 0) + r.rice;
    let c = 0, animal = 0;
    const n = [0, 0, 0, 0, 0, 0];
    for (const [id, q] of Object.entries(items)) {
      const ing = ING[id];
      const p = priceInfo(id).price;
      c += cost(ing, q, p);
      const eg = grams(ing, q) * ing.ep;
      for (let k = 0; k < 6; k++) n[k] += (eg / 100) * ing.n[k];
      if (ANIMAL_CATS.includes(ing.cat)) animal += eg;
    }
    return { cost: c, n, animal, items };
  }

  /* ---------- family planner ---------- */
  function ae() { return S.family.adults + CHILD_FACTOR * S.family.kids; }

  function makePlan() {
    const AE = ae();
    const days = S.family.days;
    const budget = S.family.budget;
    const target = NUTRIENTS.map((x) => x.target * AE);
    const wsum = NUTRIENTS.reduce((a, x) => a + x.w, 0);
    const B = RECIPES.filter((r) => r.meal === 'b').map((r) => r.id);
    const U = RECIPES.filter((r) => r.meal === 'u').map((r) => r.id);
    const st = {};
    for (const r of RECIPES) st[r.id] = dishStats(r.id, true);

    const uses = {};
    const out = [];
    for (let d = 0; d < days; d++) {
      let best = null;
      for (const relax of [false, true]) {
        for (const b of B) {
          if (!relax && (uses[b] || 0) >= 3) continue;
          for (let i = 0; i < U.length; i++) {
            for (let j = i + 1; j < U.length; j++) {
              const l = U[i], dn = U[j];
              if (!relax && ((uses[l] || 0) >= 2 || (uses[dn] || 0) >= 2)) continue;
              const c = (st[b].cost + st[l].cost + st[dn].cost) * AE;
              if (c > budget * 0.96) continue; // leave room for rounding up to whole packs
              let score = 0;
              const cov = [];
              for (let k = 0; k < 6; k++) {
                const v = ((st[b].n[k] + st[l].n[k] + st[dn].n[k]) * AE) / target[k];
                cov.push(v);
                score += NUTRIENTS[k].w * Math.min(v, 1);
              }
              score /= wsum;
              score -= 0.04 * (uses[b] || 0) + 0.08 * ((uses[l] || 0) + (uses[dn] || 0));
              score -= 0.01 * (c / budget);
              if (!best || score > best.score + 1e-9) best = { b, l, dn, cost: c, cov, score };
            }
          }
        }
        if (best) break;
      }
      let over = false;
      if (!best) {
        // Budget too small for any combination: show the cheapest day and flag it.
        over = true;
        for (const b of B) for (let i = 0; i < U.length; i++) for (let j = i + 1; j < U.length; j++) {
          const c = (st[b].cost + st[U[i]].cost + st[U[j]].cost) * AE;
          if (!best || c < best.cost) {
            const cov = [];
            for (let k = 0; k < 6; k++) cov.push(((st[b].n[k] + st[U[i]].n[k] + st[U[j]].n[k]) * AE) / target[k]);
            best = { b, l: U[i], dn: U[j], cost: c, cov, score: 0 };
          }
        }
      }
      // Put the lighter dish at lunch, the heartier one at dinner.
      if (st[best.l].cost > st[best.dn].cost) { const t = best.l; best.l = best.dn; best.dn = t; }
      for (const id of [best.b, best.l, best.dn]) uses[id] = (uses[id] || 0) + 1;
      const animalDay = [best.b, best.l, best.dn].some((id) => st[id].animal >= 30);
      out.push(Object.assign(best, { over, animalDay }));
    }

    // Shopping list
    const need = {};
    for (const day of out) for (const id of [day.b, day.l, day.dn]) {
      for (const [ing, q] of Object.entries(st[id].items)) need[ing] = (need[ing] || 0) + q * AE;
    }
    const shop = Object.entries(need).map(([id, q]) => {
      const ing = ING[id];
      const p = priceInfo(id).price;
      let buy = q, label;
      if (ing.unit === 'kg') { buy = Math.max(50, Math.ceil(q / 50) * 50); label = buy >= 1000 ? (buy / 1000).toFixed(2).replace(/\.?0+$/, '') + ' kg' : buy + ' g'; }
      else if (ing.unit === 'L') { buy = Math.ceil(q / 10) * 10; label = buy + ' ml (tingi)'; }
      else { buy = Math.ceil(q - 1e-9); label = buy + ' ' + ({ pc: buy === 1 ? 'pc' : 'pcs', bundle: buy === 1 ? 'tali' : 'tali', can: buy === 1 ? 'can' : 'cans', pack: buy === 1 ? 'pack' : 'packs' }[ing.unit]); }
      return { id, ing, q, buy, label, c: cost(ing, buy, p), extra: ing.unit !== 'kg' && ing.unit !== 'L' && buy - q > 0.05 ? buy - q : 0 };
    });
    const total = out.reduce((a, d) => a + d.cost, 0);
    const shopTotal = shop.reduce((a, s) => a + s.c, 0);
    const avgCov = NUTRIENTS.map((_, k) => out.reduce((a, d) => a + d.cov[k], 0) / out.length);
    return { days: out, st, AE, total, shop, shopTotal, avgCov, budgetTotal: budget * days };
  }

  /* ---------- eatery ---------- */
  function servingCost(rid) { return dishStats(rid, false).cost + Number(S.eatery.extras || 0); }
  function spikes() {
    const ids = new Set();
    for (const m of S.eatery.menu) for (const id of Object.keys(REC[m.id].items)) ids.add(id);
    const res = [];
    for (const id of ids) {
      const p = priceInfo(id);
      const ch = (p.price - p.prev) / p.prev;
      if (Math.abs(ch) < 0.15) continue;
      let perServing = 0, worst = '';
      const dishes = [];
      for (const m of S.eatery.menu) {
        const q = REC[m.id].items[id];
        if (!q) continue;
        dishes.push(REC[m.id].name);
        const d = cost(ING[id], q, p.price) - cost(ING[id], q, p.prev);
        if (Math.abs(d) > Math.abs(perServing)) { perServing = d; worst = REC[m.id].name; }
      }
      res.push({ id, ch, p, dishes, perServing, worst });
    }
    return res.sort((a, b) => b.ch - a.ch);
  }
  function substitutes() {
    const res = [];
    for (const m of S.eatery.menu) {
      const r = REC[m.id];
      for (const [id, q] of Object.entries(r.items)) {
        const grp = SUB_GROUPS.find((g) => g.includes(id));
        if (!grp) continue;
        const ing = ING[id];
        const eg = grams(ing, q) * ing.ep;
        const nowC = cost(ing, q, priceInfo(id).price);
        for (const alt of grp) {
          if (alt === id || r.items[alt]) continue;
          const a = ING[alt];
          const aq = a.unit === 'kg' ? eg / a.ep : eg / (a.g * a.ep);
          const altC = cost(a, aq, priceInfo(alt).price);
          const save = nowC - altC;
          if (save > 0.5 && save / nowC >= 0.1) res.push({ dish: r.name, from: ing.name, to: a.name, save, batch: m.batch });
        }
      }
    }
    return res.sort((a, b) => b.save - a.save).slice(0, 4);
  }
  function menuTrend() {
    // Average ingredient cost per serving across the menu, weekly for the last 4 weeks.
    const weeks = [0, 1, 2, 3, 4].map(() => 0);
    let servings = 0;
    for (const m of S.eatery.menu) {
      servings += m.batch;
      for (const [id, q] of Object.entries(REC[m.id].items)) {
        const h = history(id);
        for (let k = 0; k < 5; k++) weeks[k] += cost(ING[id], q, h[k]) * m.batch;
      }
    }
    return servings ? weeks.map((w) => w / servings) : weeks;
  }

  /* ---------- purchase log ---------- */
  const NUMWORDS = { isa: 1, isang: 1, dalawa: 2, dalawang: 2, tatlo: 3, tatlong: 3, apat: 4, lima: 5, limang: 5, anim: 6, kalahati: 0.5, kalahating: 0.5, one: 1, two: 2, three: 3, half: 0.5 };
  const UNITS = [
    [/^(kilos?|kg|kgs|k)$/, 'kg', 1000], [/^(gramo|grams?|g)$/, 'g', 1],
    [/^(piraso|pirasong|pcs?|pieces?|piece)$/, 'pc', 1], [/^(dosena|dosenang|dozen|doz)$/, 'pc', 12],
    [/^(tali|bugkos|bundles?)$/, 'bundle', 1], [/^(lata|cans?)$/, 'can', 1],
    [/^(packs?|pakete|sachets?)$/, 'pack', 1], [/^(litro|liters?|litres?|l)$/, 'ml', 1000], [/^(ml)$/, 'ml', 1],
  ];
  function parseLog(text) {
    const t = ' ' + text.toLowerCase().replace(/₱|php|pesos?|piso/g, ' ₱ ').replace(/[,]/g, '').replace(/\s+/g, ' ') + ' ';
    // item
    let item = null, best = 0;
    for (const ing of INGREDIENTS) for (const a of ing.aliases) {
      if (t.includes(' ' + a + ' ') || t.includes(' ' + a + 's ')) { if (a.length > best) { best = a.length; item = ing; } }
    }
    const toks = t.trim().split(' ');
    const nums = [];
    toks.forEach((w, i) => {
      if (/^\d+(\.\d+)?$/.test(w)) nums.push({ v: parseFloat(w), i });
      else if (/^\d+\/\d+$/.test(w)) { const [a, b] = w.split('/'); nums.push({ v: a / b, i }); }
      else if (NUMWORDS[w] !== undefined) nums.push({ v: NUMWORDS[w], i, word: true });
    });
    let unit = null, mult = 1, unitIdx = -1;
    toks.forEach((w, i) => { if (unit) return; for (const [re, u, m] of UNITS) if (re.test(w)) { unit = u; mult = m; unitIdx = i; break; } });
    let qty = null, price = null;
    const priceTok = toks.indexOf('₱');
    if (priceTok >= 0) { const after = nums.find((n) => n.i > priceTok); if (after) price = after.v; }
    const qtyCand = nums.filter((n) => n.v !== price || n.word);
    if (unitIdx >= 0) { const q = qtyCand.filter((n) => n.i < unitIdx).pop(); if (q) qty = q.v; }
    if (price === null) {
      const rest = nums.filter((n) => !(qty !== null && n.v === qty && n.i < unitIdx));
      const last = rest.filter((n) => !n.word).pop();
      if (last) price = last.v;
    }
    if (qty === null) { qty = 1; if (!unit) { unit = null; } }
    if (!item) return { ok: false, msg: 'Add the item name, like "kamatis" or "itlog".' };
    // convert to ingredient unit
    let q = null;
    const u = item.unit;
    if (unit === null) q = u === 'kg' ? qty * 1000 : u === 'L' ? qty * 1000 : qty;
    else if (unit === 'kg') q = u === 'kg' ? qty * 1000 : null;
    else if (unit === 'g') q = u === 'kg' ? qty : null;
    else if (unit === 'ml') q = u === 'L' ? qty * mult : null;
    else q = unit === u || (unit === 'pc' && u !== 'kg' && u !== 'L') ? qty * mult : null;
    if (q === null) return { ok: false, msg: `${item.name} is priced per ${u === 'kg' ? 'kilo' : u}. Try "${u === 'kg' ? '1 kilo' : '1 ' + u} ${item.aliases[0]} 100".` };
    if (price === null) return { ok: false, item, msg: 'Add the amount you paid, like "… 120".' };
    const unitQty = u === 'kg' || u === 'L' ? q / 1000 : q;
    const unitPrice = price / unitQty;
    return { ok: true, item, q, unitQty, price, unitPrice };
  }
  function qtyLabel(ing, q) {
    if (ing.unit === 'kg') return q >= 1000 ? (q / 1000).toString().replace(/(\.\d\d)\d+/, '$1') + ' kg' : Math.round(q) + ' g';
    if (ing.unit === 'L') return q >= 1000 ? q / 1000 + ' L' : q + ' ml';
    return q + ' ' + ({ pc: q === 1 ? 'pc' : 'pcs', bundle: 'tali', can: q === 1 ? 'can' : 'cans', pack: q === 1 ? 'pack' : 'packs' }[ing.unit]);
  }
  function addLog(text, opts = {}) {
    const r = parseLog(text);
    if (!r.ok) return r;
    const ref = priceInfo(r.item.id);
    const refPrice = ref.tier === 'log' ? ref.base : ref.price;
    const ratio = r.unitPrice / refPrice;
    const status = ratio < 0.7 || ratio > 1.3 ? 'unusual' : 'used';
    const entry = {
      id: Math.random().toString(36).slice(2), ts: opts.ts || Date.now(), text, ingId: r.item.id, q: r.q,
      price: r.price, unitPrice: r.unitPrice, status, ratio, example: !!opts.example,
    };
    S.logs.unshift(entry);
    S.logs.sort((a, b) => b.ts - a.ts);
    save();
    return Object.assign({ entry }, r);
  }
  if (!S.logs) {
    S.logs = [];
    for (const e of EXAMPLE_LOGS) addLog(e.text, { example: true, ts: Date.now() - e.daysAgo * 86400000 - 3600000 });
  }

  /* ---------- UI bits ---------- */
  const tierChip = (t) => `<span class="chip tier-${t}">${esc(TIERS[t].label)}</span>`;
  const changeChip = (ch) => {
    if (Math.abs(ch) < 0.03) return `<span class="chip line">steady</span>`;
    const up = ch > 0;
    const cls = up ? (ch >= 0.15 ? 'bad' : 'warn') : 'good';
    return `<span class="chip ${cls}">${up ? '▲' : '▼'} ${Math.round(Math.abs(ch) * 100)}%</span>`;
  };
  function covBar(label, v) {
    const w = clamp(v, 0, 1) * 100;
    const cls = v >= 0.9 ? '' : v >= 0.6 ? 'mid' : 'low';
    return `<div class="bar"><span class="lab">${esc(label)}</span><div class="track" role="img" aria-label="${esc(label)} ${pct(v)}"><div class="fill ${cls}" style="width:${w}%"></div></div><span class="pct">${v > 1.5 ? '150%+' : pct(v)}</span></div>`;
  }
  const lockIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>';
  function locked(title, text) {
    return `<div class="locked"><div class="lk">${lockIcon}<div class="grow"><div class="row" style="justify-content:space-between"><b>${esc(title)}</b><span class="chip brand">Business</span></div><p class="small muted" style="margin-top:4px">${esc(text)}</p></div></div></div>`;
  }
  let toastT;
  function toast(msg) {
    let el = $('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600);
  }
  function spark(vals) {
    const W = 320, H = 92, px = 34, py = 18;
    const min = Math.min(...vals), max = Math.max(...vals);
    const pad = (max - min) * 0.15 || 1;
    const lo = min - pad, hi = max + pad;
    const x = (i) => px + (i * (W - px * 2)) / (vals.length - 1);
    const y = (v) => py + (1 - (v - lo) / (hi - lo)) * (H - py * 2);
    const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const area = `M${x(0)},${H - py} L` + vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' L') + ` L${x(vals.length - 1)},${H - py} Z`;
    const labels = ['4 wks ago', '', '', '', 'Now'];
    return `<svg class="spark" viewBox="0 0 ${W} ${H + 14}" role="img" aria-label="Menu cost per serving, ${peso2(vals[0])} four weeks ago to ${peso2(vals[4])} now">
      <line x1="${px}" x2="${W - px}" y1="${H - py}" y2="${H - py}" stroke="var(--line)" stroke-width="1"/>
      <path d="${area}" fill="var(--brand-soft)" opacity=".8"/>
      <polyline points="${pts}" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${x(0)}" cy="${y(vals[0])}" r="3.5" fill="var(--surface)" stroke="var(--ink)" stroke-width="2"/>
      <circle cx="${x(4)}" cy="${y(vals[4])}" r="5" fill="var(--brand)" stroke="var(--ink)" stroke-width="2"/>
      <text x="${x(0)}" y="${y(vals[0]) - 9}" text-anchor="middle" font-size="11" font-weight="800" fill="var(--muted)">${peso2(vals[0])}</text>
      <text x="${x(4)}" y="${y(vals[4]) - 10}" text-anchor="middle" font-size="12" font-weight="900" fill="var(--ink)">${peso2(vals[4])}</text>
      ${labels.map((l, i) => l ? `<text x="${x(i)}" y="${H + 8}" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--muted)">${l}</text>` : '').join('')}
    </svg>`;
  }

  /* ---------- screens ---------- */
  function renderPlan() {
    const P = makePlan();
    const f = S.family;
    const day = Math.min(S.day, P.days.length - 1);
    const d = P.days[day];
    const avgDay = P.total / P.days.length;
    const left = f.budget - avgDay;
    const overDays = P.days.filter((x) => x.over).length;
    const animalDays = P.days.filter((x) => x.animalDay).length;
    const avgScore = Math.round((P.avgCov.reduce((a, v, k) => a + NUTRIENTS[k].w * Math.min(v, 1), 0) / NUTRIENTS.reduce((a, x) => a + x.w, 0)) * 100);
    const meal = (when, rid) => {
      const st = P.st[rid];
      const r = REC[rid];
      const main = Object.keys(r.items).filter((id) => !['mantika', 'toyo', 'suka', 'patis', 'bawang', 'sibuyas'].includes(id)).slice(0, 4).map((id) => ING[id].name.replace(/ \(.*\)/, '')).join(', ');
      return `<div class="meal"><div class="when">${when}</div><div class="grow"><div class="name">${esc(r.name)}</div><div class="ings">${esc(main)}${r.rice ? ' · with rice' : ''}</div></div><div class="cost">${peso(st.cost * P.AE)}</div></div>`;
    };
    const cats = {};
    for (const s of P.shop) (cats[s.ing.cat] = cats[s.ing.cat] || []).push(s);
    const shopHtml = Object.keys(CATS).filter((c) => cats[c]).map((c) => `<div class="cat">${esc(CATS[c])}</div><div class="divide">${cats[c].sort((a, b) => b.c - a.c).map((s) => `<div class="li"><div><div class="t">${esc(s.ing.name)}</div><div class="s">${esc(s.label)}${s.extra ? ` · ${s.extra.toFixed(1).replace(/\.0$/, '')} left over` : ''}</div></div><div class="r">${peso(s.c)}</div></div>`).join('')}</div>`).join('');

    $('#view').innerHTML = `<section class="screen" aria-label="Family meal plan">
      <div>
        <p class="eyebrow">For families · free</p>
        <h1 class="display h-sec" style="margin-top:4px">Meal plan for your budget</h1>
      </div>
      <div class="panel" style="display:grid;gap:14px">
        <div class="field">
          <label for="budget">Food budget per day</label>
          <div class="money"><span>₱</span><input id="budget" inputmode="numeric" type="number" min="100" max="2000" step="10" value="${f.budget}"></div>
          <input id="budgetRange" type="range" min="150" max="800" step="10" value="${clamp(f.budget, 150, 800)}" aria-label="Budget slider">
        </div>
        <div class="inputs">
          <div class="field"><label id="adL">Adults & teens</label><div class="stepper" role="group" aria-labelledby="adL"><button data-step="adults" data-d="-1" aria-label="Fewer adults">−</button><output>${f.adults}</output><button data-step="adults" data-d="1" aria-label="More adults">+</button></div></div>
          <div class="field"><label id="kdL">Kids (4–12)</label><div class="stepper" role="group" aria-labelledby="kdL"><button data-step="kids" data-d="-1" aria-label="Fewer kids">−</button><output>${f.kids}</output><button data-step="kids" data-d="1" aria-label="More kids">+</button></div></div>
        </div>
        <div class="field"><label>Plan for</label><div class="seg"><button data-days="1" aria-pressed="${f.days === 1}">Today</button><button data-days="7" aria-pressed="${f.days === 7}">7 days</button></div></div>
      </div>

      <div class="sticker">
        <p class="eyebrow">${f.days === 1 ? 'Today' : 'Average per day'}</p>
        <div class="row wrap" style="align-items:baseline;gap:8px;margin-top:6px">
          <span class="display big num">${peso(avgDay)}</span>
          <span class="muted" style="font-weight:800">of ${peso(f.budget)}</span>
        </div>
        ${overDays ? `<div class="banner" style="margin-top:12px;background:var(--bad-bg);color:var(--bad)"><b>Budget too small.</b> The cheapest plan for this family costs ${peso(avgDay)} a day. Showing it anyway.</div>`
          : `<p class="small muted" style="margin-top:4px">${left >= 1 ? `${peso(left)} a day left for coffee, sugar, snacks or savings.` : 'Uses the full budget.'}${P.shopTotal > P.budgetTotal ? ` Shopping list is ${peso(P.shopTotal - P.budgetTotal)} over because some items come whole; the extra carries over.` : ''}</p>`}
        <div class="stats">
          <div class="stat"><b>${avgScore}%</b><span>of nutrition needs met</span></div>
          <div class="stat"><b>${animalDays}/${P.days.length}</b><span>days with fish, meat or eggs</span></div>
          <div class="stat"><b>${P.AE.toFixed(1)}</b><span>servings per meal</span></div>
        </div>
      </div>

      <div class="panel">
        <div class="sectionhead"><h2 class="display" style="font-size:18px">Nutrition covered</h2><span class="small muted">${f.days === 1 ? 'today' : 'daily average'}</span></div>
        <div class="bars" style="margin-top:12px">${NUTRIENTS.map((x, k) => covBar(x.label, P.avgCov[k])).join('')}</div>
        <p class="small muted" style="margin-top:10px">Compared with simplified FNRI daily needs for ${f.adults} adult${f.adults === 1 ? '' : 's'} and ${f.kids} kid${f.kids === 1 ? '' : 's'}.</p>
      </div>

      <div class="panel">
        <div class="sectionhead"><h2 class="display" style="font-size:18px">Meals</h2><span class="small muted num">${peso(d.cost)} this day</span></div>
        ${P.days.length > 1 ? `<div class="days" style="margin-top:12px">${P.days.map((x, i) => `<button data-day="${i}" aria-pressed="${i === day}">Day ${i + 1}<small class="num">${peso(x.cost)}</small></button>`).join('')}</div>` : ''}
        <div class="divide" style="margin-top:6px">${meal('Almusal', d.b)}${meal('Tanghalian', d.l)}${meal('Hapunan', d.dn)}</div>
      </div>

      <details class="panel" id="shopDetails">
        <summary><div><h2 class="display" style="font-size:18px">Shopping list</h2><span class="small muted">${P.shop.length} items for ${P.days.length === 1 ? 'today' : '7 days'}</span></div><div class="row"><b class="num">${peso(P.shopTotal)}</b><svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></div></summary>
        <div style="margin-top:6px">${shopHtml}</div>
        <p class="small muted" style="margin-top:10px">Vegetables and meat are rounded up to the nearest 50 g. Oil, toyo, suka and patis are counted as tingi. Items sold whole (eggs, cans, tali) may leave some for the next days.</p>
      </details>
      <p class="small muted" style="text-align:center">Same inputs always give the same plan. Calculated on this phone.</p>
    </section>`;

    const setBudget = (v, fromRange) => {
      v = clamp(Math.round(Number(v) || 0), 100, 2000);
      S.family.budget = v; save();
      if (fromRange) { const b = $('#budget'); if (b) b.value = v; }
      scheduleRender();
    };
    $('#budget').addEventListener('change', (e) => setBudget(e.target.value));
    $('#budgetRange').addEventListener('input', (e) => { const b = $('#budget'); if (b) b.value = e.target.value; });
    $('#budgetRange').addEventListener('change', (e) => setBudget(e.target.value, true));
    document.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.step; const min = k === 'adults' ? 1 : 0;
      S.family[k] = clamp(S.family[k] + Number(b.dataset.d), min, 10); save(); render();
    }));
    document.querySelectorAll('[data-days]').forEach((b) => b.addEventListener('click', () => { S.family.days = Number(b.dataset.days); S.day = 0; save(); render(); }));
    document.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => { S.day = Number(b.dataset.day); save(); render(); }));
  }
  let rT;
  function scheduleRender() { clearTimeout(rT); rT = setTimeout(() => { const y = window.scrollY; render(); window.scrollTo(0, y); }, 120); }

  function renderEatery() {
    const E = S.eatery;
    const biz = E.business;
    const FREE_LIMIT = 3;
    const menu = biz ? E.menu : E.menu.slice(0, FREE_LIMIT);
    const rows = menu.map((m, idx) => {
      const c = servingCost(m.id);
      const margin = m.price - c;
      const mp = m.price > 0 ? margin / m.price : 0;
      const cls = mp >= 0.5 ? 'good' : mp >= 0.3 ? 'warn' : 'bad';
      return `<div class="dish">
        <div class="head"><div class="nm">${esc(REC[m.id].name)}</div><button class="linkbtn small" data-remove="${idx}" aria-label="Remove ${esc(REC[m.id].name)}">Remove</button></div>
        <div class="ctl"><label>Sells for ₱<input class="mini" type="number" min="0" step="1" id="price-${m.id}" data-price="${idx}" value="${m.price}"></label><label>Cooks <input class="mini" type="number" min="1" step="1" id="batch-${m.id}" data-batch="${idx}" value="${m.batch}"> servings</label></div>
        <div class="figs"><div class="fig"><span>Cost / serving</span><b>${peso2(c)}</b></div><div class="fig"><span>Margin</span><b>${peso2(margin)}</b></div><div class="fig"><span>Margin %</span><b><span class="chip ${cls}" style="font-size:13px">${pct(mp)}</span></b></div></div>
      </div>`;
    }).join('');
    const avail = RECIPES.filter((r) => r.meal === 'u' && !E.menu.some((m) => m.id === r.id));
    const canAdd = biz || E.menu.length < FREE_LIMIT;

    let bizHtml = '';
    if (biz) {
      const sp = spikes();
      const subs = substitutes();
      const tr = menuTrend();
      const revenue = E.menu.reduce((a, m) => a + m.price * m.batch, 0);
      const cogs = E.menu.reduce((a, m) => a + servingCost(m.id) * m.batch, 0);
      const since = new Date(TODAY); since.setHours(0, 0, 0, 0);
      const loggedToday = S.logs.filter((l) => l.ts >= since.getTime()).reduce((a, l) => a + l.price, 0);
      bizHtml = `
      <div class="panel">
        <div class="sectionhead"><h2 class="display" style="font-size:18px">Price spike alerts</h2><span class="small muted">vs 4 weeks ago</span></div>
        <div class="divide" style="margin-top:6px">${sp.length ? sp.map((s) => `<div class="alert"><span class="dot ${s.ch < 0 ? 'down' : ''}"></span><div><div class="row wrap" style="gap:6px"><b>${esc(ING[s.id].name)}</b>${changeChip(s.ch)}<span class="small muted num">${peso(s.p.prev)} → ${peso(s.p.price)}/${({ kg: 'kg', L: 'L', pc: 'pc', bundle: 'tali', can: 'can', pack: 'pack' })[ING[s.id].unit]}</span></div><p class="small muted" style="margin-top:2px">${s.ch > 0 ? 'Adds up to' : 'Saves up to'} ${peso2(Math.abs(s.perServing))} per serving (${esc(s.worst)}). Used in ${s.dishes.length} dish${s.dishes.length === 1 ? '' : 'es'}.</p></div></div>`).join('') : '<p class="small muted" style="padding:10px 0">No big price moves for your menu this month.</p>'}</div>
      </div>
      <div class="panel">
        <h2 class="display" style="font-size:18px">Cheaper substitutes</h2>
        <div class="divide" style="margin-top:6px">${subs.length ? subs.map((s) => `<div class="li"><div><div class="t">${esc(s.from)} → ${esc(s.to)}</div><div class="s">in ${esc(s.dish)} · ${peso(s.save * s.batch)} less per batch</div></div><div class="r" style="color:var(--good)">−${peso2(s.save)}</div></div>`).join('') : '<p class="small muted" style="padding:10px 0">Your menu already uses the cheapest options we know.</p>'}</div>
      </div>
      <div class="panel">
        <div class="sectionhead"><h2 class="display" style="font-size:18px">Menu cost trend</h2><span class="small muted">ingredients per serving</span></div>
        <div style="margin-top:8px">${spark(tr)}</div>
      </div>
      <div class="panel">
        <h2 class="display" style="font-size:18px">Today's profit estimate</h2>
        <div class="divide" style="margin-top:6px">
          <div class="li"><div class="t">Sales if all servings sell</div><div class="r">${peso(revenue)}</div></div>
          <div class="li"><div><div class="t">Ingredients and extras</div><div class="s">${loggedToday ? `You logged ${peso(loggedToday)} of purchases today` : 'Log purchases to compare with what you actually spent'}</div></div><div class="r">−${peso(cogs)}</div></div>
          <div class="li"><div class="t">Estimated profit</div><div class="r display" style="font-size:20px">${peso(revenue - cogs)}</div></div>
        </div>
      </div>
      <div class="panel row" style="justify-content:space-between;flex-wrap:wrap">
        <div><b>Export costed menu</b><p class="small muted">Copies a CSV you can paste into Sheets or Excel.</p></div>
        <button class="btn sm ghost" id="exportBtn">Copy CSV</button>
      </div>`;
    } else {
      bizHtml = `${locked('Price spike alerts', 'Know when an ingredient you use jumps, and what it adds per serving.')}
        ${locked('Cheaper substitutes', 'Swaps like bangus to galunggong when prices move.')}
        ${locked('Menu cost trend and profit estimate', 'Weekly menu cost and a daily profit estimate from your logged purchases.')}`;
    }

    $('#view').innerHTML = `<section class="screen" aria-label="Eatery costing">
      <div>
        <p class="eyebrow">For carinderias and small eateries</p>
        <h1 class="display h-sec" style="margin-top:4px">Cost your menu at today's prices</h1>
      </div>
      <div class="sticker plan-toggle">
        <div class="grow"><div class="row wrap" style="gap:8px"><b>${biz ? 'Business plan' : 'Free plan'}</b><span class="chip ${biz ? 'brand' : 'line'}">${biz ? '₱199 / month' : `${Math.min(E.menu.length, FREE_LIMIT)} of ${FREE_LIMIT} dishes`}</span></div>
        <p class="small muted" style="margin-top:2px">${biz ? 'Unlimited dishes, alerts, substitutes and profit estimate.' : 'Cost up to 3 dishes free. Turn on to preview the Business plan.'}</p></div>
        <button class="switch" role="switch" id="bizSwitch" aria-checked="${biz}" aria-label="Preview Business plan"></button>
      </div>
      <div class="panel">
        <div class="sectionhead"><h2 class="display" style="font-size:18px">Your menu</h2><label class="small muted" style="display:flex;gap:6px;align-items:center">Gas & extras ₱<input class="mini" style="width:52px" type="number" min="0" step="0.5" id="extras" value="${E.extras}"> /serving</label></div>
        <div class="divide">${rows || '<p class="small muted" style="padding:12px 0">Add your first dish below.</p>'}</div>
        <div class="row" style="margin-top:12px;gap:8px">
          <select id="addDish" class="textin grow" aria-label="Dish to add" ${canAdd ? '' : 'disabled'}>${avail.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select>
          <button class="btn sm" id="addBtn" ${canAdd && avail.length ? '' : 'disabled'}>Add dish</button>
        </div>
        ${!canAdd ? `<p class="small" style="margin-top:8px"><b>Free plan covers 3 dishes.</b> <button class="linkbtn" id="upsell">Preview Business plan</button></p>` : ''}
        ${!biz && E.menu.length > FREE_LIMIT ? `<p class="small muted" style="margin-top:6px">${E.menu.length - FREE_LIMIT} more dish${E.menu.length - FREE_LIMIT === 1 ? '' : 'es'} saved, shown on the Business plan.</p>` : ''}
        <p class="small muted" style="margin-top:10px">Margin colours: green 50% and up, amber 30–49%, red below 30%.</p>
      </div>
      ${bizHtml}
    </section>`;

    const goBiz = (on) => {
      E.business = on;
      // First preview: add a few more dishes so the Business tools have something to show.
      if (on && E.menu.length <= FREE_LIMIT) for (const [id, price] of [['sinigang', 90], ['gg', 75], ['torta', 50]]) if (!E.menu.some((m) => m.id === id)) E.menu.push({ id, price, batch: 20 });
      save(); render(); toast(on ? 'Business plan preview on' : 'Back to the free plan');
    };
    $('#bizSwitch').addEventListener('click', () => goBiz(!E.business));
    const up = $('#upsell'); if (up) up.addEventListener('click', () => goBiz(true));
    $('#extras').addEventListener('change', (e) => { E.extras = Math.max(0, Number(e.target.value) || 0); save(); scheduleRender(); });
    document.querySelectorAll('[data-price]').forEach((el) => el.addEventListener('change', () => { E.menu[el.dataset.price].price = Math.max(0, Number(el.value) || 0); save(); scheduleRender(); }));
    document.querySelectorAll('[data-batch]').forEach((el) => el.addEventListener('change', () => { E.menu[el.dataset.batch].batch = Math.max(1, Math.round(Number(el.value) || 1)); save(); scheduleRender(); }));
    document.querySelectorAll('[data-remove]').forEach((el) => el.addEventListener('click', () => { E.menu.splice(Number(el.dataset.remove), 1); save(); render(); }));
    $('#addBtn').addEventListener('click', () => {
      const id = $('#addDish').value; if (!id) return;
      E.menu.push({ id, price: REC[id].price || 60, batch: 25 }); save(); render();
    });
    const ex = $('#exportBtn');
    if (ex) ex.addEventListener('click', () => {
      const lines = ['Dish,Price,Cost per serving,Margin,Margin %,Servings'];
      for (const m of E.menu) { const c = servingCost(m.id); lines.push(`"${REC[m.id].name}",${m.price},${c.toFixed(2)},${(m.price - c).toFixed(2)},${Math.round(((m.price - c) / m.price) * 100)}%,${m.batch}`); }
      const csv = lines.join('\n');
      navigator.clipboard.writeText(csv).then(() => toast('Menu copied as CSV'), () => toast('Copy not allowed here'));
    });
  }

  let rec = null;
  function renderLog() {
    const P = makePlan();
    const weekPlan = (P.shopTotal / P.days.length) * 7;
    const weekAgo = Date.now() - 7 * 86400000;
    const spent = S.logs.filter((l) => l.ts >= weekAgo).reduce((a, l) => a + l.price, 0);
    const max = Math.max(weekPlan, spent, 1);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const st = { used: ['good', 'Price added'], unusual: ['warn', 'Unusual, not used'] };
    $('#view').innerHTML = `<section class="screen" aria-label="Purchase log">
      <div>
        <p class="eyebrow">Families and eateries</p>
        <h1 class="display h-sec" style="margin-top:4px">Log what you bought</h1>
        <p class="small muted" style="margin-top:6px">Say or type it. Each purchase checks your plan and adds a fresh, dated price for your market.</p>
      </div>
      <div class="sticker" style="display:grid;gap:10px">
        <form class="loginput" id="logForm" autocomplete="off">
          <input class="textin grow" id="logText" placeholder="1 kilo kamatis 110" aria-label="What you bought and how much you paid">
          ${SR ? `<button type="button" class="mic" id="micBtn" aria-label="Speak your purchase"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>` : ''}
          <button class="btn" type="submit">Add</button>
        </form>
        <div class="preview" id="logPreview" aria-live="polite"></div>
        <div class="examples">${['1 kilo kamatis 110', 'isang dosenang itlog 102', 'kalahating kilo galunggong 140', '3 lata sardinas 78'].map((x) => `<button type="button" data-ex="${esc(x)}">${esc(x)}</button>`).join('')}</div>
        ${SR ? '' : '<p class="small muted">Voice input works in Chrome on Android. Typing works everywhere.</p>'}
      </div>

      <div class="panel cmp">
        <div class="sectionhead"><h2 class="display" style="font-size:18px">This week</h2><span class="small muted">plan vs logged</span></div>
        <div class="bar"><span class="lab">Plan</span><div class="track"><div class="fill" style="width:${(weekPlan / max) * 100}%;background:var(--brand)"></div></div><span class="pct">${peso(weekPlan)}</span></div>
        <div class="bar"><span class="lab">Logged</span><div class="track"><div class="fill" style="width:${(spent / max) * 100}%;background:var(--ink)"></div></div><span class="pct">${peso(spent)}</span></div>
        <p class="small muted">Plan is the 7-day shopping total from the Plan tab. ${spent < weekPlan ? `${peso(weekPlan - spent)} of the plan not logged yet.` : `${peso(spent - weekPlan)} over the plan.`}</p>
      </div>

      <div class="panel">
        <div class="sectionhead"><h2 class="display" style="font-size:18px">Recent</h2>${S.logs.length ? '<button class="linkbtn small" id="clearBtn">Clear all</button>' : ''}</div>
        <div id="clearConfirm" hidden class="banner" style="margin-top:10px;justify-content:space-between;align-items:center"><span>Delete all ${S.logs.length} entries?</span><span class="row"><button class="btn sm ghost" id="clearNo">Keep</button><button class="btn sm" id="clearYes">Delete</button></span></div>
        <div class="divide" style="margin-top:4px">${S.logs.length ? S.logs.slice(0, 30).map((l) => {
          const ing = ING[l.ingId];
          const [cls, txt] = st[l.status];
          return `<div class="li"><div><div class="t">${esc(ing.name)} <span class="muted" style="font-weight:700">· ${esc(qtyLabel(ing, l.q))}</span></div><div class="s">${new Date(l.ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} · ${peso2(l.unitPrice)}/${({ kg: 'kg', L: 'L', pc: 'pc', bundle: 'tali', can: 'can', pack: 'pack' })[ing.unit]} <span class="chip ${cls}">${txt}</span>${l.example ? ' <span class="chip line">Example</span>' : ''}</div></div><div class="r">${peso(l.price)}</div></div>`;
        }).join('') : '<p class="small muted" style="padding:12px 0">Nothing logged yet. Try one of the examples above.</p>'}</div>
        <p class="small muted" style="margin-top:10px">Prices more than 30% away from the market price are kept but not used, so one typo can't move everyone's prices.</p>
      </div>
    </section>`;

    const input = $('#logText');
    const prev = $('#logPreview');
    const showPreview = () => {
      const v = input.value.trim();
      if (!v) { prev.innerHTML = ''; return; }
      const r = parseLog(v);
      if (!r.ok) { prev.innerHTML = `<span class="muted">${esc(r.msg)}</span>`; return; }
      const ref = priceInfo(r.item.id);
      const ratio = r.unitPrice / (ref.tier === 'log' ? ref.base : ref.price);
      prev.innerHTML = `<b>${esc(r.item.name)}</b> · ${esc(qtyLabel(r.item, r.q))} · ${peso(r.price)} → <b class="num">${peso2(r.unitPrice)}/${({ kg: 'kg', L: 'L', pc: 'pc', bundle: 'tali', can: 'can', pack: 'pack' })[r.item.unit]}</b> ${ratio < 0.7 || ratio > 1.3 ? '<span class="chip warn">far from market price</span>' : `<span class="chip good">market ${peso(ref.price)}</span>`}`;
    };
    input.addEventListener('input', showPreview);
    $('#logForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input.value.trim(); if (!v) return;
      const r = addLog(v);
      if (!r.ok) { prev.innerHTML = `<span style="color:var(--bad);font-weight:800">${esc(r.msg)}</span>`; return; }
      toast(r.entry.status === 'used' ? `${r.item.name} price updated for everyone` : `${r.item.name} saved; price looks unusual`);
      render();
    });
    document.querySelectorAll('[data-ex]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.ex; showPreview(); input.focus(); }));
    const cb = $('#clearBtn');
    if (cb) {
      cb.addEventListener('click', () => { $('#clearConfirm').hidden = false; });
      $('#clearNo').addEventListener('click', () => { $('#clearConfirm').hidden = true; });
      $('#clearYes').addEventListener('click', () => { S.logs = []; save(); render(); toast('Log cleared'); });
    }
    const mic = $('#micBtn');
    if (mic && SR) mic.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      try {
        rec = new SR(); rec.lang = 'fil-PH'; rec.interimResults = true; rec.maxAlternatives = 1;
        mic.classList.add('on'); prev.innerHTML = '<span class="muted">Listening… say item, amount, and price.</span>';
        rec.onresult = (ev) => { input.value = Array.from(ev.results).map((x) => x[0].transcript).join(' '); showPreview(); };
        rec.onerror = () => { prev.innerHTML = '<span class="muted">Voice isn\'t available here. Type it instead.</span>'; };
        rec.onend = () => { mic.classList.remove('on'); rec = null; };
        rec.start();
      } catch (err) { mic.classList.remove('on'); rec = null; prev.innerHTML = '<span class="muted">Voice isn\'t available here. Type it instead.</span>'; }
    });
  }

  let priceQuery = '';
  function renderPrices() {
    const rows = INGREDIENTS.filter((i) => !priceQuery || i.aliases.some((a) => a.includes(priceQuery)) || i.name.toLowerCase().includes(priceQuery));
    const cats = {};
    for (const i of rows) (cats[i.cat] = cats[i.cat] || []).push(i);
    const unitLabel = (i) => ({ kg: '/kg', L: '/L', pc: '/pc', bundle: '/tali', can: '/can', pack: '/pack' }[i.unit]);
    const counts = {};
    for (const i of INGREDIENTS) { const t = priceInfo(i.id).tier; counts[t] = (counts[t] || 0) + 1; }
    $('#view').innerHTML = `<section class="screen" aria-label="Market prices">
      <div>
        <p class="eyebrow">${esc(S.market)} · free for everyone</p>
        <h1 class="display h-sec" style="margin-top:4px">Today's prices</h1>
      </div>
      <div class="banner"><span><b>Sample prices for this demo.</b> Swap in the team's dated market data before showing real numbers.</span></div>
      <div class="panel">
        <h2 class="display" style="font-size:18px">Where each price comes from</h2>
        <p class="small muted" style="margin-top:4px">Kain uses the first source that has a recent price, in this order.</p>
        <div class="divide" style="margin-top:8px">${[['contrib', 'Contributor or your log'], ['da_market', 'DA, nearest market'], ['da_avg', 'DA, regional average'], ['estimate', 'Labeled estimate']].map(([t, l], i) => `<div class="li"><div class="row" style="gap:10px"><b class="num" style="width:16px">${i + 1}</b>${tierChip(t)}<span class="small">${esc(l)}</span></div><div class="r small muted">${(counts[t] || 0) + (t === 'contrib' ? counts.log || 0 : 0)} items</div></div>`).join('')}</div>
      </div>
      <input class="textin" id="priceSearch" placeholder="Search kamatis, itlog, bangus…" value="${esc(priceQuery)}" aria-label="Search prices">
      <div class="panel" style="padding-top:2px">${Object.keys(CATS).filter((c) => cats[c]).map((c) => `<div class="cat">${esc(CATS[c])}</div><div class="divide">${cats[c].map((i) => {
        const p = priceInfo(i.id);
        return `<div class="li"><div style="min-width:0"><div class="t">${esc(i.name)}</div><div class="s row wrap" style="gap:6px;margin-top:2px">${tierChip(p.tier)}<span>${fmtDate(p.date)}</span></div></div><div style="text-align:right"><div class="r">${peso2(p.price)}<span class="small muted" style="font-weight:700">${unitLabel(i)}</span></div><div style="margin-top:3px">${changeChip((p.price - p.prev) / p.prev)}</div></div></div>`;
      }).join('')}</div>`).join('') || '<p class="small muted" style="padding:12px 0">No match. Try the Filipino or English name.</p>'}</div>
      <p class="small muted" style="text-align:center">Change shows the last 4 weeks.</p>
    </section>`;
    const ps = $('#priceSearch');
    ps.addEventListener('input', () => { priceQuery = ps.value.trim().toLowerCase(); const pos = ps.selectionStart; renderPrices(); const n = $('#priceSearch'); n.focus(); n.setSelectionRange(pos, pos); });
  }

  /* ---------- about sheet ---------- */
  function openAbout() {
    const el = document.createElement('div');
    el.className = 'sheet';
    el.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-labelledby="abT">
      <div class="row" style="justify-content:space-between"><h2 class="display" id="abT" style="font-size:22px">About this MVP</h2><button class="iconbtn" id="abX" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <p>Kain turns local market prices and FNRI nutrition standards into a meal plan for families and menu costing for small eateries. Logged purchases keep prices fresh for everyone.</p>
      <div><p class="eyebrow">Working in this demo</p><ul class="small">
        <li>Exact-budget meal planner (searches every breakfast, lunch and dinner combination per day)</li>
        <li>Shopping list with costs and nutrition coverage</li>
        <li>Eatery costing, free for 3 dishes, with a Business plan preview</li>
        <li>Purchase log by typing or voice, with unusual prices flagged</li>
        <li>Price sources with fallback order and dates</li></ul></div>
      <div><p class="eyebrow">Sample, not real yet</p><ul class="small">
        <li>Prices, dates and price changes are illustrative</li>
        <li>Nutrient values are approximate; use FNRI PhilFCT values next</li>
        <li>Daily needs use simplified adult and child targets</li></ul></div>
      <div><p class="eyebrow">Next</p><ul class="small">
        <li>Load the team's dated price data and sync it per market</li>
        <li>Receipt scanning, offline install, and GCash/Maya billing</li>
        <li>Pilot: compare Kain plans with usual meals at the same budget</li></ul></div>
      <button class="btn" id="abOk">Got it</button>
    </div>`;
    document.body.appendChild(el);
    const close = () => el.remove();
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    $('#abX', el).addEventListener('click', close);
    $('#abOk', el).addEventListener('click', close);
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
    $('#abX', el).focus();
  }

  /* ---------- shell ---------- */
  function render() {
    document.querySelectorAll('.tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === S.tab)));
    if (S.tab === 'plan') renderPlan();
    else if (S.tab === 'eatery') renderEatery();
    else if (S.tab === 'log') renderLog();
    else renderPrices();
  }
  document.querySelectorAll('.tabs [data-tab]').forEach((b) => b.addEventListener('click', () => { S.tab = b.dataset.tab; save(); render(); window.scrollTo(0, 0); }));
  const msel = $('#market');
  msel.innerHTML = MARKETS.map((m) => `<option ${m === S.market ? 'selected' : ''}>${esc(m)}</option>`).join('');
  msel.addEventListener('change', () => { S.market = msel.value; save(); render(); toast(`Prices for ${S.market}`); });
  $('#infoBtn').addEventListener('click', openAbout);
  const hashTab = (location.hash || '').slice(1);
  if (['plan', 'eatery', 'log', 'prices'].includes(hashTab)) S.tab = hashTab;
  render();

  // Expose pure functions for testing.
  window.__kain = { makePlan, parseLog, servingCost, spikes, substitutes, priceInfo, state: () => S };
})();
