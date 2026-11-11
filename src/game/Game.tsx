import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { memo, Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { Shop } from "./scene/Shop";
import { Customers } from "./scene/Customers";
import { DeskTools, WorldDevice } from "./scene/Devices";
import { Player, useDebugHooks } from "./scene/Player";
import { preloadModels } from "./scene/models";
import { Hud } from "./ui/Hud";
import { unlock, useGame } from "./store";

preloadModels();

/** Flags the wrapper once a frame with real assets has drawn (for scripted checks). */
function ReadySignal() {
  const frames = useRef(0);
  useFrame(({ gl }) => {
    if (++frames.current === 3) (gl.domElement.parentElement?.parentElement as HTMLElement | null)?.setAttribute("data-scene-ready", "1");
  });
  return null;
}

const World = memo(function World() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 70, near: 0.03, far: 80, position: [0, 1.62, -3.6] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
    >
      <color attach="background" args={["#bcd3dc"]} />
      <fog attach="fog" args={["#d9c7a8", 22, 60]} />
      <Environment resolution={128}>
        <Lightformer intensity={1.6} color="#ffe2b8" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer intensity={1.2} color="#cfe6ee" position={[0, 2, 9]} scale={[10, 3, 1]} />
        <Lightformer intensity={0.6} color="#e2683c" position={[-9, 2, 0]} rotation-y={Math.PI / 2} scale={[12, 2, 1]} />
      </Environment>
      <Player />
      <Suspense fallback={null}>
        <Shop />
        <DeskTools />
        <WorldDevice />
        <Customers />
        <ReadySignal />
      </Suspense>
    </Canvas>
  );
});

export function Game() {
  useDebugHooks();
  const dayOver = useGame((s) => s.game.dayOver);
  useEffect(() => { if (dayOver) unlock(); }, [dayOver]);
  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <div className="absolute inset-0">
        <World />
      </div>
      <Hud />
    </div>
  );
}
