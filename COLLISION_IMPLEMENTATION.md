# Collision Detection & Response Implementation Guide

This document details the implementation strategy for collision detection and response in PhysEngine.

## Table of Contents

1. [Overview](#overview)
2. [Two-Phase Architecture](#two-phase-architecture)
3. [Broad Phase](#broad-phase)
4. [Narrow Phase](#narrow-phase)
5. [Collision Response](#collision-response)
6. [Implementation Order](#implementation-order)
7. [Data Structures](#data-structures)
8. [Algorithms & Math](#algorithms--math)
9. [Testing Strategy](#testing-strategy)
10. [Performance Considerations](#performance-considerations)
11. [References](#references)

---

## Overview

Collision detection in 2D physics engines is split into **two phases** for performance:

1. **Broad Phase** - Fast, conservative filtering using AABBs (axis-aligned bounding boxes)
2. **Narrow Phase** - Precise, expensive geometry checks using actual shapes

This two-phase approach is industry standard and allows for:
- ✅ O(n²) → O(n) optimization via spatial partitioning (when needed)
- ✅ Cheap rejection of most non-colliding pairs
- ✅ Expensive precise checks only when necessary
- ✅ Pluggable systems (swap algorithms as needed)

---

## Two-Phase Architecture

### Why Two Phases?

**Problem:** Checking every body against every other body with precise geometry is too expensive.

**Solution:** 
1. Quick AABB check eliminates 90-99% of pairs
2. Precise geometry check only on remaining pairs

### Visual Example

```
100 bodies in the world
→ 100 × 99 / 2 = 4,950 potential pairs

Broad Phase (AABB):
  4,950 AABB checks (4 comparisons each = 19,800 ops)
  → 50 pairs where AABBs overlap (99% filtered!)

Narrow Phase (Geometry):
  50 precise checks (20-100 ops each = 1,000-5,000 ops)
  → 10 actual collisions

Total: ~25,000 ops instead of ~200,000 ops (8x faster!)
```

### The Pipeline

```
Bodies in World
     ↓
Broad Phase (BroadPhase interface)
├─ BruteForceBroadPhase (O(n²), simple)
├─ SpatialHashBroadPhase (O(n), complex)
└─ QuadTreeBroadPhase (O(n log n), future)
     ↓
Potential Pairs (AABBs overlap)
     ↓
Narrow Phase (NarrowPhase interface)
├─ Circle-Circle (distance check)
├─ Circle-Rectangle (closest point)
└─ Rectangle-Rectangle (SAT)
     ↓
Contact Manifolds
     ↓
Collision Response
├─ Position Correction
├─ Impulse Resolution
└─ Friction
     ↓
Bodies Updated (bounced, separated)
```

---

## Broad Phase

### Purpose

Quickly filter body pairs to find **potentially colliding** bodies using cheap AABB overlap tests.

### Interface

```typescript
/**
 * Broad phase collision detection interface.
 * Returns pairs of bodies whose AABBs overlap (potential collisions).
 */
interface BroadPhase {
  /**
   * Finds all pairs of bodies that might be colliding.
   * @param bodies - All bodies in the world
   * @returns Array of body index pairs
   */
  getPairs(bodies: readonly Body[]): BodyPair[];
}

type BodyPair = [number, number];  // Indices into bodies array
```

### Implementation 1: Brute Force (START HERE)

**When to use:** <200 bodies, learning, prototyping

```typescript
class BruteForceBroadPhase implements BroadPhase {
  getPairs(bodies: readonly Body[]): BodyPair[] {
    const pairs: BodyPair[] = [];
    
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const bodyA = bodies[i];
        const bodyB = bodies[j];
        
        // Check collision filtering first (cheap)
        if (!shouldCollide(bodyA, bodyB)) continue;
        
        // Check AABB overlap
        if (AABB.overlaps(bodyA.aabb, bodyB.aabb)) {
          pairs.push([i, j]);
        }
      }
    }
    
    return pairs;
  }
}
```

**Complexity:** O(n²)  
**Code:** ~15 lines  
**Performance:** Great for <200 bodies, acceptable for <500

### Implementation 2: Spatial Hash (LATER - When Needed)

**When to use:** >200 bodies, performance-critical games

```typescript
class SpatialHashBroadPhase implements BroadPhase {
  private cellSize: number;
  
  constructor(cellSize = 128) {
    this.cellSize = cellSize;
  }
  
  getPairs(bodies: readonly Body[]): BodyPair[] {
    // 1. Build hash grid (O(n))
    const grid = new Map<string, number[]>();
    
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      const cells = this.getCellsForAABB(body.aabb);
      
      for (const cell of cells) {
        if (!grid.has(cell)) grid.set(cell, []);
        grid.get(cell)!.push(i);
      }
    }
    
    // 2. Check bodies in same cells (O(n) average)
    const pairs = new Set<string>();
    
    for (const cellBodies of grid.values()) {
      for (let i = 0; i < cellBodies.length; i++) {
        for (let j = i + 1; j < cellBodies.length; j++) {
          const a = cellBodies[i];
          const b = cellBodies[j];
          const pairKey = `${Math.min(a, b)},${Math.max(a, b)}`;
          pairs.add(pairKey);
        }
      }
    }
    
    // 3. Verify with AABB checks
    return Array.from(pairs).map(key => {
      const [a, b] = key.split(',').map(Number);
      return [a, b] as BodyPair;
    }).filter(([a, b]) => {
      const bodyA = bodies[a];
      const bodyB = bodies[b];
      return shouldCollide(bodyA, bodyB) && AABB.overlaps(bodyA.aabb, bodyB.aabb);
    });
  }
  
  private getCellsForAABB(aabb: AABB): string[] {
    // Calculate which grid cells this AABB spans
    const minX = Math.floor(aabb.min.x / this.cellSize);
    const minY = Math.floor(aabb.min.y / this.cellSize);
    const maxX = Math.floor(aabb.max.x / this.cellSize);
    const maxY = Math.floor(aabb.max.y / this.cellSize);
    
    const cells: string[] = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        cells.push(`${x},${y}`);
      }
    }
    return cells;
  }
}
```

**Complexity:** O(n) average  
**Code:** ~80 lines  
**Performance:** Excellent for 200+ bodies

### How to Swap Implementations

```typescript
// Start simple
const world = createWorld({
  broadPhase: new BruteForceBroadPhase()
});

// Later, when profiling shows it's slow:
const world = createWorld({
  broadPhase: new SpatialHashBroadPhase({ cellSize: 128 })
});

// Step function doesn't change at all!
```

---

## Narrow Phase

### Purpose

Precisely detect if two bodies are colliding and calculate **contact information**:
- Contact point (where they touch)
- Contact normal (direction to push them apart)
- Penetration depth (how far they overlap)

### Interface

```typescript
/**
 * Contact information for a collision.
 */
interface Contact {
  /** Point of contact in world space */
  point: Vector2;
  
  /** Contact normal (from A to B, unit vector) */
  normal: Vector2;
  
  /** Penetration depth (positive = overlapping) */
  depth: number;
}

/**
 * Narrow phase collision detection interface.
 * Performs precise geometry checks for specific shape pairs.
 */
interface NarrowPhase {
  /**
   * Detects collision between two bodies.
   * @param bodyA - First body
   * @param bodyB - Second body
   * @returns Contact info if colliding, null otherwise
   */
  detect(bodyA: Body, bodyB: Body): Contact | null;
}
```

### Shape-Specific Detectors

Since bodies can be circles or rectangles, narrow phase needs to handle all combinations:

```typescript
class SATNarrowPhase implements NarrowPhase {
  detect(bodyA: Body, bodyB: Body): Contact | null {
    // Dispatch to correct algorithm based on shape types
    if (isCircle(bodyA.shape) && isCircle(bodyB.shape)) {
      return detectCircleCircle(bodyA, bodyB);
    }
    
    if (isCircle(bodyA.shape) && isRectangle(bodyB.shape)) {
      return detectCircleRect(bodyA, bodyB);
    }
    
    if (isRectangle(bodyA.shape) && isCircle(bodyB.shape)) {
      const contact = detectCircleRect(bodyB, bodyA);
      if (contact) {
        // Flip normal since we swapped order
        contact.normal = Vec2.negate(contact.normal);
      }
      return contact;
    }
    
    if (isRectangle(bodyA.shape) && isRectangle(bodyB.shape)) {
      return detectRectRect(bodyA, bodyB);
    }
    
    return null;  // Unsupported combination (e.g., polygon)
  }
}
```

---

## Collision Response

### Purpose

After detecting a collision, apply physics to make bodies bounce and separate.

### Two Steps

**1. Position Correction** (separate overlapping bodies)
```typescript
function correctPosition(bodyA: Body, bodyB: Body, contact: Contact): void {
  // Push bodies apart along contact normal
  // Split correction based on mass ratio
}
```

**2. Impulse Resolution** (bounce/velocity change)
```typescript
function resolveImpulse(bodyA: Body, bodyB: Body, contact: Contact): void {
  // Calculate impulse magnitude
  // Apply impulse to both bodies (equal and opposite)
  // Consider restitution (bounciness)
}
```

**3. Friction** (sliding resistance)
```typescript
function applyFriction(bodyA: Body, bodyB: Body, contact: Contact, normalImpulse: number): void {
  // Calculate tangent impulse
  // Apply friction based on material properties
}
```

### Interface (Future-Proof)

```typescript
interface CollisionResolver {
  resolve(bodyA: Body, bodyB: Body, contact: Contact): void;
}

class ImpulseResolver implements CollisionResolver {
  resolve(bodyA: Body, bodyB: Body, contact: Contact): void {
    correctPosition(bodyA, bodyB, contact);
    const impulse = resolveImpulse(bodyA, bodyB, contact);
    applyFriction(bodyA, bodyB, contact, impulse);
  }
}
```

---

## Implementation Order

Build in this order for incremental feedback and testing:

### **Phase 1: Types & Interfaces** (30 mins)

```
src/types/
├── Contact.ts        # Contact data structure
├── BroadPhase.ts     # Interface
├── NarrowPhase.ts    # Interface
└── CollisionResolver.ts  # Interface
```

**Deliverable:** Type definitions, compiles, no implementation yet

---

### **Phase 2: Broad Phase** (1 hour)

```
src/collision/broadphase/
└── BruteForce.ts     # O(n²) implementation
```

**Deliverable:** 
- Gets body pairs using AABB
- ~15 tests
- Filters by collision layers

---

### **Phase 3: Circle-Circle (Easiest Narrow Phase)** (2 hours)

```
src/collision/narrowphase/
└── circleCircle.ts
```

**Math:**
```typescript
const distance = Vec2.distance(a.position, b.position);
const minDistance = a.radius + b.radius;

if (distance < minDistance) {
  // Collision!
  const depth = minDistance - distance;
  const normal = Vec2.normalize(Vec2.sub(b.position, a.position));
  const point = Vec2.add(a.position, Vec2.scale(normal, a.radius));
  
  return { point, normal, depth };
}
```

**Deliverable:**
- Circle-circle detection works
- ~20 tests
- Can visualize collisions in debug viewer (change color when touching)

---

### **Phase 4: Simple Collision Response** (2 hours)

```
src/collision/response/
└── positionCorrection.ts  # Just push apart, no bounce yet
```

**Math:**
```typescript
// Split correction based on inverse mass
const totalInvMass = bodyA.invMass + bodyB.invMass;
const percent = 0.8;  // Correction percentage
const slop = 0.01;    // Penetration tolerance

const correction = Math.max(contact.depth - slop, 0) / totalInvMass * percent;

bodyA.position = Vec2.sub(bodyA.position, Vec2.scale(contact.normal, correction * bodyA.invMass));
bodyB.position = Vec2.add(bodyB.position, Vec2.scale(contact.normal, correction * bodyB.invMass));
```

**Deliverable:**
- Balls no longer overlap!
- Static bodies work correctly
- ~15 tests

---

### **Phase 5: Impulse Resolution (Bounce)** (3 hours)

```
src/collision/response/
└── impulseResolver.ts
```

**Math (simplified):**
```typescript
// Relative velocity
const rv = Vec2.sub(bodyB.velocity, bodyA.velocity);

// Velocity along normal
const velAlongNormal = Vec2.dot(rv, contact.normal);

// Don't resolve if velocities are separating
if (velAlongNormal > 0) return;

// Calculate restitution (bounciness)
const e = Math.min(bodyA.material.restitution, bodyB.material.restitution);

// Calculate impulse magnitude
const j = -(1 + e) * velAlongNormal;
const impulse = j / (bodyA.invMass + bodyB.invMass);

// Apply impulse
const impulseVec = Vec2.scale(contact.normal, impulse);
bodyA.velocity = Vec2.sub(bodyA.velocity, Vec2.scale(impulseVec, bodyA.invMass));
bodyB.velocity = Vec2.add(bodyB.velocity, Vec2.scale(impulseVec, bodyB.invMass));
```

**Deliverable:**
- **Balls bounce!** 🎉
- Restitution (bounciness) works
- ~20 tests

---

### **Phase 6: Circle-Rectangle Collision** (3 hours)

```
src/collision/narrowphase/
└── circleRect.ts
```

**Math:** Find closest point on rectangle to circle center

```typescript
// Transform circle center to rectangle's local space
const localCenter = Transform.inverseTransformPoint(rect.transform, circle.position);

// Clamp to rectangle bounds (find closest point)
const closestLocal = {
  x: clamp(localCenter.x, -rect.width/2, rect.width/2),
  y: clamp(localCenter.y, -rect.height/2, rect.height/2)
};

// Transform back to world space
const closestWorld = Transform.transformPoint(rect.transform, closestLocal);

// Check distance
const distance = Vec2.distance(circle.position, closestWorld);
if (distance < circle.radius) {
  // Collision!
}
```

**Deliverable:**
- Circle-rectangle collisions work
- Handles rotation correctly
- ~25 tests

---

### **Phase 7: Rectangle-Rectangle (SAT - HARD)** (4-6 hours)

```
src/collision/narrowphase/
└── sat.ts  # Separating Axis Theorem
```

**Algorithm:**

SAT (Separating Axis Theorem):
- If two convex shapes don't overlap, there exists an axis where their projections don't overlap
- Test all potential separating axes
- For rectangles: test 4 axes (2 per rectangle - perpendicular to edges)

```typescript
function detectRectRect(rectA: Body, rectB: Body): Contact | null {
  // Get axes to test (normals of each rectangle's edges)
  const axesA = getRectangleAxes(rectA);
  const axesB = getRectangleAxes(rectB);
  
  let minOverlap = Infinity;
  let separatingAxis = null;
  
  // Test all axes
  for (const axis of [...axesA, ...axesB]) {
    const overlapInfo = projectAndTest(rectA, rectB, axis);
    
    if (!overlapInfo.overlaps) {
      // Found separating axis - no collision
      return null;
    }
    
    if (overlapInfo.overlap < minOverlap) {
      minOverlap = overlapInfo.overlap;
      separatingAxis = axis;
    }
  }
  
  // All axes overlap - collision!
  return {
    normal: separatingAxis,
    depth: minOverlap,
    point: calculateContactPoint(rectA, rectB, separatingAxis)
  };
}
```

**Deliverable:**
- Rectangle-rectangle collisions work
- Rotated rectangles handled correctly
- ~30 tests
- **Full collision detection complete!**

---

### **Phase 8: Friction** (2 hours)

```
src/collision/response/
└── friction.ts
```

**Math:**
```typescript
// Calculate tangent vector (perpendicular to normal)
const tangent = Vec2.perpendicular(contact.normal);

// Relative velocity along tangent
const rv = Vec2.sub(bodyB.velocity, bodyA.velocity);
const velAlongTangent = Vec2.dot(rv, tangent);

// Calculate friction impulse (Coulomb friction model)
const mu = (bodyA.material.friction + bodyB.material.friction) / 2;
const frictionImpulse = -velAlongTangent / (bodyA.invMass + bodyB.invMass);

// Clamp to friction cone
const maxFriction = mu * normalImpulse;
const clampedFriction = clamp(frictionImpulse, -maxFriction, maxFriction);

// Apply friction impulse
const frictionVec = Vec2.scale(tangent, clampedFriction);
bodyA.velocity = Vec2.sub(bodyA.velocity, Vec2.scale(frictionVec, bodyA.invMass));
bodyB.velocity = Vec2.add(bodyB.velocity, Vec2.scale(frictionVec, bodyB.invMass));
```

**Deliverable:**
- Bodies slide realistically
- Friction materials work
- ~15 tests

---

## Data Structures

### Contact

```typescript
/**
 * Contact information for a collision between two bodies.
 */
interface Contact {
  /**
   * Point of contact in world space.
   * For multiple contact points, this is typically the deepest penetration point.
   */
  point: Vector2;
  
  /**
   * Contact normal vector (unit length).
   * Points from bodyA to bodyB.
   * Used to calculate impulse direction and position correction.
   */
  normal: Vector2;
  
  /**
   * Penetration depth (always positive for actual collisions).
   * How far the bodies overlap.
   * Used for position correction and impulse calculation.
   */
  depth: number;
}
```

### CollisionPair

```typescript
/**
 * A pair of body indices that might be colliding.
 * Used by broad phase to communicate with narrow phase.
 */
type BodyPair = [number, number];
```

### Manifold (Advanced - Future)

```typescript
/**
 * Contact manifold - multiple contact points.
 * Used for stable stacking and more accurate collision response.
 * NOTE: Start with single contact points, add this later.
 */
interface Manifold {
  bodyA: Body;
  bodyB: Body;
  contacts: Contact[];  // Up to 4 contact points for rect-rect
  normal: Vector2;
}
```

---

## Algorithms & Math

### Circle-Circle Collision

**Simplest case** - start here for learning.

```typescript
/**
 * Detects collision between two circles.
 * 
 * Math:
 * - Distance between centers: d = |pB - pA|
 * - Sum of radii: r = rA + rB
 * - Collision if: d < r
 * - Penetration: depth = r - d
 * - Normal: (pB - pA) / d
 * 
 * @param circleA - First circle body
 * @param circleB - Second circle body
 * @returns Contact info if colliding, null otherwise
 */
function detectCircleCircle(circleA: Body, circleB: Body): Contact | null {
  const radiusA = circleA.shape.radius;
  const radiusB = circleB.shape.radius;
  
  // Vector from A to B
  const diff = Vec2.sub(circleB.position, circleA.position);
  const distanceSq = Vec2.lengthSq(diff);
  const minDistance = radiusA + radiusB;
  const minDistanceSq = minDistance * minDistance;
  
  // Check collision (use squared distance to avoid sqrt)
  if (distanceSq >= minDistanceSq) {
    return null;  // Not colliding
  }
  
  const distance = Math.sqrt(distanceSq);
  
  // Handle edge case: circles at exact same position
  if (distance === 0) {
    return {
      point: circleA.position,
      normal: { x: 1, y: 0 },  // Arbitrary direction
      depth: minDistance
    };
  }
  
  // Calculate contact info
  const normal = Vec2.scale(diff, 1 / distance);  // Normalize
  const depth = minDistance - distance;
  const point = Vec2.add(circleA.position, Vec2.scale(normal, radiusA));
  
  return { point, normal, depth };
}
```

**Tests to write:**
- Circles clearly separated → null
- Circles touching → contact with depth ≈ 0
- Circles overlapping → contact with depth > 0
- Circles at same position → handles gracefully
- Contact normal points from A to B
- Contact point is on circle A's surface

---

### Circle-Rectangle Collision

**Medium difficulty** - closest point algorithm.

```typescript
/**
 * Detects collision between circle and rectangle.
 * 
 * Math:
 * - Transform circle center to rectangle's local space
 * - Find closest point on rectangle to circle center
 * - Check if closest point is within circle radius
 * 
 * @param circle - Circle body
 * @param rect - Rectangle body
 * @returns Contact info if colliding, null otherwise
 */
function detectCircleRect(circle: Body, rect: Body): Contact | null {
  // Transform circle center to rectangle's local space
  const rectTransform = Transform.create(rect.position, rect.rotation);
  const circleLocalPos = Transform.inverseTransformPoint(rectTransform, circle.position);
  
  // Find closest point on rectangle (in local space)
  const halfWidth = rect.shape.width / 2;
  const halfHeight = rect.shape.height / 2;
  
  const closestLocal = {
    x: math.clamp(circleLocalPos.x, -halfWidth, halfWidth),
    y: math.clamp(circleLocalPos.y, -halfHeight, halfHeight)
  };
  
  // Transform closest point back to world space
  const closestWorld = Transform.transformPoint(rectTransform, closestLocal);
  
  // Check if closest point is within circle
  const diff = Vec2.sub(circle.position, closestWorld);
  const distanceSq = Vec2.lengthSq(diff);
  const radiusSq = circle.shape.radius * circle.shape.radius;
  
  if (distanceSq >= radiusSq) {
    return null;  // Not colliding
  }
  
  const distance = Math.sqrt(distanceSq);
  
  // Circle center is inside rectangle
  if (distance === 0) {
    // Find which edge is closest to push circle out
    const distToEdges = [
      halfWidth - Math.abs(circleLocalPos.x),   // Left/right
      halfHeight - Math.abs(circleLocalPos.y)   // Top/bottom
    ];
    
    if (distToEdges[0] < distToEdges[1]) {
      // Push horizontally
      const normal = Transform.transformDirection(rectTransform, {
        x: circleLocalPos.x > 0 ? 1 : -1,
        y: 0
      });
      return {
        point: closestWorld,
        normal,
        depth: circle.shape.radius + distToEdges[0]
      };
    } else {
      // Push vertically
      const normal = Transform.transformDirection(rectTransform, {
        x: 0,
        y: circleLocalPos.y > 0 ? 1 : -1
      });
      return {
        point: closestWorld,
        normal,
        depth: circle.shape.radius + distToEdges[1]
      };
    }
  }
  
  // Normal collision
  const normal = Vec2.normalize(diff);
  const depth = circle.shape.radius - distance;
  const point = closestWorld;
  
  return { point, normal, depth };
}
```

**Edge cases to test:**
- Circle outside rectangle → null
- Circle touching corner → correct
- Circle touching edge → correct
- Circle center inside rectangle → pushes out shortest distance
- Works with rotated rectangles

---

### Rectangle-Rectangle Collision (SAT)

**Hardest part** - Separating Axis Theorem.

**Concept:**
- Two convex polygons don't overlap if you can draw a line between them
- For rectangles, only need to test 4 axes (perpendicular to each edge)

```typescript
/**
 * Detects collision between two rectangles using SAT.
 * 
 * Algorithm:
 * 1. Get potential separating axes (perpendicular to each edge)
 * 2. For each axis:
 *    a. Project both rectangles onto axis
 *    b. Check if projections overlap
 *    c. Track minimum overlap
 * 3. If all axes overlap → collision
 * 4. Axis with minimum overlap is collision normal
 * 
 * @param rectA - First rectangle
 * @param rectB - Second rectangle
 * @returns Contact info if colliding, null otherwise
 */
function detectRectRect(rectA: Body, rectB: Body): Contact | null {
  // Get world-space vertices
  const transformA = Transform.create(rectA.position, rectA.rotation);
  const transformB = Transform.create(rectB.position, rectB.rotation);
  
  const verticesA = rectA.shape.vertices.map(v => 
    Transform.transformPoint(transformA, v)
  );
  const verticesB = rectB.shape.vertices.map(v => 
    Transform.transformPoint(transformB, v)
  );
  
  // Get axes to test (perpendicular to edges)
  const axesA = getPerpendicularAxes(verticesA);
  const axesB = getPerpendicularAxes(verticesB);
  
  let minOverlap = Infinity;
  let collisionAxis = null;
  
  // Test all axes
  for (const axis of [...axesA, ...axesB]) {
    const projA = projectOntoAxis(verticesA, axis);
    const projB = projectOntoAxis(verticesB, axis);
    
    const overlap = getOverlap(projA, projB);
    
    if (overlap <= 0) {
      // Found separating axis - no collision
      return null;
    }
    
    if (overlap < minOverlap) {
      minOverlap = overlap;
      collisionAxis = axis;
    }
  }
  
  // All axes overlap - collision detected
  // Ensure normal points from A to B
  const centerDiff = Vec2.sub(rectB.position, rectA.position);
  if (Vec2.dot(collisionAxis, centerDiff) < 0) {
    collisionAxis = Vec2.negate(collisionAxis);
  }
  
  return {
    normal: collisionAxis,
    depth: minOverlap,
    point: calculateContactPoint(verticesA, verticesB, collisionAxis)
  };
}

// Helper functions
function getPerpendicularAxes(vertices: Vector2[]): Vector2[] {
  const axes: Vector2[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % vertices.length];
    const edge = Vec2.sub(v2, v1);
    const perpendicular = Vec2.normalize(Vec2.perpendicular(edge));
    axes.push(perpendicular);
  }
  return axes;
}

function projectOntoAxis(vertices: Vector2[], axis: Vector2): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  
  for (const vertex of vertices) {
    const projection = Vec2.dot(vertex, axis);
    min = Math.min(min, projection);
    max = Math.max(max, projection);
  }
  
  return { min, max };
}

function getOverlap(projA: Projection, projB: Projection): number {
  // If projections don't overlap, return 0
  if (projA.max < projB.min || projB.max < projA.min) {
    return 0;
  }
  
  // Calculate overlap amount
  return Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
}
```

**Deliverable:**
- Rectangle-rectangle collisions work
- Handles all rotations
- Edge cases (corner-corner, edge-edge, face-face)
- ~35 tests (lots of edge cases!)

---

## Testing Strategy

### Test Pyramid

```
Integration Tests (Few)
    ↓
  Component Tests (Many)
    ↓
      Unit Tests (Most)
```

### For Each Algorithm

**1. Unit Tests** - Pure functions
```typescript
// Test the math in isolation
detectCircleCircle(mockBodyA, mockBodyB)
```

**2. Component Tests** - With real bodies
```typescript
const bodyA = createCircle({ ... });
const bodyB = createCircle({ ... });
const contact = detect(bodyA, bodyB);
```

**3. Integration Tests** - Full simulation
```typescript
const world = createWorld();
addBody(world, ballA);
addBody(world, ballB);
step(world, 1/60);  // Should bounce
```

### Test Cases to Cover

**For each collision type:**
- ✅ Clearly separated (no collision)
- ✅ Just touching (contact depth ≈ 0)
- ✅ Overlapping (contact depth > 0)
- ✅ Deep penetration (stress test)
- ✅ Contact normal points correct direction
- ✅ Contact point is accurate
- ✅ Edge cases (same position, zero-size, etc.)

### Visual Testing

**Use debug viewer to verify:**
- Toggle collision visualization
- Watch bounces in real-time
- Check if bodies separate correctly
- Verify no tunneling (fast objects)

---

## Performance Considerations

### Profiling Points

**Before optimizing, measure:**
```typescript
console.time('broad-phase');
const pairs = broadPhase.getPairs(world.bodies);
console.timeEnd('broad-phase');

console.time('narrow-phase');
for (const [a, b] of pairs) {
  narrowPhase.detect(a, b);
}
console.timeEnd('narrow-phase');
```

### When to Optimize

**Thresholds:**
- < 16ms per frame (60fps) → No optimization needed
- 16-33ms → Consider spatial hash
- > 33ms → Definitely need spatial hash or reduce body count

### Optimization Strategy

**1. Measure first**
- Which phase is slow? (usually broad for many bodies)
- Profile with realistic body counts

**2. Low-hanging fruit**
- Skip static-static pairs (they never collide)
- Skip sleeping bodies
- Early-out in SAT (first separating axis found)

**3. Algorithmic improvements**
- BruteForce → SpatialHash (broad phase)
- Single contact → Contact manifold (narrow phase)
- Sequential impulses → Iterative solver (response)

### Memory Considerations

**Reuse allocations:**
```typescript
class SATNarrowPhase {
  private axesCache: Vector2[] = [];  // Reuse between frames
  
  detect(a, b) {
    this.axesCache.length = 0;  // Clear, don't reallocate
    // ... use cache
  }
}
```

**Object pooling:**
```typescript
class ContactPool {
  private pool: Contact[] = [];
  
  acquire(): Contact {
    return this.pool.pop() || { point: {x:0,y:0}, normal: {x:0,y:0}, depth: 0 };
  }
  
  release(contact: Contact): void {
    this.pool.push(contact);
  }
}
```

**Only add if profiling shows garbage collection issues!**

---

## Integration into step()

### Current step() Function

```typescript
export const step = (world: World, dt: number): void => {
  // 1. Integrate
  for (const body of world.bodies) {
    world.integrator.integrate(body, dt, world.gravity);
  }
  
  // 2. Update AABBs
  for (const body of world.bodies) {
    updateBodyAABB(body);
  }
  
  // 3. Increment time
  world.time += dt;
};
```

### After Adding Collision

```typescript
export const step = (world: World, dt: number): void => {
  // 1. Integrate (update positions/velocities)
  for (const body of world.bodies) {
    world.integrator.integrate(body, dt, world.gravity);
  }
  
  // 2. Update AABBs
  for (const body of world.bodies) {
    updateBodyAABB(body);
  }
  
  // 3. Broad phase (get potential collisions) ← NEW
  const pairs = world.broadPhase.getPairs(world.bodies);
  
  // 4. Narrow phase (detect precise collisions) ← NEW
  const contacts: ContactPair[] = [];
  for (const [i, j] of pairs) {
    const contact = world.narrowPhase.detect(world.bodies[i], world.bodies[j]);
    if (contact) {
      contacts.push({ bodyA: world.bodies[i], bodyB: world.bodies[j], contact });
    }
  }
  
  // 5. Collision response (resolve collisions) ← NEW
  for (const { bodyA, bodyB, contact } of contacts) {
    world.resolver.resolve(bodyA, bodyB, contact);
  }
  
  // 6. Increment time
  world.time += dt;
};
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Tunneling

**Problem:** Fast objects pass through thin walls

**Solution:** Continuous Collision Detection (CCD)
- Only for bodies marked with `isBullet: true`
- Raycast along velocity vector
- Find time of impact
- More expensive, opt-in only

### Pitfall 2: Stacking Instability

**Problem:** Stacked objects jitter or explode

**Solutions:**
1. **Contact manifolds** (multiple contact points)
2. **Iterative solver** (resolve contacts multiple times)
3. **Warm starting** (reuse impulse from previous frame)
4. **Baumgarte stabilization** (blend position/velocity correction)

### Pitfall 3: Rotation Issues

**Problem:** Boxes rotate incorrectly after collision

**Solution:** Include angular impulse
```typescript
const rA = Vec2.sub(contact.point, bodyA.position);  // Lever arm
const angularImpulse = Vec2.cross(rA, impulseVec);
bodyA.angularVelocity += angularImpulse * bodyA.invInertia;
```

### Pitfall 4: Energy Gain

**Problem:** System gains energy over time (objects speed up)

**Solutions:**
1. Clamp restitution to [0, 1]
2. Add damping (0.99x velocity each frame)
3. Use symplectic integrator (Verlet handles this well)

---

## Testing Checklist

### Before Committing Each Phase

- [ ] All tests pass (>90% coverage)
- [ ] TypeScript compiles with no errors
- [ ] No linter warnings
- [ ] Tested in debug viewer visually
- [ ] Performance acceptable (<16ms per frame with test body count)
- [ ] Edge cases handled gracefully
- [ ] Documentation updated

### Specific Collision Tests

**Circle-Circle:**
- [ ] No collision when separated
- [ ] Contact when touching
- [ ] Correct normal direction
- [ ] Handles identical positions
- [ ] Penetration depth accurate

**Circle-Rectangle:**
- [ ] All 4 edges
- [ ] All 4 corners
- [ ] Circle inside rectangle
- [ ] Rotated rectangles
- [ ] Edge cases

**Rectangle-Rectangle (SAT):**
- [ ] No collision when separated
- [ ] Edge-edge collision
- [ ] Corner-corner collision
- [ ] Face-face collision
- [ ] Rotated rectangles (all angles)
- [ ] Nested rectangles

**Response:**
- [ ] Bodies separate after overlap
- [ ] Bouncing works (restitution)
- [ ] No energy gain
- [ ] Static bodies don't move
- [ ] Friction works

---

## References

### Essential Reading

1. **[Real-Time Collision Detection](https://www.amazon.com/Real-Time-Collision-Detection-Interactive-Technology/dp/1558607323)** by Christer Ericson
   - Chapter 4: Bounding Volumes (AABB)
   - Chapter 5: Basic Primitive Tests (circle-circle, circle-rect)
   - Chapter 5.5.5: SAT for polygons

2. **[Game Physics Engine Development](https://www.amazon.com/Game-Physics-Engine-Development-Commercial-Grade/dp/0123819768)** by Ian Millington
   - Chapter 12: Collision Detection
   - Chapter 13: Collision Resolution
   - Chapter 14: Impulse-Based Resolution

### Online Resources

3. **[dyn4j.org SAT Tutorial](https://dyn4j.org/2010/01/sat/)**
   - Clear SAT explanation with code
   - 2D-specific
   - Interactive examples

4. **[Box2D Source Code](https://github.com/erincatto/box2d)**
   - `b2Collision.cpp` - Reference implementation
   - Industry-proven algorithms
   - Well-commented

5. **[Matter.js Collision](https://github.com/liabru/matter-js/tree/master/src/collision)**
   - JavaScript implementation (easier to read)
   - SAT.js shows complete algorithm

### Academic Papers

6. **[Catto - Physics for Game Programmers: Numerical Methods](https://box2d.org/files/ErinCatto_NumericalMethods_GDC2015.pdf)**
   - Erin Catto (Box2D creator)
   - Numerical stability
   - Contact solving

---

## Glossary

**AABB** - Axis-Aligned Bounding Box. Rectangle aligned with world axes (never rotates).

**Broad Phase** - Fast, conservative collision filtering using AABBs.

**Narrow Phase** - Precise collision detection using actual geometry.

**Contact** - Information about a collision (point, normal, depth).

**Contact Normal** - Unit vector pointing from bodyA to bodyB at collision point.

**Penetration Depth** - How far two bodies overlap (always positive for collisions).

**SAT** - Separating Axis Theorem. Algorithm for convex polygon collision detection.

**Manifold** - Set of contact points for a collision (advanced, for stability).

**Impulse** - Instant change in velocity (used for collision response).

**Restitution** - Bounciness coefficient (0 = no bounce, 1 = perfect bounce).

**Friction** - Resistance to sliding (0 = frictionless, 1 = maximum grip).

**CCD** - Continuous Collision Detection. Prevents tunneling for fast objects.

---

## FAQ for AI Agents

### Q: Should I implement all shape combinations at once?

**A:** No. Build incrementally:
1. Circle-circle (simplest, validates architecture)
2. Circle-rectangle (medium, useful for games)
3. Rectangle-rectangle (hardest, completes feature)

### Q: O(n²) vs Spatial Hash - which first?

**A:** O(n²) (BruteForceBroadPhase). It's simple, works for most games, and the interface makes swapping to SpatialHash later trivial.

### Q: Should I use contact manifolds?

**A:** Not initially. Start with single contact points. Add manifolds later if you see stacking issues.

### Q: How accurate should SAT be?

**A:** Exact for collision detection. Approximations are fine for contact point calculation (can use center of overlap instead of true contact point).

### Q: What about swept/continuous collision?

**A:** Save for v1.2+ (advanced feature). Discrete collision detection (per-frame checks) works for 95% of games.

### Q: Should collision response be iterative?

**A:** Start with single-pass (resolve each contact once). Add iterations (3-10) later if you see jitter or sinking.

### Q: Test coverage target?

**A:** Aim for >90% on collision code. It's complex and bugs are hard to spot visually.

---

## Implementation Checklist

**Before starting:**
- [x] Bodies working (createCircle, createRectangle)
- [x] World working (createWorld, step)
- [x] Integration working (Verlet)
- [x] AABBs updating correctly
- [x] Debug viewer showing bodies

**Phase 1: Foundation**
- [ ] Contact type defined
- [ ] BroadPhase interface
- [ ] NarrowPhase interface  
- [ ] CollisionResolver interface

**Phase 2: Simple Collision**
- [ ] BruteForceBroadPhase
- [ ] Circle-circle detection
- [ ] Position correction
- [ ] Basic impulse (no rotation)
- [ ] Visible in debug viewer

**Phase 3: Complete Narrow Phase**
- [ ] Circle-rectangle detection
- [ ] Rectangle-rectangle (SAT)
- [ ] All shape combinations working

**Phase 4: Full Response**
- [ ] Impulse with rotation
- [ ] Friction
- [ ] Restitution (bounciness)

**Phase 5: Polish**
- [ ] Iterative solver (optional)
- [ ] Contact manifolds (optional)
- [ ] Performance profiling
- [ ] Spatial hash (if needed)

---

## Architecture Summary

```
World
  ├─ bodies: Body[]
  ├─ gravity: Vector2
  ├─ integrator: Integrator (pluggable) ✅ Already implemented
  ├─ broadPhase: BroadPhase (pluggable) ⏳ To implement
  ├─ narrowPhase: NarrowPhase (pluggable) ⏳ To implement
  └─ resolver: CollisionResolver (pluggable) ⏳ To implement

createWorld({
  integrator: new VerletIntegrator(),
  broadPhase: new BruteForceBroadPhase(),
  narrowPhase: new SATNarrowPhase(),
  resolver: new ImpulseResolver()
})
```

**Benefit:** Easy to swap any component without refactoring step() function.

**Total code for basic collision:** ~500-800 lines across 10-15 files  
**Total tests:** ~150-200 tests  
**Estimated time:** 12-16 hours spread over 1-2 weeks

---

## Next Steps

1. Read this document thoroughly
2. Start with Contact type definition
3. Build BruteForceBroadPhase
4. Build Circle-Circle detection
5. Add simple position correction
6. See balls bounce!
7. Iterate from there

**Remember:** Build incrementally, test thoroughly, commit often. Don't try to implement everything at once!

