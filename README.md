# PhysEngine

A 2D physics engine for games and simulations, prioritizing simplicity and extensibility.

## Status: In Development 🚧

**Current Version:** 0.1.0-alpha  
**Core Math Layer:** ✅ Complete (293 tests passing)  
**Physics Simulation:** ⏳ Coming soon

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

## Installation (Not Yet Published)

This library is still in early development and not yet published to npm.

To try it out:
```bash
git clone <repo-url>
cd PhysEngine
pnpm install
pnpm build
pnpm example:orbit  # Try the demos!
```

## Development

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

## Project Structure

```
PhysEngine/
├── src/
│   └── core/              # Core math primitives
│       ├── Vector2.ts     # 2D vector operations
│       ├── Transform.ts   # Coordinate transforms
│       ├── AABB.ts        # Bounding boxes
│       └── math.ts        # Utility functions
├── examples/              # Interactive demos
├── dist/                  # Built library (npm package)
└── IMPLEMENTATION.md      # Full roadmap
```

## Roadmap

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the complete plan.

### Next Up:
- **Bodies & Shapes** - Circle, polygon, rectangle
- **World Management** - Add/remove bodies, queries
- **Integration** - Verlet integrator, simulation loop
- **Collision Detection** - Spatial hash (broad) + SAT (narrow)
- **Constraints** - Springs, rods, pins
- **Events** - Collision callbacks

## Design Goals

1. **Simplicity** - Clean, intuitive API
2. **Extensibility** - Pluggable systems via dependency injection
3. **Performance** - Efficient defaults, optimizations available when needed
4. **Tree-shakeable** - Functional core for optimal bundling

## Testing

**293 tests** covering all core math operations:
- ✅ 84 tests - Vector2
- ✅ 87 tests - math utilities
- ✅ 49 tests - Transform
- ✅ 73 tests - AABB

```bash
pnpm test:run
```

## License

ISC

## Contributing

This project is in early development. Once v1.0 is released, contributions will be welcome!

---

**Progress:** 47% of v1.0 foundation complete | [View full implementation plan →](./IMPLEMENTATION.md)

