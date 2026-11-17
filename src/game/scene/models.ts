import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

/** Every model the stand uses. Files live in public/models/<name>.glb. */
export const MODEL_FILES = [
  "stand-shell", "stand-counter", "workbench", "drawer-cabinet", "waste-bin", "pc-desk", "crt-terminal", "oil-lantern",
  "street-lamp", "notepad", "counter-bell", "phone", "pocket-watch", "revolver", "elf-lantern", "dwarf-pickaxe", "warhammer",
  "screwdriver", "wrench", "screw", "bolt", "part-screen", "part-battery", "part-handle", "part-crystal", "part-spring",
  "police-car", "officer-cap", "umbrella", "dwarf-gear", "elf-hood", "entity-hollow", "entity-moth", "entity-smiler", "peeker",
  "barrel", "box", "box-large",
  "customer-female-a", "customer-female-b", "customer-female-c", "customer-female-d", "customer-female-e", "customer-female-f",
  "customer-male-a", "customer-male-b", "customer-male-c", "customer-male-d", "customer-male-e", "customer-male-f",
] as const;
export type ModelName = (typeof MODEL_FILES)[number];

export const modelUrl = (n: string) => `/models/${n}.glb`;

/** How to size a model: scale one bbox axis to `size` metres. Kits are not in metres. */
export interface Fit { axis: "x" | "y" | "z"; size: number }
interface Opts { shadows?: boolean; grade?: boolean }

const converted = new Map<string, THREE.Material>();
/** Lit, and optionally graded down (darker, desaturated) for the dystopian look. */
function fixMat(m: THREE.Material, grade: boolean): THREE.Material {
  const key = m.uuid + (grade ? "g" : "");
  let out = converted.get(key);
  if (out) return out;
  const src = m as THREE.MeshStandardMaterial;
  const std = m instanceof THREE.MeshBasicMaterial || grade
    ? new THREE.MeshStandardMaterial({ color: src.color?.clone(), map: src.map ?? null, roughness: 0.85, metalness: 0, transparent: m.transparent, opacity: m.opacity })
    : m;
  if (grade && (std as THREE.MeshStandardMaterial).color) {
    const c = (std as THREE.MeshStandardMaterial).color;
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s * 0.35, hsl.l * 0.6);
  }
  std.name = m.name;
  converted.set(key, std);
  out = std;
  return out;
}

/** Clone a loaded scene, fix materials/shadows and optionally normalise: centred on XZ, feet at y=0. */
export function prepareModel(src: THREE.Object3D, fit?: Fit, opts: Opts = {}) {
  const inner = skeletonClone(src);
  inner.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = opts.shadows ?? true;
    m.receiveShadow = true;
    m.material = Array.isArray(m.material) ? m.material.map((x) => fixMat(x, !!opts.grade)) : fixMat(m.material, !!opts.grade);
  });
  const outer = new THREE.Group();
  outer.add(inner);
  if (fit) {
    const b = new THREE.Box3().setFromObject(inner);
    const size = b.getSize(new THREE.Vector3());
    inner.scale.multiplyScalar(fit.size / (size[fit.axis] || 1));
    const b2 = new THREE.Box3().setFromObject(inner);
    const c = b2.getCenter(new THREE.Vector3());
    inner.position.x -= c.x;
    inner.position.z -= c.z;
    inner.position.y -= b2.min.y;
  }
  return outer;
}

export function useModel(name: ModelName, fit?: Fit, opts?: Opts) {
  const gltf = useGLTF(modelUrl(name));
  const key = `${fit ? `${fit.axis}${fit.size}` : ""}${opts?.grade ? "g" : ""}${opts?.shadows === false ? "n" : ""}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ({ object: prepareModel(gltf.scene, fit, opts), animations: gltf.animations }), [gltf, key]);
}

export function preloadModels() {
  for (const n of MODEL_FILES) useGLTF.preload(modelUrl(n));
}
