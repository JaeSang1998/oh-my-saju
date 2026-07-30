import momentTimezone from 'moment-timezone';
import { findSolarTermBoundary, type SolarTermBoundary } from '../astro/astronomical-solar-terms';
import { isSajuError, SajuError } from '../errors';
import { ENGINE_MANIFEST } from '../manifest';
import { deepFreeze } from '../internal/deep-freeze';
import { isRecord } from '../internal/guards';
import { brandCalculationReport } from '../internal/report-authenticity';
import {
  formatLocalDateTime,
  localDateTimeFromNaiveEpochMilliseconds,
  localDateTimeToNaiveEpochMilliseconds,
} from '../time/local-date-time';
import { resolveDayHourClock } from '../time/day-hour-clock';
import { copyBirthDate, normalizeBirthDate } from './birth-date';
import { calculateSaju } from './calculate-saju';
import {
  PRE_STANDARD_TIME_LOCAL_MEAN_WARNING,
  SEOUL_STANDARD_TIME_START_LOCAL_MS,
} from './report-warnings';
import { assertBirthDateShape, assertDayHourClockShape } from './validate-request';
import type {
  BirthTime,
  BirthTimeConstraint,
  BirthTimeEvidence,
  PillarReport,
  SajuAggregatedPossibilityCandidate,
  SajuCandidatePillars,
  SajuCandidateWindow,
  SajuPillarName,
  SajuPossibilityBoundary,
  SajuPossibilityCalculationResult,
  SajuPossibilityCandidate,
  SajuPossibilityPolicyResult,
  SajuPossibilityReport,
  SajuPossibilityRequest,
  SajuPossibilityWarning,
  SajuReport,
  ZiHourPolicy,
} from './types';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const MAX_COVERAGE_MS = 2 * DAY_MS;
const ALL_ZI_POLICIES: readonly ZiHourPolicy[] = ['civilMidnight', 'ziStart', 'splitZi'];

interface Coverage {
  readonly start: number;
  readonly endExclusive: number;
}

type MomentZone = NonNullable<ReturnType<typeof momentTimezone.tz.zone>>;

interface LocalSolarTerm {
  readonly term: SolarTermBoundary;
  readonly localEpochMilliseconds: number;
}

type SolarBreakpointProvenance =
  | 'solar-term-estimate'
  | 'solar-term-uncertainty-start'
  | 'solar-term-uncertainty-end';

interface StateItem {
  readonly report: SajuReport;
  readonly pillars: SajuReport['pillars'];
  readonly disambiguation: SajuCandidateWindow['disambiguation'];
  readonly candidateKey: string;
  readonly dayHourCoordinate: number;
  readonly basis: SajuCandidateWindow['basis'];
}

interface WallState {
  readonly signature: string;
  readonly items: readonly StateItem[];
  readonly unresolvableReason: 'nonexistent-local-time' | 'offset-mismatch' | null;
}

interface StateSegment {
  readonly start: number;
  readonly endExclusive: number;
  readonly state: WallState;
}

interface MutableCandidate {
  readonly key: string;
  readonly pillars: SajuCandidatePillars;
  readonly windows: SajuCandidateWindow[];
}

function invalidRequest(
  message: string,
  path: readonly (string | number)[],
  value?: unknown,
): never {
  throw new SajuError('INVALID_REQUEST', message, {
    path,
    ...(value === undefined ? {} : { details: { value } }),
  });
}

function assertBirthTime(
  value: unknown,
  path: readonly (string | number)[],
): asserts value is BirthTime {
  if (!isRecord(value)) invalidRequest(`${path.join('.')} must be an object.`, path);
  const fields = [
    ['hour', 0, 23],
    ['minute', 0, 59],
    ['second', 0, 59],
    ['millisecond', 0, 999],
  ] as const;
  for (const [field, min, max] of fields) {
    const current = value[field];
    if ((field === 'second' || field === 'millisecond') && current === undefined) continue;
    if (!Number.isInteger(current) || (current as number) < min || (current as number) > max) {
      invalidRequest(
        `${[...path, field].join('.')} must be an integer from ${min} to ${max}.`,
        [...path, field],
        current,
      );
    }
  }
}

function assertTimeConstraint(value: unknown): asserts value is BirthTimeConstraint {
  if (!isRecord(value)) {
    invalidRequest('birth.time must be a birth-time constraint object.', ['birth', 'time']);
  }
  switch (value.kind) {
    case 'unknown': {
      const allowed = ['unknown', 'asked-unknown', 'not-asked', 'asked-declined', 'masked'];
      if (value.reason !== undefined && !allowed.includes(value.reason as string)) {
        invalidRequest(
          'birth.time.reason is not a supported absence reason.',
          ['birth', 'time', 'reason'],
          value.reason,
        );
      }
      return;
    }
    case 'day-period':
      if (value.period !== 'am' && value.period !== 'pm') {
        invalidRequest(
          'birth.time.period must be am or pm.',
          ['birth', 'time', 'period'],
          value.period,
        );
      }
      return;
    case 'approximate':
      assertBirthTime(value.time, ['birth', 'time', 'time']);
      if (
        typeof value.toleranceMinutes !== 'number' ||
        !Number.isInteger(value.toleranceMinutes) ||
        value.toleranceMinutes < 1 ||
        value.toleranceMinutes > 1_440
      ) {
        invalidRequest(
          'birth.time.toleranceMinutes must be an integer from 1 through 1440.',
          ['birth', 'time', 'toleranceMinutes'],
          value.toleranceMinutes,
        );
      }
      if (value.dateRollover !== undefined && value.dateRollover !== 'allow') {
        invalidRequest(
          'birth.time.dateRollover must be allow when supplied.',
          ['birth', 'time', 'dateRollover'],
          value.dateRollover,
        );
      }
      return;
    case 'range':
      assertBirthTime(value.startInclusive, ['birth', 'time', 'startInclusive']);
      assertBirthTime(value.endExclusive, ['birth', 'time', 'endExclusive']);
      if (value.crossesMidnight !== undefined && typeof value.crossesMidnight !== 'boolean') {
        invalidRequest(
          'birth.time.crossesMidnight must be a boolean.',
          ['birth', 'time', 'crossesMidnight'],
          value.crossesMidnight,
        );
      }
      return;
    default:
      invalidRequest(
        'birth.time.kind must be unknown, day-period, approximate, or range.',
        ['birth', 'time', 'kind'],
        value.kind,
      );
  }
}

