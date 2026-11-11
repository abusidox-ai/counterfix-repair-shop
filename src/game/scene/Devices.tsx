import { useMemo } from "react";
import * as THREE from "three";
import { useGame } from "../store";
import { PART_SPOT, SCREWS, SPOTS, type V3 } from "../sim/layout";
import { PARTS, type DeviceKind, type PartKind } from "../sim/data";
import type { Job } from "../sim/rules";
import { useModel, type Fit, type ModelName } from "./models";
import { crackTexture, screenOnTexture } from "./textures";

const DEVICE_MODEL: Record<DeviceKind, { name: ModelName; fit?: Fit; rot?: V3 }> = {
  phone: { name: "phone" },
  tablet: { name: "tablet" },
  console: { name: "game-console" },
  shears: { name: "garden-shears" },
  laptop: { name: "laptop", fit: { axis: "x", size: 0.36 } },
  chest: { name: "chest", fit: { axis: "y", size: 0.32 } },
  pickaxe: { name: "tool-pickaxe", fit: { axis: "y", size: 0.7 } },
};

let crack: THREE.Texture | null = null;
let screenOn: THREE.Texture | null = null;

/** The customer's device with its current damage state. */
export function DeviceModel({ job }: { job: Job }) {
  const dev = job.customer.device;
  const def = DEVICE_MODEL[dev];
  const { object } = useModel(def.name, def.fit);
  const fault = job.customer.fault;
  useMemo(() => {
    crack ??= crackTexture();
    screenOn ??= screenOnTexture();
    const screen = object.getObjectByName("screen") as THREE.Mesh | undefined;
    if (screen) {
      const broken = fault === "screen" && !job.repaired;
      screen.visible = !(fault === "screen" && job.partOut && !job.repaired);
      screen.material = new THREE.MeshStandardMaterial({
        map: broken ? crack : job.repaired ? screenOn : null,
        color: broken || job.repaired ? "#ffffff" : "#0d1724",
        roughness: 0.1, metalness: 0.1,
        emissive: job.repaired ? "#ffffff" : "#000000",
        emissiveMap: job.repaired ? screenOn : null,
        emissiveIntensity: job.repaired ? 0.6 : 0,
      });
    }
    const cam = object.getObjectByName("camera");
    if (cam) cam.visible = fault !== "camera" || job.repaired;
    const led = object.getObjectByName("led") as THREE.Mesh | undefined;
    if (led) {
      const on = job.repaired;
      led.material = new THREE.MeshStandardMaterial({ color: on ? "#4cff7a" : "#5a1410", emissive: on ? "#2bff5a" : "#200", emissiveIntensity: on ? 2.5 : 0.2 });
    }
    const handle = object.getObjectByName("handle");
    if (handle) handle.visible = !(fault === "handle" && job.partOut && !job.repaired);
  }, [object, fault, job.repaired, job.partOut]);
  // the pickaxe ships standing up; lay it down
  if (dev === "pickaxe") return <primitive object={object} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.056, 0.35]} />;
  return <primitive object={object} />;
}

const PART_MODEL: Record<PartKind, ModelName> = {
  screen: "part-screen", battery: "part-battery", camera: "part-camera", handle: "part-handle", lock: "part-lockpick",
};

function PartPiece({ kind, damaged }: { kind: PartKind; damaged?: boolean }) {
  const { object } = useModel(PART_MODEL[kind]);
  useMemo(() => {
    if (!damaged) return;
    object.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      mat.color.multiplyScalar(0.45);
      mat.roughness = 1;
      m.material = mat;
    });
  }, [object, damaged]);
  return <primitive object={object} />;
}

function Screw({ pos, out, index }: { pos: V3; out: boolean; index: number }) {
  const { object } = useModel("screw");
  if (out) {
    // lying in the parts tray at the left of the desk
    const tray: V3 = [SPOTS.deskDevice[0] - 0.6 + (index - 1) * 0.04, SPOTS.deskDevice[1] + 0.012, SPOTS.deskDevice[2] + 0.01 + index * 0.05];
    return <primitive object={object} position={tray} rotation={[0, index, Math.PI / 2]} scale={1.8} />;
  }
  return <primitive object={object} position={pos} scale={1.8} />;
}

/** Device at the counter or on the repair desk, plus its screws and parts. */
export function WorldDevice() {
  const job = useGame((s) => s.game.job);
  if (!job || (job.where !== "counter" && job.where !== "desk")) return null;
  const onDesk = job.where === "desk";
  const base = onDesk ? SPOTS.deskDevice : SPOTS.counterDevice;
  const dev = job.customer.device;
  const fault = job.customer.fault;
  const allOut = job.screwsOut.every(Boolean);
  const partPos: V3 = PART_SPOT[dev];
  const showOld = onDesk && fault !== "lock" && allOut && !job.partOut && fault !== "screen" && fault !== "camera" && !job.repaired;
  const showNew = onDesk && job.replacement && !job.repaired;
  return (
    <group>
      <group position={base}>
        <DeviceModel job={job} />
        {showOld && (
          <group position={partPos} rotation-y={0.25}>
            <PartPiece kind={fault} damaged />
          </group>
        )}
        {showNew && (
          <group position={[0.22, 0.0, 0.12]} rotation-y={-0.3}>
            <PartPiece kind={PARTS[job.replacement!].kind} />
          </group>
        )}
      </group>
      {onDesk && job.method !== "lockpick" && SCREWS[dev].map((p, i) => (
        <Screw key={i} index={i} out={job.screwsOut[i]} pos={[base[0] + p[0], base[1] + p[1], base[2] + p[2]]} />
      ))}
    </group>
  );
}

/** Screwdriver and wrench lying on the desk until picked up. */
export function DeskTools() {
  const tools = useGame((s) => s.game.tools);
  const sd = useModel("screwdriver").object;
  const wr = useModel("wrench").object;
  return (
    <group>
      {!tools.screwdriver && <primitive object={sd} position={SPOTS.screwdriver} rotation-y={0.4} />}
      {!tools.wrench && <primitive object={wr} position={SPOTS.wrench} rotation-y={-0.3} />}
    </group>
  );
}
