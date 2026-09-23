# PhysEngine

[![CI](https://github.com/XavierFabregat/PhysEngine/actions/workflows/ci.yml/badge.svg)](https://github.com/XavierFabregat/PhysEngine/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/%40xavifabregat%2Fphysengine.svg)](https://www.npmjs.com/package/@xavifabregat/physengine)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A 2D physics engine for games and simulations, prioritizing simplicity and extensibility.

## Status: In Development 🚧

**Current Version:** 0.2.0  
**Core Math Layer:** ✅ Complete  
**Bodies, World & Integration:** ✅ Circles and rectangles, add/remove bodies, `step()` with gravity  
**Collision Detection & Response:** 🚧 Circle-circle and circle-rectangle (brute-force broad phase, impulse bounce, no friction or rotation yet; rectangle-rectangle pending)

## Conventions

- **Coordinates:** y-down screen space (+x right, +y down), matching Canvas/DOM. `Vector2.UP` is `{ x: 0, y: -1 }`.
- **Rotation:** radians; positive rotates +x toward +y, which is **clockwise on screen**.
- **Winding:** polygon/rectangle vertices have positive signed area (counter-clockwise in y-up math axes, clockwise as seen on screen).
- **Units:** arbitrary world units, pixels by default. Default gravity is `{ x: 0, y: 400 }` units/s², default density is `1` mass per unit area.

## Features (So Far)

### ✅ Core Math Foundation

- **Vector2** - Complete 2D vector math (23 functions)
  - Arithmetic: add, sub, scale, negate
  - Products: dot, cross
  - Magnitude: length, distance, normalize
  - Transformations: rotate, perpendicular
  - Interpolation: lerp
  - Projections: project, reflect

- **Transform** - 2D rigid body transformations (11 functions)
  - Local ↔ World space conversion
  - Point and direction transformations
  - Transform composition and inversion

- **AABB** - Axis-aligned bounding boxes (18 functions)
  - Fast overlap detection
  - Containment tests
  - Merge, expand, translate operations

- **Math Utilities** - Common game math operations (14 functions)
  - Value operations: clamp, map, sign
  - Interpolation: lerp, smoothstep
  - Angle operations: deg/rad conversion, normalization
  - Random utilities

### ✅ Bodies & World

- **Body factories** - `createCircle`, `createRectangle` (static, dynamic, kinematic), with mass and inertia from shape × density. Invalid sizes or densities throw a `RangeError`.
- **World** - `createWorld`, `addBody` (rejects duplicate IDs), `removeBody`, `getBody`, `getBodies`, `clear`, `hasBody`
- **Simulation** - `step(world, dt)`: integrate → refresh AABBs → broad phase → narrow phase → resolve
- **Collisions** - `BruteForceBroadPhase` (AABB + layer filtering), `ShapeDispatchNarrowPhase` (circle-circle, circle-rectangle incl. rotated; extensible via `register`), `ImpulseResolver` (restitution with a configurable combine rule + positional correction; sensors detect without responding)
- **Integrator** - `SemiImplicitEulerIntegrator` (symplectic, stable; default). `VerletIntegrator` remains as a deprecated alias.
- **Collision filtering helpers** - `shouldCollide` (layer/mask; sensors obey the same filtering)

### ✅ Debug Rendering

- `debugDraw(world, renderer, options)` against a library-agnostic `DebugRenderer` interface (bodies, AABBs, velocities, center of mass, IDs)
- `CanvasRenderer` reference implementation at the `@xavifabregat/physengine/canvas` entry point (browser only)

## Examples

See the [`examples/`](./examples) folder for interactive terminal demos:

- 🪐 **[Orbit Visualizer](./examples/orbit.ts)** - Planets orbiting using Transform rotations
- ⚽ **[Bouncing Balls](./examples/bouncing-balls.ts)** - Vector math and AABB collision detection
- ✨ **[Particle Swarm](./examples/swarm.ts)** - Smooth following behavior with lerp and normalize

**Run any example:**
```bash
pnpm example:orbit
pnpm example:balls
pnpm example:swarm
```

See [examples/README.md](./examples/README.md) for details.

## Installation

```bash
npm install @xavifabregat/physengine
```

Or try it out from source:
```bash
git clone https://github.com/XavierFabregat/PhysEngine.git
cd PhysEngine
pnpm install
pnpm build          # Build the library
pnpm example:orbit  # Try the demos!
```

## Usage

```typescript
import { Vector2, Transform, AABB, math } from '@xavifabregat/physengine';

// Create and manipulate vectors
const position = Vector2.create(100, 200);
const velocity = Vector2.create(5, -3);
const newPosition = Vector2.add(position, velocity);

// Work with transforms
const transform = Transform.create(position, Math.PI / 4);
const worldPoint = Transform.transformPoint(transform, { x: 10, y: 0 });

// Fast collision detection with AABBs
const box1 = AABB.fromCenter({ x: 50, y: 50 }, { x: 25, y: 25 });
const box2 = AABB.fromCenter({ x: 70, y: 60 }, { x: 20, y: 20 });
if (AABB.overlaps(box1, box2)) {
  console.log('Collision detected!');
}

// Math utilities
const interpolated = math.lerp(0, 100, 0.5); // 50
const angle = math.degToRad(90); // π/2
```

### Simulating bodies

```typescript
import { createWorld, createCircle, createRectangle, addBody, step, BodyType } from '@xavifabregat/physengine';

const world = createWorld(); // gravity { x: 0, y: 400 }, y-down

addBody(world, createRectangle({
  position: { x: 400, y: 580 }, width: 800, height: 40, type: BodyType.STATIC,
}));
const ball = createCircle({ position: { x: 400, y: 100 }, radius: 20 });
addBody(world, ball);

function update() {
  step(world, 1 / 60);
  console.log(ball.position); // falls, then comes to rest on the floor
  requestAnimationFrame(update);
}
```

### Choosing how bounciness combines

When two bodies collide, their restitution values are combined into one. The default rule is `'min'` (the less bouncy body wins, so floors need a high restitution for balls to bounce). Use `'max'` for the common game-engine behaviour where a bouncy ball bounces on any surface:

```typescript
import { createWorld, ImpulseResolver } from '@xavifabregat/physengine';

const world = createWorld({
  resolver: new ImpulseResolver({ restitutionCombine: 'max' }),
  // also: 'min' (default) | 'average' | 'multiply' | ((a, b) => number)
});
```

### Debug rendering in the browser

```typescript
import { debugDraw } from '@xavifabregat/physengine';
import { CanvasRenderer } from '@xavifabregat/physengine/canvas';

const renderer = new CanvasRenderer(document.querySelector<HTMLCanvasElement>('canvas')!);
debugDraw(world, renderer, { showAABBs: true, showIds: true });
```

## Development

### Quick Start

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test              # Watch mode
pnpm test:run          # Run once
pnpm test:ui           # UI mode

# Build
pnpm build             # Compile TypeScript
pnpm dev               # Watch mode

# Examples
pnpm example:orbit
pnpm example:balls
pnpm example:swarm
```

### Git Workflow

We use a **branch-based workflow**:

- **`main`** - Stable releases only (tagged versions published to npm)
- **`dev`** - Active development (all work happens here)

**Development cycle:**
```bash
# Work on dev branch
git checkout dev
git pull origin dev

# Make changes, test
pnpm test:run
pnpm build

# Commit and push
git add .
git commit -m "feat: your feature"
git push origin dev
```

**Release cycle:**
```bash
# Create PR from dev to main
gh pr create --base main --head dev --title "Release v0.2.0"

# After merge and CI passes
git checkout main
pnpm version minor
git push --follow-tags  # Auto-publishes to npm via GitHub Actions
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed workflow and GitHub CLI usage.

## Publishing

Automated via GitHub Actions using **Trusted Publishing** (OpenID Connect).

When you push a version tag:

```bash
pnpm version patch  # 0.1.0 → 0.1.1
git push --follow-tags
```

The workflow automatically:
1. Runs all tests
2. Builds the library
3. Publishes to npm with provenance (no secrets needed!)

**First-time setup required:**
- Do one manual publish: `npm publish --access public`
- Configure Trusted Publishing on npmjs.com
- See [.github/README.md](.github/README.md) for detailed setup instructions

## Project Structure

```
PhysEngine/
├── src/
│   ├── core/              # Math primitives (Vector2, Transform, AABB, math)
│   ├── types/             # Body, Shape, Material, World, Integrator
│   ├── bodies/            # Body factories, mass/inertia, AABB helpers
│   ├── world/             # createWorld, body management, step
│   ├── systems/
│   │   ├── integrators/   # SemiImplicitEuler (default)
│   │   ├── broadphase/    # BruteForce
│   │   ├── narrowphase/   # circleCircle, circleRectangle, ShapeDispatch
│   │   └── resolvers/     # ImpulseResolver
│   ├── debug/             # DebugRenderer interface, debugDraw, CanvasRenderer
│   ├── index.ts           # Main (headless) entry point
│   └── canvas.ts          # Browser-only entry point (CanvasRenderer)
├── examples/              # Terminal demos + browser debug viewer
├── dist/                  # Built library (npm package)
└── IMPLEMENTATION.md      # Full roadmap
```

## Roadmap

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the complete plan.

### Next Up:
- **Narrow phase** - Rectangle/polygon SAT with a 2-point contact manifold
- **Collision Response** - Friction and rotational (angular) impulses
- **Broad phase** - Spatial hash once body counts demand it
- **Polygon bodies** - `createPolygon` (mass/inertia helpers already in place)
- **Constraints** - Springs, rods, pins
- **Events** - Collision callbacks

## Design Goals

1. **Simplicity** - Clean, intuitive API
2. **Extensibility** - Pluggable systems via dependency injection
3. **Performance** - Efficient defaults, optimizations available when needed
4. **Tree-shakeable** - Functional core for optimal bundling

## Testing

Unit tests cover the math layer, body factories, mass/inertia helpers, world management, the integrator, and `debugDraw`.

```bash
pnpm test:run
pnpm test:coverage
```

## License

ISC

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for our development workflow.

**Quick summary:**
- Work on `dev` branch
- Create PRs using GitHub CLI: `gh pr create --base dev`
- PR to `main` only for releases
- Tag on `main` triggers automated npm publish

### Branch Strategy

- **`main`** - Stable releases (protected)
- **`dev`** - Active development (default branch for work)

For detailed instructions on the git workflow, GitHub CLI commands, and release process, see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

[View full implementation plan →](./IMPLEMENTATION.md)

