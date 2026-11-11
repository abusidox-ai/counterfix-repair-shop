// Counterfix — Day 01 content. Plain data, no React / three.js.

export type ToolId = "screwdriver" | "wrench" | "hands";
export type DeviceKind = "phone" | "laptop" | "tablet" | "console" | "chest" | "pickaxe" | "shears";
export type PartKind = "screen" | "battery" | "camera" | "handle" | "lock";
export type Sku =
  | "screen" | "screen-premium"
  | "battery" | "battery-premium"
  | "camera" | "camera-premium"
  | "handle" | "handle-reinforced"
  | "lockpick";
export type Tier = "standard" | "premium";

export const START_CASH = 120;
export const START_REP = 0;
export const CUSTOMERS_PER_DAY = 10;
export const SCREWS_PER_DEVICE = 3;
export const MAX_STOCK = 5;

export interface PartDef {
  sku: Sku;
  kind: PartKind;
  tier: Tier;
  name: string;
  price: number;
  rep: number;
}

export const PARTS: Record<Sku, PartDef> = {
  screen: { sku: "screen", kind: "screen", tier: "standard", name: "Screen", price: 18, rep: 6 },
  "screen-premium": { sku: "screen-premium", kind: "screen", tier: "premium", name: "Premium screen", price: 32, rep: 12 },
  battery: { sku: "battery", kind: "battery", tier: "standard", name: "Battery", price: 15, rep: 5 },
  "battery-premium": { sku: "battery-premium", kind: "battery", tier: "premium", name: "Long-life battery", price: 27, rep: 11 },
  camera: { sku: "camera", kind: "camera", tier: "standard", name: "Camera module", price: 20, rep: 6 },
  "camera-premium": { sku: "camera-premium", kind: "camera", tier: "premium", name: "Pro camera module", price: 36, rep: 13 },
  handle: { sku: "handle", kind: "handle", tier: "standard", name: "Standard handle", price: 12, rep: 6 },
  "handle-reinforced": { sku: "handle-reinforced", kind: "handle", tier: "premium", name: "Reinforced handle", price: 28, rep: 14 },
  lockpick: { sku: "lockpick", kind: "lock", tier: "standard", name: "Lockpick", price: 10, rep: 10 },
};

export const PART_ORDER: Sku[] = [
  "screen", "screen-premium", "battery", "battery-premium", "camera", "camera-premium",
  "handle", "handle-reinforced", "lockpick",
];

export const START_STOCK: Record<Sku, number> = {
  screen: 1, "screen-premium": 0, battery: 1, "battery-premium": 0,
  camera: 0, "camera-premium": 0, handle: 0, "handle-reinforced": 0, lockpick: 0,
};

export const PART_LABEL: Record<PartKind, string> = {
  screen: "cracked screen",
  battery: "dead battery",
  camera: "broken camera mount",
  handle: "broken handle",
  lock: "jammed lock",
};

export const DEVICE_LABEL: Record<DeviceKind, string> = {
  phone: "phone", laptop: "laptop", tablet: "tablet", console: "game console",
  chest: "strongbox", pickaxe: "pickaxe", shears: "garden shears",
};

/** Tool needed to take the device apart. Chests can also be picked with a lockpick. */
export function toolFor(device: DeviceKind): ToolId {
  return device === "pickaxe" || device === "shears" ? "wrench" : "screwdriver";
}

export interface CustomerDef {
  id: string;
  name: string;
  model: string; // file in public/models without .glb
  accent: string; // UI colour for the portrait
  device: DeviceKind;
  fault: PartKind;
  fee: number;
  stolen: boolean;
  intro: string; // what they say at the counter
  inspectNote: string; // what inspection reveals
}

