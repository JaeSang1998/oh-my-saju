export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArrayOf<T>(
  value: unknown,
  predicate: (entry: unknown) => entry is T,
): value is T[] {
  if (!Array.isArray(value)) return false;
  const entries: readonly unknown[] = value;
  for (let index = 0; index < entries.length; index += 1) {
    if (!Object.hasOwn(entries, index) || !predicate(entries[index])) return false;
  }
  return true;
}
