import { findSolarTermBoundary } from '../astro/astronomical-solar-terms';
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from '../constants';
import { ganjiIndexOf, pillarFromGanji } from '../ganji';
import type { Gender, LuckPillar, LuckPillarInfo, Pillar } from '../types';
import {
  assertFiniteNumber,
  assertGender,
  assertIntegerInRange,
  assertPillar,
} from '../validation';

const MILLISECONDS_PER_DAY = 86_400_000;
const MONTH_OPENING_TERM_INDICES = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const;

export interface LuckPillarParams {
  readonly instantUTCms: number;
  readonly birthYear: number;
  readonly monthPillar: Pillar;
  readonly sajuYearStemIndex: number;
  readonly gender: Gender;
  readonly count?: number;
}

function positiveModulo(value: number, modulus: number): number {
  const remainder = value % modulus;
  return remainder < 0 ? remainder + modulus : remainder;
}

function orderedMonthOpenings(centerYear: number): readonly number[] {
  const instants: number[] = [];
  for (let year = centerYear - 1; year <= centerYear + 1; year += 1) {
    for (const index of MONTH_OPENING_TERM_INDICES) {
      instants.push(findSolarTermBoundary(year, index).epochMilliseconds);
    }
  }
  return instants.sort((left, right) => left - right);
}

function movesForward(stemIndex: number, gender: Gender): boolean {
  const isYangStem = stemIndex % 2 === 0;
  return gender === 'male' ? isYangStem : !isYangStem;
}

function distanceToOpeningDays(
  birthInstant: number,
  openings: readonly number[],
  forward: boolean,
): number {
  let boundary: number | undefined;
  if (forward) {
    boundary = openings.find((instant) => instant > birthInstant);
  } else {
    for (let index = openings.length - 1; index >= 0; index -= 1) {
      const candidate = openings[index];
      if (candidate !== undefined && candidate <= birthInstant) {
        boundary = candidate;
        break;
      }
    }
  }
  if (boundary === undefined) return 0;
  return Math.abs(boundary - birthInstant) / MILLISECONDS_PER_DAY;
}

function traditionalStartOffset(daysToOpening: number): {
  readonly startYears: number;
  readonly startMonths: number;
  readonly startDays: number;
} {
  let startYears = Math.floor(daysToOpening / 3);
  const monthsWithFraction = (daysToOpening - startYears * 3) * 4;
  let startMonths = Math.floor(monthsWithFraction);
  let startDays = Math.round((monthsWithFraction - startMonths) * 30);

  if (startDays === 30) {
    startDays = 0;
    startMonths += 1;
  }
  if (startMonths === 12) {
    startMonths = 0;
    startYears += 1;
  }
  return { startYears, startMonths, startDays };
}

function monthCycleIndex(monthPillar: Pillar): number {
  return ganjiIndexOf(
    HEAVENLY_STEMS.indexOf(monthPillar.heavenlyStem),
    EARTHLY_BRANCHES.indexOf(monthPillar.earthlyBranch),
  );
}

export function getLuckPillars(params: LuckPillarParams): LuckPillarInfo {
  const requestedCount = params.count ?? 10;
  assertFiniteNumber(params.instantUTCms, '출생 절대 순간(instantUTCms)');
  assertIntegerInRange(params.birthYear, 101, 9998, '입력 양력 연도(birthYear)');
  assertPillar(params.monthPillar, '월주(monthPillar)');
  assertIntegerInRange(params.sajuYearStemIndex, 0, 9, '사주 연간 인덱스(sajuYearStemIndex)');
  assertGender(params.gender);
  assertIntegerInRange(requestedCount, 1, 120, '대운 개수(count)');

  const forward = movesForward(params.sajuYearStemIndex, params.gender);
  const daysToOpening = distanceToOpeningDays(
    params.instantUTCms,
    orderedMonthOpenings(params.birthYear),
    forward,
  );
  const startAge = Math.max(1, Math.round(daysToOpening / 3));
  const detail = traditionalStartOffset(daysToOpening);
  const origin = monthCycleIndex(params.monthPillar);
  const direction = forward ? 1 : -1;

  const pillars: LuckPillar[] = Array.from({ length: requestedCount }, (_, index) => {
    const pillar = pillarFromGanji(positiveModulo(origin + direction * (index + 1), 60));
    return {
      age: startAge + index * 10,
      pillar,
      korean: `${pillar.heavenlyStem}${pillar.earthlyBranch}`,
    };
  });

  return {
    forward,
    startAge,
    ...detail,
    pillars,
  };
}
