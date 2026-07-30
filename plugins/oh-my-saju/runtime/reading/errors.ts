/** Reading-layer errors. */
import type { AiReadingErrorCode } from './types';

const AI_READING_ERROR_BRAND = Symbol.for('oh-my-saju.AiReadingError.v1');

function hasAiReadingErrorBrand(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  try {
    return Reflect.get(value, AI_READING_ERROR_BRAND) === true;
  } catch {
    return false;
  }
}

/** Expected model, policy, or validation failure from the AI subpath. */
export class AiReadingError extends Error {
  readonly code: AiReadingErrorCode;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: AiReadingErrorCode,
    message: string,
    options: {
      readonly details?: Readonly<Record<string, unknown>>;
    } = {},
  ) {
    super(message);
    Object.defineProperty(this, AI_READING_ERROR_BRAND, { value: true });
    this.name = 'AiReadingError';
    this.code = code;
    if (options.details !== undefined) this.details = options.details;
  }

  static [Symbol.hasInstance](value: unknown): boolean {
    return hasAiReadingErrorBrand(value);
  }
}

export function isAiReadingError(value: unknown): value is AiReadingError {
  return hasAiReadingErrorBrand(value);
}
