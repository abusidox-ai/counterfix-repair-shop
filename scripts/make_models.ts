/**
 * Counterfix custom model generator.
 * Builds the shop-specific models (repair desk, devices, tools, parts…) that no CC0
 * kit provides, and writes them as GLB files into public/models/.
 *   bun scripts/make_models.ts
 * Convention: metres, Y up, origin at bottom-centre, front faces +Z.
 * Flat items (devices, tools, parts) lie flat with their top surface facing +Y.
 */
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mkdirSync, writeFileSync } from "node:fs";

// Bun has Blob but no FileReader; GLTFExporter needs it for binary output.
class FR {
  result: unknown = null;
  onload: ((e: unknown) => void) | null = null;
  onloadend: ((e: unknown) => void) | null = null;
  readAsArrayBuffer(b: Blob) {
    b.arrayBuffer().then((r) => this.done(r));
  }
  readAsDataURL(b: Blob) {
    b.arrayBuffer().then((r) =>
      this.done(`data:${b.type || "application/octet-stream"};base64,${Buffer.from(r).toString("base64")}`),
    );
  }
  private done(r: unknown) {
    this.result = r;
    this.onload?.({ target: this });
    this.onloadend?.({ target: this });
  }
}
(globalThis as unknown as { FileReader: unknown }).FileReader = FR;

const OUT = "public/models";
mkdirSync(OUT, { recursive: true });

const M = (name: string, color: string, roughness = 0.7, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ name, color, roughness, metalness, ...extra });

const mats = {
  wood: M("wood", "#b97d47", 0.6),
  woodDark: M("woodDark", "#6e4428", 0.65),
  woodLight: M("woodLight", "#d6a670", 0.6),
  steel: M("steel", "#b9c0c4", 0.28, 0.9),
  steelDark: M("steelDark", "#3a3f43", 0.45, 0.7),
  chrome: M("chrome", "#dfe4e8", 0.15, 1),
  brass: M("brass", "#c99a3e", 0.3, 0.9),
  black: M("blackPlastic", "#1c1d20", 0.45),
  charcoal: M("charcoal", "#2c2f33", 0.55),
  glass: M("screenGlass", "#0d1724", 0.08, 0.2),
  teal: M("tealPaint", "#3c6a61", 0.55, 0.15),
  green: M("bottleGreen", "#2f4a43", 0.6),
  cream: M("cream", "#efe4cf", 0.8),
  red: M("redPlastic", "#c8442b", 0.4),
  orange: M("orangePlastic", "#e2683c", 0.38),
  rubber: M("rubber", "#222222", 0.9),
  pegboard: M("pegboard", "#c9a676", 0.85),
  cutMat: M("cuttingMat", "#2f6553", 0.8),
  blue: M("batteryBlue", "#2f5d8a", 0.45),
  pcb: M("pcbGreen", "#1f5e3a", 0.6),
  ledRed: M("ledRed", "#ff3b2f", 0.4, 0, { emissive: "#ff2a1a", emissiveIntensity: 2 }),
  bulb: M("bulb", "#fff1c9", 0.3, 0, { emissive: "#ffd28a", emissiveIntensity: 3 }),
  lcd: M("lcdGreen", "#9fd9a1", 0.3, 0, { emissive: "#5fae6a", emissiveIntensity: 0.8 }),
  paper: M("paper", "#f7f3ea", 0.9),
};

type V3 = [number, number, number];
function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], name?: string) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  if (name) m.name = name;
  parent.add(m);
  return m;
}
const box = (p: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material, pos: V3, name?: string) =>
  add(p, new THREE.BoxGeometry(w, h, d), mat, pos, [0, 0, 0], name);
const rbox = (p: THREE.Object3D, w: number, h: number, d: number, r: number, mat: THREE.Material, pos: V3, name?: string) =>
  add(p, new RoundedBoxGeometry(w, h, d, 3, r), mat, pos, [0, 0, 0], name);
const cyl = (p: THREE.Object3D, rt: number, rb: number, h: number, mat: THREE.Material, pos: V3, rot: V3 = [0, 0, 0], seg = 24, name?: string) =>
  add(p, new THREE.CylinderGeometry(rt, rb, h, seg), mat, pos, rot, name);

/** Extrude a 2D shape (drawn in X/Y) and lay it flat so the thickness points up +Y. */
function flatExtrude(p: THREE.Object3D, shape: THREE.Shape, depth: number, mat: THREE.Material, pos: V3 = [0, 0, 0], name?: string) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 20 });
  g.rotateX(-Math.PI / 2);
  return add(p, g, mat, pos, [0, 0, 0], name);
}

const models: Record<string, () => THREE.Object3D> = {};

// ---------------------------------------------------------------- tools
models["screwdriver"] = () => {
  const g = new THREE.Group();
  const prof = [[0, 0], [0.012, 0], [0.016, 0.01], [0.017, 0.06], [0.015, 0.085], [0.0145, 0.095], [0.008, 0.105], [0, 0.105]].map(([x, y]) => new THREE.Vector2(x, y));
  const handle = new THREE.LatheGeometry(prof, 20);
  handle.rotateZ(-Math.PI / 2); // axis along +X
  add(g, handle, mats.orange, [-0.105, 0.017, 0], [0, 0, 0], "handle");
  for (let i = 0; i < 3; i++) cyl(g, 0.0175, 0.0175, 0.008, mats.black, [-0.085 + i * 0.022, 0.017, 0], [0, 0, Math.PI / 2], 20, "grip");
  cyl(g, 0.0035, 0.0035, 0.12, mats.chrome, [0.06, 0.017, 0], [0, 0, Math.PI / 2], 12, "shaft");
  box(g, 0.012, 0.0015, 0.007, mats.chrome, [0.124, 0.017, 0], "tip");
  box(g, 0.012, 0.007, 0.0015, mats.chrome, [0.124, 0.017, 0], "tipCross");
  return g;
};

models["wrench"] = () => {
  const g = new THREE.Group();
  const T = 0.007;
  const handle = new THREE.Shape();
  handle.moveTo(-0.075, -0.009); handle.lineTo(0.075, -0.0075); handle.lineTo(0.075, 0.0075); handle.lineTo(-0.075, 0.009); handle.closePath();
  flatExtrude(g, handle, T, mats.chrome, [0, 0, 0], "handle");
  const cx = 0.095, r = 0.025;
  const head = new THREE.Shape();
  head.absarc(cx, 0, r, 0.42, Math.PI * 2 - 0.42, false);
  head.lineTo(cx - 0.004, -0.009);
  head.lineTo(cx - 0.004, 0.009);
  head.closePath();
  flatExtrude(g, head, T, mats.chrome, [0, 0, 0], "openEnd");
  const ring = new THREE.Shape();
  ring.absarc(-0.09, 0, 0.021, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p: [number, number] = [-0.09 + Math.cos(a) * 0.011, Math.sin(a) * 0.011];
    if (i === 0) hole.moveTo(...p); else hole.lineTo(...p);
  }
  ring.holes.push(hole);
  flatExtrude(g, ring, T, mats.chrome, [0, 0, 0], "ringEnd");
  box(g, 0.07, 0.0012, 0.008, mats.steelDark, [0, T + 0.0018, 0], "stamp");
  return g;
};

models["screw"] = () => {
  const g = new THREE.Group();
  cyl(g, 0.0024, 0.0016, 0.012, mats.steel, [0, 0.006, 0], [0, 0, 0], 10, "shaft");
  for (let i = 0; i < 5; i++) cyl(g, 0.0028, 0.0028, 0.0008, mats.steel, [0, 0.002 + i * 0.002, 0], [0, 0, 0], 10, "thread");
  cyl(g, 0.0055, 0.006, 0.0025, mats.chrome, [0, 0.0135, 0], [0, 0, 0], 16, "head");
  box(g, 0.009, 0.0012, 0.0014, mats.steelDark, [0, 0.015, 0]);
  box(g, 0.0014, 0.0012, 0.009, mats.steelDark, [0, 0.015, 0]);
  return g;
};

