import carDefault from "@/assets/car-default.glb.asset.json";
import skylineR34 from "@/assets/skyline-r34.glb.asset.json";
import silviaCwest from "@/assets/silvia-s15-cwest.glb.asset.json";
import silviaMak from "@/assets/silvia-s15-mak.glb.asset.json";
import trackDefault from "@/assets/rocky-pass.glb.asset.json";

export type CarTune = {
  maxSpeed: number; // m/s
  accel: number; // m/s²
  grip: number; // 1 = base, lower = slides more
  steer: number; // 1 = base
};

export type Model3D = {
  id: string;
  name: string;
  url: string;
  builtIn?: boolean;
  kind?: "gltf" | "procedural";
  proceduralId?: ProceduralTrackId;
  /** Short flavour line shown in the menu. */
  tagline?: string;
  tune?: CarTune;
  /** Default paint for built-in cars. */
  paint?: string;
  /** Lighting/atmosphere preset used by the race scene. */
  ambience?: Ambience;
};

export type Ambience = "night-neon" | "dusk-mountain" | "harbor-night" | "stadium";


export type ProceduralTrackId =
  | "neon-grid"
  | "donut-pad"
  | "figure-eight"
  | "touge-pass"
  | "harbor-night"
  | "drift-stadium";

export type Finish = "gloss" | "matte" | "chrome";

export type CarCustomization = {
  paint: string;
  finish: Finish;
  underglow: string;
  /** 0 = stock handling, 1 = full drift setup. */
  driftBias: number;
};

export type RaceTelemetry = {
  speed: number; // km/h
  score: number;
  bestScore: number;
  combo: number; // 1.0 base, up while drifting
  driftAngle: number; // degrees
  isDrifting: boolean;
};

const CARS_KEY = "drift3d.cars.v1";
const TRACKS_KEY = "drift3d.tracks.v1";
const BEST_SCORE_KEY = "drift3d.bestScore.v1";
const CUSTOM_KEY = "drift3d.custom.v1";

export const PAINT_SWATCHES = [
  "#22e6ff",
  "#3a6bff",
  "#b06bff",
  "#ff3ba7",
  "#ff5a3c",
  "#ffc23c",
  "#b6ff3a",
  "#f2f6ff",
  "#1b2130",
] as const;

export const UNDERGLOW_SWATCHES = [
  "#7ce9ff",
  "#4b6bff",
  "#b06bff",
  "#ff3ba7",
  "#8bff5a",
  "#ffb020",
] as const;

export const FINISH_LABELS: Record<Finish, string> = {
  gloss: "Brilhante",
  matte: "Fosco",
  chrome: "Cromado",
};

export const BASE_TUNE: CarTune = { maxSpeed: 68, accel: 30, grip: 1, steer: 1 };

