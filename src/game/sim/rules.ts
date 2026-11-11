// Counterfix rules: pure state transitions. No React, no three.js.
import {
  CUSTOMERS, CUSTOMERS_PER_DAY, LOCKPICK_FEE_BONUS, MAX_STOCK, PARTS, SCREWS_PER_DEVICE, START_CASH,
  START_REP, START_STOCK, STOLEN_REPAIR_PAY, STOLEN_REPAIR_REP, STOLEN_REWARD, UNSCREW_REP,
  DEVICE_LABEL, PART_LABEL, toolFor,
  type CustomerDef, type Sku, type ToolId,
} from "./data";

export type DeviceWhere = "customer" | "counter" | "hands" | "desk";

export interface Job {
  customer: CustomerDef;
  accepted: boolean;
  inspected: boolean;
  where: DeviceWhere;
  screwsOut: boolean[];
  partOut: boolean;
  replacement: Sku | null;
  repaired: boolean;
  method: "part" | "lockpick" | "unscrew" | null;
}

export interface GameState {
  cash: number;
  rep: number;
  index: number; // current customer (0-based); === CUSTOMERS_PER_DAY when the day is over
  job: Job | null;
  tools: { screwdriver: boolean; wrench: boolean };
  equipped: ToolId;
  stock: Record<Sku, number>;
  stats: { repaired: number; declined: number; reported: number; returned: number; earned: number; spent: number };
  dayOver: boolean;
}

export type MsgKind = "good" | "bad" | "info";
export interface Msg { kind: MsgKind; text: string; log?: boolean }
export interface Result { state: GameState; msgs: Msg[] }

const ok = (state: GameState, ...msgs: Msg[]): Result => ({ state, msgs });
const no = (state: GameState, text: string): Result => ({ state, msgs: [{ kind: "bad", text }] });

function newJob(index: number): Job | null {
  const customer = CUSTOMERS[index];
  if (!customer) return null;
  return {
    customer, accepted: false, inspected: false, where: "customer",
    screwsOut: Array(SCREWS_PER_DEVICE).fill(false), partOut: false, replacement: null, repaired: false, method: null,
  };
}

export function createGame(): GameState {
  return {
    cash: START_CASH, rep: START_REP, index: 0, job: newJob(0),
    tools: { screwdriver: false, wrench: false }, equipped: "hands",
    stock: { ...START_STOCK },
    stats: { repaired: 0, declined: 0, reported: 0, returned: 0, earned: 0, spent: 0 },
    dayOver: false,
  };
}

function nextCustomer(s: GameState): GameState {
  const index = s.index + 1;
  const dayOver = index >= CUSTOMERS_PER_DAY;
  return { ...s, index, job: dayOver ? null : newJob(index), dayOver };
}

const withJob = (s: GameState, patch: Partial<Job>): GameState => ({ ...s, job: { ...s.job!, ...patch } });
const deviceName = (j: Job) => DEVICE_LABEL[j.customer.device];
export const carrying = (s: GameState) => s.job?.where === "hands";

// ------------------------------------------------------------- counter
export function inspect(s: GameState): Result {
  const j = s.job;
  if (!j || j.accepted && j.where !== "counter") return no(s, "Nothing to inspect right now.");
  return ok(withJob(s, { inspected: true }), {
    kind: j.customer.stolen ? "bad" : "info",
    text: `Inspected ${j.customer.name}'s ${deviceName(j)}${j.customer.stolen ? " — it's stolen." : " — looks legit."}`,
    log: true,
  });
}

export function accept(s: GameState): Result {
  const j = s.job;
  if (!j || j.accepted) return no(s, "There's no job waiting.");
  return ok(withJob(s, { accepted: true, where: "counter" }), {
    kind: "info", text: `Took ${j.customer.name}'s ${deviceName(j)}. It's on the counter.`, log: true,
  });
}

export function decline(s: GameState): Result {
  const j = s.job;
  if (!j || j.accepted) return no(s, "You can't turn this one away now.");
  const next = nextCustomer({ ...s, stats: { ...s.stats, declined: s.stats.declined + 1 } });
  return ok(next, { kind: "info", text: `Turned ${j.customer.name} away.`, log: true });
}

export function resolveStolen(s: GameState, choice: "police" | "return"): Result {
  const j = s.job;
  if (!j || !j.customer.stolen || !j.inspected) return no(s, "Inspect the item first.");
  if (j.where === "hands" || j.where === "desk") return no(s, "Bring it back to the counter first.");
  const r = STOLEN_REWARD[choice];
  const stats = {
    ...s.stats,
    reported: s.stats.reported + (choice === "police" ? 1 : 0),
    returned: s.stats.returned + (choice === "return" ? 1 : 0),
    earned: s.stats.earned + r.cash,
  };
  const next = nextCustomer({ ...s, cash: s.cash + r.cash, rep: s.rep + r.rep, stats });
  const text = choice === "police"
    ? `Reported the ${deviceName(j)} to the police. +$${r.cash}, +${r.rep} rep.`
    : `Returned the ${deviceName(j)} to its real owner. +$${r.cash}, +${r.rep} rep.`;
  return ok(next, { kind: "good", text, log: true });
}

