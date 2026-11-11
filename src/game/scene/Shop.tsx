import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { COUNTER, DESK, DOOR, PARTS_SHELF, ROOM, ROOM_HEIGHT, SPOTS, type V3 } from "../sim/layout";
import { PART_ORDER, PARTS, type PartKind } from "../sim/data";
import { useModel, type Fit, type ModelName } from "./models";
import * as T from "./textures";

/** Place a model. */
function Prop({ name, fit, pos = [0, 0, 0], rot = 0, shadows = true }: { name: ModelName; fit?: Fit; pos?: V3; rot?: number; shadows?: boolean }) {
  const { object } = useModel(name, fit, { shadows });
  return <primitive object={object} position={pos} rotation-y={rot} />;
}

function Room() {
  const tex = useMemo(() => ({
    floor: T.floorTexture(), wall: T.wallTexture(), wains: T.wainscotTexture(), ceil: T.ceilingTexture(),
  }), []);
  const W = ROOM.maxX - ROOM.minX, D = ROOM.maxZ - ROOM.minZ, H = ROOM_HEIGHT;
  const wallMat = <meshStandardMaterial map={tex.wall} roughness={0.92} />;
  const wainsMat = <meshStandardMaterial map={tex.wains} roughness={0.7} />;
  // south wall pieces: [x0, x1, y0, y1]
  const south: [number, number, number, number][] = [
    [ROOM.minX, -DOOR.width / 2, 0, H], [-DOOR.width / 2, DOOR.width / 2, DOOR.height, H],
    [DOOR.width / 2, 3, 0, H], [3, 9, 0, 0.9], [3, 9, 2.7, H], [9, ROOM.maxX, 0, H],
  ];
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={tex.floor} roughness={0.55} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position-y={H}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={tex.ceil} roughness={0.9} />
      </mesh>
      {/* beams */}
      {[-9, -6, -3, 0, 3, 6, 9].map((x) => (
        <mesh key={x} position={[x, H - 0.15, 0]} castShadow>
          <boxGeometry args={[0.25, 0.3, D]} />
          <meshStandardMaterial color="#4a2e1a" roughness={0.8} />
        </mesh>
      ))}
      {/* north, east, west */}
      {([
        [[0, H / 2, ROOM.minZ - 0.1], [W + 0.4, H, 0.2]],
        [[ROOM.maxX + 0.1, H / 2, 0], [0.2, H, D]],
        [[ROOM.minX - 0.1, H / 2, 0], [0.2, H, D]],
      ] as [V3, V3][]).map(([p, s], i) => (
        <mesh key={i} position={p} receiveShadow castShadow>
          <boxGeometry args={s} />
          {wallMat}
        </mesh>
      ))}
      {/* wainscot bands */}
      {([
        [[0, 0.55, ROOM.minZ + 0.01], [W, 1.1, 0.02]],
        [[ROOM.maxX - 0.01, 0.55, 0], [0.02, 1.1, D]],
        [[ROOM.minX + 0.01, 0.55, 0], [0.02, 1.1, D]],
      ] as [V3, V3][]).map(([p, s], i) => (
        <mesh key={i} position={p} receiveShadow>
          <boxGeometry args={s} />
          {wainsMat}
        </mesh>
      ))}
      {south.map(([x0, x1, y0, y1], i) => (
        <mesh key={i} position={[(x0 + x1) / 2, (y0 + y1) / 2, ROOM.maxZ + 0.1]} castShadow receiveShadow>
          <boxGeometry args={[x1 - x0, y1 - y0, 0.2]} />
          {wallMat}
        </mesh>
      ))}
      {([[ROOM.minX, -DOOR.width / 2], [DOOR.width / 2, 3], [9, ROOM.maxX]] as [number, number][]).map(([x0, x1], i) => (
        <mesh key={i} position={[(x0 + x1) / 2, 0.55, ROOM.maxZ - 0.01]} receiveShadow>
          <boxGeometry args={[x1 - x0, 1.1, 0.02]} />
          {wainsMat}
        </mesh>
      ))}
      {/* door frame */}
      {[-DOOR.width / 2 - 0.06, DOOR.width / 2 + 0.06].map((x) => (
        <mesh key={x} position={[x, DOOR.height / 2, ROOM.maxZ]} castShadow>
          <boxGeometry args={[0.12, DOOR.height, 0.3]} />
          <meshStandardMaterial color="#2a1a10" />
        </mesh>
      ))}
      <mesh position={[0, DOOR.height + 0.06, ROOM.maxZ]}>
        <boxGeometry args={[DOOR.width + 0.24, 0.12, 0.3]} />
        <meshStandardMaterial color="#2a1a10" />
      </mesh>
      {/* open door leaf, swung outwards */}
      <group position={[DOOR.width / 2, 0, ROOM.maxZ + 0.2]} rotation-y={-1.9}>
        <mesh position={[-DOOR.width / 2, DOOR.height / 2 - 0.02, 0]} castShadow>
          <boxGeometry args={[DOOR.width - 0.05, DOOR.height - 0.05, 0.05]} />
          <meshStandardMaterial color="#2f4a43" roughness={0.5} />
        </mesh>
        <mesh position={[-DOOR.width / 2, 1.5, 0.03]}>
          <planeGeometry args={[DOOR.width - 0.4, 1.2]} />
          <meshStandardMaterial color="#9fc2cc" roughness={0.05} metalness={0.4} transparent opacity={0.5} />
        </mesh>
      </group>
      {/* window */}
      <mesh position={[6, 1.8, ROOM.maxZ + 0.1]}>
        <planeGeometry args={[6, 1.8]} />
        <meshStandardMaterial color="#cfe6ee" roughness={0.05} metalness={0.1} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      {[3.05, 5, 7, 8.95].map((x) => (
        <mesh key={x} position={[x, 1.8, ROOM.maxZ + 0.1]} castShadow>
          <boxGeometry args={[0.1, 1.8, 0.16]} />
          <meshStandardMaterial color="#2a1a10" />
        </mesh>
      ))}
      <mesh position={[6, 0.93, ROOM.maxZ - 0.05]} castShadow>
        <boxGeometry args={[6.1, 0.06, 0.35]} />
        <meshStandardMaterial color="#6e4428" />
      </mesh>
    </group>
  );
}