// ---------------------------------------------------------------- replacement parts
models["part-screen"] = () => {
  const g = new THREE.Group();
  rbox(g, 0.074, 0.004, 0.152, 0.0015, mats.black, [0, 0.002, 0], "frame");
  rbox(g, 0.068, 0.0016, 0.144, 0.0007, mats.glass, [0, 0.0042, 0], "glass");
  box(g, 0.012, 0.001, 0.03, M("flexCable", "#d98b2b", 0.5), [0.02, 0.0005, 0.085], "flex");
  return g;
};
models["part-battery"] = () => {
  const g = new THREE.Group();
  rbox(g, 0.12, 0.012, 0.06, 0.003, mats.blue, [0, 0.006, 0], "cell");
  box(g, 0.08, 0.0008, 0.035, mats.paper, [-0.008, 0.0124, 0], "label");
  box(g, 0.015, 0.006, 0.02, mats.black, [0.065, 0.004, 0], "connector");
  box(g, 0.004, 0.0009, 0.02, mats.red, [-0.03, 0.0127, 0], "stripe");
  return g;
};
models["part-camera"] = () => {
  const g = new THREE.Group();
  box(g, 0.026, 0.003, 0.026, mats.pcb, [0, 0.0015, 0], "board");
  rbox(g, 0.016, 0.008, 0.016, 0.002, mats.black, [0, 0.007, 0], "housing");
  cyl(g, 0.0055, 0.0055, 0.003, mats.glass, [0, 0.0115, 0], [0, 0, 0], 20, "lens");
  box(g, 0.006, 0.001, 0.03, M("flexCable2", "#d98b2b", 0.5), [0, 0.0005, 0.026], "flex");
  return g;
};
models["part-handle"] = () => {
  const g = new THREE.Group();
  cyl(g, 0.016, 0.019, 0.55, mats.woodLight, [0, 0.019, 0], [0, 0, Math.PI / 2], 16, "shaft");
  for (let i = 0; i < 5; i++) cyl(g, 0.0195, 0.0195, 0.018, mats.rubber, [-0.24 + i * 0.022, 0.019, 0], [0, 0, Math.PI / 2], 16, "grip");
  cyl(g, 0.021, 0.021, 0.012, mats.steelDark, [0.27, 0.019, 0], [0, 0, Math.PI / 2], 16, "ferrule");
  return g;
};
models["part-lockpick"] = () => {
  const g = new THREE.Group();
  box(g, 0.05, 0.004, 0.012, mats.black, [-0.04, 0.002, 0], "grip");
  box(g, 0.08, 0.0015, 0.0025, mats.chrome, [0.025, 0.002, 0], "rod");
  box(g, 0.003, 0.0015, 0.008, mats.chrome, [0.065, 0.002, 0.003], "hook");
  box(g, 0.06, 0.0015, 0.0025, mats.chrome, [0.02, 0.002, 0.015], "tension");
  box(g, 0.0025, 0.0015, 0.012, mats.chrome, [-0.01, 0.002, 0.021], "tensionBend");
  return g;
};

// ---------------------------------------------------------------- replacement parts
models["part-screen"] = () => {
  const g = new THREE.Group();
  rbox(g, 0.074, 0.004, 0.152, 0.0015, mats.black, [0, 0.002, 0], "frame");
  rbox(g, 0.068, 0.0016, 0.144, 0.0007, mats.glass, [0, 0.0042, 0], "glass");
  box(g, 0.012, 0.001, 0.03, M("flexCable", "#d98b2b", 0.5), [0.02, 0.0005, 0.085], "flex");
  return g;
};
models["part-battery"] = () => {
  const g = new THREE.Group();
  rbox(g, 0.12, 0.012, 0.06, 0.003, mats.blue, [0, 0.006, 0], "cell");
  box(g, 0.08, 0.0008, 0.035, mats.paper, [-0.008, 0.0124, 0], "label");
  box(g, 0.015, 0.006, 0.02, mats.black, [0.065, 0.004, 0], "connector");
  box(g, 0.004, 0.0009, 0.02, mats.red, [-0.03, 0.0127, 0], "stripe");
  return g;
};
models["part-handle"] = () => {
  const g = new THREE.Group();
  cyl(g, 0.016, 0.019, 0.55, mats.woodLight, [0, 0.019, 0], [0, 0, Math.PI / 2], 16, "shaft");
  for (let i = 0; i < 5; i++) cyl(g, 0.0195, 0.0195, 0.018, mats.rubber, [-0.24 + i * 0.022, 0.019, 0], [0, 0, Math.PI / 2], 16, "grip");
  cyl(g, 0.021, 0.021, 0.012, mats.steelDark, [0.27, 0.019, 0], [0, 0, Math.PI / 2], 16, "ferrule");
  return g;
};
models["counter-bell"] = () => {
  const g = new THREE.Group();
  cyl(g, 0.045, 0.05, 0.015, mats.black, [0, 0.0075, 0], [0, 0, 0], 28, "base");
  const dome = new THREE.SphereGeometry(0.042, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  add(g, dome, mats.brass, [0, 0.016, 0], [0, 0, 0], "dome");
  cyl(g, 0.004, 0.004, 0.012, mats.chrome, [0, 0.062, 0], [0, 0, 0], 10, "stem");
  cyl(g, 0.009, 0.009, 0.004, mats.chrome, [0, 0.069, 0], [0, 0, 0], 16, "button");
  return g;
};

// ---------------------------------------------------------------- night-stand palette
const d = {
  woodOld: M("woodOld", "#4a3a2a", 0.88),
  woodGrey: M("woodGrey", "#5d554a", 0.9),
  woodDark: M("woodNight", "#2e241b", 0.85),
  tin: M("tin", "#6d7172", 0.55, 0.7),
  rust: M("rust", "#6b3a22", 0.92, 0.25),
  iron: M("iron", "#232527", 0.6, 0.65),
  brass: M("brassOld", "#8a6a2e", 0.45, 0.8),
  paper: M("paperOld", "#b9ab88", 0.95),
  cloth: M("clothDark", "#24252a", 0.95),
  rubber: M("rubberMat", "#1b1d1c", 0.95),
  mat: M("workMat", "#203a31", 0.85),
  beige: M("beigePlastic", "#8f8a7c", 0.6),
  crt: M("crtGlass", "#16241c", 0.15, 0.1, { emissive: "#2bd16a", emissiveIntensity: 0.5 }),
  glass: M("glassClear", "#c7d6d2", 0.05, 0.1, { transparent: true, opacity: 0.28 }),
  flame: M("flame", "#ffcf7a", 0.4, 0, { emissive: "#ff9a3a", emissiveIntensity: 4 }),
  sodium: M("sodiumGlass", "#ffcf8f", 0.3, 0, { emissive: "#ff9e45", emissiveIntensity: 3 }),
  red: M("lightRedM", "#ff2a2a", 0.3, 0, { emissive: "#ff1a1a", emissiveIntensity: 3 }),
  blueL: M("lightBlueM", "#2a5bff", 0.3, 0, { emissive: "#1a46ff", emissiveIntensity: 3 }),
  head: M("headlightM", "#fff6dc", 0.2, 0, { emissive: "#fff1c8", emissiveIntensity: 2.5 }),
  navy: M("policeNavy", "#1b2430", 0.45, 0.35),
  white: M("policeWhite", "#b8bcbf", 0.5, 0.2),
  darkGlass: M("darkGlass", "#0b0f12", 0.1, 0.4),
  skinPale: M("skinPale", "#cfc7b8", 0.7),
  skinGrey: M("skinGrey", "#a39e93", 0.75),
  eye: M("eyeVoid", "#020202", 0.3),
  eyeGlow: M("eyeGlow", "#ffeedd", 0.3, 0, { emissive: "#ffe2c4", emissiveIntensity: 1.2 }),
  mothEye: M("mothEye", "#3a0d0a", 0.25, 0.2, { emissive: "#5a120c", emissiveIntensity: 0.6 }),
  coat: M("coatBlack", "#121214", 0.9),
  suit: M("suitGrey", "#3b3d40", 0.85),
  mothDust: M("mothDust", "#6b6355", 0.95),
  beard: M("beardRust", "#6b4a2e", 0.95),
  hood: M("hoodGreen", "#2c3a33", 0.92),
  capNavy: M("capNavy", "#151b24", 0.7),
  elfMetal: M("elfSilver", "#9aa8a0", 0.35, 0.8),
  crystal: M("crystalGlow", "#7fe0c8", 0.15, 0.1, { emissive: "#3fd6b0", emissiveIntensity: 1.6 }),
  watchFace: M("watchFace", "#d8ceb4", 0.6),
  pcb: M("pcbDark", "#1c3a2a", 0.6),
  batt: M("battGrey", "#3c4752", 0.5),
  pick: M("pickIron", "#4a4d50", 0.45, 0.8),
  handleWood: M("handleWood", "#6a4b2f", 0.8),
};

function sphere(p: THREE.Object3D, r: number, mat: THREE.Material, pos: V3, scale: V3 = [1, 1, 1], name?: string, seg = 16) {
  const m = add(p, new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2)), mat, pos, [0, 0, 0], name);
  m.scale.set(...scale);
  return m;
}
function lathe(p: THREE.Object3D, pts: [number, number][], mat: THREE.Material, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], seg = 24, name?: string) {
  return add(p, new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat, pos, rot, name);
}
function group(p: THREE.Object3D, name: string, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0]) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(...pos);
  g.rotation.set(...rot);
  p.add(g);
  return g;
}
class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private r: number, private h: number, private turns: number) { super(); }
  getPoint(t: number, out = new THREE.Vector3()) {
    const a = t * Math.PI * 2 * this.turns;
    return out.set(Math.cos(a) * this.r, t * this.h, Math.sin(a) * this.r);
  }
}
/** Tiny seeded RNG for weathering details. */
let seedM = 12345;
const rr = () => ((seedM = (seedM * 16807) % 2147483647) - 1) / 2147483646;

