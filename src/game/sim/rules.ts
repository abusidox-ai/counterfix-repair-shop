// Counterfix rules: pure state transitions. No React, no three.js.
import * as D from "./data";
import { CHECKS, generateDay, type CheckId, type CustomerDef } from "./customers";
import { next as rngNext } from "./rng";

type Sku = D.Sku;
type Tool = D.Tool;
export type { CheckId, CustomerDef };

export type Where = "customer" | "counter" | "bench" | "hands" | "police" | "gone";
/** A loose part: fresh from a drawer, or the broken one you pulled out. */
export type Loose = { sku: Sku } | { old: D.PartKind };
export type Hand = null | { t: "device" } | { t: "tool"; tool: Tool } | { t: "part"; part: Loose };
export type Spare = null | { t: "tool"; tool: Tool } | { t: "part"; part: Loose };
/** What sits in the device's part slot. */
export type Slot = "broken" | "empty" | "old" | Sku;

export interface Repair {
  flipped: boolean; // back side up
  out: boolean[]; // screws removed
  bolt: number; // 0 = tight, BOLT_CLICKS = out
  coverOff: boolean;
  slot: Slot;
}

export interface Job {
  customer: CustomerDef;
  arrivesAt: number;
  accepted: boolean;
  where: Where;
  repair: Repair;
  checks: Partial<Record<CheckId, "pass" | "fail">>;
}

export interface PoliceEvent {
  outcome: "caught" | "escaped" | "false";
  cash: number;
  rep: number;
  line: string;
  suspect: CustomerDef;
}

export interface Leaving { customer: CustomerDef; at: number; how: "walk" | "arrested" | "escaped" }
export interface Order { sku: Sku; qty: number; at: number }
export interface CartLine { sku: Sku; pack: "single" | "bulk" }

export interface DayStats {
  served: number; repaired: number; turnedAway: number; reported: number; caught: number; escaped: number;
  falseReports: number; returned: number; stolenRepaired: number; oldParts: number; earned: number; spent: number;
}
export interface DaySummary { endedAt: number; bonus: { cash: number; rep: number } | null; unserved: number; startCash: number; startRep: number }

export interface GameState {
  seed: number;
  rng: number;
  day: number;
  clock: number;
  cash: number;
  rep: number;
  customers: CustomerDef[];
  index: number;
  job: Job | null;
  hands: Hand;
  spare: Spare;
  stock: Record<Sku, number>;
  orders: Order[];
  police: PoliceEvent | null;
  leaving: Leaving | null;
  stats: DayStats;
  dayOver: boolean;
  summary: DaySummary | null;
  startCash: number;
  startRep: number;
}

export type MsgKind = "good" | "bad" | "info";
export interface Msg { kind: MsgKind; text: string; log?: boolean }
export interface Result { state: GameState; msgs: Msg[] }

const ok = (state: GameState, ...msgs: Msg[]): Result => ({ state, msgs });
const no = (state: GameState, text: string): Result => ({ state, msgs: [{ kind: "bad", text }] });
const money = (n: number) => (n < 0 ? `−$${-n}` : `$${n}`);
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

const emptyStats = (): DayStats => ({ served: 0, repaired: 0, turnedAway: 0, reported: 0, caught: 0, escaped: 0, falseReports: 0, returned: 0, stolenRepaired: 0, oldParts: 0, earned: 0, spent: 0 });

function newRepair(c: CustomerDef): Repair {
  const spec = D.DEVICES[c.device];
  return { flipped: false, out: Array(spec.fastener === "screw" ? spec.count : 0).fill(false), bolt: 0, coverOff: false, slot: "broken" };
}
function newJob(c: CustomerDef | undefined, arrivesAt: number): Job | null {
  if (!c) return null;
  return { customer: c, arrivesAt, accepted: false, where: "customer", repair: newRepair(c), checks: {} };
}

export interface SaveData { day: number; cash: number; rep: number; stock: Record<Sku, number>; seed: number }

