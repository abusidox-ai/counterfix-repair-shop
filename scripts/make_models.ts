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

// ---------------------------------------------------------------- repair desk
models["repair-desk"] = () => {
  const g = new THREE.Group();
  const W = 2.0, D = 0.8, TOP = 0.9;
  box(g, W, 0.06, D, mats.wood, [0, TOP - 0.03, 0], "desktop");
  // butcher-block strips
  for (let i = 0; i < 9; i++) box(g, W, 0.004, 0.003, mats.woodDark, [0, TOP + 0.0005, -D / 2 + (i + 1) * (D / 10)]);
  for (const x of [-W / 2 + 0.06, W / 2 - 0.06]) for (const z of [-D / 2 + 0.06, D / 2 - 0.06]) box(g, 0.06, TOP - 0.06, 0.06, mats.steelDark, [x, (TOP - 0.06) / 2, z]);
  box(g, W - 0.1, 0.03, D - 0.14, mats.woodDark, [0, 0.16, 0], "lowerShelf");
  // drawer unit
  box(g, 0.5, 0.62, 0.7, mats.teal, [0.68, 0.53, 0.02], "drawers");
  for (let i = 0; i < 3; i++) {
    const y = 0.33 + i * 0.2;
    box(g, 0.46, 0.17, 0.012, mats.teal, [0.68, y, 0.375]);
    box(g, 0.16, 0.018, 0.02, mats.steel, [0.68, y + 0.04, 0.39]);
    box(g, 0.08, 0.035, 0.004, mats.paper, [0.68, y - 0.03, 0.383]);
  }
  // cutting mat + parts tray
  box(g, 0.9, 0.004, 0.5, mats.cutMat, [-0.25, TOP + 0.002, 0.04], "mat");
  for (let i = 1; i < 9; i++) box(g, 0.002, 0.0045, 0.5, mats.cream, [-0.7 + i * 0.1, TOP + 0.0025, 0.04]);
  const tray = new THREE.Group();
  tray.position.set(-0.85, TOP, 0.05);
  box(tray, 0.18, 0.006, 0.28, mats.steelDark, [0, 0.003, 0]);
  box(tray, 0.18, 0.03, 0.006, mats.steelDark, [0, 0.015, 0.14]);
  box(tray, 0.18, 0.03, 0.006, mats.steelDark, [0, 0.015, -0.14]);
  box(tray, 0.006, 0.03, 0.28, mats.steelDark, [0.09, 0.015, 0]);
  box(tray, 0.006, 0.03, 0.28, mats.steelDark, [-0.09, 0.015, 0]);
  g.add(tray);
  // pegboard back
  box(g, 0.05, 1.1, 0.05, mats.steelDark, [-W / 2 + 0.03, TOP + 0.55, -D / 2 + 0.03]);
  box(g, 0.05, 1.1, 0.05, mats.steelDark, [W / 2 - 0.03, TOP + 0.55, -D / 2 + 0.03]);
  box(g, W - 0.1, 0.85, 0.02, mats.pegboard, [0, TOP + 0.5, -D / 2 + 0.03], "pegboard");
  for (let i = 0; i < 18; i++) for (let j = 0; j < 7; j++) {
    if ((i + j) % 2) continue;
    cyl(g, 0.006, 0.006, 0.004, mats.woodDark, [-0.85 + i * 0.1, TOP + 0.15 + j * 0.11, -D / 2 + 0.041], [Math.PI / 2, 0, 0], 8);
  }
  box(g, W, 0.03, 0.22, mats.wood, [0, TOP + 1.0, -D / 2 + 0.12], "topShelf");
  // hanging things: pliers, coil, ruler
  for (const [x, y] of [[-0.6, TOP + 0.62], [-0.2, TOP + 0.7], [0.3, TOP + 0.55], [0.6, TOP + 0.66]] as const)
    cyl(g, 0.004, 0.004, 0.05, mats.steel, [x, y, -D / 2 + 0.065], [Math.PI / 2, 0, 0], 8);
  add(g, new THREE.TorusGeometry(0.07, 0.012, 10, 28), mats.orange, [-0.6, TOP + 0.55, -D / 2 + 0.06]);
  add(g, new THREE.TorusGeometry(0.05, 0.01, 10, 28), mats.red, [-0.6, TOP + 0.55, -D / 2 + 0.075]);
  box(g, 0.035, 0.3, 0.005, mats.steel, [-0.2, TOP + 0.55, -D / 2 + 0.06]);
  box(g, 0.04, 0.18, 0.012, mats.red, [0.3, TOP + 0.45, -D / 2 + 0.06]);
  box(g, 0.04, 0.18, 0.012, mats.red, [0.36, TOP + 0.45, -D / 2 + 0.06]);
  box(g, 0.12, 0.12, 0.06, mats.black, [0.6, TOP + 0.56, -D / 2 + 0.07]);
  // small bins on top shelf
  for (let i = 0; i < 6; i++) {
    const m = [mats.orange, mats.blue, mats.teal][i % 3];
    box(g, 0.14, 0.09, 0.16, m, [-0.75 + i * 0.3, TOP + 1.06, -D / 2 + 0.12]);
  }
  return g;
};

