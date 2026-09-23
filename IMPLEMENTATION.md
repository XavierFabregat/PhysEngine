# PhysEngine Implementation Plan

A 2D physics engine for games and simulations, prioritizing simplicity and extensibility.

## Design Goals

1. **Simplicity** - Clean, intuitive API that's easy to learn
2. **Extensibility** - Pluggable systems via dependency injection
3. **Performance** - Efficient defaults, optimizations available when needed
4. **Tree-shakeable** - Functional core allows bundlers to eliminate unused code

---

## Architecture

### Core Principles

- **Functional core, OOP shell** - Internal logic is functional and testable; optional fluent API wrapper for convenience
- **Dependency injection** - All major systems (integrator, collision detection, etc.) are swappable via interfaces
- **Immutable vectors, mutable bodies** - Vector values are never mutated (they are replaced), while bodies and the world are updated in place each step for performance
- **Conventions** - y-down screen coordinates, positive rotation from +x toward +y (clockwise on screen), arbitrary world units (pixels by default)
- **Composition over inheritance** - Bodies and constraints are composable pieces

### Systems Architecture

All pluggable systems implement interfaces, allowing users to swap implementations:

```typescript
interface PhysicsSystems {
  integrator: Integrator;       // How bodies move (Semi-implicit Euler, RK4)
  broadPhase: BroadPhase;       // Fast pair culling (SpatialHash, QuadTree)
  narrowPhase: NarrowPhase;     // Precise collision detection (SAT, GJK)
  resolver: CollisionResolver;  // Collision response (Impulse, Position-based)
  sleeping?: SleepingStrategy;  // Body deactivation (optional)
}
```

### API Design

Two API styles supported:

```typescript
// Functional (tree-shakeable, testable)
import { createWorld, createCircle, addBody, step } from 'physengine/core';

const world = createWorld({ systems: defaultSystems });
const ball = createCircle({ x: 100, y: 50, radius: 20 });
addBody(world, ball);
step(world, 1/60);

// Fluent (discoverable, convenient)
import { World, Circle } from 'physengine';

const world = new World()
  .setGravity(0, 9.8)
  .add(new Circle({ x: 100, y: 50, radius: 20 }));

world.step(1/60);
```

---

## Module Structure

```
src/
├── core/                      # Mathematical primitives
│   ├── Vector2.ts             # Immutable 2D vector
│   ├── Transform.ts           # Position + rotation
│   ├── AABB.ts                # Axis-aligned bounding box
│   └── math.ts                # Utility functions (clamp, lerp, etc.)
│
├── types/                     # TypeScript interfaces
│   ├── Systems.ts             # Pluggable system interfaces
│   ├── Body.ts                # Body type definitions
│   ├── Material.ts            # Physical material properties
│   ├── Collision.ts           # Contact, manifold types
│   ├── Events.ts              # Event system types
│   ├── Query.ts               # World query types
│   └── Constraint.ts          # Constraint interface
│
├── bodies/                    # Body factories
│   ├── createBody.ts          # Base body factory
│   ├── createCircle.ts        # Circle shape
│   ├── createPolygon.ts       # Convex polygon shape
│   ├── createRectangle.ts     # Rectangle (convenience)
│   ├── createParticle.ts      # Lightweight point mass
│   └── bodyTypes.ts           # Static, Dynamic, Kinematic
│
├── systems/                   # Pluggable system implementations
│   ├── integrators/
│   │   ├── SemiImplicitEuler.ts # Semi-implicit (symplectic) Euler (default)
│   │   └── RK4.ts             # Runge-Kutta 4th order
│   │
│   ├── broadphase/
│   │   ├── SpatialHash.ts     # Grid-based (default)
│   │   ├── QuadTree.ts        # Quadtree
│   │   └── BruteForce.ts      # O(n²) for small simulations
│   │
│   ├── narrowphase/
│   │   ├── SAT.ts             # Separating Axis Theorem (default)
│   │   └── GJK.ts             # GJK + EPA (advanced)
│   │
│   ├── resolvers/
│   │   ├── ImpulseResolver.ts # Impulse-based (default)
│   │   └── PositionResolver.ts# Position-based (for PBD-style constraints)
│   │
│   ├── sleeping/
│   │   └── IslandSleeping.ts  # Sleep islands of connected bodies
│   │
│   └── ccd/
│       └── TOI.ts             # Time of impact for tunneling prevention
│
├── constraints/               # Constraint types
│   ├── createSpring.ts        # Distance spring (soft)
│   ├── createRod.ts           # Fixed distance (rigid)
│   ├── createPin.ts           # Pin to world point
│   └── solveConstraints.ts    # Constraint solver
│
├── queries/                   # World query functions
│   ├── raycast.ts             # Ray intersection
│   ├── pointQuery.ts          # Bodies at point
│   ├── aabbQuery.ts           # Bodies in AABB
│   └── radiusQuery.ts         # Bodies in radius
│
├── events/                    # Event system
│   └── EventEmitter.ts        # Typed event emitter
│
├── forces/                    # Force generators
│   ├── Gravity.ts             # Constant gravity
│   ├── Drag.ts                # Air resistance
│   └── Attractor.ts           # Point attractor/repulsor
│
├── debug/                     # Development/debugging tools
│   ├── DebugRenderer.ts       # Rendering interface (library-agnostic)
│   ├── debugDraw.ts           # Debug visualization function
│   └── examples/              # Reference implementations
│       ├── CanvasRenderer.ts  # Canvas 2D example
│       └── SVGRenderer.ts     # SVG example
│
├── world/                     # World management
│   ├── createWorld.ts         # Functional world factory
│   ├── step.ts                # Simulation step logic
│   ├── addBody.ts             # Add/remove bodies
│   ├── addConstraint.ts       # Add/remove constraints
│   └── World.ts               # Fluent class wrapper
│
├── presets.ts                 # Pre-configured system bundles
├── index.ts                   # Public exports (headless)
└── canvas.ts                  # Browser-only entry (CanvasRenderer)
```

