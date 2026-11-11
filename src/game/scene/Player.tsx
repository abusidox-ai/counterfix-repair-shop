import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { sfx } from "../audio";
import { COLLIDERS, PLAYER_START, ROOM, targets, type Target } from "../sim/layout";
import { EYE_HEIGHT, PLAYER_RADIUS, SPRINT_SPEED, WALK_SPEED, collide, keysToAxes, moveVector, raySphere } from "../sim/movement";
import * as R from "../sim/rules";
import { toolFor } from "../sim/data";
import { openPanel, setLockElement, useGame } from "../store";
import { DeviceModel } from "./Devices";
import { useModel } from "./models";

const REACH = 2.6;
const LOOK_SENS = 0.0022;
const DIR = new THREE.Vector3();

/** Player pose lives outside React (per-frame state). */
export const pose = { x: PLAYER_START.x, z: PLAYER_START.z, yaw: PLAYER_START.yaw, pitch: -0.08 };
export function resetPose() {
  Object.assign(pose, { x: PLAYER_START.x, z: PLAYER_START.z, yaw: PLAYER_START.yaw, pitch: -0.08 });
}

/** Run the action behind the target the player is looking at. */
function interact(t: Target) {
  const g = useGame.getState();
  const act = g.act;
  const id = t.id;
  if (id === "talk") return openPanel("dialogue");
  if (id === "shelf") return openPanel("shelf");
  if (id === "choose") return openPanel("choose");
  if (id === "bell") return sfx.bell();
  if (id === "pickup") { if (act(R.pickUp)) sfx.pop(); return; }
  if (id === "put-counter") { if (act(R.putOnCounter)) sfx.pop(); return; }
  if (id === "place-desk") { if (act(R.placeOnDesk)) sfx.pop(); return; }
  if (id === "return") { if (act(R.returnDevice)) sfx.register(); return; }
  if (id === "grab-screwdriver") { if (act((s) => R.grabTool(s, "screwdriver"))) sfx.click(); return; }
  if (id === "grab-wrench") { if (act((s) => R.grabTool(s, "wrench"))) sfx.click(); return; }
  if (id === "pull") { if (act(R.pullPart)) sfx.pop(); return; }
  if (id === "fit") { if (act(R.fitPart)) sfx.fit(); return; }
  if (id === "lockpick") { if (act(R.pickLock)) sfx.fit(); return; }
  if (id.startsWith("screw-")) {
    const job = g.game.job;
    if (act((s) => R.removeScrew(s, Number(id.slice(6))))) {
      if (job && toolFor(job.customer.device) === "wrench") sfx.ratchet(); else sfx.screw();
    }
  }
}

function Viewmodel() {
  const equipped = useGame((s) => s.game.equipped);
  const job = useGame((s) => s.game.job);
  const sd = useModel("screwdriver", undefined, { shadows: false }).object;
  const wr = useModel("wrench", undefined, { shadows: false }).object;
  const carrying = job?.where === "hands";
  const bob = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (bob.current) bob.current.position.y = Math.sin(clock.elapsedTime * 2) * 0.004;
  });
  const big = job && (job.customer.device === "chest" || job.customer.device === "pickaxe" || job.customer.device === "console" || job.customer.device === "laptop");
  return (
    <group ref={bob}>
      {carrying && job && (
        <group position={[0, big ? -0.42 : -0.3, big ? -0.75 : -0.5]} rotation={[0.55, 0, 0]} scale={big ? 0.9 : 1.4}>
          <DeviceModel job={job} />
        </group>
      )}
      {!carrying && equipped === "screwdriver" && (
        <primitive object={sd} position={[0.26, -0.22, -0.42]} rotation={[0.2, 1.9, 0.5]} scale={1.4} />
      )}
      {!carrying && equipped === "wrench" && (
        <primitive object={wr} position={[0.26, -0.22, -0.42]} rotation={[0.3, 1.8, 0.7]} scale={1.4} />
      )}
    </group>
  );
}

