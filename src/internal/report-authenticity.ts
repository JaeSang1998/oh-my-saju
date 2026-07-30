const CALCULATION_REPORTS = new WeakSet<object>();

function register<T extends object>(value: T, registry: WeakSet<object>): T {
  registry.add(value);
  return value;
}

/**
 * Marks an engine-owned calculation report before it is frozen.
 *
 * WeakSet identity deliberately does not survive cloning or JSON serialization.
 * Higher-level public APIs calculate and consume reports in one bundled module,
 * so arbitrary lookalike JSON cannot copy the registration.
 */
export function brandCalculationReport<T extends object>(value: T): T {
  return register(value, CALCULATION_REPORTS);
}

export function isAuthenticCalculationReport(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || !Object.isFrozen(value)) return false;
  try {
    return CALCULATION_REPORTS.has(value);
  } catch {
    return false;
  }
}
