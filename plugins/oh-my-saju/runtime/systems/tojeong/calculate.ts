import {
  calculateSaju,
  ENGINE_MANIFEST,
  isSajuError,
  type EarthlyBranch,
  type GregorianBirthDate,
  type HeavenlyStem,
  type KoreanLunarBirthDate,
  type SajuReport,
  type SajuRequest,
} from 'saju-engine';
import { deepFreeze } from '../../internal/deep-freeze';
import {
  SYSTEM_EARTHLY_BRANCH_HANJA,
  SYSTEM_HEAVENLY_STEM_HANJA,
  TraditionalSystemError,
  branchAt,
  branchIndex,
  residueOneToModulus,
  stemAt,
  stemIndex,
  systemModulo,
} from '../shared';
import {
  TOJEONG_NUMBER_TABLE_DIGEST,
  tojeongBranchNumber,
  tojeongStemNumber,
  type TojeongTableKind,
} from './number-table';
import {
  TOJEONG_144_CONVENTIONS_V1,
  TOJEONG_144_LIMITATIONS,
  TOJEONG_144_POLICIES,
  TOJEONG_144_PROFILE,
} from './profile';
import type {
  Tojeong144Conventions,
  Tojeong144Report,
  Tojeong144Request,
  TojeongFormulaTrace,
  TojeongGanzhiFact,
} from './types';

function invalidInput(message: string, path: readonly (string | number)[]): never {
  throw new TraditionalSystemError('INVALID_SYSTEM_INPUT', message, { path });
}

function copyBirthDate(date: SajuRequest['birth']['date']): SajuRequest['birth']['date'] {
  return date.calendar === 'gregorian'
    ? { calendar: 'gregorian', year: date.year, month: date.month, day: date.day }
    : {
        calendar: 'korean-lunar',
        year: date.year,
        month: date.month,
        day: date.day,
        monthKind: date.monthKind,
      };
}

function copyGregorianDate(date: GregorianBirthDate): GregorianBirthDate {
  return { calendar: 'gregorian', year: date.year, month: date.month, day: date.day };
}

function copyLunarDate(date: KoreanLunarBirthDate): KoreanLunarBirthDate {
  return {
    calendar: 'korean-lunar',
    year: date.year,
    month: date.month,
    day: date.day,
    monthKind: date.monthKind,
  };
}

function assertConventions(value: unknown): asserts value is Tojeong144Conventions {
  if (value === null || typeof value !== 'object') {
    throw new TraditionalSystemError(
      'MISSING_EXPLICIT_POLICY',
      'Tojeong 144 requires an explicit conventions object.',
      { path: ['conventions'] },
    );
  }
  const conventions = value as Partial<Record<keyof Tojeong144Conventions, unknown>>;
  if (
    conventions.profileId !== TOJEONG_144_CONVENTIONS_V1.profileId ||
    conventions.profileVersion !== TOJEONG_144_CONVENTIONS_V1.profileVersion
  ) {
    throw new TraditionalSystemError(
      'UNSUPPORTED_SYSTEM_PROFILE',
      'Unsupported Tojeong 144 profile.',
      { path: ['conventions'] },
    );
  }
  for (const key of ['countingAge', 'targetDate', 'yearBoundary', 'monthGanzhi'] as const) {
    if (conventions[key] !== TOJEONG_144_CONVENTIONS_V1[key]) {
      throw new TraditionalSystemError(
        'MISSING_EXPLICIT_POLICY',
        `Unsupported or missing Tojeong convention: ${key}.`,
        { path: ['conventions', key] },
      );
    }
  }
}

function runBirthCalculation(request: SajuRequest): SajuReport {
  try {
    return calculateSaju(request);
  } catch (error) {
    if (isSajuError(error)) {
      throw new TraditionalSystemError(
        'INVALID_SYSTEM_INPUT',
        `The exact Saju birth request is invalid: ${error.message}`,
        {
          path: ['sajuRequest'],
          details: { calculationCoreErrorCode: error.code },
        },
      );
    }
    throw error;
  }
}

function targetSajuRequest(year: number, month: number, day: number): SajuRequest {
  return {
    birth: {
      date: {
        calendar: 'korean-lunar',
        year,
        month,
        day,
        monthKind: 'regular',
      },
      time: { hour: 12, minute: 0 },
      timeZone: 'Asia/Seoul',
    },
    rules: {
      ziHourPolicy: 'civilMidnight',
      dayHourClock: { kind: 'civil' },
    },
  };
}

function runTargetCalculation(year: number, month: number, day: number): SajuReport {
  try {
    return calculateSaju(targetSajuRequest(year, month, day));
  } catch (error) {
    if (isSajuError(error)) {
      throw new TraditionalSystemError(
        'UNSUPPORTED_SYSTEM_DATE',
        `The target Korean lunar date cannot be resolved: ${error.message}`,
        {
          path: ['targetYear'],
          details: {
            targetYear: year,
            targetLunarMonth: month,
            targetLunarDay: day,
            calculationCoreErrorCode: error.code,
          },
        },
      );
    }
    throw error;
  }
}

