import {
  analyzePillarPairRelationships,
  type PillarPosition,
} from '../analysis/structural-analysis';
import { calculateSaju } from '../auditable/calculate-saju';
import type { DayHourClock, SajuReport } from '../auditable/types';
import { isValidSolarDate } from '../calendar/convert';
import { SajuError } from '../errors';
import { getBranchTenGod, getTenGod } from '../features/ten-gods';
import { deepFreeze } from '../internal/deep-freeze';
import { isRecord } from '../internal/guards';
import { ENGINE_MANIFEST } from '../manifest';
import type { Pillar } from '../types';
import type {
  SajuDailyTransitNatalPosition,
  SajuDailyTransitPairRelationship,
  SajuDailyTransitPunishmentRelationship,
  SajuDailyTransitReport,
  SajuDailyTransitRequest,
} from './types';

const NATAL_POSITIONS: readonly PillarPosition[] = ['year', 'month', 'day', 'hour'];
const { min: MINIMUM_TRANSIT_YEAR, max: MAXIMUM_TRANSIT_YEAR } =
  ENGINE_MANIFEST.supportedRanges.sajuBirthYears;

function assertDailyTransitRequest(value: unknown): asserts value is SajuDailyTransitRequest {
  if (!isRecord(value)) {
    throw new SajuError('INVALID_REQUEST', 'The daily-transit request must be an object.');
  }
  if (!isRecord(value.natalRequest)) {
    throw new SajuError('INVALID_REQUEST', 'natalRequest must be an exact Saju request.', {
      path: ['natalRequest'],
    });
  }
  if (!isRecord(value.date)) {
    throw new SajuError('INVALID_REQUEST', 'date must be a Gregorian date object.', {
      path: ['date'],
    });
  }

  const date = value.date;
  if (date.calendar !== 'gregorian') {
    throw new SajuError('INVALID_DATE', 'date.calendar must be gregorian.', {
      path: ['date', 'calendar'],
      details: { value: date.calendar },
    });
  }
  const year = date.year;
  const month = date.month;
  const day = date.day;
  if (
    typeof year !== 'number' ||
    !Number.isInteger(year) ||
    year < MINIMUM_TRANSIT_YEAR ||
    year > MAXIMUM_TRANSIT_YEAR
  ) {
    throw new SajuError(
      'UNSUPPORTED_DATE_RANGE',
      `Daily transit dates are supported from ${MINIMUM_TRANSIT_YEAR} through ${MAXIMUM_TRANSIT_YEAR}.`,
      {
        path: ['date', 'year'],
        details: {
          year,
          minimumYear: MINIMUM_TRANSIT_YEAR,
          maximumYear: MAXIMUM_TRANSIT_YEAR,
        },
      },
    );
  }
  if (typeof month !== 'number' || typeof day !== 'number' || !isValidSolarDate(year, month, day)) {
    throw new SajuError('INVALID_DATE', 'The Gregorian daily-transit date does not exist.', {
      path: ['date'],
      details: { calendar: 'gregorian', year, month, day },
    });
  }
}

function pillarFromReport(report: SajuReport['pillars'][PillarPosition]): Pillar {
  return {
    heavenlyStem: report.stem.korean,
    earthlyBranch: report.branch.korean,
  };
}

function inheritedDayHourClock(natal: SajuReport): DayHourClock {
  const rules = natal.audit.rules;
  if (rules.dayHourClock === 'civil') return { kind: 'civil' };
  if (rules.longitudeDegreesEast === null || rules.equationOfTime === null) {
    throw new SajuError(
      'DATA_INTEGRITY_FAILURE',
      'The natal report omitted parameters for its apparent-solar clock.',
    );
  }
  return {
    kind: 'local-apparent-solar',
    longitudeDegreesEast: rules.longitudeDegreesEast,
    equationOfTime: rules.equationOfTime,
  };
}