function Outside() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 15]} receiveShadow>
        <planeGeometry args={[60, 12]} />
        <meshStandardMaterial color="#9c968c" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.005, 19]} receiveShadow>
        <planeGeometry args={[60, 6]} />
        <meshStandardMaterial color="#3d3b39" roughness={0.9} />
      </mesh>
      {[-14, -6, 2, 10, 18].map((x, i) => (
        <group key={x} position={[x, 0, 26]}>
          <mesh position={[0, 4, 0]} receiveShadow>
            <boxGeometry args={[7.6, 8, 1]} />
            <meshStandardMaterial color={["#b5764f", "#c9b48c", "#8b9d8a", "#d0a46b", "#a86a55"][i] ?? "#b5764f"} roughness={0.9} />
          </mesh>
          {[-2, 0, 2].map((wx) => [2.2, 5.2].map((wy) => (
            <mesh key={`${wx}${wy}`} position={[wx, wy, -0.51]}>
              <planeGeometry args={[1.1, 1.5]} />
              <meshStandardMaterial color="#334d57" roughness={0.2} metalness={0.3} />
            </mesh>
          )))}
        </group>
      ))}
    </group>
  );
}

function Counter() {
  return (
    <group>
      <Prop name="front-counter" pos={[COUNTER.x, 0, COUNTER.z]} />
      <Prop name="cash-register" pos={SPOTS.register} rot={Math.PI} />
      <Prop name="counter-bell" pos={SPOTS.bell} />
      <Prop name="plant-small-2" fit={{ axis: "y", size: 0.32 }} pos={[-2.2, COUNTER.top, -1.95]} />
      {/* paperwork */}
      <mesh position={[-1.6, COUNTER.top + 0.004, -2.0]} rotation-y={0.2} receiveShadow>
        <boxGeometry args={[0.22, 0.008, 0.3]} />
        <meshStandardMaterial color="#f3ecdc" roughness={0.9} />
      </mesh>
      <mesh position={[-1.55, COUNTER.top + 0.01, -1.98]} rotation-y={-0.15} receiveShadow>
        <boxGeometry args={[0.2, 0.004, 0.28]} />
        <meshStandardMaterial color="#e9dfc8" roughness={0.9} />
      </mesh>
      {/* queue rails */}
      {[-0.55, -1.95].map((x) => (
        <group key={x}>
          {[0, 1.65, 3.3, 4.7].map((z) => (
            <Prop key={z} name="queue-stanchion" pos={[x, 0, z - 0.1]} />
          ))}
          {([[0, 1.65], [1.65, 3.3], [3.3, 4.7]] as [number, number][]).map(([a, b]) => (
            <mesh key={a} position={[x, 0.88, (a + b) / 2 - 0.1]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.018, 0.018, b - a, 8]} />
              <meshStandardMaterial color="#8c2f24" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
      <Prop name="rug-rectangle" fit={{ axis: "x", size: 5.2 }} pos={[-0.4, 0.002, 3.0]} rot={Math.PI / 2} shadows={false} />
    </group>
  );
}

function RepairDesk() {
  return (
    <group>
      <Prop name="repair-desk" pos={[DESK.x, 0, DESK.z]} />
      <Prop name="lamp-square-table" fit={{ axis: "y", size: 0.5 }} pos={[DESK.x + 0.82, DESK.top, DESK.z - 0.22]} rot={-0.4} />
      <Prop name="stool-bar" fit={{ axis: "y", size: 0.75 }} pos={SPOTS.stool} />
      <Prop name="trashcan" fit={{ axis: "y", size: 0.6 }} pos={[DESK.x - 1.35, 0, DESK.z + 0.2]} />
      <Prop name="computer-screen" fit={{ axis: "y", size: 0.42 }} pos={[DESK.x + 0.15, DESK.top, DESK.z - 0.25]} />
    </group>
  );
}

const BIN_COLOR: Record<PartKind, string> = {
  screen: "#e2683c", battery: "#2f5d8a", camera: "#3c6a61", handle: "#b97d47", lock: "#3a3f43",
};
const PART_MODEL: Record<PartKind, ModelName> = {
  screen: "part-screen", battery: "part-battery", camera: "part-camera", handle: "part-handle", lock: "part-lockpick",
};

function PartBin({ kind, label, pos }: { kind: PartKind; label: string; pos: V3 }) {
  const { object } = useModel("parts-box");
  const part = useModel(PART_MODEL[kind]).object;
  const labelTex = useMemo(() => T.labelTexture(label, BIN_COLOR[kind]), [label, kind]);
  useMemo(() => {
    object.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && (m.material as THREE.Material).name === "bin") {
        const mat = (m.material as THREE.MeshStandardMaterial).clone();
        mat.color.set(BIN_COLOR[kind]);
        m.material = mat;
      }
    });
  }, [object, kind]);
  const s = kind === "handle" ? 0.55 : kind === "lock" ? 2 : 1.6;
  return (
    <group position={pos}>
      <primitive object={object} />
      <primitive object={part} position={[0, 0.03, -0.05]} rotation={[-0.5, 0, 0]} scale={s} />
      <mesh position={[0, 0.064, 0.219]}>
        <planeGeometry args={[0.235, 0.068]} />
        <meshStandardMaterial map={labelTex} roughness={0.9} />
      </mesh>
    </group>
  );
}

function PartsShelves() {
  const shelfY = (i: number) => 0.12 + i * 0.5 + 0.015;
  return (
    <group>
      <group position={[PARTS_SHELF.x, 0, PARTS_SHELF.z]} rotation-y={-Math.PI / 2}>
        <Prop name="parts-shelf" />
        {PART_ORDER.map((sku, i) => {
          const p = PARTS[sku];
          const row = 1 + Math.floor(i / 3), col = i % 3;
          const label = p.name.replace("Long-life ", "LL ").replace("module", "").replace("Reinforced", "Reinf.").toUpperCase();
          return <PartBin key={sku} kind={p.kind} label={label.trim()} pos={[-0.75 + col * 0.75, shelfY(row), 0.02]} />;
        })}
        <Prop name="cardboard-box-closed" fit={{ axis: "y", size: 0.4 }} pos={[-0.7, shelfY(0), 0]} />
        <Prop name="cardboard-box-open" fit={{ axis: "y", size: 0.38 }} pos={[0.3, shelfY(0), 0]} rot={0.3} />
        <Prop name="box" fit={{ axis: "y", size: 0.4 }} pos={[-0.5, shelfY(4), 0]} />
        <Prop name="radio" fit={{ axis: "y", size: 0.25 }} pos={[0.5, shelfY(4), 0]} />
      </group>
      <group position={[10.7, 0, -0.8]} rotation-y={-Math.PI / 2}>
        <Prop name="parts-shelf" />
        <Prop name="television-vintage" fit={{ axis: "y", size: 0.42 }} pos={[-0.6, shelfY(2), 0]} />
        <Prop name="speaker" fit={{ axis: "y", size: 0.45 }} pos={[0.6, shelfY(2), 0]} />
        <Prop name="cardboard-box-closed" fit={{ axis: "y", size: 0.42 }} pos={[0, shelfY(0), 0]} />
        <Prop name="cardboard-box-closed" fit={{ axis: "y", size: 0.36 }} pos={[0.7, shelfY(1), 0]} rot={0.4} />
        <Prop name="books" fit={{ axis: "y", size: 0.22 }} pos={[-0.5, shelfY(3), 0]} />
        <Prop name="laptop" fit={{ axis: "x", size: 0.36 }} pos={[0.4, shelfY(3), 0]} />
        <Prop name="box" fit={{ axis: "y", size: 0.36 }} pos={[-0.3, shelfY(1), 0]} />
      </group>
      {/* label board above */}
      <mesh position={[ROOM.maxX - 0.02, 2.65, PARTS_SHELF.z]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[1.6, 0.4]} />
        <meshStandardMaterial map={useMemo(() => T.labelTexture("PARTS", "#e2683c"), [])} roughness={0.9} />
      </mesh>
    </group>
  );
}

function StockShelves() {
  return (
    <group>
      {[-4.5, -1.5, 1.5].map((z, i) => (
        <group key={z} position={[-10.6, 0, z]} rotation-y={Math.PI / 2}>
          <Prop name="bookcase-open" fit={{ axis: "y", size: 2.1 }} />
          <Prop name={(["radio", "books", "television-vintage"] as const)[i] ?? "books"} fit={{ axis: "y", size: 0.3 }} pos={[0, 2.1, 0]} />
        </group>
      ))}
      {[-6.5, -5.5].map((x) => <Prop key={x} name="bookcase-open-low" fit={{ axis: "y", size: 0.95 }} pos={[x, 0, 8.6]} rot={Math.PI} />)}
      <Prop name="plant-small-1" fit={{ axis: "y", size: 0.3 }} pos={[-6.5, 0.95, 8.6]} />
      <Prop name="books" fit={{ axis: "y", size: 0.22 }} pos={[-5.5, 0.95, 8.6]} />
      {[6, 7].map((x) => <Prop key={x} name="bookcase-open" fit={{ axis: "y", size: 2.1 }} pos={[x, 0, -8.6]} />)}
      {[-2, -1].map((x) => <Prop key={x} name="bookcase-open" fit={{ axis: "y", size: 2.1 }} pos={[x, 0, -8.6]} />)}
      <Prop name="box-large" fit={{ axis: "y", size: 0.6 }} pos={[3.0, 0, 8.3]} rot={0.2} />
      <Prop name="box" fit={{ axis: "y", size: 0.5 }} pos={[3.75, 0, 8.4]} rot={-0.3} />
      <Prop name="box" fit={{ axis: "y", size: 0.4 }} pos={[3.2, 0.6, 8.3]} rot={0.5} />
      <Prop name="barrel" fit={{ axis: "y", size: 0.85 }} pos={[-3.2, 0, 8.4]} />
      <Prop name="coat-rack-standing" fit={{ axis: "y", size: 1.8 }} pos={[-2.2, 0, 8.4]} />
      {([[10.3, 8.3], [-10.3, 8.3], [10.3, -8.3], [-10.3, -8.3]] as const).map(([x, z]) => (
        <Prop key={`${x}${z}`} name="potted-plant" fit={{ axis: "y", size: 1.5 }} pos={[x, 0, z]} />
      ))}
      <Prop name="chair-desk" fit={{ axis: "y", size: 1.0 }} pos={[-8.5, 0, 7.6]} rot={2.6} />
    </group>
  );
}

function WallDecor() {
  const sign = useMemo(() => T.signTexture(), []);
  const posters = useMemo(() => [
    T.posterTexture("COUNTER\nFIX", "EST. DAY ONE\nWE FIX THINGS", "#e2683c", "#f7f3ea"),
    T.posterTexture("NO\nFIX,\nNO FEE", "ASK AT THE\nCOUNTER", "#2f4a43", "#f2e6cf"),
    T.posterTexture("STOLEN\nGOODS?", "WE CHECK.\nWE REPORT.", "#f2e6cf", "#2a2522"),
  ], []);
  const clock = useModel("wall-clock").object;
  const hands = useMemo(() => ({ h: clock.getObjectByName("hourHand"), m: clock.getObjectByName("minuteHand") }), [clock]);
  const t = useRef(9 * 60);
  useFrame((_, dt) => {
    t.current += Math.min(dt, 0.05) * 2; // shop minutes
    if (hands.m) hands.m.rotation.z = -(t.current / 60) * Math.PI * 2;
    if (hands.h) hands.h.rotation.z = -(t.current / 720) * Math.PI * 2;
  });
  return (
    <group>
      <mesh position={[0, 3.2, ROOM.minZ + 0.02]}>
        <planeGeometry args={[4, 1]} />
        <meshStandardMaterial map={sign} roughness={0.6} />
      </mesh>
      {posters.map((p, i) => (
        <mesh key={i} position={[[-6, -4.2, 3.5][i] ?? 0, 1.95, ROOM.minZ + 0.02]}>
          <planeGeometry args={[0.8, 1.12]} />
          <meshStandardMaterial map={p} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[ROOM.minX + 0.02, 1.95, 5.5]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[0.8, 1.12]} />
        <meshStandardMaterial map={posters[2] ?? null} roughness={0.85} />
      </mesh>
      <primitive object={clock} position={[2.6, 3.0, ROOM.minZ]} />
    </group>
  );
}

export const PENDANTS: V3[] = [[-1.6, 0, COUNTER.z], [1.6, 0, COUNTER.z], [DESK.x, 0, DESK.z + 0.3], [0, 0, 3.5], [9.6, 0, -2.6], [-8, 0, 0]];

function Lights() {
  return (
    <group>
      <hemisphereLight args={["#fff0d8", "#5b4434", 0.85]} />
      <directionalLight
        position={[9, 11, 22]} intensity={2.4} color="#fff1d6" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03}
        shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={14} shadow-camera-bottom={-14}
        shadow-camera-near={1} shadow-camera-far={60}
      />
      {PENDANTS.map((p, i) => (
        <group key={i}>
          <Prop name="pendant-lamp" pos={[p[0], ROOM_HEIGHT - 0.3, p[2]]} shadows={false} />
          <pointLight position={[p[0], ROOM_HEIGHT - 1.45, p[2]]} intensity={14} distance={11} decay={1.6} color="#ffc98a" />
        </group>
      ))}
    </group>
  );
}

export function Shop() {
  return (
    <group>
      <Lights />
      <Room />
      <Outside />
      <Counter />
      <RepairDesk />
      <PartsShelves />
      <StockShelves />
      <WallDecor />
    </group>
  );
}
