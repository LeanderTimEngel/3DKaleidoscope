import { Canvas } from '@react-three/fiber';
import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
  Grid,
  ContactShadows,
} from '@react-three/drei';
import { Suspense, useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import TubeSystem from './TubeSystem.tsx';

export default function App() {
  const [tubes, setTubes] = useState<Array<{ points: THREE.Vector3[]; id: string; color: string }>>([]);
  const [currentTube, setCurrentTube] = useState<THREE.Vector3[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [currentColor, setCurrentColor] = useState('#ff6d6d');
  
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);

  const colors = ['#ff6d6d', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];

  const getIntersectionPoint = useCallback((event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (!cameraRef.current) return new THREE.Vector3();
    
    raycaster.current.setFromCamera(mouse.current, cameraRef.current);
    const intersectionPoint = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(plane.current, intersectionPoint);
    
    return intersectionPoint;
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (event.button === 0) { // Left click - start drawing
      setIsDrawing(true);
      const point = getIntersectionPoint(event);
      setCurrentTube([point]);
    }
  }, [getIntersectionPoint]);

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (isDrawing && event.buttons === 1) { // Left click drag - continue drawing
      const point = getIntersectionPoint(event);
      setCurrentTube(prev => {
        if (prev.length === 0) return [point];
        const last = prev[prev.length - 1];
        if (last.distanceToSquared(point) > 0.001) {
          return [...prev, point];
        }
        return prev;
      });
    }
  }, [isDrawing, getIntersectionPoint]);

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    if (event.button === 0 && isDrawing) { // Left click release - finish drawing
      setIsDrawing(false);
      if (currentTube.length > 1) {
        const newTube = {
          id: `tube-${Date.now()}`,
          color: currentColor,
          points: [...currentTube]
        };
        setTubes(prev => [...prev, newTube]);
      }
      setCurrentTube([]);
    }
  }, [isDrawing, currentTube, currentColor]);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault(); // Prevent default right-click menu
  }, []);

  const clearAll = useCallback(() => {
    setTubes([]);
    setCurrentTube([]);
    setIsDrawing(false);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Controls Panel */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.8)',
        padding: 20,
        borderRadius: 10,
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h3 style={{ margin: '0 0 15px 0' }}>3D Kaleidoscope Controls</h3>
        
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', marginBottom: 5 }}>Scale: {scale.toFixed(2)}</label>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            style={{ width: '200px' }}
          />
        </div>

        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', marginBottom: 5 }}>Color:</label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                style={{
                  width: 30,
                  height: 30,
                  backgroundColor: color,
                  border: currentColor === color ? '3px solid white' : '1px solid #333',
                  borderRadius: '50%',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={clearAll}
          style={{
            background: '#ff4757',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 5,
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Clear All
        </button>

        <div style={{ marginTop: 15, fontSize: '12px', opacity: 0.8 }}>
          <div>Left-click: Draw tubes</div>
          <div>Right-click: Rotate camera</div>
          <div>Middle-click: Zoom</div>
        </div>
      </div>

      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
        style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
      >
        <color attach="background" args={['#111']} />

        {/* Kamera */}
        <PerspectiveCamera ref={cameraRef} makeDefault fov={45} position={[0, 2, 8]} />

        {/* Licht */}
        <ambientLight intensity={0.5} />
        <directionalLight
          castShadow
          position={[5, 5, 5]}
          intensity={1}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {/* HDR-Umgebung (Warehouse-HDRI) */}
        <Environment preset="warehouse" />

        {/* Boden + Echtzeit-Schlagschatten */}
        <Grid args={[10, 10]} />
        <ContactShadows position={[0, -1.4, 0]} scale={10} blur={2.5} opacity={0.4} />

        {/* Dein Kaleidoskop */}
        <Suspense fallback={null}>
          <TubeSystem
            tubes={tubes}
            currentTube={currentTube}
            isDrawing={isDrawing}
            scale={scale}
          />
        </Suspense>

        {/* Steuerung - nur für rechte Maustaste und Zoom */}
        <OrbitControls 
          enablePan={false}
          mouseButtons={{
            LEFT: undefined,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
          }}
        />
      </Canvas>
    </div>
  );
} 