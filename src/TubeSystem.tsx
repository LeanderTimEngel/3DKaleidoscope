import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface TubeData {
  points: THREE.Vector3[];
  id: string;
  color: string;
  material: 'standard' | 'metallic' | 'glass' | 'emissive';
  thickness: number;
  style: 'solid' | 'dotted' | 'dashed' | 'spiral';
}

interface TubeSystemProps {
  tubes: TubeData[];
  currentTube: THREE.Vector3[];
  isDrawing: boolean;
  scale: number;
  symmetryMode: 'none' | '4fold' | '6fold' | '8fold' | 'mandala';
  currentMaterial: 'standard' | 'metallic' | 'glass' | 'emissive';
  currentThickness: number;
  currentStyle: 'solid' | 'dotted' | 'dashed' | 'spiral';
  currentColor: string;
}

// Different symmetry patterns
const getSymmetryAngles = (mode: string) => {
  switch (mode) {
    case '4fold': return [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    case '6fold': return [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];
    case '8fold': return [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];
    case 'mandala': return Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);
    case 'none': return [0];
    default: return [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];
  }
};

/**
 * Renders all tubes (finished + currently drawn) and applies the kaleidoscope mirroring.
 */
const TubeSystem: React.FC<TubeSystemProps> = ({
  tubes,
  currentTube,
  isDrawing,
  scale,
  symmetryMode,
  currentMaterial,
  currentThickness,
  currentStyle,
  currentColor,
}) => {
  // Ref to the group so we can apply a subtle auto-rotation
  const group = useRef<THREE.Group>(null!);

  /* ------------------------------------------------------------------ */
  /* Animation – slow Y rotation gives a sense of depth                  */
  /* ------------------------------------------------------------------ */
  useFrame((_, dt) => {
    if (symmetryMode !== 'none') {
      group.current.rotation.y += dt * 0.1;
    }
  });

  /* ------------------------------------------------------------------ */
  /* Apply uniform scaling whenever the slider changes                   */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    group.current.scale.set(scale, scale, scale);
  }, [scale]);

  /* ------------------------------------------------------------------ */
  /* Helper – converts an array of points into a TubeGeometry            */
  /* ------------------------------------------------------------------ */
  const createGeometry = (pts: THREE.Vector3[], thickness: number, style: string) => {
    if (pts.length < 2) return null;
    
    let processedPoints = [...pts];
    
    // Modify points based on style
    if (style === 'spiral') {
      processedPoints = pts.map((p, i) => {
        const spiralOffset = Math.sin(i * 0.5) * 0.1;
        return new THREE.Vector3(
          p.x + spiralOffset * Math.cos(i * 0.3),
          p.y,
          p.z + spiralOffset * Math.sin(i * 0.3)
        );
      });
    } else if (style === 'dotted') {
      // Create gaps by removing every other segment
      processedPoints = pts.filter((_, i) => i % 3 !== 1);
    } else if (style === 'dashed') {
      // Create dashes by removing segments in a pattern
      processedPoints = pts.filter((_, i) => Math.floor(i / 5) % 2 === 0);
    }
    
    if (processedPoints.length < 2) return null;
    
    const curve = new THREE.CatmullRomCurve3(processedPoints);
    return new THREE.TubeGeometry(curve, 128, thickness, 12, false);
  };

  /* ------------------------------------------------------------------ */
  /* Helper – renders material based on type                             */
  /* ------------------------------------------------------------------ */
  const renderMaterial = (color: string, materialType: string, opacity: number = 1) => {
    switch (materialType) {
      case 'metallic':
        return (
          <meshStandardMaterial
            color={color}
            metalness={0.9}
            roughness={0.1}
            transparent={opacity < 1}
            opacity={opacity}
          />
        );
      
      case 'glass':
        return (
          <meshPhysicalMaterial
            color={color}
            metalness={0}
            roughness={0}
            transmission={0.9}
            transparent={true}
            opacity={0.3}
            ior={1.5}
            thickness={0.5}
          />
        );
      
      case 'emissive':
        return (
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            transparent={opacity < 1}
            opacity={opacity}
          />
        );
      
      default: // 'standard'
        return (
          <meshStandardMaterial
            color={color}
            transparent={opacity < 1}
            opacity={opacity}
            roughness={0.25}
            metalness={0.6}
          />
        );
    }
  };

  /* ------------------------------------------------------------------ */
  /* Memoised list of meshes – recalculates only when dependencies change*/
  /* ------------------------------------------------------------------ */
  const meshes = useMemo(() => {
    // When drawing, we append a temporary tube so the user sees it live
    const source = isDrawing && currentTube.length > 1
      ? [...tubes, { 
          points: currentTube, 
          id: 'current', 
          color: currentColor,
          material: currentMaterial,
          thickness: currentThickness,
          style: currentStyle
        }]
      : tubes;

    const reflectionAngles = getSymmetryAngles(symmetryMode);

    // Create mirrored versions for every angle
    return source.flatMap(tube =>
      reflectionAngles.map((angle, i) => {
        // Transform every point -> rotate around Y and add variations
        const pts = tube.points.map(p => {
          const v = p.clone();
          v.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle); // rotate around Y
          
          // Add subtle variations for different symmetry modes
          if (symmetryMode === 'mandala') {
            v.y += Math.sin(angle * 3 + p.x) * 0.2;
          } else if (i > 0) {
            v.y += Math.sin(angle * 2 + p.x) * 0.1;
          }
          
          return v;
        });
        
        const geometry = createGeometry(pts, tube.thickness || 0.15, tube.style || 'solid');
        return geometry && {
          geometry,
          color: tube.color,
          material: tube.material || 'standard',
          key: `${tube.id}-${i}`,
          opacity: i === 0 ? 1 : 0.6, // original stroke fully opaque, reflections semi-transparent
        };
      }).filter(Boolean)
    );
  }, [tubes, currentTube, isDrawing, symmetryMode, currentMaterial, currentThickness, currentStyle, currentColor]);

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */
      return (
      <group ref={group}>
        {meshes.map(tube => (
          <mesh key={tube!.key} geometry={tube!.geometry}>
            {renderMaterial(tube!.color, tube!.material!, tube!.opacity)}
          </mesh>
        ))}
      </group>
    );
};

export default TubeSystem; 