function assertEvidence(value: unknown): asserts value is BirthTimeEvidence {
  if (!isRecord(value)) {
    invalidRequest('birth.timeEvidence must be an object.', ['birth', 'timeEvidence']);
  }
  if (
    ![
      'birth-record',
      'hospital-record',
      'family-record',
      'family-memory',
      'self-report',
      'secondary-source',
      'rectified',
      'historical-record',
      'unknown',
    ].includes(value.source as string)
  ) {
    invalidRequest(
      'birth.timeEvidence.source is not supported.',
      ['birth', 'timeEvidence', 'source'],
      value.source,
    );
  }
  if (value.originalText !== undefined && typeof value.originalText !== 'string') {
    invalidRequest(
      'birth.timeEvidence.originalText must be a string.',
      ['birth', 'timeEvidence', 'originalText'],
      value.originalText,
    );
  }
  if (
    value.conflict !== undefined &&
    value.conflict !== 'none' &&
    value.conflict !== 'multiple-sources'
  ) {
    invalidRequest(
      'birth.timeEvidence.conflict must be none or multiple-sources.',
      ['birth', 'timeEvidence', 'conflict'],
      value.conflict,
    );
  }
}

function assertPossibilityRequest(value: unknown): asserts value is SajuPossibilityRequest {
  if (!isRecord(value)) invalidRequest('The possibility request must be an object.', []);
  if (!isRecord(value.birth)) invalidRequest('request.birth must be an object.', ['birth']);
  assertBirthDateShape(value.birth.date);
  assertTimeConstraint(value.birth.time);
  if (value.birth.timeEvidence !== undefined) assertEvidence(value.birth.timeEvidence);
  if (typeof value.birth.timeZone !== 'string' || value.birth.timeZone.length === 0) {
    throw new SajuError(
      'UNKNOWN_TIME_ZONE',
      'birth.timeZone must be a non-empty IANA identifier.',
      {
        path: ['birth', 'timeZone'],
      },
    );
  }
  if (
    value.birth.expectedOffsetSeconds !== undefined &&
    (!Number.isInteger(value.birth.expectedOffsetSeconds) ||
      (value.birth.expectedOffsetSeconds as number) < -86_400 ||
      (value.birth.expectedOffsetSeconds as number) > 86_400)
  ) {
    invalidRequest(
      'birth.expectedOffsetSeconds must be an integer from -86400 through 86400.',
      ['birth', 'expectedOffsetSeconds'],
      value.birth.expectedOffsetSeconds,
    );
  }

  if (value.rules === undefined) return;
  if (!isRecord(value.rules)) invalidRequest('request.rules must be an object.', ['rules']);
  const policies = value.rules.ziHourPolicies;
  if (policies !== undefined && policies !== 'all') {
    if (!Array.isArray(policies) || policies.length === 0) {
      invalidRequest(
        'rules.ziHourPolicies must be all or a non-empty array.',
        ['rules', 'ziHourPolicies'],
        policies,
      );
    }
    for (const policy of policies) {
      if (!ALL_ZI_POLICIES.includes(policy as ZiHourPolicy)) {
        invalidRequest(
          'rules.ziHourPolicies contains an unsupported policy.',
          ['rules', 'ziHourPolicies'],
          policy,
        );
      }
    }
  }
  assertDayHourClockShape(value.rules.dayHourClock);
}

function copyTime(time: BirthTime): BirthTime {
  return {
    hour: time.hour,
    minute: time.minute,
    ...(time.second === undefined ? {} : { second: time.second }),
    ...(time.millisecond === undefined ? {} : { millisecond: time.millisecond }),
  };
}

function copyConstraint(time: BirthTimeConstraint): BirthTimeConstraint {
  switch (time.kind) {
    case 'unknown':
      return {
        kind: 'unknown',
        ...(time.reason === undefined ? {} : { reason: time.reason }),
      };
    case 'day-period':
      return { kind: 'day-period', period: time.period };
    case 'approximate':
      return {
        kind: 'approximate',
        time: copyTime(time.time),
        toleranceMinutes: time.toleranceMinutes,
        ...(time.dateRollover === undefined ? {} : { dateRollover: time.dateRollover }),
      };
    case 'range':
      return {
        kind: 'range',
        startInclusive: copyTime(time.startInclusive),
        endExclusive: copyTime(time.endExclusive),
        ...(time.crossesMidnight === undefined ? {} : { crossesMidnight: time.crossesMidnight }),
      };
  }
}

function timeMilliseconds(time: BirthTime): number {
  return (
    time.hour * 3_600_000 +
    time.minute * MINUTE_MS +
    (time.second ?? 0) * 1_000 +
    (time.millisecond ?? 0)
  );
}