export function createGame(save?: Partial<SaveData>): GameState {
  const day = save?.day ?? 1;
  const seed = save?.seed ?? 20261114;
  const customers = generateDay(day, seed);
  const stock = save?.stock ? { ...save.stock } : (Object.fromEntries(D.SKUS.map((s) => [s, D.START_STOCK_EACH])) as Record<Sku, number>);
  const cash = save?.cash ?? D.START_CASH, rep = save?.rep ?? D.START_REP;
  return {
    seed, rng: (seed ^ Math.imul(day, 104729)) >>> 0, day, clock: D.DAY_START, cash, rep,
    customers, index: 0, job: newJob(customers[0], D.DAY_START + D.FIRST_ARRIVAL),
    hands: null, spare: null, stock, orders: [], police: null, leaving: null,
    stats: emptyStats(), dayOver: false, summary: null, startCash: cash, startRep: rep,
  };
}
export const saveData = (s: GameState): SaveData => ({ day: s.dayOver ? s.day + 1 : s.day, cash: s.cash, rep: s.rep, stock: s.stock, seed: s.seed });
/** Start the next day, carrying cash, rep and drawers over. Pending deliveries arrive overnight. */
export function nextDay(s: GameState): GameState {
  const stock = { ...s.stock };
  for (const o of s.orders) stock[o.sku] = Math.min(D.DRAWER_CAP, stock[o.sku] + o.qty);
  return createGame({ day: s.day + 1, cash: s.cash, rep: s.rep, stock, seed: s.seed });
}

function roll(s: GameState): [number, GameState] {
  const [v, n] = rngNext(s.rng);
  return [v, { ...s, rng: n }];
}

// ------------------------------------------------------------- helpers
export const spec = (j: Job) => D.DEVICES[j.customer.device];
export const devName = (j: Job) => spec(j).label;
export const arrived = (s: GameState) => !!s.job && s.clock >= s.job.arrivesAt && !s.dayOver;
export const atCounter = (s: GameState) => arrived(s) && !s.police && !!s.job && s.job.where !== "gone" && s.job.where !== "police";
const withJob = (s: GameState, patch: Partial<Job>): GameState => ({ ...s, job: { ...s.job!, ...patch } });
const withRepair = (s: GameState, patch: Partial<Repair>): GameState => withJob(s, { repair: { ...s.job!.repair, ...patch } });
export const looseKind = (p: Loose): D.PartKind => ("sku" in p ? D.PARTS[p.sku].kind : p.old);
export const looseName = (p: Loose) => ("sku" in p ? D.PARTS[p.sku].name.toLowerCase() : `old ${D.BROKEN_LABEL[p.old]}`);
export const heldName = (h: Hand | Spare): string =>
  !h ? "nothing" : h.t === "tool" ? h.tool : h.t === "part" ? looseName(h.part) : "the item";
export const toolAt = (s: GameState, t: Tool): "hands" | "spare" | "rack" =>
  s.hands?.t === "tool" && s.hands.tool === t ? "hands" : s.spare?.t === "tool" && s.spare.tool === t ? "spare" : "rack";

export function fastenersOut(j: Job) {
  const sp = spec(j);
  return sp.fastener === "bolt" ? j.repair.bolt >= D.BOLT_CLICKS : j.repair.out.every(Boolean);
}
export function fastenersIn(j: Job) {
  const sp = spec(j);
  return sp.fastener === "bolt" ? j.repair.bolt <= 0 : j.repair.out.every((v) => !v);
}
/** The part slot can be reached. */
export function slotOpen(j: Job) {
  return spec(j).cover ? j.repair.coverOff : fastenersOut(j);
}
/** Back together (whatever is inside). */
export const closed = (j: Job) => !j.repair.coverOff && fastenersIn(j);
export const repaired = (j: Job) => closed(j) && j.repair.slot !== "broken" && j.repair.slot !== "empty" && j.repair.slot !== "old";
export const flagged = (j: Job) => CHECKS.some((c) => j.checks[c] === "fail");
const serviceUp = (j: Job) => !spec(j).flip || j.repair.flipped;

function benchJob(s: GameState): Job | null {
  return s.job && s.job.where === "bench" ? s.job : null;
}

