import * as THREE from "three";

const WHEEL_RE = /(wheel|tire|tyre|rim|roda|pneu)/i;
const FRONT_RE = /(front|_f[lr]\b|_f[lr]_|\bfl\b|\bfr\b|frente|dianteir)/i;
const REAR_RE = /(rear|back|_b[lr]\b|_b[lr]_|_r[lr]\b|_r[lr]_|\bbl\b|\bbr\b|traseir)/i;

type WheelUnit = {
  pivot: THREE.Group;
  /** Axle axis (car right) expressed in the pivot's parent space. */
  axle: THREE.Vector3;
  /** Steering axis (car up) expressed in the pivot's parent space. */
  up: THREE.Vector3;
};

export type WheelRig = {
  front: WheelUnit[];
  rear: WheelUnit[];
  radius: number;
  spin: number;
  steer: number;
};

/**
 * Finds wheel nodes inside a car model and wraps each in a pivot group centred
 * on the wheel. Rotation axes are derived from the car's own orientation, so
 * wheels roll and steer correctly even when the source rig uses odd bone axes.
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

  // Car axes in world space.
  const worldRight = new THREE.Vector3(1, 0, 0).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())).normalize();
  const worldUp = new THREE.Vector3(0, 1, 0).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())).normalize();

  const entries = candidates.map((node) => {
    const box = new THREE.Box3().setFromObject(node);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    // Radius ignores the thin axle direction.
    const dims = [size.x, size.y, size.z].sort((a, b) => b - a);
    return { node, center, radius: Math.max(dims[1] ?? 0.6, 0.1) / 2 };
  });

  const localCenters = entries.map((entry) => root.worldToLocal(entry.center.clone()));
  const zs = localCenters.map((v) => v.z);
  const mid = (Math.min(...zs) + Math.max(...zs)) / 2;

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

    // Convert car axes into the pivot's parent space (direction only).
    const parentQuatInv = parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    const axle = worldRight.clone().applyQuaternion(parentQuatInv).normalize();
    const up = worldUp.clone().applyQuaternion(parentQuatInv).normalize();

    const name = node.name ?? "";
    let isFront: boolean;
    if (FRONT_RE.test(name)) isFront = true;
    else if (REAR_RE.test(name)) isFront = false;
    // Model forward is -Z after normalisation, so front wheels sit below mid.
    else isFront = (localCenters[index]?.z ?? 0) < mid;

    const unit: WheelUnit = { pivot, axle, up };
    if (isFront) rig.front.push(unit);
    else rig.rear.push(unit);
    rig.radius = Math.max(rig.radius, entry.radius);
  });

  return rig;
}

const _qSpin = new THREE.Quaternion();
const _qSteer = new THREE.Quaternion();

/** Rolls all wheels and steers the front axle. */
export function updateWheels(
  rig: WheelRig,
  opts: { speed: number; steer: number; delta: number; scale?: number },
) {
  if (!rig.front.length && !rig.rear.length) return;
  const radius = Math.max(rig.radius * (opts.scale ?? 1), 0.15);
  rig.spin -= (opts.speed / radius) * opts.delta;
  if (rig.spin > Math.PI * 2 || rig.spin < -Math.PI * 2) rig.spin %= Math.PI * 2;
  rig.steer = THREE.MathUtils.lerp(rig.steer, opts.steer * 0.5, 1 - Math.pow(0.0005, opts.delta));

  for (const unit of rig.front) {
    _qSteer.setFromAxisAngle(unit.up, rig.steer);
    _qSpin.setFromAxisAngle(unit.axle, rig.spin);
    unit.pivot.quaternion.copy(_qSteer).multiply(_qSpin);
  }
  for (const unit of rig.rear) {
    _qSpin.setFromAxisAngle(unit.axle, rig.spin);
    unit.pivot.quaternion.copy(_qSpin);
  }
}
