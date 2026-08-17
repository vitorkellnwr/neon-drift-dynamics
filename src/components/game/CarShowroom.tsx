import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { applyPaint } from "@/lib/car-paint";
import { DEFAULT_CUSTOMIZATION, type CarCustomization } from "@/lib/garage";

function normalize(scene: THREE.Object3D, targetSize: number) {
  const clone = scene.clone(true);
  const box = new THREE.Box3().setFromObject(clone);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxAxis;
  clone.position.set(-center.x, -box.min.y, -center.z);
  const group = new THREE.Group();
  group.add(clone);
  group.scale.setScalar(scale);
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return group;
}

function ShowroomCar({
  url,
  customization,
  rotationRef,
  autoRef,
}: {
  url: string;
  customization: CarCustomization;
  rotationRef: React.RefObject<number>;
  autoRef: React.RefObject<boolean>;
}) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const group = normalize(scene, 3.4);
    applyPaint(group, customization);
    return group;
  }, [scene, customization]);
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;
    if (autoRef.current) rotationRef.current += delta * 0.22;
    group.current.rotation.y = rotationRef.current ?? 0;
    group.current.position.y = Math.sin(performance.now() / 1600) * 0.05;
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

function TurntableFloor({ underglow }: { underglow: string }) {
  return (
    <group position={[0, -0.02, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.9, 64]} />
        <meshStandardMaterial color="#0a1020" roughness={0.28} metalness={0.65} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[2.82, 2.94, 96]} />
        <meshBasicMaterial color="#33d6ff" toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[2.05, 2.1, 96]} />
        <meshBasicMaterial color={underglow} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function CarShowroom({
  url,
  offsetX = 0,
  customization = DEFAULT_CUSTOMIZATION,
}: {
  url: string;
  offsetX?: number;
  customization?: CarCustomization;
}) {
  const rotationRef = useRef(0.6);
  const autoRef = useRef(true);
  const dragging = useRef(false);
  const lastX = useRef(0);

  useEffect(() => {
    const up = () => {
      dragging.current = false;
      autoRef.current = true;
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  return (
    <div
      className="h-full w-full cursor-grab active:cursor-grabbing"
      onPointerDown={(event) => {
        dragging.current = true;
        autoRef.current = false;
        lastX.current = event.clientX;
      }}
      onPointerMove={(event) => {
        if (!dragging.current) return;
        rotationRef.current += (event.clientX - lastX.current) * 0.01;
        lastX.current = event.clientX;
      }}
    >
      <Canvas shadows="basic" camera={{ position: [0, 2.4, 8.4], fov: 34 }} dpr={[1, 2]}>
        <color attach="background" args={["#070a13"]} />
        <fog attach="fog" args={["#070a13", 11, 26]} />
        <ambientLight intensity={0.8} />
        <hemisphereLight intensity={0.9} color="#9ad8ff" groundColor="#141a2c" />
        <directionalLight position={[4, 8, 5]} intensity={1.8} castShadow color="#9ad8ff" />
        <spotLight position={[-6, 5, -4]} intensity={70} color="#ff3ba7" angle={0.8} penumbra={1} />
        <spotLight position={[6, 4, -5]} intensity={55} color="#22e6ff" angle={0.9} penumbra={1} />
        <group position={[offsetX, -0.85, 0]}>
          <ShowroomCar
            key={url}
            url={url}
            customization={customization}
            rotationRef={rotationRef}
            autoRef={autoRef}
          />
          <TurntableFloor underglow={customization.underglow} />
          <pointLight position={[0, 0.1, 0]} intensity={9} distance={5} color={customization.underglow} />
        </group>
      </Canvas>
    </div>
  );
}