// ------------------------------------------------------------- clock
/** Advance the shop clock. Deliveries land; at 21:00 the stand closes. */
export function tick(s: GameState, minutes: number): Result {
  if (s.dayOver || minutes <= 0) return ok(s);
  const clock = Math.min(D.DAY_END, s.clock + minutes);
  let st: GameState = { ...s, clock };
  const msgs: Msg[] = [];
  const due = st.orders.filter((o) => o.at <= clock);
  if (due.length) {
    const stock = { ...st.stock };
    for (const o of due) stock[o.sku] = Math.min(D.DRAWER_CAP, stock[o.sku] + o.qty);
    st = { ...st, stock, orders: st.orders.filter((o) => o.at > clock) };
    msgs.push({ kind: "good", text: `Delivery: ${due.map((o) => `${o.qty}× ${D.PARTS[o.sku].name.toLowerCase()}`).join(", ")} — in the drawers.`, log: true });
  }
  if (clock >= D.DAY_END) {
    if (st.police) st = applyPolice(st).state;
    const remaining = st.customers.length - st.index;
    const rep = remaining * D.UNSERVED_REP;
    st = {
      ...st, rep: st.rep + rep, dayOver: true, job: null, police: null,
      hands: st.hands?.t === "device" ? null : st.hands,
      summary: { endedAt: D.DAY_END, bonus: null, unserved: remaining, startCash: st.startCash, startRep: st.startRep },
    };
    msgs.push({ kind: remaining ? "bad" : "info", text: remaining ? `21:00. The stand closes with ${remaining} still waiting. ${signed(rep)} rep.` : "21:00. The stand closes.", log: true });
  }
  return { state: st, msgs };
}

function finishCustomer(s: GameState, how: Leaving["how"] = "walk"): GameState {
  const j = s.job!;
  const index = s.index + 1;
  const stats = { ...s.stats, served: s.stats.served + 1 };
  const hands = s.hands?.t === "device" ? null : s.hands;
  const leaving: Leaving = { customer: j.customer, at: s.clock, how };
  if (index >= s.customers.length) {
    const spare = D.DAY_END - s.clock;
    const bonus = spare > D.BONUS_WINDOW ? D.EARLY_BONUS : null;
    return {
      ...s, index, job: null, hands, stats, leaving, police: null, dayOver: true,
      cash: s.cash + (bonus?.cash ?? 0), rep: s.rep + (bonus?.rep ?? 0),
      summary: { endedAt: s.clock, bonus, unserved: 0, startCash: s.startCash, startRep: s.startRep },
    };
  }
  return { ...s, index, job: newJob(s.customers[index], s.clock + D.ARRIVAL_GAP), hands, stats, leaving, police: null };
}

// ------------------------------------------------------------- counter
export function accept(s: GameState): Result {
  const j = s.job;
  if (!j || !atCounter(s) || j.accepted) return no(s, "There's no one handing anything over.");
  return ok(withJob(s, { accepted: true, where: "counter" }), { kind: "info", text: `${j.customer.name} sets the ${devName(j)} on the counter.`, log: true });
}

export function turnAway(s: GameState): Result {
  const j = s.job;
  if (!j || !atCounter(s) || j.accepted) return no(s, "You can't turn them away now.");
  const st = finishCustomer({ ...s, rep: s.rep + D.TURN_AWAY_REP, stats: { ...s.stats, turnedAway: s.stats.turnedAway + 1 } });
  return ok(st, { kind: "info", text: `Turned ${j.customer.name} away. ${signed(D.TURN_AWAY_REP)} rep.`, log: true });
}

function record(s: GameState, c: CheckId): GameState {
  const j = s.job!;
  return withJob(s, { checks: { ...j.checks, [c]: j.customer.failing.includes(c) ? "fail" : "pass" } });
}
/** Ask for papers or the item's story while they wait at the counter. */
export function ask(s: GameState, c: "id" | "story"): Result {
  const j = s.job;
  if (!j || !atCounter(s)) return no(s, "No one to ask.");
  const st = record(s, c);
  const fail = st.job!.checks[c] === "fail";
  return ok(st, { kind: fail ? "bad" : "info", text: `Noted: ${c === "id" ? "papers" : "their story"}${fail ? " — something's off." : "."}` });
}
/** Look the item over. Reveals the serial number for the PC registry. */
export function examine(s: GameState): Result {
  const j = s.job;
  if (!j || !j.accepted || (j.where !== "counter" && j.where !== "bench" && j.where !== "hands")) return no(s, "Take the item first.");
  const st = record(s, "examine");
  const fail = st.job!.checks.examine === "fail";
  return ok(st, { kind: fail ? "bad" : "info", text: `Serial ${j.customer.serial} noted${fail ? " — it's been tampered with." : "."}` });
}
export function lookup(s: GameState): Result {
  const j = s.job;
  if (!j || !j.accepted || j.where === "gone" || j.where === "police") return no(s, "Nothing to look up.");
  if (!j.checks.examine) return no(s, "No serial noted yet. Examine the item first.");
  const st = record(s, "registry");
  const fail = st.job!.checks.registry === "fail";
  return ok(st, { kind: fail ? "bad" : "info", text: fail ? `Registry: ${j.customer.serial} is REPORTED STOLEN.` : `Registry: ${j.customer.serial} is clean.`, log: fail });
}

