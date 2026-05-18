"use client";

import {
  forwardRef,
  useRef,
  useState,
  useMemo,
  useEffect,
  useCallback,
  useImperativeHandle,
  type Ref,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stats, PerformanceMonitor } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import CityScene from "./CityScene";
import type { CityBuilding } from "@/lib/city";
import type { BuildingColors } from "@/lib/window-atlas";

export type { BuildingColors };

export interface CityCanvasHandle {
  flyTo: (x: number, z: number) => void;
  captureScreenshot: () => string;
}

export const THEME_NAMES = ["Midnight", "Sunset", "Neon", "Emerald"] as const;

interface CityTheme {
  sky: [number, string][];
  fogColor: string;
  fogNear: number;
  fogFar: number;
  ambientColor: string;
  ambientIntensity: number;
  sunColor: string;
  sunIntensity: number;
  sunPos: [number, number, number];
  fillColor: string;
  fillIntensity: number;
  fillPos: [number, number, number];
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  groundColor: string;
  grid1: string;
  grid2: string;
  building: BuildingColors;
}

const THEMES: CityTheme[] = [
  {
    sky: [
      [0, "#000206"],
      [0.15, "#020814"],
      [0.3, "#061428"],
      [0.45, "#0c2040"],
      [0.55, "#102850"],
      [0.65, "#0c2040"],
      [0.8, "#061020"],
      [1, "#020608"],
    ],
    fogColor: "#0a1428",
    fogNear: 400,
    fogFar: 3500,
    ambientColor: "#4060b0",
    ambientIntensity: 0.55,
    sunColor: "#7090d0",
    sunIntensity: 0.75,
    sunPos: [300, 120, -200],
    fillColor: "#304080",
    fillIntensity: 0.3,
    fillPos: [-200, 60, 200],
    hemiSky: "#5080a0",
    hemiGround: "#202830",
    hemiIntensity: 0.5,
    groundColor: "#242c38",
    grid1: "#344050",
    grid2: "#2c3848",
    building: {
      windowLit: ["#a0c0f0", "#80a0e0", "#6080c8", "#c0d8f8", "#e0e8ff"],
      windowOff: "#0c0e18",
      face: "#101828",
      roof: "#2a3858",
      accent: "#6090e0",
    },
  },
  {
    sky: [
      [0, "#0c0614"],
      [0.15, "#1c0e30"],
      [0.28, "#3a1850"],
      [0.38, "#6a3060"],
      [0.46, "#a05068"],
      [0.52, "#d07060"],
      [0.57, "#e89060"],
      [0.62, "#f0b070"],
      [0.68, "#f0c888"],
      [0.75, "#c08060"],
      [0.85, "#603030"],
      [1, "#180c10"],
    ],
    fogColor: "#80405a",
    fogNear: 400,
    fogFar: 3500,
    ambientColor: "#e0a080",
    ambientIntensity: 0.7,
    sunColor: "#f0b070",
    sunIntensity: 1.0,
    sunPos: [400, 120, -300],
    fillColor: "#6050a0",
    fillIntensity: 0.35,
    fillPos: [-200, 80, 200],
    hemiSky: "#d09080",
    hemiGround: "#4a2828",
    hemiIntensity: 0.55,
    groundColor: "#3a3038",
    grid1: "#504048",
    grid2: "#443838",
    building: {
      windowLit: ["#f8d880", "#f0b860", "#e89840", "#d07830", "#f0c060"],
      windowOff: "#1a1018",
      face: "#281828",
      roof: "#604050",
      accent: "#c8e64a",
    },
  },
  {
    sky: [
      [0, "#06001a"],
      [0.15, "#100028"],
      [0.3, "#200440"],
      [0.42, "#380650"],
      [0.52, "#500860"],
      [0.6, "#380648"],
      [0.75, "#180230"],
      [0.9, "#0c0118"],
      [1, "#06000c"],
    ],
    fogColor: "#1a0830",
    fogNear: 400,
    fogFar: 3500,
    ambientColor: "#8040c0",
    ambientIntensity: 0.6,
    sunColor: "#c050e0",
    sunIntensity: 0.85,
    sunPos: [300, 100, -200],
    fillColor: "#00c0d0",
    fillIntensity: 0.4,
    fillPos: [-250, 60, 200],
    hemiSky: "#9040d0",
    hemiGround: "#201028",
    hemiIntensity: 0.5,
    groundColor: "#2c2038",
    grid1: "#3c2c50",
    grid2: "#342440",
    building: {
      windowLit: ["#ff40c0", "#c040ff", "#00e0ff", "#40ff80", "#ff8040"],
      windowOff: "#0a0814",
      face: "#180830",
      roof: "#3c1858",
      accent: "#e040c0",
    },
  },
  {
    sky: [
      [0, "#000804"],
      [0.15, "#001408"],
      [0.3, "#002810"],
      [0.42, "#003c1c"],
      [0.52, "#004828"],
      [0.6, "#003820"],
      [0.75, "#002014"],
      [0.9, "#001008"],
      [1, "#000604"],
    ],
    fogColor: "#0a2014",
    fogNear: 400,
    fogFar: 3500,
    ambientColor: "#40a060",
    ambientIntensity: 0.55,
    sunColor: "#70d090",
    sunIntensity: 0.75,
    sunPos: [300, 100, -250],
    fillColor: "#20a080",
    fillIntensity: 0.35,
    fillPos: [-200, 60, 200],
    hemiSky: "#50b068",
    hemiGround: "#183020",
    hemiIntensity: 0.5,
    groundColor: "#1e3020",
    grid1: "#2c4838",
    grid2: "#243828",
    building: {
      windowLit: ["#0e4429", "#006d32", "#26a641", "#39d353", "#c8e64a"],
      windowOff: "#060e08",
      face: "#0c1810",
      roof: "#1e4028",
      accent: "#f0c060",
    },
  },
];

