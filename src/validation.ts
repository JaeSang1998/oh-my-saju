import type { Gender } from './types';

export { assertEarthlyBranch, assertHeavenlyStem, assertPillar } from './domain/cycle-facts';

export function assertIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new RangeError(`${label} must be an integer: ${String(value)}`);
  }
  if (value < minimum || value > maximum) {
    throw new RangeError(`${label} must be from ${minimum} through ${maximum}: ${value}`);
  }
}

export function assertFiniteNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`${label} must be a finite number: ${String(value)}`);
  }
}

export function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${label} must be boolean: ${String(value)}`);
  }
}

export function assertGender(value: unknown, label = 'gender'): asserts value is Gender {
  if (value !== 'male' && value !== 'female') {
    throw new RangeError(`${label} must be male or female: ${String(value)}`);
  }
}