/** Only offered once a check has failed: the real owner collects it and pays a finder's fee. */
export function returnToOwner(s: GameState): Result {
  const j = s.job;
  if (!j || !atCounter(s) || !j.accepted) return no(s, "Nothing to return.");
  if (!flagged(j)) return no(s, "Nothing says it isn't theirs.");
  if (j.where === "hands" || (j.where === "bench" && !closed(j))) return no(s, "Put it back together and on the counter first.");
  const r = j.customer.stolen ? D.RETURN_OWNER : { cash: 0, rep: -8 };
  const st = finishCustomer({
    ...s, job: { ...j, where: "gone" }, cash: s.cash + r.cash, rep: s.rep + r.rep,
    stats: { ...s.stats, returned: s.stats.returned + 1, earned: s.stats.earned + r.cash },
  });
  return ok(st, j.customer.stolen
    ? { kind: "good", text: `${j.customer.owner} collects the ${devName(j)} and pays a finder's fee. +$${r.cash}, ${signed(r.rep)} rep.`, log: true }
    : { kind: "bad", text: `There was no other owner. ${j.customer.name} storms off. ${signed(r.rep)} rep.`, log: true });
}

/** Call the patrol. Payment is never promised: the officer decides. */
export function reportPolice(s: GameState): Result {
  const j = s.job;
  if (!j || !atCounter(s) || !j.accepted) return no(s, "There's no one to report.");
  let st = s;
  let v: number;
  let outcome: PoliceEvent["outcome"], cash = 0, rep = 0, line: string;
  if (!j.customer.stolen) {
    outcome = "false";
    rep = D.POLICE.falseRep;
    line = `"Papers are clean. You wasted our night, mender." They let ${j.customer.name} go.`;
  } else {
    [v, st] = roll(st);
    if (v < D.escapeChance(s.day)) {
      outcome = "escaped";
      rep = D.POLICE.escapedRep;
      line = `${j.customer.name} bolts into the fog before the cuffs close. "We'll find them. Maybe."`;
    } else {
      outcome = "caught";
      [v, st] = roll(st);
      if (v < D.POLICE.bountyChance) {
        [v, st] = roll(st);
        cash = D.POLICE.bountyMin + Math.floor(v * D.POLICE.bountySpread) + s.day * 2;
        rep = D.POLICE.caughtRep;
        line = `"Good eye. There's a bounty on this one." The officer counts out $${cash}.`;
      } else {
        rep = D.POLICE.thanksRep;
        line = `"Thank you, citizen. The Ministry will remember this." No money changes hands.`;
      }
    }
  }
  st = { ...st, police: { outcome, cash, rep, line, suspect: j.customer }, job: { ...j, where: "police" }, hands: st.hands?.t === "device" ? null : st.hands };
  return ok(st, { kind: "info", text: "You pull the cord. Somewhere in the fog, a siren answers.", log: true });
}
function applyPolice(s: GameState): Result {
  const p = s.police;
  if (!p || !s.job) return no(s, "No patrol here.");
  const stats = {
    ...s.stats, reported: s.stats.reported + 1, earned: s.stats.earned + p.cash,
    caught: s.stats.caught + (p.outcome === "caught" ? 1 : 0), escaped: s.stats.escaped + (p.outcome === "escaped" ? 1 : 0),
    falseReports: s.stats.falseReports + (p.outcome === "false" ? 1 : 0),
  };
  const how: Leaving["how"] = p.outcome === "caught" ? "arrested" : p.outcome === "escaped" ? "escaped" : "walk";
  const st = finishCustomer({ ...s, cash: s.cash + p.cash, rep: s.rep + p.rep, stats }, how);
  return ok(st, { kind: p.outcome === "false" ? "bad" : "good", text: `${p.outcome === "caught" ? "Arrested" : p.outcome === "escaped" ? "Escaped" : "False report"}: ${p.cash ? `+$${p.cash}, ` : ""}${signed(p.rep)} rep.`, log: true });
}
/** The cinematic is over: settle up and call the next customer. */
export const finishPolice = applyPolice;

