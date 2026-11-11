import { useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CUSTOMERS, type CustomerDef } from "../sim/data";
import { COUNTER_SLOT, ENTRY_PATH, EXIT_PATH, OUTSIDE, QUEUE_SLOTS, customerPlace, type CustomerPlace, type V3 } from "../sim/layout";
import { useGame } from "../store";
import { useModel, type ModelName } from "./models";

const WALK_SPEED = 1.5;
const TURN_RATE = 8;

function placeKey(p: CustomerPlace) {
  return p.kind === "queue" ? `queue${p.slot}` : p.kind;
}
function placePos(p: CustomerPlace): V3 {
  if (p.kind === "counter") return COUNTER_SLOT;
  if (p.kind === "queue") return QUEUE_SLOTS[p.slot] ?? OUTSIDE;
  return OUTSIDE;
}

function Customer({ def, index }: { def: CustomerDef; index: number }) {
  const { object, animations } = useModel(def.model as ModelName, { axis: "y", size: 1.45 });
  const root = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, object);
  const state = useRef<{ key: string; path: V3[]; moving: boolean; anim: string } | null>(null);

  useEffect(() => {
    actions["idle"]?.play();
  }, [actions]);

  // give each customer a slight per-person variation
  const scale = useMemo(() => 0.95 + ((index * 37) % 10) / 100, [index]);

  useFrame((_, rawDt) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.05);
    const place = customerPlace(index, useGame.getState().game);
    const key = placeKey(place);
    let s = state.current;
    if (!s) {
      // first frame: snap into place
      const p = place.kind === "gone" ? OUTSIDE : placePos(place);
      g.position.set(...p);
      g.rotation.y = Math.PI;
      s = state.current = { key, path: [], moving: false, anim: "idle" };
    }
    if (key !== s.key) {
      const prev = s.key;
      if (place.kind === "gone") s.path = [...EXIT_PATH];
      else if (place.kind === "outside") s.path = [OUTSIDE];
      else if (prev === "outside") s.path = [...ENTRY_PATH, placePos(place)];
      else s.path = [placePos(place)];
      s.key = key;
    }
    const target = s.path[0];
    let moving = false;
    if (target) {
      const dx = target[0] - g.position.x, dz = target[2] - g.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) s.path.shift();
      else {
        moving = true;
        const step = Math.min(d, WALK_SPEED * dt);
        g.position.x += (dx / d) * step;
        g.position.z += (dz / d) * step;
        turn(g, Math.atan2(dx, dz), dt);
      }
    }
    if (!moving) turn(g, Math.PI, dt); // face the counter
    const atDoorOrOut = g.position.z > 9.4;
    g.visible = !(atDoorOrOut && !moving && (place.kind === "outside" || place.kind === "gone"));
    const want = moving ? "walk" : place.kind === "counter" && useGame.getState().game.job?.accepted ? "idle" : "idle";
    if (want !== s.anim) {
      actions[s.anim]?.fadeOut(0.2);
      actions[want]?.reset().fadeIn(0.2).play();
      s.anim = want;
    }
  });

  return (
    <group ref={root} scale={scale}>
      <primitive object={object} />
    </group>
  );
}

function turn(g: THREE.Object3D, target: number, dt: number) {
  let d = target - g.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  g.rotation.y += d * (1 - Math.exp(-TURN_RATE * dt));
}

export function Customers() {
  return (
    <group>
      {CUSTOMERS.map((c, i) => (
        <Customer key={c.id} def={c} index={i} />
      ))}
    </group>
  );
}