export const CUSTOMERS: CustomerDef[] = [
  {
    id: "maya", name: "Maya", model: "customer-female-a", accent: "#e2683c", device: "phone", fault: "screen", fee: 55, stolen: false,
    intro: "Hi! I dropped my phone on the bus steps. The screen looks like a spider web now. Can you fix it?",
    inspectNote: "Serial number matches the receipt in the case. Nothing odd here.",
  },
  {
    id: "theo", name: "Theo", model: "customer-male-a", accent: "#3c6a61", device: "laptop", fault: "battery", fee: 60, stolen: false,
    intro: "My laptop dies the second I unplug it. Exams are next week. Please tell me it's just the battery.",
    inspectNote: "Student sticker, matching serial, clean history.",
  },
  {
    id: "nora", name: "Nora", model: "customer-female-b", accent: "#8a5a9e", device: "tablet", fault: "screen", fee: 50, stolen: true,
    intro: "My… nephew gave me this tablet. Honest. The screen's cracked. Cash is fine, right?",
    inspectNote: "The serial plate has been filed off. The IMEI shows up in the local stolen-goods registry.",
  },
  {
    id: "sal", name: "Big Sal", model: "customer-male-b", accent: "#b5762f", device: "pickaxe", fault: "handle", fee: 45, stolen: false,
    intro: "Snapped the handle on my pickaxe. Quarry boss wants it back by lunch.",
    inspectNote: "Well-used, initials 'S.B.' burned into the head. It's his.",
  },
  {
    id: "priya", name: "Priya", model: "customer-female-c", accent: "#2f5d8a", device: "phone", fault: "camera", fee: 58, stolen: false,
    intro: "The camera on my phone just… fell out? There's a hole where it used to be.",
    inspectNote: "Serial checks out. Camera bracket screws are loose — easy job.",
  },
  {
    id: "gus", name: "Old Gus", model: "customer-male-c", accent: "#6e4428", device: "chest", fault: "lock", fee: 70, stolen: false,
    intro: "This was my grandad's strongbox. The key went missing years ago. I'd love to see what's inside.",
    inspectNote: "Old iron box, family name stamped on the lid. Belongs to him.",
  },
  {
    id: "ivy", name: "Ivy", model: "customer-female-d", accent: "#c8442b", device: "console", fault: "battery", fee: 65, stolen: true,
    intro: "Found this console at a, uh, garage sale. It won't hold a charge. Can you make it work?",
    inspectNote: "Serial scratched off and the account is locked. It matches a burglary report from last week.",
  },
  {
    id: "rosa", name: "Rosa", model: "customer-female-e", accent: "#4f7d3a", device: "shears", fault: "handle", fee: 40, stolen: false,
    intro: "My garden shears lost a handle mid-hedge. The roses are judging me.",
    inspectNote: "Name tag on the grip says 'ROSA'. All good.",
  },
  {
    id: "kenji", name: "Kenji", model: "customer-male-d", accent: "#2c2f33", device: "tablet", fault: "screen", fee: 62, stolen: false,
    intro: "My kid used the tablet as a frisbee. Screen's toast. Can you save it?",
    inspectNote: "Registered to Kenji, serial intact. Nothing to worry about.",
  },
  {
    id: "dot", name: "Dot", model: "customer-male-e", accent: "#d4502b", device: "phone", fault: "screen", fee: 60, stolen: false,
    intro: "Last one of the day? Lucky me. Cracked screen, and I'm in a hurry!",
    inspectNote: "Serial matches. Just a very busy person.",
  },
];

export const STOLEN_REWARD = {
  police: { cash: 85, rep: 18 },
  return: { cash: 25, rep: 5 },
} as const;
/** Repairing stolen goods anyway: the customer haggles and word gets around. */
export const STOLEN_REPAIR_PAY = 0.6;
export const STOLEN_REPAIR_REP = -4;
/** Picking a chest lock pays more than unscrewing its catches. */
export const LOCKPICK_FEE_BONUS = 1.3;
export const UNSCREW_REP = 6;

export function verdict(rep: number): { title: string; line: string } {
  if (rep >= 75) return { title: "Local legend", line: "The whole street is talking about your counter." };
  if (rep >= 40) return { title: "Trusted fixer", line: "People will come back. Some will bring friends." };
  if (rep >= 15) return { title: "Getting by", line: "A decent first day. Tomorrow can be better." };
  return { title: "Rough start", line: "Word travels fast. Let's make tomorrow count." };
}
