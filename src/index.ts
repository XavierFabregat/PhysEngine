/**
 * PhysEngine - 2D Physics Engine
 * 
 * A 2D physics engine for games and simulations.
 */

// ============================================================
// CORE MATH MODULES
// ============================================================

export * as Vector2 from './core/Vector2.js';
export * as Transform from './core/Transform.js';
export * as AABB from './core/AABB.js';
export * as math from './core/math.js';

// ============================================================
// TYPES
// ============================================================

// Core types
export type { Vector2 as Vector2Type } from './core/Vector2.js';
export type { Transform as TransformType } from './core/Transform.js';
export type { AABB as AABBType } from './core/AABB.js';

// Body types
export type { Body } from './types/Body.js';
export type { BodyType as BodyTypeEnum } from './types/BodyType.js';
export type { Material } from './types/Material.js';
export type { Shape, CircleShape, RectangleShape, PolygonShape } from './types/Shape.js';
export type { World } from './types/World.js';

// Body type constants (exported as value)
export { BodyType } from './types/BodyType.js';

// ============================================================
// BODY FACTORIES
// ============================================================

export { createCircle } from './bodies/createCircle.js';
export type { CircleConfig } from './bodies/createCircle.js';

export { createRectangle } from './bodies/createRectangle.js';
export type { RectangleConfig } from './bodies/createRectangle.js';

// ============================================================
// WORLD
// ============================================================

export { createWorld } from './world/createWorld.js';
export type { WorldConfig } from './world/createWorld.js';

export {
  addBody,
  removeBody,
  getBody,
  getBodies,
  getBodyCount,
  clear,
  hasBody,
} from './world/body.js';

// ============================================================
// DEBUG RENDERER
// ============================================================

export type { DebugRenderer, DebugDrawOptions } from './debug/DebugRenderer.js';
export { debugDraw } from './debug/debugDraw.js';

// Example implementations (reference - users should copy/customize)
export { CanvasRenderer } from './debug/examples/CanvasRenderer.js';

// ============================================================
// UTILITIES
// ============================================================

// Material utilities
export { createMaterial, DEFAULT_MATERIAL } from './types/Material.js';

// Shape type guards
export { isCircle, isRectangle, isPolygon } from './types/Shape.js';

// Body type helpers
export { isStatic, isDynamic, isKinematic, shouldCollide } from './types/Body.js';