// ---------------------------------------------------------------- stand counter (front +Z faces the street)
models["stand-counter"] = () => {
  const g = new THREE.Group();
  const W = 3.6, H = 1.02, D = 0.6;
  box(g, W, 0.94, D - 0.1, d.woodDark, [0, 0.47, -0.02], "body");
  const n = 15, pw = W / n;
  for (let i = 0; i < n; i++) {
    const h = 0.9 - rr() * 0.05;
    const m = i % 3 === 1 ? d.woodGrey : d.woodOld;
    const p = box(g, pw - 0.012, h, 0.025, m, [-W / 2 + pw * (i + 0.5), h / 2 + 0.02, D / 2 - 0.05]);
    p.rotation.z = (rr() - 0.5) * 0.015;
  }
  for (const y of [0.22, 0.72]) box(g, W - 0.04, 0.07, 0.03, d.woodGrey, [0, y, D / 2 - 0.025]);
  for (let i = 0; i < 9; i++) cyl(g, 0.006, 0.006, 0.01, d.iron, [-W / 2 + 0.2 + i * 0.4, 0.72, D / 2 - 0.008], [Math.PI / 2, 0, 0], 6);
  box(g, W + 0.08, 0.035, D + 0.08, d.tin, [0, H - 0.0175, 0], "top");
  box(g, W + 0.1, 0.05, 0.02, d.woodOld, [0, H - 0.045, D / 2 + 0.04]);
  for (let i = 0; i < 6; i++) box(g, 0.05 + rr() * 0.08, 0.35 + rr() * 0.3, 0.004, d.rust, [-W / 2 + 0.3 + rr() * (W - 0.6), 0.6, D / 2 - 0.035]);
  box(g, W - 0.2, 0.03, 0.28, d.woodOld, [0, 0.55, -D / 2 - 0.05], "shelf");
  box(g, W - 0.2, 0.03, 0.28, d.woodOld, [0, 0.18, -D / 2 - 0.05], "shelfLow");
  return g;
};

// ---------------------------------------------------------------- workbench (front +Z, player side)
models["workbench"] = () => {
  const g = new THREE.Group();
  const W = 2.2, TOP = 0.92, D = 0.7;
  box(g, W, 0.07, D, d.woodGrey, [0, TOP - 0.035, 0], "top");
  for (let i = 0; i < 7; i++) box(g, 0.08 + rr() * 0.2, 0.002, 0.05 + rr() * 0.15, d.woodDark, [-0.9 + rr() * 1.8, TOP + 0.001, -0.25 + rr() * 0.5]);
  for (const x of [-W / 2 + 0.05, W / 2 - 0.05]) for (const z of [-D / 2 + 0.05, D / 2 - 0.05]) box(g, 0.06, TOP - 0.07, 0.06, d.iron, [x, (TOP - 0.07) / 2, z]);
  box(g, W - 0.1, 0.03, D - 0.1, d.woodOld, [0, 0.14, 0], "lowerShelf");
  box(g, W - 0.1, 0.06, 0.03, d.woodOld, [0, TOP - 0.1, D / 2 - 0.03], "apron");
  // work mat + screw tray + spare tray + tool mat
  box(g, 0.95, 0.004, 0.5, d.mat, [-0.25, TOP + 0.002, 0.05], "mat");
  for (let i = 1; i < 9; i++) box(g, 0.0018, 0.0045, 0.5, d.paper, [-0.72 + i * 0.105, TOP + 0.0025, 0.05]);
  const tray = group(g, "screwTray", [-0.88, TOP, 0.1]);
  box(tray, 0.16, 0.005, 0.22, d.tin, [0, 0.0025, 0]);
  for (const [x, z, w, dd] of [[0, 0.11, 0.16, 0.005], [0, -0.11, 0.16, 0.005], [0.08, 0, 0.005, 0.22], [-0.08, 0, 0.005, 0.22]] as const) box(tray, w, 0.025, dd, d.tin, [x, 0.0125, z]);
  const spare = group(g, "spareTray", [0.55, TOP, 0.08]);
  box(spare, 0.3, 0.006, 0.24, d.iron, [0, 0.003, 0]);
  for (const [x, z, w, dd] of [[0, 0.12, 0.3, 0.006], [0, -0.12, 0.3, 0.006], [0.15, 0, 0.006, 0.24], [-0.15, 0, 0.006, 0.24]] as const) box(spare, w, 0.018, dd, d.iron, [x, 0.009, z]);
  box(g, 0.24, 0.004, 0.42, d.rubber, [0.94, TOP + 0.002, 0.02], "toolMat");
  // back board with hanging junk
  for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) box(g, 0.05, 1.05, 0.05, d.iron, [x, TOP + 0.52, -D / 2 + 0.03]);
  box(g, W - 0.1, 0.8, 0.02, d.woodOld, [0, TOP + 0.45, -D / 2 + 0.03], "backboard");
  for (let i = 0; i < 16; i++) for (let j = 0; j < 6; j++) {
    if ((i + j) % 2) continue;
    cyl(g, 0.005, 0.005, 0.004, d.iron, [-0.95 + i * 0.125, TOP + 0.13 + j * 0.12, -D / 2 + 0.041], [Math.PI / 2, 0, 0], 6);
  }
  box(g, W, 0.03, 0.2, d.woodOld, [0, TOP + 0.95, -D / 2 + 0.11], "topShelf");
  for (let i = 0; i < 7; i++) {
    const h = 0.08 + rr() * 0.08;
    const jar = i % 2 ? d.glass : d.tin;
    cyl(g, 0.04, 0.04, h, jar, [-0.95 + i * 0.3, TOP + 0.965 + h / 2, -D / 2 + 0.11], [0, 0, 0], 12);
  }
  add(g, new THREE.TorusGeometry(0.07, 0.012, 8, 20), d.rust, [-0.6, TOP + 0.55, -D / 2 + 0.06]);
  box(g, 0.035, 0.3, 0.005, d.tin, [-0.2, TOP + 0.55, -D / 2 + 0.06]);
  box(g, 0.04, 0.18, 0.012, d.rust, [0.3, TOP + 0.45, -D / 2 + 0.06]);
  box(g, 0.04, 0.18, 0.012, d.iron, [0.36, TOP + 0.45, -D / 2 + 0.06]);
  // magnifier lamp arm
  cyl(g, 0.012, 0.012, 0.35, d.iron, [-0.62, TOP + 0.175, -D / 2 + 0.12], [0, 0, 0], 8);
  cyl(g, 0.01, 0.01, 0.3, d.iron, [-0.5, TOP + 0.4, -D / 2 + 0.2], [0.9, 0, -0.6], 8);
  add(g, new THREE.TorusGeometry(0.06, 0.01, 8, 24), d.iron, [-0.38, TOP + 0.48, -D / 2 + 0.32], [-1.1, 0, 0]);
  // under-bench drawers
  for (let i = 0; i < 2; i++) {
    box(g, 0.5, 0.16, 0.6, d.woodOld, [0.8, 0.62 - i * 0.18, 0]);
    box(g, 0.48, 0.14, 0.012, d.woodGrey, [0.8, 0.62 - i * 0.18, 0.305]);
    box(g, 0.1, 0.015, 0.02, d.brass, [0.8, 0.64 - i * 0.18, 0.318]);
  }
  return g;
};