const ORBIT_TARGET: [number, number, number] = [0, 120, 0];
const FLY_DURATION_MS = 1200;

interface FlyAnimation {
  startTime: number;
  fromCam: THREE.Vector3;
  toCam: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
}

export interface FlyApi {
  flyTo: (x: number, z: number) => void;
}

function SkyDome({ stops }: { stops: [number, string][] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    for (const [stop, color] of stops) g.addColorStop(stop, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
  }, [stops]);

  useEffect(() => {
    return () => {
      mat.map?.dispose();
      mat.dispose();
    };
  }, [mat]);

  const onBeforeRender = useCallback(
    (_renderer: THREE.WebGLRenderer, _scene: THREE.Scene, camera: THREE.Camera) => {
      meshRef.current?.position.copy(camera.position);
    },
    [],
  );

  return (
    <mesh ref={meshRef} material={mat} renderOrder={-1} onBeforeRender={onBeforeRender}>
      <sphereGeometry args={[3500, 32, 48]} />
    </mesh>
  );
}

function Ground({ color, grid1, grid2 }: { color: string; grid1: string; grid2: string }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[20000, 20000]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.15}
          roughness={0.95}
        />
      </mesh>
      <gridHelper args={[4000, 200, grid1, grid2]} position={[0, -0.5, 0]} />
    </group>
  );
}

/** Registers gl.domElement capture on the canvas imperative handle. */
function ScreenshotCapture({
  captureApiRef,
}: {
  captureApiRef: React.MutableRefObject<{ capturePng: () => string } | null>;
}) {
  const { gl } = useThree();

  useEffect(() => {
    captureApiRef.current = {
      capturePng() {
        return gl.domElement.toDataURL("image/png");
      },
    };
    return () => {
      captureApiRef.current = null;
    };
  }, [gl, captureApiRef]);

  return null;
}

