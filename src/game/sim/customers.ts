// Builds each day's customers from a seed. Pure.
import { stream } from "./rng";
import {
  DEVICES, ENTITY_MODELS, ENTITY_NAMES, HUMAN_MODELS, NAMES, RACE_DEVICES, customersForDay, stolenChance,
  type DeviceKind, type PartKind, type Race,
} from "./data";

export type CheckId = "examine" | "id" | "story" | "registry";
export const CHECKS: CheckId[] = ["examine", "id", "story", "registry"];
export const CHECK_LABEL: Record<CheckId, string> = {
  examine: "Examine the item",
  id: "Check their papers",
  story: "Ask where it came from",
  registry: "Registry lookup (PC)",
};

export interface CustomerDef {
  id: string;
  name: string;
  race: Race;
  model: string;
  device: DeviceKind;
  fault: PartKind;
  fee: number;
  stolen: boolean;
  serial: string;
  /** Which checks expose a stolen item. Empty for honest customers. */
  failing: CheckId[];
  intro: string;
  waiting: string;
  handoff: string;
  /** What each check turns up. */
  findings: Record<CheckId, string>;
  /** Registered owner shown by the PC. */
  owner: string;
}

const INTRO: Record<DeviceKind, Partial<Record<PartKind, string[]>>> = {
  phone: {
    screen: ["Dropped it on the ration-line steps. The screen's a spiderweb now.", "A patrol knocked it out of my hand. Can you swap the glass?", "Screen cracked in the cold. I need it for the curfew bulletins."],
    battery: ["It dies before the evening broadcast. The battery's bulging, I can feel it.", "Won't hold a charge past noon. Battery's swollen like a tick."],
  },
  revolver: { spring: ["Hammer won't catch any more. Spring's gone, I think. Don't ask why I need it working.", "It clicks but nothing happens. The mainspring snapped on me."] },
  "pocket-watch": { spring: ["It stopped at 3:17 and will not start again. The spring, perhaps.", "My grandmother's watch. It stopped the night the lights went out."] },
  "elf-lantern": { crystal: ["The light inside has clouded. Without it the fog finds me.", "My lantern's heart has gone grey. I would see it bright again."] },
  pickaxe: { handle: ["Handle split clean down the grain on the deep shift. Head's fine.", "Haft snapped in the shaft. Need it whole before the bell."] },
  warhammer: { handle: ["Haft cracked on a tunnel brace. Need it whole by the next shift.", "Split the handle on a stubborn seam. The head's worth more than you."] },
};
const ENTITY_INTRO = [
  "It stopped when she did. Make it go again.",
  "You will mend this. You have always mended this.",
  "I have waited a long time in the fog. I can wait while you work.",
];
const WAITING = ["I'll wait. I'm good at waiting.", "Take your time. Not too much of it.", "The fog's thick tonight. I'll stay close.", "Is it done? No? I'll wait."];
const ENTITY_WAITING = ["...", "I am still here.", "Your lantern is very bright. I like it."];
const HANDOFF_OK = ["That's it? Thank you. Truly.", "Good as new. You're a rare one on this street.", "Perfect. I'll tell the others about your stand."];
const HANDOFF_STOLEN = [
  "Just put it in my hand. Quickly. The patrol comes by at nine.",
  "Don't write anything down, yeah? Just hand it over.",
  "*keeps glancing into the fog* Is that everything? Can I go?",
  "You didn't call anyone, did you? ...Good. Give it here.",
];
const ENTITY_HANDOFF = ["...yes. This will do. We will meet again.", "It ticks. It breathes. Thank you, mender.", "You did not look under the bench. Good."];
const STORY_OK = ["Had it since before the ration cards.", "It was my father's. He'd have my hide if I lost it.", "Bought it new, back when things were new.", "Traded a winter coat for it. Fair and square, at the guild hall."];
const STORY_BAD = ["Found it. In a... drawer. A friend's drawer.", "Bought it off a man by the canal. Fair price. Didn't catch his name.", "It's my cousin's. Or his wife's. Does it matter?", "Won it. In a game. Of cards. Yes."];
const ENTITY_STORY = ["It has always been mine. Before it was made, it was mine.", "It came to me in the fog. Things do."];

