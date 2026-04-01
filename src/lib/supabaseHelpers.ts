/**
 * Supabase joins can return a single object, an array, or null
 * depending on the relationship type. This helper normalizes
 * the result to either a single object or null, safely handling
 * all cases without unsafe `as` casts.
 */
export function normalizeRelation<T extends Record<string, unknown>>(
  value: T | T[] | null | undefined
): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}
