import * as THREE from "three";
import type { ProceduralTrackId } from "@/lib/garage";

/** Browser-only helpers that build drivable track geometry with plain Three.js. */

function asphalt(color = "#12161f") {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0.12 });
}

function neon(color: string) {
  return new THREE.MeshBasicMaterial({ color, toneMapped: false });
}

function wallMaterial(color: string) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.5,
    emissive: new THREE.Color(color).multiplyScalar(0.25),
  });
}

function groundPlane(size: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 1, 1), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function wallBox(
  group: THREE.Group,
  material: THREE.Material,
  x: number,
  z: number,
  w: number,
  d: number,
  h = 3,
  rotationY = 0,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, h / 2, z);
  mesh.rotation.y = rotationY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function neonStripe(group: THREE.Group, color: string, x: number, z: number, w: number, d: number) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), neon(color));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.03, z);
  group.add(mesh);
}

function ringOfWalls(
  group: THREE.Group,
  material: THREE.Material,
  radius: number,
  count: number,
  segmentWidth: number,
  height = 3,
) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    wallBox(
      group,
      material,
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      segmentWidth,
      1.4,
      height,
      -angle,
    );
  }
}

function buildNeonGrid() {
  const group = new THREE.Group();
  const size = 420;
  group.add(groundPlane(size, asphalt("#10141d")));

  // Neon grid lines painted on the asphalt.
  for (let i = -4; i <= 4; i++) {
    neonStripe(group, i === 0 ? "#22e6ff" : "#1d3b52", i * 44, 0, 0.6, size * 0.92);
    neonStripe(group, i === 0 ? "#ff3ba7" : "#3a2140", 0, i * 44, size * 0.92, 0.6);
  }

  const barrier = wallMaterial("#2a3550");
  const half = size / 2 - 6;
  wallBox(group, barrier, 0, -half, size - 8, 2, 4);
  wallBox(group, barrier, 0, half, size - 8, 2, 4);
  wallBox(group, barrier, -half, 0, 2, size - 8, 4);
  wallBox(group, barrier, half, 0, 2, size - 8, 4);

  // Blocks to slalom around.
  const block = wallMaterial("#3b2a58");
  const spots: Array<[number, number]> = [
    [-120, -60],
    [-60, 40],
    [30, -90],
    [90, 70],
    [140, -20],
    [-30, 130],
    [-160, 90],
    [70, 160],
  ];
  for (const [x, z] of spots) wallBox(group, block, x, z, 16, 16, 5);

  return group;
}

function buildDonutPad() {
  const group = new THREE.Group();
  const radius = 150;
  const pad = new THREE.Mesh(new THREE.CircleGeometry(radius, 96), asphalt("#0f131c"));
  pad.rotation.x = -Math.PI / 2;
  pad.receiveShadow = true;
  group.add(pad);

  for (const r of [40, 80, 118]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.5, r + 0.5, 128), neon("#22e6ff"));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    group.add(ring);
  }

  const centre = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7, 9, 32),
    wallMaterial("#ff3ba7"),
  );
  centre.position.y = 4.5;
  centre.castShadow = true;
  group.add(centre);

  ringOfWalls(group, wallMaterial("#2a3550"), radius - 4, 72, 14, 4);

  const pillar = wallMaterial("#3d2b62");
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    wallBox(group, pillar, Math.cos(angle) * 95, Math.sin(angle) * 95, 8, 8, 6, -angle);
  }

  return group;
}

function buildFigureEight() {
  const group = new THREE.Group();
  group.add(groundPlane(520, asphalt("#111520")));

  const loopRadius = 95;
  const trackHalfWidth = 22;

  for (const centerX of [-loopRadius, loopRadius]) {
    // Painted racing line for each loop.
    const line = new THREE.Mesh(
      new THREE.RingGeometry(loopRadius - 0.6, loopRadius + 0.6, 128),
      neon(centerX < 0 ? "#22e6ff" : "#ff3ba7"),
    );
    line.rotation.x = -Math.PI / 2;
    line.position.set(centerX, 0.03, 0);
    group.add(line);

    // Inner island wall, opened toward the crossover.
    const inner = wallMaterial("#2b3654");
    const innerRadius = loopRadius - trackHalfWidth;
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      const towardCentre = centerX < 0 ? Math.cos(angle) > 0.72 : Math.cos(angle) < -0.72;
      if (towardCentre) continue;
      wallBox(
        group,
        inner,
        centerX + Math.cos(angle) * innerRadius,
        Math.sin(angle) * innerRadius,
        13,
        1.4,
        3,
        -angle,
      );
    }

    // Outer wall.
    const outer = wallMaterial("#3a2a58");
    const outerRadius = loopRadius + trackHalfWidth;
    for (let i = 0; i < 80; i++) {
      const angle = (i / 80) * Math.PI * 2;
      const towardCentre = centerX < 0 ? Math.cos(angle) > 0.9 : Math.cos(angle) < -0.9;
      if (towardCentre) continue;
      wallBox(
        group,
        outer,
        centerX + Math.cos(angle) * outerRadius,
        Math.sin(angle) * outerRadius,
        14,
        1.4,
        4,
        -angle,
      );
    }
  }

  return group;
}

