/**
 * PhysEngine - 2D Physics Engine
 * 
 * Core math primitives for 2D physics simulation.
 */

// Core math modules
export * as Vector2 from './core/Vector2.js';
export * as Transform from './core/Transform.js';
export * as AABB from './core/AABB.js';
export * as math from './core/math.js';

// Re-export types with different names to avoid conflicts
export type { Vector2 as Vector2Type } from './core/Vector2.js';
export type { Transform as TransformType } from './core/Transform.js';
export type { AABB as AABBType } from './core/AABB.js';