function targetMonthFacts(
  year: number,
  month: number,
): {
  readonly days: 29 | 30;
  readonly day29Report: SajuReport;
} {
  const day29Report = runTargetCalculation(year, month, 29);
  try {
    calculateSaju(targetSajuRequest(year, month, 30));
    return { days: 30, day29Report };
  } catch (error) {
    if (isSajuError(error) && error.code === 'INVALID_LEAP_MONTH') {
      return { days: 29, day29Report };
    }
    if (isSajuError(error)) {
      throw new TraditionalSystemError(
        'UNSUPPORTED_SYSTEM_DATE',
        `The target Korean lunar month cannot be resolved: ${error.message}`,
        {
          path: ['targetYear'],
          details: {
            targetYear: year,
            targetLunarMonth: month,
            calculationCoreErrorCode: error.code,
          },
        },
      );
    }
    throw error;
  }
}

function ganzhiFact(stem: HeavenlyStem, branch: EarthlyBranch): TojeongGanzhiFact {
  const stemHanja = SYSTEM_HEAVENLY_STEM_HANJA[stem];
  const branchHanja = SYSTEM_EARTHLY_BRANCH_HANJA[branch];
  return {
    korean: `${stem}${branch}`,
    hanja: `${stemHanja}${branchHanja}`,
    stem: { korean: stem, hanja: stemHanja },
    branch: { korean: branch, hanja: branchHanja },
  };
}

function yearGanzhi(year: number): TojeongGanzhiFact {
  return ganzhiFact(stemAt(year - 4), branchAt(year - 4));
}

function lunarMonthGanzhi(yearStem: HeavenlyStem, lunarMonth: number): TojeongGanzhiFact {
  const monthStem = stemAt(2 * (stemIndex(yearStem) % 5) + lunarMonth + 1);
  const monthBranch = branchAt(lunarMonth + 1);
  return ganzhiFact(monthStem, monthBranch);
}

function pillarGanzhi(report: SajuReport['pillars']['day']): TojeongGanzhiFact {
  return ganzhiFact(report.stem.korean, report.branch.korean);
}

function formulaTrace(
  tableKind: TojeongTableKind,
  ganzhi: TojeongGanzhiFact,
  calendarValue: number,
  divisor: 8 | 6 | 3,
): TojeongFormulaTrace {
  const stemNumber = tojeongStemNumber(ganzhi.stem.korean);
  const branchNumber = tojeongBranchNumber(tableKind, ganzhi.branch.korean);
  const ganzhiNumber = stemNumber + branchNumber;
  const sum = calendarValue + ganzhiNumber;
  const rawRemainder = sum % divisor;
  return {
    tableKind,
    stemNumber,
    branchNumber,
    ganzhiNumber,
    calendarValue,
    sum,
    divisor,
    rawRemainder,
    normalizedResidue: residueOneToModulus(sum, divisor),
  };
}

