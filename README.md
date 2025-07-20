# 3D Kaleidoscope

An interactive 3D kaleidoscope where you draw tubes in space and watch them mirror into beautiful symmetrical patterns.

## Features

- **3D Drawing**: Left-click and drag to draw tubes in 3D space
- **Kaleidoscope Effect**: Every stroke mirrored in 6-fold symmetry  
- **Live Controls**: Adjust scale, choose colors, clear canvas
- **Grid Snapping**: Precise alignment with visual grid
- **Camera Controls**: Right-click to orbit, scroll to zoom
- **Multiple Materials**: Standard, metallic, glass, and emissive materials
- **Brush Styles**: Solid, dotted, dashed, and spiral patterns
- **Variable Thickness**: Adjustable brush size
- **Symmetry Options**: 4-fold, 6-fold, 8-fold, mandala, or asymmetric modes
- **Particle Effects**: Real-time sparkles following your drawing cursor
- **Eraser Tool**: Remove individual tubes with precision

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and start drawing!

## Controls

- **Left-click + drag**: Draw tubes
- **Right-click + drag**: Rotate camera  
- **Scroll**: Zoom in/out
- **UI Panel**: Material types, symmetry modes, brush styles, thickness, scale, colors
- **Draw/Erase toggle**: Switch between drawing and erasing modes

## Tech Stack

React + TypeScript + Three.js + React Three Fiber + Vite

## Future Enhancements

- Post-processing effects (bloom, depth of field)
- Additional symmetry patterns
- Export functionality
- Audio-reactive features 