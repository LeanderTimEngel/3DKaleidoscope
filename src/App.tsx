import { Canvas } from '@react-three/fiber';
import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
  Grid,
  ContactShadows,
} from '@react-three/drei';
// import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing';
import { Suspense, useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import TubeSystem, { TubeData } from './TubeSystem';
import ParticleSystem from './ParticleSystem';

/**
 * Main application component – handles UI, drawing logic and renders the Three.js scene.
 */
export default function App() {
  /* ====================================================================== */
  /* ──────────────────────────── State hooks ───────────────────────────── */
  /* ====================================================================== */

  // All finished tubes the user already drew
  const [tubes, setTubes] = useState<TubeData[]>([]);
  // Points of the tube currently being drawn
  const [currentTube, setCurrentTube] = useState<THREE.Vector3[]>([]);
  // Whether the user is currently drawing (left-mouse button pressed)
  const [isDrawing, setIsDrawing] = useState(false);
  // Uniform that controls the kaleidoscope scale (adjustable via slider)
  const [scale, setScale] = useState(1.0);
  // Active colour used for the next stroke
  const [currentColor, setCurrentColor] = useState('#ff6d6d');
  
  // New features
  const [symmetryMode, setSymmetryMode] = useState<'none' | '4fold' | '6fold' | '8fold' | 'mandala'>('6fold');
  const [currentMaterial, setCurrentMaterial] = useState<'standard' | 'metallic' | 'glass' | 'emissive'>('standard');
  const [currentThickness, setCurrentThickness] = useState(0.15);
  const [currentStyle, setCurrentStyle] = useState<'solid' | 'dotted' | 'dashed' | 'spiral'>('solid');
  const [enablePostProcessing, setEnablePostProcessing] = useState(false);
  const [currentPoint, setCurrentPoint] = useState<THREE.Vector3 | null>(null);
  const [eraserMode, setEraserMode] = useState(false);

  /* ====================================================================== */
  /* ───────────────────────── Three.js helpers ─────────────────────────── */
  /* ====================================================================== */

  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);          // reference to scene camera
  const raycaster  = useRef(new THREE.Raycaster());                  // for mouse ‑> 3D conversion
  const mouse      = useRef(new THREE.Vector2());
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)); // y-up ground plane
  const drawPlaneRef = useRef<THREE.Plane | null>(null);             // dynamic plane perpendicular to camera for free-space drawing

  /* Pre-defined palette of colours */
  const colors = ['#ff6d6d', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];

  // World-space grid snapping size (must match visible grid spacing)
  const GRID_STEP = 0.5; // must match Grid cell size so strokes cling to raster
  const POINT_EPSILON = 0.01; // minimum squared distance between recorded points (higher accuracy)

  /* ====================================================================== */
  /* ───────────────────── Utility – screen → plane point ────────────────── */
  /* ====================================================================== */

  /**
   * Converts a pointer event to a 3D point on the current drawing plane.
   */
  const getIntersectionPoint = useCallback((event: React.MouseEvent): THREE.Vector3 => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();

    // Normalised device coords (NDC)
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (!cameraRef.current) return new THREE.Vector3();

    // Cast a ray from the camera through the mouse position
    raycaster.current.setFromCamera(mouse.current, cameraRef.current);

    const intersectionPoint = new THREE.Vector3();
    // Prefer the temporary drawing plane, fall back to the ground plane
    (drawPlaneRef.current ?? groundPlane.current).intersectLine(
      new THREE.Line3(
        raycaster.current.ray.origin,
        raycaster.current.ray.origin.clone().add(raycaster.current.ray.direction.clone().multiplyScalar(1000))
      ),
      intersectionPoint,
    );

    /* ── Snap to raster ──────────────────────────────────────────────── */
    intersectionPoint.set(
      Math.round(intersectionPoint.x / GRID_STEP) * GRID_STEP,
      Math.round(intersectionPoint.y / GRID_STEP) * GRID_STEP,
      Math.round(intersectionPoint.z / GRID_STEP) * GRID_STEP,
    );
    return intersectionPoint;
  }, []);

  /* ====================================================================== */
  /* ──────────────────────────── Handlers ──────────────────────────────── */
  /* ====================================================================== */

  /** Left mouse down – start drawing a new tube or erasing */
  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (event.button !== 0) return; // ignore non-left clicks

    const startPoint = getIntersectionPoint(event);
    setCurrentPoint(startPoint);

    if (eraserMode) {
      // Find and remove nearby tubes
      const tolerance = 0.5;
      setTubes(prev => prev.filter(tube => 
        !tube.points.some(point => point.distanceTo(startPoint) < tolerance)
      ));
      return;
    }

    // Create a temporary drawing plane perpendicular to the camera through the start point
    if (cameraRef.current) {
      const planeNormal = cameraRef.current.getWorldDirection(new THREE.Vector3()).clone();
      drawPlaneRef.current = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, startPoint.clone());
    }

    setCurrentTube([startPoint]);
    setIsDrawing(true);
  }, [getIntersectionPoint, eraserMode]);

  /** Mouse move – append points while user is drawing */
  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    const point = getIntersectionPoint(event);
    setCurrentPoint(point);

    if (!isDrawing || event.buttons !== 1 || eraserMode) return;

    setCurrentTube(prev => {
      if (prev.length === 0) return [point];
      const last = prev[prev.length - 1];
      // Only add the point if the cursor moved far enough – keeps tube resolution in check
      if (last.distanceToSquared(point) > POINT_EPSILON) {
        return [...prev, point];
      }
      return prev;
    });
  }, [isDrawing, getIntersectionPoint, eraserMode]);

  /** Left mouse up – commit the current tube */
  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    if (event.button !== 0 || !isDrawing || eraserMode) return;

    setIsDrawing(false);

    if (currentTube.length > 1) {
      const newTube: TubeData = {
        id: `tube-${Date.now()}`,
        color: currentColor,
        points: [...currentTube],
        material: currentMaterial,
        thickness: currentThickness,
        style: currentStyle,
      };
      setTubes(prev => [...prev, newTube]);
    }

    // clear temporary data
    setCurrentTube([]);
    drawPlaneRef.current = null;
  }, [isDrawing, currentTube, currentColor, currentMaterial, currentThickness, currentStyle, eraserMode]);

  /** Disable default context menu so right-click rotates camera */
  const handleContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

  /** Remove all strokes */
  const clearAll = useCallback(() => {
    setTubes([]);
    setCurrentTube([]);
    setIsDrawing(false);
  }, []);

  /* ====================================================================== */
  /* ───────────────────────────── JSX ───────────────────────────────────── */
  /* ====================================================================== */

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* =============================== UI / HUD =============================== */}
      <div className="controls">
        <h1>Enhanced Kaleidoscope</h1>
        <p>
          <em>Left-click &amp; drag</em> to draw tubes<br />
          <em>Right-click &amp; drag</em> to rotate camera<br />
          <em>Middle-click</em> to zoom
        </p>

        {/* -------- Tool Mode -------- */}
        <div className="tool-mode">
          <button 
            className={`mode-btn ${!eraserMode ? 'active' : ''}`}
            onClick={() => setEraserMode(false)}
          >
            Draw
          </button>
          <button 
            className={`mode-btn ${eraserMode ? 'active' : ''}`}
            onClick={() => setEraserMode(true)}
          >
            Erase
          </button>
        </div>

        {/* -------- Symmetry Mode -------- */}
        <div className="symmetry-controls">
          <span>Symmetry:</span>
          <select value={symmetryMode} onChange={(e) => setSymmetryMode(e.target.value as any)}>
            <option value="none">None</option>
            <option value="4fold">4-Fold</option>
            <option value="6fold">6-Fold</option>
            <option value="8fold">8-Fold</option>
            <option value="mandala">Mandala</option>
          </select>
        </div>

        {/* -------- Material Type -------- */}
        <div className="material-controls">
          <span>Material:</span>
          <select value={currentMaterial} onChange={(e) => setCurrentMaterial(e.target.value as any)}>
            <option value="standard">Standard</option>
            <option value="metallic">Metallic</option>
            <option value="glass">Glass</option>
            <option value="emissive">Emissive</option>
          </select>
        </div>

        {/* -------- Brush Style -------- */}
        <div className="style-controls">
          <span>Style:</span>
          <select value={currentStyle} onChange={(e) => setCurrentStyle(e.target.value as any)}>
            <option value="solid">Solid</option>
            <option value="dotted">Dotted</option>
            <option value="dashed">Dashed</option>
            <option value="spiral">Spiral</option>
          </select>
        </div>

        {/* -------- Thickness slider -------- */}
        <div className="slider-wrapper">
          <span>Thickness:</span>
          <input
            type="range"
            min="0.05"
            max="0.5"
            step="0.05"
            value={currentThickness}
            onChange={(e) => setCurrentThickness(parseFloat(e.target.value))}
          />
          <span>{currentThickness.toFixed(2)}</span>
        </div>

        {/* -------- scale slider -------- */}
        <div className="slider-wrapper">
          <span>Scale:</span>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
          />
          <span>{scale.toFixed(1)}</span>
        </div>

        {/* -------- colour palette -------- */}
        <div className="colors">
          {colors.map(color => (
            <button
              key={color}
              className={`color-btn ${currentColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setCurrentColor(color)}
            />
          ))}
        </div>

        {/* -------- Effects Toggle -------- */}
        <div className="effects-toggle">
          <label>
            <input
              type="checkbox"
              checked={enablePostProcessing}
              onChange={(e) => setEnablePostProcessing(e.target.checked)}
            />
            Post-Processing Effects (disabled - fixing compatibility)
          </label>
        </div>

        {/* -------- clear button -------- */}
        <button className="btn-clear" onClick={clearAll}>Clear</button>
      </div>

      {/* ======================= THREE.JS SCENE (R3F) ======================= */}
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
        style={{ cursor: isDrawing ? 'crosshair' : eraserMode ? 'not-allowed' : 'default' }}
      >
        {/* Scene background colour */}
        <color attach="background" args={["#111"]} />

        {/* ---------------- camera ---------------- */}
        <PerspectiveCamera ref={cameraRef} makeDefault fov={45} position={[0, 2, 8]} />

        {/* ---------------- lights ---------------- */}
        <ambientLight intensity={0.5} />
        <directionalLight
          castShadow
          position={[5, 5, 5]}
          intensity={1}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {/* HDR environment for subtle reflections */}
        <Environment preset="warehouse" />

        {/* Ground grid & contact shadows */}
        <Grid args={[10, 10]} />
        <ContactShadows position={[0, -1.4, 0]} scale={10} blur={2.5} opacity={0.4} />

        {/* -------------- Kaleidoscope tubes -------------- */}
        <Suspense fallback={null}>
          <TubeSystem
            tubes={tubes}
            currentTube={currentTube}
            isDrawing={isDrawing}
            scale={scale}
            symmetryMode={symmetryMode}
            currentMaterial={currentMaterial}
            currentThickness={currentThickness}
            currentStyle={currentStyle}
            currentColor={currentColor}
          />
          
          {/* -------------- Particle System -------------- */}
          <ParticleSystem
            isDrawing={isDrawing}
            currentPoint={currentPoint}
            color={currentColor}
          />
        </Suspense>

        {/* OrbitControls – only rotate & zoom (left button disabled) */}
        <OrbitControls
          enablePan={false}
          mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
        />

        {/* -------------- Post-Processing Effects (disabled for now) -------------- */}
        {/* {enablePostProcessing && (
          <EffectComposer>
            <Bloom 
              intensity={0.5} 
              luminanceThreshold={0.4} 
              luminanceSmoothing={0.3} 
            />
            <DepthOfField 
              focusDistance={0.1} 
              focalLength={0.05} 
              bokehScale={3} 
            />
          </EffectComposer>
        )} */}
      </Canvas>
    </div>
  );
} 