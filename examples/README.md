# PhysEngine Examples

Interactive demonstrations of PhysEngine features.

## Prerequisites

```bash
pnpm install
pnpm build     # Build the library first
```

**Note:** Examples import from the built library (`../dist/`), so you must build before running them.

## Browser Examples

### 🎮 Playground (four demos)
Small toys built on the engine, in one page with tabs:

```bash
pnpm build
npx serve .        # then open http://localhost:3000/examples/demos/
```

- **Knockdown**: slingshot against box towers. The aim preview uses `raycast` along the trajectory; scoring uses `onCollisionStart` with the engine's `contact.impactSpeed`.
- **Galton Board**: balls rain through a peg lattice into sensor bins; the histogram is compared with the binomial curve.
- **Ramp Sketch**: draw ramps with the pointer (each stroke becomes one `createChain` polyline) to roll a ball into a sensor cup; level 3 has a kinematic paddle.
- **Lidar Rover**: a top-down rover casts 180 rays a frame and builds a point-cloud map; the rover and crates use `linearDamping`/`angularDamping` so they coast to a stop.

The page loads `physengine` through an import map pointing at `../../dist/index.js`; point it at `https://cdn.jsdelivr.net/npm/@xavifabregat/physengine@0.4.0/+esm` (the whole package as one bundled module) to run the demos without a local build.

### 🎨 Debug Viewer
Visual debug renderer for physics bodies:

```bash
pnpm build
open examples/debug-viewer.html
```

**Features:**
- Visualize bodies (circles, rectangles)
- Toggle AABBs, velocities, center of mass, body IDs
- Play/pause the simulation (Space), drag and rotate bodies
- Color-coded by body type (static/dynamic/kinematic)
- Interactive controls

This demonstrates the `DebugRenderer` interface and `debugDraw` function.

## Terminal Examples

## Running Examples

### 🪐 Orbit Visualizer
Watch planets orbit a sun using Transform rotations:

```bash
pnpm example:orbit
```

**Demonstrates:**
- `Transform.create()` - Creating transforms with position and rotation
- `Transform.transformPoint()` - Converting local coordinates to world space
- Smooth rotation animation

### ⚽ Bouncing Balls
ASCII balls bouncing around with AABB collision detection:

```bash
pnpm example:balls
```

**Demonstrates:**
- `Vector2.add()` - Position updates
- `Vector2.sub()`, `Vector2.normalize()` - Direction calculations
- `Vector2.dot()` - Collision response
- `AABB.fromCenter()` - Creating bounding boxes
- `AABB.overlaps()` - Fast broad-phase collision detection

### ✨ Particle Swarm
Particles smoothly following a moving target:

```bash
pnpm example:swarm
```

**Demonstrates:**
- `Vector2.sub()` - Calculate direction vectors
- `Vector2.normalize()` - Get unit direction
- `Vector2.scale()` - Apply speed
- `Vector2.lerp()` - Smooth interpolation
- `Vector2.distance()` - Proximity checks
- `math.clamp()` - Boundary enforcement

## Controls

- **Press `Ctrl+C`** to exit any example

## How They Work

Each example imports from the built library just like users would:

```typescript
import { Vector2, Transform, AABB, math } from '../dist/index.js';
// Or with aliases:
import { Vector2 as Vec2 } from '../dist/index.js';
```

This demonstrates the actual API that consumers of the library will use.

The examples use:
- `console.clear()` for animation
- `setInterval()` for the game loop
- ASCII characters for rendering
- Pure math - no physics simulation (yet!)

## Adding Your Own

Copy any example file and modify it! The core math primitives are powerful enough to create:

- Projectile motion calculators
- Steering behaviors
- Path following
- Obstacle avoidance
- Basic kinematics

Once the physics engine is complete, these demos will evolve to show full physics simulation with forces, constraints, and realistic collision response.