function relationshipsWithNatal(
  natal: SajuReport,
  transit: SajuReport,
): SajuDailyTransitReport['relationships'] {
  const stemCombinations: SajuDailyTransitPairRelationship<
    SajuReport['pillars']['day']['stem']['korean']
  >[] = [];
  const branchCombinations: SajuDailyTransitPairRelationship<
    SajuReport['pillars']['day']['branch']['korean']
  >[] = [];
  const branchClashes: SajuDailyTransitPairRelationship<
    SajuReport['pillars']['day']['branch']['korean']
  >[] = [];
  const branchPunishments: SajuDailyTransitPunishmentRelationship[] = [];
  const branchBreaks: SajuDailyTransitPairRelationship<
    SajuReport['pillars']['day']['branch']['korean']
  >[] = [];
  const branchHarms: SajuDailyTransitPairRelationship<
    SajuReport['pillars']['day']['branch']['korean']
  >[] = [];
  const transitPillar = pillarFromReport(transit.pillars.day);

  for (const natalPosition of NATAL_POSITIONS) {
    const natalPillar = pillarFromReport(natal.pillars[natalPosition]);
    const facts = analyzePillarPairRelationships(transitPillar, natalPillar);
    const positions = [
      'transit-day',
      `natal-${natalPosition}` as SajuDailyTransitNatalPosition,
    ] as const;
    const stemMembers = [transitPillar.heavenlyStem, natalPillar.heavenlyStem] as const;
    const branchMembers = [transitPillar.earthlyBranch, natalPillar.earthlyBranch] as const;

    if (facts.stemCombination) {
      stemCombinations.push({ positions, members: stemMembers, direction: 'mutual' });
    }
    if (facts.branchCombination) {
      branchCombinations.push({ positions, members: branchMembers, direction: 'mutual' });
    }
    if (facts.branchClash) {
      branchClashes.push({ positions, members: branchMembers, direction: 'mutual' });
    }
    if (facts.branchPunishment !== null) {
      const direction =
        facts.branchPunishment.direction === 'left-to-right'
          ? 'transit-to-natal'
          : facts.branchPunishment.direction === 'right-to-left'
            ? 'natal-to-transit'
            : facts.branchPunishment.direction;
      branchPunishments.push({
        positions,
        members: branchMembers,
        direction,
        kind: facts.branchPunishment.kind,
      });
    }
    if (facts.branchBreak) {
      branchBreaks.push({ positions, members: branchMembers, direction: 'mutual' });
    }
    if (facts.branchHarm) {
      branchHarms.push({ positions, members: branchMembers, direction: 'mutual' });
    }
  }

  return {
    stemCombinations,
    branchCombinations,
    branchClashes,
    branchPunishments,
    branchBreaks,
    branchHarms,
  };
}

/**
 * Calculates deterministic local-noon calendar and raw pair-relationship facts
 * for one Gregorian civil date. It intentionally provides no score or forecast.
 */
export function calculateSajuDailyTransit(
  request: SajuDailyTransitRequest,
): SajuDailyTransitReport {
  assertDailyTransitRequest(request);
  const natal = calculateSaju(request.natalRequest);
  const dayHourClock = inheritedDayHourClock(natal);
  const transit = calculateSaju({
    birth: {
      date: {
        calendar: 'gregorian',
        year: request.date.year,
        month: request.date.month,
        day: request.date.day,
      },
      time: { hour: 12, minute: 0, second: 0, millisecond: 0 },
      timeZone: natal.chronology.timeZone,
    },
    rules: {
      ziHourPolicy: natal.audit.rules.ziHourPolicy,
      dayHourClock,
    },
  });
  const dayMaster = natal.facts.dayMaster.korean;

  return deepFreeze({
    schemaVersion: '1',
    natal,
    date: {
      calendar: 'gregorian',
      year: request.date.year,
      month: request.date.month,
      day: request.date.day,
    },
    representative: {
      policy: 'local-civil-noon',
      localTime: '12:00:00.000',
      civilDateTime: transit.chronology.civilDateTime,
      dayHourDateTime: transit.chronology.dayHourDateTime,
      instantUtc: transit.chronology.instantUtc,
      epochMilliseconds: transit.chronology.epochMilliseconds,
      timeZone: transit.chronology.timeZone,
      offsetSeconds: transit.chronology.offsetSeconds,
      dayHourClock: transit.chronology.dayHourClock,
      solarTimeCorrection: transit.chronology.solarTimeCorrection,
    },
    pillars: {
      year: transit.pillars.year,
      month: transit.pillars.month,
      day: transit.pillars.day,
    },
    tenGods: {
      year: {
        stem: getTenGod(dayMaster, transit.pillars.year.stem.korean),
        branch: getBranchTenGod(dayMaster, transit.pillars.year.branch.korean),
      },
      month: {
        stem: getTenGod(dayMaster, transit.pillars.month.stem.korean),
        branch: getBranchTenGod(dayMaster, transit.pillars.month.branch.korean),
      },
      day: {
        stem: getTenGod(dayMaster, transit.pillars.day.stem.korean),
        branch: getBranchTenGod(dayMaster, transit.pillars.day.branch.korean),
      },
    },
    relationships: relationshipsWithNatal(natal, transit),
    warnings: transit.warnings,
    notes: [
      'The representative instant is 12:00:00.000 civil time in the natal IANA time zone.',
      'This is a local-noon fact, not a claim that every pillar is invariant throughout the civil date.',
      'Relationships are raw pair-table matches between the transit day pillar and all four natal pillars.',
      'No auspiciousness scores, rankings, interpretations, or event predictions are produced.',
    ],
    audit: {
      engine: transit.audit.engine,
      solarTerms: transit.audit.datasets.solarTerms,
      timingMethod: 'local-civil-noon-daily-transit-v1',
      representativeInstantPolicy: 'local-civil-noon',
      relationshipMethod: 'raw-pillar-pair-tables-v1',
      interpretationScope: 'deterministic-facts-only',
      inheritedRules: {
        ziHourPolicy: transit.audit.rules.ziHourPolicy,
        dayHourClock: transit.audit.rules.dayHourClock,
        longitudeDegreesEast: transit.audit.rules.longitudeDegreesEast,
        equationOfTime: transit.audit.rules.equationOfTime,
      },
      evidence: transit.audit.evidence,
    },
  });
}