---

## Version Roadmap

### v1.0 - Foundation

Core physics engine with all essential features for 2D game development.

#### Core Math
- [x] `Vector2` - immutable 2D vector with full operations (add, sub, scale, dot, cross, normalize, rotate, etc.)
- [x] `Transform` - position + rotation representation
- [x] `AABB` - axis-aligned bounding box with overlap/contains tests
- [x] `math` utilities - clamp, lerp, approximately equal, angle utils

#### Bodies
- [x] Body types: `static`, `dynamic`, `kinematic`
- [x] Shapes: `circle`, `polygon`, `rectangle`
- [ ] Particles (lightweight point masses)
- [ ] Properties: position, velocity, acceleration, angle, angularVelocity
- [x] Mass and inertia calculation from shape + density

#### Materials
- [ ] `friction` - surface grip (0-1)
- [ ] `restitution` - bounciness (0-1)
- [x] `density` - mass per unit area

#### Collision Detection
- [ ] Broad phase: Spatial hash grid (default) (brute force in place for now)
- [x] Narrow phase: SAT for circle-circle, circle-polygon, polygon-polygon (dispatched by `ShapeDispatchNarrowPhase`)
- [x] Contact manifold generation (contact points, normal, penetration depth): 1–2 clipped points for polygon pairs

#### Collision Response
- [ ] Impulse-based resolver (linear only; no angular response yet)
- [x] Position correction for penetration
- [ ] Friction impulses

