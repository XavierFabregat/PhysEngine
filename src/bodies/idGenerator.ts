/**
 * Shared body ID generator.
 * 
 * Ensures unique IDs across all body types (circles, rectangles, polygons).
 * IDs are sequential and deterministic.
 */

let nextBodyId = 0;

/**
 * Generates a unique body ID.
 * Thread-safe for single-threaded JavaScript environments.
 * IDs are unique across all body factories.
 * 
 * @returns A unique string identifier in the format "body_N"
 * @example
 * const id1 = generateBodyId(); // "body_0"
 * const id2 = generateBodyId(); // "body_1"
 */
export const generateBodyId = (): string => {
  return `body_${nextBodyId++}`;
};

/**
 * Resets the body ID counter to 0.
 * 
 * ⚠️ WARNING: Only use this in tests for deterministic behavior.
 * Never call this in production code as it can create duplicate IDs
 * if bodies from before the reset still exist.
 * 
 * @internal
 * @example
 * // In test setup
 * beforeEach(() => {
 *   resetBodyIdCounter();
 * });
 */
export const resetBodyIdCounter = (): void => {
  nextBodyId = 0;
};

/**
 * Gets the current ID counter value.
 * Useful for debugging and testing.
 * 
 * @returns The next ID that will be generated
 * @internal
 */
export const getCurrentIdCount = (): number => {
  return nextBodyId;
};