// ------------------------------------------------------------- carrying
export function pickUp(s: GameState): Result {
  const j = s.job;
  if (!j || (j.where !== "counter" && j.where !== "desk")) return no(s, "Nothing to pick up.");
  if (j.where === "desk" && j.screwsOut.some(Boolean) && !j.repaired) return no(s, "Finish the repair before moving it — screws are out.");
  return ok(withJob(s, { where: "hands" }), { kind: "info", text: `Picked up the ${deviceName(j)}.` });
}

export function placeOnDesk(s: GameState): Result {
  const j = s.job;
  if (!j || j.where !== "hands") return no(s, "You're not carrying anything.");
  return ok(withJob(s, { where: "desk" }), { kind: "info", text: `Put the ${deviceName(j)} on the repair desk.` });
}

export function putOnCounter(s: GameState): Result {
  const j = s.job;
  if (!j || j.where !== "hands") return no(s, "You're not carrying anything.");
  return ok(withJob(s, { where: "counter" }));
}

// ------------------------------------------------------------- tools
export function grabTool(s: GameState, tool: "screwdriver" | "wrench"): Result {
  return ok({ ...s, tools: { ...s.tools, [tool]: true }, equipped: tool }, { kind: "info", text: `Equipped the ${tool}.` });
}

export function equip(s: GameState, tool: ToolId): Result {
  if (tool !== "hands" && !s.tools[tool]) return no(s, `Grab the ${tool} from the repair desk first.`);
  return ok({ ...s, equipped: tool });
}

// ------------------------------------------------------------- repair
function onDesk(s: GameState): Job | null {
  return s.job && s.job.where === "desk" && !s.job.repaired ? s.job : null;
}

export function removeScrew(s: GameState, i: number): Result {
  const j = onDesk(s);
  if (!j) return no(s, "Put the device on the repair desk first.");
  if (j.method === "lockpick") return no(s, "Already open.");
  if (j.screwsOut[i]) return no(s, "That one's already out.");
  const need = toolFor(j.customer.device);
  if (s.equipped !== need) return no(s, `Wrong tool — this needs the ${need}.`);
  const screwsOut = j.screwsOut.map((v, k) => (k === i ? true : v));
  const left = screwsOut.filter((v) => !v).length;
  if (j.customer.fault === "lock" && left === 0) {
    const rep = UNSCREW_REP;
    return ok(withJob(s, { screwsOut, repaired: true, method: "unscrew" }), {
      kind: "good", text: `All three catches off — the strongbox is open. Hand it back.`, log: true,
    }, { kind: "info", text: `(+${rep} rep when returned)` });
  }
  return ok(withJob(s, { screwsOut }), {
    kind: "info",
    text: left ? `Screw out. ${left} to go.` : `All screws out. Equip hands and pull out the ${PART_LABEL[j.customer.fault]}.`,
  });
}

export function pullPart(s: GameState): Result {
  const j = onDesk(s);
  if (!j) return no(s, "Put the device on the repair desk first.");
  if (j.customer.fault === "lock") return no(s, "Unscrew the catches or pick the lock.");
  if (j.screwsOut.some((v) => !v)) return no(s, "Take all the screws out first.");
  if (j.partOut) return no(s, "Already out.");
  if (s.equipped !== "hands") return no(s, "Equip your hands (3) to pull the part.");
  return ok(withJob(s, { partOut: true }), {
    kind: "info", text: `Pulled out the ${PART_LABEL[j.customer.fault]} and binned it. Pick a replacement.`,
  });
}

export function chooseReplacement(s: GameState, sku: Sku): Result {
  const j = onDesk(s);
  if (!j || !j.partOut) return no(s, "Remove the damaged part first.");
  const part = PARTS[sku];
  if (part.kind !== j.customer.fault) return no(s, `That doesn't fit a ${DEVICE_LABEL[j.customer.device]}.`);
  if (s.stock[sku] <= 0) return no(s, `Out of ${part.name.toLowerCase()}s. Grab more from the parts shelf.`);
  return ok(withJob(s, { replacement: sku }), { kind: "info", text: `${part.name} ready. Equip hands and fit it.` });
}

