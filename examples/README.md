# PhysEngine Examples

Interactive terminal demonstrations of the core math primitives.

## Prerequisites

```bash
pnpm install
```

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

Each example is a simple TypeScript file that imports core modules directly from `../src/`:

```typescript
import * as Vec2 from '../src/core/Vector2.js';
import * as Transform from '../src/core/Transform.js';
import * as AABB from '../src/core/AABB.js';
```

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

