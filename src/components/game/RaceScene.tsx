import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Sky, Stars, useGLTF } from "@react-three/drei";
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Noise,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import type { ArduinoInput } from "@/lib/arduino";
import { emptyArduinoInput } from "@/lib/arduino";
import {
  BASE_TUNE,
  loadBestScore,
  saveBestScore,
  type Ambience,
  type CarCustomization,
  type CarTune,
  type Model3D,
  type RaceTelemetry,
} from "@/lib/garage";
import { buildProceduralTrack } from "@/lib/procedural-tracks";
import { applyPaint } from "@/lib/car-paint";
import { setupWheels, updateWheels } from "@/lib/wheels";
import { CarAudio } from "@/lib/car-audio";
import { SkidMarks, SmokeSystem, SparkSystem } from "@/lib/drift-fx";

export type CameraMode = "chase" | "close" | "cinematic" | "cockpit" | "hood" | "top";

export const CAMERA_MODES: CameraMode[] = ["chase", "close", "cinematic", "cockpit", "hood", "top"];

export const CAMERA_LABELS: Record<CameraMode, string> = {
  chase: "Perseguição",
  close: "Colada",
  cinematic: "Cinema",
  cockpit: "Cockpit",
  hood: "Capô",
  top: "Aérea",
};

type Fx = { smoke: SmokeSystem; skid: SkidMarks; sparks: SparkSystem };


type AmbiencePreset = {
  background: string;
  fog: [string, number, number];
  hemi: { intensity: number; sky: string; ground: string };
  ambient: number;
  sun: { position: [number, number, number]; intensity: number; color: string };
  rim: { position: [number, number, number]; intensity: number; color: string };
  sky?: { sunPosition: [number, number, number]; turbidity: number; rayleigh: number };
  stars?: boolean;
  headlights: boolean;
  bloom: number;
};

const AMBIENCE: Record<Ambience, AmbiencePreset> = {
  "night-neon": {
    background: "#070b16",
    fog: ["#070b16", 90, 480],
    hemi: { intensity: 0.45, sky: "#7f9ad6", ground: "#0e1220" },
    ambient: 0.14,
    sun: { position: [80, 140, 60], intensity: 0.45, color: "#b9caea" },
    rim: { position: [-70, 60, -90], intensity: 0.45, color: "#ff5ea8" },
    stars: true,
    headlights: true,
    bloom: 0.32,
  },
  "dusk-mountain": {
    background: "#1b2436",
    fog: ["#26314a", 120, 900],
    hemi: { intensity: 0.6, sky: "#e8bb95", ground: "#1a1f2d" },
    ambient: 0.16,
    sun: { position: [-160, 60, 120], intensity: 1.3, color: "#f0a068" },
    rim: { position: [120, 40, -140], intensity: 0.3, color: "#6f8cff" },
    sky: { sunPosition: [-0.7, 0.06, 0.4], turbidity: 8, rayleigh: 3.2 },
    headlights: true,
    bloom: 0.22,
  },
  "harbor-night": {
    background: "#05080f",
    fog: ["#070c15", 70, 420],
    hemi: { intensity: 0.32, sky: "#6d89dd", ground: "#080c18" },
    ambient: 0.1,
    sun: { position: [60, 120, -40], intensity: 0.3, color: "#93aee6" },
    rim: { position: [-90, 50, 80], intensity: 0.5, color: "#ffca7a" },
    stars: true,
    headlights: true,
    bloom: 0.4,
  },
  stadium: {
    background: "#080a12",
    fog: ["#0a0e1a", 140, 700],
    hemi: { intensity: 0.5, sky: "#c3d3ea", ground: "#101623" },
    ambient: 0.18,
    sun: { position: [0, 200, 0], intensity: 1.2, color: "#eef5ff" },
    rim: { position: [-140, 80, -60], intensity: 0.4, color: "#7ce9ff" },
    stars: true,
    headlights: false,
    bloom: 0.35,
  },
  "canyon-dawn": {
    background: "#2a2230",
    fog: ["#4a3a3a", 140, 1000],
    hemi: { intensity: 0.7, sky: "#ffc79a", ground: "#3a2a24" },
    ambient: 0.2,
    sun: { position: [180, 70, -140], intensity: 1.5, color: "#ffb478" },
    rim: { position: [-160, 50, 120], intensity: 0.35, color: "#8fa7ff" },
    sky: { sunPosition: [0.8, 0.1, -0.5], turbidity: 6, rayleigh: 2.4 },
    headlights: false,
    bloom: 0.24,
  },
  "snow-night": {
    background: "#0c111c",
    fog: ["#141c2c", 60, 420],
    hemi: { intensity: 0.55, sky: "#b9cbe8", ground: "#2a3346" },
    ambient: 0.16,
    sun: { position: [-90, 120, 80], intensity: 0.5, color: "#cddcf5" },
    rim: { position: [110, 50, -90], intensity: 0.3, color: "#7ce9ff" },
    stars: true,
    headlights: true,
    bloom: 0.3,
  },
};


