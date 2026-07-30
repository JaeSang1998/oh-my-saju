/** Structured failures from plugin-owned traditional-system modules. */
export type TraditionalSystemErrorCode =
  | 'INVALID_SYSTEM_INPUT'
  | 'MISSING_EXPLICIT_POLICY'
  | 'UNSUPPORTED_SYSTEM_PROFILE'
  | 'UNSUPPORTED_SYSTEM_DATE'
  | 'MISSING_CAST_EVIDENCE'
  | 'NO_ELIGIBLE_DATES'
  | 'SYSTEM_INVARIANT_VIOLATION';

export class TraditionalSystemError extends Error {
  readonly name = 'TraditionalSystemError';

  constructor(
    readonly code: TraditionalSystemErrorCode,
    message: string,
    readonly options: {
      readonly path?: readonly (string | number)[];
      readonly details?: Readonly<Record<string, unknown>>;
    } = {},
  ) {
    super(message);
  }

  get path(): readonly (string | number)[] | undefined {
    return this.options.path;
  }

  get details(): Readonly<Record<string, unknown>> | undefined {
    return this.options.details;
  }
}

export function isTraditionalSystemError(value: unknown): value is TraditionalSystemError {
  return value instanceof TraditionalSystemError;
}
