const INTERPRETATION_REPORTS = new WeakSet<object>();

/** Local capability used only between the Pack evaluator and reading runtime. */
export function brandInterpretationReport<T extends object>(value: T): T {
  INTERPRETATION_REPORTS.add(value);
  return value;
}

/**
 * This is deliberately not serialization-safe authentication. The external
 * application protocol replays the raw request and recalculates before use.
 */
export function isAuthenticInterpretationReport(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || !Object.isFrozen(value)) return false;
  try {
    return INTERPRETATION_REPORTS.has(value);
  } catch {
    return false;
  }
}
