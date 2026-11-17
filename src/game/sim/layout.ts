// The night stand, in world metres. +Z is the street; the player works behind the counter.
import type { Box } from "./movement";
import { BOLT_CLICKS, BROKEN_LABEL, DEVICES, PART_KINDS, PARTS, SKUS, type DeviceKind, type Sku } from "./data";
import * as R from "./rules";

export type V3 = [number, number, number];

export const STAND = { minX: -2.65, maxX: 2.65, minZ: -2.05, maxZ: 1.85, roof: 2.75 };
/** Walkable area (player centre is clamped inside, minus its radius). */
export const ROOM: Box = { minX: -2.6, maxX: 2.6, minZ: -2.0, maxZ: 1.85 };

export const COUNTER = { x: 0, z: 1.55, w: 3.6, d: 0.6, top: 1.02 };
export const BENCH = { x: -1.35, z: -1.6, w: 2.2, d: 0.7, top: 0.92 };
export const CABINET = { x: 1.3, z: -1.78, w: 1.8, d: 0.45 };
export const PC = { x: 2.15, z: -0.35, w: 0.9, d: 0.6, top: 0.8 };
export const BIN = { x: -2.2, z: -0.45, r: 0.22, h: 0.62 };
export const PLAYER_START = { x: 0, z: 0.55, yaw: Math.PI };

export const SPOTS = {
  counterDevice: [0.35, COUNTER.top, 1.45] as V3,
  notepad: [-1.15, COUNTER.top, 1.42] as V3,
  bell: [-0.55, COUNTER.top, 1.62] as V3,
  benchDevice: [-1.65, BENCH.top + 0.004, -1.52] as V3,
  cover: [-1.22, BENCH.top + 0.004, -1.42] as V3,
  screwTray: [-2.23, BENCH.top + 0.006, -1.5] as V3,
  spare: [-0.8, BENCH.top + 0.006, -1.52] as V3,
  screwdriver: [-0.41, BENCH.top + 0.005, -1.45] as V3,
  wrench: [-0.41, BENCH.top + 0.005, -1.72] as V3,
  pcScreen: [1.96, PC.top + 0.22, -0.45] as V3,
};

/** Drawer (row 0 = normal parts, row 1 = better parts; one column per part kind). */
export function drawerPos(sku: Sku): V3 {
  const p = PARTS[sku];
  const c = PART_KINDS.indexOf(p.kind), r = p.tier === "better" ? 1 : 0;
  return [CABINET.x - 0.696 + 0.348 * c, 1.04 + r * 0.28, CABINET.z + CABINET.d / 2 + 0.02];
}

