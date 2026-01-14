/**
 * Core mathematical utility functions for the physics engine.
 */

// ============================================================
// VALUE OPERATIONS
// ============================================================

/**
 * Clamps a value between a minimum and maximum.
 * Math: max(min, min(value, max))
 * @param value - The value to clamp
 * @param min - The minimum allowed value
 * @param max - The maximum allowed value
 * @returns The clamped value
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Maps a value from one range to another.
 * Math: ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin
 * Useful for scaling values between different coordinate systems or ranges.
 * @param value - The value to map
 * @param inMin - The minimum of the input range
 * @param inMax - The maximum of the input range
 * @param outMin - The minimum of the output range
 * @param outMax - The maximum of the output range
 * @returns The mapped value
 */
export const map = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
};

/**
 * Computes the sign of a number.
 * Returns 1 for positive, -1 for negative, 0 for zero.
 * @param value - The number to check
 * @returns -1 if negative, 1 if positive, 0 if zero
 */
export const sign = (value: number): number =>
  value > 0 ? 1 : value < 0 ? -1 : 0;

// ============================================================
// INTERPOLATION
// ============================================================

/**
 * Linearly interpolates between two values.
 * Math: a + (b - a) * t = (1 - t) * a + t * b
 * When t = 0, returns a. When t = 1, returns b.
 * @param a - The start value (t = 0)
 * @param b - The end value (t = 1)
 * @param t - The interpolation factor (typically 0 to 1)
 * @returns The interpolated value
 */
export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/**
 * Smoothly interpolates between 0 and 1 using a cubic Hermite curve.
 * Math: t² * (3 - 2t)
 * Produces smooth acceleration and deceleration (ease-in-out).
 * Input is clamped to [0, 1].
 * @param t - The input value (clamped to 0-1)
 * @returns The smoothed value
 */
export const smoothstep = (t: number): number => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Smoother version of smoothstep using a quintic polynomial.
 * Math: t³ * (t * (t * 6 - 15) + 10)
 * Produces even smoother acceleration and deceleration with zero derivatives at endpoints.
 * Input is clamped to [0, 1].
 * @param t - The input value (clamped to 0-1)
 * @returns The smoothed value
 */
export const smootherstep = (t: number): number => {
  t = clamp(t, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

// ============================================================
// ANGLE OPERATIONS
// ============================================================

/**
 * Converts degrees to radians.
 * Math: radians = degrees * (π / 180)
 * @param degrees - The angle in degrees
 * @returns The angle in radians
 */
export const degToRad = (degrees: number): number =>
  degrees * DEG_TO_RAD;

/**
 * Converts radians to degrees.
 * Math: degrees = radians * (180 / π)
 * @param radians - The angle in radians
 * @returns The angle in degrees
 */
export const radToDeg = (radians: number): number =>
  radians * RAD_TO_DEG;

/**
 * Normalizes an angle to the range [-π, π].
 * Useful for angle comparisons and finding shortest rotation paths.
 * @param angle - The angle in radians
 * @returns The normalized angle in the range [-π, π]
 */
export const normalizeAngle = (angle: number): number => {
  while (angle > Math.PI) angle -= TWO_PI;
  while (angle < -Math.PI) angle += TWO_PI;
  return angle;
};

/**
 * Computes the shortest angular difference between two angles.
 * Math: Normalizes (b - a) to [-π, π]
 * Returns positive if b is counter-clockwise from a, negative if clockwise.
 * Always returns the shortest path (never more than π).
 * @param a - The start angle in radians
 * @param b - The end angle in radians
 * @returns The shortest angular difference in radians
 */
export const shortestAngleDifference = (a: number, b: number): number => {
  return normalizeAngle(b - a);
};

// ============================================================
// COMPARISON
// ============================================================

/**
 * Checks if two numbers are approximately equal within an epsilon tolerance.
 * Accounts for floating-point precision errors.
 * @param a - The first number
 * @param b - The second number
 * @param epsilon - The maximum difference allowed (default: EPSILON constant)
 * @returns True if the numbers are approximately equal
 */
export const approximately = (
  a: number,
  b: number,
  epsilon: number = EPSILON
): boolean => Math.abs(a - b) < epsilon;

// ============================================================
// RANDOM
// ============================================================

/**
 * Generates a random number in the specified range.
 * @param min - The minimum value (inclusive)
 * @param max - The maximum value (exclusive)
 * @returns A random number between min and max
 */
export const randomRange = (min: number, max: number): number =>
  min + Math.random() * (max - min);

/**
 * Generates a random integer in the specified range.
 * @param min - The minimum value (inclusive)
 * @param max - The maximum value (inclusive)
 * @returns A random integer between min and max (inclusive)
 */
export const randomInt = (min: number, max: number): number =>
  Math.floor(randomRange(min, max + 1));

// ============================================================
// UTILITIES
// ============================================================

/**
 * Computes the square of a number.
 * Math: x²
 * Useful in physics calculations (avoiding repeated multiplication).
 * @param x - The number to square
 * @returns x squared
 */
export const square = (x: number): number => x * x;

// ============================================================
// CONSTANTS
// ============================================================

/** π constant (3.14159...) */
export const PI = Math.PI;

/** 2π constant (6.28318...) - full circle in radians */
export const TWO_PI = Math.PI * 2;

/** π/2 constant (1.5707...) - 90 degrees in radians */
export const HALF_PI = Math.PI / 2;

/** Conversion factor from degrees to radians (π/180) */
export const DEG_TO_RAD = Math.PI / 180;

/** Conversion factor from radians to degrees (180/π) */
export const RAD_TO_DEG = 180 / Math.PI;

/** Default epsilon for floating-point comparisons (1e-10) */
export const EPSILON = 1e-10;
