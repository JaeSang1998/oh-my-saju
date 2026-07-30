import { SearchSunLongitude } from 'astronomy-engine';
import { SajuError } from '../errors';
import { ENGINE_MANIFEST } from '../manifest';
import { solarTermDescriptor } from './solar-term-catalog';

const ENGINE = ENGINE_MANIFEST.solarTerms.engine;
const { min: MIN_YEAR, max: MAX_YEAR } = ENGINE_MANIFEST.supportedRanges.solarTermYears;
const CACHE = new Map<number, SolarTermBoundary>();

export interface SolarTermBoundary {
  readonly year: number;
  readonly index: number;
  readonly name: string;
  readonly hanja: string;
  readonly longitudeDegrees: number;
  readonly epochMilliseconds: number;
  readonly instantUtc: string;
  readonly engine: typeof ENGINE;
  /** Conservative model-level uncertainty, not the root solver tolerance. */
  readonly uncertaintyMilliseconds: number;
}

function assertRequest(year: number, index: number): void {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new SajuError(
      'UNSUPPORTED_DATE_RANGE',
      `Solar terms are supported for Gregorian years ${MIN_YEAR} through ${MAX_YEAR}.`,
      { path: ['year'], details: { year, minYear: MIN_YEAR, maxYear: MAX_YEAR } },
    );
  }
  if (!Number.isInteger(index) || index < 0 || index > 23) {
    throw new SajuError('INVALID_DATE', 'Solar-term index must be an integer from 0 to 23.', {
      path: ['index'],
      details: { index },
    });
  }
}

export function solarTermLongitude(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index > 23) {
    throw new SajuError('INVALID_DATE', 'Solar-term index must be an integer from 0 to 23.', {
      path: ['index'],
      details: { index },
    });
  }
  return (285 + 15 * index) % 360;
}

/** Finds a 24-term boundary using the Sun's apparent geocentric longitude. */
export function findSolarTermBoundary(year: number, index: number): SolarTermBoundary {
  assertRequest(year, index);
  const cacheKey = year * 24 + index;
  const cached = CACHE.get(cacheKey);
  if (cached !== undefined) return cached;

  const monthIndex = Math.floor(index / 2);
  const searchStartDay = index % 2 === 0 ? 1 : 14;
  const searchStart = new Date(Date.UTC(year, monthIndex, searchStartDay));
  const event = SearchSunLongitude(solarTermLongitude(index), searchStart, 20);
  if (event === null) {
    throw new SajuError('SOLAR_TERM_NOT_FOUND', 'Astronomy Engine did not find the solar term.', {
      details: { year, index, searchStart: searchStart.toISOString(), searchDays: 20 },
    });
  }

  const epochMilliseconds = event.date.getTime();
  const descriptor = solarTermDescriptor(index);

  const boundary: SolarTermBoundary = Object.freeze({
    year,
    index,
    name: descriptor.name,
    hanja: descriptor.hanja,
    longitudeDegrees: solarTermLongitude(index),
    epochMilliseconds,
    instantUtc: event.date.toISOString(),
    engine: ENGINE,
    // Astronomy Engine documents ±1 arcminute positional accuracy. The Sun
    // travels roughly 1 degree/day, so 25 minutes is a conservative time bound.
    uncertaintyMilliseconds: 25 * 60_000,
  });
  CACHE.set(cacheKey, boundary);
  return boundary;
}

export function findSolarTermsOfYear(year: number): readonly SolarTermBoundary[] {
  return Object.freeze(
    Array.from({ length: 24 }, (_, index) => findSolarTermBoundary(year, index)),
  );
}
