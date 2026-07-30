export type SajuErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_DATE'
  | 'INVALID_TIME'
  | 'INVALID_COORDINATE'
  | 'INVALID_LEAP_MONTH'
  | 'INVALID_RULE'
  | 'UNKNOWN_TIME_ZONE'
  | 'AMBIGUOUS_LOCAL_TIME'
  | 'NONEXISTENT_LOCAL_TIME'
  | 'OFFSET_MISMATCH'
  | 'UNSUPPORTED_DATE_RANGE'
  | 'SOLAR_TERM_NOT_FOUND'
  | 'DATA_INTEGRITY_FAILURE';

const SAJU_ERROR_BRAND = Symbol.for('saju-engine.SajuError.v1');

function hasSajuErrorBrand(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  try {
    return Reflect.get(value, SAJU_ERROR_BRAND) === true;
  } catch {
    return false;
  }
}

function jsonSafe(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : String(value);
  }
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'undefined') return null;
  if (typeof value === 'symbol' || typeof value === 'function') return String(value);
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((entry) => jsonSafe(entry, seen));
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, jsonSafe(entry, seen)]),
  );
}

/** Expected, machine-readable failure from a public Saju API. */
export class SajuError extends Error {
  readonly code: SajuErrorCode;
  readonly path?: readonly (string | number)[];
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: SajuErrorCode,
    message: string,
    options: {
      readonly path?: readonly (string | number)[];
      readonly details?: Readonly<Record<string, unknown>>;
      readonly cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    Object.defineProperty(this, SAJU_ERROR_BRAND, { value: true });
    this.name = 'SajuError';
    this.code = code;
    if (options.path !== undefined) this.path = options.path;
    if (options.details !== undefined) this.details = options.details;
  }

  /** Recognizes branded errors across ESM/CommonJS entry bundles in one realm. */
  static [Symbol.hasInstance](value: unknown): boolean {
    return hasSajuErrorBrand(value);
  }

  toJSON(): {
    readonly name: 'SajuError';
    readonly code: SajuErrorCode;
    readonly message: string;
    readonly path?: readonly (string | number)[];
    readonly details?: Readonly<Record<string, unknown>>;
  } {
    return {
      name: 'SajuError',
      code: this.code,
      message: this.message,
      ...(this.path === undefined ? {} : { path: this.path }),
      ...(this.details === undefined
        ? {}
        : {
            details: jsonSafe(this.details) as Readonly<Record<string, unknown>>,
          }),
    };
  }
}

export function isSajuError(value: unknown): value is SajuError {
  return hasSajuErrorBrand(value);
}
