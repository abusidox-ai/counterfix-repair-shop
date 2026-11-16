// Counterfix content + tuning. Plain data, no React / three.js.

// ------------------------------------------------------------- economy & day
export const START_CASH = 50;
export const START_REP = 50;
export const DAY_START = 10 * 60; // 10:00, in shop minutes since midnight
export const DAY_END = 21 * 60; // 21:00 — the stand closes
/** Shop minutes that pass per real second (slightly slower than a minute a second). */
export const CLOCK_RATE = 0.7;
/** Finish with more than this many minutes to spare for the early bonus. */
export const BONUS_WINDOW = 120;
export const EARLY_BONUS = { cash: 30, rep: 8 };
/** Each customer still waiting (or mid-repair) at closing time. */
export const UNSERVED_REP = -5;
export const customersForDay = (day: number) => 10 + Math.floor((day - 1) / 2);

/** Gap between one customer leaving and the next reaching the counter (shop minutes). */
export const ARRIVAL_GAP = 5;
export const FIRST_ARRIVAL = 3;

export const DELIVERY_FEE = 8;
export const DELIVERY_MINUTES = 25;
export const BULK_QTY = 5;
export const START_STOCK_EACH = 2;
export const DRAWER_CAP = 20;

export const TURN_AWAY_REP = -3;
export const UNFIXED_RETURN_REP = -4;
export const OLD_PART_REP = -12; // fitted their own broken part back: they walk off, no pay
export const BETTER_TIP = 10;
export const STOLEN_REPAIR_REP = -10; // repaired a stolen item: paid, but word gets around
export const RETURN_OWNER = { cash: 25, rep: 6 };
export const POLICE = {
  caughtRep: 6, thanksRep: 10, escapedRep: 2, falseRep: -15,
  bountyChance: 0.55, bountyMin: 15, bountySpread: 25,
};
export const escapeChance = (day: number) => Math.min(0.45, 0.2 + 0.03 * (day - 1));
export const stolenChance = (day: number) => Math.min(0.45, 0.22 + 0.04 * (day - 1));

// ------------------------------------------------------------- repairs
export const BOLT_CLICKS = 10; // wrench clicks to back the bolt out
export const BOLT_TIGHTEN = 5; // clicks to snug it back down

export type Tool = "screwdriver" | "wrench";
export type PartKind = "screen" | "battery" | "handle" | "crystal" | "spring";
export type Tier = "normal" | "better";
export type Sku = PartKind | `${PartKind}-better`;

export interface PartDef { sku: Sku; kind: PartKind; tier: Tier; name: string; unit: number; bulk: number; rep: number }
const part = (kind: PartKind, tier: Tier, name: string, unit: number, bulk: number, rep: number): PartDef =>
  ({ sku: (tier === "better" ? `${kind}-better` : kind) as Sku, kind, tier, name, unit, bulk, rep });

export const PARTS: Record<Sku, PartDef> = {
  screen: part("screen", "normal", "Salvaged screen", 14, 55, 4),
  "screen-better": part("screen", "better", "Sealed screen", 26, 105, 9),
  battery: part("battery", "normal", "Ration battery", 10, 40, 3),
  "battery-better": part("battery", "better", "Long-life cell", 20, 80, 8),
  handle: part("handle", "normal", "Ash handle", 9, 35, 4),
  "handle-better": part("handle", "better", "Ironwood handle", 20, 80, 9),
  crystal: part("crystal", "normal", "Murky crystal", 18, 72, 4),
  "crystal-better": part("crystal", "better", "Clear moonstone", 34, 140, 10),
  spring: part("spring", "normal", "Tin spring", 8, 30, 3),
  "spring-better": part("spring", "better", "Blued steel spring", 16, 64, 8),
};
export const PART_KINDS: PartKind[] = ["screen", "battery", "handle", "crystal", "spring"];
export const SKUS: Sku[] = PART_KINDS.flatMap((k) => [k, `${k}-better`] as Sku[]);
export const PART_LABEL: Record<PartKind, string> = {
  screen: "screen", battery: "battery", handle: "handle", crystal: "crystal", spring: "spring",
};
export const BROKEN_LABEL: Record<PartKind, string> = {
  screen: "cracked screen", battery: "swollen battery", handle: "split handle", crystal: "clouded crystal", spring: "snapped spring",
};

