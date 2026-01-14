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
   * Material density in kg/m².
   * Used to calculate mass from shape area.
   * Typical values:
   * - Wood: ~500
   * - Plastic: ~900
   * - Rock: ~2000
   * - Metal: ~7000
   */
  density: number;
}

/**
 * Default material properties (balanced for general use).
 */
export const DEFAULT_MATERIAL: Readonly<Material> = Object.freeze({
  friction: 0.3,
  restitution: 0.2,
  density: 1000,
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

