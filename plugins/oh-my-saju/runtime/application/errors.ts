/** Application protocol errors. */
export type OhMySajuApplicationErrorCode =
  | 'INVALID_COMMAND'
  | 'INVALID_DRAFT_SET'
  | 'PREPARATION_MISMATCH'
  | 'INTERNAL_ERROR';

const OH_MY_SAJU_APPLICATION_ERROR_BRAND = Symbol.for('oh-my-saju.OhMySajuApplicationError.v1');

function hasBrand(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  try {
    return Reflect.get(value, OH_MY_SAJU_APPLICATION_ERROR_BRAND) === true;
  } catch {
    return false;
  }
}

/** Expected validation failure at the provider-neutral application boundary. */
export class OhMySajuApplicationError extends Error {
  readonly code: OhMySajuApplicationErrorCode;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: OhMySajuApplicationErrorCode,
    message: string,
    options: { readonly details?: Readonly<Record<string, unknown>> } = {},
  ) {
    super(message);
    Object.defineProperty(this, OH_MY_SAJU_APPLICATION_ERROR_BRAND, { value: true });
    this.name = 'OhMySajuApplicationError';
    this.code = code;
    if (options.details !== undefined) this.details = options.details;
  }

  static override [Symbol.hasInstance](value: unknown): boolean {
    return hasBrand(value);
  }
}

export function isOhMySajuApplicationError(value: unknown): value is OhMySajuApplicationError {
  return hasBrand(value);
}
