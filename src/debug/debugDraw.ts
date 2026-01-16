import type { World } from '../types/World.js';
import type { DebugRenderer, DebugDrawOptions } from './DebugRenderer.js';
import * as Transform from '../core/Transform.js';
import * as Vec2 from '../core/Vector2.js';

/**
 * Default debug draw options.
 */
const DEFAULT_OPTIONS: Required<DebugDrawOptions> = {
  showBodies: true,
  showAABBs: false,
  showVelocities: false,
  showCenterOfMass: false,
  showIds: false,
};

/**
 * Color scheme for different body states.
 */
const COLORS = {
  STATIC: '#888888',      // Gray for static bodies
  DYNAMIC: '#4488ff',     // Blue for dynamic bodies
  KINEMATIC: '#ff8800',   // Orange for kinematic bodies
  AABB: '#00ff00',        // Green for AABBs
  VELOCITY: '#ff0000',    // Red for velocity vectors
  CENTER_OF_MASS: '#ff00ff', // Magenta for center of mass
};

/**
 * Renders a physics world using a debug renderer.
 * 
 * This function visualizes the current state of a physics world,
 * including bodies, AABBs, velocities, and other debug information.
 * 
 * @param world - The physics world to visualize
 * @param renderer - Implementation of the DebugRenderer interface
 * @param options - Visualization options (what to show/hide)
 * @example
 * // Basic usage
 * debugDraw(world, canvasRenderer);
 * 
 * // With options
 * debugDraw(world, canvasRenderer, {
 *   showBodies: true,
 *   showAABBs: true,
 *   showVelocities: false
 * });
 */
export const debugDraw = (
  world: World,
  renderer: DebugRenderer,
  options: DebugDrawOptions = {}
): void => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Clear the rendering surface
  renderer.clear();

  // Draw each body in the world
  for (const body of world.bodies) {
    // Determine body color based on type
    const bodyColor =
      body.type === 'static'
        ? COLORS.STATIC
        : body.type === 'kinematic'
          ? COLORS.KINEMATIC
          : COLORS.DYNAMIC;

    // Draw body shape
    if (opts.showBodies) {
      if (body.shape.type === 'circle') {
        renderer.drawCircle(
          body.position.x,
          body.position.y,
          body.shape.radius,
          bodyColor
        );
      } else if (body.shape.type === 'rectangle') {
        renderer.drawRect(
          body.position.x,
          body.position.y,
          body.shape.width,
          body.shape.height,
          body.rotation,
          bodyColor
        );
      } else if (body.shape.type === 'polygon') {
        // Transform polygon vertices to world space
        const transform = Transform.create(body.position, body.rotation);
        const worldVertices = body.shape.vertices.map((v) =>
          Transform.transformPoint(transform, v)
        );
        renderer.drawPolygon(worldVertices, bodyColor);
      }
    }

    // Draw AABB (bounding box)
    if (opts.showAABBs) {
      const { min, max } = body.aabb;
      const width = max.x - min.x;
      const height = max.y - min.y;
      const centerX = min.x + width * 0.5;
      const centerY = min.y + height * 0.5;

      renderer.drawRect(centerX, centerY, width, height, 0, COLORS.AABB);
    }

    // Draw velocity vector
    if (opts.showVelocities && Vec2.lengthSq(body.velocity) > 0.01) {
      const velocityScale = 1; // Scale factor for visibility
      const end = Vec2.add(
        body.position,
        Vec2.scale(body.velocity, velocityScale)
      );
      renderer.drawLine(body.position, end, COLORS.VELOCITY);
      
      // Draw arrowhead
      const direction = Vec2.normalize(body.velocity);
      const arrowSize = 5;
      const arrowAngle = Math.PI / 6; // 30 degrees
      
      const left = Vec2.rotate(direction, Math.PI - arrowAngle);
      const right = Vec2.rotate(direction, Math.PI + arrowAngle);
      
      const leftPoint = Vec2.add(end, Vec2.scale(left, arrowSize));
      const rightPoint = Vec2.add(end, Vec2.scale(right, arrowSize));
      
      renderer.drawLine(end, leftPoint, COLORS.VELOCITY);
      renderer.drawLine(end, rightPoint, COLORS.VELOCITY);
    }

    // Draw center of mass
    if (opts.showCenterOfMass) {
      renderer.drawPoint(body.position, COLORS.CENTER_OF_MASS);
    }
  }
};

