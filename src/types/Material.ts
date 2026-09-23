/**
 * Physical material properties that define how a body behaves in collisions.
 */
export interface Material {
  /**
   * Coefficient of friction (0-1).
   * 0 = perfectly slippery (ice)
   * 1 = maximum grip (rubber on asphalt)
   * Typical values: 0.3-0.8
   */
  friction: number;

  /**
   * Coefficient of restitution (bounciness, 0-1).
   * 0 = no bounce (clay, perfectly inelastic)
   * 1 = perfect bounce (super ball, perfectly elastic)
   * Typical values: 0.2-0.8
   */
  restitution: number;

  /**
   * Mass per unit area, in world units (pixels² by default).
   * Used to calculate mass from shape area: mass = area × density.
   * Only ratios between bodies matter for collisions, so pick a relative scale.
   * Suggested relative values (default = 1):
   * - Light (foam, wood): 0.3-0.7
   * - Medium (plastic, water): ~1
   * - Heavy (rock): ~2.5
   * - Very heavy (metal): ~8
   * Must be > 0 for dynamic bodies.
   */
  density: number;
}

/**
 * Default material properties (balanced for general use).
 */
export const DEFAULT_MATERIAL: Readonly<Material> = Object.freeze({
  friction: 0.3,
  restitution: 0.2,
  density: 1,
});

/**
 * Creates a material with given properties.
 * Uses defaults for any undefined values.
 * @param partial - Partial material properties
 * @returns A complete Material object
 */
export const createMaterial = (partial: Partial<Material> = {}): Material => ({
  friction: partial.friction ?? DEFAULT_MATERIAL.friction,
  restitution: partial.restitution ?? DEFAULT_MATERIAL.restitution,
  density: partial.density ?? DEFAULT_MATERIAL.density,
});

