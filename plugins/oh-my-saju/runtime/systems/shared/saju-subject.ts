import type {
  DayHourClock,
  GregorianBirthDate,
  KoreanLunarBirthDate,
  SajuBirthDate,
  SajuReport,
  SajuRequest,
  ZiHourPolicy,
} from 'saju-engine';
import { TraditionalSystemError } from './errors';

export type ExplicitDayHourSajuRequest = SajuRequest & {
  readonly rules: {
    readonly ziHourPolicy: ZiHourPolicy;
    readonly dayHourClock: DayHourClock;
  };
};

export interface TraditionalSystemNormalizedChronology {
  readonly inputDate: SajuBirthDate;
  readonly gregorianDate: GregorianBirthDate;
  readonly koreanLunarDate: KoreanLunarBirthDate;
  readonly civilDateTime: string;
  readonly instantUtc: string;
  readonly epochMilliseconds: number;
  readonly timeZone: string;
  readonly offsetSeconds: number;
  readonly effectiveDay: string;
  readonly dayHourDateTime: string;
  readonly dayHourClock: DayHourClock['kind'];
}

function copyInputDate(date: SajuBirthDate): SajuBirthDate {
  return date.calendar === 'gregorian'
    ? {
        calendar: 'gregorian',
        year: date.year,
        month: date.month,
        day: date.day,
      }
    : {
        calendar: 'korean-lunar',
        year: date.year,
        month: date.month,
        day: date.day,
        monthKind: date.monthKind,
      };
}

export function assertExplicitDayHourPolicies(
  subject: SajuRequest | null | undefined,
  pathPrefix: readonly (string | number)[] = ['subject'],
): asserts subject is ExplicitDayHourSajuRequest {
  if (subject?.rules?.ziHourPolicy === undefined) {
    throw new TraditionalSystemError(
      'MISSING_EXPLICIT_POLICY',
      'subject.rules.ziHourPolicy must be selected explicitly.',
      { path: [...pathPrefix, 'rules', 'ziHourPolicy'] },
    );
  }
  if (subject.rules.dayHourClock === undefined) {
    throw new TraditionalSystemError(
      'MISSING_EXPLICIT_POLICY',
      'subject.rules.dayHourClock must be selected explicitly.',
      { path: [...pathPrefix, 'rules', 'dayHourClock'] },
    );
  }
}

/**
 * Projects only normalized chronology facts needed to reproduce a traditional
 * system result. It intentionally excludes caller prose and unrelated report
 * fields.
 */
export function normalizedChronologyFromSajuReport(
  report: SajuReport,
): TraditionalSystemNormalizedChronology {
  const chronology = report.chronology;
  return {
    inputDate: copyInputDate(chronology.inputDate),
    gregorianDate: {
      calendar: 'gregorian',
      year: chronology.gregorianDate.year,
      month: chronology.gregorianDate.month,
      day: chronology.gregorianDate.day,
    },
    koreanLunarDate: {
      calendar: 'korean-lunar',
      year: chronology.koreanLunarDate.year,
      month: chronology.koreanLunarDate.month,
      day: chronology.koreanLunarDate.day,
      monthKind: chronology.koreanLunarDate.monthKind,
    },
    civilDateTime: chronology.civilDateTime,
    instantUtc: chronology.instantUtc,
    epochMilliseconds: chronology.epochMilliseconds,
    timeZone: chronology.timeZone,
    offsetSeconds: Object.is(chronology.offsetSeconds, -0) ? 0 : chronology.offsetSeconds,
    effectiveDay: report.audit.evidence.effectiveDay,
    dayHourDateTime: chronology.dayHourDateTime,
    dayHourClock: chronology.dayHourClock,
  };
}
