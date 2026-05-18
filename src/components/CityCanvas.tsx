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
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import CityScene from "./CityScene";
import type { CityBuilding } from "@/lib/city";
import type { BuildingColors } from "@/lib/window-atlas";

export type { BuildingColors };

export interface CityCanvasHandle {
  flyTo: (x: number, z: number) => void;
  captureScreenshot: () => string;
  requestExitFly: () => void;
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
    // Near-black teal sky matching git-city's midnight atmosphere
    sky: [
      [0, "#020d12"],
      [0.15, "#021210"],
      [0.3, "#031a14"],
      [0.45, "#041a14"],
      [0.55, "#041a14"],
      [0.65, "#031a14"],
      [0.8, "#021210"],
      [1, "#020d12"],
    ],
    fogColor: "#041a14",
    fogNear: 80,
    fogFar: 500,
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

// Low target keeps the skyline filling the viewport like git-city
const ORBIT_TARGET: [number, number, number] = [0, 0, 0];
const DEFAULT_ORBIT_CAM = new THREE.Vector3(0, 60, 80);
const DEFAULT_ORBIT_TARGET = new THREE.Vector3(...ORBIT_TARGET);
const FLY_DURATION_MS = 1200;
const RETURN_FROM_FLY_MS = 1000;
const MOUSE_STEER_SENSITIVITY = 0.002;
const PLANE_BASE_SPEED_DEFAULT = 0.8;
const PLANE_BASE_SPEED_MIN = 0.3;
const PLANE_BASE_SPEED_MAX = 3.0;
const PLANE_COLOR = "#a8d8a0";
const PLANE_LOCAL_OFFSET = new THREE.Vector3(0, -0.15, -12);
const PITCH_LIMIT = Math.PI / 2 - 0.12;

const _flyForward = new THREE.Vector3();
const _flyLookTarget = new THREE.Vector3();

function createPlaneGeometry(): THREE.BufferGeometry {
  const fuselage = new THREE.BoxGeometry(0.8, 0.4, 3);
  const wings = new THREE.BoxGeometry(4, 0.2, 1);
  const tail = new THREE.BoxGeometry(1, 0.8, 0.3);
  tail.translate(0, 0.2, -1.35);
  const merged = mergeGeometries([fuselage, wings, tail]);
  fuselage.dispose();
  wings.dispose();
  tail.dispose();
  return merged ?? fuselage;
}

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

/** 200 small white star particles scattered in an upper-hemisphere shell — git-city starfield effect */
function Starfield() {
  const points = useMemo(() => {
    const positions = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      // Shell distribution between radius 400–500 keeps stars
      // behind the sky dome but clearly visible
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random()); // upper hemisphere only
      const r = 400 + Math.random() * 100;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.4,
        sizeAttenuation: false,
        fog: false,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      points.dispose();
      material.dispose();
    };
  }, [points, material]);

  return <points args={[points, material]} renderOrder={-2} />;
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