/** Builds a flat drivable ribbon that follows a 3D curve. */
function roadFromCurve(
  curve: THREE.CatmullRomCurve3,
  width: number,
  segments: number,
  color = "#14171f",
) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const side = new THREE.Vector3().crossVectors(tangent, up).normalize().multiplyScalar(width / 2);
    positions.push(
      point.x - side.x,
      point.y,
      point.z - side.z,
      point.x + side.x,
      point.y,
      point.z + side.z,
    );
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, t * segments * 0.25, 1, t * segments * 0.25);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, asphalt(color));
  mesh.receiveShadow = true;
  return mesh;
}

/** Guard rails hugging both sides of a curve. */
function railsAlongCurve(
  group: THREE.Group,
  curve: THREE.CatmullRomCurve3,
  width: number,
  steps: number,
  material: THREE.Material,
  height = 1.5,
) {
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const angle = Math.atan2(tangent.x, tangent.z);
    const side = new THREE.Vector3()
      .crossVectors(tangent, up)
      .normalize()
      .multiplyScalar(width / 2 + 0.7);
    const length = (curve.getLength() / steps) * 1.25;
    for (const sign of [-1, 1]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, height, length), material);
      mesh.position.set(point.x + side.x * sign, point.y + height / 2, point.z + side.z * sign);
      mesh.rotation.y = angle;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}

/** Centre dashes so the road reads as a real mountain pass. */
function centerDashes(group: THREE.Group, curve: THREE.CatmullRomCurve3, steps: number) {
  const material = new THREE.MeshBasicMaterial({ color: "#e9e4c8", toneMapped: false });
  for (let i = 0; i < steps; i++) {
    if (i % 2 === 1) continue;
    const t = i / steps;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 3.4), material);
    dash.rotation.x = -Math.PI / 2;
    dash.rotation.z = -Math.atan2(tangent.x, tangent.z);
    dash.position.set(point.x, point.y + 0.05, point.z);
    group.add(dash);
  }
}

function buildTougePass() {
  const group = new THREE.Group();

  // Descending hairpin road down a mountain side.
  const points: THREE.Vector3[] = [];
  const turns = 5;
  for (let i = 0; i <= turns * 2; i++) {
    const t = i / (turns * 2);
    const x = (i % 2 === 0 ? -1 : 1) * (110 - t * 25);
    const z = -260 + t * 520;
    const y = 70 - t * 70;
    points.push(new THREE.Vector3(x, y, z));
    points.push(new THREE.Vector3(x * 0.35, y - 3.5, z + 26));
  }
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.4);

  const width = 16;
  group.add(roadFromCurve(curve, width, 900, "#171a22"));
  centerDashes(group, curve, 260);
  railsAlongCurve(group, curve, width, 220, wallMaterial("#4a5468"), 1.4);

  // Mountain body + rocks so the pass feels carved out of a hillside.
  const rock = new THREE.MeshStandardMaterial({ color: "#2c2f38", roughness: 0.95 });
  for (let i = 0; i < 90; i++) {
    const t = i / 90;
    const point = curve.getPointAt(Math.min(t, 0.999));
    const side = i % 2 === 0 ? -1 : 1;
    const geo = new THREE.DodecahedronGeometry(9 + Math.random() * 16, 0);
    const mesh = new THREE.Mesh(geo, rock);
    mesh.position.set(
      point.x + side * (18 + Math.random() * 26),
      point.y - 6 + Math.random() * 6,
      point.z + (Math.random() - 0.5) * 40,
    );
    mesh.rotation.set(Math.random(), Math.random(), Math.random());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Valley floor far below, so falling off reads as a drop.
  const valley = groundPlane(1400, new THREE.MeshStandardMaterial({ color: "#0d1117", roughness: 1 }));
  valley.position.y = -40;
  group.add(valley);

  return group;
}