export type DeviceKind = "phone" | "revolver" | "pocket-watch" | "elf-lantern" | "pickaxe" | "warhammer";
export interface DeviceSpec {
  kind: DeviceKind;
  label: string;
  fastener: "screw" | "bolt";
  count: number; // screws (bolt devices have one bolt)
  tool: Tool;
  flip: boolean; // fasteners are on the back: flip it over first
  cover: boolean; // a cover / plate / hood comes off before the part
  coverLabel: string;
  faults: PartKind[];
  fee: [number, number];
}
export const DEVICES: Record<DeviceKind, DeviceSpec> = {
  phone: { kind: "phone", label: "phone", fastener: "screw", count: 4, tool: "screwdriver", flip: true, cover: true, coverLabel: "back cover", faults: ["screen", "battery"], fee: [42, 60] },
  revolver: { kind: "revolver", label: "revolver", fastener: "screw", count: 2, tool: "screwdriver", flip: false, cover: true, coverLabel: "side plate", faults: ["spring"], fee: [38, 55] },
  "pocket-watch": { kind: "pocket-watch", label: "pocket watch", fastener: "screw", count: 2, tool: "screwdriver", flip: true, cover: true, coverLabel: "case back", faults: ["spring"], fee: [36, 52] },
  "elf-lantern": { kind: "elf-lantern", label: "elven lantern", fastener: "screw", count: 3, tool: "screwdriver", flip: false, cover: true, coverLabel: "glass hood", faults: ["crystal"], fee: [55, 75] },
  pickaxe: { kind: "pickaxe", label: "pickaxe", fastener: "bolt", count: 1, tool: "wrench", flip: false, cover: false, coverLabel: "", faults: ["handle"], fee: [34, 48] },
  warhammer: { kind: "warhammer", label: "war hammer", fastener: "bolt", count: 1, tool: "wrench", flip: false, cover: false, coverLabel: "", faults: ["handle"], fee: [40, 58] },
};

// ------------------------------------------------------------- people
export type Race = "human" | "dwarf" | "elf" | "entity";
export const RACE_LABEL: Record<Race, string> = { human: "Human", dwarf: "Dwarf", elf: "Elf", entity: "Unknown" };
export const RACE_DEVICES: Record<Race, DeviceKind[]> = {
  human: ["phone", "phone", "revolver"],
  dwarf: ["pickaxe", "warhammer"],
  elf: ["elf-lantern", "pocket-watch"],
  entity: ["pocket-watch", "phone", "elf-lantern"],
};
export const HUMAN_MODELS = ["customer-male-a", "customer-male-b", "customer-male-c", "customer-male-d", "customer-male-e", "customer-male-f",
  "customer-female-a", "customer-female-b", "customer-female-c", "customer-female-d", "customer-female-e", "customer-female-f"] as const;
export const ENTITY_MODELS = ["entity-hollow", "entity-moth", "entity-smiler"] as const;
export const NAMES: Record<Exclude<Race, "entity">, string[]> = {
  human: ["Vera Kosk", "Ilya Marr", "Petra Lund", "Oskar Venn", "Mira Tal", "Anton Grey", "Lida Rusk", "Emil Shaw", "Ada Morrow", "Konrad Pike", "Nell Hart", "Yuri Brand", "Sasha Doyle", "Tomas Weir"],
  dwarf: ["Borin Ashhand", "Dagna Flint", "Thrain Coalbeard", "Hilda Deepdelve", "Grum Ironvein", "Ketta Stonebrow", "Orrik Slag"],
  elf: ["Ithiel", "Saelra", "Venyan", "Aurelith", "Thalion", "Miravel", "Elowen"],
};
export const ENTITY_NAMES: Record<(typeof ENTITY_MODELS)[number], string> = {
  "entity-hollow": "The Hollow Gentleman",
  "entity-moth": "Widow of Moths",
  "entity-smiler": "The Smiling Clerk",
};

export function verdict(rep: number): { title: string; line: string } {
  if (rep >= 90) return { title: "Trusted in the fog", line: "Even the patrols nod at your lantern." };
  if (rep >= 65) return { title: "A name worth knowing", line: "People cross the street for your stand." };
  if (rep >= 40) return { title: "Still standing", line: "Another night survived. The street remembers." };
  if (rep >= 20) return { title: "Whispers", line: "They talk about you in the queues. Not kindly." };
  return { title: "Marked", line: "Nobody stops at your lantern any more." };
}