/** Final hand-off from the counter, after they've had a look at it. */
export function handOver(s: GameState): Result {
  const j = s.job;
  if (!j || !atCounter(s) || !j.accepted) return no(s, "No one to hand it to.");
  if (j.where !== "counter") return no(s, `Put the ${devName(j)} on the counter so they can see it.`);
  if (!closed(j)) return no(s, "It's still in pieces. Put it back together first.");
  const c = j.customer;
  const slot = j.repair.slot;
  if (slot === "broken") {
    const st = finishCustomer({ ...s, rep: s.rep + D.UNFIXED_RETURN_REP });
    return ok(st, { kind: "bad", text: `${c.name} takes it back unfixed. ${signed(D.UNFIXED_RETURN_REP)} rep.`, log: true });
  }
  if (slot === "old") {
    const st = finishCustomer({ ...s, rep: s.rep + D.OLD_PART_REP, stats: { ...s.stats, oldParts: s.stats.oldParts + 1 } });
    return ok(st, { kind: "bad", text: `${c.name} sees it's the same ${D.BROKEN_LABEL[c.fault]} and walks off without paying. ${signed(D.OLD_PART_REP)} rep.`, log: true });
  }
  if (slot === "empty") return no(s, "There's nothing inside it.");
  const p = D.PARTS[slot];
  const tip = p.tier === "better" ? D.BETTER_TIP : 0;
  const cash = c.fee + tip;
  const rep = c.stolen ? D.STOLEN_REPAIR_REP : p.rep;
  const stats = {
    ...s.stats, repaired: s.stats.repaired + 1, earned: s.stats.earned + cash,
    stolenRepaired: s.stats.stolenRepaired + (c.stolen ? 1 : 0),
  };
  const st = finishCustomer({ ...s, cash: s.cash + cash, rep: s.rep + rep, stats });
  return ok(st, {
    kind: c.stolen ? "bad" : "good", log: true,
    text: c.stolen
      ? `${c.name} pays $${cash} and vanishes into the fog. Later you hear whose it was. ${signed(rep)} rep.`
      : `${c.name} pays $${c.fee}${tip ? ` + $${tip} tip` : ""}. ${signed(rep)} rep.`,
  });
}