function OrbitScene({
  flyApiRef,
  onFlyComplete,
}: {
  flyApiRef: React.MutableRefObject<FlyApi | null>;
  onFlyComplete?: () => void;
}) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  const flyRef = useRef<FlyAnimation | null>(null);
  const onCompleteRef = useRef(onFlyComplete);
  onCompleteRef.current = onFlyComplete;

  useEffect(() => {
    camera.position.set(-800, 700, -1000);
    camera.lookAt(...ORBIT_TARGET);
  }, [camera]);

  useEffect(() => {
    flyApiRef.current = {
      flyTo(x: number, z: number) {
        const controls = controlsRef.current;
        if (!controls) return;

        controls.autoRotate = false;
        flyRef.current = {
          startTime: performance.now(),
          fromCam: camera.position.clone(),
          toCam: new THREE.Vector3(x, 25, z + 30),
          fromTarget: controls.target.clone(),
          toTarget: new THREE.Vector3(x, 0, z),
        };
      },
    };
    return () => {
      flyApiRef.current = null;
    };
  }, [camera, flyApiRef]);

  useFrame(() => {
    const fly = flyRef.current;
    const controls = controlsRef.current;
    if (!fly || !controls) return;

    const elapsed = performance.now() - fly.startTime;
    const t = Math.min(1, elapsed / FLY_DURATION_MS);
    const eased = t * t * (3 - 2 * t);

    camera.position.lerpVectors(fly.fromCam, fly.toCam, eased);
    controls.target.lerpVectors(fly.fromTarget, fly.toTarget, eased);
    controls.update();

    if (t >= 1) {
      flyRef.current = null;
      onCompleteRef.current?.();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={40}
      maxDistance={2500}
      maxPolarAngle={Math.PI / 2.1}
      target={ORBIT_TARGET}
      autoRotate
      autoRotateSpeed={0.15}
    />
  );
}

interface CityCanvasProps {
  buildings: CityBuilding[];
  themeIndex?: number;
  watchedIds?: Set<number>;
  onBuildingClick?: (building: CityBuilding) => void;
  onBuildingHover?: (building: CityBuilding | null) => void;
  onFlyComplete?: () => void;
}

function CityCanvasInner(
  {
    buildings,
    themeIndex = 0,
    watchedIds,
    onBuildingClick,
    onBuildingHover,
    onFlyComplete,
  }: CityCanvasProps,
  ref: Ref<CityCanvasHandle>,
) {
  const t = THEMES[themeIndex] ?? THEMES[0];
  const showPerf =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("perf");
  const [dpr, setDpr] = useState(1);
  const [bloomEnabled, setBloomEnabled] = useState(false);
  const flyApiRef = useRef<FlyApi | null>(null);
  const captureApiRef = useRef<{ capturePng: () => string } | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      flyTo(x: number, z: number) {
        flyApiRef.current?.flyTo(x, z);
      },
      captureScreenshot() {
        return captureApiRef.current?.capturePng() ?? "";
      },
    }),
    [],
  );

  return (
    <Canvas
      camera={{ position: [-400, 450, -600], fov: 55, near: 0.5, far: 15000 }}
      dpr={dpr}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.3,
      }}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
    >
      {showPerf && <Stats />}
      <PerformanceMonitor
        onIncline={() => {
          setDpr(1.25);
          setBloomEnabled(true);
        }}
        onDecline={() => {
          setDpr(0.75);
          setBloomEnabled(false);
        }}
      />
      <fog attach="fog" args={[t.fogColor, t.fogNear, t.fogFar]} />

      <ambientLight intensity={t.ambientIntensity * 3} color={t.ambientColor} />
      <directionalLight position={t.sunPos} intensity={t.sunIntensity * 3.5} color={t.sunColor} />
      <directionalLight position={t.fillPos} intensity={t.fillIntensity * 3} color={t.fillColor} />
      <hemisphereLight args={[t.hemiSky, t.hemiGround, t.hemiIntensity * 3.5]} />

      <SkyDome stops={t.sky} />
      <ScreenshotCapture captureApiRef={captureApiRef} />
      <OrbitScene flyApiRef={flyApiRef} onFlyComplete={onFlyComplete} />
      <Ground color={t.groundColor} grid1={t.grid1} grid2={t.grid2} />

      <CityScene
        buildings={buildings}
        colors={t.building}
        watchedIds={watchedIds}
        onBuildingClick={onBuildingClick}
        onBuildingHover={onBuildingHover}
      />

      {bloomEnabled && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.3} intensity={1.2} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

const CityCanvas = forwardRef(CityCanvasInner);
export default CityCanvas;
