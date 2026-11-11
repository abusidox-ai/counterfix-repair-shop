// Shop layout in world metres. Room is 22m (x) by 18m (z); +z is the storefront.
import type { Box } from "./movement";
import { CUSTOMERS_PER_DAY, SCREWS_PER_DEVICE, toolFor, type DeviceKind } from "./data";
import type { GameState } from "./rules";

export type V3 = [number, number, number];

export const ROOM: Box = { minX: -11, maxX: 11, minZ: -9, maxZ: 9 };
export const ROOM_HEIGHT = 4.2;
export const DOOR = { x: 0, width: 1.8, height: 2.5 };

export const COUNTER = { x: 0, z: -1.9, w: 5.15, d: 0.76, top: 1.05 };
export const DESK = { x: -4.6, z: -5.9, w: 2.0, d: 0.8, top: 0.9 };
export const PARTS_SHELF = { x: 10.7, z: -4.2, w: 2.4, d: 0.5 }; // front faces -X
export const PLAYER_START = { x: 0, z: -3.6, yaw: Math.PI }; // behind the counter, facing customers

/** Where things sit on top of furniture. */
export const SPOTS = {
  counterDevice: [0.35, COUNTER.top, -1.85] as V3,
  deskDevice: [DESK.x - 0.25, DESK.top + 0.004, DESK.z + 0.04] as V3,
  screwdriver: [DESK.x + 0.45, DESK.top, DESK.z + 0.22] as V3,
  wrench: [DESK.x + 0.45, DESK.top, DESK.z - 0.05] as V3,
  register: [1.65, COUNTER.top, -2.0] as V3,
  bell: [-0.9, COUNTER.top, -1.7] as V3,
  stool: [DESK.x + 1.4, 0, DESK.z + 0.9] as V3,
};

