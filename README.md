# 3D Kaleidoscope

A beautiful 3D kaleidoscope visualization built with React Three Fiber and TypeScript.

## Features

- Real-time 3D tube rendering with kaleidoscope reflections
- Smooth rotation animation
- Interactive camera controls
- Beautiful lighting and shadows
- Responsive design

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

- **Mouse/Touch**: Rotate the camera around the scene
- **Scroll**: Zoom in/out
- The kaleidoscope automatically rotates for a mesmerizing effect

## Technologies Used

- React 18
- TypeScript
- Three.js
- React Three Fiber
- React Three Drei
- Vite

## Project Structure

```
src/
├── App.tsx          # Main application component
├── TubeSystem.tsx   # 3D kaleidoscope tube system
└── main.tsx         # Application entry point
```

## Customization

You can modify the `tubes` array in `App.tsx` to create different tube patterns. Each tube object should have:
- `id`: Unique identifier
- `color`: Hex color string
- `points`: Array of THREE.Vector3 points defining the tube path 