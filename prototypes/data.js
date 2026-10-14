/* Demo fixtures for Hai Phong Port. Everything is deterministic: the same filter always gives the same numbers,
 * so a report cell and the search it opens agree on the count. */
(function () {
  const NOW = new Date(2026, 9, 14, 14, 32, 0);

  // Table 1 in the RoadAR profile (SIM is out of scope, pedestrians are detected but not counted).
  const CLASSES = [
    { id: "car",     n: 1,  color: "var(--one-accent)",          pcu: 1.0, sub: [["Легковые машины", "Passenger cars"], ["Легковые машины с прицепом", "Passenger cars with trailer"]] },
    { id: "lcv",     n: 2,  color: "var(--one-palette-teal)",    pcu: 1.5, sub: [["Грузовые до 5 т", "Trucks up to 5 t"]] },
    { id: "truckM",  n: 3,  color: "var(--one-palette-amber)",   pcu: 2.0, sub: [["Двухосные грузовые ТС", "Two-axle trucks"], ["Двухосные самосвалы", "Two-axle dump trucks"]] },
    { id: "truckH",  n: 4,  color: "var(--one-palette-orange)",  pcu: 2.5, sub: [["Трёхосные грузовые ТС", "Three-axle trucks"], ["Трёхосные самосвалы", "Three-axle dump trucks"]] },
    { id: "semi",    n: 5,  color: "var(--one-palette-purple)",  pcu: 3.5, sub: [["Крупные автопоезда", "Large truck-trailers"], ["Грузовик с прицепом", "Truck with trailer"]] },
    { id: "bus",     n: 6,  color: "var(--one-palette-green)",   pcu: 2.5, sub: [["Автобусы малого класса", "Small buses"], ["Автобусы среднего класса", "Medium buses"], ["Крупные автобусы", "Large buses"]] },
    { id: "moto",    n: 7,  color: "var(--one-palette-magenta)", pcu: 0.5, sub: [["Мотоциклы / мопеды", "Motorcycles / mopeds"]] },
    { id: "bike",    n: 8,  color: "var(--one-fg-subtle)",       pcu: 0.3, sub: [["Велосипеды", "Bicycles"]] },
    { id: "special", n: 11, color: "var(--one-palette-red)",     pcu: 3.0, sub: [["Спецтехника", "Special vehicles"], ["Крупная спецтехника", "Large special vehicles"]] },
  ];
  const CLS = Object.fromEntries(CLASSES.map((c) => [c.id, c]));
  const GROUPS = { heavy: ["truckM", "truckH", "semi"], two: ["moto", "bike"] };

  const PORT_MIX = { car: .20, lcv: .10, truckM: .09, truckH: .12, semi: .32, bus: .03, moto: .11, bike: .01, special: .02 };
  const CITY_MIX = { car: .28, lcv: .10, truckM: .06, truckH: .06, semi: .10, bus: .05, moto: .32, bike: .02, special: .01 };
  const QUAY_MIX = { car: .06, lcv: .06, truckM: .06, truckH: .14, semi: .52, bus: .01, moto: .05, bike: .00, special: .10 };

  const L = (n, dir) => ({ n, dir });
  const CHANNELS = [
    { id: "ch1", lanes: [L(1, "in"), L(2, "in"), L(3, "in")],               lpr: true,  vol: 1.0, mix: PORT_MIX, speed: 24, load: "dense" },
    { id: "ch2", lanes: [L(1, "out"), L(2, "out"), L(3, "out")],            lpr: true,  vol: 0.9, mix: PORT_MIX, speed: 31, load: "free" },
    { id: "ch3", lanes: [L(1, "in"), L(2, "in"), L(3, "out"), L(4, "out")], lpr: false, vol: 0.8, mix: PORT_MIX, speed: 36, load: "free" },
    { id: "ch4", lanes: [L(1, "in"), L(2, "in"), L(3, "out")],               lpr: false, vol: 1.1, mix: PORT_MIX, speed: 14, load: "jam" },
    { id: "ch5", lanes: [L(1, "in"), L(2, "out")],                          lpr: false, vol: 0.6, mix: QUAY_MIX, speed: 22, load: "free" },
    { id: "ch6", lanes: [L(1, "in"), L(2, "out")],                          lpr: false, vol: 0.5, mix: QUAY_MIX, speed: 18, load: "free", offlineFrom: 11.07 },
    { id: "ch7", lanes: [L(1, "out"), L(2, "out"), L(3, "out")],            lpr: false, vol: 1.2, mix: CITY_MIX, speed: 42, load: "free" },
    { id: "ch8", lanes: [L(1, "in"), L(2, "in"), L(3, "out"), L(4, "out")], lpr: false, vol: 1.0, mix: CITY_MIX, speed: 27, load: "dense" },
  ];
  const CH = Object.fromEntries(CHANNELS.map((c) => [c.id, c]));

  // Port day: heavy flow around shift changes, trucks keep moving at night.
  const CURVE = [.42, .38, .36, .37, .45, .62, .86, 1.0, .98, .9, .84, .8, .76, .8, .86, .95, 1.0, .96, .82, .68, .58, .52, .48, .45];
  const BASE = 96; // vehicles per lane per peak hour

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const rnd = (...k) => (hash(k.join("|")) % 100000) / 100000;

  function dayDate(dayIdx) { const d = new Date(NOW); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - dayIdx); return d; }

  /** Vehicles crossing the counting line of one lane for one class in one hour. dayIdx 0 = today. */
  function count(chId, laneIdx, cls, dayIdx, hour) {
    const ch = CH[chId];
    let part = 1;
    if (dayIdx === 0) {
      const nowH = NOW.getHours() + NOW.getMinutes() / 60;
      if (hour >= nowH) return 0;
      if (hour + 1 > nowH) part = nowH - hour;
      if (ch.offlineFrom != null) {
        if (hour >= ch.offlineFrom) return 0;
        if (hour + 1 > ch.offlineFrom) part = Math.min(part, ch.offlineFrom - hour);
      }
    }
    const dow = dayDate(dayIdx).getDay();
    const wk = dow === 0 ? 0.62 : dow === 6 ? 0.78 : 1;
    let curve = CURVE[hour];
    if (cls === "moto" || cls === "bike") curve *= (hour >= 6 && hour <= 8) || (hour >= 16 && hour <= 18) ? 1.45 : hour < 5 ? 0.35 : 1;
    if (cls === "bus") curve *= (hour >= 6 && hour <= 8) || (hour >= 16 && hour <= 18) ? 1.6 : hour < 5 ? 0.1 : 0.8;
    const laneF = 0.8 + 0.4 * rnd(chId, laneIdx, "lane");
    const noise = 0.78 + 0.44 * rnd(chId, laneIdx, cls, dayIdx, hour);
    return Math.round(BASE * ch.vol * laneF * curve * (ch.mix[cls] || 0) * noise * wk * part);
  }

  /** Split an hourly count into four quarter-hour counts that add up exactly. */
  function quarters(total, ...key) {
    const w = [0, 1, 2, 3].map((q) => 0.75 + 0.5 * rnd(...key, "q", q));
    const s = w.reduce((a, b) => a + b, 0);
    const out = w.map((x) => Math.floor((total * x) / s));
    out[3] += total - out.reduce((a, b) => a + b, 0);
    return out;
  }

  const MAKES = {
    car: ["Toyota Vios", "Hyundai Accent", "Kia Morning", "Mazda CX-5", "VinFast VF 8", "Honda City", "Ford Ranger", "Mitsubishi Xpander"],
    lcv: ["Ford Transit", "Hyundai Porter H150", "Suzuki Carry", "Thaco Towner", "Kia K250"],
    truckM: ["Hino 300", "Isuzu NQR", "Hyundai Mighty", "Thaco Ollin"],
    truckH: ["Hino 500", "Howo T5G", "Chenglong H5", "Isuzu FVM"],
    semi: ["Howo A7", "Hyundai Xcient", "Dongfeng KX", "Chenglong H7", "Freightliner Cascadia", "Shacman X3000"],
    bus: ["Thaco Garden", "Hyundai County", "Samco Felix"],
    moto: ["Honda Wave Alpha", "Honda Vision", "Yamaha Exciter", "Honda Air Blade", "VinFast Evo"],
    bike: ["—"],
    special: ["Kalmar DRG reach stacker", "Terberg terminal tractor", "Komatsu PC200", "Liebherr LRS 545"],
  };
  const BODIES = {
    car: ["sedan", "hatch", "suv", "minivan", "pickup", "wagon"],
    lcv: ["van", "pickup", "box"],
    truckM: ["box", "flat", "tank"],
    truckH: ["box", "flat", "tank"],
    semi: ["tractor"],
    bus: ["city", "coach"],
    moto: ["scooter", "street"],
    bike: [],
    special: ["stacker", "terminal"],
  };
  const PLATE_SERIES = ["15C", "15H", "15A", "16C", "15R", "29C", "14C"];

  /** A detection record. Same seed → same vehicle. */
  function record(seed, chId, laneIdx, cls, ts) {
    const ch = CH[chId], lane = ch.lanes[laneIdx], c = CLS[cls];
    const r = (k) => rnd(seed, k);
    const makes = MAKES[cls], bodies = BODIES[cls];
    const subIdx = Math.floor(r("sub") * c.sub.length);
    const trailer = cls === "semi" || (cls === "car" && subIdx === 1);
    const plate = ch.lpr && cls !== "bike"
      ? `${PLATE_SERIES[Math.floor(r("ps") * PLATE_SERIES.length)]}-${String(100 + Math.floor(r("p1") * 899))}.${String(10 + Math.floor(r("p2") * 89))}`
      : null;
    const speed = Math.max(6, Math.round(ch.speed * (0.7 + 0.6 * r("v")) * (cls === "semi" || cls === "special" ? 0.85 : cls === "moto" ? 1.1 : 1)));
    return {
      id: 40000 + (hash(seed) % 59999),
      seed, cls, ch: chId, laneIdx, lane: lane.n, dir: lane.dir, ts,
      conf: Math.round(78 + 21 * r("conf")),
      speed, trailer, sub: c.sub[subIdx],
      body: bodies.length ? bodies[Math.floor(r("b") * bodies.length)] : null,
      make: makes[Math.floor(r("m") * makes.length)],
      plate,
      dur: +(4.5 + 4 * r("dur")).toFixed(1),
    };
  }

  /** Events from the RoadAR rule set (section 6.1–6.2 of the spec, RoadAR-supported only). */
  const EV_DEF = [
    { type: "jam",       ch: "ch4", lane: 0, h: 14.2,  prio: "high",   status: "new",       dur: null, cls: ["semi", "semi", "truckH"] },
    { type: "stop",      ch: "ch1", lane: 2, h: 14.05, prio: "high",   status: "work",      dur: 6,    cls: ["semi"] },
    { type: "wrong",     ch: "ch8", lane: 1, h: 13.82, prio: "high",   status: "new",       dur: 1,    cls: ["moto"] },
    { type: "cargo",     ch: "ch5", lane: 0, h: 13.6,  prio: "high",   status: "work",      dur: 22,   cls: ["semi"] },
    { type: "speed",     ch: "ch7", lane: 0, h: 13.4,  prio: "medium", status: "new",       dur: 1,    cls: ["car"] },
    { type: "noparking", ch: "ch3", lane: 2, h: 12.9,  prio: "medium", status: "new",       dur: 14,   cls: ["truckM"] },
    { type: "drop",      ch: "ch1", lane: 1, h: 12.4,  prio: "medium", status: "confirmed", dur: 18,   cls: ["semi", "truckH"] },
    { type: "zone",      ch: "ch5", lane: 1, h: 11.75, prio: "low",    status: "confirmed", dur: 3,    cls: ["special"] },
    { type: "crash",     ch: "ch8", lane: 2, h: 10.9,  prio: "high",   status: "confirmed", dur: 41,   cls: ["car", "moto"] },
    { type: "speed",     ch: "ch2", lane: 1, h: 10.3,  prio: "medium", status: "false",     dur: 1,    cls: ["lcv"] },
    { type: "stop",      ch: "ch6", lane: 0, h: 9.6,   prio: "medium", status: "confirmed", dur: 9,    cls: ["truckH"] },
    { type: "jam",       ch: "ch1", lane: 0, h: 7.8,   prio: "high",   status: "confirmed", dur: 52,   cls: ["semi", "semi", "truckH"] },
    { type: "wrong",     ch: "ch3", lane: 3, h: 6.4,   prio: "high",   status: "false",     dur: 1,    cls: ["bike"] },
    { type: "noparking", ch: "ch2", lane: 2, h: 5.2,   prio: "low",    status: "confirmed", dur: 25,   cls: ["semi"] },
  ];
  function atHour(h) { const d = new Date(NOW); d.setHours(0, 0, 0, 0); d.setSeconds(Math.round(h * 3600)); return d; }
  const EVENTS = EV_DEF.map((e, i) => {
    const start = atHour(e.h);
    const id = `EV-${String(5120 - i)}`;
    return {
      id, type: e.type, ch: e.ch, laneIdx: e.lane, prio: e.prio, status: e.status, start,
      end: e.dur == null ? null : new Date(start.getTime() + e.dur * 60000),
      vehicles: e.cls.map((cls, k) => record(`${id}-${k}`, e.ch, e.lane, cls, new Date(start.getTime() + k * 7000))),
    };
  });

  window.DATA = { NOW, CLASSES, CLS, GROUPS, CHANNELS, CH, count, quarters, record, rnd, hash, dayDate, EVENTS, MAKES, BODIES };
})();