const box = (x: number, z: number, w: number, d: number): Box => ({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

/** Furniture the player can't walk through. */
export const COLLIDERS: Box[] = [
  box(COUNTER.x, COUNTER.z, COUNTER.w, COUNTER.d),
  box(DESK.x, DESK.z, DESK.w, DESK.d),
  box(PARTS_SHELF.x, PARTS_SHELF.z, PARTS_SHELF.d, PARTS_SHELF.w),
  box(10.7, -0.8, 0.5, 2.4), // second parts unit
  box(-10.6, -4.5, 0.6, 1.0), box(-10.6, -1.5, 0.6, 1.0), box(-10.6, 1.5, 0.6, 1.0), // west stock shelves
  box(-6, 8.6, 2.0, 0.6), box(6.5, -8.6, 2.0, 0.6), box(-1.5, -8.6, 2.0, 0.6), // back/front shelves
  box(SPOTS.stool[0], SPOTS.stool[2], 0.45, 0.45),
  box(10.3, 8.3, 0.6, 0.6), box(-10.3, 8.3, 0.6, 0.6), box(10.3, -8.3, 0.6, 0.6), box(-10.3, -8.3, 0.6, 0.6), // plants
  box(3.2, 8.3, 1.4, 0.8), // crates near the door
  // queue rails
  box(-0.55, 2.2, 0.12, 5.0), box(-1.95, 2.2, 0.12, 5.0),
];

// ------------------------------------------------------------- customers
export const COUNTER_SLOT: V3 = [0, 0, -1.05];
const QUEUE_X = -1.25;
export const QUEUE_SLOTS: V3[] = [[QUEUE_X, 0, 0.3], [QUEUE_X, 0, 1.4], [QUEUE_X, 0, 2.5], [QUEUE_X, 0, 3.6], [QUEUE_X, 0, 4.7]];
export const OUTSIDE: V3 = [0.5, 0, 12];
export const ENTRY_PATH: V3[] = [[0.3, 0, 8.2], [QUEUE_X, 0, 6.2]];
export const EXIT_PATH: V3[] = [[1.3, 0, -0.6], [1.3, 0, 6.5], [0.5, 0, 8.4], OUTSIDE];

export type CustomerPlace = { kind: "gone" } | { kind: "counter" } | { kind: "queue"; slot: number } | { kind: "outside" };

/** Where customer i should be, given the current day state. */
export function customerPlace(i: number, s: Pick<GameState, "index" | "dayOver">): CustomerPlace {
  if (i < s.index || s.dayOver) return { kind: "gone" };
  if (i === s.index) return { kind: "counter" };
  const slot = i - s.index - 1;
  if (slot < QUEUE_SLOTS.length && i < CUSTOMERS_PER_DAY) return { kind: "queue", slot };
  return { kind: "outside" };
}

// ------------------------------------------------------------- device geometry
/** Screw positions on top of each device, in device-local metres (device origin = bottom centre). */
export const SCREWS: Record<DeviceKind, V3[]> = {
  phone: [[-0.028, 0.011, -0.066], [0.028, 0.011, -0.066], [0, 0.011, 0.068]],
  tablet: [[-0.07, 0.01, -0.105], [0.07, 0.01, -0.105], [0, 0.01, 0.108]],
  laptop: [[-0.14, 0.022, 0.1], [0.14, 0.022, 0.1], [0, 0.022, 0.12]],
  console: [[-0.13, 0.078, 0.1], [0.13, 0.078, 0.1], [0, 0.078, -0.105]],
  chest: [[-0.12, 0.21, 0.182], [0, 0.21, 0.182], [0.12, 0.21, 0.182]],
  pickaxe: [[-0.06, 0.04, 0.012], [0.0, 0.04, 0.012], [0.06, 0.04, 0.012]],
  shears: [[0.02, 0.016, 0], [-0.06, 0.02, 0.012], [-0.12, 0.022, 0.02]],
};
/** Where the removable part sits on the device (device-local). */
export const PART_SPOT: Record<DeviceKind, V3> = {
  phone: [0, 0.012, 0], tablet: [0, 0.011, 0], laptop: [0, 0.025, 0.05], console: [0, 0.08, 0],
  chest: [0, 0.3, 0], pickaxe: [0, 0.05, 0], shears: [-0.13, 0.03, 0],
};

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ------------------------------------------------------------- interaction targets
export interface Target { id: string; pos: V3; radius: number; label: string }

/** Everything the player can press E on right now. */
export function targets(s: GameState): Target[] {
  const t: Target[] = [];
  const j = s.job;
  const head: V3 = [COUNTER_SLOT[0], 1.25, COUNTER_SLOT[2]];
  t.push({ id: "shelf", pos: [PARTS_SHELF.x - 0.2, 1.2, PARTS_SHELF.z], radius: 1.0, label: "Browse the parts shelf" });
  t.push({ id: "bell", pos: add(SPOTS.bell, [0, 0.05, 0]), radius: 0.09, label: "Ring the bell" });
  if (!s.tools.screwdriver || s.equipped !== "screwdriver") {
    if (!s.tools.screwdriver) t.push({ id: "grab-screwdriver", pos: add(SPOTS.screwdriver, [0, 0.02, 0]), radius: 0.12, label: "Pick up the screwdriver" });
  }
  if (!s.tools.wrench) t.push({ id: "grab-wrench", pos: add(SPOTS.wrench, [0, 0.02, 0]), radius: 0.12, label: "Pick up the wrench" });
  if (!j) return t;
  const name = j.customer.name;
  if (!j.accepted) {
    t.push({ id: "talk", pos: head, radius: 0.55, label: `Talk to ${name}` });
    return t;
  }
  if (j.where === "counter") {
    t.push({ id: "pickup", pos: add(SPOTS.counterDevice, [0, 0.06, 0]), radius: 0.3, label: "Pick up the device" });
    t.push({ id: "talk", pos: head, radius: 0.45, label: `Talk to ${name}` });
  }
  if (j.where === "hands") {
    t.push({
      id: j.repaired ? "return" : "talk",
      pos: head, radius: 0.6,
      label: j.repaired ? `Hand it back to ${name}` : `Talk to ${name}`,
    });
    t.push({ id: "put-counter", pos: add(SPOTS.counterDevice, [0, 0.05, 0]), radius: 0.35, label: "Put it down on the counter" });
    t.push({ id: "place-desk", pos: add(SPOTS.deskDevice, [0, 0.1, 0]), radius: 0.5, label: "Put it on the repair desk" });
  }
  if (j.where === "desk") {
    const base = SPOTS.deskDevice;
    const dev = j.customer.device;
    if (j.repaired) {
      t.push({ id: "pickup", pos: add(base, [0, 0.08, 0]), radius: 0.3, label: "Pick up the repaired device" });
      return t;
    }
    const need = toolFor(dev);
    if (j.method !== "lockpick") {
      SCREWS[dev].slice(0, SCREWS_PER_DEVICE).forEach((p, i) => {
        if (!j.screwsOut[i]) t.push({
          id: `screw-${i}`, pos: add(base, p), radius: 0.035,
          label: j.customer.fault === "lock" ? `Unscrew catch (${need})` : `Remove screw (${need})`,
        });
      });
    }
    if (j.customer.fault === "lock") {
      if (!j.screwsOut.some(Boolean)) t.push({ id: "lockpick", pos: add(base, [0, 0.16, 0.19]), radius: 0.07, label: "Pick the lock (uses a lockpick)" });
    } else if (j.screwsOut.every(Boolean)) {
      const ps = add(base, PART_SPOT[dev]);
      if (!j.partOut) t.push({ id: "pull", pos: ps, radius: 0.1, label: "Pull out the damaged part (hands)" });
      else if (!j.replacement) t.push({ id: "choose", pos: ps, radius: 0.14, label: "Choose a replacement part" });
      else t.push({ id: "fit", pos: ps, radius: 0.14, label: "Fit the new part (hands)" });
    }
    if (!j.screwsOut.some(Boolean)) t.push({ id: "pickup", pos: add(base, [0, 0.12, 0]), radius: 0.22, label: "Pick up the device" });
  }
  return t;
}