export const BUILT_IN_CARS: Model3D[] = [
  {
  {
    id: "builtin-skyline-r34",
    name: "Nissan Skyline GT-R R34",
    url: skylineR34.url,
    builtIn: true,
    tagline: "Ícone JDM · tração total e estabilidade",
    paint: "#3a6bff",
    tune: { maxSpeed: 82, accel: 37, grip: 1.2, steer: 1.05 },
  },
  {
    id: "builtin-silvia-cwest",
    name: "Nissan Silvia S15 C-West",
    url: silviaCwest.url,
    builtIn: true,
    tagline: "Kit C-West · rei do drift",
    paint: "#ff3ba7",
    tune: { maxSpeed: 74, accel: 34, grip: 0.68, steer: 1.25 },
  },
  {
    id: "builtin-silvia-mak",
    name: "Silvia S15 Garage Mak",
    url: silviaMak.url,
    builtIn: true,
    tagline: "Widebody Garage Mak · traseira solta",
    paint: "#b6ff3a",
    tune: { maxSpeed: 76, accel: 35, grip: 0.6, steer: 1.3 },
  },
  {
    id: "builtin-car",

    name: "Ergoninane Fast 74",
    url: carDefault.url,
    builtIn: true,
    tagline: "Equilibrado · fácil de controlar",
    paint: "#22e6ff",
    tune: { maxSpeed: 68, accel: 30, grip: 1, steer: 1 },
  },
  {
    id: "builtin-car-rs",
    name: "Ergoninane RS Turbo",
    url: carDefault.url,
    builtIn: true,
    tagline: "Velocidade máxima · pouca curva",
    paint: "#ff5a3c",
    tune: { maxSpeed: 84, accel: 36, grip: 1.15, steer: 0.85 },
  },
  {
    id: "builtin-car-drift",
    name: "Ergoninane Drift Spec",
    url: carDefault.url,
    builtIn: true,
    tagline: "Traseira solta · combo alto",
    paint: "#b6ff3a",
    tune: { maxSpeed: 66, accel: 31, grip: 0.62, steer: 1.2 },
  },
  {
    id: "builtin-car-club",
    name: "Ergoninane Track Club",
    url: carDefault.url,
    builtIn: true,
    tagline: "Muita aderência · curvas rápidas",
    paint: "#b06bff",
    tune: { maxSpeed: 72, accel: 33, grip: 1.35, steer: 1.05 },
  },
  {
    id: "builtin-car-touge",
    name: "Ergoninane Touge AE",
    url: carDefault.url,
    builtIn: true,
    tagline: "Leve · perfeito para serra",
    paint: "#f2f6ff",
    tune: { maxSpeed: 70, accel: 32, grip: 0.85, steer: 1.3 },
  },
  {
    id: "builtin-car-widebody",
    name: "Ergoninane Widebody V8",
    url: carDefault.url,
    builtIn: true,
    tagline: "Torque brutal · fumaça garantida",
    paint: "#ff3ba7",
    tune: { maxSpeed: 78, accel: 40, grip: 0.7, steer: 1.1 },
  },
];

export const BUILT_IN_TRACKS: Model3D[] = [
  {
    id: "builtin-track",
    name: "Rocky Pass",
    url: trackDefault.url,
    builtIn: true,
    kind: "gltf",
    tagline: "Montanha aberta · NFS III",
    ambience: "dusk-mountain",
  },
  {
    id: "track-touge-pass",
    name: "Touge Akagi",
    url: "",
    builtIn: true,
    kind: "procedural",
    proceduralId: "touge-pass",
    tagline: "Descida de serra · grampos infinitos",
    ambience: "dusk-mountain",
  },
  {
    id: "track-harbor-night",
    name: "Porto Noturno",
    url: "",
    builtIn: true,
    kind: "procedural",
    proceduralId: "harbor-night",
    tagline: "Contêineres · circuito de doca",
    ambience: "harbor-night",
  },
  {
    id: "track-drift-stadium",
    name: "Drift Stadium",
    url: "",
    builtIn: true,
    kind: "procedural",
    proceduralId: "drift-stadium",
    tagline: "Arena com clipping points e refletores",
    ambience: "stadium",
  },
  {
    id: "track-neon-grid",
    name: "Neon Grid",
    url: "",
    builtIn: true,
    kind: "procedural",
    proceduralId: "neon-grid",
    tagline: "Arena urbana com barreiras",
    ambience: "night-neon",
  },
  {
    id: "track-donut-pad",
    name: "Donut Pad",
    url: "",
    builtIn: true,
    kind: "procedural",
    proceduralId: "donut-pad",
    tagline: "Praça circular para giros infinitos",
    ambience: "night-neon",
  },
  {
    id: "track-figure-eight",
    name: "Figure Eight",
    url: "",
    builtIn: true,
    kind: "procedural",
    proceduralId: "figure-eight",
    tagline: "Oito inclinado · troca de lado",
    ambience: "night-neon",
  },
];


export const DEFAULT_CAR = BUILT_IN_CARS[0]!;
export const DEFAULT_TRACK = BUILT_IN_TRACKS[0]!;

export const DEFAULT_CUSTOMIZATION: CarCustomization = {
  paint: DEFAULT_CAR.paint!,
  finish: "gloss",
  underglow: "#7ce9ff",
  driftBias: 0.35,
};

export function tuneForCar(car: Model3D, custom: CarCustomization): CarTune {
  const base = car.tune ?? BASE_TUNE;
  // Drift bias trades grip for steering authority.
  const grip = base.grip * (1 - custom.driftBias * 0.55);
  const steer = base.steer * (1 + custom.driftBias * 0.25);
  return { ...base, grip: Math.max(0.25, grip), steer };
}

function read(key: string): Model3D[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Model3D[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, models: Model3D[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(models));
    return true;
  } catch {
    return false;
  }
}

export const loadCars = () => read(CARS_KEY);
export const loadTracks = () => read(TRACKS_KEY);
export const saveCars = (models: Model3D[]) => write(CARS_KEY, models);
export const saveTracks = (models: Model3D[]) => write(TRACKS_KEY, models);

export function loadCustomizations(): Record<string, CarCustomization> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, CarCustomization>) : {};
  } catch {
    return {};
  }
}

export function saveCustomizations(map: Record<string, CarCustomization>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota errors */
  }
}

export function defaultCustomizationFor(car: Model3D): CarCustomization {
  return { ...DEFAULT_CUSTOMIZATION, paint: car.paint ?? DEFAULT_CUSTOMIZATION.paint };
}

export function loadBestScore(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(BEST_SCORE_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function saveBestScore(score: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(Math.floor(score)));
  } catch {
    /* ignore quota errors */
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function filesToModels(files: File[]): Promise<Model3D[]> {
  const models: Model3D[] = [];
  for (const file of files) {
    if (!/\.(glb|gltf)$/i.test(file.name)) continue;
    const url = await fileToDataUrl(file);
    models.push({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name.replace(/\.(glb|gltf)$/i, ""),
      url,
      kind: "gltf",
    });
  }
  return models;
}
