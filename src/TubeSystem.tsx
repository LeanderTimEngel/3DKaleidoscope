import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TubeSystemProps {
  tubes: Array<{ points: THREE.Vector3[]; id: string; color: string }>;
  currentTube: THREE.Vector3[];
  isDrawing: boolean;
  scale: number;
}

const reflectionAngles = [
  0,
  Math.PI / 3,
  (2 * Math.PI) / 3,
  Math.PI,
  (4 * Math.PI) / 3,
  (5 * Math.PI) / 3,
];

const TubeSystem: React.FC<TubeSystemProps> = ({
  tubes,
  currentTube,
  isDrawing,
  scale,
}) => {
  const group = useRef<THREE.Group>(null!);

  /* sanfte Rotation – das Auge spürt sofort Raumtiefe */
  useFrame((_, dt) => {
    group.current.rotation.y += dt * 0.1;
  });

  const createGeometry = (pts: THREE.Vector3[]) => {
    if (pts.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 128, 0.15, 12, false);
  };

  const meshes = useMemo(() => {
    const src = isDrawing && currentTube.length > 1
      ? [...tubes, { points: currentTube, id: 'current', color: '#fff' }]
      : tubes;

    return src.flatMap(tube =>
      reflectionAngles.map((angle, i) => {
        const pts = tube.points.map(p => {
          const v = p.clone();
          v.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle * scale);         // Y-Achse mit Scale
          v.y += Math.sin(angle * 3 * scale + p.x) * 0.3;                      // 3D-Welle mit Scale
          return v;
        });
        const geometry = createGeometry(pts);
        return geometry && {
          geometry,
          color: tube.color,
          key: `${tube.id}-${i}`,
          opacity: i === 0 ? 1 : 0.6,
        };
      }).filter(Boolean)
    );
  }, [tubes, currentTube, isDrawing, scale]);

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