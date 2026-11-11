import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

/** Every model the shop uses. Files live in public/models/<name>.glb. */
export const MODEL_FILES = [
  // custom (scripts/make_models.ts) — real-world metres already
  "repair-desk", "front-counter", "parts-shelf", "parts-box", "phone", "tablet", "game-console", "garden-shears",
  "screwdriver", "wrench", "screw", "part-screen", "part-battery", "part-camera", "part-handle", "part-lockpick",
  "cash-register", "counter-bell", "wall-clock", "pendant-lamp", "queue-stanchion",
  // Kenney Furniture Kit (CC0)
  "laptop", "stool-bar", "bookcase-open", "bookcase-open-low", "rug-rectangle", "potted-plant", "plant-small-1",
  "plant-small-2", "cardboard-box-closed", "cardboard-box-open", "lamp-square-table", "radio", "television-vintage",
  "computer-screen", "trashcan", "books", "speaker", "coat-rack-standing", "chair-desk",
  // Kenney Survival Kit (CC0)
  "chest", "tool-pickaxe", "tool-hammer", "box", "box-large", "barrel",
  // Kenney Mini Characters (CC0)
  "customer-female-a", "customer-female-b", "customer-female-c", "customer-female-d", "customer-female-e",
  "customer-male-a", "customer-male-b", "customer-male-c", "customer-male-d", "customer-male-e",
] as const;
export type ModelName = (typeof MODEL_FILES)[number];

export const modelUrl = (n: string) => `/models/${n}.glb`;

/** How to size a model: scale one bbox axis to `size` metres. Kits are not in metres. */
export interface Fit { axis: "x" | "y" | "z"; size: number }

const converted = new Map<string, THREE.Material>();
/** Kenney furniture ships unlit materials; give them light so the shop shading works. */
function lit(m: THREE.Material): THREE.Material {
  if (!(m instanceof THREE.MeshBasicMaterial)) return m;
  let out = converted.get(m.uuid);
  if (!out) {
    out = new THREE.MeshStandardMaterial({ color: m.color, map: m.map, roughness: 0.78, metalness: 0, transparent: m.transparent, opacity: m.opacity });
    out.name = m.name;
    converted.set(m.uuid, out);
  }
  return out;
}

/** Clone a loaded scene, fix materials/shadows and normalise: centred on XZ, feet at y=0. */
export function prepareModel(src: THREE.Object3D, fit?: Fit, opts: { shadows?: boolean } = {}) {
  const inner = skeletonClone(src);
  inner.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = opts.shadows ?? true;
    m.receiveShadow = true;
    m.material = Array.isArray(m.material) ? m.material.map(lit) : lit(m.material);
  });
  const outer = new THREE.Group();
  outer.add(inner);
  if (fit) {
    const b = new THREE.Box3().setFromObject(inner);
    const size = b.getSize(new THREE.Vector3());
    const s = fit.size / (size[fit.axis] || 1);
    inner.scale.multiplyScalar(s);
    const b2 = new THREE.Box3().setFromObject(inner);
    const c = b2.getCenter(new THREE.Vector3());
    inner.position.x -= c.x;
    inner.position.z -= c.z;
    inner.position.y -= b2.min.y;
  }
  return outer;
}

export function useModel(name: ModelName, fit?: Fit, opts?: { shadows?: boolean }) {
  const gltf = useGLTF(modelUrl(name));
  const key = fit ? `${fit.axis}${fit.size}` : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ({ object: prepareModel(gltf.scene, fit, opts), animations: gltf.animations }), [gltf, key]);
}

export function preloadModels() {
  for (const n of MODEL_FILES) useGLTF.preload(modelUrl(n));
}
