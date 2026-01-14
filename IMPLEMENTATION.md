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
- **Immutable vectors** - Prevents mutation bugs, easier to reason about
- **Composition over inheritance** - Bodies and constraints are composable pieces

### Systems Architecture

All pluggable systems implement interfaces, allowing users to swap implementations:

```typescript
interface PhysicsSystems {
  integrator: Integrator;       // How bodies move (Verlet, Euler, RK4)
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
│   │   ├── Verlet.ts          # Verlet integration (default)
│   │   ├── Euler.ts           # Semi-implicit Euler
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
│   │   └── PositionResolver.ts# Position-based (for Verlet)
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
└── index.ts                   # Public exports
```

---

## Version Roadmap

### v1.0 - Foundation

Core physics engine with all essential features for 2D game development.

#### Core Math
- [ ] `Vector2` - immutable 2D vector with full operations (add, sub, scale, dot, cross, normalize, rotate, etc.)
- [ ] `Transform` - position + rotation representation
- [ ] `AABB` - axis-aligned bounding box with overlap/contains tests
- [ ] `math` utilities - clamp, lerp, approximately equal, angle utils

#### Bodies
- [ ] Body types: `static`, `dynamic`, `kinematic`
- [ ] Shapes: `circle`, `polygon`, `rectangle`
- [ ] Particles (lightweight point masses)
- [ ] Properties: position, velocity, acceleration, angle, angularVelocity
- [ ] Mass and inertia calculation from shape + density

#### Materials
- [ ] `friction` - surface grip (0-1)
- [ ] `restitution` - bounciness (0-1)
- [ ] `density` - mass per unit area

#### Collision Detection
- [ ] Broad phase: Spatial hash grid (default)
- [ ] Narrow phase: SAT for circle-circle, circle-polygon, polygon-polygon
- [ ] Contact manifold generation (contact points, normal, penetration depth)

#### Collision Response
- [ ] Impulse-based resolver
- [ ] Position correction for penetration
- [ ] Friction impulses

#### Collision Filtering
- [ ] Layer/mask system for selective collision
- [ ] Sensor bodies (detect but don't respond)

#### Constraints
- [ ] Spring (soft distance constraint)
- [ ] Rod (rigid distance constraint)
- [ ] Pin (fix point to world)
- [ ] Iterative constraint solver

#### Forces
- [ ] Global gravity
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
- [ ] `createWorld(config)` - functional factory
- [ ] `step(world, dt)` - advance simulation
- [ ] Add/remove bodies and constraints
- [ ] Fluent `World` class wrapper

#### Systems Architecture
- [ ] `Integrator` interface + Verlet implementation
- [ ] `BroadPhase` interface + SpatialHash implementation
- [ ] `NarrowPhase` interface + SAT implementation
- [ ] `CollisionResolver` interface + Impulse implementation
- [ ] `defaultSystems` preset

#### Debug Renderer
- [ ] `DebugRenderer` interface - library-agnostic rendering contract
- [ ] `debugDraw(world, renderer, options?)` - visualize physics simulation
  - Bodies (shapes, outlines)
  - AABBs (bounding boxes)
  - Contacts (collision points, normals)
  - Constraints (springs, rods, pins)
  - Velocities (direction vectors)
  - Center of mass markers
  - Sleep state visualization
- [ ] Example implementations for Canvas and SVG
- [ ] Color schemes for different body states (static, dynamic, kinematic, sleeping)

---

### v1.1 - Performance & Polish

Optimizations and quality-of-life improvements.

#### Performance
- [ ] Body sleeping/deactivation system
- [ ] Sleep islands (groups of connected bodies sleep together)
- [ ] Warm starting for constraint solver

#### Additional Integrators
- [ ] Semi-implicit Euler
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

### Why Verlet Integration (Default)?

- Naturally stable for constraints and springs
- Position-based (good for games)
- Simple implementation
- Easy velocity derivation when needed

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
import { createWorld, createVerletIntegrator, createSpatialHash } from 'physengine';

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
import { debugDraw, DebugRenderer } from 'physengine';

// Implement the renderer interface for your graphics library
const canvasRenderer: DebugRenderer = {
  drawCircle(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.stroke();
  },
  drawPolygon(vertices, color) {
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    vertices.slice(1).forEach(v => ctx.lineTo(v.x, v.y));
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.stroke();
  },
  drawLine(x1, y1, x2, y2, color) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.stroke();
  },
  drawPoint(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
};

// Render debug visualization
debugDraw(world, canvasRenderer, {
  showBodies: true,
  showAABBs: true,
  showContacts: true,
  showConstraints: true,
  showVelocities: false
});
```

---

## Implementation Order (v1.0)

Suggested order to build v1.0:

1. **Core math** - Vector2, Transform, AABB, utilities
2. **Body types** - Body interface, Circle, Polygon, Rectangle
3. **World basics** - createWorld, addBody, removeBody
4. **Integrator** - Verlet integration, basic step loop
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