const box = (x: number, z: number, w: number, d: number): Box => ({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
export const COLLIDERS: Box[] = [
  { minX: STAND.minX, maxX: STAND.maxX, minZ: COUNTER.z - COUNTER.d / 2, maxZ: COUNTER.z + COUNTER.d / 2 },
  box(BENCH.x, BENCH.z, BENCH.w, BENCH.d),
  box(CABINET.x, CABINET.z, CABINET.w, CABINET.d),
  box(PC.x, PC.z, PC.d, PC.w),
  box(BIN.x, BIN.z, BIN.r * 2, BIN.r * 2),
];

// ------------------------------------------------------------- customers
export const CUSTOMER_SLOT: V3 = [0, 0, 2.4];
export const FOG_START: V3 = [0.6, 0, 11];
/** Leaving customers drift off sideways along the street, into the fog. */
export const FOG_EXIT: V3 = [-9, 0, 7.5];
/** Patrol car parks on the road; officers step out by its doors. */
export const POLICE_CAR: V3 = [-1.2, 0, 7.6];
/** Shop minutes a customer spends walking out of the fog to the counter. */
export const WALK_IN = 4;
export const WALK_OUT = 5;

// ------------------------------------------------------------- device geometry (relative to the spot it sits on, service side up)
export interface DeviceGeo { h: number; fasteners: V3[]; cover: V3; part: V3; partR: number }
const ring3 = (r: number, y: number): V3[] => [0, 1, 2].map((i) => [Math.cos((i / 3) * Math.PI * 2) * r, y, Math.sin((i / 3) * Math.PI * 2) * r] as V3);
export const DEVICE_GEO: Record<DeviceKind, DeviceGeo> = {
  phone: { h: 0.0102, fasteners: [[-0.03, 0.011, -0.068], [0.03, 0.011, -0.068], [-0.03, 0.011, 0.068], [0.03, 0.011, 0.068]], cover: [0, 0.012, 0], part: [0, 0.008, 0.01], partR: 0.05 },
  "pocket-watch": { h: 0.016, fasteners: [[-0.016, 0.017, 0], [0.016, 0.017, 0]], cover: [0, 0.017, 0.012], part: [0.004, 0.01, 0.0], partR: 0.03 },
  revolver: { h: 0.026, fasteners: [[-0.035, 0.026, 0.002], [0.025, 0.026, 0.002]], cover: [-0.005, 0.027, 0.012], part: [-0.005, 0.02, 0], partR: 0.04 },
  "elf-lantern": { h: 0.35, fasteners: ring3(0.05, 0.264), cover: [0, 0.19, 0], part: [0, 0.13, 0], partR: 0.05 },
  pickaxe: { h: 0.05, fasteners: [[0, 0.054, -0.25]], cover: [0, 0, 0], part: [0, 0.025, 0.12], partR: 0.08 },
  warhammer: { h: 0.065, fasteners: [[0, 0.054, -0.25]], cover: [0, 0, 0], part: [0, 0.025, 0.12], partR: 0.08 },
};

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ------------------------------------------------------------- interaction targets
export interface Target { id: string; pos: V3; radius: number; label: string; alt?: { id: string; label: string } }

/** Everything the player can press E (or F) on right now. */
export function targets(s: R.GameState): Target[] {
  const t: Target[] = [];
  const h = s.hands;
  const j = s.job;
  t.push({ id: "pc", pos: SPOTS.pcScreen, radius: 0.22, label: "Use the terminal" });
  t.push({ id: "notepad", pos: add(SPOTS.notepad, [0, 0.01, 0]), radius: 0.16, label: "Read the notepad" });
  t.push({ id: "bell", pos: add(SPOTS.bell, [0, 0.05, 0]), radius: 0.08, label: "Ring the bell" });
  // bin
  t.push({ id: "bin", pos: [BIN.x, BIN.h, BIN.z], radius: 0.26, label: h?.t === "part" ? `Bin the ${R.looseName(h.part)}` : "Waste bin" });
  // drawers
  for (const sku of SKUS) {
    const p = PARTS[sku];
    const holdingThis = h?.t === "part" && "sku" in h.part && h.part.sku === sku;
    t.push({
      id: holdingThis ? `return:${sku}` : `take:${sku}`, pos: drawerPos(sku), radius: 0.14,
      label: holdingThis ? `Put the ${p.name.toLowerCase()} back` : `${p.name} · ${s.stock[sku]} left`,
    });
  }
  // tools + spare tray
  for (const tool of ["screwdriver", "wrench"] as const) {
    const at = R.toolAt(s, tool);
    if (at === "rack") t.push({ id: `tool:${tool}`, pos: add(SPOTS[tool], [0, 0.02, 0]), radius: 0.09, label: `Take the ${tool}` });
  }
  if (h?.t === "tool") t.push({ id: "rack", pos: [SPOTS.screwdriver[0], BENCH.top + 0.03, (SPOTS.screwdriver[2] + SPOTS.wrench[2]) / 2], radius: 0.18, label: `Hang up the ${h.tool}` });
  if (s.spare) t.push({ id: "spare", pos: add(SPOTS.spare, [0, 0.03, 0]), radius: 0.14, label: `Pick up the ${R.heldName(s.spare)}` });
  else if (h && h.t !== "device") t.push({ id: "spare", pos: add(SPOTS.spare, [0, 0.02, 0]), radius: 0.16, label: `Set the ${R.heldName(h)} in the tray` });

  if (!j || s.dayOver) return t;
  const name = j.customer.name;
  const head: V3 = [CUSTOMER_SLOT[0], 1.4, CUSTOMER_SLOT[2]];
  if (R.atCounter(s)) t.push({ id: "talk", pos: head, radius: 0.5, label: `Talk to ${name}` });
  const sp = DEVICES[j.customer.device];
  const geo = DEVICE_GEO[j.customer.device];
  if (j.where === "counter") {
    t.push({ id: "pickup", pos: add(SPOTS.counterDevice, [0, Math.max(0.03, geo.h / 2), 0]), radius: 0.14, label: `Pick up the ${sp.label}`, alt: { id: "examine", label: "Examine" } });
  }
  if (h?.t === "device") {
    t.push({ id: "put-counter", pos: add(SPOTS.counterDevice, [0, 0.04, 0]), radius: 0.3, label: "Set it on the counter" });
    t.push({ id: "put-bench", pos: add(SPOTS.benchDevice, [0, 0.05, 0]), radius: 0.35, label: "Put it on the workbench" });
  }
  if (j.where === "bench") {
    const base = SPOTS.benchDevice;
    const r = j.repair;
    const up = !sp.flip || r.flipped;
    const closedUp = R.closed(j);
    if (closedUp) t.push({
      id: "pickup", pos: add(base, [0, Math.max(0.03, geo.h / 2), 0.0]), radius: 0.12, label: `Pick up the ${sp.label}`,
      alt: sp.flip ? { id: "flip", label: up ? "Turn it face-up" : "Flip it over" } : { id: "examine", label: "Examine" },
    });
    if (up && !r.coverOff) {
      geo.fasteners.forEach((p, i) => {
        const isOut = r.out[i];
        const label = sp.fastener === "bolt"
          ? r.slot === "broken" ? `Loosen the bolt (${sp.tool}) ${r.bolt}/${BOLT_CLICKS}` : `Tighten the bolt (${sp.tool}) ${BOLT_CLICKS - r.bolt}/${BOLT_CLICKS}`
          : isOut ? `Screw it back in (${sp.tool})` : `Unscrew (${sp.tool})`;
        t.push({ id: `fastener:${i}`, pos: add(base, p), radius: sp.fastener === "bolt" ? 0.04 : 0.022, label });
      });
    }
    if (sp.cover && up && !r.coverOff && R.fastenersOut(j)) t.push({ id: "cover-off", pos: add(base, geo.cover), radius: 0.05, label: `Lift off the ${sp.coverLabel}` });
    if (sp.cover && r.coverOff) t.push({ id: "cover-on", pos: add(SPOTS.cover, [0, 0.02, 0]), radius: 0.08, label: `Put the ${sp.coverLabel} back on` });
    if (R.slotOpen(j)) {
      const pp = add(base, geo.part);
      if (r.slot !== "empty") t.push({ id: "pull", pos: pp, radius: geo.partR, label: r.slot === "broken" || r.slot === "old" ? `Pull out the ${BROKEN_LABEL[j.customer.fault]}` : `Pull out the ${PARTS[r.slot as Sku].name.toLowerCase()}` });
      else if (h?.t === "part") t.push({ id: "fit", pos: pp, radius: geo.partR + 0.02, label: `Fit the ${R.looseName(h.part)}` });
    }
  }
  return t;
}
