# PhysEngine

[![CI](https://github.com/XavierFabregat/PhysEngine/actions/workflows/ci.yml/badge.svg)](https://github.com/XavierFabregat/PhysEngine/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/%40xavifabregat%2Fphysengine.svg)](https://www.npmjs.com/package/@xavifabregat/physengine)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A 2D physics engine for games and simulations, prioritizing simplicity and extensibility.

## Status: In Development 🚧

**Current Version:** 0.4.0  
**Core Math Layer:** ✅ Complete  
**Bodies, World & Integration:** ✅ Circles and rectangles, add/remove bodies, `step()` with gravity  
**Collision Detection & Response:** ✅ All shape pairs (circles, rectangles, convex polygons via SAT); brute-force broad phase; impulses with rotation and Coulomb friction (balls roll, boxes tip and slide). Stable stacking: contacts are solved between the velocity and position halves of each step, iteratively and warm-started (a 10-box tower holds to 0.1 px)

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

- **Body factories** - `createCircle`, `createRectangle`, `createPolygon` (convex; re-centered on its centroid) (static, dynamic, kinematic), with mass and inertia from shape × density and optional linear/angular damping. Invalid sizes or densities throw a `RangeError`.
- **World** - `createWorld`, `addBody` (rejects duplicate IDs), `removeBody`, `getBody`, `getBodies`, `clear`, `hasBody`
- **Simulation** - `step(world, dt)`: integrate → refresh AABBs → broad phase → narrow phase → resolve
- **Collisions** - `BruteForceBroadPhase` (AABB + layer filtering), `ShapeDispatchNarrowPhase` (every pair of built-in shapes: circle, rectangle, convex polygon; rectangles and polygons via SAT with a 1–2 point contact manifold; extensible via `register`), `ImpulseResolver` (sequential impulses with rotation and Coulomb friction, configurable restitution/friction combine rules, iterations, restitution threshold and warm starting, positional correction; sensors detect without responding)
- **Events** - `onCollisionStart` / `onCollisionActive` / `onCollisionEnd` (sensors included); `world.contacts` holds the last step's contacts
- **Queries** - `raycast` (closest hit with point, normal, distance), `queryPoint`, `queryAABB` (exact shapes), with layer/sensor/predicate filters
- **Integrator** - `SemiImplicitEulerIntegrator` (symplectic, stable; default). `VerletIntegrator` remains as a deprecated alias.
- **Collision filtering helpers** - `shouldCollide` (layer/mask; sensors obey the same filtering)

### ✅ Debug Rendering

- `debugDraw(world, renderer, options)` against a library-agnostic `DebugRenderer` interface (bodies, AABBs, velocities, center of mass, IDs)
- `CanvasRenderer` reference implementation at the `@xavifabregat/physengine/canvas` entry point (browser only)

## Examples

See [`examples/demos/`](./examples/demos) for the **Playground**: four browser toys built on the engine (slingshot vs. towers, Galton board, draw-a-ramp puzzle, lidar rover).

The [`examples/`](./examples) folder also has terminal demos:

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

Or straight from a CDN, no build step (single-file bundles, ~10 KB gzipped; published from the release after v0.4.0):

```html
<!-- Classic script: exposes a global `PhysEngine` -->
<script src="https://cdn.jsdelivr.net/npm/@xavifabregat/physengine"></script>

<!-- ES module -->
<script type="module">
  import { createWorld, step } from 'https://cdn.jsdelivr.net/npm/@xavifabregat/physengine/dist/physengine.min.js';
</script>
```

Pin a version in production (`@xavifabregat/physengine@<version>/...`). Bundlers can also import the single file via `@xavifabregat/physengine/bundle`.

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

### Polygons

```typescript
import { createPolygon, BodyType } from '@xavifabregat/physengine';

// Vertices are relative to `position`; the body is re-centered on the centroid
const wedge = createPolygon({
  position: { x: 690, y: 560 },
  vertices: [{ x: -70, y: 0 }, { x: 70, y: 0 }, { x: 70, y: -60 }],
  type: BodyType.STATIC,
});
```

Convex outlines only (concave or self-intersecting ones throw); either winding is accepted.

### Friction

Friction follows Coulomb's law: surfaces grip until the sideways force exceeds μ × the normal force, then slide. Balls roll, boxes slide or hold on slopes, and tilted boxes tip onto a face. Set `material.friction` per body; choose how two bodies' values combine with `frictionCombine` (default `'average'`):

```typescript
createWorld({ resolver: new ImpulseResolver({ frictionCombine: 'min' }) }); // ice beats rubber
```

### Collision events

```typescript
import { onCollisionStart, onCollisionActive, onCollisionEnd } from '@xavifabregat/physengine';

const off = onCollisionStart(world, (bodyA, bodyB, contact) => {
  console.log('hit', bodyA.id, bodyB.id, contact.point, contact.normal);
});
onCollisionActive(world, (bodyA, bodyB) => { /* every step they keep touching */ });
onCollisionEnd(world, (bodyA, bodyB) => { /* separated (or one was removed) */ });
off(); // unsubscribe
```

Every contact also says how hard the bodies hit and how hard the solver pushed:

```typescript
onCollisionStart(world, (a, b, contact) => {
  if (contact.impactSpeed > 300) breakCrate(b);      // approach speed before the hit (units/s)
  playThud(contact.normalImpulse / a.mass);          // momentum transferred this step
});
```

`normalImpulse / dt` is the contact force (a resting body's is its weight); `tangentImpulse` is the friction part.

Handlers run at the end of `step()`, so they can add or remove bodies. Sensors fire events without responding physically, which makes them trigger zones. The last step's contacts are also available as `world.contacts`, and `debugDraw(world, renderer, { showContacts: true })` draws them.

### World queries

```typescript
import { raycast, queryPoint, queryAABB } from '@xavifabregat/physengine';

// Line of sight: closest hit (sensors skipped; shapes containing the origin ignored)
const hit = raycast(world, { origin: gun, direction: aim, maxDistance: 500, filter: { collidesWith: Layers.WORLD } });
if (hit) console.log(hit.body.id, hit.point, hit.normal, hit.distance);

// Picking: bodies whose shape contains the point
const [picked] = queryPoint(world, mousePosition);

// Selection box: bodies whose shape (not just AABB) overlaps the region
const selected = queryAABB(world, { min: { x: 0, y: 0 }, max: { x: 200, y: 100 } });
```

Filters: `collidesWith` (layer mask), `includeSensors`, `predicate`.

### Forces and impulses

```typescript
import { applyForce, applyImpulse, applyTorque } from '@xavifabregat/physengine';

applyForce(rover, { x: 900 * rover.mass, y: 0 });                     // sustained: call every step
applyImpulse(ball, { x: 0, y: -300 * ball.mass }, kickPoint);         // instant; off-centre adds spin
applyTorque(wheel, 50);                                               // for the next step
```

Points are in world space and default to the center of mass; static and kinematic bodies ignore these.

### Fast bodies (continuous collision)

A body that moves farther in one step than it and a wall are thick can pass straight through. Mark projectiles as bullets and their path is swept every step instead:

```typescript
const shot = createCircle({ radius: 3, velocity: { x: 3000, y: 0 }, isBullet: true });
```

Bullets stop at their first impact and bounce normally on the next step (with the right `impactSpeed` in events). It costs a swept test against nearby bodies per bullet per step, so use it for projectiles, not everything. Polygon bullets are swept as their inscribed circle.

### Damping

Bodies don't slow down on their own unless you give them damping (rates in 1/s; speed decays as `v₀·e^(−d·t)`):

```typescript
const puck = createCircle({ radius: 12, linearDamping: 0.8, angularDamping: 0.5 });
```

Use it for air/ground drag in top-down games, and angular damping to stop balls rolling forever on flat ground (there is no rolling resistance otherwise).

### Solver settings

Each step integrates velocities, solves every contact together, then moves bodies (Box2D's order), so resting bodies don't creep and stacks don't sink. The defaults suit pixel-scale worlds; tune them on the resolver:

```typescript
createWorld({
  resolver: new ImpulseResolver({
    iterations: 10,            // solver passes per step (more = stiffer piles)
    warmStarting: true,        // reuse last step's impulses (tall stacks need it)
    restitutionThreshold: 10,  // approaches slower than this (units/s) don't bounce
  }),
});
```

With warm starting the resolver remembers contacts between steps, so give each world its own resolver (`createWorld` does by default).

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
│   │   ├── narrowphase/   # circle/rectangle/polygon detectors, SAT, ShapeDispatch
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
Prioritised from building the Playground demos; details, reasons and "done when" criteria are in [IMPLEMENTATION.md → Next](./IMPLEMENTATION.md#next--lessons-from-the-playground-demos).
- **Chain shapes** - Static polylines for terrain and drawn lines
- **Then** - Spatial broad phase for bodies and queries, sleeping, configurable world scale, constraints

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

