import type { Body } from '../types/Body.js';
import type { QueryFilter } from '../types/Query.js';

/**
 * Whether a body passes a query filter.
 *
 * @param body - Candidate body
 * @param filter - Query filter (may be undefined)
 * @param sensorsByDefault - Whether sensors are included when the filter doesn't say
 * @returns True if the query should consider the body
 * @internal
 */
export const passesFilter = (
  body: Body,
  filter: QueryFilter | undefined,
  sensorsByDefault: boolean
): boolean => {
  if (body.isSensor && !(filter?.includeSensors ?? sensorsByDefault)) return false;
  if (filter?.collidesWith !== undefined && (body.layer & filter.collidesWith) === 0) return false;
  if (filter?.predicate && !filter.predicate(body)) return false;
  return true;
};
