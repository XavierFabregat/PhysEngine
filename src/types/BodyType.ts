/**
 * Body type defines how a body participates in the physics simulation.
 */
export type BodyType = 'static' | 'dynamic' | 'kinematic';

/**
 * Body type constants for convenience.
 */
export const BodyType = {
  /**
   * Static bodies never move and have infinite mass.
   * Used for: walls, floors, immovable obstacles.
   * - Does not respond to forces
   * - Does not move during integration
   * - Can collide with dynamic and kinematic bodies
   */
  STATIC: 'static' as const,

  /**
   * Dynamic bodies are fully simulated by physics.
   * Used for: balls, boxes, characters, projectiles.
   * - Responds to forces and gravity
   * - Moves during integration
   * - Can collide with all body types
   */
  DYNAMIC: 'dynamic' as const,

  /**
   * Kinematic bodies are moved by the user, not physics.
   * Used for: moving platforms, elevators, doors.
   * - Does not respond to forces or gravity
   * - Can be moved by setting velocity directly
   * - Has infinite mass (doesn't get pushed)
   * - Can collide with dynamic bodies
   */
  KINEMATIC: 'kinematic' as const,
} as const;

