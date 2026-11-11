import { describe, expect, it } from "vitest";
import { CUSTOMERS, PARTS, START_CASH } from "./data";
import * as R from "./rules";
import { collide, keysToAxes, moveVector } from "./movement";
import { customerPlace } from "./layout";

const run = (s: R.GameState, ...steps: ((s: R.GameState) => R.Result)[]) => steps.reduce((acc, f) => f(acc).state, s);
const fixPhone = (s: R.GameState) =>
  run(s, R.accept, R.pickUp, R.placeOnDesk, (x) => R.grabTool(x, "screwdriver"),
    (x) => R.removeScrew(x, 0), (x) => R.removeScrew(x, 1), (x) => R.removeScrew(x, 2),
    (x) => R.equip(x, "hands"), R.pullPart, (x) => R.chooseReplacement(x, "screen"), R.fitPart, R.pickUp);

describe("starting state", () => {
  it("opens with $120, 0 rep, customer 1 of 10 (Maya)", () => {
    const s = R.createGame();
    expect(s.cash).toBe(120);
    expect(s.rep).toBe(0);
    expect(s.index).toBe(0);
    expect(s.job?.customer.name).toBe("Maya");
    expect(CUSTOMERS).toHaveLength(10);
  });
});

describe("manual repair", () => {
  it("needs the right tool for each screw", () => {
    const s = run(R.createGame(), R.accept, R.pickUp, R.placeOnDesk);
    const r = R.removeScrew(s, 0); // hands equipped
    expect(r.state.job?.screwsOut[0]).toBe(false);
    expect(r.msgs[0].kind).toBe("bad");
  });
  it("charges the part price when fitted, not when taken from the shelf", () => {
    const s0 = R.createGame();
    const s1 = R.takeStock(s0, "screen").state;
    expect(s1.cash).toBe(START_CASH);
    const fixed = fixPhone(s1);
    expect(fixed.cash).toBe(START_CASH - PARTS.screen.price);
    expect(fixed.job?.repaired).toBe(true);
  });
  it("pays the fee and standard-part rep on return, then calls the next customer", () => {
    const fixed = fixPhone(R.createGame());
    const r = R.returnDevice(fixed);
    expect(r.state.cash).toBe(START_CASH - 18 + 55);
    expect(r.state.rep).toBe(6);
    expect(r.state.index).toBe(1);
    expect(r.state.job?.customer.name).toBe("Theo");
  });
  it("refuses to fit a part with no stock", () => {
    let s = run(R.createGame(), R.accept, R.pickUp, R.placeOnDesk, (x) => R.grabTool(x, "screwdriver"),
      (x) => R.removeScrew(x, 0), (x) => R.removeScrew(x, 1), (x) => R.removeScrew(x, 2), (x) => R.equip(x, "hands"), R.pullPart);
    const r = R.chooseReplacement(s, "screen-premium");
    expect(r.state.job?.replacement).toBe(null);
    s = R.takeStock(s, "screen-premium").state;
    expect(R.chooseReplacement(s, "screen-premium").state.job?.replacement).toBe("screen-premium");
  });
});

describe("stolen goods", () => {
  const toNora = () => {
    let s = R.createGame();
    s = R.returnDevice(fixPhone(s)).state; // Maya
    s = R.decline(s).state; // Theo
    return s;
  };
  it("reporting Nora's tablet pays $85 and +18 rep", () => {
    const s = toNora();
    expect(s.job?.customer.name).toBe("Nora");
    const r = R.resolveStolen(R.inspect(s).state, "police");
    expect(r.state.cash - s.cash).toBe(85);
    expect(r.state.rep - s.rep).toBe(18);
  });
  it("returning to owner pays $25 and +5 rep", () => {
    const s = toNora();
    const r = R.resolveStolen(R.inspect(s).state, "return");
    expect(r.state.cash - s.cash).toBe(25);
    expect(r.state.rep - s.rep).toBe(5);
  });
  it("can't resolve without inspecting first", () => {
    const s = toNora();
    expect(R.resolveStolen(s, "police").state.index).toBe(s.index);
  });
});

describe("day structure", () => {
  it("ends after 10 customers", () => {
    let s = R.createGame();
    for (let i = 0; i < 10; i++) s = R.decline(s).state;
    expect(s.dayOver).toBe(true);
    expect(s.job).toBe(null);
  });
  it("queues waiting customers behind the one at the counter", () => {
    const s = { index: 2, dayOver: false };
    expect(customerPlace(1, s).kind).toBe("gone");
    expect(customerPlace(2, s).kind).toBe("counter");
    expect(customerPlace(3, s)).toEqual({ kind: "queue", slot: 0 });
  });
});

describe("movement (inverted-controls fix)", () => {
  const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);
  it("W moves where the camera looks", () => {
    const m = moveVector(0, 1, 0); // looking down -Z
    close(m.x, 0); close(m.z, -1);
    const turned = moveVector(Math.PI / 2, 1, 0); // turned left, looking down -X
    close(turned.x, -1); close(turned.z, 0);
  });
  it("D strafes to screen-right and S backs up", () => {
    const d = moveVector(0, 0, 1);
    close(d.x, 1); close(d.z, 0);
    const s = moveVector(0, -1, 0);
    close(s.z, 1);
  });
  it("maps WASD and arrows to axes", () => {
    expect(keysToAxes(new Set(["KeyW", "KeyD"]))).toEqual({ fwd: 1, strafe: 1 });
    expect(keysToAxes(new Set(["ArrowDown", "ArrowLeft"]))).toEqual({ fwd: -1, strafe: -1 });
  });
  it("can't walk through the counter", () => {
    const box = { minX: -1, maxX: 1, minZ: -0.5, maxZ: 0.5 };
    const room = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
    const p = collide({ x: 0, z: 0.6 }, 0.35, [box], room);
    expect(p.z).toBeCloseTo(0.85, 6);
  });
});