// ------------------------------------------------------------- hands
export function pickUpDevice(s: GameState): Result {
  const j = s.job;
  if (!j || (j.where !== "counter" && j.where !== "bench")) return no(s, "Nothing to pick up.");
  if (s.hands) return no(s, `Your hands are full (${heldName(s.hands)}). Put it down first.`);
  if (j.where === "bench" && !closed(j)) return no(s, "It's open — you'd scatter the pieces. Close it up first.");
  const st = withRepair(withJob({ ...s, hands: { t: "device" } }, { where: "hands" }), { flipped: false });
  return ok(st, { kind: "info", text: `Picked up the ${devName(j)}.` });
}
export function placeDevice(s: GameState, at: "counter" | "bench"): Result {
  const j = s.job;
  if (!j || s.hands?.t !== "device") return no(s, "You're not holding the item.");
  return ok(withJob({ ...s, hands: null }, { where: at }), { kind: "info", text: at === "bench" ? `The ${devName(j)} is on the workbench.` : `The ${devName(j)} is on the counter.` });
}
export function takeTool(s: GameState, tool: Tool): Result {
  if (toolAt(s, tool) !== "rack" && toolAt(s, tool) !== "spare") return no(s, `You're already holding the ${tool}.`);
  if (s.hands) return no(s, `Your hands are full (${heldName(s.hands)}). Put it down first.`);
  const spare = toolAt(s, tool) === "spare" ? null : s.spare;
  return ok({ ...s, hands: { t: "tool", tool }, spare }, { kind: "info", text: `Took the ${tool}.` });
}
export function rackTool(s: GameState): Result {
  if (s.hands?.t !== "tool") return no(s, "You're not holding a tool.");
  return ok({ ...s, hands: null }, { kind: "info", text: `Hung the ${s.hands.tool} back up.` });
}
export function takePart(s: GameState, sku: Sku): Result {
  if (s.hands) return no(s, `Your hands are full (${heldName(s.hands)}). Put it down first.`);
  if (s.stock[sku] <= 0) return no(s, `The ${D.PARTS[sku].name.toLowerCase()} drawer is empty. Order more on the PC.`);
  return ok({ ...s, hands: { t: "part", part: { sku } }, stock: { ...s.stock, [sku]: s.stock[sku] - 1 } }, { kind: "info", text: `Took a ${D.PARTS[sku].name.toLowerCase()} (${s.stock[sku] - 1} left).` });
}
export function returnPart(s: GameState, sku: Sku): Result {
  const h = s.hands;
  if (h?.t !== "part" || !("sku" in h.part) || h.part.sku !== sku) return no(s, "That doesn't go in this drawer.");
  return ok({ ...s, hands: null, stock: { ...s.stock, [sku]: s.stock[sku] + 1 } }, { kind: "info", text: `Put the ${D.PARTS[sku].name.toLowerCase()} back.` });
}
export function bin(s: GameState): Result {
  const h = s.hands;
  if (!h) return no(s, "Nothing in your hands to throw away.");
  if (h.t === "device") return no(s, "That's a customer's property. You can't bin it.");
  if (h.t === "tool") return no(s, "You'll need that. Hang it on the rack.");
  return ok({ ...s, hands: null }, { kind: "info", text: `Binned the ${looseName(h.part)}.` });
}
export function putSpare(s: GameState): Result {
  const h = s.hands;
  if (!h || h.t === "device") return no(s, h ? "The item goes on the work mat." : "Nothing to put down.");
  if (s.spare) return no(s, `The tray already holds the ${heldName(s.spare)}.`);
  return ok({ ...s, hands: null, spare: h }, { kind: "info", text: `Set the ${heldName(h)} in the tray.` });
}
export function takeSpare(s: GameState): Result {
  if (!s.spare) return no(s, "The tray is empty.");
  if (s.hands) return no(s, `Your hands are full (${heldName(s.hands)}).`);
  return ok({ ...s, hands: s.spare, spare: null }, { kind: "info", text: `Picked up the ${heldName(s.spare)}.` });
}

// ------------------------------------------------------------- repair
export function flip(s: GameState): Result {
  const j = benchJob(s);
  if (!j) return no(s, "Put the item on the workbench first.");
  if (!spec(j).flip) return no(s, "No need to flip this one.");
  if (s.hands) return no(s, "You need both hands free to turn it over.");
  const flipped = !j.repair.flipped;
  return ok(withRepair(s, { flipped }), { kind: "info", text: flipped ? `Flipped the ${devName(j)} face-down.` : `Turned the ${devName(j)} face-up.` });
}

/** One press on screw i (or the bolt): out when it's going apart, in when it's going back together. */
export function turnFastener(s: GameState, i = 0): Result {
  const j = benchJob(s);
  if (!j) return no(s, "Put the item on the workbench first.");
  const sp = spec(j);
  if (s.hands?.t !== "tool" || s.hands.tool !== sp.tool) return no(s, `You need the ${sp.tool} for that. Hands: ${heldName(s.hands)}.`);
  if (!serviceUp(j)) return no(s, `The screws are on the back. Flip it over.`);
  if (j.repair.coverOff) return no(s, `The ${sp.coverLabel} is off. Put it back first.`);
  const r = j.repair;
  if (sp.fastener === "bolt") {
    if (r.slot === "broken") {
      if (r.bolt >= D.BOLT_CLICKS) return no(s, "The bolt's out. Pull the handle.");
      const bolt = r.bolt + 1;
      return ok(withRepair(s, { bolt }), { kind: "info", text: bolt >= D.BOLT_CLICKS ? "The bolt comes free." : `Click. (${bolt}/${D.BOLT_CLICKS})` });
    }
    if (r.slot === "empty") return no(s, "Fit a handle before you tighten the bolt.");
    if (r.bolt <= 0) return no(s, "It's already tight.");
    const bolt = Math.max(0, r.bolt - D.BOLT_CLICKS / D.BOLT_TIGHTEN);
    return ok(withRepair(s, { bolt }), { kind: "info", text: bolt <= 0 ? "Bolt snug. The head won't budge." : `Tightening… (${D.BOLT_TIGHTEN - bolt / (D.BOLT_CLICKS / D.BOLT_TIGHTEN)}/${D.BOLT_TIGHTEN})` });
  }
  if (i < 0 || i >= r.out.length) return no(s, "No screw there.");
  const out = r.out.map((v, k) => (k === i ? !v : v));
  const left = out.filter((v) => !v).length;
  const removing = !r.out[i];
  return ok(withRepair(s, { out }), {
    kind: "info",
    text: removing ? (left ? `Screw out. ${left} to go.` : sp.cover ? `All screws out. Lift the ${sp.coverLabel} off.` : "All screws out.") : (left === out.length ? "All screws back in." : "Screw in."),
  });
}