// ---------------------------------------------------------------- apothecary drawer cabinet (front +Z)
const DRAWER_COLS = 5, DRAWER_ROWS = 2;
models["drawer-cabinet"] = () => {
  const g = new THREE.Group();
  const W = 1.8, H = 1.55, D = 0.45;
  box(g, W, H - 0.08, 0.03, d.woodDark, [0, H / 2, -D / 2 + 0.015], "back");
  for (const x of [-W / 2 + 0.02, W / 2 - 0.02]) box(g, 0.04, H, D, d.woodOld, [x, H / 2, 0]);
  box(g, W + 0.06, 0.04, D + 0.04, d.woodOld, [0, H - 0.02, 0.01], "crown");
  box(g, W, 0.08, D, d.woodDark, [0, 0.04, 0], "plinth");
  box(g, W - 0.04, 0.03, D, d.woodOld, [0, 0.88, 0], "midShelf");
  // lower doors
  for (const x of [-W / 4, W / 4]) {
    box(g, W / 2 - 0.06, 0.76, 0.025, d.woodGrey, [x, 0.48, D / 2 - 0.01]);
    box(g, W / 2 - 0.16, 0.6, 0.006, d.woodOld, [x, 0.48, D / 2 + 0.005]);
    for (const y of [0.2, 0.76]) box(g, 0.05, 0.03, 0.01, d.iron, [x + (x < 0 ? -1 : 1) * (W / 4 - 0.05), y, D / 2 + 0.008]);
    cyl(g, 0.012, 0.012, 0.03, d.brass, [x + (x < 0 ? 1 : -1) * (W / 4 - 0.08), 0.5, D / 2 + 0.015], [Math.PI / 2, 0, 0], 10);
  }
  // 5 x 2 drawers: row 0 = lower (y≈1.04), row 1 = upper (y≈1.32)
  const cw = (W - 0.06) / DRAWER_COLS;
  for (let r = 0; r < DRAWER_ROWS; r++) for (let c = 0; c < DRAWER_COLS; c++) {
    const x = -W / 2 + 0.03 + cw * (c + 0.5), y = 1.04 + r * 0.28;
    const dr = group(g, `drawer${r}${c}`, [x, y, 0]);
    box(dr, cw - 0.02, 0.24, 0.03, d.woodGrey, [0, 0, D / 2 - 0.015], "face");
    box(dr, cw - 0.05, 0.2, D - 0.06, d.woodOld, [0, -0.01, 0.0]);
    box(dr, 0.16, 0.06, 0.006, d.brass, [0, 0.05, D / 2 + 0.002]);
    box(dr, 0.14, 0.045, 0.004, d.paper, [0, 0.05, D / 2 + 0.006]);
    cyl(dr, 0.012, 0.012, 0.025, d.brass, [0, -0.04, D / 2 + 0.012], [Math.PI / 2, 0, 0], 10);
  }
  for (let c = 1; c < DRAWER_COLS; c++) box(g, 0.012, 0.58, D - 0.02, d.woodDark, [-W / 2 + 0.03 + cw * c, 1.18, 0]);
  return g;
};

// ---------------------------------------------------------------- waste bin
models["waste-bin"] = () => {
  const g = new THREE.Group();
  const R = 0.22, H = 0.62;
  add(g, new THREE.CylinderGeometry(R, R * 0.9, H, 20, 1, true), M("binTin", "#585c5c", 0.6, 0.6, { side: THREE.DoubleSide }), [0, H / 2, 0], [0, 0, 0], "can");
  cyl(g, R * 0.9, R * 0.9, 0.01, d.iron, [0, 0.005, 0], [0, 0, 0], 20);
  for (const y of [0.12, 0.32, 0.52]) add(g, new THREE.TorusGeometry(R * (0.92 + y * 0.12), 0.008, 6, 24), d.tin, [0, y, 0], [Math.PI / 2, 0, 0]);
  add(g, new THREE.TorusGeometry(R, 0.012, 6, 24), d.tin, [0, H, 0], [Math.PI / 2, 0, 0]);
  cyl(g, R * 0.85, R * 0.85, 0.02, M("binGunk", "#141512", 1), [0, H - 0.18, 0], [0, 0, 0], 20, "gunk");
  for (let i = 0; i < 4; i++) box(g, 0.05 + rr() * 0.06, 0.004, 0.03 + rr() * 0.05, d.rust, [(rr() - 0.5) * 0.3, 0.2 + rr() * 0.3, R - 0.002]);
  const lid = group(g, "lid", [R + 0.03, 0.25, 0.02], [0, 0, 1.35]);
  cyl(lid, R + 0.02, R + 0.02, 0.025, d.tin, [0, 0, 0], [0, 0, 0], 20);
  cyl(lid, 0.05, 0.05, 0.02, d.iron, [0, 0.022, 0], [0, 0, 0], 10);
  return g;
};

// ---------------------------------------------------------------- PC desk + CRT terminal (front +Z)
models["pc-desk"] = () => {
  const g = new THREE.Group();
  const W = 0.9, D = 0.6, TOP = 0.8;
  box(g, W, 0.04, D, d.tin, [0, TOP - 0.02, 0], "top");
  for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) for (const z of [-D / 2 + 0.03, D / 2 - 0.03]) box(g, 0.04, TOP - 0.04, 0.04, d.iron, [x, (TOP - 0.04) / 2, z]);
  box(g, W - 0.06, 0.02, D - 0.06, d.iron, [0, 0.18, 0]);
  box(g, 0.24, 0.5, 0.48, d.beige, [0.3, 0.45, -0.02], "tower");
  box(g, 0.2, 0.03, 0.004, d.iron, [0.3, 0.58, 0.222]);
  cyl(g, 0.008, 0.008, 0.006, d.red, [0.36, 0.5, 0.223], [Math.PI / 2, 0, 0], 8);
  return g;
};
models["crt-terminal"] = () => {
  const g = new THREE.Group();
  rbox(g, 0.44, 0.38, 0.32, 0.03, d.beige, [0, 0.21, 0.02], "case");
  box(g, 0.3, 0.26, 0.26, d.beige, [0, 0.2, -0.24], "tube");
  box(g, 0.18, 0.02, 0.2, d.beige, [0, 0.01, 0]);
  box(g, 0.36, 0.28, 0.02, d.iron, [0, 0.22, 0.175], "bezel");
  box(g, 0.33, 0.25, 0.006, d.crt, [0, 0.22, 0.186], "crtScreen");
  cyl(g, 0.01, 0.01, 0.01, d.red, [0.17, 0.05, 0.185], [Math.PI / 2, 0, 0], 8);
  // keyboard
  const kb = group(g, "keyboard", [0, 0, 0.34], [0.08, 0, 0]);
  box(kb, 0.42, 0.025, 0.15, d.beige, [0, 0.012, 0]);
  for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) box(kb, 0.026, 0.01, 0.026, M("keyCap", "#6b675d", 0.7), [-0.18 + i * 0.033, 0.03, -0.05 + j * 0.033]);
  // sticky notes
  box(g, 0.06, 0.06, 0.002, d.paper, [-0.18, 0.33, 0.188]);
  return g;
};

// ---------------------------------------------------------------- hanging oil lantern (origin at hook, hangs down -Y)
models["oil-lantern"] = () => {
  const g = new THREE.Group();
  add(g, new THREE.TorusGeometry(0.03, 0.004, 6, 16), d.iron, [0, -0.03, 0]);
  lathe(g, [[0, 0], [0.05, -0.005], [0.075, -0.04], [0.08, -0.05], [0, -0.05]], d.iron, [0, -0.06, 0], [0, 0, 0], 16, "cap");
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    cyl(g, 0.005, 0.005, 0.2, d.iron, [Math.cos(a) * 0.065, -0.21, Math.sin(a) * 0.065], [0, 0, 0], 6);
  }
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.19, 16, 1, true), d.glass, [0, -0.21, 0], [0, 0, 0], "glass");
  cyl(g, 0.02, 0.025, 0.04, d.brass, [0, -0.28, 0], [0, 0, 0], 12, "burner");
  sphere(g, 0.018, d.flame, [0, -0.235, 0], [1, 1.9, 1], "flame", 12);
  lathe(g, [[0, 0], [0.08, 0], [0.085, -0.01], [0.07, -0.04], [0, -0.045]], d.iron, [0, -0.305, 0], [0, 0, 0], 16, "base");
  return g;
};