#### Collision Filtering
- [ ] Layer/mask system for selective collision (`shouldCollide` helper done; applies to sensors too)
- [ ] Sensor bodies (detect but don't respond)

#### Constraints
- [ ] Spring (soft distance constraint)
- [ ] Rod (rigid distance constraint)
- [ ] Pin (fix point to world)
- [ ] Iterative constraint solver

#### Forces
- [x] Global gravity
- [ ] `applyForce(force, point?)` - continuous force
- [ ] `applyImpulse(impulse, point?)` - instant impulse
- [ ] `applyTorque(amount)` - rotational force

#### Events
- [ ] `collisionStart` - bodies begin touching
- [ ] `collisionEnd` - bodies stop touching
- [ ] `collisionActive` - bodies still touching (each step)

#### World Queries
- [ ] `raycast(origin, direction, maxDistance, filter?)` - ray intersection
- [ ] `queryPoint(point, filter?)` - bodies containing point
- [ ] `queryAABB(bounds, filter?)` - bodies in bounding box

#### World Management
- [x] `createWorld(config)` - functional factory
- [x] `step(world, dt)` - advance simulation
- [ ] Add/remove bodies and constraints (bodies done)
- [ ] Fluent `World` class wrapper

#### Systems Architecture
- [x] `Integrator` interface + semi-implicit Euler implementation
- [ ] `BroadPhase` interface + SpatialHash implementation
- [x] `NarrowPhase` interface + SAT implementation
- [ ] `CollisionResolver` interface + Impulse implementation
- [ ] `defaultSystems` preset

#### Debug Renderer
- [x] `DebugRenderer` interface - library-agnostic rendering contract
- [ ] `debugDraw(world, renderer, options?)` - visualize physics simulation
  - [x] Bodies (shapes, outlines)
  - [x] AABBs (bounding boxes)
  - [ ] Contacts (collision points, normals)
  - [ ] Constraints (springs, rods, pins)
  - [x] Velocities (direction vectors)
  - [x] Center of mass markers
  - [x] Body ID labels (via optional `drawText`)
  - [ ] Sleep state visualization
- [ ] Example implementations for Canvas and SVG (Canvas done, at the `/canvas` entry point)
- [ ] Color schemes for different body states (static, dynamic, kinematic, sleeping)

---

### v1.1 - Performance & Polish

Optimizations and quality-of-life improvements.

#### Performance
- [ ] Body sleeping/deactivation system
- [ ] Sleep islands (groups of connected bodies sleep together)
- [ ] Warm starting for constraint solver

#### Additional Integrators
- [ ] Velocity Verlet (needs forces re-evaluated mid-step, so the `Integrator`
      interface must grow a force callback first)
- [ ] RK4 (Runge-Kutta 4th order)

#### Additional Broad Phases
- [ ] Quadtree
- [ ] Brute force (for < 50 bodies)

#### Queries
- [ ] `queryRadius(center, radius, filter?)` - bodies in circle
- [ ] Raycast: return all hits (not just first)

#### Quality of Life
- [ ] `world.clear()` - remove all bodies
- [ ] Body `userData` field for game data
- [ ] Constraint `userData` field
- [ ] Body enable/disable without removing

---

### v1.2 - Advanced Collision

Better collision handling for edge cases.

#### Continuous Collision Detection
- [ ] Time of impact (TOI) calculation
- [ ] CCD opt-in per body (`body.ccd = true`)
- [ ] Tunneling prevention for fast/small objects

#### Narrow Phase
- [ ] GJK + EPA algorithm (alternative to SAT)

---

### v2.0 - Extended Features

Major feature additions.

#### Joints
- [ ] Revolute joint (hinge)
- [ ] Prismatic joint (slider)
- [ ] Distance joint (fixed distance, unlike spring)
- [ ] Weld joint (rigid connection)
- [ ] Motor joint (powered rotation/translation)

#### Composite Bodies
- [ ] Multiple shapes per body
- [ ] Automatic mass/inertia from compound shapes

#### Advanced Forces
- [ ] Buoyancy zones (water areas with floating)
- [ ] Force fields (spatial force application)

#### Serialization
- [ ] `serializeWorld(world)` - export to JSON
- [ ] `deserializeWorld(data)` - import from JSON
- [ ] Useful for save games, networking

#### Determinism
- [ ] Deterministic mode for networking/replays
- [ ] Fixed-point math option

---

### v2.1 - Complex Shapes

Support for more shape types.

#### Shapes
- [ ] Concave polygon decomposition (auto-split into convex)
- [ ] Edge/chain shapes (static terrain)
- [ ] Capsule shape

---

### Future Considerations (v3+)

#### Performance
- Multithreading via Web Workers
- WASM core for performance-critical code

#### Ecosystem
- **Renderer Packages** (separate from core)
  - `@xavifabregat/physengine-canvas` - Full-featured Canvas renderer
  - `@xavifabregat/physengine-pixi` - Pixi.js integration
  - `@xavifabregat/physengine-three` - Three.js bridge (2D physics in 3D world)
  - Community-contributed renderers
- **Framework Integrations**
  - `@xavifabregat/physengine-react` - React hooks and components
  - `@xavifabregat/physengine-vue` - Vue composables
  - `@xavifabregat/physengine-svelte` - Svelte stores
- **Developer Tools**
  - Visual editor / interactive playground
  - Chrome DevTools extension
  - VSCode extension for debugging physics

#### Extensions
- 3D physics engine (separate package)
- Soft body physics
- Fluid simulation
- Cloth simulation

---

## Technical Decisions

### Why Semi-implicit Euler (Default)?

- Symplectic: energy stays bounded for springs and oscillators, so it is stable
  for constraints (explicit Euler, or a "Verlet" step that holds acceleration
  constant over the step, both gain energy)
- Keeps explicit velocities, which impulse-based collision response needs
- One force evaluation per step, fits the per-body `Integrator` interface
- First-order accuracy is acceptable for games (free-fall position is off by
  ½·g·t·dt, e.g. 1.7% after 1s at 60 Hz)

The integrator was originally named `VerletIntegrator`, but its math was always
semi-implicit Euler. It was renamed to `SemiImplicitEulerIntegrator`;
`VerletIntegrator` is kept as a deprecated alias.

### Why Spatial Hash (Default Broad Phase)?

- O(1) insertion and query for uniform grids
- Simple to implement and understand
- Good performance for typical game scenarios
- Predictable memory usage

### Why SAT (Default Narrow Phase)?

- Works for all convex polygons and circles
- Returns contact information directly
- Easier to understand than GJK
- Sufficient for most 2D games

### Why Impulse-Based Resolution?

- Industry standard approach
- Handles stacking well
- Works with friction naturally
- Good reference implementations available

### Why No Built-in Renderer?

**Physics and rendering are separate concerns:**

- **Physics** - Invisible calculations (positions, velocities, collisions)
- **Rendering** - Visual representation (colors, sprites, effects)

**Benefits of separation:**
- ✅ **Library-agnostic** - Works with Canvas, WebGL, Three.js, Pixi.js, HTML/CSS, or anything
- ✅ **Tiny core** - No heavy rendering dependencies (keeps package at ~20KB)
- ✅ **Flexibility** - Users choose their rendering stack
- ✅ **Server-side** - Run physics headless (multiplayer, simulations)
- ✅ **Performance** - Can update physics and rendering at different rates
- ✅ **Tree-shakeable** - Don't bundle rendering code if not needed

**What we provide instead:**
- `DebugRenderer` interface (v1.0) - Simple contract for visualization
- Users implement for their library in ~20 lines
- Separate renderer packages (v3+) - Optional, full-featured renderers

**Industry standard:**
- Box2D (C++) - No renderer
- Matter.js - Debug renderer only, no full renderer
- Rapier (Rust) - Render trait, users implement
- cannon.js - No renderer

This is the **right approach** - keep physics pure, let users choose how to visualize it.

---

## API Examples

### Basic Setup

```typescript
import { createWorld, createCircle, createRectangle, step, defaultSystems } from 'physengine';

// Create world with default systems
const world = createWorld({
  systems: defaultSystems,
  gravity: { x: 0, y: 400 }
});

// Create a static floor
const floor = createRectangle({
  x: 400, y: 580,
  width: 800, height: 40,
  type: 'static'
});

// Create a dynamic ball
const ball = createCircle({
  x: 400, y: 100,
  radius: 30,
  type: 'dynamic',
  material: { restitution: 0.7, friction: 0.3 }
});

addBody(world, floor);
addBody(world, ball);

// Game loop
function update() {
  step(world, 1/60);
  requestAnimationFrame(update);
}
```

### Collision Events

```typescript
import { onCollisionStart, onCollisionEnd } from 'physengine';

onCollisionStart(world, (bodyA, bodyB, contact) => {
  console.log('Collision!', bodyA.id, bodyB.id);
  console.log('Contact point:', contact.point);
  console.log('Normal:', contact.normal);
});

onCollisionEnd(world, (bodyA, bodyB) => {
  console.log('Separation!', bodyA.id, bodyB.id);
});
```

### Collision Filtering

```typescript
const Layers = {
  WORLD: 1 << 0,
  PLAYER: 1 << 1,
  ENEMY: 1 << 2,
  BULLET: 1 << 3,
  PICKUP: 1 << 4,
};

const player = createCircle({
  x: 100, y: 100, radius: 20,
  layer: Layers.PLAYER,
  collidesWith: Layers.WORLD | Layers.ENEMY | Layers.PICKUP
});

const enemyBullet = createCircle({
  x: 200, y: 100, radius: 5,
  layer: Layers.BULLET,
  collidesWith: Layers.WORLD | Layers.PLAYER  // doesn't hit other enemies
});
```

### Constraints

```typescript
import { createSpring, createPin, addConstraint } from 'physengine';

// Soft spring between two bodies
const spring = createSpring({
  bodyA: ball1,
  bodyB: ball2,
  stiffness: 0.5,
  damping: 0.1,
  restLength: 100  // optional, defaults to current distance
});

// Pin a body to a world point
const pin = createPin({
  body: pendulum,
  worldPoint: { x: 400, y: 50 }
});

addConstraint(world, spring);
addConstraint(world, pin);
```

### World Queries

```typescript
import { raycast, queryPoint, queryAABB } from 'physengine';

// Raycast for line of sight
const hit = raycast(world, {
  origin: { x: 100, y: 100 },
  direction: { x: 1, y: 0 },
  maxDistance: 500,
  filter: { collidesWith: Layers.WORLD | Layers.ENEMY }
});

if (hit) {
  console.log('Hit body:', hit.body.id);
  console.log('Hit point:', hit.point);
  console.log('Distance:', hit.distance);
}

// Find bodies at mouse position
const bodies = queryPoint(world, mousePosition);

// Find bodies in selection rectangle
const selected = queryAABB(world, selectionBounds);
```

### Custom Systems

```typescript
import { createWorld, SemiImplicitEulerIntegrator, createSpatialHash } from 'physengine';

// Create custom integrator
const myIntegrator = {
  integrate(bodies, dt) {
    // Custom integration logic
  }
};

// Mix custom and built-in systems
const world = createWorld({
  systems: {
    integrator: myIntegrator,
    broadPhase: createSpatialHash({ cellSize: 128 }),
    narrowPhase: createSATDetector(),
    resolver: createImpulseResolver({ iterations: 10 })
  }
});
```

### Debug Rendering

The debug renderer is a **simple interface** that users implement for their rendering library. It's designed for development/debugging, not production rendering.

```typescript
import { debugDraw, type DebugRenderer } from 'physengine';

// Implement the renderer interface for your graphics library
const canvasRenderer: DebugRenderer = {
  clear() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  },
  drawCircle(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.stroke();
  },
  drawRect(x, y, width, height, rotation, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.strokeStyle = color;
    ctx.strokeRect(-width / 2, -height / 2, width, height);
    ctx.restore();
  },
  drawPolygon(vertices, color) {
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    vertices.slice(1).forEach(v => ctx.lineTo(v.x, v.y));
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.stroke();
  },
  drawLine(start, end, color) {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = color;
    ctx.stroke();
  },
  drawPoint(position, color) {
    ctx.fillStyle = color;
    ctx.fillRect(position.x - 2, position.y - 2, 4, 4);
  },
  // Optional: needed only for showIds
  drawText(position, text, color) {
    ctx.fillStyle = color;
    ctx.fillText(text, position.x, position.y);
  },
};

// Render debug visualization
debugDraw(world, canvasRenderer, {
  showBodies: true,
  showAABBs: true,
  showVelocities: false,
  showCenterOfMass: false,
  showIds: true,
  // Planned once collisions/constraints exist: showContacts, showConstraints
});
```

A ready-made version ships as `CanvasRenderer` at the browser-only entry point
`@xavifabregat/physengine/canvas`, keeping the main entry headless.

---

## Implementation Order (v1.0)

Suggested order to build v1.0:

1. **Core math** - Vector2, Transform, AABB, utilities
2. **Body types** - Body interface, Circle, Polygon, Rectangle
3. **World basics** - createWorld, addBody, removeBody
4. **Integrator** - Semi-implicit Euler integration, basic step loop
5. **Broad phase** - Spatial hash grid
6. **Narrow phase** - SAT collision detection
7. **Collision response** - Impulse resolver
8. **Constraints** - Spring, Rod, Pin
9. **Materials** - Friction, restitution
10. **Collision filtering** - Layers, sensors
11. **Events** - Collision callbacks
12. **Queries** - Raycast, point query, AABB query
13. **Forces API** - applyForce, applyImpulse, applyTorque
14. **Debug draw** - Visualization interface
15. **Fluent API** - World class wrapper
16. **Presets** - Default configurations

---

## References

- [Box2D](https://box2d.org/) - Industry standard 2D physics
- [Matter.js](https://brm.io/matter-js/) - JavaScript physics engine
- [Rapier](https://rapier.rs/) - Modern Rust physics (has JS bindings)
- [Game Physics Engine Development](https://www.amazon.com/Game-Physics-Engine-Development-Commercial-Grade/dp/0123819768) - Ian Millington
- [Real-Time Collision Detection](https://www.amazon.com/Real-Time-Collision-Detection-Interactive-Technology/dp/1558607323) - Christer Ericson