export function serialFor(device: DeviceKind, n: number) {
  const pre = { phone: "PH", revolver: "RV", "pocket-watch": "PW", "elf-lantern": "EL", pickaxe: "DP", warhammer: "DW" }[device];
  return `${pre}-${n}`;
}

/** The customers queued for a day. Later days: more customers, more stolen goods, fewer clues. */
export function generateDay(day: number, seed: number): CustomerDef[] {
  const g = stream((seed ^ Math.imul(day, 7919)) >>> 0);
  const count = customersForDay(day);
  const usedModels = new Set<string>();
  const usedNames = new Set<string>();
  const entityAt = day === 1 || g.chance(0.6) ? g.int(3, count - 2) : -1;
  const out: CustomerDef[] = [];
  for (let i = 0; i < count; i++) {
    const roll = g.r();
    const race: Race = i === entityAt ? "entity" : roll < 0.45 ? "human" : roll < 0.75 ? "dwarf" : "elf";
    const device = g.pick(RACE_DEVICES[race]);
    const spec = DEVICES[device];
    const fault = g.pick(spec.faults);
    let name: string, model: string;
    if (race === "entity") {
      model = g.pick(ENTITY_MODELS);
      name = ENTITY_NAMES[model as keyof typeof ENTITY_NAMES];
    } else {
      const pool = NAMES[race].filter((n) => !usedNames.has(n));
      name = g.pick(pool.length ? pool : NAMES[race]);
      const models = HUMAN_MODELS.filter((m) => !usedModels.has(m) && (race !== "dwarf" || m.includes("male-") && !m.includes("female")));
      model = g.pick(models.length ? models : HUMAN_MODELS);
    }
    usedNames.add(name);
    usedModels.add(model);
    const stolen = race !== "entity" && g.chance(stolenChance(day));
    const clueCount = day <= 2 ? 3 : day <= 4 ? 2 : g.int(1, 2);
    const failing: CheckId[] = [];
    if (stolen) {
      const pool: CheckId[] = ["examine", "id", "story", "registry"];
      while (failing.length < clueCount) {
        const c = g.pick(pool.filter((p) => !failing.includes(p)));
        failing.push(c);
      }
    }
    const serial = serialFor(device, g.int(1000, 9999)) + String.fromCharCode(65 + g.int(0, 25));
    const otherName = g.pick(NAMES[race === "dwarf" ? "dwarf" : race === "elf" ? "elf" : "human"].filter((n) => n !== name));
    const owner = stolen && failing.includes("registry") ? otherName : name;
    const fee = Math.round(g.int(spec.fee[0], spec.fee[1]) * (1 + 0.04 * (day - 1)));
    const label = spec.label;
    const fail = (c: CheckId) => failing.includes(c);
    const findings: Record<CheckId, string> = {
      examine: fail("examine")
        ? `Fresh gouges around the serial ${serial} — someone tried to grind it off. The owner's mark has been scratched out.`
        : race === "entity"
          ? `Serial ${serial}. The metal is cold, far colder than the night. It smells faintly of wet earth.`
          : `Wear matches years of honest use. Serial ${serial} is stamped clean.`,
      id: fail("id")
        ? `Their papers say "${name}", but the photo has been peeled and re-glued, and the ${label} is engraved "${otherName.split(" ")[0]}".`
        : race === "entity"
          ? `They hand over a card. The name is "${name}". The photo is of an empty room.`
          : `Papers say ${name}. Stamped, in date, and the face matches.`,
      story: race === "entity" ? g.pick(ENTITY_STORY) : fail("story") ? g.pick(STORY_BAD) : g.pick(STORY_OK),
      registry: fail("registry")
        ? `${serial} — REPORTED STOLEN. Registered owner: ${otherName}.`
        : `${serial} — registered to ${name}. No reports on file.`,
    };
    out.push({
      id: `d${day}c${i}`, name, race, model, device, fault, fee, stolen, serial, failing, owner,
      intro: race === "entity" ? g.pick(ENTITY_INTRO) : g.pick(INTRO[device][fault] ?? ["It's broken. Can you fix it?"]),
      waiting: race === "entity" ? g.pick(ENTITY_WAITING) : g.pick(WAITING),
      handoff: race === "entity" ? g.pick(ENTITY_HANDOFF) : stolen ? g.pick(HANDOFF_STOLEN) : g.pick(HANDOFF_OK),
      findings,
    });
  }
  return out;
}