// ---------------------------------------------------------------- street lamp (origin at foot)
models["street-lamp"] = () => {
  const g = new THREE.Group();
  lathe(g, [[0, 0], [0.18, 0], [0.16, 0.08], [0.1, 0.12], [0.07, 0.4], [0, 0.4]], d.iron, [0, 0, 0], [0, 0, 0], 12);
  cyl(g, 0.055, 0.07, 4.0, d.iron, [0, 2.2, 0], [0, 0, 0], 10, "post");
  cyl(g, 0.03, 0.03, 0.9, d.iron, [0.42, 4.15, 0], [0, 0, Math.PI / 2], 8, "arm");
  lathe(g, [[0, 0.2], [0.2, 0.02], [0.24, 0], [0, 0]], d.iron, [0.85, 3.95, 0], [0, 0, 0], 14, "hood");
  sphere(g, 0.12, d.sodium, [0.85, 3.93, 0], [1, 0.5, 1], "lampGlass", 14);
  return g;
};

// ---------------------------------------------------------------- devices (lie flat, origin bottom-centre)
models["phone"] = () => {
  const g = new THREE.Group();
  const W = 0.078, L = 0.16;
  // back cover (bottom layer when face-up; flipped to service)
  const cover = group(g, "cover");
  rbox(cover, W, 0.0018, L, 0.0009, M("phoneBack", "#3b3e42", 0.5, 0.4), [0, 0.0009, 0]);
  rbox(cover, 0.026, 0.002, 0.03, 0.003, d.iron, [-0.019, -0.0005, -0.056], "camBump");
  cyl(cover, 0.005, 0.005, 0.003, d.darkGlass, [-0.024, -0.0012, -0.062], [0, 0, 0], 12);
  cyl(cover, 0.005, 0.005, 0.003, d.darkGlass, [-0.014, -0.0012, -0.05], [0, 0, 0], 12);
  for (const x of [-0.03, 0.03]) for (const z of [-0.068, 0.068]) cyl(cover, 0.0032, 0.0032, 0.0022, d.iron, [x, 0.0009, z], [0, 0, 0], 10);
  // frame + internals
  for (const x of [-W / 2 + 0.002, W / 2 - 0.002]) box(g, 0.004, 0.0078, L, M("phoneFrame", "#202326", 0.4, 0.6), [x, 0.0057, 0]);
  for (const z of [-L / 2 + 0.002, L / 2 - 0.002]) box(g, W, 0.0078, 0.004, M("phoneFrame", "#202326", 0.4, 0.6), [0, 0.0057, z]);
  box(g, W - 0.006, 0.0012, L - 0.006, d.pcb, [0, 0.0068, 0], "midplate");
  for (let i = 0; i < 5; i++) box(g, 0.006, 0.0015, 0.004, d.iron, [0.02 - i * 0.008, 0.0058, -0.06]);
  rbox(g, 0.056, 0.0032, 0.09, 0.0008, d.batt, [0, 0.0036, 0.012], "battery");
  // screen
  rbox(g, W - 0.003, 0.002, L - 0.003, 0.0008, M("phoneGlass", "#0b121a", 0.08, 0.3), [0, 0.0084, 0], "screen");
  box(g, 0.002, 0.004, 0.025, d.iron, [W / 2 + 0.0005, 0.005, -0.03], "buttons");
  return g;
};

models["pocket-watch"] = () => {
  const g = new THREE.Group();
  const R = 0.032;
  const cover = group(g, "cover");
  cyl(cover, R, R, 0.002, d.brass, [0, 0.001, 0], [0, 0, 0], 32);
  add(cover, new THREE.TorusGeometry(R * 0.6, 0.0008, 6, 32), d.woodDark, [0, -0.0001, 0], [Math.PI / 2, 0, 0]);
  for (const x of [-0.016, 0.016]) cyl(cover, 0.0028, 0.0028, 0.0022, d.iron, [x, 0.001, 0], [0, 0, 0], 10);
  add(g, new THREE.CylinderGeometry(R, R, 0.012, 32, 1, true), d.brass, [0, 0.008, 0], [0, 0, 0], "case");
  cyl(g, R - 0.002, R - 0.002, 0.001, d.iron, [0, 0.004, 0], [0, 0, 0], 32, "movement");
  const spring = new THREE.TubeGeometry(new Helix(0.012, 0.002, 4), 64, 0.0012, 6, false);
  add(g, spring, d.tin, [0.004, 0.0035, 0.002], [0, 0, 0], "spring");
  for (let i = 0; i < 3; i++) cyl(g, 0.004 + i * 0.002, 0.004 + i * 0.002, 0.0012, d.brass, [-0.012 + i * 0.01, 0.0046, -0.01 + i * 0.006], [0, 0, 0], 12);
  cyl(g, R - 0.002, R - 0.002, 0.0015, d.watchFace, [0, 0.0128, 0], [0, 0, 0], 32, "face");
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    box(g, 0.0012, 0.0004, i % 3 ? 0.003 : 0.005, d.woodDark, [Math.sin(a) * 0.025, 0.0137, Math.cos(a) * 0.025]).rotation.y = a;
  }
  box(g, 0.0012, 0.0005, 0.016, d.woodDark, [0, 0.0139, -0.007]);
  box(g, 0.0012, 0.0005, 0.011, d.woodDark, [0.004, 0.014, 0.003]).rotation.y = 0.8;
  cyl(g, R - 0.0015, R - 0.0015, 0.001, d.glass, [0, 0.0145, 0], [0, 0, 0], 32, "glass");
  add(g, new THREE.TorusGeometry(R, 0.0018, 8, 32), d.brass, [0, 0.0142, 0], [Math.PI / 2, 0, 0]);
  cyl(g, 0.004, 0.004, 0.008, d.brass, [0, 0.008, R + 0.004], [Math.PI / 2, 0, 0], 12, "crown");
  add(g, new THREE.TorusGeometry(0.008, 0.0015, 6, 16), d.brass, [0, 0.008, R + 0.014], [0, 0, 0], "bow");
  return g;
};

models["revolver"] = () => {
  const g = new THREE.Group();
  // lies on its right side; +X = muzzle
  box(g, 0.11, 0.022, 0.05, d.iron, [0.0, 0.011, 0], "frame");
  cyl(g, 0.009, 0.009, 0.16, d.iron, [0.13, 0.012, -0.012], [0, 0, Math.PI / 2], 14, "barrel");
  box(g, 0.15, 0.008, 0.012, d.iron, [0.13, 0.012, -0.024]);
  cyl(g, 0.022, 0.022, 0.032, M("drumIron", "#2f3236", 0.45, 0.7), [0.03, 0.012, -0.004], [0, 0, Math.PI / 2], 6, "drum");
  const grip = new THREE.Shape();
  grip.moveTo(-0.05, 0.02); grip.lineTo(-0.13, -0.005); grip.lineTo(-0.15, 0.03); grip.lineTo(-0.135, 0.05); grip.lineTo(-0.045, 0.04); grip.closePath();
  const gg = new THREE.ExtrudeGeometry(grip, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2 });
  gg.rotateX(-Math.PI / 2);
  add(g, gg, d.handleWood, [0, 0, 0.0], [0, 0, 0], "grip");
  add(g, new THREE.TorusGeometry(0.018, 0.003, 6, 16, Math.PI), d.iron, [-0.02, 0.011, 0.03], [Math.PI / 2, 0, Math.PI], "guard");
  box(g, 0.012, 0.012, 0.012, d.iron, [-0.05, 0.015, -0.02], "hammer");
  const cover = group(g, "cover");
  box(cover, 0.085, 0.0025, 0.04, M("sidePlate", "#3a3d40", 0.5, 0.7), [-0.005, 0.0235, 0.002]);
  for (const x of [-0.035, 0.025]) cyl(cover, 0.003, 0.003, 0.002, d.iron, [x, 0.0245, 0.002], [0, 0, 0], 10);
  const spring = new THREE.TubeGeometry(new Helix(0.004, 0.05, 9), 80, 0.0009, 5, false);
  add(g, spring, d.tin, [-0.03, 0.019, 0.004], [0, 0, -Math.PI / 2], "spring");
  return g;
};