type Controls = {
  throttle: boolean;
  reverse: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
};

function useKeyboard() {
  const keys = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      keys.current[event.code] = true;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
      }
    };
    const up = (event: KeyboardEvent) => {
      keys.current[event.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  return keys;
}

function prepareTrack(scene: THREE.Object3D) {
  const clone = scene.clone(true);
  const group = new THREE.Group();
  group.add(clone);
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.receiveShadow = true;
      const material = mesh.material as THREE.Material & { side?: THREE.Side };
      if (material) material.side = THREE.DoubleSide;
    }
  });
  group.updateMatrixWorld(true);
  return group;
}

function normalizeCar(scene: THREE.Object3D, targetLength: number) {
  const clone = scene.clone(true);
  const box = new THREE.Box3().setFromObject(clone);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const longest = Math.max(size.x, size.z) || 1;
  const scale = targetLength / longest;
  clone.position.set(-center.x, -box.min.y, -center.z);
  clone.rotation.y = size.x > size.z ? Math.PI / 2 : Math.PI;
  const group = new THREE.Group();
  group.add(clone);
  group.scale.setScalar(scale);
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) mesh.castShadow = true;
  });
  return group;
}

/** Vertical raycast: highest surface point under (x, z). */
function sampleGround(
  raycaster: THREE.Raycaster,
  target: THREE.Object3D,
  x: number,
  z: number,
  fromY: number,
  reach = 4000,
  ceilingY?: number,
) {
  raycaster.set(new THREE.Vector3(x, fromY, z), new THREE.Vector3(0, -1, 0));
  raycaster.far = reach;
  const hits = raycaster.intersectObject(target, true);
  if (!hits.length) return null;
  // Inside a tunnel the first hit from above is the ROOF, which used to teleport
  // the car (and the camera) on top of the map. Keep only walkable surfaces that
  // are at or below the allowed step height.
  for (const hit of hits) {
    const n = hit.face?.normal
      ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
      : UP.clone();
    if (Math.abs(n.y) < 0.35) continue; // vertical wall, not a floor
    if (ceilingY !== undefined && hit.point.y > ceilingY) continue;
    return hit;
  }
  return ceilingY === undefined ? hits[0]! : null;
}


/** Finds the first drivable surface near the centre of a track. */
function computeSpawn(group: THREE.Group) {
  const box = new THREE.Box3().setFromObject(group);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const raycaster = new THREE.Raycaster();
  const spawn = new THREE.Vector3(center.x, box.max.y + 5, center.z);

  const radiusStep = Math.max(box.getSize(new THREE.Vector3()).length() / 90, 1);
  let found: THREE.Intersection | null = null;
  outer: for (let ring = 0; ring < 60; ring++) {
    const radius = ring * radiusStep;
    const samples = ring === 0 ? 1 : Math.min(8 + ring * 2, 48);
    for (let i = 0; i < samples; i++) {
      const angle = (i / samples) * Math.PI * 2;
      const x = center.x + Math.cos(angle) * radius;
      const z = center.z + Math.sin(angle) * radius;
      const hit = sampleGround(raycaster, group, x, z, box.max.y + 50);
      if (hit) {
        found = hit;
        spawn.set(x, hit.point.y, z);
        break outer;
      }
    }
  }
  if (!found) spawn.set(center.x, box.min.y, center.z);
  return spawn;
}

