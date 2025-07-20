import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleSystemProps {
  isDrawing: boolean;
  currentPoint: THREE.Vector3 | null;
  color: string;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ isDrawing, currentPoint, color }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const particlesRef = useRef<Particle[]>([]);
  const geometryRef = useRef<THREE.BufferGeometry>(null!);
  const materialRef = useRef<THREE.PointsMaterial>(null!);
  
  const maxParticles = 500;
  
  // Initialize geometry and material
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);
    
    return { positions, colors, sizes };
  }, []);

  // Create new particles when drawing
  useEffect(() => {
    if (isDrawing && currentPoint) {
      const numNewParticles = 5;
      
      for (let i = 0; i < numNewParticles; i++) {
        if (particlesRef.current.length < maxParticles) {
          const particle: Particle = {
            position: currentPoint.clone().add(
              new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
              )
            ),
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 0.02,
              Math.random() * 0.03 + 0.01,
              (Math.random() - 0.5) * 0.02
            ),
            life: 1.0,
            maxLife: 1.0 + Math.random() * 2.0,
            size: Math.random() * 0.1 + 0.05,
          };
          particlesRef.current.push(particle);
        }
      }
    }
  }, [isDrawing, currentPoint]);

  // Update particles every frame
  useFrame((_, delta) => {
    const particles = particlesRef.current;
    const colorObj = new THREE.Color(color);
    
    // Update particle positions and remove dead particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      
      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(delta));
      
      // Update velocity (gravity and drag)
      particle.velocity.y -= 0.02 * delta; // gravity
      particle.velocity.multiplyScalar(0.98); // drag
      
      // Update life
      particle.life -= delta;
      
      // Remove dead particles
      if (particle.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      
      // Update buffer attributes
      const index = i * 3;
      positions[index] = particle.position.x;
      positions[index + 1] = particle.position.y;
      positions[index + 2] = particle.position.z;
      
      // Color with fade out
      const alpha = particle.life / particle.maxLife;
      colors[index] = colorObj.r * alpha;
      colors[index + 1] = colorObj.g * alpha;
      colors[index + 2] = colorObj.b * alpha;
      
      // Size with fade out
      sizes[i] = particle.size * alpha;
    }
    
    // Update geometry
    if (geometryRef.current) {
      geometryRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometryRef.current.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometryRef.current.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometryRef.current.attributes.position.needsUpdate = true;
      geometryRef.current.attributes.color.needsUpdate = true;
      geometryRef.current.attributes.size.needsUpdate = true;
      geometryRef.current.setDrawRange(0, particles.length);
    }
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry ref={geometryRef}>
          <bufferAttribute
            attach="attributes-position"
            count={maxParticles}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={maxParticles}
            array={colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={maxParticles}
            array={sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={materialRef}
          size={0.1}
          sizeAttenuation={true}
          vertexColors={true}
          transparent={true}
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

export default ParticleSystem; 