// ---------------------------------------------------------------- front counter
models["front-counter"] = () => {
  const g = new THREE.Group();
  const W = 5, H = 1.05, D = 0.72;
  box(g, W, 0.92, D - 0.12, mats.green, [0, 0.52, -0.02], "body");
  box(g, W, 0.08, D - 0.14, mats.charcoal, [0, 0.04, -0.02], "kick");
  box(g, W + 0.12, 0.07, D + 0.04, mats.wood, [0, H - 0.035, 0], "top");
  box(g, W + 0.12, 0.012, D + 0.04, mats.woodDark, [0, H - 0.075, 0]);
  // front panelling (+Z, customer side)
  const panels = 7, pw = W / panels;
  for (let i = 0; i < panels; i++) {
    const x = -W / 2 + pw * (i + 0.5);
    box(g, pw - 0.14, 0.6, 0.015, mats.green, [x, 0.5, D / 2 - 0.08]);
    box(g, pw - 0.1, 0.02, 0.02, mats.woodLight, [x, 0.81, D / 2 - 0.085]);
    box(g, pw - 0.1, 0.02, 0.02, mats.woodLight, [x, 0.19, D / 2 - 0.085]);
  }
  for (let i = 0; i <= panels; i++) box(g, 0.05, 0.9, 0.03, mats.woodLight, [-W / 2 + pw * i, 0.5, D / 2 - 0.075]);
  // staff side shelf
  box(g, W - 0.2, 0.03, 0.3, mats.woodDark, [0, 0.45, -D / 2 - 0.02]);
  return g;
};

// ---------------------------------------------------------------- parts shelf
models["parts-shelf"] = () => {
  const g = new THREE.Group();
  const W = 2.4, H = 2.2, D = 0.5;
  for (const x of [-W / 2, W / 2]) for (const z of [-D / 2 + 0.02, D / 2 - 0.02]) box(g, 0.04, H, 0.04, mats.steelDark, [x, H / 2, z]);
  for (let i = 0; i < 5; i++) {
    const y = 0.12 + i * 0.5;
    box(g, W, 0.03, D, mats.woodLight, [0, y, 0], `shelf${i}`);
    box(g, W, 0.04, 0.012, mats.steelDark, [0, y - 0.005, D / 2]);
  }
  box(g, W, H - 0.1, 0.01, mats.charcoal, [0, H / 2, -D / 2 + 0.005]);
  // cross bracing on the sides
  for (const x of [-W / 2, W / 2]) {
    const len = Math.hypot(H, D);
    add(g, new THREE.BoxGeometry(0.012, len, 0.012), mats.steelDark, [x, H / 2, 0], [Math.atan2(D, H), 0, 0]);
  }
  return g;
};

// ---------------------------------------------------------------- parts bin
models["parts-box"] = () => {
  const g = new THREE.Group();
  const W = 0.34, H = 0.2, D = 0.42;
  const bin = M("bin", "#e2683c", 0.5);
  box(g, W, 0.012, D, bin, [0, 0.006, 0], "binBase");
  box(g, 0.012, H, D, bin, [-W / 2, H / 2, 0], "binSideL");
  box(g, 0.012, H, D, bin, [W / 2, H / 2, 0], "binSideR");
  box(g, W, H, 0.012, bin, [0, H / 2, -D / 2], "binBack");
  box(g, W, H * 0.6, 0.012, bin, [0, H * 0.3, D / 2], "binFront");
  box(g, W * 0.7, 0.07, 0.004, mats.paper, [0, H * 0.32, D / 2 + 0.008], "label");
  return g;
};

// ---------------------------------------------------------------- devices
models["phone"] = () => {
  const g = new THREE.Group();
  rbox(g, 0.078, 0.009, 0.16, 0.004, mats.charcoal, [0, 0.0045, 0], "body");
  rbox(g, 0.071, 0.002, 0.15, 0.0009, mats.glass, [0, 0.009, 0], "screen");
  box(g, 0.012, 0.0015, 0.002, mats.black, [0, 0.0101, -0.0715], "speaker");
  cyl(g, 0.0025, 0.0025, 0.0016, mats.black, [0.012, 0.0101, -0.0715], [0, 0, 0], 12, "frontCamera");
  rbox(g, 0.03, 0.003, 0.03, 0.004, mats.black, [-0.018, -0.0005, -0.055], "camera");
  cyl(g, 0.006, 0.006, 0.004, mats.glass, [-0.024, -0.0015, -0.061], [0, 0, 0], 16, "lens1");
  cyl(g, 0.006, 0.006, 0.004, mats.glass, [-0.012, -0.0015, -0.049], [0, 0, 0], 16, "lens2");
  box(g, 0.002, 0.004, 0.025, mats.steel, [0.0395, 0.0045, -0.03], "buttons");
  return g;
};