type TrackReady = (group: THREE.Group, spawn: THREE.Vector3) => void;

function GltfTrack({ url, onReady }: { url: string; onReady: TrackReady }) {
  const { scene } = useGLTF(url);
  const group = useMemo(() => prepareTrack(scene), [scene]);

  useEffect(() => {
    onReady(group, computeSpawn(group));
  }, [group, onReady]);

  return <primitive object={group} />;
}

function ProceduralTrack({
  track,
  onReady,
}: {
  track: Model3D;
  onReady: TrackReady;
}) {
  const group = useMemo(
    () => buildProceduralTrack(track.proceduralId ?? "neon-grid"),
    [track.proceduralId],
  );

  useEffect(() => {
    group.updateMatrixWorld(true);
    onReady(group, computeSpawn(group));
  }, [group, onReady]);

  return <primitive object={group} />;
}

const UP = new THREE.Vector3(0, 1, 0);

function Car({
  url,
  customization,
  tune,
  trackRef,
  spawn,
  controlsRef,
  arduinoRef,
  cameraMode,
  fx,
  audio,
  headlights,
  onTelemetry,
}: {
  url: string;
  customization: CarCustomization;
  tune: CarTune;
  trackRef: React.RefObject<THREE.Object3D | null>;
  spawn: THREE.Vector3;
  controlsRef: React.RefObject<Record<string, boolean>>;
  arduinoRef: React.RefObject<ArduinoInput>;
  cameraMode: CameraMode;
  fx: Fx;
  audio: CarAudio;
  headlights: boolean;
  onTelemetry: (telemetry: RaceTelemetry) => void;

}) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const group = normalizeCar(scene, 4.2);
    applyPaint(group, customization);
    return group;
  }, [scene, customization]);
  const wheels = useMemo(() => setupWheels(model), [model]);
  const body = useRef<THREE.Group>(null);
  const camera = useThree((state) => state.camera);
  const tuneRef = useRef(tune);
  tuneRef.current = tune;
  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;
  const firstPerson = cameraMode === "cockpit";


  const state = useRef({
    position: spawn.clone(),
    heading: 0,
    speed: 0,
    lateral: 0,
    velocityY: 0,
    grounded: true,
    normal: new THREE.Vector3(0, 1, 0),
    quat: new THREE.Quaternion(),
    camReady: false,
    velocity: new THREE.Vector3(),
    driftAngle: 0,
    score: 0,
    bestScore: loadBestScore(),
    combo: 1,
    driftTime: 0,
    isDrifting: false,
    /** 0..1 camera shake energy from impacts. */
    shake: 0,
    /** Accumulator that paces smoke/skid emission. */
    fxClock: 0,
  });

  const raycaster = useRef(new THREE.Raycaster());
  const lastReport = useRef(0);

  useEffect(() => {
    state.current.position.copy(spawn);
    state.current.speed = 0;
    state.current.lateral = 0;
    state.current.velocityY = 0;
    state.current.camReady = false;
    state.current.velocity.set(0, 0, 0);
    state.current.driftAngle = 0;
    state.current.score = 0;
    state.current.bestScore = loadBestScore();
    state.current.combo = 1;
    state.current.driftTime = 0;
    state.current.isDrifting = false;
  }, [spawn]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30);
    const keys = controlsRef.current ?? {};
    const pad = arduinoRef.current ?? emptyArduinoInput;
    const input: Controls = {
      throttle: keys["KeyW"] || keys["ArrowUp"] || pad.throttle,
      reverse: keys["KeyS"] || keys["ArrowDown"] || pad.reverse,
      left: keys["KeyA"] || keys["ArrowLeft"] || pad.left,
      right: keys["KeyD"] || keys["ArrowRight"] || pad.right,
      brake: keys["Space"] || pad.brake,
    };

    const car = state.current;
    const track = trackRef.current;
    const setup = tuneRef.current ?? BASE_TUNE;
    const maxSpeed = setup.maxSpeed;
    const accel = setup.accel;

    if (input.throttle) car.speed += accel * delta;
    else if (input.reverse) car.speed -= accel * 0.6 * delta;
    else car.speed *= 1 - 0.7 * delta;

    if (input.brake) car.speed *= 1 - 1.1 * delta;
    car.speed = THREE.MathUtils.clamp(car.speed, -maxSpeed * 0.35, maxSpeed);

    const speedFactor = THREE.MathUtils.clamp(Math.abs(car.speed) / 16, 0, 1);
    const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const steerRate = (input.brake ? 2.4 : 1.8) * setup.steer;
    car.heading += steerInput * steerRate * speedFactor * delta * Math.sign(car.speed || 1);

    // Handbrake drift: lateral slide that decays with grip.
    const driftGain = (input.brake ? 7 : 1.6) / setup.grip;
    car.lateral += -steerInput * driftGain * speedFactor * delta;
    car.lateral *= 1 - (input.brake ? 1.2 : 5) * setup.grip * delta;

    const forwardDir = new THREE.Vector3(-Math.sin(car.heading), 0, -Math.cos(car.heading));
    const sideDir = new THREE.Vector3(-Math.cos(car.heading), 0, Math.sin(car.heading));
    const move = forwardDir
      .clone()
      .multiplyScalar(car.speed * delta)
      .add(sideDir.clone().multiplyScalar(car.lateral * delta * 5));

    const next = car.position.clone();

    // --- Wall collision: horizontal probes around the car ---
    if (track && move.lengthSq() > 1e-8) {
      const moveDir = move.clone().normalize();
      const probeY = car.position.y + 0.9;
      const probeLen = move.length() + 1.6;
      raycaster.current.set(new THREE.Vector3(next.x, probeY, next.z), moveDir);
      raycaster.current.far = probeLen;
      const hits = raycaster.current.intersectObject(track, true);
      const wall = hits.find((hit) => {
        const n = hit.face?.normal
          ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
          : UP.clone();
        return Math.abs(n.y) < 0.55; // steep surface = wall, not road
      });
      if (wall) {
        const n = wall
          .face!.normal.clone()
          .transformDirection(wall.object.matrixWorld)
          .setY(0)
          .normalize();
        // Slide along the wall instead of stopping dead.
        move.sub(n.clone().multiplyScalar(move.dot(n) * 1.05));
        const strength = Math.min(Math.abs(car.speed) / 40, 1);
        fx.sparks.burst(wall.point.x, wall.point.y + 0.4, wall.point.z, 6 + strength * 14);
        if (strength > 0.12) audio.impact(strength);
        car.shake = Math.min(1, car.shake + strength * 0.9);
        car.speed *= 0.82;
        car.lateral *= 0.4;
      }

    }

    next.add(move);

    // --- Suspension: sample ground under 4 wheels ---
    if (track) {
      const half = 1.9;
      const width = 0.9;
      const offsets = [
        forwardDir.clone().multiplyScalar(half).add(sideDir.clone().multiplyScalar(width)),
        forwardDir.clone().multiplyScalar(half).add(sideDir.clone().multiplyScalar(-width)),
        forwardDir.clone().multiplyScalar(-half).add(sideDir.clone().multiplyScalar(width)),
        forwardDir.clone().multiplyScalar(-half).add(sideDir.clone().multiplyScalar(-width)),
      ];
      const points: THREE.Vector3[] = [];
      // Start the probe well above the car and scale with speed so fast frames
      // (big position deltas) can't shoot the ray from below the surface.
      const lift = 3.5 + Math.abs(car.speed) * delta * 3;
      const fromY = car.position.y + lift;
      const reach = 60 + Math.abs(car.speed) * delta * 6;
      // Anything higher than this is a roof/overpass, not our road.
      const stepCeiling = car.position.y + 1.6 + Math.abs(car.speed) * delta * 2;
      for (const offset of offsets) {
        const hit = sampleGround(
          raycaster.current,
          track,
          next.x + offset.x,
          next.z + offset.z,
          fromY,
          reach,
          stepCeiling,
        );
        if (hit) points.push(new THREE.Vector3(next.x + offset.x, hit.point.y, next.z + offset.z));
      }


      if (points.length >= 3) {
        const avgY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        const highestY = points.reduce((max, p) => Math.max(max, p.y), -Infinity);
        // Plane normal from the contact patch (front/rear + left/right spread).
        const [a, b, c] = points;
        const normal = new THREE.Vector3()
          .crossVectors(b!.clone().sub(a!), c!.clone().sub(a!))
          .normalize();
        if (normal.y < 0) normal.negate();
        car.normal.lerp(normal, 1 - Math.pow(0.0005, delta));
        car.normal.normalize();

        const targetY = avgY + 0.06;
        // Soft suspension when settling down, instant when climbing: never let
        // the body end up below the surface (that caused the sinking/black view).
        car.position.y =
          car.position.y < targetY
            ? targetY
            : THREE.MathUtils.lerp(car.position.y, targetY, 1 - Math.pow(0.0008, delta));
        car.position.y = Math.max(car.position.y, highestY - 0.35);
        next.y = car.position.y;
        car.velocityY = 0;
        car.grounded = true;
      } else {
        car.grounded = false;
        car.velocityY -= 24 * delta;
        next.y = car.position.y + car.velocityY * delta;
        car.normal.lerp(UP, 1 - Math.pow(0.2, delta));
      }
    }


    car.position.copy(next);

    if (body.current) {
      // Align the car body to the terrain normal, then apply heading around it.
      const tilt = new THREE.Quaternion().setFromUnitVectors(UP, car.normal);
      const yaw = new THREE.Quaternion().setFromAxisAngle(UP, car.heading);
      car.quat.copy(tilt).multiply(yaw);
      body.current.position.copy(car.position);
      body.current.quaternion.slerp(car.quat, 1 - Math.pow(0.0001, delta));
    }

    const mode = cameraModeRef.current;
    const speedNorm = THREE.MathUtils.clamp(Math.abs(car.speed) / Math.max(setup.maxSpeed, 1), 0, 1);
    const back = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
    let desired: THREE.Vector3;
    let lookAt: THREE.Vector3;
    let follow = 0.0015;
    let baseFov = 58;
    let clampToGround = true;

    if (mode === "cockpit") {
      // Sits just above the dashboard, looking down the heading.
      desired = car.position
        .clone()
        .add(car.normal.clone().multiplyScalar(1.25))
        .add(forwardDir.clone().multiplyScalar(0.15));
      lookAt = desired.clone().add(forwardDir.clone().multiplyScalar(30));
      follow = 0.00001;
      baseFov = 72;
      clampToGround = false;
    } else if (mode === "hood") {
      // Bumper cam glued to the nose of the car.
      desired = car.position
        .clone()
        .add(car.normal.clone().multiplyScalar(0.85))
        .add(forwardDir.clone().multiplyScalar(1.9));
      lookAt = desired.clone().add(forwardDir.clone().multiplyScalar(40));
      follow = 0.00001;
      baseFov = 78;
      clampToGround = false;
    } else if (mode === "close") {
      // Tight over-the-shoulder chase.
      desired = car.position
        .clone()
        .add(back.clone().multiplyScalar(5.4))
        .add(car.normal.clone().multiplyScalar(2.1));
      lookAt = car.position.clone().setY(car.position.y + 1.1);
      follow = 0.0004;
      baseFov = 66;
    } else if (mode === "cinematic") {
      // Long-lens, low, slowly orbiting rig with a lazy follow.
      const orbit = performance.now() / 4200;
      const radius = 9 + Math.sin(orbit * 0.7) * 2.5;
      desired = car.position
        .clone()
        .add(
          new THREE.Vector3(
            Math.sin(car.heading + Math.sin(orbit) * 0.9) * radius,
            0,
            Math.cos(car.heading + Math.sin(orbit) * 0.9) * radius,
          ),
        )
        .add(car.normal.clone().multiplyScalar(1.6 + Math.sin(orbit * 1.3) * 0.5));
      lookAt = car.position.clone().setY(car.position.y + 0.9);
      follow = 0.08;
      baseFov = 36;
    } else if (mode === "top") {
      desired = car.position
        .clone()
        .add(back.clone().multiplyScalar(6))
        .add(car.normal.clone().multiplyScalar(16));
      lookAt = car.position.clone();
      follow = 0.004;
      baseFov = 52;
    } else {
      // Default chase camera, following the terrain tilt slightly.
      desired = car.position
        .clone()
        .add(back.clone().multiplyScalar(10.5))
        .add(car.normal.clone().multiplyScalar(4.4));
      lookAt = car.position.clone().setY(car.position.y + 1.5);
    }

    // Keep the camera above the track surface, otherwise it ends up inside the
    // geometry and the screen turns black. The ceiling keeps tunnel roofs from
    // shoving the camera on top of the map.
    if (track && clampToGround) {
      const camGround = sampleGround(
        raycaster.current,
        track,
        desired.x,
        desired.z,
        desired.y + 40,
        120,
        car.position.y + (mode === "top" ? 20 : 3),
      );
      if (camGround) desired.y = Math.max(desired.y, camGround.point.y + 2.2);
    }
    if (!car.camReady) {
      camera.position.copy(desired);
      car.camReady = true;
    } else {
      camera.position.lerp(desired, 1 - Math.pow(follow, delta));
      if (clampToGround) {
        const floor = car.position.y + 0.8;
        if (camera.position.y < floor) camera.position.y = floor;
      }
    }
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z);

    // --- Speed sensation: FOV stretch + impact shake ---
    const perspective = camera as THREE.PerspectiveCamera;
    if (perspective.isPerspectiveCamera) {
      const targetFov = baseFov + speedNorm * (mode === "cinematic" ? 6 : 20);
      perspective.fov = THREE.MathUtils.lerp(perspective.fov, targetFov, 1 - Math.pow(0.02, delta));
      perspective.updateProjectionMatrix();
    }

    car.shake = Math.max(0, car.shake - delta * 1.8);
    const rumble = car.shake * 0.5 + (car.grounded ? 0 : 0) + Math.abs(car.speed) / setup.maxSpeed * 0.035;
    if (rumble > 0.001) {
      camera.position.x += (Math.random() - 0.5) * rumble;
      camera.position.y += (Math.random() - 0.5) * rumble;
      camera.position.z += (Math.random() - 0.5) * rumble;
    }


    // --- Drift scoring ---
    const velocityDir =
      move.lengthSq() > 1e-8 ? move.clone().setY(0).normalize() : forwardDir.clone();
    const headingDir = forwardDir.clone().setY(0).normalize();
    const driftAngle = headingDir.angleTo(velocityDir) * (180 / Math.PI);
    car.driftAngle = driftAngle;

    const minDriftAngle = 15;
    const minDriftSpeed = 12; // m/s ~= 43 km/h
    const wasDrifting = car.isDrifting;
    car.isDrifting = driftAngle > minDriftAngle && Math.abs(car.speed) > minDriftSpeed;

    if (car.isDrifting) {
      car.driftTime += delta;
      // Combo grows 0.5x every 1.5s of continuous drift, capped at 5x.
      car.combo = 1 + Math.min(car.driftTime / 1.5, 4) * 0.5;
      // Base score rate: angle * speed * combo, then scaled.
      const rate = driftAngle * Math.abs(car.speed) * car.combo * 0.12;
      car.score += rate * delta;
      if (car.score > car.bestScore) {
        car.bestScore = car.score;
        saveBestScore(car.bestScore);
      }
    } else {
      car.driftTime = Math.max(0, car.driftTime - delta * 2);
      car.combo = 1 + Math.min(car.driftTime / 1.5, 4) * 0.5;
      if (wasDrifting && car.driftTime <= 0) {
        car.driftTime = 0;
        car.combo = 1;
      }
    }

    // --- Wheels: roll with speed, front axle steers with the input ---
    updateWheels(wheels, {
      speed: car.speed,
      steer: steerInput,
      delta,
      scale: model.scale.x,
    });


    // --- Tyre smoke, rubber marks and engine audio ---
    const rearLeft = car.position
      .clone()
      .add(forwardDir.clone().multiplyScalar(-1.7))
      .add(sideDir.clone().multiplyScalar(0.85));
    const rearRight = car.position
      .clone()
      .add(forwardDir.clone().multiplyScalar(-1.7))
      .add(sideDir.clone().multiplyScalar(-0.85));
    const slipping =
      car.grounded &&
      (car.isDrifting || (input.brake && Math.abs(car.speed) > 5) || (input.throttle && Math.abs(car.speed) < 6 && input.brake));
    car.fxClock += delta;
    if (slipping) {
      const intensity = THREE.MathUtils.clamp(car.driftAngle / 40, 0.25, 1.4);
      if (car.fxClock > 0.018) {
        car.fxClock = 0;
        fx.smoke.spawn(rearLeft.x, rearLeft.y, rearLeft.z, intensity);
        fx.smoke.spawn(rearRight.x, rearRight.y, rearRight.z, intensity);
        fx.skid.add(rearLeft.x, rearLeft.y, rearLeft.z, car.heading, car.normal);
        fx.skid.add(rearRight.x, rearRight.y, rearRight.z, car.heading, car.normal);
      }
    }
    fx.smoke.update(delta);
    fx.sparks.update(delta);

    audio.update(
      {
        speed: Math.abs(car.speed),
        maxSpeed: setup.maxSpeed,
        throttle: input.throttle || input.reverse,
        brake: input.brake,
        drifting: car.isDrifting,
        driftAngle: car.driftAngle,
        grounded: car.grounded,
      },
      delta,
    );

    const now = performance.now();

    if (now - lastReport.current > 90) {
      lastReport.current = now;
      onTelemetry({
        speed: Math.abs(car.speed) * 3.6,
        score: Math.floor(car.score),
        bestScore: Math.floor(car.bestScore),
        combo: Number(car.combo.toFixed(1)),
        driftAngle: Math.round(car.driftAngle),
        isDrifting: car.isDrifting,
      });
    }
  });

  return (
    <group ref={body}>
      <primitive object={model} visible={!firstPerson} />
      {/* Underglow pool on the asphalt */}
      <pointLight
        position={[0, 0.3, 0]}
        intensity={3.2}
        distance={6}
        decay={2}
        color={customization.underglow}
      />
      {/* Tail lights */}
      <pointLight position={[0, 0.6, 2.4]} intensity={1.6} distance={4.5} decay={2} color="#ff2d55" />
      {headlights && (
        <>
          <spotLight
            position={[0.7, 0.75, -1.9]}
            target-position={[3, -1, -40]}
            angle={0.5}
            penumbra={0.75}
            intensity={90}
            distance={70}
            decay={2}
            color="#ffeccb"
          />
          <spotLight
            position={[-0.7, 0.75, -1.9]}
            target-position={[-3, -1, -40]}
            angle={0.5}
            penumbra={0.75}
            intensity={90}
            distance={70}
            decay={2}
            color="#ffeccb"
          />
        </>
      )}
    </group>
  );
}

