/**
 * Throws a RangeError unless `value` is a finite number greater than zero.
 * Used by body factories: a zero or negative size or density produces zero
 * or negative mass, and a zero mass turns into NaN positions after one step.
 *
 * @param factory - Name of the calling factory (for the error message)
 * @param name - Name of the parameter being checked
 * @param value - The value to check
 * @throws RangeError if the value is not a positive finite number
 */
export const assertPositiveFinite = (
  factory: string,
  name: string,
  value: number
): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${factory}: ${name} must be a positive finite number (got ${value})`);
  }
};