export function removeCover(s: GameState): Result {
  const j = benchJob(s);
  if (!j || !spec(j).cover) return no(s, "Nothing to lift off.");
  const sp = spec(j);
  if (s.hands) return no(s, `Free your hands first (${heldName(s.hands)}).`);
  if (!serviceUp(j)) return no(s, "Flip it over first.");
  if (j.repair.coverOff) return no(s, "It's already off.");
  if (!fastenersOut(j)) return no(s, `Take all ${sp.count} screws out first.`);
  return ok(withRepair(s, { coverOff: true }), { kind: "info", text: `Lifted the ${sp.coverLabel} off. The ${D.PART_LABEL[j.customer.fault]} is exposed.` });
}
export function replaceCover(s: GameState): Result {
  const j = benchJob(s);
  if (!j || !j.repair.coverOff) return no(s, "Nothing to put back.");
  if (s.hands) return no(s, `Free your hands first (${heldName(s.hands)}).`);
  if (j.repair.slot === "empty") return no(s, `Fit a ${D.PART_LABEL[j.customer.fault]} before closing it up.`);
  return ok(withRepair(s, { coverOff: false }), { kind: "info", text: `${spec(j).coverLabel[0]!.toUpperCase()}${spec(j).coverLabel.slice(1)} back on. Now the screws.` });
}
export function pullPart(s: GameState): Result {
  const j = benchJob(s);
  if (!j) return no(s, "Put the item on the workbench first.");
  if (s.hands) return no(s, `Free your hands first (${heldName(s.hands)}).`);
  if (!slotOpen(j)) return no(s, spec(j).cover ? `Get the ${spec(j).coverLabel} off first.` : "Back the bolt out first.");
  const slot = j.repair.slot;
  if (slot === "empty") return no(s, "The slot is empty.");
  const part: Loose = slot === "broken" || slot === "old" ? { old: j.customer.fault } : { sku: slot };
  return ok(withRepair({ ...s, hands: { t: "part", part } }, { slot: "empty" }), { kind: "info", text: `Pulled out the ${looseName(part)}.` });
}
export function fitPart(s: GameState): Result {
  const j = benchJob(s);
  const h = s.hands;
  if (!j) return no(s, "Put the item on the workbench first.");
  if (h?.t !== "part") return no(s, "You're not holding a part.");
  if (looseKind(h.part) !== j.customer.fault) return no(s, `That won't fit a ${devName(j)}.`);
  if (j.repair.slot !== "empty") return no(s, "Take the old one out first.");
  if (!slotOpen(j)) return no(s, "It's not open.");
  const slot: Slot = "sku" in h.part ? h.part.sku : "old";
  const sp = spec(j);
  const nextStep = sp.cover ? `Put the ${sp.coverLabel} back on.` : "Tighten the bolt.";
  return ok(withRepair({ ...s, hands: null }, { slot }), {
    kind: slot === "old" ? "bad" : "good",
    text: slot === "old" ? `You put the old ${D.BROKEN_LABEL[j.customer.fault]} back in. ${nextStep}` : `Fitted the ${looseName(h.part)}. ${nextStep}`,
  });
}