function PlaneFlight({
  controlsRef,
  exitRequestRef,
  onExitComplete,
  onHud,
}: {
  controlsRef: React.RefObject<React.ComponentRef<typeof OrbitControls> | null>;
  exitRequestRef: React.MutableRefObject<(() => void) | null>;
  onExitComplete: () => void;
  onHud: (speed: number, altitude: number) => void;
}) {
  const { camera } = useThree();
  const planeGeom = useMemo(() => createPlaneGeometry(), []);
  const planeMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PLANE_COLOR }),
    [],
  );
  const baseSpeed = useRef(PLANE_BASE_SPEED_DEFAULT);
  const yaw = useRef(0);
  const pitch = useRef(0);
  const mouseOffset = useRef({ x: 0, y: 0 });
  const keys = useRef<Record<string, boolean>>({});
  const exiting = useRef(false);
  const exitStart = useRef(0);
  const exitFromPos = useRef(new THREE.Vector3());
  const exitFromLook = useRef(new THREE.Vector3());
  const hudTimer = useRef(0);
  const planeMeshRef = useRef<THREE.Mesh | null>(null);

  const beginExit = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    exitStart.current = performance.now();
    exitFromPos.current.copy(camera.position);
    camera.getWorldDirection(_flyForward);
    exitFromLook.current.copy(camera.position).add(_flyForward);
    if (planeMeshRef.current) {
      camera.remove(planeMeshRef.current);
      planeMeshRef.current = null;
    }
  }, [camera]);

  useEffect(() => {
    exitRequestRef.current = beginExit;
    return () => {
      exitRequestRef.current = null;
    };
  }, [beginExit, exitRequestRef]);

  useEffect(() => {
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    yaw.current = euler.y;
    pitch.current = euler.x;
  }, [camera]);

  useEffect(() => {
    const mesh = new THREE.Mesh(planeGeom, planeMat);
    mesh.position.copy(PLANE_LOCAL_OFFSET);
    planeMeshRef.current = mesh;
    camera.add(mesh);
    return () => {
      if (planeMeshRef.current) {
        camera.remove(planeMeshRef.current);
        planeMeshRef.current = null;
      }
      planeGeom.dispose();
      planeMat.dispose();
    };
  }, [camera, planeGeom, planeMat]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (exiting.current) return;
      mouseOffset.current.x = e.clientX - window.innerWidth / 2;
      mouseOffset.current.y = e.clientY - window.innerHeight / 2;
    };
    const onWheel = (e: WheelEvent) => {
      if (exiting.current) return;
      e.preventDefault();
      baseSpeed.current = THREE.MathUtils.clamp(
        baseSpeed.current - e.deltaY * 0.001,
        PLANE_BASE_SPEED_MIN,
        PLANE_BASE_SPEED_MAX,
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === "Escape" || e.code === "KeyR") {
        e.preventDefault();
        beginExit();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [beginExit]);

  useFrame(() => {
    if (exiting.current) {
      const elapsed = performance.now() - exitStart.current;
      const t = Math.min(1, elapsed / RETURN_FROM_FLY_MS);
      const eased = t * t * (3 - 2 * t);

      camera.position.lerpVectors(exitFromPos.current, DEFAULT_ORBIT_CAM, eased);
      _flyLookTarget.lerpVectors(exitFromLook.current, DEFAULT_ORBIT_TARGET, eased);
      camera.lookAt(_flyLookTarget);

      if (t >= 1) {
        camera.position.copy(DEFAULT_ORBIT_CAM);
        camera.lookAt(DEFAULT_ORBIT_TARGET);
        const controls = controlsRef.current;
        if (controls) {
          controls.target.copy(DEFAULT_ORBIT_TARGET);
          controls.update();
        }
        exiting.current = false;
        onExitComplete();
      }
      return;
    }

    yaw.current -= mouseOffset.current.x * MOUSE_STEER_SENSITIVITY;
    pitch.current -= mouseOffset.current.y * MOUSE_STEER_SENSITIVITY;
    pitch.current = THREE.MathUtils.clamp(pitch.current, -PITCH_LIMIT, PITCH_LIMIT);

    camera.rotation.order = "YXZ";
    camera.rotation.x = pitch.current;
    camera.rotation.y = yaw.current;
    camera.rotation.z = 0;

    let speedMult = 1;
    if (keys.current.ShiftLeft || keys.current.ShiftRight) {
      speedMult = 2.5;
    } else if (keys.current.AltLeft || keys.current.AltRight) {
      speedMult = 0.3;
    }

    const speed = baseSpeed.current * speedMult;
    camera.getWorldDirection(_flyForward);
    camera.position.addScaledVector(_flyForward, speed);

    hudTimer.current += 1;
    if (hudTimer.current % 4 === 0) {
      onHud(speed, camera.position.y);
    }
  });

  return null;
}

function SceneControls({
  flyMode,
  flyApiRef,
  exitFlyRef,
  onFlyComplete,
  onExitFlyMode,
  onFlyHud,
}: {
  flyMode: boolean;
  flyApiRef: React.MutableRefObject<FlyApi | null>;
  exitFlyRef: React.MutableRefObject<(() => void) | null>;
  onFlyComplete?: () => void;
  onExitFlyMode?: () => void;
  onFlyHud?: (speed: number, altitude: number) => void;
}) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  const flyRef = useRef<FlyAnimation | null>(null);
  const onCompleteRef = useRef(onFlyComplete);
  onCompleteRef.current = onFlyComplete;

  useEffect(() => {
    camera.position.copy(DEFAULT_ORBIT_CAM);
    camera.lookAt(DEFAULT_ORBIT_TARGET);
  }, [camera]);

  useEffect(() => {
    flyApiRef.current = {
      flyTo(x: number, z: number) {
        if (flyMode) return;
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
  }, [camera, flyApiRef, flyMode]);

  useFrame(() => {
    if (flyMode) return;

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
    <>
      {!flyMode && (
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          minDistance={10}
          maxDistance={300}
          maxPolarAngle={Math.PI / 2.1}
          target={ORBIT_TARGET}
          autoRotate
          autoRotateSpeed={0.15}
        />
      )}
      {flyMode && (
        <PlaneFlight
          controlsRef={controlsRef}
          exitRequestRef={exitFlyRef}
          onExitComplete={() => onExitFlyMode?.()}
          onHud={onFlyHud ?? (() => {})}
        />
      )}
    </>
  );
}

interface CityCanvasProps {
  buildings: CityBuilding[];
  themeIndex?: number;
  watchedIds?: Set<number>;
  flyMode?: boolean;
  onExitFlyMode?: () => void;
  onFlyHud?: (speed: number, altitude: number) => void;
  onBuildingClick?: (building: CityBuilding) => void;
  onBuildingHover?: (building: CityBuilding | null) => void;
  onFlyComplete?: () => void;
}

function CityCanvasInner(
  {
    buildings,
    themeIndex = 0,
    watchedIds,
    flyMode = false,
    onExitFlyMode,
    onFlyHud,
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
  const exitFlyRef = useRef<(() => void) | null>(null);
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
      requestExitFly() {
        exitFlyRef.current?.();
      },
    }),
    [],
  );

  return (
    <Canvas
      camera={{ position: [0, 60, 80], fov: 55, near: 0.5, far: 15000 }}
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
      <Starfield />
      <ScreenshotCapture captureApiRef={captureApiRef} />
      <SceneControls
        flyMode={flyMode}
        flyApiRef={flyApiRef}
        exitFlyRef={exitFlyRef}
        onFlyComplete={onFlyComplete}
        onExitFlyMode={onExitFlyMode}
        onFlyHud={onFlyHud}
      />
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