models["tablet"] = () => {
  const g = new THREE.Group();
  rbox(g, 0.18, 0.008, 0.25, 0.006, mats.steel, [0, 0.004, 0], "body");
  rbox(g, 0.165, 0.002, 0.232, 0.002, mats.black, [0, 0.0079, 0], "bezel");
  rbox(g, 0.152, 0.0016, 0.214, 0.0008, mats.glass, [0, 0.0089, 0], "screen");
  cyl(g, 0.0022, 0.0022, 0.0014, mats.charcoal, [0, 0.0094, -0.118], [0, 0, 0], 12, "frontCamera");
  box(g, 0.05, 0.0014, 0.012, M("serialPlate", "#9aa1a6", 0.9, 0.3), [0.05, -0.0004, 0.1], "serialPlate");
  return g;
};

models["game-console"] = () => {
  const g = new THREE.Group();
  rbox(g, 0.32, 0.07, 0.26, 0.012, mats.black, [0, 0.035, 0], "body");
  rbox(g, 0.29, 0.012, 0.23, 0.006, mats.cream, [0, 0.068, 0], "topPanel");
  for (let i = 0; i < 9; i++) box(g, 0.004, 0.004, 0.14, mats.charcoal, [-0.12 + i * 0.012, 0.075, -0.02], "vent");
  box(g, 0.13, 0.006, 0.004, mats.charcoal, [0.04, 0.035, 0.131], "discSlot");
  cyl(g, 0.006, 0.006, 0.004, mats.ledRed, [-0.12, 0.035, 0.131], [Math.PI / 2, 0, 0], 16, "led");
  box(g, 0.015, 0.012, 0.004, mats.charcoal, [-0.09, 0.035, 0.131], "usb");
  box(g, 0.015, 0.012, 0.004, mats.charcoal, [-0.07, 0.035, 0.131], "usb2");
  for (const x of [-0.13, 0.13]) for (const z of [-0.1, 0.1]) cyl(g, 0.01, 0.01, 0.006, mats.rubber, [x, -0.002, z], [0, 0, 0], 12);
  return g;
};

models["garden-shears"] = () => {
  const g = new THREE.Group();
  const blade = (flip: number) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.08, 0.012 * flip, 0.16, 0.002 * flip);
    s.lineTo(0.16, -0.003 * flip);
    s.quadraticCurveTo(0.08, -0.004 * flip, 0, -0.016 * flip);
    s.closePath();
    return s;
  };
  flatExtrude(g, blade(1), 0.004, mats.steel, [0.02, 0.004, 0], "bladeA");
  flatExtrude(g, blade(-1), 0.004, mats.steel, [0.02, 0.0, 0], "bladeB");
  cyl(g, 0.009, 0.009, 0.014, mats.brass, [0.02, 0.006, 0], [0, 0, 0], 16, "pivot");
  const h1 = new THREE.Group(); h1.name = "handle";
  cyl(h1, 0.011, 0.012, 0.26, mats.woodLight, [-0.13, 0.008, 0], [0, 0, Math.PI / 2], 14);
  cyl(h1, 0.0125, 0.0125, 0.03, mats.red, [-0.25, 0.008, 0], [0, 0, Math.PI / 2], 14);
  h1.rotation.y = 0.12;
  g.add(h1);
  const h2 = new THREE.Group(); h2.name = "handleB";
  cyl(h2, 0.011, 0.012, 0.26, mats.woodLight, [-0.13, 0.008, 0], [0, 0, Math.PI / 2], 14);
  cyl(h2, 0.0125, 0.0125, 0.03, mats.red, [-0.25, 0.008, 0], [0, 0, Math.PI / 2], 14);
  h2.rotation.y = -0.12;
  g.add(h2);
  return g;
};

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

