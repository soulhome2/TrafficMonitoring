(function () {
  const D = window.DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (id) => document.getElementById(id);
  const icons = () => window.lucide && lucide.createIcons();
  const ALL_CLS = D.CLASSES.map((c) => c.id);

  /* ============================== formatting ============================== */
  const loc = () => (LANG === "en" ? "en-GB" : "ru-RU");
  const fmtN = (n) => new Intl.NumberFormat(loc()).format(Math.round(n));
  const fmtP = (x, d = 1) => new Intl.NumberFormat(loc(), { maximumFractionDigits: d, minimumFractionDigits: d }).format(x * 100) + "%";
  const pad = (n) => String(n).padStart(2, "0");
  const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const hms = (d) => `${hm(d)}:${pad(d.getSeconds())}`;
  const dm = (d) => new Intl.DateTimeFormat(loc(), { day: "2-digit", month: LANG === "en" ? "short" : "2-digit" }).format(d);
  const isToday = (d) => d.toDateString() === D.NOW.toDateString();
  const dt = (d, sec) => (isToday(d) ? "" : dm(d) + " ") + (sec ? hms(d) : hm(d));
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const chName = (id) => t("ch." + id);
  const chCode = (id) => "CH-0" + id.slice(2);
  const clsName = (id, full) => t("cls." + id + (full ? ".full" : ""));
  const dirName = (d) => t("dir." + d);
  const laneName = (n) => t("lane.n", { n });

  function glyphPaths(cls) {
    const w = (x, r = 3) => `<circle cx="${x}" cy="18" r="${r}" class="g-wheel"/>`;
    switch (cls) {
      case "car": return `<path d="M4 16 L8 10 Q10 8 14 8 L28 8 Q32 8 35 11 L40 12 Q44 13 44 16 L44 18 L4 18 Z" class="g-body"/>${w(12)}${w(36)}`;
      case "lcv": return `<path d="M4 6 H32 L38 9 L44 13 V18 H4 Z" class="g-body"/>${w(12)}${w(36)}`;
      case "truckM": return `<path d="M4 4 H30 V18 H4Z M31 8 H38 L44 13 V18 H31Z" class="g-body"/>${w(10)}${w(38)}`;
      case "truckH": return `<path d="M2 3 H32 V18 H2Z M33 7 H39 L45 12 V18 H33Z" class="g-body"/>${w(8)}${w(15)}${w(40)}`;
      case "semi": return `<path d="M1 4 H33 V16 H1Z M34 6 H40 L46 11 V18 H34 Z" class="g-body"/>${w(6, 2.6)}${w(12, 2.6)}${w(27, 2.6)}${w(41, 2.6)}`;
      case "bus": return `<path d="M3 6 Q3 4 6 4 H42 Q45 4 45 8 V18 H3Z" class="g-body"/><path d="M7 7 H40 V11 H7Z" class="g-win"/>${w(11)}${w(37)}`;
      case "moto": return `<circle cx="10" cy="17" r="5" class="g-ring"/><circle cx="37" cy="17" r="5" class="g-ring"/><path d="M10 17 L19 10 H30 L37 17 M19 10 L23 5 H28" class="g-line"/>`;
      case "bike": return `<circle cx="10" cy="17" r="5.5" class="g-ring thin"/><circle cx="37" cy="17" r="5.5" class="g-ring thin"/><path d="M10 17 L18 9 H30 L37 17 M18 9 L23 17 L30 9 M17 6 H21" class="g-line thin"/>`;
      case "special": return `<path d="M7 10 H34 V18 H7Z M27 4 H35 V10 H27Z" class="g-body"/><path d="M10 11 L42 2" class="g-line"/>${w(14, 3.5)}${w(30, 3.5)}`;
    }
    return "";
  }
  const glyph = (cls, extra = "") => `<svg viewBox="0 0 48 24" class="glyph ${extra}" style="color:${D.CLS[cls].color}" aria-hidden="true">${glyphPaths(cls)}</svg>`;
  const dot = (cls) => `<i class="cdot" style="background:${D.CLS[cls].color}"></i>`;

  function thumb(rec) {
    const c = D.CLS[rec.cls].color;
    const k = rec.cls === "moto" || rec.cls === "bike" ? 1.25 : 1.7;
    const tx = 80 - 24 * k, ty = 52 - 18 * k;
    return `<svg viewBox="0 0 160 90" class="thumb-svg" aria-hidden="true">
      <rect width="160" height="90" class="th-bg"/><path d="M30 90 L70 20 M130 90 L90 20" class="th-road"/><path d="M80 90 L80 20" class="th-dash"/>
      <g transform="translate(${tx} ${ty}) scale(${k})" style="color:${c}">${glyphPaths(rec.cls)}</g>
      <rect x="${tx - 6}" y="${ty - 8}" width="${48 * k + 12}" height="${24 * k + 12}" rx="2" class="th-box" style="stroke:${c}"/>
      <text x="${tx - 6}" y="${ty - 12}" class="th-lbl">#${rec.id}</text></svg>`;
  }

  let toastTimer;
  function toast(msg) {
    const tEl = el("toast"); tEl.textContent = msg; tEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (tEl.hidden = true), 3200);
  }

  /* ============================== shared context (9.2) ============================== */
  const S = {
    view: "overview",
    ctx: { ch: "ch1", laneIdx: null, cls: [], period: "day", from: null, to: null },
  };
  function setCtx(p, silent) { Object.assign(S.ctx, p); renderCtx(); }
  function periodLabel(o) {
    if (o.period === "custom" && o.from && o.to) return t("ctx.period.custom", { from: dm(new Date(o.from + "T00:00")), to: dm(new Date(o.to + "T00:00")) });
    return t("ctx.period." + (o.period === "custom" ? "day" : o.period));
  }
  function clsSummary(list) {
    if (!list.length || list.length === ALL_CLS.length) return t("grp.all");
    if (list.length <= 2) return list.map((c) => clsName(c)).join(", ");
    return t("ctx.classes", { n: list.length });
  }
  function renderCtx() {
    const c = S.ctx;
    const items = [
      ["cctv", c.ch ? chName(c.ch) : t("search.chipAllCh")],
      c.ch && c.laneIdx != null ? ["arrow-up-down", laneName(D.CH[c.ch].lanes[c.laneIdx].n)] : null,
      ["car", clsSummary(c.cls)],
      ["calendar", periodLabel(c)],
    ].filter(Boolean);
    el("ctxBar").innerHTML = `<span class="ctx-lbl">${t("ctx.label")}</span>` +
      items.map(([i, s]) => `<span class="ctx-chip"><i data-lucide="${i}"></i>${s}</span>`).join("");
    icons();
  }

  /* ============================== navigation ============================== */
  const NAV = [
    ["overview", "layout-dashboard"], ["video", "cctv"], ["search", "scan-search"],
    ["report", "chart-column"], ["events", "siren"], ["scene", "spline"],
  ];
  function renderNav() {
    const open = D.EVENTS.filter((e) => e.status === "new").length;
    $$("[data-nav]").forEach((box) => {
      box.innerHTML = NAV.map(([v, i]) => `<a class="nav-item" href="#${v}" data-goto="${v}" ${S.view === v ? 'aria-current="page"' : ""}>
        <i data-lucide="${i}"></i><span>${t("nav." + v)}</span>${v === "events" && open ? `<span class="badge badge-warning ml-auto">${open}</span>` : ""}</a>`).join("");
    });
  }
  function go(view, opts = {}) {
    S.view = view;
    $$(".view").forEach((s) => (s.hidden = s.dataset.view !== view));
    el("pageTitle").textContent = t("nav." + view);
    renderNav();
    if (!opts.keep) applyCtxTo(view);
    RENDER[view]();
    if (history.replaceState) history.replaceState(null, "", "#" + view);
    document.querySelectorAll(".drawer[data-open]").forEach((d) => window.kit.closeDrawer(d));
    icons();
    el("linePop").hidden = true;
    if (view === "video") startLoop(); else stopLoop();
    document.querySelector(".views").scrollTop = 0;
  }
  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-goto]");
    if (g) { e.preventDefault(); go(g.dataset.goto); }
  });

  function applyCtxTo(view) {
    const c = S.ctx;
    if (view === "search") {
      Object.assign(SR.f, { cls: c.cls.slice(), period: c.period, from: c.from, to: c.to, range: null });
      if (c.ch) { SR.f.scope = "one"; SR.f.ch = c.ch; SR.f.laneIdx = c.laneIdx == null ? "" : String(c.laneIdx); }
      else { SR.f.scope = "all"; SR.f.laneIdx = ""; }
      SR.page = 1;
    }
    if (view === "report") {
      RP.chs = c.ch ? [c.ch] : D.CHANNELS.map((x) => x.id);
      RP.lanes = null;
      if (c.ch && c.laneIdx != null) RP.lanes = new Set([`${c.ch}:${c.laneIdx}`]);
      RP.cls = c.cls.length ? c.cls.slice() : ALL_CLS.slice();
      RP.period = c.period; RP.from = c.from; RP.to = c.to;
      fixStep();
    }
    if (view === "video" && c.ch && !V.focus) V.ch = c.ch;
  }

  /* ============================== periods & aggregation ============================== */
  function periodDays(o) {
    if (o.period === "week") return [0, 1, 2, 3, 4, 5, 6];
    if (o.period === "month") return Array.from({ length: 30 }, (_, i) => i);
    if (o.period === "custom" && o.from && o.to) {
      const base = new Date(D.NOW); base.setHours(0, 0, 0, 0);
      const a = Math.round((base - new Date(o.from + "T00:00")) / 864e5), b = Math.round((base - new Date(o.to + "T00:00")) / 864e5);
      const lo = Math.max(0, Math.min(a, b)), hi = Math.min(59, Math.max(a, b));
      return Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);
    }
    return [0];
  }
  function periodDates(period) {
    const n = period === "week" ? 7 : period === "month" ? 30 : 1;
    const to = new Date(D.NOW), from = new Date(D.NOW); from.setDate(from.getDate() - n + 1);
    return [iso(from), iso(to)];
  }
  function slotStart(day, hour, q) { const d = D.dayDate(day); d.setHours(hour, q ? q * 15 : 0, 0, 0); return d; }

  /* ============================== OVERVIEW ============================== */
  function laneSum(chId, day, hours, clsList = ALL_CLS) {
    let s = 0; const ch = D.CH[chId];
    ch.lanes.forEach((_, i) => clsList.forEach((c) => hours.forEach((h) => (s += D.count(chId, i, c, day, h)))));
    return s;
  }
  const H24 = Array.from({ length: 24 }, (_, i) => i);
  function renderOverview() {
    const byCls = Object.fromEntries(ALL_CLS.map((c) => [c, 0]));
    const byHour = H24.map(() => Object.fromEntries(ALL_CLS.map((c) => [c, 0])));
    D.CHANNELS.forEach((ch) => ch.lanes.forEach((_, i) => ALL_CLS.forEach((c) => H24.forEach((h) => {
      const v = D.count(ch.id, i, c, 0, h); byCls[c] += v; byHour[h][c] += v;
    }))));
    const total = Object.values(byCls).reduce((a, b) => a + b, 0);
    const nowH = D.NOW.getHours(), frac = D.NOW.getMinutes() / 60;
    let yest = 0;
    D.CHANNELS.forEach((ch) => { yest += laneSum(ch.id, 1, H24.filter((h) => h < nowH)); yest += frac * laneSum(ch.id, 1, [nowH]); });
    const delta = (total - yest) / yest;
    const online = D.CHANNELS.filter((c) => c.offlineFrom == null);
    const avgSpeed = online.reduce((a, c) => a + c.speed, 0) / online.length;
    const openEv = D.EVENTS.filter((e) => e.status === "new" || e.status === "work");
    const kpis = [
      [t("ov.kpiToday"), fmtN(total), `<span class="badge ${delta >= 0 ? "badge-info" : "badge-warning"}">${t("ov.vsYesterday", { d: (delta >= 0 ? "+" : "") + fmtP(delta) })}</span>`, t("ov.kpiTodayHint")],
      [t("ov.kpiSemi"), fmtP(byCls.semi / total), "", t("ov.kpiSemiHint", { n: fmtN(byCls.semi) })],
      [t("ov.kpiSpeed"), t("ov.kmh", { n: Math.round(avgSpeed) }), "", t("ov.kpiSpeedHint", { n: Math.round(avgSpeed * 1.27) })],
      [t("ov.kpiChannels"), `${online.length}<span class="kpi-of">/${D.CHANNELS.length}</span>`, `<span class="badge badge-danger">${t("ch.offline")}: 1</span>`, t("ov.kpiChannelsHint", { name: chName("ch6") })],
      [t("ov.kpiEvents"), openEv.length, "", t("ov.kpiEventsHint", { n: openEv.filter((e) => e.prio === "high").length })],
    ];
    el("ovKpi").innerHTML = kpis.map(([l, v, b, h]) => `<div class="card p-4"><div class="text-label text-fg-muted">${l}</div>
      <div class="kpi-line"><span class="kpi-value">${v}</span>${b}</div><div class="text-caption text-fg-subtle mt-1">${h}</div></div>`).join("");

    el("ovLegend").innerHTML = legend(ALL_CLS);
    el("ovChart").innerHTML = stackedBars(byHour.map((row, h) => ({
      label: pad(h), row, title: `${pad(h)}:00`, future: h > nowH, partial: h === nowH, drill: { day: 0, hour: h },
    })), ALL_CLS, { every: 3 });

    const sorted = ALL_CLS.slice().sort((a, b) => byCls[b] - byCls[a]);
    let acc = 0;
    const cone = sorted.map((c) => { const a0 = acc; acc += byCls[c] / total; return `${D.CLS[c].color} ${a0 * 360}deg ${acc * 360}deg`; }).join(",");
    el("ovMix").innerHTML = `<div class="donut" style="background:conic-gradient(${cone})"><div class="donut-hole"><b>${fmtN(total)}</b><span>${t("ov.today")}</span></div></div>
      <ul class="mix-list">${sorted.map((c) => `<li><button class="mix-row" data-drill-cls="${c}">${dot(c)}<span class="truncate">${clsName(c, true)}</span>
      <span class="num">${fmtN(byCls[c])}</span><span class="num text-fg-muted">${fmtP(byCls[c] / total)}</span></button></li>`).join("")}</ul>`;

    el("ovChCount").textContent = `${online.length}/${D.CHANNELS.length}`;
    el("ovChannels").innerHTML = `<thead><tr><th>${t("ov.colCh")}</th><th>${t("ov.colStatus")}</th><th class="num">${t("ov.colHour")}</th><th class="num">${t("ov.colSpeed")}</th><th>${t("ov.colLoad")}</th><th></th></tr></thead><tbody>` +
      D.CHANNELS.map((ch) => {
        const off = ch.offlineFrom != null;
        const lastH = off ? null : laneSum(ch.id, 0, [nowH - 1]);
        const load = { free: "badge-success", dense: "badge-warning", jam: "badge-danger" }[ch.load];
        return `<tr><td><div class="text-body-md-medium">${chName(ch.id)}</div><div class="text-caption text-fg-muted">${chCode(ch.id)} · ${t("ch.lanes", { n: ch.lanes.length })}${ch.lpr ? " · " + t("ch.lpr") : ""}</div></td>
          <td>${off ? `<span class="badge badge-danger">${t("ch.offline")}</span>` : `<span class="badge badge-success">${t("ch.online")}</span>`}</td>
          <td class="num">${off ? "—" : fmtN(lastH)}</td><td class="num">${off ? "—" : t("ov.kmh", { n: ch.speed })}</td>
          <td>${off ? "—" : `<span class="badge ${load}">${t("load." + ch.load)}</span>`}</td>
          <td class="text-right nowrap"><button class="btn btn-subtle h-7 px-2 text-label" data-open-video="${ch.id}"><i data-lucide="cctv"></i>${t("ov.video")}</button>
          <button class="btn btn-subtle h-7 px-2 text-label" data-open-report="${ch.id}"><i data-lucide="chart-column"></i>${t("ov.report")}</button></td></tr>`;
      }).join("") + "</tbody>";

    el("ovEvents").innerHTML = openEv.slice(0, 6).map(evItem).join("");
  }
  function evItem(e) {
    const pr = { high: "bg-red", medium: "bg-orange", low: "bg-teal" }[e.prio];
    return `<li class="ev-item"><i class="ev-bar ${pr}"></i><div class="min-w-0 flex-1"><div class="text-body-md-medium truncate">${t("evt." + e.type)}</div>
      <div class="text-caption text-fg-muted truncate">${e.id} · ${chName(e.ch)} · ${laneName(D.CH[e.ch].lanes[e.laneIdx].n)} · ${hm(e.start)}</div></div>
      <button class="btn btn-outline h-7 px-2 text-label" data-open-event="${e.id}">${t("common.open")}</button></li>`;
  }
  function legend(list) { return list.map((c) => `<span class="lg-item">${dot(c)}${clsName(c)}</span>`).join(""); }

  /** cols: [{label,row:{cls:n},title,future,partial,drill,peak}] */
  function stackedBars(cols, clsList, opt = {}) {
    const tot = cols.map((c) => clsList.reduce((a, k) => a + (c.row[k] || 0), 0));
    const max = Math.max(1, ...tot);
    const nice = niceMax(max);
    const ticks = [0, nice / 2, nice];
    const every = opt.every || Math.ceil(cols.length / 12);
    const dense = cols.length > 48 ? "dense" : "";
    return `<div class="bars-y">${ticks.map((v) => `<span style="bottom:${(v / nice) * 100}%">${fmtN(v)}</span>`).join("")}</div>
      <div class="bars-plot"><div class="bars-area">${ticks.map((v) => `<i class="grid-line" style="bottom:${(v / nice) * 100}%"></i>`).join("")}
      <div class="bars-cols ${dense}">${cols.map((c, i) => `<div class="bcol ${c.future ? "future" : ""} ${c.peak ? "peak" : ""}">
        <div class="bstack-wrap" style="height:${(tot[i] / nice) * 100}%">${c.peak ? `<span class="peak-tag">${t("report.peak")}</span>` : ""}
        <div class="bstack">${clsList.map((k) => c.row[k] ? `<button class="bseg" style="flex:${c.row[k]} 1 0;background:${D.CLS[k].color}" title="${c.title} · ${clsName(k)}: ${fmtN(c.row[k])} / ${fmtN(tot[i])}" data-drill='${JSON.stringify({ ...c.drill, cls: k })}'></button>` : "").join("")}</div></div>
        <span class="bx ${i % every ? "hide" : ""}">${c.label}</span></div>`).join("")}</div></div></div>`;
  }
  function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p; return 10 * p; }

  /* ============================== VIDEO & TRAJECTORIES (2.4–2.6) ============================== */
  const V = { ch: "ch1", mode: "live", tracks: "current", byClass: true, markup: true, focus: null, playing: true, still: false, t0: 0, dur: 60, t: 0, offset: 0, selFeed: null };
  const YB = 540, YH = 150, X0b = 110, X1b = 850, X0t = 425, X1t = 545, PL = 0.3, LOOP = 300;
  const W0 = X1b - X0b, WT = X1t - X0t;
  const ey = (p) => YB - (YB - YH) * p;
  const ex = (n, i, p) => { const xb = X0b + (W0 * i) / n, xt = X0t + (WT * i) / n; return xb + (xt - xb) * p; };
  const sc = (p) => 1 - (1 - WT / W0) * p;
  const pOf = (dir, u) => (dir === "in" ? 1 - Math.pow(1 - u, 1.6) : 1 - Math.pow(u, 1.6));
  const uLine = (dir) => (dir === "in" ? 1 - Math.pow(1 - PL, 1 / 1.6) : Math.pow(1 - PL, 1 / 1.6));
  const DIM = { car: [.5, .72], lcv: [.56, .86], truckM: [.62, .92], truckH: [.66, .96], semi: [.7, 1.02], bus: [.68, .98], moto: [.17, 1.5], bike: [.15, 1.5], special: [.72, .86] };
  const CONT = ["#9b4b3a", "#2f6e8f", "#6b7d3a", "#8a6a2c", "#5a4f8f", "#7c3b5d"];

  const schedCache = {};
  function sched(chId) {
    if (schedCache[chId]) return schedCache[chId];
    const ch = D.CH[chId], list = [];
    ch.lanes.forEach((lane, i) => {
      let tt = D.rnd(chId, i, "s0") * 3, k = 0;
      while (tt < LOOP) {
        const r = D.rnd(chId, i, k, "cls"); let acc = 0, cls = "car";
        for (const c of ALL_CLS) { acc += ch.mix[c] || 0; if (r <= acc) { cls = c; break; } }
        const dur = (cls === "semi" || cls === "special" ? 8.6 : cls === "moto" || cls === "bike" ? 6.4 : 7.4) * (0.94 + 0.12 * D.rnd(chId, i, k, "d"));
        list.push({ key: `${chId}|v|${i}|${k}`, laneIdx: i, dir: lane.dir, cls, spawn: tt, dur });
        tt += 2.6 + 4.2 * D.rnd(chId, i, k, "gap"); k++;
      }
    });
    return (schedCache[chId] = list);
  }
  const recCache = new Map();
  function instRec(chId, s, loopK, clock) {
    const seed = `${s.key}|${loopK}`;
    const hit = recCache.get(seed);
    if (!hit || Math.abs(hit.ts - clock) > 2000) {
      const r = D.record(seed, chId, s.laneIdx, s.cls, clock);
      r.dur = +s.dur.toFixed(1);
      recCache.set(seed, r);
    }
    return recCache.get(seed);
  }
  /** Scene vehicles alive at scene time T (seconds). Clock maps scene time to wall time. */
  function alive(chId, T, clockAt) {
    const out = [];
    for (const s of sched(chId)) {
      const k = Math.floor((T - s.spawn) / LOOP), sp = s.spawn + k * LOOP, u = (T - sp) / s.dur;
      if (u >= 0 && u <= 1) out.push({ s, u, k, sp });
      else if (V.tracks === "all" && u > 1 && T - sp - s.dur < 45) out.push({ s, u: 1.0001, k, sp, gone: true });
    }
    return out.map((o) => ({ ...o, rec: instRec(chId, o.s, o.k, clockAt(o.sp + uLine(o.s.dir) * o.s.dur)) }));
  }

  function sceneBg(chId, opt = {}) {
    const ch = D.CH[chId], n = ch.lanes.length;
    let s = `<defs><pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 V10" class="sc-hatch"/></pattern>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a222c"/><stop offset="1" stop-color="#2b3540"/></linearGradient></defs>
      <rect width="960" height="${YH + 4}" fill="url(#sky)"/><rect y="${YH}" width="960" height="${YB - YH}" class="sc-ground"/>`;
    // port skyline: cranes and container stacks
    const r = (k) => D.rnd(chId, "sky", k);
    for (let i = 0; i < 9; i++) {
      const x = i < 5 ? 10 + i * 70 + r(i) * 20 : 580 + (i - 5) * 92 + r(i) * 20, w = 46 + r(i + 9) * 30, h = 10 + Math.floor(r(i + 19) * 4) * 9;
      s += `<rect x="${x}" y="${YH - h}" width="${w}" height="${h}" fill="${CONT[i % CONT.length]}" opacity=".55"/>`;
    }
    [[150, 64], [700, 58], [860, 70]].forEach(([x, h]) => {
      s += `<path d="M${x} ${YH} V${YH - h} M${x + 34} ${YH} V${YH - h} M${x - 22} ${YH - h} H${x + 92} M${x - 10} ${YH - h} L${x + 17} ${YH - h - 18} L${x + 44} ${YH - h}" class="sc-crane"/>`;
    });
    s += `<polygon points="${X0b},${YB} ${X1b},${YB} ${X1t},${YH} ${X0t},${YH}" class="sc-road"/>`;
    s += `<polygon points="${X1b},${YB} 960,${YB} 960,${YB - 120} ${X1t + 10},${YH}" class="sc-shoulder"/>`;
    for (let i = 0; i <= n; i++) {
      const edge = i === 0 || i === n;
      const dirChange = !edge && ch.lanes[i - 1].dir !== ch.lanes[i].dir;
      s += `<line x1="${ex(n, i, 0)}" y1="${YB}" x2="${ex(n, i, 1)}" y2="${YH}" class="${edge ? "sc-edge" : dirChange ? "sc-solid" : "sc-dash"}"/>`;
    }
    if (opt.markup !== false) {
      const hl = opt.highlight;
      // exclusion zone
      s += `<polygon points="${X1b + 20},${YB} 960,${YB} 960,${YB - 110} ${X1t + 18},${YH + 6}" class="sc-excl ${hl === "excl" ? "hl" : ""}" fill="url(#hatch)"/>`;
      s += `<text x="905" y="${YB - 130}" class="sc-tag" text-anchor="end">EX</text>`;
      // detection zones (entry / exit)
      const z = (p0, p1, lanes, cls, label) => {
        if (!lanes.length) return "";
        const a = Math.min(...lanes), b = Math.max(...lanes) + 1;
        return `<polygon points="${ex(n, a, p0)},${ey(p0)} ${ex(n, b, p0)},${ey(p0)} ${ex(n, b, p1)},${ey(p1)} ${ex(n, a, p1)},${ey(p1)}" class="sc-zone ${cls} ${hl === "zone" ? "hl" : ""}"/>
          <text x="${ex(n, a, p1) + 6}" y="${ey(p1) + 16}" class="sc-tag">${label}</text>`;
      };
      const ins = ch.lanes.map((l, i) => (l.dir === "in" ? i : -1)).filter((i) => i >= 0);
      const outs = ch.lanes.map((l, i) => (l.dir === "out" ? i : -1)).filter((i) => i >= 0);
      s += z(0.5, 0.68, ins, "z-in", "Z1") + z(0.5, 0.68, outs, "z-out", "Z2");
      // lanes: number + direction painted near the bottom
      ch.lanes.forEach((l, i) => {
        const x = ex(n, i + 0.5, 0.06), y = ey(0.06);
        s += `<text x="${x}" y="${y}" class="sc-lane-no ${hl === "lane" ? "hl" : ""}" text-anchor="middle">${l.n} ${l.dir === "in" ? "↑" : "↓"}</text>`;
      });
      // counting lines L1..Ln (clickable, GoodVision)
      ch.lanes.forEach((l, i) => {
        const x1 = ex(n, i, PL) + 3, x2 = ex(n, i + 1, PL) - 3, y = ey(PL);
        const on = opt.hoverLane === i || (opt.selLane === i);
        s += `<g class="sc-line ${on ? "on" : ""} ${hl === "line" ? "hl" : ""}" data-lane="${i}">
          <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="sc-line-hit"/>
          <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="sc-line-vis"/>
          <circle cx="${(x1 + x2) / 2}" cy="${y}" r="6" class="sc-line-dot"/>
          <text x="${(x1 + x2) / 2}" y="${y + 26}" class="sc-line-lbl" text-anchor="middle">L${l.n}</text></g>`;
      });
    }
    return s;
  }

  function vehBox(lane, n, cls, p, rec, opt = {}) {
    const [kw, kh] = DIM[cls];
    const lw = W0 / n, s = sc(p), w = lw * kw * s, h = lw * kw * kh * s;
    const x = opt.x ?? ex(n, lane + 0.5, p), y = opt.y ?? ey(p);
    const col = opt.color || (V.byClass ? D.CLS[cls].color : "var(--one-accent-emphasis)");
    const rear = opt.dir === "in";
    let body = `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="${3 * s + 1}" class="vb"/>`;
    if (cls === "semi" || cls === "truckH" || cls === "truckM") body += `<rect x="${x - w / 2 + 2}" y="${y - h + 2}" width="${w - 4}" height="${h * (rear ? .78 : .45)}" fill="${CONT[rec.id % CONT.length]}" opacity=".9"/>`;
    if (!rear || cls === "car" || cls === "bus" || cls === "lcv") body += `<rect x="${x - w * .38}" y="${y - h * .86}" width="${w * .76}" height="${h * .3}" class="vb-win"/>`;
    if (cls !== "moto" && cls !== "bike") body += `<rect x="${x - w / 2 + 2}" y="${y - h * .22}" width="${w * .14}" height="${h * .08}" class="${rear ? "vb-tail" : "vb-head"}"/><rect x="${x + w / 2 - 2 - w * .14}" y="${y - h * .22}" width="${w * .14}" height="${h * .08}" class="${rear ? "vb-tail" : "vb-head"}"/>`;
    if (opt.dim) return `<g opacity=".45">${body}</g>`;
    const fs = Math.max(10, 13 * Math.min(1, s * 1.3));
    const label = `${clsName(cls)} #${rec.id}`;
    const lwid = label.length * fs * 0.56 + 10;
    return `<g class="veh" data-seed="${rec.seed}">${body}<rect x="${x - w / 2 - 3}" y="${y - h - 3}" width="${w + 6}" height="${h + 6}" class="vbox" style="stroke:${col}"/>
      <rect x="${x - w / 2 - 3}" y="${y - h - 5 - fs - 6}" width="${lwid}" height="${fs + 6}" rx="2" style="fill:${col}"/>
      <text x="${x - w / 2 + 2}" y="${y - h - 8}" class="vlbl" style="font-size:${fs}px">${label}</text></g>`;
  }
  function trackPts(lane, n, dir, u0, u1, opt = {}) {
    const pts = [], steps = Math.max(2, Math.ceil((u1 - u0) / 0.03));
    for (let j = 0; j <= steps; j++) {
      const u = u0 + ((u1 - u0) * j) / steps;
      let off = 0.5;
      if (opt.swerve) off = 0.5 + opt.swerve * Math.sin(Math.min(1, u * 1.4) * Math.PI / 2);
      const p = opt.reverse ? pOf(dir === "in" ? "out" : "in", u) : pOf(dir, u);
      pts.push([ex(n, lane + off, p), ey(p)]);
    }
    return pts;
  }
  const poly = (pts) => pts.map((q) => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ");
  function arrow(pts, col, size = 13) {
    if (pts.length < 2) return "";
    const [x2, y2] = pts[pts.length - 1], [x1, y1] = pts[Math.max(0, pts.length - 3)];
    const a = Math.atan2(y2 - y1, x2 - x1), s = size;
    const p1 = [x2 + Math.cos(a) * s * .6, y2 + Math.sin(a) * s * .6], p2 = [x2 + Math.cos(a + 2.5) * s, y2 + Math.sin(a + 2.5) * s], p3 = [x2 + Math.cos(a - 2.5) * s, y2 + Math.sin(a - 2.5) * s];
    return `<polygon points="${poly([p1, p2, p3])}" style="fill:${col}"/>`;
  }

  /** Full trajectory of one vehicle: passed solid (green) + ahead dashed (blue) — DataFromSky style. */
  function focusTrack(lane, n, dir, u, opt = {}) {
    let s = "";
    const passed = trackPts(lane, n, dir, 0, Math.max(0.001, u), opt);
    if (opt.ahead !== false && u < 1) {
      const ahead = trackPts(lane, n, dir, u, 1, opt);
      s += `<polyline points="${poly(ahead)}" class="tr-ahead"/>` + arrow(ahead, "var(--one-accent-emphasis)", 16);
    }
    s += `<polyline points="${poly(passed)}" class="tr-passed" style="${opt.color ? "stroke:" + opt.color : ""}"/>`;
    if (opt.ahead === false) s += arrow(passed, opt.color || "var(--one-palette-green)", 14);
    return s;
  }

  let loopId = null, lastFrame = 0, lastFeed = 0;
  const t0wall = performance.now();
  const liveT = () => (performance.now() - t0wall) / 1000 + 1200;
  const liveClock = (T) => new Date(D.NOW.getTime() + (T - 1200) * 1000);

  function sceneTime() { return V.mode === "live" ? liveT() : V.t0 + V.t; }
  function clockFn() {
    if (V.mode === "archive" && V.focus) {
      const f = V.focus, base = f.ts.getTime() - uLine(f.dir) * f.dur * 1000 - 2000; // focus spawns at t=2 s
      return (T) => new Date(base + (T - V.t0) * 1000);
    }
    if (V.mode === "archive") return (T) => liveClock(T);
    return liveClock;
  }

  function frame(now) {
    loopId = requestAnimationFrame(frame);
    if (now - lastFrame < 33) return;
    const dtSec = (now - lastFrame) / 1000; lastFrame = now;
    if (V.mode === "archive" && V.playing && !V.still) {
      V.t += Math.min(dtSec, 0.1);
      if (V.t >= V.dur) { V.t = V.dur; V.playing = false; syncPlay(); }
      el("tlRange").value = Math.round((V.t / V.dur) * 1000);
    }
    drawDyn();
    if (now - lastFeed > 600) { lastFeed = now; renderFeed(); }
  }
  function startLoop() { if (!loopId) { lastFrame = performance.now(); loopId = requestAnimationFrame(frame); } }
  function stopLoop() { if (loopId) cancelAnimationFrame(loopId); loopId = null; }

  function drawDyn() {
    const svg = el("scene"), ch = D.CH[V.ch], n = ch.lanes.length;
    const off = ch.offlineFrom != null && V.mode === "live";
    el("sceneOff").hidden = !off;
    const dyn = svg.querySelector("#dyn");
    if (!dyn) return;
    if (off) { dyn.innerHTML = ""; return; }
    const T = sceneTime(), clock = clockFn();
    let list = alive(V.ch, T, clock);
    if (V.focus) list = list.filter((o) => !(o.s.laneIdx === V.focus.laneIdx && Math.abs(o.sp - (V.t0 + 2)) < 9));
    let tracks = "", boxes = [];
    for (const o of list) {
      const { s, u } = o, p = pOf(s.dir, Math.min(1, u));
      const col = V.byClass ? D.CLS[s.cls].color : "var(--one-accent-emphasis)";
      if (o.gone) { tracks += `<polyline points="${poly(trackPts(s.laneIdx, n, s.dir, 0, 1))}" class="tr-old" style="stroke:${col}"/>`; continue; }
      if (V.tracks !== "off" && !V.still) {
        const pts = trackPts(s.laneIdx, n, s.dir, 0, u);
        tracks += `<polyline points="${poly(pts)}" class="tr-live" style="stroke:${col}"/>` + arrow(pts, col, 11);
      }
      boxes.push([p, vehBox(s.laneIdx, n, s.cls, p, o.rec, { dir: s.dir, dim: V.still })]);
    }
    if (V.focus) {
      const f = V.focus, u = (T - (V.t0 + 2)) / f.dur;
      if (u >= -0.05 && u <= 1.05) {
        const uu = Math.max(0, Math.min(1, u)), p = pOf(f.dir, uu);
        if (V.tracks !== "off" || V.still) tracks += focusTrack(f.laneIdx, n, f.dir, uu);
        if (u >= 0 && u <= 1) boxes.push([p - 0.0001, vehBox(f.laneIdx, n, f.cls, p, f, { dir: f.dir, color: "var(--one-palette-amber)" })]);
      }
    }
    boxes.sort((a, b) => b[0] - a[0]);
    dyn.innerHTML = tracks + boxes.map((b) => b[1]).join("");
    const c = clock(T);
    el("sceneOsd").innerHTML = `<span>${chCode(V.ch)} · ${chName(V.ch)}</span><span class="osd-r ${V.mode}">${V.mode === "live" ? "● " + t("video.osdLive") : t("video.osdArchive")} ${dt(c, true)}</span>`;
    if (V.mode === "archive") el("tlNow").textContent = hms(c);
  }

  function renderSceneStatic(hoverLane) {
    el("scene").innerHTML = sceneBg(V.ch, { markup: V.markup, hoverLane, selLane: S.ctx.ch === V.ch ? S.ctx.laneIdx : null }) + `<g id="dyn"></g>`;
    drawDyn();
  }

  function renderVideo() {
    el("chList").innerHTML = D.CHANNELS.map((ch) => {
      const off = ch.offlineFrom != null;
      return `<button class="ch-item" data-ch="${ch.id}" aria-selected="${ch.id === V.ch}">
        <span class="dot ${off ? "dot-bad" : "dot-ok"}"></span><span class="min-w-0 flex-1"><span class="ch-name truncate">${chName(ch.id)}</span>
        <span class="text-caption text-fg-muted">${chCode(ch.id)} · ${t("ch.lanes", { n: ch.lanes.length })}${ch.lpr ? " · " + t("ch.lpr") : ""}</span></span></button>`;
    }).join("");
    const ch = D.CH[V.ch];
    el("vInfo").textContent = V.focus && V.mode === "archive" ? t("video.focus", { id: V.focus.id, cls: clsName(V.focus.cls) }) : t("video.info", { lanes: ch.lanes.length, lines: ch.lanes.length });
    setSeg("vMode", V.mode); setSeg("vTracks", V.tracks);
    el("vByClass").checked = V.byClass; el("vMarkup").checked = V.markup;
    el("timeline").hidden = V.mode !== "archive";
    el("tlStill").disabled = !V.focus;
    el("tlStill").setAttribute("aria-pressed", String(V.still));
    if (V.mode === "archive") {
      const c = clockFn();
      el("tlFrom").textContent = hms(c(V.t0)); el("tlTo").textContent = hms(c(V.t0 + V.dur));
      el("tlRange").value = Math.round((V.t / V.dur) * 1000);
      syncPlay();
    }
    el("sceneLegend").innerHTML = V.mode === "archive" && V.focus
      ? `<span><i class="lg-line lg-passed"></i>${t("video.passed")}</span><span><i class="lg-line lg-ahead"></i>${t("video.ahead")}</span>`
      : `<span class="text-caption">${t("video.lineHint")}</span>`;
    renderSceneStatic();
    renderFeed(true);
    icons();
  }
  function syncPlay() { el("tlPlay").innerHTML = `<i data-lucide="${V.playing ? "pause" : "play"}"></i>`; icons(); }

  function renderFeed(force) {
    const ch = D.CH[V.ch];
    if (ch.offlineFrom != null && V.mode === "live") { el("feed").innerHTML = `<li class="empty"><i data-lucide="video-off"></i><div class="text-caption">${t("video.noSignal")}</div></li>`; if (force) icons(); updateFeedBtn(); return; }
    const T = sceneTime(), clock = clockFn(), items = [];
    for (const s of sched(V.ch)) {
      const ul = uLine(s.dir) * s.dur;
      for (let back = 0; back < 2; back++) {
        const k = Math.floor((T - s.spawn - ul) / LOOP) - back, tc = s.spawn + k * LOOP + ul;
        if (tc <= T && T - tc < 150) items.push({ tc, rec: instRec(V.ch, s, k, clock(tc - ul + uLine(s.dir) * s.dur)) });
      }
    }
    items.sort((a, b) => b.tc - a.tc);
    const top = items.slice(0, 12);
    const html = top.map(({ rec }) => `<li><button class="feed-item" data-rec="${rec.seed}" aria-selected="${V.selFeed === rec.seed}">${glyph(rec.cls)}
      <span class="min-w-0 flex-1"><span class="text-body-md-medium truncate">${clsName(rec.cls)} #${rec.id}</span>
      <span class="text-caption text-fg-muted">L${rec.lane} · ${dirName(rec.dir)} · ${rec.conf}%</span></span><span class="text-caption font-mono text-fg-muted">${hms(rec.ts)}</span></button></li>`).join("");
    if (el("feed").dataset.sig !== html) { el("feed").innerHTML = html; el("feed").dataset.sig = html; }
    top.forEach(({ rec }) => REC.set(rec.seed, rec));
    updateFeedBtn();
  }
  function updateFeedBtn() {
    const r = V.selFeed && REC.get(V.selFeed);
    $("#feedSearch span").textContent = r ? t("video.findClassN", { cls: clsName(r.cls) }) : t("video.findClass");
  }

  // video interactions
  el("chList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-ch]"); if (!b) return;
    V.ch = b.dataset.ch; V.focus = null; V.still = false; V.selFeed = null;
    if (V.mode === "archive") enterArchive(null);
    setCtx({ ch: V.ch, laneIdx: null });
    el("linePop").hidden = true; renderVideo();
  });
  el("vMode").addEventListener("kit:seg", (e) => { if (e.detail === "archive") enterArchive(V.focus); else { V.mode = "live"; V.focus = null; V.still = false; } renderVideo(); });
  el("vTracks").addEventListener("kit:seg", (e) => { V.tracks = e.detail; drawDyn(); });
  el("vByClass").addEventListener("change", (e) => { V.byClass = e.target.checked; drawDyn(); });
  el("vMarkup").addEventListener("change", (e) => { V.markup = e.target.checked; renderSceneStatic(); });
  el("tlPlay").addEventListener("click", () => { if (V.t >= V.dur) V.t = 0; V.playing = !V.playing; V.still = false; el("tlStill").setAttribute("aria-pressed", "false"); syncPlay(); });
  el("tlRange").addEventListener("input", (e) => { V.t = (e.target.value / 1000) * V.dur; V.still = false; drawDyn(); });
  el("tlStill").addEventListener("click", () => {
    V.still = !V.still;
    if (V.still && V.focus) { V.playing = false; V.t = 2 + uLine(V.focus.dir) * V.focus.dur; el("tlRange").value = Math.round((V.t / V.dur) * 1000); syncPlay(); }
    el("tlStill").setAttribute("aria-pressed", String(V.still)); drawDyn();
  });
  function enterArchive(focus) {
    V.mode = "archive"; V.focus = focus; V.still = false; V.playing = true;
    if (focus) { V.ch = focus.ch; V.t0 = 600 + (D.hash(focus.seed) % 2000); V.dur = focus.dur + 5; V.t = 0; }
    else { V.t0 = liveT() - 90; V.dur = 90; V.t = 0; }
  }
  function openArchive(rec) {
    REC.set(rec.seed, rec);
    enterArchive(rec);
    setCtx({ ch: rec.ch, laneIdx: rec.laneIdx, cls: [rec.cls] });
    closeDialogs();
    go("video", { keep: true });
    toast(t("toast.ctx", { what: `${chName(rec.ch)} · ${laneName(rec.lane)} · #${rec.id}` }));
  }

  // line click → popover with lane mini-report (GoodVision)
  const sceneSvg = el("scene");
  sceneSvg.addEventListener("mouseover", (e) => { const g = e.target.closest(".sc-line"); $$(".sc-line", sceneSvg).forEach((x) => x.classList.toggle("hover", x === g)); });
  sceneSvg.addEventListener("click", (e) => {
    const g = e.target.closest(".sc-line");
    if (g) { openLinePop(+g.dataset.lane, e); return; }
    const v = e.target.closest(".veh");
    if (v) { const r = REC.get(v.dataset.seed) || recCache.get(v.dataset.seed) || (V.focus && V.focus.seed === v.dataset.seed ? V.focus : null); if (r) openVehicle(r); return; }
    el("linePop").hidden = true;
  });
  function openLinePop(i, ev) {
    const ch = D.CH[V.ch], lane = ch.lanes[i], nowH = D.NOW.getHours();
    const hours = [nowH - 5, nowH - 4, nowH - 3, nowH - 2, nowH - 1, nowH];
    const cols = hours.map((h) => ({ label: pad(h), title: `${pad(h)}:00`, row: Object.fromEntries(ALL_CLS.map((c) => [c, D.count(V.ch, i, c, 0, h)])), drill: { day: 0, hour: h, ch: V.ch, laneIdx: i }, partial: h === nowH }));
    const total = cols.reduce((a, c) => a + ALL_CLS.reduce((x, k) => x + c.row[k], 0), 0);
    setCtx({ ch: V.ch, laneIdx: i });
    renderSceneStatic();
    const pop = el("linePop");
    pop.innerHTML = `<div class="flex items-center gap-2"><div class="min-w-0"><div class="text-heading-sm">${t("video.lineTitle", { n: lane.n })}</div>
      <div class="text-caption text-fg-muted">${t("video.lineSub", { dir: dirName(lane.dir) })} · ${fmtN(total)}</div></div>
      <button class="btn btn-icon ml-auto" data-close-pop aria-label="${t("common.close")}"><i data-lucide="x"></i></button></div>
      <div class="bars bars-mini">${stackedBars(cols, ALL_CLS, { every: 1 })}</div>
      <div class="flex gap-2 mt-2"><button class="btn btn-primary" data-lane-report="${i}"><i data-lucide="chart-column"></i>${t("video.lineReport")}</button>
      <button class="btn btn-outline" data-lane-search="${i}"><i data-lucide="search"></i>${t("video.lineSearch")}</button></div>`;
    pop.hidden = false;
    const wrap = el("sceneWrap").getBoundingClientRect(), f = Math.min(wrap.width / 960, wrap.height / 540);
    const ox = (wrap.width - 960 * f) / 2, oy = (wrap.height - 540 * f) / 2;
    const x = ox + ex(ch.lanes.length, i + 0.5, PL) * f, y = oy + ey(PL) * f;
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(wrap.width - pw - 8, x + 24)) + "px";
    pop.style.top = Math.max(8, y - ph - 24) + "px";
    icons();
  }
  el("linePop").addEventListener("click", (e) => {
    if (e.target.closest("[data-close-pop]")) { el("linePop").hidden = true; return; }
    const r = e.target.closest("[data-lane-report]"), s = e.target.closest("[data-lane-search]");
    if (r) toLaneReport(V.ch, +r.dataset.laneReport);
    if (s) toSearch({ ch: V.ch, laneIdx: +s.dataset.laneSearch, cls: S.ctx.cls });
  });
  el("feed").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rec]"); if (!b) return;
    V.selFeed = b.dataset.rec; const r = REC.get(V.selFeed);
    setCtx({ cls: [r.cls] }); renderFeed(); openVehicle(r);
  });
  el("feedSearch").addEventListener("click", () => {
    const r = V.selFeed && REC.get(V.selFeed);
    toSearch({ ch: V.ch, laneIdx: null, cls: r ? [r.cls] : S.ctx.cls });
  });

  /* ============================== cross-view handoffs ============================== */
  const REC = new Map();
  function resetAttrs() { Object.assign(SR.f, { dir: "", line: "", trailer: false, body: "", make: "" }); }
  function toSearch({ ch, laneIdx, cls, period, range }) {
    setCtx({ ch, laneIdx: laneIdx == null ? null : laneIdx, cls: cls || [], period: period || S.ctx.period });
    closeDialogs(); resetAttrs();
    go("search");
    if (range) { SR.f.range = range; renderSearch(); }
    toast(t("toast.ctx", { what: [ch ? chName(ch) : t("search.chipAllCh"), laneIdx != null && ch ? laneName(D.CH[ch].lanes[laneIdx].n) : null, clsSummary(cls || [])].filter(Boolean).join(" · ") }));
  }
  function toLaneReport(ch, laneIdx, cls) {
    setCtx({ ch, laneIdx, cls: cls || S.ctx.cls });
    closeDialogs();
    go("report");
    toast(t("toast.ctx", { what: `${chName(ch)} · ${laneName(D.CH[ch].lanes[laneIdx].n)}` }));
  }
  function closeDialogs() { $$("dialog[open]").forEach((d) => d.close()); el("linePop").hidden = true; }

  document.addEventListener("click", (e) => {
    const v = e.target.closest("[data-open-video]");
    if (v) { V.ch = v.dataset.openVideo; V.mode = "live"; V.focus = null; setCtx({ ch: V.ch, laneIdx: null }); go("video", { keep: true }); return; }
    const r = e.target.closest("[data-open-report]");
    if (r) { setCtx({ ch: r.dataset.openReport, laneIdx: null }); go("report"); return; }
    const ev = e.target.closest("[data-open-event]");
    if (ev) { openEvent(ev.dataset.openEvent); return; }
    const mc = e.target.closest("[data-drill-cls]");
    if (mc) { toSearch({ ch: null, cls: [mc.dataset.drillCls], period: "day" }); return; }
    const seg = e.target.closest(".bseg[data-drill]");
    if (seg && !seg.closest("#rChart")) {
      const d = JSON.parse(seg.dataset.drill);
      toSearch({ ch: d.ch || null, laneIdx: d.laneIdx, cls: [d.cls], period: "day", range: { day: d.day, hour: d.hour } });
    }
  });

  /* ============================== SEARCH BY CLASS (4.6) ============================== */
  const SR = {
    f: { cls: [], period: "day", from: null, to: null, scope: "one", ch: "ch1", laneIdx: "", dir: "", line: "", trailer: false, body: "", make: "", range: null },
    page: 1, view: "tiles", demo: "data",
  };
  const PAGE = 24;
  function attrFactor(f, cls) {
    let k = 1;
    if (f.trailer) k *= cls === "semi" ? 1 : cls === "car" ? 0.04 : 0;
    if (f.body) { const B = D.BODIES[cls]; k *= B.includes(f.body) ? 1 / B.length : 0; }
    if (f.make) { const m = D.MAKES[cls].filter((x) => x.toLowerCase().includes(f.make.toLowerCase())); k *= m.length / D.MAKES[cls].length; }
    return k;
  }
  function combos(f) {
    const chs = f.scope === "all" ? D.CHANNELS : [D.CH[f.ch]];
    const cls = f.cls.length ? f.cls : ALL_CLS, out = [];
    chs.forEach((ch) => ch.lanes.forEach((l, i) => {
      if (f.scope === "one" && f.laneIdx !== "" && +f.laneIdx !== i) return;
      if (f.dir && l.dir !== f.dir) return;
      if (f.line) {
        if (f.line[0] === "L" && f.scope === "one" && +f.line.slice(1) - 1 !== i) return;
        if (f.line === "Zin" && l.dir !== "in") return;
        if (f.line === "Zout" && l.dir !== "out") return;
      }
      cls.forEach((c) => { const k = attrFactor(f, c); if (k > 0) out.push({ ch: ch.id, i, cls: c, k }); });
    }));
    return out;
  }
  function slots(f) {
    const out = [];
    if (f.range) {
      const hrs = f.range.hour == null ? H24.slice().reverse() : [f.range.hour];
      hrs.forEach((h) => out.push({ day: f.range.day, hour: h, q: f.range.q }));
      return out;
    }
    periodDays(f).forEach((d) => { for (let h = 23; h >= 0; h--) out.push({ day: d, hour: h }); });
    return out;
  }
  function cellN(c, s) {
    let n = D.count(c.ch, c.i, c.cls, s.day, s.hour);
    if (s.q != null) n = D.quarters(n, c.ch, c.i, c.cls, s.day, s.hour)[s.q];
    return c.k === 1 ? n : Math.round(n * c.k);
  }
  function runSearch(f, limit) {
    const cs = combos(f), ss = slots(f);
    let total = 0; const items = [];
    for (const s of ss) {
      let slotRecs = [];
      for (const c of cs) {
        const n = cellN(c, s); total += n;
        if (items.length < limit && n) {
          const start = slotStart(s.day, s.hour, s.q), off = D.CH[c.ch].offlineFrom;
          let end = start.getTime() + (s.q != null ? 900 : 3600) * 1000;
          if (s.day === 0) { end = Math.min(end, D.NOW.getTime()); if (off != null) end = Math.min(end, slotStart(0, 0).getTime() + off * 3600000); }
          const len = Math.max(60, (end - start.getTime()) / 1000);
          for (let k = 0; k < n; k++) {
            const seed = `${c.ch}|${c.i}|${c.cls}|${s.day}|${s.hour}|${s.q ?? ""}|${k}`;
            const ts = new Date(start.getTime() + ((k + D.rnd(seed, "t")) / n) * len * 1000);
            slotRecs.push([seed, c, ts]);
          }
        }
      }
      if (slotRecs.length) {
        slotRecs.sort((a, b) => b[2] - a[2]);
        for (const [seed, c, ts] of slotRecs) {
          if (items.length >= limit) break;
          const r = D.record(seed, c.ch, c.i, c.cls, ts);
          if (f.trailer) r.trailer = true;
          if (f.body) r.body = f.body;
          if (f.make) { const m = D.MAKES[c.cls].filter((x) => x.toLowerCase().includes(f.make.toLowerCase())); r.make = m[Math.floor(D.rnd(seed, "mm") * m.length)] || r.make; }
          items.push(r);
        }
      }
    }
    return { total, items };
  }

  function renderSearchFilters() {
    const f = SR.f;
    el("grpChips").innerHTML = [["all", ALL_CLS], ["heavy", D.GROUPS.heavy], ["two", D.GROUPS.two]].map(([g, list]) => {
      const on = g === "all" ? !f.cls.length || f.cls.length === ALL_CLS.length : list.every((c) => f.cls.includes(c)) && f.cls.length === list.length;
      return `<button class="btn btn-toggle h-7 px-2 text-label" aria-pressed="${on}" data-grp="${g}">${t("grp." + g)}</button>`;
    }).join("");
    el("clsTiles").innerHTML = D.CLASSES.map((c) => `<button class="cls-tile" aria-pressed="${f.cls.includes(c.id)}" data-cls="${c.id}" title="${clsName(c.id, true)}">
      ${glyph(c.id)}<span class="cls-tile-name">${clsName(c.id)}</span><span class="cls-tile-no">${c.n}</span></button>`).join("");
    setSeg("sPeriod", f.period === "custom" ? null : f.period);
    const [a, b] = f.period === "custom" ? [f.from, f.to] : periodDates(f.period);
    el("sFrom").value = a; el("sTo").value = b;
    setSeg("sScope", f.scope);
    el("sCh").innerHTML = D.CHANNELS.map((c) => `<option value="${c.id}" ${c.id === f.ch ? "selected" : ""}>${chCode(c.id)} · ${chName(c.id)}</option>`).join("");
    el("sCh").disabled = f.scope === "all";
    const lanes = D.CH[f.ch].lanes;
    el("sLane").innerHTML = `<option value="">${t("common.allLanes")}</option>` + lanes.map((l, i) => `<option value="${i}" ${String(i) === f.laneIdx ? "selected" : ""}>${laneName(l.n)} · ${dirName(l.dir)}</option>`).join("");
    el("sLane").disabled = f.scope === "all";
    el("sDir").innerHTML = `<option value="">${t("common.allDirs")}</option>` + ["in", "out"].map((d) => `<option value="${d}" ${d === f.dir ? "selected" : ""}>${dirName(d)}</option>`).join("");
    el("sLine").innerHTML = `<option value="">${t("common.allLines")}</option>` +
      (f.scope === "one" ? lanes.map((l) => `<option value="L${l.n}" ${f.line === "L" + l.n ? "selected" : ""}>${t("line.L", { n: l.n })}</option>`).join("") : "") +
      `<option value="Zin" ${f.line === "Zin" ? "selected" : ""}>${t("line.Zin")}</option><option value="Zout" ${f.line === "Zout" ? "selected" : ""}>${t("line.Zout")}</option>`;
    el("sTrailer").checked = f.trailer;
    const bodies = [...new Set(Object.values(D.BODIES).flat())];
    el("sBody").innerHTML = `<option value="">${t("body.any")}</option>` + bodies.map((b) => `<option value="${b}" ${b === f.body ? "selected" : ""}>${t("body." + b)}</option>`).join("");
    el("sMake").value = f.make;
    el("makeList").innerHTML = [...new Set(Object.values(D.MAKES).flat())].filter((m) => m !== "—").map((m) => `<option value="${m}">`).join("");
  }
  function chips() {
    const f = SR.f, out = [];
    (f.cls.length ? f.cls : []).forEach((c) => out.push([`cls:${c}`, dot(c) + clsName(c)]));
    if (!f.cls.length) out.push([null, t("grp.all")]);
    out.push([null, `<i data-lucide="calendar"></i>${periodLabel(f)}`]);
    if (f.range) out.push(["range", `<i data-lucide="clock"></i>${f.range.day ? dm(D.dayDate(f.range.day)) + " " : ""}${f.range.hour == null ? "" : `${pad(f.range.hour)}:${pad((f.range.q || 0) * 15)}–${f.range.q != null ? `${pad(f.range.hour + (f.range.q === 3 ? 1 : 0))}:${pad(f.range.q === 3 ? 0 : (f.range.q + 1) * 15)}` : `${pad(f.range.hour + 1)}:00`}`}`]);
    out.push([f.scope === "all" ? null : "scope", `<i data-lucide="cctv"></i>${f.scope === "all" ? t("search.chipAllCh") : chName(f.ch)}`]);
    if (f.scope === "one" && f.laneIdx !== "") out.push(["laneIdx", laneName(D.CH[f.ch].lanes[+f.laneIdx].n)]);
    if (f.dir) out.push(["dir", dirName(f.dir)]);
    if (f.line) out.push(["line", f.line[0] === "L" ? t("line.L", { n: f.line.slice(1) }) : t("line." + f.line)]);
    if (f.trailer) out.push(["trailer", t("search.chipTrailer")]);
    if (f.body) out.push(["body", t("body." + f.body)]);
    if (f.make) out.push(["make", f.make]);
    return out.map(([k, h]) => `<span class="chip">${h}${k ? `<button class="chip-x" data-chip="${k}" aria-label="${t("common.reset")}"><i data-lucide="x"></i></button>` : ""}</span>`).join("");
  }
  function renderSearch() {
    renderSearchFilters();
    const f = SR.f;
    el("sChips").innerHTML = chips();
    setSeg("sView", SR.view); setSeg("sDemo", SR.demo);
    const isData = SR.demo === "data";
    let res = { total: 0, items: [] };
    if (isData) res = runSearch(f, SR.page * PAGE);
    SR.last = res;
    res.items.forEach((r) => REC.set(r.seed, r));
    el("sCount").textContent = isData ? t("search.found", { n: fmtN(res.total) }) : "";
    const has = isData && res.total > 0;
    el("sBody2").hidden = !has; el("sEmpty").hidden = !(isData && !res.total);
    el("sLoading").hidden = SR.demo !== "loading"; el("sError").hidden = SR.demo !== "error";
    if (SR.demo === "loading") el("sLoading").innerHTML = Array.from({ length: 8 }, () => `<div class="tile"><div class="skeleton thumb-sk"></div><div class="skeleton h-4 mt-2"></div><div class="skeleton h-3 mt-1"></div></div>`).join("");
    el("sTiles").hidden = SR.view !== "tiles"; el("sTable").hidden = SR.view !== "list";
    if (has) {
      if (SR.view === "tiles") {
        el("sTiles").innerHTML = res.items.map((r) => `<div class="tile" data-rec="${r.seed}" tabindex="0">
          <div class="thumb">${thumb(r)}<span class="thumb-conf">${r.conf}%</span></div>
          <div class="tile-row"><span class="cls-lbl">${dot(r.cls)}${clsName(r.cls)}</span><span class="text-caption font-mono text-fg-muted ml-auto">${dt(r.ts, true)}</span></div>
          <div class="text-caption text-fg-muted truncate">${chName(r.ch)}</div>
          <div class="tile-row"><span class="text-caption text-fg-muted">${laneName(r.lane)} · ${dirName(r.dir)}</span>
          <button class="btn btn-subtle h-7 px-2 text-label ml-auto" data-archive="${r.seed}"><i data-lucide="history"></i>${t("search.toArchive")}</button></div></div>`).join("");
      } else {
        el("sTable").innerHTML = `<thead><tr><th>${t("search.colThumb")}</th><th>${t("common.time")}</th><th>${t("common.channel")}</th><th>${t("common.lane")}</th><th>${t("common.direction")}</th><th>${t("common.class")}</th><th class="num">${t("common.conf")}</th><th>${t("search.colPlate")}</th><th>${t("search.colTrack")}</th><th></th></tr></thead><tbody>` +
          res.items.map((r) => `<tr data-clickable data-rec="${r.seed}"><td><div class="thumb thumb-sm">${thumb(r)}</div></td><td class="font-mono nowrap">${dt(r.ts, true)}</td>
          <td>${chName(r.ch)}</td><td>${r.lane}</td><td>${dirName(r.dir)}</td><td><span class="cls-lbl">${dot(r.cls)}${clsName(r.cls, true)}</span></td><td class="num">${r.conf}%</td>
          <td class="font-mono">${r.plate || `<span class="text-fg-subtle">${t("search.noLpr")}</span>`}</td><td class="font-mono text-fg-muted">#${r.id}</td>
          <td class="text-right"><button class="btn btn-subtle h-7 px-2 text-label" data-archive="${r.seed}"><i data-lucide="history"></i>${t("search.toArchive")}</button></td></tr>`).join("") + "</tbody>";
      }
      const left = res.total - res.items.length;
      el("sMoreRow").hidden = left <= 0;
      el("sMore").textContent = t("search.more", { n: fmtN(Math.min(PAGE, left)) });
    }
    icons();
  }
  function searchChanged(p) {
    Object.assign(SR.f, p); SR.page = 1;
    setCtx({ ch: SR.f.scope === "all" ? null : SR.f.ch, laneIdx: SR.f.scope === "one" && SR.f.laneIdx !== "" ? +SR.f.laneIdx : null, cls: SR.f.cls.slice(), period: SR.f.period, from: SR.f.from, to: SR.f.to });
    renderSearch();
  }
  el("clsTiles").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cls]"); if (!b) return;
    const c = b.dataset.cls, cls = SR.f.cls.includes(c) ? SR.f.cls.filter((x) => x !== c) : [...SR.f.cls, c];
    searchChanged({ cls });
  });
  el("grpChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-grp]"); if (!b) return;
    searchChanged({ cls: b.dataset.grp === "all" ? [] : D.GROUPS[b.dataset.grp].slice() });
  });
  el("clsClear").addEventListener("click", () => searchChanged({ cls: [] }));
  el("sPeriod").addEventListener("kit:seg", (e) => searchChanged({ period: e.detail, from: null, to: null, range: null }));
  ["sFrom", "sTo"].forEach((id) => el(id).addEventListener("change", () => searchChanged({ period: "custom", from: el("sFrom").value, to: el("sTo").value, range: null })));
  el("sScope").addEventListener("kit:seg", (e) => searchChanged({ scope: e.detail, laneIdx: "", line: "" }));
  el("sCh").addEventListener("change", (e) => searchChanged({ ch: e.target.value, laneIdx: "", line: "" }));
  el("sLane").addEventListener("change", (e) => searchChanged({ laneIdx: e.target.value }));
  el("sDir").addEventListener("change", (e) => searchChanged({ dir: e.target.value }));
  el("sLine").addEventListener("change", (e) => searchChanged({ line: e.target.value }));
  el("sTrailer").addEventListener("change", (e) => searchChanged({ trailer: e.target.checked }));
  el("sBody").addEventListener("change", (e) => searchChanged({ body: e.target.value }));
  el("sMake").addEventListener("change", (e) => searchChanged({ make: e.target.value.trim() }));
  el("sView").addEventListener("kit:seg", (e) => { SR.view = e.detail; renderSearch(); });
  el("sDemo").addEventListener("kit:seg", (e) => { SR.demo = e.detail; renderSearch(); });
  el("sRetry").addEventListener("click", () => { SR.demo = "data"; renderSearch(); });
  el("sReset").addEventListener("click", () => searchChanged({ cls: [], laneIdx: "", dir: "", line: "", trailer: false, body: "", make: "", range: null, scope: "all" }));
  el("sMore").addEventListener("click", () => { SR.page++; renderSearch(); });
  el("sChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-chip]"); if (!b) return;
    const k = b.dataset.chip;
    if (k.startsWith("cls:")) return searchChanged({ cls: SR.f.cls.filter((c) => c !== k.slice(4)) });
    const reset = { scope: { scope: "all", laneIdx: "", line: "" }, laneIdx: { laneIdx: "" }, dir: { dir: "" }, line: { line: "" }, trailer: { trailer: false }, body: { body: "" }, make: { make: "" }, range: { range: null } }[k];
    searchChanged(reset);
  });
  document.querySelector('[data-view="search"]').addEventListener("click", (e) => {
    const a = e.target.closest("[data-archive]");
    if (a) { e.stopPropagation(); openArchive(REC.get(a.dataset.archive)); return; }
    const r = e.target.closest(".tile[data-rec], tr[data-rec]");
    if (r) openVehicle(REC.get(r.dataset.rec));
  });

  /* ============================== LANE REPORT (7.8) ============================== */
  const RP = { chs: D.CHANNELS.map((c) => c.id), lanes: null, cls: ALL_CLS.slice(), period: "day", from: null, to: null, step: 60, demo: "data" };
  function stepsFor(o) {
    const n = periodDays(o).length;
    if (n <= 1) return [15, 60];
    if (n <= 7) return [60, 1440];
    return [1440];
  }
  function fixStep() { const st = stepsFor(RP); if (!st.includes(RP.step)) RP.step = st[st.length > 1 ? 1 : 0]; }
  function repRows() {
    const rows = [];
    RP.chs.forEach((id) => D.CH[id].lanes.forEach((l, i) => { if (!RP.lanes || RP.lanes.has(`${id}:${i}`)) rows.push({ ch: id, i, lane: l }); }));
    return rows;
  }
  function renderRepFilters() {
    el("rChLbl").textContent = RP.chs.length === D.CHANNELS.length ? t("report.allCh", { n: RP.chs.length }) : RP.chs.length === 1 ? chName(RP.chs[0]) : t("common.selected", { n: RP.chs.length });
    const allLanes = []; RP.chs.forEach((id) => D.CH[id].lanes.forEach((_, i) => allLanes.push(`${id}:${i}`)));
    const selLanes = RP.lanes ? allLanes.filter((k) => RP.lanes.has(k)) : allLanes;
    el("rLaneLbl").textContent = selLanes.length === allLanes.length ? t("report.allLanes", { n: allLanes.length }) : selLanes.length === 1 ? `${chName(selLanes[0].split(":")[0])} · ${laneName(+selLanes[0].split(":")[1] + 1)}` : t("common.selected", { n: selLanes.length });
    el("rClsLbl").textContent = RP.cls.length === ALL_CLS.length ? t("report.allCls", { n: ALL_CLS.length }) : clsSummary(RP.cls);
    el("rChMenu").innerHTML = `<label class="choice choice-dense"><input type="checkbox" class="check check-dense" data-rch="*" ${RP.chs.length === D.CHANNELS.length ? "checked" : ""}/><b>${t("common.all")}</b></label>` +
      D.CHANNELS.map((c) => `<label class="choice choice-dense"><input type="checkbox" class="check check-dense" data-rch="${c.id}" ${RP.chs.includes(c.id) ? "checked" : ""}/>${chCode(c.id)} · ${chName(c.id)}</label>`).join("");
    el("rLaneMenu").innerHTML = RP.chs.map((id) => `<div class="pop-grp">${chName(id)}</div>` + D.CH[id].lanes.map((l, i) => `<label class="choice choice-dense"><input type="checkbox" class="check check-dense" data-rlane="${id}:${i}" ${!RP.lanes || RP.lanes.has(`${id}:${i}`) ? "checked" : ""}/>${laneName(l.n)} · ${dirName(l.dir)}</label>`).join("")).join("");
    el("rClsMenu").innerHTML = `<div class="pop-chips">${[["all", ALL_CLS], ["heavy", D.GROUPS.heavy], ["two", D.GROUPS.two]].map(([g]) => `<button class="btn btn-outline h-7 px-2 text-label" data-rgrp="${g}">${t("grp." + g)}</button>`).join("")}</div>` +
      D.CLASSES.map((c) => `<label class="choice choice-dense"><input type="checkbox" class="check check-dense" data-rcls="${c.id}" ${RP.cls.includes(c.id) ? "checked" : ""}/>${dot(c.id)}${c.n}. ${clsName(c.id, true)}</label>`).join("");
    setSeg("rPeriod", RP.period === "custom" ? null : RP.period);
    const [a, b] = RP.period === "custom" ? [RP.from, RP.to] : periodDates(RP.period);
    el("rFrom").value = a; el("rTo").value = b;
    el("rStep").innerHTML = stepsFor(RP).map((s) => `<button class="btn" value="${s}" aria-pressed="${s === RP.step}">${t("step." + s)}</button>`).join("");
    setSeg("rDemo", RP.demo);
  }
  function computeReport() {
    const rows = repRows(), days = periodDays(RP).slice().reverse(); // oldest → newest
    const cells = rows.map(() => Object.fromEntries(RP.cls.map((c) => [c, 0])));
    const intervals = [];
    const pushIv = (label, title, drill, start) => { const iv = { label, title, drill, start, row: Object.fromEntries(RP.cls.map((c) => [c, 0])) }; intervals.push(iv); return iv; };
    days.forEach((day) => {
      const dayIv = RP.step === 1440 ? pushIv(dm(D.dayDate(day)), dm(D.dayDate(day)), { day }, D.dayDate(day)) : null;
      for (let h = 0; h < 24; h++) {
        const hourIv = RP.step === 60 ? pushIv(days.length > 1 ? (h === 0 ? dm(D.dayDate(day)) : pad(h)) : pad(h), `${dm(D.dayDate(day))} ${pad(h)}:00`, { day, hour: h }, slotStart(day, h)) : null;
        const qIv = RP.step === 15 ? [0, 1, 2, 3].map((q) => pushIv(`${pad(h)}:${pad(q * 15)}`, `${pad(h)}:${pad(q * 15)}`, { day, hour: h, q }, slotStart(day, h, q))) : null;
        rows.forEach((r, ri) => RP.cls.forEach((c) => {
          const n = D.count(r.ch, r.i, c, day, h);
          if (!n) return;
          cells[ri][c] += n;
          if (dayIv) dayIv.row[c] += n;
          if (hourIv) hourIv.row[c] += n;
          if (qIv) D.quarters(n, r.ch, r.i, c, day, h).forEach((x, q) => (qIv[q].row[c] += x));
        }));
      }
    });
    const now = D.NOW.getTime();
    intervals.forEach((iv) => (iv.future = iv.start.getTime() > now));
    const ivTot = intervals.map((iv) => RP.cls.reduce((a, c) => a + iv.row[c], 0));
    const peakI = ivTot.indexOf(Math.max(...ivTot));
    if (peakI >= 0 && ivTot[peakI] > 0) intervals[peakI].peak = true;
    const hours = days.length * 24 - (days.includes(0) ? 24 - (D.NOW.getHours() + D.NOW.getMinutes() / 60) : 0);
    return { rows, cells, intervals, ivTot, peakI, hours };
  }
  function renderReport() {
    fixStep(); renderRepFilters();
    const isData = RP.demo === "data";
    const R = isData ? computeReport() : null;
    const grand = R ? R.cells.reduce((a, row) => a + RP.cls.reduce((x, c) => x + row[c], 0), 0) : 0;
    const showData = isData && grand > 0;
    el("rStateBox").hidden = !showData;
    el("rLoading").hidden = RP.demo !== "loading";
    el("rEmpty").hidden = !(RP.demo === "empty" || (isData && !grand));
    el("rError").hidden = RP.demo !== "error";
    el("rKpi").hidden = !showData;
    if (!showData) { icons(); return; }

    const colTot = Object.fromEntries(RP.cls.map((c) => [c, R.cells.reduce((a, row) => a + row[c], 0)]));
    const heavy = D.GROUPS.heavy.filter((c) => RP.cls.includes(c)).reduce((a, c) => a + colTot[c], 0);
    const pcu = RP.cls.reduce((a, c) => a + colTot[c] * D.CLS[c].pcu, 0) / Math.max(1, R.hours);
    const peak = R.intervals[R.peakI];
    const kpis = [
      [t("report.kpiTotal"), fmtN(grand), t("report.kpiTotalHint", { lanes: R.rows.length, ch: new Set(R.rows.map((r) => r.ch)).size })],
      [t("report.kpiPeak"), peak ? peak.title : "—", t("report.kpiPeakHint", { n: fmtN(R.ivTot[R.peakI] || 0) })],
      [t("report.kpiHeavy"), fmtP(heavy / grand), t("report.kpiHeavyHint", { n: fmtN(heavy) })],
      [t("report.kpiPcu"), fmtN(pcu), t("report.kpiPcuHint")],
    ];
    el("rKpi").innerHTML = kpis.map(([l, v, h]) => `<div class="card p-4"><div class="text-label text-fg-muted">${l}</div><div class="kpi-line"><span class="kpi-value">${v}</span></div><div class="text-caption text-fg-subtle mt-1">${h}</div></div>`).join("");

    // summary matrix: lane × class with row/column totals and shares
    const head = `<thead><tr><th>${t("report.laneCol")}</th>${RP.cls.map((c) => `<th class="num"><span class="th-cls">${dot(c)}${clsName(c)}</span></th>`).join("")}<th class="num">${t("report.total")}</th></tr></thead>`;
    const body = R.rows.map((r, ri) => {
      const rt = RP.cls.reduce((a, c) => a + R.cells[ri][c], 0);
      const mx = Math.max(...RP.cls.map((c) => R.cells[ri][c]));
      return `<tr><td class="nowrap"><div class="text-body-md-medium">${chName(r.ch)}</div><div class="text-caption text-fg-muted">${laneName(r.lane.n)} · ${dirName(r.lane.dir)}</div></td>` +
        RP.cls.map((c) => { const v = R.cells[ri][c]; return `<td class="num cell ${v === mx && v ? "cell-max" : ""}" ${v ? `data-cell='${JSON.stringify({ ch: r.ch, i: r.i, cls: [c] })}' tabindex="0"` : ""}><div>${v ? fmtN(v) : "—"}</div><div class="cell-share">${rt ? fmtP(v / rt) : ""}</div></td>`; }).join("") +
        `<td class="num cell cell-tot" data-cell='${JSON.stringify({ ch: r.ch, i: r.i, cls: RP.cls })}' tabindex="0"><div><b>${fmtN(rt)}</b></div><div class="cell-share">${fmtP(rt / grand)}</div></td></tr>`;
    }).join("");
    const foot = `<tfoot><tr><th>${t("report.total")}</th>${RP.cls.map((c) => `<th class="num">${fmtN(colTot[c])}</th>`).join("")}<th class="num">${fmtN(grand)}</th></tr>
      <tr class="share-row"><th>${t("report.shareCol")}</th>${RP.cls.map((c) => `<th class="num">${fmtP(colTot[c] / grand)}</th>`).join("")}<th class="num">100%</th></tr></tfoot>`;
    el("rMatrix").innerHTML = head + `<tbody>${body}</tbody>` + foot;

    // composition per lane (100% stacked)
    const compoRow = (label, row, tot) => `<div class="compo-row"><div class="compo-lbl truncate">${label}</div><div class="compo-bar">${RP.cls.map((c) => row[c] ? `<i style="flex:${row[c]};background:${D.CLS[c].color}" title="${clsName(c)}: ${fmtN(row[c])} · ${fmtP(row[c] / tot)}">${row[c] / tot > 0.08 ? fmtP(row[c] / tot, 0) : ""}</i>` : "").join("")}</div><div class="compo-n num">${fmtN(tot)}</div></div>`;
    el("rCompo").innerHTML = R.rows.map((r, ri) => compoRow(`${chName(r.ch)} · ${t("lane.short", { n: r.lane.n })}`, R.cells[ri], RP.cls.reduce((a, c) => a + R.cells[ri][c], 0))).join("") +
      `<div class="compo-sep"></div>` + compoRow(`<b>${t("report.total")}</b>`, colTot, grand) + `<div class="legend mt-2">${legend(RP.cls)}</div>`;

    // detailed: stacked bars per interval + interval table with peak highlight
    el("rDetailTitle").textContent = t("report.detailTitle", { step: t("step." + RP.step) });
    el("rLegend").innerHTML = legend(RP.cls);
    const every = RP.step === 15 ? 8 : RP.step === 60 ? (R.intervals.length > 24 ? 24 : 2) : Math.ceil(R.intervals.length / 15);
    el("rChart").innerHTML = stackedBars(R.intervals.map((iv) => ({ ...iv })), RP.cls, { every });
    el("rIntervals").innerHTML = `<thead><tr><th>${t("report.intervalCol")}</th>${RP.cls.map((c) => `<th class="num"><span class="th-cls">${dot(c)}${clsName(c)}</span></th>`).join("")}<th class="num">${t("report.total")}</th></tr></thead><tbody>` +
      R.intervals.filter((iv) => !iv.future).map((iv) => {
        const tot = RP.cls.reduce((a, c) => a + iv.row[c], 0);
        return `<tr class="${iv.peak ? "row-peak" : ""}"><td class="nowrap font-mono">${iv.title}${iv.peak ? ` <span class="badge badge-warning">${t("report.peak")}</span>` : ""}</td>` +
          RP.cls.map((c) => `<td class="num cell" ${iv.row[c] ? `data-cell='${JSON.stringify({ range: iv.drill, cls: [c] })}' tabindex="0"` : ""}>${iv.row[c] ? fmtN(iv.row[c]) : "—"}</td>`).join("") +
          `<td class="num"><b>${fmtN(tot)}</b></td></tr>`;
      }).join("") + "</tbody>";
    icons();
  }
  function repDrill(d) {
    const range = d.range || null;
    if (d.ch) {
      setCtx({ ch: d.ch, laneIdx: d.i, cls: d.cls.length === ALL_CLS.length ? [] : d.cls, period: RP.period, from: RP.from, to: RP.to });
    } else {
      const one = RP.chs.length === 1 ? RP.chs[0] : null;
      const lanes = RP.lanes ? [...RP.lanes] : null;
      setCtx({ ch: one, laneIdx: one && lanes && lanes.length === 1 ? +lanes[0].split(":")[1] : null, cls: d.cls.length === ALL_CLS.length ? [] : d.cls, period: RP.period, from: RP.from, to: RP.to });
    }
    resetAttrs();
    go("search");
    if (range) { SR.f.range = range; renderSearch(); }
    toast(t("toast.ctx", { what: [S.ctx.ch ? chName(S.ctx.ch) : t("search.chipAllCh"), S.ctx.laneIdx != null && S.ctx.ch ? laneName(D.CH[S.ctx.ch].lanes[S.ctx.laneIdx].n) : null, clsSummary(S.ctx.cls)].filter(Boolean).join(" · ") }));
  }
  const reportView = document.querySelector('[data-view="report"]');
  reportView.addEventListener("click", (e) => {
    const c = e.target.closest("[data-cell]");
    if (c) return repDrill(JSON.parse(c.dataset.cell));
    const seg = e.target.closest("#rChart .bseg[data-drill]");
    if (seg) { const d = JSON.parse(seg.dataset.drill); return repDrill({ range: { day: d.day, hour: d.hour, q: d.q }, cls: [d.cls] }); }
    const g = e.target.closest("[data-rgrp]");
    if (g) { RP.cls = g.dataset.rgrp === "all" ? ALL_CLS.slice() : D.GROUPS[g.dataset.rgrp].slice(); repChanged(); }
  });
  reportView.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("[data-cell]")) repDrill(JSON.parse(e.target.dataset.cell)); });
  reportView.addEventListener("change", (e) => {
    const x = e.target;
    if (x.dataset.rch) {
      if (x.dataset.rch === "*") RP.chs = x.checked ? D.CHANNELS.map((c) => c.id) : [D.CHANNELS[0].id];
      else { RP.chs = x.checked ? [...new Set([...RP.chs, x.dataset.rch])] : RP.chs.filter((c) => c !== x.dataset.rch); if (!RP.chs.length) RP.chs = [x.dataset.rch]; }
      RP.chs.sort(); RP.lanes = null; repChanged(true);
    } else if (x.dataset.rlane) {
      const all = []; RP.chs.forEach((id) => D.CH[id].lanes.forEach((_, i) => all.push(`${id}:${i}`)));
      const set = RP.lanes ? new Set(RP.lanes) : new Set(all);
      x.checked ? set.add(x.dataset.rlane) : set.delete(x.dataset.rlane);
      if (!set.size) set.add(x.dataset.rlane);
      RP.lanes = set.size === all.length ? null : set; repChanged(true);
    } else if (x.dataset.rcls) {
      RP.cls = x.checked ? ALL_CLS.filter((c) => RP.cls.includes(c) || c === x.dataset.rcls) : RP.cls.filter((c) => c !== x.dataset.rcls);
      if (!RP.cls.length) RP.cls = [x.dataset.rcls];
      repChanged(true);
    } else if (x.id === "rFrom" || x.id === "rTo") {
      RP.period = "custom"; RP.from = el("rFrom").value; RP.to = el("rTo").value; repChanged();
    }
  });
  function repChanged(keepMenu) {
    const lanes = RP.lanes ? [...RP.lanes] : null;
    const one = RP.chs.length === 1 ? RP.chs[0] : null;
    setCtx({ ch: one, laneIdx: one && lanes && lanes.length === 1 ? +lanes[0].split(":")[1] : null, cls: RP.cls.length === ALL_CLS.length ? [] : RP.cls.slice(), period: RP.period, from: RP.from, to: RP.to });
    renderReport();
    if (keepMenu) { /* popover content was re-rendered in place; it stays open */ }
  }
  el("rPeriod").addEventListener("kit:seg", (e) => { RP.period = e.detail; RP.from = RP.to = null; repChanged(); });
  el("rStep").addEventListener("kit:seg", (e) => { RP.step = +e.detail; renderReport(); });
  el("rDemo").addEventListener("kit:seg", (e) => { RP.demo = e.detail; renderReport(); });
  el("rRetry").addEventListener("click", () => { RP.demo = "data"; renderReport(); });

  /* ============================== EVENTS (6.1–6.5) ============================== */
  const EVS = { type: "", status: "open" };
  const PRIO = { high: "badge-red", medium: "badge-orange", low: "badge-teal" };
  const STAT = { new: "badge-warning", work: "badge-info", confirmed: "badge-success", false: "badge-neutral" };
  const EV_ICON = { stop: "octagon-pause", jam: "traffic-cone", wrong: "arrow-down-up", speed: "gauge", drop: "trending-down", crash: "car-front", cargo: "package-open", noparking: "circle-parking-off", zone: "scan" };
  function renderEvents() {
    const types = [...new Set(D.EVENTS.map((e) => e.type))];
    el("eType").innerHTML = `<option value="">${t("events.allTypes")}</option>` + types.map((x) => `<option value="${x}" ${x === EVS.type ? "selected" : ""}>${t("evt." + x)}</option>`).join("");
    el("eStatus").innerHTML = [["open", t("st.f.new") + " + " + t("st.f.work").toLowerCase()], ["all", t("st.all")], ["closed", t("st.f.closed")]].map(([v, l]) => `<button class="btn" value="${v}" aria-pressed="${v === EVS.status}">${l}</button>`).join("");
    const list = D.EVENTS.filter((e) => (!EVS.type || e.type === EVS.type) &&
      (EVS.status === "all" || (EVS.status === "open" ? ["new", "work"].includes(e.status) : ["confirmed", "false"].includes(e.status))));
    el("eCount").textContent = list.length;
    el("eTable").hidden = !list.length; el("eEmpty").hidden = !!list.length;
    el("eTable").innerHTML = `<thead><tr><th>${t("events.colTime")}</th><th>${t("events.colType")}</th><th>${t("events.colPlace")}</th><th>${t("events.colVeh")}</th><th>${t("events.colPrio")}</th><th>${t("events.colStatus")}</th><th></th></tr></thead><tbody>` +
      list.map((e) => `<tr data-clickable data-open-event="${e.id}"><td class="font-mono nowrap">${hm(e.start)}${e.end ? "–" + hm(e.end) : ""}</td>
        <td><span class="ev-type"><i data-lucide="${EV_ICON[e.type]}"></i>${t("evt." + e.type)}</span><div class="text-caption text-fg-muted">${e.id}</div></td>
        <td>${chName(e.ch)}<div class="text-caption text-fg-muted">${laneName(D.CH[e.ch].lanes[e.laneIdx].n)} · ${dirName(D.CH[e.ch].lanes[e.laneIdx].dir)}</div></td>
        <td><span class="veh-glyphs">${e.vehicles.map((v) => glyph(v.cls)).join("")}</span></td>
        <td><span class="badge ${PRIO[e.prio]}">${t("prio." + e.prio)}</span></td><td><span class="badge ${STAT[e.status]}">${t("st." + e.status)}</span></td>
        <td class="text-right"><button class="btn btn-outline h-7 px-2 text-label" data-open-event="${e.id}">${t("common.open")}</button></td></tr>`).join("") + "</tbody>";
    icons();
  }
  el("eType").addEventListener("change", (e) => { EVS.type = e.target.value; renderEvents(); });
  el("eStatus").addEventListener("kit:seg", (e) => { EVS.status = e.detail; renderEvents(); });

  let curEv = null;
  const PAL = ["var(--one-palette-amber)", "var(--one-accent-emphasis)", "var(--one-palette-magenta)"];
  function eventScene(e) {
    const n = D.CH[e.ch].lanes.length, dir = D.CH[e.ch].lanes[e.laneIdx].dir;
    let s = sceneBg(e.ch, { markup: true, selLane: e.laneIdx }), boxes = "";
    const moving = ["speed", "wrong", "zone", "drop"].includes(e.type);
    e.vehicles.forEach((v, k) => {
      const col = PAL[k % PAL.length];
      const reverse = e.type === "wrong";
      const swerve = e.type === "crash" && k === 1 ? -0.9 : 0;
      const lane = e.type === "crash" && k === 1 ? Math.min(n - 1, e.laneIdx + 1) : e.laneIdx;
      const uEnd = moving ? 0.55 : e.type === "jam" ? 0.62 - k * 0.12 : e.type === "crash" ? 0.5 : 0.55;
      const pts = trackPts(lane, n, dir, 0, uEnd, { reverse, swerve });
      s += `<polyline points="${poly(pts)}" class="tr-passed" style="stroke:${col}"/>` + arrow(pts, col, 14);
      const last = pts[pts.length - 1];
      const p = (YB - last[1]) / (YB - YH);
      boxes = vehBox(lane, n, v.cls, p, v, { dir: reverse ? (dir === "in" ? "out" : "in") : dir, color: col, x: last[0], y: last[1] }) + boxes;
    });
    if (e.type === "cargo") { const x = ex(n, e.laneIdx + 0.5, 0.42), y = ey(0.42); s += `<rect x="${x - 14}" y="${y - 10}" width="28" height="14" class="sc-object"/><circle cx="${x}" cy="${y - 3}" r="30" class="sc-ring"/>`; }
    return s + boxes;
  }
  function openEvent(id) {
    const e = D.EVENTS.find((x) => x.id === id); if (!e) return;
    curEv = e;
    e.vehicles.forEach((v) => REC.set(v.seed, v));
    el("evTitle").textContent = t("evt." + e.type);
    el("evSub").textContent = `${e.id} · ${chName(e.ch)} · ${laneName(D.CH[e.ch].lanes[e.laneIdx].n)} · ${hm(e.start)}`;
    el("evPrio").className = `badge ${PRIO[e.prio]} ml-auto`; el("evPrio").textContent = t("prio." + e.prio);
    el("evStatus").className = `badge ${STAT[e.status]}`; el("evStatus").textContent = t("st." + e.status);
    el("evScene").innerHTML = eventScene(e);
    el("evRel").innerHTML = e.vehicles.map((v, k) => `<li class="rel-item"><i class="rel-sw" style="background:${PAL[k % PAL.length]}"></i>${glyph(v.cls)}
      <span class="min-w-0 flex-1"><span class="text-body-md-medium">${clsName(v.cls, true)} #${v.id}</span><span class="text-caption text-fg-muted">${hms(v.ts)} · ${v.speed} km/h · ${v.conf}%${v.plate ? " · " + v.plate : ""}</span></span>
      <button class="btn btn-outline h-7 px-2 text-label" data-veh="${v.seed}"><i data-lucide="route"></i>${t("vh.track")}</button></li>`).join("");
    el("evAttrList").innerHTML = attrs([
      [t("ev.start"), dt(e.start, true)], [t("ev.end"), e.end ? dt(e.end, true) : `<span class="badge badge-warning">${t("ev.ongoing")}</span>`],
      [t("ev.place"), `${chCode(e.ch)} · ${chName(e.ch)} · ${laneName(D.CH[e.ch].lanes[e.laneIdx].n)}`],
      [t("ev.related"), e.vehicles.map((v) => `${clsName(v.cls)} #${v.id}`).join(", ")],
      [t("ev.source"), t("ev.sourceVal", { type: t("evt." + e.type) })],
    ]);
    const closed = ["confirmed", "false"].includes(e.status);
    el("evConfirm").disabled = closed; el("evFalse").disabled = closed; el("evAssign").disabled = closed;
    if (!el("event").open) el("event").showModal();
    icons();
  }
  const attrs = (pairs) => pairs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  el("evRel").addEventListener("click", (e) => { const b = e.target.closest("[data-veh]"); if (b) openVehicle(REC.get(b.dataset.veh)); });
  const evAct = (st, key) => () => { curEv.status = st; toast(t(key, { id: curEv.id })); openEvent(curEv.id); renderNav(); if (S.view === "events") renderEvents(); if (S.view === "overview") renderOverview(); };
  el("evConfirm").addEventListener("click", evAct("confirmed", "ev.toast.confirmed"));
  el("evFalse").addEventListener("click", evAct("false", "ev.toast.false"));
  el("evAssign").addEventListener("click", evAct("work", "ev.toast.assign"));
  el("evArchive").addEventListener("click", () => openArchive(curEv.vehicles[0]));

  /* ============================== VEHICLE CARD (2.5, 2.6) ============================== */
  let curVeh = null, playRaf = null;
  function vehStill(r, u) {
    const n = D.CH[r.ch].lanes.length;
    const uu = u == null ? uLine(r.dir) : u, p = pOf(r.dir, uu);
    return sceneBg(r.ch, { markup: true, selLane: r.laneIdx }) + focusTrack(r.laneIdx, n, r.dir, uu) + vehBox(r.laneIdx, n, r.cls, p, r, { dir: r.dir, color: "var(--one-palette-amber)" });
  }
  function linkedEvents(r) {
    const direct = D.EVENTS.filter((e) => e.vehicles.some((v) => v.seed === r.seed));
    if (direct.length) return direct;
    return D.rnd(r.seed, "ev") < 0.18 ? D.EVENTS.filter((e) => e.ch === r.ch).slice(0, 1) : [];
  }
  function openVehicle(r) {
    if (!r) return;
    curVeh = r; REC.set(r.seed, r);
    cancelAnimationFrame(playRaf);
    el("vhGlyph").innerHTML = glyph(r.cls, "glyph-lg");
    el("vhTitle").textContent = t("vh.title", { cls: clsName(r.cls, true), id: r.id });
    el("vhSub").textContent = t("vh.sub", { ch: chName(r.ch), lane: laneName(r.lane), dir: dirName(r.dir), time: dt(r.ts, true) });
    el("vhConf").textContent = t("vh.conf", { n: r.conf });
    el("vhScene").innerHTML = vehStill(r);
    const start = new Date(r.ts.getTime() - uLine(r.dir) * r.dur * 1000), end = new Date(start.getTime() + r.dur * 1000);
    el("vhPlayInfo").textContent = t("vh.playInfo", { from: hms(start), to: hms(end), dur: r.dur });
    el("vhAttrList").innerHTML = attrs([
      [t("attr.class"), `<span class="cls-lbl">${dot(r.cls)}${D.CLS[r.cls].n}. ${clsName(r.cls, true)}</span>`],
      [t("attr.subclass"), r.sub[LANG === "en" ? 1 : 0]],
      [t("attr.time"), dt(r.ts, true)],
      [t("attr.channel"), `${chCode(r.ch)} · ${chName(r.ch)}`],
      [t("attr.lane"), `${laneName(r.lane)} · ${dirName(r.dir)}`],
      [t("attr.speed"), t("ov.kmh", { n: r.speed })],
      [t("attr.trailer"), r.trailer ? t("yes") : t("no")],
      [t("attr.body"), r.body ? t("body." + r.body) : "—"],
      [t("attr.make"), r.make],
      [t("attr.plate"), r.plate ? `<span class="font-mono">${r.plate}</span>` : `<span class="text-fg-subtle">${t("attr.plateNa")}</span>`],
      [t("attr.color"), `<span class="text-fg-subtle">${t("attr.colorNa")}</span>`],
      [t("attr.track"), t("attr.trackVal", { id: r.id, n: Math.round(r.dur * 12.5), dur: r.dur })],
    ]);
    const evs = linkedEvents(r);
    el("vhEvCount").textContent = evs.length;
    el("vhEvList").innerHTML = evs.length ? evs.map(evItem).join("") : `<li class="text-caption text-fg-muted">${t("vh.noEvents")}</li>`;
    $$("#vhTabs [role=tab]").forEach((tb, i) => { tb.setAttribute("aria-selected", String(i === 0)); });
    $$("#vhTabs [role=tabpanel]").forEach((p, i) => (p.hidden = i !== 0));
    if (!el("vehicle").open) el("vehicle").showModal();
    icons();
  }
  el("vhPlay").addEventListener("click", () => {
    const r = curVeh; if (!r) return;
    cancelAnimationFrame(playRaf);
    const t0 = performance.now(), ms = r.dur * 1000;
    const step = (now) => {
      const u = Math.min(1, (now - t0) / ms);
      el("vhScene").innerHTML = vehStill(r, u);
      if (u < 1) playRaf = requestAnimationFrame(step); else el("vhScene").innerHTML = vehStill(r);
    };
    playRaf = requestAnimationFrame(step);
  });
  el("vehicle").addEventListener("close", () => cancelAnimationFrame(playRaf));
  el("vhArchive").addEventListener("click", () => openArchive(curVeh));
  el("vhSimilar").addEventListener("click", () => toSearch({ ch: curVeh.ch, laneIdx: null, cls: [curVeh.cls] }));
  el("vhReport").addEventListener("click", () => toLaneReport(curVeh.ch, curVeh.laneIdx, [curVeh.cls]));
  el("vhEvList").addEventListener("click", (e) => { const b = e.target.closest("[data-open-event]"); if (b) { e.stopPropagation(); el("vehicle").close(); openEvent(b.dataset.openEvent); } });

  /* ============================== SCENE SETUP (1.2, 1.3) ============================== */
  const SC = { ch: "ch1", tool: "lane", ver: { ch1: 3, ch2: 3, ch3: 2, ch4: 4, ch5: 1, ch6: 1, ch7: 2, ch8: 5 } };
  function renderScene() {
    const ch = D.CH[SC.ch];
    el("scCh").innerHTML = D.CHANNELS.map((c) => `<option value="${c.id}" ${c.id === SC.ch ? "selected" : ""}>${chCode(c.id)} · ${chName(c.id)}</option>`).join("");
    el("scSync").innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i>${t("scene.synced", { v: SC.ver[SC.ch] })}`;
    setSeg("scTool", SC.tool);
    el("scScene").innerHTML = sceneBg(SC.ch, { markup: true, highlight: SC.tool });
    const ins = ch.lanes.some((l) => l.dir === "in"), outs = ch.lanes.some((l) => l.dir === "out");
    const items = [
      ...ch.lanes.map((l) => ["lane", "arrow-up-down", t("scene.laneItem", { n: l.n, dir: dirName(l.dir) })]),
      ...ch.lanes.map((l) => ["line", "minus", t("scene.lineItem", { n: l.n })]),
      ins ? ["zone", "square-dashed", t("scene.zoneIn")] : null, outs ? ["zone", "square-dashed", t("scene.zoneOut")] : null,
      ["excl", "eye-off", t("scene.excl")],
    ].filter(Boolean);
    el("scList").innerHTML = `<li class="text-caption text-fg-muted sc-hint">${t("scene.hint")}</li>` + items.map(([k, i, l]) => `<li class="sc-item ${k === SC.tool ? "on" : ""}"><i data-lucide="${i}"></i><span class="flex-1">${l}</span><i data-lucide="pencil" class="sc-edit"></i></li>`).join("");
    el("scUndo").disabled = true;
    icons();
  }
  el("scCh").addEventListener("change", (e) => { SC.ch = e.target.value; renderScene(); });
  el("scTool").addEventListener("kit:seg", (e) => { SC.tool = e.detail; renderScene(); });
  el("scPush").addEventListener("click", () => { SC.ver[SC.ch]++; renderScene(); toast(t("scene.pushed", { ch: chName(SC.ch), v: SC.ver[SC.ch] })); });

  /* ============================== misc ============================== */
  function setSeg(id, v) { $$(`#${id} > button`).forEach((b) => b.setAttribute("aria-pressed", String(b.value === v))); }
  document.addEventListener("click", (e) => {
    const x = e.target.closest("[data-export]");
    if (!x) return;
    const n = S.view === "search" ? (SR.last ? SR.last.total : 0) : repRows().length;
    toast(t("toast.export", { fmt: x.dataset.export, n: fmtN(n) }));
  });
  el("schSave").addEventListener("click", () => toast(t("sch.saved")));
  document.addEventListener("kit:dialog", (e) => { if (e.detail.dialog.id === "about") el("abBody").innerHTML = t("about.body"); });

  function tickClock() { const c = liveClock(liveT()); el("clock").textContent = new Intl.DateTimeFormat(loc(), { day: "2-digit", month: "short", year: "numeric" }).format(c) + " · " + hms(c); }
  setInterval(tickClock, 1000);

  const RENDER = { overview: renderOverview, video: renderVideo, search: renderSearch, report: renderReport, events: renderEvents, scene: renderScene };

  function setLang(l) {
    window.LANG = l; localStorage.setItem("traffic-lang", l);
    setSeg("langSeg", l); applyI18n(); renderCtx(); renderNav(); tickClock();
    el("pageTitle").textContent = t("nav." + S.view);
    RENDER[S.view]();
    if (el("vehicle").open && curVeh) openVehicle(curVeh);
    if (el("event").open && curEv) openEvent(curEv.id);
    if (el("about").open) el("abBody").innerHTML = t("about.body");
    icons();
  }
  el("langSeg").addEventListener("kit:seg", (e) => setLang(e.detail));

  // boot
  applyI18n(); setSeg("langSeg", LANG); renderCtx(); tickClock();
  const start = (location.hash || "").slice(1);
  go(RENDER[start] ? start : "overview");
  window.addEventListener("hashchange", () => { const v = location.hash.slice(1); if (RENDER[v] && v !== S.view) go(v); });
})();