models["elf-lantern"] = () => {
  const g = new THREE.Group();
  lathe(g, [[0, 0], [0.075, 0], [0.08, 0.01], [0.06, 0.025], [0.05, 0.04], [0, 0.04]], d.elfMetal, [0, 0, 0], [0, 0, 0], 6, "base");
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const post = cyl(g, 0.004, 0.005, 0.2, d.elfMetal, [Math.cos(a) * 0.045, 0.14, Math.sin(a) * 0.045], [0, 0, 0], 6);
    post.rotation.set(Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08);
  }
  const crystal = new THREE.OctahedronGeometry(0.03, 0);
  const cm = add(g, crystal, d.crystal, [0, 0.13, 0], [0, 0.3, 0], "crystal");
  cm.scale.set(0.8, 1.6, 0.8);
  const cover = group(g, "cover");
  add(cover, new THREE.CylinderGeometry(0.04, 0.05, 0.19, 12, 1, true), d.glass, [0, 0.14, 0]);
  lathe(cover, [[0, 0.04], [0.065, 0.0], [0.07, -0.01], [0.0, -0.01]], d.elfMetal, [0, 0.245, 0], [0, 0, 0], 6, "cap");
  cyl(cover, 0.006, 0.006, 0.06, d.elfMetal, [0, 0.31, 0], [0, 0, 0], 6);
  add(cover, new THREE.TorusGeometry(0.018, 0.003, 6, 16), d.elfMetal, [0, 0.345, 0]);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
    const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(0.012, 0.03, 0, 0.06); leaf.quadraticCurveTo(-0.012, 0.03, 0, 0);
    const lg = new THREE.ShapeGeometry(leaf);
    add(cover, lg, M("leafSilver", "#9aa8a0", 0.35, 0.8, { side: THREE.DoubleSide }), [Math.cos(a) * 0.05, 0.22, Math.sin(a) * 0.05], [0, -a + Math.PI / 2, 0.3]);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    cyl(cover, 0.004, 0.004, 0.003, d.brass, [Math.cos(a) * 0.05, 0.262, Math.sin(a) * 0.05], [0, 0, 0], 8);
  }
  return g;
};

function axe(head: (g: THREE.Group) => void) {
  const g = new THREE.Group();
  // handle runs along +Z (towards the player), head sits at -Z end
  const h = group(g, "handle");
  cyl(h, 0.017, 0.02, 0.62, d.handleWood, [0, 0.02, 0.06], [Math.PI / 2, 0, 0], 12);
  for (let i = 0; i < 6; i++) cyl(h, 0.0205, 0.0205, 0.014, M("leatherWrap", "#3a2a1c", 0.9), [0, 0.02, 0.26 + i * 0.016], [Math.PI / 2, 0, 0], 12);
  head(g);
  box(g, 0.06, 0.05, 0.07, d.iron, [0, 0.025, -0.25], "collar");
  for (const x of [-0.031, 0.031]) box(g, 0.002, 0.03, 0.05, d.brass, [x, 0.025, -0.25]);
  cyl(g, 0.009, 0.009, 0.002, d.woodDark, [0, 0.051, -0.25], [0, 0, 0], 10, "boltHole");
  return g;
}
models["dwarf-pickaxe"] = () => axe((g) => {
  const pick = new THREE.Shape();
  pick.moveTo(-0.2, 0.0); pick.quadraticCurveTo(-0.1, 0.03, 0, 0.025); pick.quadraticCurveTo(0.1, 0.03, 0.2, 0.0);
  pick.lineTo(0.2, -0.008); pick.quadraticCurveTo(0.1, 0.008, 0, -0.022); pick.quadraticCurveTo(-0.1, 0.008, -0.2, -0.008); pick.closePath();
  const pg = new THREE.ExtrudeGeometry(pick, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2 });
  pg.rotateX(-Math.PI / 2);
  add(g, pg, d.pick, [0, 0.003, -0.25 + 0.0], [0, 0, 0], "pickHead");
});
models["warhammer"] = () => axe((g) => {
  box(g, 0.13, 0.065, 0.075, d.pick, [0.085, 0.032, -0.25], "hammerFace");
  box(g, 0.02, 0.075, 0.085, d.iron, [0.155, 0.032, -0.25]);
  const spike = new THREE.ConeGeometry(0.03, 0.12, 6);
  spike.rotateZ(Math.PI / 2);
  add(g, spike, d.pick, [-0.09, 0.032, -0.25], [0, 0, 0], "spike");
});

models["bolt"] = () => {
  const g = new THREE.Group();
  // origin at the underside of the head; shaft goes down -Y
  cyl(g, 0.013, 0.013, 0.009, d.iron, [0, 0.0045, 0], [0, 0, 0], 6, "head");
  cyl(g, 0.016, 0.016, 0.002, d.tin, [0, -0.001, 0], [0, 0, 0], 16, "washer");
  cyl(g, 0.0055, 0.0055, 0.05, d.tin, [0, -0.025, 0], [0, 0, 0], 10, "shaft");
  for (let i = 0; i < 8; i++) cyl(g, 0.0062, 0.0062, 0.0015, d.tin, [0, -0.008 - i * 0.005, 0], [0, 0, 0], 10);
  return g;
};

// ---------------------------------------------------------------- spare parts
models["part-crystal"] = () => {
  const g = new THREE.Group();
  lathe(g, [[0, 0], [0.018, 0], [0.014, 0.008], [0, 0.008]], d.elfMetal, [0, 0, 0], [0, 0, 0], 6, "mount");
  const c = add(g, new THREE.OctahedronGeometry(0.03, 0), d.crystal, [0, 0.055, 0], [0, 0.3, 0], "crystal");
  c.scale.set(0.8, 1.6, 0.8);
  return g;
};
models["part-spring"] = () => {
  const g = new THREE.Group();
  const s = new THREE.TubeGeometry(new Helix(0.012, 0.07, 10), 120, 0.0016, 6, false);
  add(g, s, d.tin, [0, 0.014, -0.035], [Math.PI / 2, 0, 0], "coil");
  box(g, 0.004, 0.004, 0.02, d.tin, [0.012, 0.014, 0.045], "tail");
  return g;
};

// ---------------------------------------------------------------- notepad on a clipboard
models["notepad"] = () => {
  const g = new THREE.Group();
  box(g, 0.24, 0.005, 0.33, M("hardboard", "#5a4128", 0.85), [0, 0.0025, 0], "board");
  box(g, 0.21, 0.002, 0.28, d.paper, [0, 0.006, 0.01], "paper");
  for (let i = 0; i < 11; i++) box(g, 0.17 - (i % 3) * 0.03, 0.0005, 0.002, d.woodDark, [-0.005 - (i % 3) * 0.015, 0.0072, -0.1 + i * 0.022]);
  for (let i = 0; i < 4; i++) box(g, 0.012, 0.0006, 0.012, d.woodDark, [-0.085, 0.0074, -0.06 + i * 0.044]);
  box(g, 0.09, 0.01, 0.03, d.tin, [0, 0.009, -0.15], "clip");
  cyl(g, 0.004, 0.004, 0.17, M("pencil", "#7a6a2a", 0.7), [0.095, 0.01, 0.02], [Math.PI / 2, 0, 0.1], 6, "pencil");
  // coffee ring
  add(g, new THREE.TorusGeometry(0.03, 0.002, 4, 24), M("stain", "#6b5236", 1), [0.05, 0.0072, 0.08], [Math.PI / 2, 0, 0]);
  return g;
};

