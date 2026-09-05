import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const ACCENT = "#FF6B2C";
const NODE_COUNT = 5;
const NODE_RADIUS = 2.45;

/** Satellite positions on a ring around the core. */
function useNodes() {
  return useMemo(
    () =>
      Array.from({ length: NODE_COUNT }, (_, i) => {
        const a = (i / NODE_COUNT) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(a) * NODE_RADIUS,
          (i % 2 === 0 ? 0.42 : -0.34),
          Math.sin(a) * NODE_RADIUS
        );
      }),
    []
  );
}

function Core() {
  const ref = useRef();

  useFrame((state, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.14;
  });

  return (
    <group ref={ref}>
      {/* Machined hexagonal body */}
      <mesh castShadow>
        <cylinderGeometry args={[1.18, 1.18, 0.52, 6]} />
        <meshStandardMaterial color="#17181B" metalness={0.92} roughness={0.34} />
      </mesh>

      {/* Chamfered upper plate, slightly inset */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.92, 1.06, 0.1, 6]} />
        <meshStandardMaterial color="#202226" metalness={0.95} roughness={0.28} />
      </mesh>

      {/* The only emissive element: a thin inlaid ring */}
      <mesh position={[0, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.6, 6]} />
        <meshBasicMaterial color={ACCENT} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Nodes({ nodes }) {
  const ref = useRef();

  useFrame((state, delta) => {
    if (ref.current) ref.current.rotation.y -= delta * 0.06;
  });

  return (
    <group ref={ref}>
      {nodes.map((p, i) => (
        <group key={i} position={p}>
          <mesh>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="#1B1D21" metalness={0.9} roughness={0.32} />
          </mesh>
          <mesh scale={1.02}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshBasicMaterial color={ACCENT} wireframe transparent opacity={0.22} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Hairline links from core to each node */}
      {nodes.map((p, i) => {
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), p]);
        return (
          <line key={`l-${i}`} geometry={geo}>
            <lineBasicMaterial color={ACCENT} transparent opacity={0.28} toneMapped={false} />
          </line>
        );
      })}
    </group>
  );
}

function Orbit() {
  const geo = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, NODE_RADIUS, NODE_RADIUS, 0, Math.PI * 2);
    const pts = curve.getPoints(96).map((p) => new THREE.Vector3(p.x, 0, p.y));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  return (
    <line geometry={geo} rotation={[0, 0, 0]}>
      <lineBasicMaterial color="#FFFFFF" transparent opacity={0.09} />
    </line>
  );
}

function Motes({ count = 60 }) {
  const ref = useRef();

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const r = 1.8 + Math.random() * 2.6;
      const a = Math.random() * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 1.8;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.032} color={ACCENT} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

/** Whole assembly floats and leans toward the pointer. */
function Rig({ children }) {
  const ref = useRef();
  const { pointer } = useThree();

  useFrame((state, delta) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = Math.sin(t * 0.5) * 0.07;
    // Damped lean rather than a direct map, so it settles instead of tracking.
    ref.current.rotation.x = THREE.MathUtils.damp(ref.current.rotation.x, -pointer.y * 0.16, 3, delta);
    ref.current.rotation.z = THREE.MathUtils.damp(ref.current.rotation.z, pointer.x * 0.1, 3, delta);
  });

  return <group ref={ref}>{children}</group>;
}

export default function ProofCore({ className = "" }) {
  const nodes = useNodes();
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className={`h-full w-full ${className}`} aria-hidden="true">
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [0, 2.6, 5.6], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        frameloop={reduce ? "demand" : "always"}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 3]} intensity={1.1} />
        <pointLight position={[0, 1.4, 0]} intensity={7} distance={5} color={ACCENT} />
        <pointLight position={[-4, -2, -3]} intensity={2} color="#FFFFFF" />

        <Suspense fallback={null}>
          <Rig>
            <group rotation={[0.32, 0, 0]}>
              <Core />
              <Nodes nodes={nodes} />
              <Orbit />
              <Motes />
            </group>
          </Rig>
        </Suspense>
      </Canvas>
    </div>
  );
}