// ---------------------------------------------------------------- counter props & decor
models["cash-register"] = () => {
  const g = new THREE.Group();
  rbox(g, 0.4, 0.11, 0.38, 0.01, mats.charcoal, [0, 0.055, 0], "base");
  box(g, 0.36, 0.06, 0.012, mats.steelDark, [0, 0.055, 0.19], "drawer");
  box(g, 0.08, 0.012, 0.012, mats.chrome, [0, 0.065, 0.2], "drawerHandle");
  const keypad = new THREE.Group();
  keypad.position.set(0, 0.11, 0.06);
  keypad.rotation.x = 0.25;
  rbox(keypad, 0.34, 0.03, 0.18, 0.008, mats.cream, [0, 0.015, 0], "keypad");
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
    const k = i === 4 ? mats.orange : j === 3 ? mats.green : mats.paper;
    rbox(keypad, 0.04, 0.012, 0.03, 0.004, k, [-0.13 + i * 0.062, 0.034, -0.06 + j * 0.04], "key");
  }
  g.add(keypad);
  box(g, 0.08, 0.16, 0.05, mats.charcoal, [0.08, 0.19, -0.13], "displayPost");
  const disp = new THREE.Group();
  disp.position.set(0.08, 0.29, -0.13);
  disp.rotation.x = -0.2;
  rbox(disp, 0.18, 0.07, 0.04, 0.008, mats.charcoal, [0, 0, 0], "display");
  box(disp, 0.15, 0.04, 0.004, mats.lcd, [0, 0, 0.021], "lcd");
  g.add(disp);
  cyl(g, 0.025, 0.025, 0.06, mats.paper, [-0.12, 0.14, -0.12], [0, 0, Math.PI / 2], 16, "receiptRoll");
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
models["wall-clock"] = () => {
  const g = new THREE.Group();
  // lies against a wall: face points +Z, origin at back centre
  cyl(g, 0.24, 0.24, 0.05, mats.woodDark, [0, 0, 0.025], [Math.PI / 2, 0, 0], 40, "rim");
  cyl(g, 0.215, 0.215, 0.052, mats.cream, [0, 0, 0.026], [Math.PI / 2, 0, 0], 40, "face");
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const len = i % 3 === 0 ? 0.035 : 0.018;
    add(g, new THREE.BoxGeometry(0.008, len, 0.004), mats.charcoal, [Math.sin(a) * 0.18, Math.cos(a) * 0.18, 0.054], [0, 0, -a], "tick");
  }
  const hour = new THREE.Group(); hour.name = "hourHand"; hour.position.z = 0.056;
  box(hour, 0.012, 0.11, 0.003, mats.charcoal, [0, 0.045, 0]);
  g.add(hour);
  const minute = new THREE.Group(); minute.name = "minuteHand"; minute.position.z = 0.06;
  box(minute, 0.008, 0.16, 0.003, mats.charcoal, [0, 0.07, 0]);
  g.add(minute);
  cyl(g, 0.012, 0.012, 0.012, mats.brass, [0, 0, 0.062], [Math.PI / 2, 0, 0], 16, "pin");
  return g;
};
models["pendant-lamp"] = () => {
  const g = new THREE.Group();
  // origin at the ceiling mount; hangs down -Y
  cyl(g, 0.05, 0.05, 0.02, mats.brass, [0, -0.01, 0], [0, 0, 0], 20, "canopy");
  cyl(g, 0.004, 0.004, 0.9, mats.black, [0, -0.47, 0], [0, 0, 0], 6, "cord");
  const shadeGeo = new THREE.CylinderGeometry(0.06, 0.24, 0.2, 32, 1, true);
  const shadeMat = M("enamel", "#2f4a43", 0.45, 0.2, { side: THREE.DoubleSide });
  add(g, shadeGeo, shadeMat, [0, -1.0, 0], [0, 0, 0], "shade");
  cyl(g, 0.06, 0.06, 0.03, mats.brass, [0, -0.89, 0], [0, 0, 0], 20, "socket");
  add(g, new THREE.SphereGeometry(0.05, 16, 12), mats.bulb, [0, -1.03, 0], [0, 0, 0], "bulb");
  return g;
};
models["queue-stanchion"] = () => {
  const g = new THREE.Group();
  cyl(g, 0.15, 0.16, 0.03, mats.black, [0, 0.015, 0], [0, 0, 0], 28, "base");
  cyl(g, 0.025, 0.025, 0.92, mats.brass, [0, 0.49, 0], [0, 0, 0], 16, "post");
  add(g, new THREE.SphereGeometry(0.035, 16, 12), mats.brass, [0, 0.96, 0], [0, 0, 0], "cap");
  return g;
};

// ---------------------------------------------------------------- export
const exporter = new GLTFExporter();
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(models);
for (const name of names) {
  const scene = new THREE.Scene();
  const root = models[name]();
  root.name = name;
  scene.add(root);
  const buf = (await exporter.parseAsync(scene, { binary: true })) as ArrayBuffer;
  writeFileSync(`${OUT}/${name}.glb`, Buffer.from(buf));
  console.log(`${name}.glb  ${(buf.byteLength / 1024).toFixed(1)} KB`);
}
