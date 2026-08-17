import * as THREE from "three";

/** Browser-only particle + decal helpers used by the race scene. */

function softCircleTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Tyre smoke: pooled points that drift upward, grow and fade. */
export class SmokeSystem {
  readonly object: THREE.Points;
  private count: number;
  private cursor = 0;
  private life: Float32Array;
  private maxLife: Float32Array;
  private velocity: Float32Array;
  private positions: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;

  constructor(count = 420) {
    this.count = count;
    this.life = new Float32Array(count);
    this.maxLife = new Float32Array(count);
    this.velocity = new Float32Array(count * 3);
    this.positions = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.alphas = new Float32Array(count);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute("aAlpha", new THREE.BufferAttribute(this.alphas, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uMap: { value: softCircleTexture() },
        uColor: { value: new THREE.Color("#c9d6ef") },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (320.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(uColor, tex.a * vAlpha);
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
    });

    this.object = new THREE.Points(geometry, material);
    this.object.frustumCulled = false;
  }

  spawn(x: number, y: number, z: number, intensity: number) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    const i3 = i * 3;
    this.positions[i3] = x + (Math.random() - 0.5) * 0.5;
    this.positions[i3 + 1] = y + 0.1;
    this.positions[i3 + 2] = z + (Math.random() - 0.5) * 0.5;
    this.velocity[i3] = (Math.random() - 0.5) * 1.6;
    this.velocity[i3 + 1] = 0.9 + Math.random() * 1.4;
    this.velocity[i3 + 2] = (Math.random() - 0.5) * 1.6;
    this.maxLife[i] = 0.9 + Math.random() * 0.9;
    this.life[i] = this.maxLife[i]!;
    this.sizes[i] = 1.2 + intensity * 2.4;
    this.alphas[i] = 0;
  }

  update(delta: number) {
    for (let i = 0; i < this.count; i++) {
      if (this.life[i]! <= 0) {
        if (this.alphas[i] !== 0) this.alphas[i] = 0;
        continue;
      }
      const i3 = i * 3;
      this.life[i] = this.life[i]! - delta;
      const t = Math.max(this.life[i]! / this.maxLife[i]!, 0);
      this.positions[i3] = this.positions[i3]! + this.velocity[i3]! * delta;
      this.positions[i3 + 1] = this.positions[i3 + 1]! + this.velocity[i3 + 1]! * delta;
      this.positions[i3 + 2] = this.positions[i3 + 2]! + this.velocity[i3 + 2]! * delta;
      this.velocity[i3] = this.velocity[i3]! * (1 - 1.1 * delta);
      this.velocity[i3 + 2] = this.velocity[i3 + 2]! * (1 - 1.1 * delta);
      this.sizes[i] = this.sizes[i]! + delta * 3.2;
      // Puff in fast, fade out slow.
      this.alphas[i] = Math.min(t * 1.6, (1 - t) * 5) * 0.42;
    }
    const geometry = this.object.geometry;
    geometry.getAttribute("position").needsUpdate = true;
    geometry.getAttribute("aSize").needsUpdate = true;
    geometry.getAttribute("aAlpha").needsUpdate = true;
  }

  dispose() {
    this.object.geometry.dispose();
    (this.object.material as THREE.Material).dispose();
  }
}

/** Rubber marks left on the asphalt, drawn as a pooled ring of dark quads. */
export class SkidMarks {
  readonly object: THREE.InstancedMesh;
  private cursor = 0;
  private count: number;
  private matrix = new THREE.Matrix4();
  private quat = new THREE.Quaternion();
  private scale = new THREE.Vector3(0.34, 1, 0.9);
  private position = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(count = 1400) {
    this.count = count;
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      color: "#07080b",
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Park every instance out of sight until it is used.
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < count; i++) mesh.setMatrixAt(i, hidden);
    this.object = mesh;
  }

  add(x: number, y: number, z: number, heading: number, normal: THREE.Vector3, width = 0.34) {
    this.position.set(x, y + 0.03, z);
    const tilt = new THREE.Quaternion().setFromUnitVectors(this.up, normal);
    this.quat.setFromAxisAngle(this.up, heading);
    this.quat.premultiply(tilt);
    this.scale.set(width, 1, 1.1);
    this.matrix.compose(this.position, this.quat, this.scale);
    this.object.setMatrixAt(this.cursor, this.matrix);
    this.cursor = (this.cursor + 1) % this.count;
    this.object.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.object.geometry.dispose();
    (this.object.material as THREE.Material).dispose();
  }
}

/** Sparks for wall scrapes. */
export class SparkSystem {
  readonly object: THREE.Points;
  private count: number;
  private cursor = 0;
  private life: Float32Array;
  private velocity: Float32Array;
  private positions: Float32Array;
  private alphas: Float32Array;

  constructor(count = 180) {
    this.count = count;
    this.life = new Float32Array(count);
    this.velocity = new Float32Array(count * 3);
    this.positions = new Float32Array(count * 3);
    this.alphas = new Float32Array(count);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute("aAlpha", new THREE.BufferAttribute(this.alphas, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color("#ffb347") } },
      vertexShader: /* glsl */ `
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 90.0 / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          gl_FragColor = vec4(uColor, vAlpha * (1.0 - d * 2.0));
        }
      `,
    });
    this.object = new THREE.Points(geometry, material);
    this.object.frustumCulled = false;
  }

  burst(x: number, y: number, z: number, amount = 10) {
    for (let n = 0; n < amount; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.count;
      const i3 = i * 3;
      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;
      this.velocity[i3] = (Math.random() - 0.5) * 9;
      this.velocity[i3 + 1] = Math.random() * 5;
      this.velocity[i3 + 2] = (Math.random() - 0.5) * 9;
      this.life[i] = 0.3 + Math.random() * 0.35;
      this.alphas[i] = 1;
    }
  }

  update(delta: number) {
    for (let i = 0; i < this.count; i++) {
      if (this.life[i]! <= 0) {
        this.alphas[i] = 0;
        continue;
      }
      const i3 = i * 3;
      this.life[i] = this.life[i]! - delta;
      this.velocity[i3 + 1] = this.velocity[i3 + 1]! - 18 * delta;
      this.positions[i3] = this.positions[i3]! + this.velocity[i3]! * delta;
      this.positions[i3 + 1] = this.positions[i3 + 1]! + this.velocity[i3 + 1]! * delta;
      this.positions[i3 + 2] = this.positions[i3 + 2]! + this.velocity[i3 + 2]! * delta;
      this.alphas[i] = Math.max(this.life[i]! * 2.4, 0);
    }
    this.object.geometry.getAttribute("position").needsUpdate = true;
    this.object.geometry.getAttribute("aAlpha").needsUpdate = true;
  }

  dispose() {
    this.object.geometry.dispose();
    (this.object.material as THREE.Material).dispose();
  }
}