// ---------------------------------------------------------------- police car (front +X, origin bottom-centre)
models["police-car"] = () => {
  const g = new THREE.Group();
  const L = 4.5, W = 1.8;
  rbox(g, L, 0.6, W, 0.08, d.navy, [0, 0.62, 0], "body");
  box(g, L - 0.6, 0.12, W + 0.01, d.white, [-0.1, 0.62, 0], "stripe");
  const cab = new THREE.Shape();
  cab.moveTo(-1.35, 0); cab.lineTo(1.0, 0); cab.lineTo(0.45, 0.52); cab.lineTo(-1.05, 0.52); cab.closePath();
  const cg = new THREE.ExtrudeGeometry(cab, { depth: W - 0.16, bevelEnabled: false });
  cg.translate(0, 0, -(W - 0.16) / 2);
  add(g, cg, d.navy, [0, 0.92, 0], [0, 0, 0], "cabin");
  const win = new THREE.Shape();
  win.moveTo(-1.28, 0.05); win.lineTo(0.9, 0.05); win.lineTo(0.42, 0.46); win.lineTo(-1.0, 0.46); win.closePath();
  const wg = new THREE.ExtrudeGeometry(win, { depth: W - 0.12, bevelEnabled: false });
  wg.translate(0, 0, -(W - 0.12) / 2);
  add(g, wg, d.darkGlass, [0, 0.92, 0], [0, 0, 0], "windows");
  box(g, 0.06, 0.5, W - 0.1, d.navy, [-0.2, 1.17, 0], "pillar");
  for (const x of [-1.45, 1.4]) for (const z of [-W / 2 + 0.05, W / 2 - 0.05]) {
    cyl(g, 0.34, 0.34, 0.24, d.rubber, [x, 0.34, z], [Math.PI / 2, 0, 0], 18);
    cyl(g, 0.2, 0.2, 0.25, d.tin, [x, 0.34, z], [Math.PI / 2, 0, 0], 12);
  }
  box(g, 0.12, 0.18, W + 0.04, d.iron, [L / 2 + 0.02, 0.45, 0], "bumperF");
  box(g, 0.12, 0.18, W + 0.04, d.iron, [-L / 2 - 0.02, 0.45, 0], "bumperR");
  box(g, 0.2, 0.25, 0.9, d.iron, [L / 2 + 0.06, 0.62, 0], "grille");
  const hl = group(g, "headlights");
  for (const z of [-0.62, 0.62]) box(hl, 0.04, 0.13, 0.28, d.head, [L / 2 + 0.005, 0.72, z]);
  for (const z of [-0.65, 0.65]) box(g, 0.04, 0.1, 0.25, d.red, [-L / 2 - 0.005, 0.72, z], "tail");
  box(g, 0.3, 0.06, 1.3, d.iron, [-0.3, 1.47, 0], "lightbarBase");
  box(g, 0.24, 0.12, 0.55, d.red, [-0.3, 1.56, -0.34], "lightRed");
  box(g, 0.24, 0.12, 0.55, d.blueL, [-0.3, 1.56, 0.34], "lightBlue");
  cyl(g, 0.01, 0.01, 0.8, d.iron, [-1.5, 1.6, 0.7], [0, 0, 0.2], 6, "antenna");
  return g;
};

// ---------------------------------------------------------------- character accessories (head-bone units of the Kenney mini characters: head spans x±0.23, y 0–0.33, z±0.17, face +Z)
models["officer-cap"] = () => {
  const g = new THREE.Group();
  cyl(g, 0.27, 0.24, 0.11, d.capNavy, [0, 0.33, -0.01], [0, 0, 0], 20, "crown");
  cyl(g, 0.245, 0.245, 0.03, d.iron, [0, 0.285, -0.01], [0, 0, 0], 20, "band");
  const brim = sphere(g, 0.16, d.iron, [0, 0.275, 0.16], [1, 0.12, 0.7], "brim");
  brim.rotation.x = 0.2;
  box(g, 0.06, 0.07, 0.01, d.brass, [0, 0.34, 0.235], "badge");
  return g;
};
models["dwarf-gear"] = () => {
  const g = new THREE.Group();
  sphere(g, 0.25, d.iron, [0, 0.24, -0.01], [1, 0.75, 0.9], "helmet", 20);
  add(g, new THREE.TorusGeometry(0.245, 0.02, 6, 24), d.brass, [0, 0.22, -0.01], [Math.PI / 2, 0, 0], "rim");
  box(g, 0.03, 0.14, 0.02, d.iron, [0, 0.18, 0.2], "noseGuard");
  sphere(g, 0.17, d.beard, [0, 0.03, 0.12], [1.1, 1.0, 0.7], "beard");
  sphere(g, 0.12, d.beard, [0, -0.1, 0.13], [1.0, 1.2, 0.6]);
  sphere(g, 0.06, d.beard, [0, -0.2, 0.12], [1, 1.4, 0.7]);
  sphere(g, 0.07, d.beard, [-0.1, 0.1, 0.16], [1.4, 0.5, 0.6], "moustache");
  sphere(g, 0.07, d.beard, [0.1, 0.1, 0.16], [1.4, 0.5, 0.6]);
  for (const y of [-0.08, -0.16]) add(g, new THREE.TorusGeometry(0.035, 0.008, 6, 12), d.brass, [0, y, 0.19], [0, 0, 0]);
  return g;
};
models["elf-hood"] = () => {
  const g = new THREE.Group();
  const hood = new THREE.SphereGeometry(0.29, 20, 14, Math.PI * 0.68, Math.PI * 1.64, 0, Math.PI * 0.75);
  add(g, hood, M("hoodCloth", "#2c3a33", 0.92, 0, { side: THREE.DoubleSide }), [0, 0.18, -0.02], [0, 0, 0], "hood");
  const tip = new THREE.ConeGeometry(0.09, 0.25, 10);
  add(g, tip, d.hood, [0, 0.36, -0.2], [-1.0, 0, 0], "hoodTip");
  for (const s of [-1, 1]) {
    const ear = new THREE.ConeGeometry(0.035, 0.2, 8);
    add(g, ear, d.skinPale, [s * 0.27, 0.2, 0.02], [0, 0, -s * 1.1], "ear");
  }
  add(g, new THREE.TorusGeometry(0.2, 0.012, 6, 24, Math.PI), d.elfMetal, [0, 0.02, 0.05], [0, 0, Math.PI], "clasp");
  return g;
};
models["umbrella"] = () => {
  const g = new THREE.Group();
  const can = new THREE.ConeGeometry(0.75, 0.28, 8, 1, true);
  add(g, can, M("umbrellaCloth", "#0f1012", 0.8, 0, { side: THREE.DoubleSide }), [0, 0.95, 0], [0, 0, 0], "canopy");
  cyl(g, 0.012, 0.012, 1.0, d.iron, [0, 0.55, 0], [0, 0, 0], 6, "rod");
  add(g, new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI), d.woodDark, [0.04, 0.06, 0], [0, 0, Math.PI]);
  return g;
};