export function Player() {
  const { camera, gl, scene } = useThree();
  const held = useRef(new Set<string>());
  const current = useRef<Target | null>(null);

  useEffect(() => {
    scene.add(camera); // so the viewmodel (a camera child) renders
    camera.rotation.order = "YXZ";
    const el = gl.domElement;
    setLockElement(el);
    const onLock = () => useGame.setState({ locked: document.pointerLockElement === el });
    const onMouse = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return;
      pose.yaw -= e.movementX * LOOK_SENS;
      pose.pitch = Math.max(-1.45, Math.min(1.45, pose.pitch - e.movementY * LOOK_SENS));
    };
    const onDown = (e: KeyboardEvent) => {
      const st = useGame.getState();
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      if (st.panel || !st.started) return;
      held.current.add(e.code);
      if (e.repeat) return;
      if (e.code === "KeyE" && current.current) interact(current.current);
      if (e.code === "Digit1") st.equip("screwdriver");
      if (e.code === "Digit2") st.equip("wrench");
      if (e.code === "Digit3") st.equip("hands");
      if (e.code === "KeyL") openPanel("log");
    };
    const onUp = (e: KeyboardEvent) => held.current.delete(e.code);
    const onBlur = () => held.current.clear();
    const onClick = () => {
      const st = useGame.getState();
      if (st.started && !st.panel && document.pointerLockElement !== el) el.requestPointerLock();
    };
    document.addEventListener("pointerlockchange", onLock);
    document.addEventListener("mousemove", onMouse);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    el.addEventListener("click", onClick);
    return () => {
      scene.remove(camera);
      setLockElement(null);
      document.removeEventListener("pointerlockchange", onLock);
      document.removeEventListener("mousemove", onMouse);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      el.removeEventListener("click", onClick);
    };
  }, [camera, gl, scene]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = useGame.getState();
    if (st.panel) held.current.clear();
    // movement — camera-relative (see sim/movement.ts tests)
    const { fwd, strafe } = keysToAxes(held.current);
    if (fwd || strafe) {
      const m = moveVector(pose.yaw, fwd, strafe);
      const speed = held.current.has("ShiftLeft") || held.current.has("ShiftRight") ? SPRINT_SPEED : WALK_SPEED;
      const p = collide({ x: pose.x + m.x * speed * dt, z: pose.z + m.z * speed * dt }, PLAYER_RADIUS, COLLIDERS, ROOM);
      pose.x = p.x;
      pose.z = p.z;
    }
    camera.position.set(pose.x, EYE_HEIGHT, pose.z);
    camera.rotation.set(pose.pitch, pose.yaw, 0);
    // look-at target
    camera.getWorldDirection(DIR);
    const o: [number, number, number] = [camera.position.x, camera.position.y, camera.position.z];
    const d: [number, number, number] = [DIR.x, DIR.y, DIR.z];
    let best: Target | null = null;
    let bestT = REACH;
    for (const t of targets(st.game)) {
      const hit = raySphere(o, d, t.pos, t.radius);
      // prefer small, precise targets (screws) over big ones when both are hit
      if (hit !== null && hit - t.radius * 0.5 < bestT) { best = t; bestT = hit - t.radius * 0.5; }
    }
    current.current = best;
    const label = best?.label ?? null;
    if (label !== st.prompt) useGame.setState({ prompt: label });
  });

  return createPortal(<Viewmodel />, camera);
}

/** Dev-only hooks for scripted checks. */
export function useDebugHooks() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __game: unknown }).__game = {
      get state() { return useGame.getState().game; },
      act: (name: keyof typeof R, ...args: unknown[]) =>
        useGame.getState().act((s) => (R[name] as (...a: unknown[]) => R.Result)(s, ...args)),
      store: useGame,
      pose,
      /** Stand somewhere and look at a point: teleport(x, z, lookX, lookY, lookZ). */
      teleport: (x: number, z: number, lx: number, ly: number, lz: number) => {
        pose.x = x; pose.z = z;
        const dx = lx - x, dy = ly - EYE_HEIGHT, dz = lz - z;
        pose.yaw = Math.atan2(-dx, -dz);
        pose.pitch = Math.atan2(dy, Math.hypot(dx, dz));
      },
      press: (code: string) => window.dispatchEvent(new KeyboardEvent("keydown", { code })),
      release: (code: string) => window.dispatchEvent(new KeyboardEvent("keyup", { code })),
      get prompt() { return useGame.getState().prompt; },
    };
  }, []);
}