function buildHarborNight() {
  const group = new THREE.Group();
  group.add(groundPlane(620, asphalt("#0d1017")));

  // Dock outline in painted lines.
  for (let i = -2; i <= 2; i++) {
    neonStripe(group, "#2b3a4d", i * 70, 0, 0.5, 520);
  }

  // Shipping containers form the circuit walls.
  const colors = ["#c8462f", "#2f6fc8", "#c8a02f", "#2fc88a", "#8a2fc8"];
  const containerAt = (x: number, z: number, rotY: number, stack: number) => {
    for (let s = 0; s < stack; s++) {
      const color = colors[Math.floor(Math.random() * colors.length)]!;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(12, 5.2, 2.6),
        new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.35 }),
      );
      mesh.position.set(x, 2.6 + s * 5.3, z);
      mesh.rotation.y = rotY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  };

  const outer = 250;
  for (let x = -outer; x <= outer; x += 13) {
    containerAt(x, -outer, 0, 1 + (Math.random() > 0.7 ? 1 : 0));
    containerAt(x, outer, 0, 1 + (Math.random() > 0.7 ? 1 : 0));
  }
  for (let z = -outer; z <= outer; z += 13) {
    containerAt(-outer, z, Math.PI / 2, 1 + (Math.random() > 0.7 ? 1 : 0));
    containerAt(outer, z, Math.PI / 2, 1 + (Math.random() > 0.7 ? 1 : 0));
  }

  // Inner infield: a big chicane made of container stacks to swing around.
  const inner: Array<[number, number, number]> = [
    [-110, -70, 0],
    [-40, 40, Math.PI / 2],
    [60, -60, 0],
    [120, 60, Math.PI / 2],
    [0, 150, 0],
    [-150, 120, Math.PI / 2],
  ];
  for (const [x, z, rot] of inner) {
    containerAt(x, z, rot, 2);
    containerAt(x + Math.cos(rot) * 12, z + Math.sin(rot) * 12, rot, 1);
  }

  // Crane-style light masts.
  const mast = new THREE.MeshStandardMaterial({ color: "#39415a", metalness: 0.7, roughness: 0.4 });
  for (const [x, z] of [
    [-190, -190],
    [190, -190],
    [-190, 190],
    [190, 190],
  ] as Array<[number, number]>) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 34, 10), mast);
    pole.position.set(x, 17, z);
    pole.castShadow = true;
    group.add(pole);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 3), neon("#ffe9b0"));
    lamp.position.set(x, 34, z);
    group.add(lamp);
  }

  return group;
}

function buildDriftStadium() {
  const group = new THREE.Group();
  const radius = 210;
  const pad = new THREE.Mesh(new THREE.CircleGeometry(radius, 128), asphalt("#101420"));
  pad.rotation.x = -Math.PI / 2;
  pad.receiveShadow = true;
  group.add(pad);

  // Clipping-point layout: a long sweeper with three tight clips.
  const clips: Array<[number, number]> = [
    [-120, -100],
    [0, 30],
    [130, -80],
    [70, 140],
  ];
  for (const [x, z] of clips) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 7, 16), neon("#ff9d3b"));
    cone.position.set(x, 3.5, z);
    group.add(cone);
    const halo = new THREE.Mesh(new THREE.RingGeometry(11, 12.4, 64), neon("#ff3ba7"));
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(x, 0.04, z);
    group.add(halo);
  }

  // Judging line painted across the pad.
  neonStripe(group, "#22e6ff", 0, -160, 240, 1.2);

  // Grandstand ring: tyre walls plus tiered stands.
  ringOfWalls(group, wallMaterial("#242c40"), radius - 6, 96, 16, 3);
  const stand = new THREE.MeshStandardMaterial({ color: "#1c2334", roughness: 0.8 });
  for (let tier = 0; tier < 5; tier++) {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(radius + tier * 7, radius + tier * 7 + 6, 4, 96, 1, true),
      stand,
    );
    ring.position.y = 2 + tier * 3.4;
    group.add(ring);
  }

  // Flood lights around the stadium.
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(10, 1.4, 4), neon("#dff0ff"));
    lamp.position.set(Math.cos(angle) * (radius + 26), 26, Math.sin(angle) * (radius + 26));
    lamp.rotation.y = -angle;
    group.add(lamp);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1.4, 26, 8),
      wallMaterial("#39415a"),
    );
    pole.position.set(Math.cos(angle) * (radius + 26), 13, Math.sin(angle) * (radius + 26));
    group.add(pole);
  }

  return group;
}

export function buildProceduralTrack(id: ProceduralTrackId): THREE.Group {
  switch (id) {
    case "donut-pad":
      return buildDonutPad();
    case "figure-eight":
      return buildFigureEight();
    case "touge-pass":
      return buildTougePass();
    case "harbor-night":
      return buildHarborNight();
    case "drift-stadium":
      return buildDriftStadium();
    case "neon-grid":
    default:
      return buildNeonGrid();
  }
}

