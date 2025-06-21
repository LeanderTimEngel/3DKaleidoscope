import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TubeSystemProps {
  tubes: Array<{ points: THREE.Vector3[]; id: string; color: string }>;
  currentTube: THREE.Vector3[];
  isDrawing: boolean;
  scale: number;
}

/* Angles (in radians) used to mirror every stroke and create the 6-fold kaleidoscope */
const reflectionAngles = [
  0,
  Math.PI / 3,
  (2 * Math.PI) / 3,
  Math.PI,
  (4 * Math.PI) / 3,
  (5 * Math.PI) / 3,
];

/**
 * Renders all tubes (finished + currently drawn) and applies the kaleidoscope mirroring.
 */
const TubeSystem: React.FC<TubeSystemProps> = ({
  tubes,
  currentTube,
  isDrawing,
  scale,
}) => {
  // Ref to the group so we can apply a subtle auto-rotation
  const group = useRef<THREE.Group>(null!);

  /* ------------------------------------------------------------------ */
  /* Animation – slow Y rotation gives a sense of depth                  */
  /* ------------------------------------------------------------------ */
  useFrame((_, dt) => {
    group.current.rotation.y += dt * 0.1;
  });

  /* ------------------------------------------------------------------ */
  /* Helper – converts an array of points into a TubeGeometry            */
  /* ------------------------------------------------------------------ */
  const createGeometry = (pts: THREE.Vector3[]) => {
    if (pts.length < 2) return null; // needs at least 2 points
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 128, 0.15, 12, false);
  };

  /* ------------------------------------------------------------------ */
  /* Memoised list of meshes – recalculates only when dependencies change*/
  /* ------------------------------------------------------------------ */
  const meshes = useMemo(() => {
    // When drawing, we append a temporary tube so the user sees it live
    const source = isDrawing && currentTube.length > 1
      ? [...tubes, { points: currentTube, id: 'current', color: '#fff' }]
      : tubes;

    // Create mirrored versions for every angle
    return source.flatMap(tube =>
      reflectionAngles.map((angle, i) => {
        // Transform every point -> rotate around Y and add a small wave
        const pts = tube.points.map(p => {
          const v = p.clone();
          v.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle); // rotate around Y
          v.y += Math.sin(angle * 3 + p.x) * 0.3;              // wiggle the tube vertically
          return v;
        });
        const geometry = createGeometry(pts);
        return geometry && {
          geometry,
          color: tube.color,
          key: `${tube.id}-${i}`,
          opacity: i === 0 ? 1 : 0.6, // original stroke fully opaque, reflections semi-transparent
        };
      }).filter(Boolean)
    );
  }, [tubes, currentTube, isDrawing, scale]);

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */
  // scaling effect already declared above – duplicate removed

  return (
    <group ref={group}>
      {meshes.map(tube => (
        <mesh key={tube!.key} geometry={tube!.geometry}>
          <meshStandardMaterial
            color={tube!.color}
            transparent
            opacity={tube!.opacity}
            roughness={0.25}
            metalness={0.6}
          />
        </mesh>
      ))}
    </group>
  );
};

export default TubeSystem; 