export default function RaceScene({
  car,
  track,
  customization,
  tune,
  arduinoRef,
  onTelemetry,
  onCameraChange,
}: {
  car: Model3D;
  track: Model3D;
  customization: CarCustomization;
  tune: CarTune;
  arduinoRef: React.RefObject<ArduinoInput>;
  onTelemetry: (telemetry: RaceTelemetry) => void;
  onCameraChange?: (label: string) => void;
}) {
  const keys = useKeyboard();
  const [cameraMode, setCameraMode] = useState<CameraMode>("chase");
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "KeyC") {
        setCameraMode((value) => {
          const next = CAMERA_MODES[(CAMERA_MODES.indexOf(value) + 1) % CAMERA_MODES.length]!;
          return next;
        });
      }
      if (event.code === "KeyM") setMuted((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => onCameraChange?.(CAMERA_LABELS[cameraMode]), [cameraMode, onCameraChange]);

  const trackRef = useRef<THREE.Object3D | null>(null);
  const [spawn, setSpawn] = useState<THREE.Vector3 | null>(null);
  const telemetryRef = useRef(onTelemetry);
  telemetryRef.current = onTelemetry;

  const ambience = AMBIENCE[track.ambience ?? "night-neon"];

  const fx = useMemo<Fx>(
    () => ({ smoke: new SmokeSystem(), skid: new SkidMarks(), sparks: new SparkSystem() }),
    [],
  );
  useEffect(() => () => {
    fx.smoke.dispose();
    fx.skid.dispose();
    fx.sparks.dispose();
  }, [fx]);

  const audio = useMemo(() => new CarAudio(), []);
  useEffect(() => {
    audio.start();
    const resume = () => audio.start();
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      audio.dispose();
    };
  }, [audio]);
  useEffect(() => audio.setMuted(muted), [audio, muted]);

  const handleReady = useCallback((group: THREE.Group, point: THREE.Vector3) => {
    trackRef.current = group;
    setSpawn((current) => current ?? point.clone());
  }, []);

  const reportTelemetry = useCallback(
    (telemetry: RaceTelemetry) => telemetryRef.current(telemetry),
    [],
  );

  return (
    <Canvas
      shadows="soft"
      camera={{ position: [0, 8, 16], fov: 58 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.AgXToneMapping;
        gl.toneMappingExposure = 0.78;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <color attach="background" args={[ambience.background]} />
      <fog attach="fog" args={ambience.fog} />
      {ambience.sky && (
        <Sky
          distance={45000}
          sunPosition={ambience.sky.sunPosition}
          turbidity={ambience.sky.turbidity}
          rayleigh={ambience.sky.rayleigh}
          mieCoefficient={0.008}
          mieDirectionalG={0.85}
        />
      )}
      {ambience.stars && <Stars radius={600} depth={120} count={2600} factor={7} fade speed={0.4} />}
      <hemisphereLight
        intensity={ambience.hemi.intensity}
        color={ambience.hemi.sky}
        groundColor={ambience.hemi.ground}
      />
      <ambientLight intensity={ambience.ambient} />
      <directionalLight
        position={ambience.sun.position}
        intensity={ambience.sun.intensity}
        color={ambience.sun.color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-160}
        shadow-camera-right={160}
        shadow-camera-top={160}
        shadow-camera-bottom={-160}
        shadow-bias={-0.0004}
      />
      <directionalLight
        position={ambience.rim.position}
        intensity={ambience.rim.intensity}
        color={ambience.rim.color}
      />
      {track.kind === "procedural" ? (
        <ProceduralTrack key={track.id} track={track} onReady={handleReady} />
      ) : (
        <GltfTrack key={track.id} url={track.url} onReady={handleReady} />
      )}
      <primitive object={fx.skid.object} />
      <primitive object={fx.smoke.object} />
      <primitive object={fx.sparks.object} />
      {spawn && (
        <Car
          key={car.id}
          url={car.url}
          customization={customization}
          tune={tune}
          trackRef={trackRef}
          spawn={spawn}
          controlsRef={keys}
          arduinoRef={arduinoRef}
          cameraMode={cameraMode}
          fx={fx}
          audio={audio}
          headlights={ambience.headlights}
          onTelemetry={reportTelemetry}
        />
      )}
      <Environment preset={ambience.sky ? "sunset" : "night"} environmentIntensity={0.55} />
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={ambience.bloom}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.55}
          mipmapBlur
        />
        {cameraMode === "cinematic" ? (
          <DepthOfField focusDistance={0.012} focalLength={0.05} bokehScale={3.5} />
        ) : (
          <></>
        )}
        <ChromaticAberration offset={[0.0006, 0.0009]} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.28} />
        <Vignette eskil={false} offset={0.22} darkness={0.85} />
        <SMAA />
      </EffectComposer>

    </Canvas>
  );
}