export function calculateTojeong144(request: Tojeong144Request): Tojeong144Report {
  if (request === null || typeof request !== 'object' || request.kind !== 'tojeong-144') {
    invalidInput('Tojeong request.kind must be "tojeong-144".', ['kind']);
  }
  if (!Number.isInteger(request.targetYear)) {
    invalidInput('Tojeong targetYear must be an explicit integer year.', ['targetYear']);
  }
  assertConventions(request.conventions);

  const birthReport = runBirthCalculation(request.sajuRequest);
  const normalizedBirthLunarDate = birthReport.chronology.koreanLunarDate;
  if (normalizedBirthLunarDate.monthKind === 'leap') {
    throw new TraditionalSystemError(
      'MISSING_EXPLICIT_POLICY',
      'This Tojeong profile does not define how to map a leap-month birth.',
      {
        path: ['sajuRequest', 'birth', 'date'],
        details: { normalizedBirthLunarDate: copyLunarDate(normalizedBirthLunarDate) },
      },
    );
  }

  const countingAge = request.targetYear - normalizedBirthLunarDate.year + 1;
  if (countingAge <= 0) {
    invalidInput('targetYear must not precede the normalized lunar birth year.', ['targetYear']);
  }

  const monthFacts = targetMonthFacts(request.targetYear, normalizedBirthLunarDate.month);
  if (normalizedBirthLunarDate.day > monthFacts.days) {
    throw new TraditionalSystemError(
      'UNSUPPORTED_SYSTEM_DATE',
      'The lunar birth day does not exist in the target regular lunar month.',
      {
        path: ['targetYear'],
        details: {
          targetYear: request.targetYear,
          targetLunarMonth: normalizedBirthLunarDate.month,
          targetLunarDay: normalizedBirthLunarDate.day,
          targetLunarMonthDays: monthFacts.days,
          implicitRepairApplied: false,
        },
      },
    );
  }

  const targetReport = runTargetCalculation(
    request.targetYear,
    normalizedBirthLunarDate.month,
    normalizedBirthLunarDate.day,
  );
  const targetYearGanzhi = yearGanzhi(request.targetYear);
  const targetMonthGanzhi = lunarMonthGanzhi(
    targetYearGanzhi.stem.korean,
    normalizedBirthLunarDate.month,
  );
  const targetDayGanzhi = pillarGanzhi(targetReport.pillars.day);
  const upper = formulaTrace('taese', targetYearGanzhi, countingAge, 8);
  const middle = formulaTrace('wolgeon', targetMonthGanzhi, monthFacts.days, 6);
  const lower = formulaTrace('iljin', targetDayGanzhi, normalizedBirthLunarDate.day, 3);
  const targetLunarDate: KoreanLunarBirthDate = {
    calendar: 'korean-lunar',
    year: request.targetYear,
    month: normalizedBirthLunarDate.month,
    day: normalizedBirthLunarDate.day,
    monthKind: 'regular',
  };

  return deepFreeze({
    schemaVersion: '1',
    kind: 'tojeong-144',
    value: {
      upper: upper.normalizedResidue,
      middle: middle.normalizedResidue,
      lower: lower.normalizedResidue,
      code: upper.normalizedResidue * 100 + middle.normalizedResidue * 10 + lower.normalizedResidue,
      calendarFacts: {
        inputBirthDate: copyBirthDate(birthReport.chronology.inputDate),
        normalizedBirthGregorianDate: copyGregorianDate(birthReport.chronology.gregorianDate),
        normalizedBirthLunarDate: copyLunarDate(normalizedBirthLunarDate),
        targetYear: request.targetYear,
        countingAgeInTargetYear: countingAge,
        targetLunarDate,
        targetGregorianDate: copyGregorianDate(targetReport.chronology.gregorianDate),
        targetLunarMonthDays: monthFacts.days,
        targetYearGanzhi,
        targetMonthGanzhi,
        targetDayGanzhi,
        koreanLunarDataset: ENGINE_MANIFEST.koreanLunar,
      },
      numberTableDigest: TOJEONG_NUMBER_TABLE_DIGEST,
      interpretations: [],
    },
    audit: {
      module: { id: 'tojeong-144', version: '1.0.0', schemaVersion: '1' },
      profile: TOJEONG_144_PROFILE,
      calculationCore: ENGINE_MANIFEST.engine,
      implementation: 'oh-my-saju-independent',
      policies: TOJEONG_144_POLICIES,
      implicitAdjustments: [],
      predictiveValidity: 'not-established',
      interpretationScope: 'calculation-and-classical-classification-only',
      limitations: TOJEONG_144_LIMITATIONS,
      trace: {
        input: {
          targetYear: request.targetYear,
          conventions: { ...request.conventions },
          birthCivilDateTime: birthReport.chronology.civilDateTime,
        },
        normalization: {
          inputBirthDate: copyBirthDate(birthReport.chronology.inputDate),
          gregorianDate: copyGregorianDate(birthReport.chronology.gregorianDate),
          koreanLunarDate: copyLunarDate(normalizedBirthLunarDate),
        },
        targetDateResolution: {
          lunarMonthDay29Gregorian: copyGregorianDate(
            monthFacts.day29Report.chronology.gregorianDate,
          ),
          lunarMonthDay30Exists: monthFacts.days === 30,
          resolvedTargetGregorianDate: copyGregorianDate(targetReport.chronology.gregorianDate),
          targetDayPillarSource: 'saju-engine-civil-midnight-day-pillar',
        },
        ganzhiDerivation: {
          targetYear: {
            targetYear: request.targetYear,
            cycleIndex: systemModulo(request.targetYear - 4, 60),
            cycleAnchor: '4-甲子',
          },
          targetMonth: {
            yearStemIndex: stemIndex(targetYearGanzhi.stem.korean),
            lunarMonth: normalizedBirthLunarDate.month,
            stemIndex: stemIndex(targetMonthGanzhi.stem.korean),
            branchIndex: branchIndex(targetMonthGanzhi.branch.korean),
            formula: 'stem=2*(yearStemIndex mod 5)+lunarMonth+1; branch=lunarMonth+1',
          },
          targetDay: {
            cycleIndex: targetReport.pillars.day.cycleIndex,
            source: 'saju-engine-civil-midnight-day-pillar',
          },
        },
        numberTable: {
          id: 'tojeong-number-table-yamazato-pp201',
          version: '1.0.0',
          digest: TOJEONG_NUMBER_TABLE_DIGEST,
          digestSerialization: 'fixed-korean-cycle-order-v1',
        },
        formulas: { upper, middle, lower },
      },
    },
  });
}