// ---------------------------------------------------------------- folklore entities (metres, origin at feet, face +Z)
models["entity-hollow"] = () => {
  const g = new THREE.Group();
  lathe(g, [[0.0, 0], [0.34, 0], [0.3, 0.6], [0.22, 1.4], [0.2, 1.75], [0.12, 1.92], [0, 1.95]], d.coat, [0, 0, 0], [0, 0, 0], 14, "coat");
  for (const s of [-1, 1]) {
    cyl(g, 0.045, 0.035, 1.15, d.coat, [s * 0.25, 1.25, 0.02], [0, 0, s * 0.06], 8, "arm");
    const hand = sphere(g, 0.05, d.skinGrey, [s * 0.29, 0.66, 0.03], [0.6, 1.8, 0.6]);
    hand.name = "hand";
    for (let f = 0; f < 3; f++) cyl(g, 0.007, 0.005, 0.16, d.skinGrey, [s * (0.28 + f * 0.012), 0.52, 0.02 + f * 0.012], [0, 0, 0], 5);
  }
  cyl(g, 0.04, 0.05, 0.22, d.skinGrey, [0, 2.0, 0], [0.1, 0, 0], 8, "neck");
  const head = group(g, "head", [0, 2.12, 0.02]);
  sphere(head, 0.12, d.skinPale, [0, 0.09, 0], [0.85, 1.25, 0.95], "skull", 18);
  sphere(head, 0.02, d.eye, [-0.04, 0.1, 0.095], [1, 0.5, 0.4]);
  sphere(head, 0.02, d.eye, [0.04, 0.1, 0.095], [1, 0.5, 0.4]);
  return g;
};
models["entity-moth"] = () => {
  const g = new THREE.Group();
  lathe(g, [[0, 0], [0.4, 0], [0.33, 0.5], [0.24, 1.25], [0.18, 1.5], [0, 1.55]], d.mothDust, [0, 0, 0], [0, 0, 0], 12, "cloak");
  for (const s of [-1, 1]) {
    const wing = sphere(g, 0.5, M("mothWing", "#4d463b", 0.95, 0, { side: THREE.DoubleSide }), [s * 0.22, 1.05, -0.22], [0.6, 1.2, 0.08], "wing");
    wing.rotation.set(0.15, s * 0.5, s * 0.25);
  }
  sphere(g, 0.14, M("mothFur", "#8a8170", 1), [0, 1.48, 0.02], [1.4, 0.6, 1.1], "ruff");
  const head = group(g, "head", [0, 1.62, 0.04]);
  sphere(head, 0.12, d.mothDust, [0, 0.03, 0], [0.9, 1.0, 0.9], "skull", 16);
  sphere(head, 0.07, d.mothEye, [-0.075, 0.05, 0.07], [1, 1.1, 0.8], "eyeL", 14);
  sphere(head, 0.07, d.mothEye, [0.075, 0.05, 0.07], [1, 1.1, 0.8], "eyeR", 14);
  for (const s of [-1, 1]) {
    const ant = cyl(head, 0.006, 0.003, 0.25, d.mothDust, [s * 0.05, 0.22, 0.04], [0.5, 0, -s * 0.35], 5, "antenna");
    ant.name = "antenna";
    sphere(head, 0.03, d.mothDust, [s * 0.1, 0.33, 0.1], [0.5, 1.6, 0.3]);
  }
  return g;
};
models["entity-smiler"] = () => {
  const g = new THREE.Group();
  for (const s of [-1, 1]) cyl(g, 0.07, 0.06, 0.95, d.suit, [s * 0.1, 0.475, 0], [0, 0, 0], 8, "leg");
  lathe(g, [[0, 0.9], [0.2, 0.92], [0.24, 1.4], [0.26, 1.55], [0.1, 1.62], [0, 1.62]], d.suit, [0, 0, 0], [0, 0, 0], 12, "torso");
  box(g, 0.05, 0.5, 0.01, M("tieRed", "#5a1a14", 0.7), [0, 1.3, 0.24], "tie");
  for (const s of [-1, 1]) {
    cyl(g, 0.05, 0.04, 0.85, d.suit, [s * 0.3, 1.15, 0], [0, 0, s * 0.08], 8, "arm");
    sphere(g, 0.05, d.skinPale, [s * 0.34, 0.68, 0], [0.7, 1.5, 0.5], "hand");
  }
  cyl(g, 0.045, 0.05, 0.12, d.skinPale, [0, 1.68, 0], [0, 0, 0], 8, "neck");
  const head = group(g, "head", [0, 1.78, 0]);
  sphere(head, 0.15, d.skinPale, [0, 0.08, 0], [0.95, 1.1, 0.95], "skull", 20);
  sphere(head, 0.032, d.eye, [-0.055, 0.12, 0.125], [1, 1.2, 0.5]);
  sphere(head, 0.032, d.eye, [0.055, 0.12, 0.125], [1, 1.2, 0.5]);
  const smile = new THREE.TorusGeometry(0.09, 0.009, 6, 24, Math.PI * 0.9);
  add(head, smile, d.eye, [0, 0.06, 0.12], [0.3, 0, Math.PI + Math.PI * 0.05], "smile");
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + 0.25 + i * 0.3;
    box(head, 0.006, 0.014, 0.004, d.skinPale, [Math.cos(a) * 0.09, 0.06 + Math.sin(a) * 0.09 + 0.005, 0.135]);
  }
  sphere(head, 0.16, M("hatBlack", "#0e0e10", 0.8), [0, 0.2, 0], [1.05, 0.25, 1.05], "hatBrim");
  cyl(head, 0.1, 0.11, 0.16, M("hatBlack2", "#0e0e10", 0.8), [0, 0.3, 0], [0, 0, 0], 16, "hatCrown");
  return g;
};

// ---------------------------------------------------------------- the thing under the workbench (origin at chin, face +Z)
models["peeker"] = () => {
  const g = new THREE.Group();
  const head = group(g, "head");
  sphere(head, 0.11, d.skinPale, [0, 0.11, 0], [0.9, 1.15, 0.9], "skull", 20);
  sphere(head, 0.035, d.eye, [-0.04, 0.12, 0.085], [0.9, 1.4, 0.5], "eyeL");
  sphere(head, 0.035, d.eye, [0.04, 0.12, 0.085], [0.9, 1.4, 0.5], "eyeR");
  sphere(head, 0.006, d.eyeGlow, [-0.04, 0.12, 0.1], [1, 1, 0.5]);
  sphere(head, 0.006, d.eyeGlow, [0.04, 0.12, 0.1], [1, 1, 0.5]);
  sphere(head, 0.02, d.eye, [0, 0.04, 0.09], [1.4, 0.4, 0.4], "mouth");
  for (const s of [-1, 1]) {
    const hand = group(g, "hand", [s * 0.17, 0.2, 0.06]);
    sphere(hand, 0.03, d.skinPale, [0, 0, 0], [1.2, 0.5, 1]);
    for (let f = 0; f < 4; f++) {
      const fx = (f - 1.5) * 0.014;
      cyl(hand, 0.005, 0.004, 0.09, d.skinPale, [fx, 0.0, 0.05], [Math.PI / 2 - 0.2, 0, 0], 5);
      cyl(hand, 0.004, 0.003, 0.04, d.skinPale, [fx, -0.02, 0.1], [Math.PI / 2 + 0.9, 0, 0], 5);
    }
  }
  return g;
};

// Nodes the game looks up by name (swapped materials, removable parts, animated bits).
const KEEP: Record<string, string[]> = {
  phone: ["screen", "cover", "battery"],
  "pocket-watch": ["cover", "spring"],
  revolver: ["cover", "spring"],
  "elf-lantern": ["cover", "crystal"],
  "dwarf-pickaxe": ["handle"],
  warhammer: ["handle"],
  "drawer-cabinet": Array.from({ length: 10 }, (_, i) => `drawer${Math.floor(i / 5)}${i % 5}`),
  "crt-terminal": ["crtScreen"],
  "oil-lantern": ["flame"],
  "street-lamp": ["lampGlass"],
  "police-car": ["lightRed", "lightBlue", "headlights"],
  "entity-hollow": ["head"],
  "entity-moth": ["head"],
  "entity-smiler": ["head"],
  peeker: ["head", "hand"],
  "waste-bin": ["lid"],
};

/** Merge every mesh outside the KEEP list into one mesh per material (fewer draw calls). */
function bake(root: THREE.Object3D, keep: string[]) {
  root.updateMatrixWorld(true);
  const kept = new Set<THREE.Object3D>();
  root.traverse((o) => { if (keep.includes(o.name)) o.traverse((c) => kept.add(c)); });
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const remove: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || kept.has(m)) return;
    const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrixWorld);
    for (const k of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(k)) geo.deleteAttribute(k);
    const mat = m.material as THREE.Material;
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat)!.push(geo);
    remove.push(m);
  });
  for (const m of remove) m.parent?.remove(m);
  // drop now-empty groups (but keep named KEEP nodes)
  const empties: THREE.Object3D[] = [];
  root.traverse((o) => { if (o !== root && !(o as THREE.Mesh).isMesh && o.children.length === 0 && !kept.has(o)) empties.push(o); });
  for (const e of empties) e.parent?.remove(e);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false)!;
    merged.applyMatrix4(inv);
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = mat.name;
    root.add(mesh);
  }
}

// ---------------------------------------------------------------- export
const exporter = new GLTFExporter();
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(models);
for (const name of names) {
  const scene = new THREE.Scene();
  const root = models[name]();
  root.name = name;
  scene.add(root);
  bake(root, KEEP[name] ?? []);
  const buf = (await exporter.parseAsync(scene, { binary: true })) as ArrayBuffer;
  writeFileSync(`${OUT}/${name}.glb`, Buffer.from(buf));
  console.log(`${name}.glb  ${(buf.byteLength / 1024).toFixed(1)} KB`);
}