export function fitPart(s: GameState): Result {
  const j = onDesk(s);
  if (!j || !j.replacement) return no(s, "Choose a replacement part first.");
  if (s.equipped !== "hands") return no(s, "Equip your hands (3) to fit the part.");
  const part = PARTS[j.replacement];
  if (s.stock[part.sku] <= 0) return no(s, `Out of ${part.name.toLowerCase()}s.`);
  const state: GameState = {
    ...s,
    cash: s.cash - part.price,
    stock: { ...s.stock, [part.sku]: s.stock[part.sku] - 1 },
    stats: { ...s.stats, spent: s.stats.spent + part.price },
  };
  return ok(withJob(state, { repaired: true, method: "part", screwsOut: j.screwsOut.map(() => false) }), {
    kind: "good", text: `Fitted the ${part.name.toLowerCase()} (−$${part.price}). Screws back in. Take it to ${j.customer.name}.`, log: true,
  });
}

export function pickLock(s: GameState): Result {
  const j = onDesk(s);
  if (!j || j.customer.fault !== "lock") return no(s, "No lock to pick.");
  if (j.screwsOut.some(Boolean)) return no(s, "You've started unscrewing — finish the catches.");
  if (s.stock.lockpick <= 0) return no(s, "No lockpicks. Grab one from the parts shelf.");
  const price = PARTS.lockpick.price;
  const state: GameState = {
    ...s, cash: s.cash - price,
    stock: { ...s.stock, lockpick: s.stock.lockpick - 1 },
    stats: { ...s.stats, spent: s.stats.spent + price },
  };
  return ok(withJob(state, { repaired: true, method: "lockpick" }), {
    kind: "good", text: `Click. The lock gives way (−$${price}, lockpick used). Hand it back.`, log: true,
  });
}

// ------------------------------------------------------------- payment
export function payout(j: Job): { cash: number; rep: number } {
  let cash = j.customer.fee;
  let rep = 0;
  if (j.method === "part" && j.replacement) rep = PARTS[j.replacement].rep;
  if (j.method === "lockpick") { cash = Math.round(cash * LOCKPICK_FEE_BONUS); rep = PARTS.lockpick.rep; }
  if (j.method === "unscrew") rep = UNSCREW_REP;
  if (j.customer.stolen) { cash = Math.round(cash * STOLEN_REPAIR_PAY); rep = STOLEN_REPAIR_REP; }
  return { cash, rep };
}

export function returnDevice(s: GameState): Result {
  const j = s.job;
  if (!j || j.where !== "hands") return no(s, "Carry the device back first.");
  if (!j.repaired) return no(s, `It's not fixed yet. Take it to the repair desk.`);
  const p = payout(j);
  const stats = { ...s.stats, repaired: s.stats.repaired + 1, earned: s.stats.earned + p.cash };
  const next = nextCustomer({ ...s, cash: s.cash + p.cash, rep: s.rep + p.rep, stats });
  const repText = p.rep >= 0 ? `+${p.rep}` : `${p.rep}`;
  return ok(next, {
    kind: "good",
    text: j.customer.stolen
      ? `${j.customer.name} paid $${p.cash} and hurried off. Word gets around… ${repText} rep.`
      : `${j.customer.name} paid $${p.cash}. ${repText} rep. Happy customer!`,
    log: true,
  });
}

// ------------------------------------------------------------- parts shelf
/** Taking stock is free: parts are paid for when fitted. */
export function takeStock(s: GameState, sku: Sku): Result {
  if (s.stock[sku] >= MAX_STOCK) return no(s, `You can only hold ${MAX_STOCK} of those.`);
  return ok({ ...s, stock: { ...s.stock, [sku]: s.stock[sku] + 1 } }, {
    kind: "info", text: `+1 ${PARTS[sku].name.toLowerCase()} (paid when fitted).`, log: true,
  });
}

/** What the player should do next — drives the objective tracker. */
export function objective(s: GameState): string {
  if (s.dayOver) return "Day over.";
  const j = s.job;
  if (!j) return "";
  const dev = DEVICE_LABEL[j.customer.device];
  if (!j.accepted) return `Talk to ${j.customer.name} at the counter (E).`;
  if (j.where === "counter") return j.repaired ? `Pick up the ${dev} and hand it to ${j.customer.name}.` : `Pick up the ${dev} from the counter.`;
  if (j.where === "hands") return j.repaired ? `Hand the ${dev} back to ${j.customer.name}.` : `Carry the ${dev} to the repair desk.`;
  if (j.repaired) return `Pick up the ${dev} and return it to ${j.customer.name}.`;
  const need = toolFor(j.customer.device);
  if (j.customer.fault === "lock") return "Pick the lock (lockpick) or unscrew the 3 catches (screwdriver).";
  if (j.screwsOut.some((v) => !v)) return s.equipped === need ? `Remove the screws (${j.screwsOut.filter((v) => !v).length} left).` : `Equip the ${need} and remove 3 screws.`;
  if (!j.partOut) return `Equip hands and pull out the ${PART_LABEL[j.customer.fault]}.`;
  if (!j.replacement) return "Choose a replacement part.";
  return "Equip hands and fit the new part.";
}
