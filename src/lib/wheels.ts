import * as THREE from "three";

const WHEEL_RE = /(wheel|tire|tyre|rim|roda|pneu)/i;

export type WheelRig = {
  front: THREE.Object3D[];
  rear: THREE.Object3D[];
  radius: number;
  spin: number;
  steer: number;
};

/**
 * Finds wheel nodes inside a car model and wraps each in a pivot group centred
 * on the wheel so it can spin (X) and steer (Y) around its own axis.
 */
export function setupWheels(root: THREE.Object3D): WheelRig {
  root.updateMatrixWorld(true);

  const candidates: THREE.Object3D[] = [];
  root.traverse((child) => {
    if (child === root) return;
    if (!WHEEL_RE.test(child.name ?? "")) return;
    // Skip nested matches — keep the outermost wheel node only.
    let parent = child.parent;
    while (parent && parent !== root) {
      if (candidates.includes(parent)) return;
      parent = parent.parent;
    }
    candidates.push(child);
  });

  const rig: WheelRig = { front: [], rear: [], radius: 0.34, spin: 0, steer: 0 };
  if (!candidates.length) return rig;

  const entries = candidates.map((node) => {
    const box = new THREE.Box3().setFromObject(node);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    return { node, center, radius: Math.max(size.y, 0.05) / 2 };
  });

  const localCenters = entries.map((entry) => root.worldToLocal(entry.center.clone()));
  const zs = localCenters.map((v) => v.z);
  const mid = (Math.min(...zs) + Math.max(...zs)) / 2;
  if (Math.max(...zs) - Math.min(...zs) < 0.01) return rig;

  entries.forEach((entry, index) => {
    const node = entry.node;
    const parent = node.parent;
    if (!parent) return;
    const local = parent.worldToLocal(entry.center.clone());
    const pivot = new THREE.Group();
    pivot.position.copy(local);
    parent.add(pivot);
    pivot.add(node);
    node.position.sub(local);
    // Model forward is -Z after normalisation, so front wheels sit below mid.
    if (localCenters[index]!.z < mid) rig.front.push(pivot);
    else rig.rear.push(pivot);
    rig.radius = Math.max(rig.radius, entry.radius);
  });

  return rig;
}

/** Rolls all wheels and steers the front axle. */
export function updateWheels(
  rig: WheelRig,
  opts: { speed: number; steer: number; delta: number; scale?: number },
) {
  if (!rig.front.length && !rig.rear.length) return;
  const radius = Math.max(rig.radius * (opts.scale ?? 1), 0.15);
  rig.spin -= (opts.speed / radius) * opts.delta;
  rig.steer = THREE.MathUtils.lerp(rig.steer, opts.steer * 0.52, 1 - Math.pow(0.0005, opts.delta));

  for (const pivot of rig.front) {
    pivot.rotation.y = rig.steer;
    pivot.rotation.x = rig.spin;
  }
  for (const pivot of rig.rear) {
    pivot.rotation.x = rig.spin;
  }
}
