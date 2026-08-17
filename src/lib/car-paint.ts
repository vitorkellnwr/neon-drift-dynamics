import * as THREE from "three";
import type { CarCustomization } from "@/lib/garage";

const SKIP = /(glass|window|light|lamp|glow|tire|tyre|rubber|wheel)/i;

const FINISH_PROPS: Record<CarCustomization["finish"], { roughness: number; metalness: number }> = {
  gloss: { roughness: 0.24, metalness: 0.55 },
  matte: { roughness: 0.88, metalness: 0.1 },
  chrome: { roughness: 0.06, metalness: 1 },
};

/** Recolours body panels of a cloned car model in place. */
export function applyPaint(root: THREE.Object3D, custom: CarCustomization) {
  const props = FINISH_PROPS[custom.finish];
  const color = new THREE.Color(custom.paint);

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mesh.material = materials.map((material) => {
      if (!material) return material;
      if (SKIP.test(material.name ?? "") || SKIP.test(mesh.name ?? "")) return material;
      const next = material.clone() as THREE.MeshStandardMaterial;
      if ("color" in next) next.color = color.clone();
      if ("roughness" in next) next.roughness = props.roughness;
      if ("metalness" in next) next.metalness = props.metalness;
      if ("emissive" in next && next.emissive) {
        next.emissive = color.clone().multiplyScalar(custom.finish === "matte" ? 0.02 : 0.08);
      }
      return next;
    }) as THREE.Material[] as unknown as THREE.Material;
    if (Array.isArray(mesh.material) && mesh.material.length === 1) mesh.material = mesh.material[0]!;
  });
}