function coverageFor(
  gregorianDate: ReturnType<typeof normalizeBirthDate>,
  time: BirthTimeConstraint,
): Coverage {
  const dayStart = localDateTimeToNaiveEpochMilliseconds({
    year: gregorianDate.year,
    month: gregorianDate.month,
    day: gregorianDate.day,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  let coverage: Coverage;
  switch (time.kind) {
    case 'unknown':
      coverage = { start: dayStart, endExclusive: dayStart + DAY_MS };
      break;
    case 'day-period':
      coverage =
        time.period === 'am'
          ? { start: dayStart, endExclusive: dayStart + 12 * 3_600_000 }
          : { start: dayStart + 12 * 3_600_000, endExclusive: dayStart + DAY_MS };
      break;
    case 'approximate': {
      const center = dayStart + timeMilliseconds(time.time);
      const tolerance = time.toleranceMinutes * MINUTE_MS;
      coverage = { start: center - tolerance, endExclusive: center + tolerance };
      if (
        time.dateRollover !== 'allow' &&
        (coverage.start < dayStart || coverage.endExclusive > dayStart + DAY_MS)
      ) {
        invalidRequest(
          'The approximate interval leaves the supplied date; confirm with dateRollover: allow.',
          ['birth', 'time', 'dateRollover'],
        );
      }
      break;
    }
    case 'range': {
      const start = dayStart + timeMilliseconds(time.startInclusive);
      const endExclusive =
        dayStart +
        timeMilliseconds(time.endExclusive) +
        (time.crossesMidnight === true ? DAY_MS : 0);
      if (endExclusive <= start) {
        invalidRequest(
          'A range must end after it starts; set crossesMidnight for an overnight range.',
          ['birth', 'time'],
        );
      }
      coverage = { start, endExclusive };
      break;
    }
  }
  if (coverage.endExclusive - coverage.start > MAX_COVERAGE_MS) {
    invalidRequest('A birth-time constraint may cover at most 48 hours.', ['birth', 'time']);
  }
  return coverage;
}

function selectedPolicies(request: SajuPossibilityRequest): readonly ZiHourPolicy[] {
  const configured = request.rules?.ziHourPolicies;
  if (configured === 'all') return ALL_ZI_POLICIES;
  if (configured === undefined) return ['civilMidnight'];
  return [...new Set(configured)];
}

function pillarKey(pillars: SajuReport['pillars'], omitHour: boolean): string {
  const values = [pillars.year.cycleIndex, pillars.month.cycleIndex, pillars.day.cycleIndex];
  if (!omitHour) values.push(pillars.hour.cycleIndex);
  return values.join('/');
}

function candidatePillars(pillars: SajuReport['pillars'], omitHour: boolean): SajuCandidatePillars {
  return {
    year: pillars.year,
    month: pillars.month,
    day: pillars.day,
    hour: omitHour ? null : pillars.hour,
  };
}

function exactRequestAt(
  localEpochMilliseconds: number,
  request: SajuPossibilityRequest,
  policy: ZiHourPolicy,
  disambiguation: 'reject' | 'earlier' | 'later',
): SajuReport {
  const local = localDateTimeFromNaiveEpochMilliseconds(localEpochMilliseconds);
  return calculateSaju({
    birth: {
      date: {
        calendar: 'gregorian',
        year: local.year,
        month: local.month,
        day: local.day,
      },
      time: {
        hour: local.hour,
        minute: local.minute,
        second: local.second,
        millisecond: local.millisecond,
      },
      timeZone: request.birth.timeZone,
      disambiguation,
      ...(request.birth.expectedOffsetSeconds === undefined
        ? {}
        : { expectedOffsetSeconds: request.birth.expectedOffsetSeconds }),
    },
    rules: {
      ziHourPolicy: policy,
      ...(request.rules?.dayHourClock === undefined
        ? {}
        : { dayHourClock: request.rules.dayHourClock }),
    },
  });
}

function reportAtUtcInstant(epochMilliseconds: number, policy: ZiHourPolicy): SajuReport {
  const instant = new Date(epochMilliseconds);
  return calculateSaju({
    birth: {
      date: {
        calendar: 'gregorian',
        year: instant.getUTCFullYear(),
        month: instant.getUTCMonth() + 1,
        day: instant.getUTCDate(),
      },
      time: {
        hour: instant.getUTCHours(),
        minute: instant.getUTCMinutes(),
        second: instant.getUTCSeconds(),
        millisecond: instant.getUTCMilliseconds(),
      },
      timeZone: 'UTC',
    },
    rules: { ziHourPolicy: policy },
  });
}

function stateReader(
  request: SajuPossibilityRequest,
  policy: ZiHourPolicy,
  omitHour: boolean,
  uncertainTerms: readonly LocalSolarTerm[],
): (localEpochMilliseconds: number) => WallState {
  const cache = new Map<number, WallState>();
  const termSides = new Map<
    number,
    {
      readonly before: Pick<SajuReport['pillars'], 'year' | 'month'>;
      readonly after: Pick<SajuReport['pillars'], 'year' | 'month'>;
    }
  >();
  return (localEpochMilliseconds) => {
    const cached = cache.get(localEpochMilliseconds);
    if (cached !== undefined) return cached;

    let reports: readonly SajuReport[];
    try {
      reports = [exactRequestAt(localEpochMilliseconds, request, policy, 'reject')];
    } catch (error) {
      if (!isSajuError(error)) throw error;
      if (error.code === 'NONEXISTENT_LOCAL_TIME') {
        const state = {
          signature: 'gap',
          items: [],
          unresolvableReason: 'nonexistent-local-time',
        } satisfies WallState;
        cache.set(localEpochMilliseconds, state);
        return state;
      }
      if (error.code === 'OFFSET_MISMATCH') {
        const state = {
          signature: 'offset-mismatch',
          items: [],
          unresolvableReason: 'offset-mismatch',
        } satisfies WallState;
        cache.set(localEpochMilliseconds, state);
        return state;
      }
      if (error.code !== 'AMBIGUOUS_LOCAL_TIME') throw error;
      const matches: SajuReport[] = [];
      for (const disambiguation of ['earlier', 'later'] as const) {
        try {
          matches.push(exactRequestAt(localEpochMilliseconds, request, policy, disambiguation));
        } catch (candidateError) {
          if (!isSajuError(candidateError) || candidateError.code !== 'OFFSET_MISMATCH') {
            throw candidateError;
          }
        }
      }
      if (matches.length === 0) {
        const state = {
          signature: 'offset-mismatch',
          items: [],
          unresolvableReason: 'offset-mismatch',
        } satisfies WallState;
        cache.set(localEpochMilliseconds, state);
        return state;
      }
      reports = matches;
    }

    const items = reports.flatMap((report) => {
      let possiblePillars: SajuReport['pillars'][] = [report.pillars];
      for (const { term } of uncertainTerms) {
        const uncertaintyStart = term.epochMilliseconds - term.uncertaintyMilliseconds;
        const uncertaintyEnd = term.epochMilliseconds + term.uncertaintyMilliseconds;
        if (
          report.chronology.epochMilliseconds < uncertaintyStart ||
          report.chronology.epochMilliseconds >= uncertaintyEnd
        ) {
          continue;
        }
        let sides = termSides.get(term.epochMilliseconds);
        if (sides === undefined) {
          const before = reportAtUtcInstant(term.epochMilliseconds - 1, policy);
          const after = reportAtUtcInstant(term.epochMilliseconds, policy);
          sides = {
            before: { year: before.pillars.year, month: before.pillars.month },
            after: { year: after.pillars.year, month: after.pillars.month },
          };
          termSides.set(term.epochMilliseconds, sides);
        }
        possiblePillars = possiblePillars.flatMap((pillars) => [
          {
            ...pillars,
            year: sides.before.year,
            month: sides.before.month,
          },
          {
            ...pillars,
            year: sides.after.year,
            month: sides.after.month,
          },
        ]);
      }
      const byKey = new Map<string, SajuReport['pillars']>();
      for (const pillars of possiblePillars) {
        byKey.set(pillarKey(pillars, omitHour), pillars);
      }
      const computedKey = pillarKey(report.pillars, omitHour);
      return [...byKey.entries()].map(([candidateKey, pillars]): StateItem => {
        const basis: StateItem['basis'] =
          candidateKey === computedKey ? 'computed' : 'solar-term-source-uncertainty';
        return {
          report,
          pillars,
          disambiguation: report.chronology.disambiguation,
          candidateKey,
          dayHourCoordinate: dayHourCoordinateForReport(localEpochMilliseconds, report, request),
          basis,
        };
      });
    });
    const signature = items
      .map((item) => `${item.disambiguation}:${item.candidateKey}:${item.basis}`)
      .sort()
      .join('|');
    const state = { signature, items, unresolvableReason: null } satisfies WallState;
    cache.set(localEpochMilliseconds, state);
    return state;
  };
}

function appendSegment(segments: StateSegment[], segment: StateSegment): void {
  const previous = segments.at(-1);
  if (
    previous !== undefined &&
    previous.endExclusive === segment.start &&
    previous.state.signature === segment.state.signature
  ) {
    segments[segments.length - 1] = {
      start: previous.start,
      endExclusive: segment.endExclusive,
      state: previous.state,
    };
    return;
  }
  segments.push(segment);
}

function addBreakpoint(points: Set<number>, coverage: Coverage, value: number): void {
  if (Number.isInteger(value) && value > coverage.start && value < coverage.endExclusive) {
    points.add(value);
  }
}

function localSolarTerms(zone: MomentZone, coverage: Coverage): LocalSolarTerm[] {
  const terms: LocalSolarTerm[] = [];
  const firstYear = new Date(coverage.start).getUTCFullYear() - 1;
  const lastYear = new Date(coverage.endExclusive - 1).getUTCFullYear() + 1;
  const supported = ENGINE_MANIFEST.supportedRanges.solarTermYears;
  for (
    let year = Math.max(firstYear, supported.min);
    year <= Math.min(lastYear, supported.max);
    year++
  ) {
    for (let index = 0; index < 24; index += 2) {
      const term = findSolarTermBoundary(year, index);
      terms.push({
        term,
        localEpochMilliseconds: Math.round(
          term.epochMilliseconds - zone.utcOffset(term.epochMilliseconds) * MINUTE_MS,
        ),
      });
    }
  }
  return terms;
}

/**
 * Enumerates every discontinuity that can affect a civil-clock chart. Solar
 * terms are converted from UTC to the applicable local wall coordinate; IANA
 * transitions contribute both sides so gap and fold intervals remain explicit.
 */
function fixedBreakpoints(
  request: SajuPossibilityRequest,
  coverage: Coverage,
  solarProvenance: ReadonlyMap<number, readonly SolarBreakpointProvenance[]>,
): number[] {
  const points = new Set([coverage.start, coverage.endExclusive]);
  const firstHour = Math.ceil(coverage.start / HOUR_MS) * HOUR_MS;
  for (let value = firstHour; value < coverage.endExclusive; value += HOUR_MS) {
    addBreakpoint(points, coverage, value);
  }

  const zone = momentTimezone.tz.zone(request.birth.timeZone);
  if (zone === null) {
    throw new SajuError('UNKNOWN_TIME_ZONE', `Unknown IANA time zone: ${request.birth.timeZone}`, {
      path: ['birth', 'timeZone'],
      details: {
        timeZone: request.birth.timeZone,
        tzdbVersion: ENGINE_MANIFEST.timezone.ianaVersion,
      },
    });
  }
  for (const transition of zone.untils) {
    if (!Number.isFinite(transition)) continue;
    const beforeLocal = Math.round(transition - zone.utcOffset(transition - 1) * MINUTE_MS);
    const afterLocal = Math.round(transition - zone.utcOffset(transition) * MINUTE_MS);
    addBreakpoint(points, coverage, beforeLocal);
    addBreakpoint(points, coverage, afterLocal);
  }

  for (const solarBreakpoint of solarProvenance.keys()) {
    addBreakpoint(points, coverage, solarBreakpoint);
  }
  return [...points].sort((left, right) => left - right);
}

function solarBreakpointProvenance(
  zone: MomentZone,
  terms: readonly LocalSolarTerm[],
): ReadonlyMap<number, readonly SolarBreakpointProvenance[]> {
  const result = new Map<number, SolarBreakpointProvenance[]>();
  const add = (value: number, provenance: SolarBreakpointProvenance): void => {
    const existing = result.get(value) ?? [];
    if (!existing.includes(provenance)) existing.push(provenance);
    result.set(value, existing);
  };
  for (const { term, localEpochMilliseconds } of terms) {
    add(localEpochMilliseconds, 'solar-term-estimate');
    const uncertaintyStart = term.epochMilliseconds - term.uncertaintyMilliseconds;
    const uncertaintyEnd = term.epochMilliseconds + term.uncertaintyMilliseconds;
    add(
      Math.round(uncertaintyStart - zone.utcOffset(uncertaintyStart) * MINUTE_MS),
      'solar-term-uncertainty-start',
    );
    add(
      Math.round(uncertaintyEnd - zone.utcOffset(uncertaintyEnd) * MINUTE_MS),
      'solar-term-uncertainty-end',
    );
  }
  return result;
}

function possibilityWarnings(
  request: SajuPossibilityRequest,
  coverage: Coverage,
  terms: readonly LocalSolarTerm[],
  policyResults: readonly SajuPossibilityPolicyResult[],
): SajuPossibilityWarning[] {
  const warnings: SajuPossibilityWarning[] = [];
  const windows = policyResults[0]?.candidates.flatMap((candidate) => candidate.windows) ?? [];
  for (const { term, localEpochMilliseconds } of terms) {
    const uncertaintyStart = term.epochMilliseconds - term.uncertaintyMilliseconds;
    const uncertaintyEnd = term.epochMilliseconds + term.uncertaintyMilliseconds;
    if (
      !windows.some(
        (window) =>
          Date.parse(window.instantStartUtc) < uncertaintyEnd &&
          Date.parse(window.instantEndExclusiveUtc) > uncertaintyStart,
      )
    ) {
      continue;
    }
    warnings.push({
      code: 'SOLAR_TERM_SOURCE_UNCERTAINTY_INTERSECTS_RANGE',
      message:
        'The input range intersects the conservative uncertainty window of a solar-term boundary; verify with an independent high-precision oracle.',
      boundaryInstantUtc: term.instantUtc,
      boundaryLocalDateTime: formatLocalDateTime(
        localDateTimeFromNaiveEpochMilliseconds(localEpochMilliseconds),
      ),
      uncertaintyMilliseconds: term.uncertaintyMilliseconds,
    });
  }
  if (
    request.birth.timeZone === 'Asia/Seoul' &&
    coverage.start < SEOUL_STANDARD_TIME_START_LOCAL_MS
  ) {
    warnings.push(PRE_STANDARD_TIME_LOCAL_MEAN_WARNING);
  }
  return warnings;
}

function dayHourCoordinateForReport(
  localEpochMilliseconds: number,
  report: SajuReport,
  request: SajuPossibilityRequest,
): number {
  const civilDateTime = localDateTimeFromNaiveEpochMilliseconds(localEpochMilliseconds);
  const clock = request.rules?.dayHourClock ?? { kind: 'civil' };
  const resolved = resolveDayHourClock(civilDateTime, report.chronology.epochMilliseconds, clock);
  return localDateTimeToNaiveEpochMilliseconds(resolved.dateTime);
}

function dayHourCoordinateAt(
  localEpochMilliseconds: number,
  request: SajuPossibilityRequest,
  policy: ZiHourPolicy,
  disambiguation: StateItem['disambiguation'],
): number {
  const report = exactRequestAt(
    localEpochMilliseconds,
    request,
    policy,
    disambiguation === 'exact' ? 'reject' : disambiguation,
  );
  return dayHourCoordinateForReport(localEpochMilliseconds, report, request);
}

function dayHourTargets(start: number, end: number): number[] {
  const targets: number[] = [];
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  const firstDay = Math.floor(low / DAY_MS) * DAY_MS;
  for (let day = firstDay; day <= high; day += DAY_MS) {
    for (const hour of [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]) {
      const target = day + hour * HOUR_MS;
      if (target > low && target <= high) targets.push(target);
    }
  }
  return targets;
}

function apparentBoundary(
  intervalStart: number,
  intervalEndExclusive: number,
  target: number,
  request: SajuPossibilityRequest,
  policy: ZiHourPolicy,
  disambiguation: StateItem['disambiguation'],
): number {
  let low = intervalStart;
  let high = intervalEndExclusive - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (dayHourCoordinateAt(middle, request, policy, disambiguation) < target) low = middle;
    else high = middle;
  }
  return high;
}

function withApparentSolarBreakpoints(
  fixed: readonly number[],
  request: SajuPossibilityRequest,
  policy: ZiHourPolicy,
  read: (value: number) => WallState,
): number[] {
  if (request.rules?.dayHourClock?.kind !== 'local-apparent-solar') return [...fixed];
  // Between fixed IANA boundaries, apparent solar time is continuous and
  // strictly increasing. Enumerate every target day/hour boundary in its image,
  // then solve the corresponding wall time instead of sampling candidate charts.
  const points = new Set(fixed);
  for (let index = 0; index < fixed.length - 1; index++) {
    const start = fixed[index] as number;
    const endExclusive = fixed[index + 1] as number;
    if (start >= endExclusive) continue;
    const startState = read(start);
    const endState = read(endExclusive - 1);
    for (const startItem of startState.items) {
      const endItem = endState.items.find(
        (candidate) => candidate.disambiguation === startItem.disambiguation,
      );
      if (endItem === undefined) continue;
      const adjustedStart = startItem.dayHourCoordinate;
      const adjustedEnd = endItem.dayHourCoordinate;
      for (const target of dayHourTargets(adjustedStart, adjustedEnd)) {
        const boundary = apparentBoundary(
          start,
          endExclusive,
          target,
          request,
          policy,
          startItem.disambiguation,
        );
        if (boundary > start && boundary < endExclusive) points.add(boundary);
      }
    }
  }
  return [...points].sort((left, right) => left - right);
}

function partitionCoverage(
  breakpoints: readonly number[],
  read: (value: number) => WallState,
  preservedBreakpoints: ReadonlySet<number>,
): StateSegment[] {
  const segments: StateSegment[] = [];
  for (let index = 0; index < breakpoints.length - 1; index++) {
    const start = breakpoints[index] as number;
    const endExclusive = breakpoints[index + 1] as number;
    if (start >= endExclusive) continue;
    const state = read(start);
    const finalState = read(endExclusive - 1);
    if (state.signature !== finalState.signature) {
      throw new SajuError(
        'DATA_INTEGRITY_FAILURE',
        'A chart changed inside a supposedly invariant possibility interval.',
        {
          details: {
            startLocalDateTime: formatLocalDateTime(localDateTimeFromNaiveEpochMilliseconds(start)),
            endLocalDateTimeExclusive: formatLocalDateTime(
              localDateTimeFromNaiveEpochMilliseconds(endExclusive),
            ),
          },
        },
      );
    }
    if (preservedBreakpoints.has(start)) {
      segments.push({ start, endExclusive, state });
    } else {
      appendSegment(segments, { start, endExclusive, state });
    }
  }
  return segments;
}

function addWindow(windows: SajuCandidateWindow[], next: SajuCandidateWindow): void {
  const previous = windows.at(-1);
  if (
    previous !== undefined &&
    previous.endLocalDateTimeExclusive === next.startLocalDateTimeInclusive &&
    previous.instantEndExclusiveUtc === next.instantStartUtc &&
    previous.offsetSeconds === next.offsetSeconds &&
    previous.disambiguation === next.disambiguation &&
    previous.basis === next.basis
  ) {
    windows[windows.length - 1] = {
      ...previous,
      endLocalDateTimeExclusive: next.endLocalDateTimeExclusive,
      instantEndExclusiveUtc: next.instantEndExclusiveUtc,
    };
    return;
  }
  windows.push(next);
}

function candidateMap(
  segments: readonly StateSegment[],
  omitHour: boolean,
): Map<string, MutableCandidate> {
  const candidates = new Map<string, MutableCandidate>();
  for (const segment of segments) {
    for (const item of segment.state.items) {
      let candidate = candidates.get(item.candidateKey);
      if (candidate === undefined) {
        candidate = {
          key: item.candidateKey,
          pillars: candidatePillars(item.pillars, omitHour),
          windows: [],
        };
        candidates.set(item.candidateKey, candidate);
      }
      addWindow(candidate.windows, {
        startLocalDateTimeInclusive: formatLocalDateTime(
          localDateTimeFromNaiveEpochMilliseconds(segment.start),
        ),
        endLocalDateTimeExclusive: formatLocalDateTime(
          localDateTimeFromNaiveEpochMilliseconds(segment.endExclusive),
        ),
        instantStartUtc: item.report.chronology.instantUtc,
        instantEndExclusiveUtc: new Date(
          item.report.chronology.epochMilliseconds + segment.endExclusive - segment.start,
        ).toISOString(),
        offsetSeconds: item.report.chronology.offsetSeconds,
        disambiguation: item.disambiguation,
        basis: item.basis,
      });
    }
  }
  return candidates;
}

function stablePillar(
  candidates: readonly { readonly pillars: SajuCandidatePillars }[],
  name: SajuPillarName,
): PillarReport | null {
  const first = candidates[0]?.pillars[name];
  if (first === undefined || first === null) return null;
  return candidates.every((candidate) => candidate.pillars[name]?.cycleIndex === first.cycleIndex)
    ? first
    : null;
}

function candidatePillarsKey(pillars: SajuCandidatePillars): string {
  return [
    pillars.year.cycleIndex,
    pillars.month.cycleIndex,
    pillars.day.cycleIndex,
    pillars.hour?.cycleIndex ?? 'omitted',
  ].join('/');
}

function windowDuration(window: SajuCandidateWindow): number {
  return Date.parse(window.instantEndExclusiveUtc) - Date.parse(window.instantStartUtc);
}

function unionDuration(
  windows: readonly Pick<SajuCandidateWindow, 'instantStartUtc' | 'instantEndExclusiveUtc'>[],
): number {
  const intervals = windows
    .map((window) => [
      Date.parse(window.instantStartUtc),
      Date.parse(window.instantEndExclusiveUtc),
    ])
    .sort((left, right) => (left[0] as number) - (right[0] as number));
  let duration = 0;
  let currentStart: number | undefined;
  let currentEnd: number | undefined;
  for (const [start, end] of intervals) {
    if (currentStart === undefined || currentEnd === undefined) {
      currentStart = start;
      currentEnd = end;
    } else if ((start as number) <= currentEnd) {
      currentEnd = Math.max(currentEnd, end as number);
    } else {
      duration += currentEnd - currentStart;
      currentStart = start;
      currentEnd = end;
    }
  }
  return currentStart === undefined || currentEnd === undefined
    ? duration
    : duration + currentEnd - currentStart;
}

function aggregateCandidates(
  policyResults: readonly SajuPossibilityPolicyResult[],
): SajuAggregatedPossibilityCandidate[] {
  const byKey = new Map<
    string,
    {
      readonly pillars: SajuCandidatePillars;
      readonly ziHourPolicies: Set<ZiHourPolicy>;
      readonly occurrences: SajuAggregatedPossibilityCandidate['occurrences'][number][];
    }
  >();
  for (const policyResult of policyResults) {
    for (const candidate of policyResult.candidates) {
      const key = candidatePillarsKey(candidate.pillars);
      let aggregated = byKey.get(key);
      if (aggregated === undefined) {
        aggregated = {
          pillars: candidate.pillars,
          ziHourPolicies: new Set(),
          occurrences: [],
        };
        byKey.set(key, aggregated);
      }
      aggregated.ziHourPolicies.add(policyResult.ziHourPolicy);
      for (const window of candidate.windows) {
        aggregated.occurrences.push({
          ...window,
          ziHourPolicy: policyResult.ziHourPolicy,
        });
      }
    }
  }
  return [...byKey.values()].map((candidate, index) => ({
    id: `chart-${index + 1}`,
    pillars: candidate.pillars,
    ziHourPolicies: [...candidate.ziHourPolicies],
    occurrences: candidate.occurrences,
    supportDurationMilliseconds: unionDuration(candidate.occurrences),
  }));
}

function candidateIdsForState(
  state: WallState,
  idsByKey: ReadonlyMap<string, string>,
): readonly string[] {
  return [
    ...new Set(
      state.items.map((item) => idsByKey.get(item.candidateKey)).filter((id) => id !== undefined),
    ),
  ].sort();
}

function valuesForState(state: WallState, name: SajuPillarName, omitHour: boolean): string[] {
  if (name === 'hour' && omitHour) return [];
  return [
    ...new Set(
      state.items.map((item) => {
        const pillar = item.pillars[name];
        return `${pillar.cycleIndex}`;
      }),
    ),
  ].sort();
}

function timeZoneValuesForState(state: WallState): string[] {
  return [
    ...new Set(
      state.items.map(
        (item) =>
          `${item.disambiguation}:${item.report.chronology.offsetSeconds}:${item.report.chronology.timeZoneAbbreviation}`,
      ),
    ),
  ].sort();
}

function boundaryBetween(
  before: StateSegment,
  after: StateSegment,
  idsByKey: ReadonlyMap<string, string>,
  omitHour: boolean,
  provenance: readonly SolarBreakpointProvenance[],
): SajuPossibilityBoundary {
  const hasCharts = before.state.items.length > 0 && after.state.items.length > 0;
  const beforeCandidateIds = candidateIdsForState(before.state, idsByKey);
  const afterCandidateIds = candidateIdsForState(after.state, idsByKey);
  const timeZoneChanged =
    before.state.items.length === 0 ||
    after.state.items.length === 0 ||
    timeZoneValuesForState(before.state).join(',') !==
      timeZoneValuesForState(after.state).join(',');
  const changedPillars = hasCharts
    ? (['year', 'month', 'day', 'hour'] as const).filter(
        (name) =>
          valuesForState(before.state, name, omitHour).join(',') !==
          valuesForState(after.state, name, omitHour).join(','),
      )
    : [];
  const transitionKind: SajuPossibilityBoundary['transitionKind'] = provenance.includes(
    'solar-term-estimate',
  )
    ? 'computed-basis-transition'
    : provenance.some((item) => item.startsWith('solar-term-uncertainty-'))
      ? 'source-uncertainty-transition'
      : changedPillars.length === 0 &&
          !timeZoneChanged &&
          beforeCandidateIds.join(',') === afterCandidateIds.join(',') &&
          before.state.signature !== after.state.signature
        ? 'computed-basis-transition'
        : 'candidate-set-change';
  const causes: SajuPossibilityBoundary['causes'][number][] = [];
  if (
    provenance.length > 0 ||
    transitionKind === 'computed-basis-transition' ||
    changedPillars.includes('year') ||
    changedPillars.includes('month')
  ) {
    causes.push('solar-term');
  }
  if (changedPillars.includes('day')) causes.push('day-boundary');
  if (changedPillars.includes('hour')) causes.push('hour-boundary');
  if (timeZoneChanged) {
    causes.push('time-zone-transition');
  }
  return {
    transitionKind,
    atLocalDateTime: formatLocalDateTime(localDateTimeFromNaiveEpochMilliseconds(after.start)),
    instantUtcCandidates: [
      ...new Set(after.state.items.map((item) => item.report.chronology.instantUtc)),
    ].sort(),
    beforeCandidateIds,
    afterCandidateIds,
    changedPillars,
    causes,
  };
}

function unresolvableWindows(
  segments: readonly StateSegment[],
): SajuPossibilityPolicyResult['unresolvableWindows'] {
  const windows: {
    startLocalDateTimeInclusive: string;
    endLocalDateTimeExclusive: string;
    reason: SajuPossibilityPolicyResult['unresolvableWindows'][number]['reason'];
  }[] = [];
  for (const segment of segments) {
    if (segment.state.items.length !== 0) continue;
    if (segment.state.unresolvableReason === null) {
      throw new SajuError(
        'DATA_INTEGRITY_FAILURE',
        'An empty possibility interval had no unresolvable reason.',
      );
    }
    const next = {
      startLocalDateTimeInclusive: formatLocalDateTime(
        localDateTimeFromNaiveEpochMilliseconds(segment.start),
      ),
      endLocalDateTimeExclusive: formatLocalDateTime(
        localDateTimeFromNaiveEpochMilliseconds(segment.endExclusive),
      ),
      reason: segment.state.unresolvableReason,
    };
    const previous = windows.at(-1);
    if (
      previous?.endLocalDateTimeExclusive === next.startLocalDateTimeInclusive &&
      previous.reason === next.reason
    ) {
      previous.endLocalDateTimeExclusive = next.endLocalDateTimeExclusive;
    } else {
      windows.push(next);
    }
  }
  return windows;
}

function calculatePolicy(
  request: SajuPossibilityRequest,
  fixed: readonly number[],
  policy: ZiHourPolicy,
  omitHour: boolean,
  uncertainTerms: readonly LocalSolarTerm[],
  solarProvenance: ReadonlyMap<number, readonly SolarBreakpointProvenance[]>,
): SajuPossibilityPolicyResult {
  const read = stateReader(request, policy, omitHour, uncertainTerms);
  const breakpoints = withApparentSolarBreakpoints(fixed, request, policy, read);
  const segments = partitionCoverage(breakpoints, read, new Set(solarProvenance.keys()));
  const mutableCandidates = [...candidateMap(segments, omitHour).values()];
  const idsByKey = new Map(
    mutableCandidates.map((candidate, index) => [candidate.key, `candidate-${index + 1}`]),
  );
  const candidates = mutableCandidates.map(
    (candidate): SajuPossibilityCandidate => ({
      id: idsByKey.get(candidate.key) as string,
      pillars: candidate.pillars,
      windows: candidate.windows,
      supportDurationMilliseconds: candidate.windows.reduce(
        (sum, window) => sum + windowDuration(window),
        0,
      ),
    }),
  );
  const boundaries = segments
    .slice(1)
    .map((segment, index) =>
      boundaryBetween(
        segments[index] as StateSegment,
        segment,
        idsByKey,
        omitHour,
        solarProvenance.get(segment.start) ?? [],
      ),
    )
    .filter((boundary) => boundary.causes.length > 0);

  return {
    ziHourPolicy: policy,
    stablePillars: {
      year: stablePillar(candidates, 'year'),
      month: stablePillar(candidates, 'month'),
      day: stablePillar(candidates, 'day'),
      hour: stablePillar(candidates, 'hour'),
    },
    candidates,
    boundaries,
    unresolvableWindows: unresolvableWindows(segments),
  };
}

/**
 * Calculates the complete set of charts allowed by an uncertain local birth
 * time. It never substitutes a hypothetical noon. Unknown time omits the hour
 * pillar; narrower constraints return hour-pillar candidates and exact windows.
 */
export function calculateSajuPossibilities(request: SajuPossibilityRequest): SajuPossibilityReport {
  assertPossibilityRequest(request);
  const gregorianDate = normalizeBirthDate(request.birth.date);
  const coverage = coverageFor(gregorianDate, request.birth.time);
  const omitHour = request.birth.time.kind === 'unknown';
  const zone = momentTimezone.tz.zone(request.birth.timeZone);
  if (zone === null) {
    throw new SajuError('UNKNOWN_TIME_ZONE', `Unknown IANA time zone: ${request.birth.timeZone}`, {
      path: ['birth', 'timeZone'],
    });
  }
  const uncertainTerms = localSolarTerms(zone, coverage);
  const solarProvenance = solarBreakpointProvenance(zone, uncertainTerms);
  const fixed = fixedBreakpoints(request, coverage, solarProvenance);
  const policies = selectedPolicies(request);
  const clock = request.rules?.dayHourClock ?? { kind: 'civil' };
  const policyResults = policies.map((policy) =>
    calculatePolicy(request, fixed, policy, omitHour, uncertainTerms, solarProvenance),
  );
  const candidates = aggregateCandidates(policyResults);

  return deepFreeze(
    brandCalculationReport({
      schemaVersion: ENGINE_MANIFEST.engine.schemaVersion,
      input: {
        date: copyBirthDate(request.birth.date),
        gregorianDate,
        time: copyConstraint(request.birth.time),
        timeZone: request.birth.timeZone,
        expectedOffsetSeconds: request.birth.expectedOffsetSeconds ?? null,
        timeEvidence:
          request.birth.timeEvidence === undefined
            ? null
            : {
                source: request.birth.timeEvidence.source,
                ...(request.birth.timeEvidence.originalText === undefined
                  ? {}
                  : { originalText: request.birth.timeEvidence.originalText }),
                ...(request.birth.timeEvidence.conflict === undefined
                  ? {}
                  : { conflict: request.birth.timeEvidence.conflict }),
              },
      },
      hourPillar: omitHour ? 'omitted' : 'candidate',
      coverage: {
        startLocalDateTimeInclusive: formatLocalDateTime(
          localDateTimeFromNaiveEpochMilliseconds(coverage.start),
        ),
        endLocalDateTimeExclusive: formatLocalDateTime(
          localDateTimeFromNaiveEpochMilliseconds(coverage.endExclusive),
        ),
        intervalSemantics: '[start,end)',
      },
      policyResults,
      candidates,
      stablePillars: {
        year: stablePillar(candidates, 'year'),
        month: stablePillar(candidates, 'month'),
        day: stablePillar(candidates, 'day'),
        hour: stablePillar(candidates, 'hour'),
      },
      warnings: possibilityWarnings(request, coverage, uncertainTerms, policyResults),
      audit: {
        engine: ENGINE_MANIFEST.engine,
        supportedRanges: ENGINE_MANIFEST.supportedRanges,
        datasets: {
          timezone: ENGINE_MANIFEST.timezone,
          solarTerms: ENGINE_MANIFEST.solarTerms,
          koreanLunar: ENGINE_MANIFEST.koreanLunar,
        },
        validation: ENGINE_MANIFEST.validation,
        method: 'exact-boundary-partition-v1',
        boundaryResolutionMilliseconds: 1,
        intervalSemantics: '[start,end)',
        rules: {
          ziHourPolicies: policies,
          dayHourClock: clock.kind,
          longitudeDegreesEast:
            clock.kind === 'local-apparent-solar' ? clock.longitudeDegreesEast : null,
          equationOfTime: clock.kind === 'local-apparent-solar' ? clock.equationOfTime : null,
        },
      },
    }),
  );
}

export function tryCalculateSajuPossibilities(
  request: SajuPossibilityRequest,
): SajuPossibilityCalculationResult {
  try {
    return { ok: true, value: calculateSajuPossibilities(request) };
  } catch (error) {
    if (isSajuError(error)) return { ok: false, error };
    throw error;
  }
}