// ------------------------------------------------------------- PC orders
export function cartCost(cart: CartLine[]) {
  const items = cart.reduce((n, l) => n + (l.pack === "bulk" ? D.PARTS[l.sku].bulk : D.PARTS[l.sku].unit), 0);
  return { items, fee: cart.length ? D.DELIVERY_FEE : 0, total: items + (cart.length ? D.DELIVERY_FEE : 0) };
}
export function checkout(s: GameState, cart: CartLine[]): Result {
  if (!cart.length) return no(s, "The order is empty.");
  if (s.dayOver) return no(s, "The depot is closed.");
  const c = cartCost(cart);
  if (c.total > s.cash) return no(s, `That's ${money(c.total)}. You have ${money(s.cash)}.`);
  const at = s.clock + D.DELIVERY_MINUTES;
  const merged = new Map<Sku, number>();
  for (const l of cart) merged.set(l.sku, (merged.get(l.sku) ?? 0) + (l.pack === "bulk" ? D.BULK_QTY : 1));
  const orders = [...s.orders, ...[...merged].map(([sku, qty]) => ({ sku, qty, at }))];
  return ok({ ...s, cash: s.cash - c.total, orders, stats: { ...s.stats, spent: s.stats.spent + c.total } }, {
    kind: "good", log: true, text: `Order sent: ${money(c.total)} incl. ${money(c.fee)} delivery. Arrives about ${fmtClock(at)}.`,
  });
}

export function fmtClock(m: number) {
  const h = Math.floor(m / 60), mm = Math.floor(m % 60);
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** What the player should do next — drives the objective line. */
export function objective(s: GameState): string {
  if (s.dayOver) return "The stand is closed.";
  if (s.police) return "The patrol is here.";
  const j = s.job;
  if (!j) return "";
  if (!arrived(s)) return "Someone is coming through the fog…";
  const name = j.customer.name;
  if (!j.accepted) return `Speak to ${name} at the counter.`;
  const sp = spec(j);
  const dev = sp.label;
  if (j.where === "counter") {
    if (closed(j) && j.repair.slot !== "broken") return `Talk to ${name} to hand the ${dev} over.`;
    return `Carry the ${dev} to the workbench. (Notepad: N)`;
  }
  if (j.where === "hands") return repaired(j) || j.repair.slot === "old" ? `Set the ${dev} on the counter for ${name} to see.` : `Put the ${dev} on the workbench.`;
  const r = j.repair;
  const tool = sp.tool;
  const holding = s.hands?.t === "tool" && s.hands.tool === tool;
  if (r.slot === "broken") {
    if (sp.flip && !r.flipped && !r.coverOff && fastenersIn(j)) return `Flip the ${dev} over — the screws are on the back.`;
    if (!fastenersOut(j)) {
      if (!holding) return `Take the ${tool} from the rack.`;
      return sp.fastener === "bolt" ? `Back the bolt out (${r.bolt}/${D.BOLT_CLICKS}).` : `Remove the screws (${r.out.filter((v) => !v).length} left).`;
    }
    if (sp.cover && !r.coverOff) return s.hands ? "Free your hands, then lift the cover off." : `Lift the ${sp.coverLabel} off.`;
    return s.hands ? "Free your hands to pull the broken part." : `Pull out the ${D.BROKEN_LABEL[j.customer.fault]}.`;
  }
  if (r.slot === "empty") {
    const h = s.hands;
    if (h?.t === "part" && looseKind(h.part) === j.customer.fault && !("old" in h.part)) return `Fit the ${looseName(h.part)}.`;
    if (h?.t === "part") return "Bin the old part or set it in the tray, then fetch a new one from the drawers.";
    return `Fetch a ${D.PART_LABEL[j.customer.fault]} from the drawers.`;
  }
  if (sp.cover && r.coverOff) return s.hands ? "Free your hands, then put the cover back." : `Put the ${sp.coverLabel} back on.`;
  if (!fastenersIn(j)) {
    if (!holding) return `Take the ${tool} to close it up.`;
    return sp.fastener === "bolt" ? "Tighten the bolt." : `Screw it back together (${r.out.filter(Boolean).length} left).`;
  }
  if (s.hands) return "Free your hands to pick the item up.";
  return `Pick up the ${dev} and set it on the counter.`;
}
