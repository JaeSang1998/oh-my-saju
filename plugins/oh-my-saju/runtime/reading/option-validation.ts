/** Validation for provider-neutral reading options. */
import { isRecord } from '../internal/guards';
import { AiReadingError } from './errors';
import type {
  SajuNarrator,
  SajuReadingAudience,
  SajuReadingLocale,
  SajuReadingPurpose,
  SajuVariantPolicy,
} from './types';

const INVISIBLE_PATTERN = /[\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/u;

function containsAnyControl(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    if (codePoint <= 31 || (codePoint >= 127 && codePoint <= 159)) return true;
  }
  return INVISIBLE_PATTERN.test(value);
}

export function assertSafeIdentifier(
  value: unknown,
  field: string,
  maximum = 160,
  code: 'INVALID_REQUEST' | 'INVALID_NARRATOR_OUTPUT' = 'INVALID_REQUEST',
): string {
  const normalized = typeof value === 'string' ? value.normalize('NFKC').trim() : '';
  if (
    typeof value !== 'string' ||
    normalized.length === 0 ||
    normalized.length > maximum ||
    containsAnyControl(value) ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(normalized)
  ) {
    throw new AiReadingError(code, `${field} must be a safe short identifier.`);
  }
  return normalized;
}

export function assertReadingLocale(value: unknown, field = 'locale'): SajuReadingLocale {
  if (value !== 'ko-KR') {
    throw new AiReadingError('INVALID_REQUEST', `${field} must be ko-KR in this release.`);
  }
  return value;
}

export function assertReadingPurpose(value: unknown, field = 'purpose'): SajuReadingPurpose {
  return assertSafeIdentifier(value, field);
}

export function assertReadingAudience(value: unknown, field = 'audience'): SajuReadingAudience {
  if (value !== 'adult' && value !== 'minor' && value !== 'general') {
    throw new AiReadingError('INVALID_REQUEST', `${field} is not supported.`);
  }
  return value;
}

export function assertReadingVariantPolicy(
  value: unknown,
  field = 'variantPolicy',
): SajuVariantPolicy {
  if (value !== 'stable-only' && value !== 'include-candidate-dependent') {
    throw new AiReadingError('INVALID_REQUEST', `${field} is not supported.`);
  }
  return value;
}

export function snapshotNarrator(value: unknown, field = 'narrator'): SajuNarrator {
  if (!isRecord(value)) {
    throw new AiReadingError('INVALID_REQUEST', `${field} must be an object.`);
  }
  const id = assertSafeIdentifier(value.id, `${field}.id`);
  const requestedModel = assertSafeIdentifier(value.requestedModel, `${field}.requestedModel`);
  if (typeof value.narrate !== 'function') {
    throw new AiReadingError('INVALID_REQUEST', `${field}.narrate must be a function.`);
  }
  return Object.freeze({
    id,
    requestedModel,
    narrate: value.narrate as SajuNarrator['narrate'],
  });
}
