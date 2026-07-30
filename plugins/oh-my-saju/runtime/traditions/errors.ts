/** Errors produced by plugin-owned Tradition Pack evaluation. */
import type { SajuInterpretationErrorCode } from './types';

const INTERPRETATION_ERROR_BRAND = Symbol.for('oh-my-saju.SajuInterpretationError.v1');

function hasInterpretationErrorBrand(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  try {
    return Reflect.get(value, INTERPRETATION_ERROR_BRAND) === true;
  } catch {
    return false;
  }
}

/** Expected validation failure from the interpretation subpath. */
export class SajuInterpretationError extends Error {
  readonly code: SajuInterpretationErrorCode;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: SajuInterpretationErrorCode,
    message: string,
    options: {
      readonly details?: Readonly<Record<string, unknown>>;
      readonly cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    Object.defineProperty(this, INTERPRETATION_ERROR_BRAND, { value: true });
    this.name = 'SajuInterpretationError';
    this.code = code;
    if (options.details !== undefined) this.details = options.details;
  }

  static [Symbol.hasInstance](value: unknown): boolean {
    return hasInterpretationErrorBrand(value);
  }
}

export function isSajuInterpretationError(value: unknown): value is SajuInterpretationError {
  return hasInterpretationErrorBrand(value);
}
