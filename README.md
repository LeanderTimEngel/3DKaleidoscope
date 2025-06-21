# 3D Kaleidoscope Sketchpad

A beautiful, interactive 3D kaleidoscope visualization built with React Three Fiber. Draw in 3D space and watch your strokes mirrored in a mesmerizing, animated pattern.

## Features

- **Interactive 3D Drawing**: Left-click and drag to draw tubes in free-space.
- **Kaleidoscope Reflections**: Every stroke is instantly mirrored into a 6-fold symmetrical pattern.
- **Live UI Controls**:
  - **Scale Slider**: Dynamically grow or shrink the entire kaleidoscope.
  - **Color Palette**: Choose from 8 vibrant colors for your strokes.
  - **Clear Button**: Instantly wipe the canvas clean.
- **Full Camera Control**: Right-click to rotate, middle-click/scroll to zoom.
- **Grid-Snapping**: Drawn points align perfectly with the visible ground raster for clean strokes.
- **Glass-Morphism UI**: Modern, clean interface that floats above the scene.

## Setup

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Start the development server**:
    ```bash
    npm run dev
    ```

3.  **Open your browser** and navigate to the local URL provided (e.g., `http://localhost:5173`).

## Usage

-   **Left-click + drag**: Draw a tube.
-   **Right-click + drag**: Rotate the camera.
-   **Middle-click / Scroll**: Zoom in and out.
-   Use the **UI panel** at the top to change the active color, adjust the kaleidoscope's scale, or clear all drawings.

## Technologies Used

-   React 18 & TypeScript
-   Three.js & React Three Fiber (@react-three/fiber)
-   Drei (helpers for R3F)
-   Vite (build tool)

## Project Structure

```
src/
├── App.tsx          # Main application component, UI, and event handlers
├── TubeSystem.tsx   # Renders the tubes and kaleidoscope effect
├── styles.css       # CSS for the UI control panel
└── main.tsx         # Application entry point
```

## Customization

You can modify the `tubes` array in `App.tsx` to create different tube patterns. Each tube object should have:
- `id`: Unique identifier
- `color`: Hex color string
- `points`: Array of THREE.Vector3 points defining the tube path 