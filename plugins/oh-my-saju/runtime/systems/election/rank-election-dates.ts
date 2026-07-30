import { calculateSaju, ENGINE_MANIFEST, isSajuError, type PillarReport } from 'saju-engine';
import { calculateSajuDailyTransit, type SajuDailyTransitReport } from 'saju-engine/timing';
import { deepFreeze } from '../../internal/deep-freeze';
import { isRecord } from '../../internal/guards';
import { TraditionalSystemError } from '../shared';
import {
  ELECTION_LIMITATIONS_V1,
  ELECTION_MODULE_V1,
  NAM_BYEONG_GIL_ELECTIONAL_PROFILE_V1,
  OH_MY_SAJU_ELECTION_RANKING_POLICY_V1,
} from './profile';
import { dayOfficerForBranches, officerWeight, yellowBlackPathForBranches } from './tables';
import type {
  ElectionCalendarFacts,
  ElectionCandidate,
  ElectionClassicalMatch,
  ElectionEventType,
  ElectionGregorianDate,
  ElectionParticipant,
  ElectionRankingContribution,
  ElectionRequest,
  ElectionResult,
} from './types';

export const MAX_ELECTION_DATE_SPAN_DAYS = 366;
const MAX_PARTICIPANTS = 8;
const SELECTION_SOURCE_ID = 'selection-1867-officer-path-relations-v1';
const MONTH_BREAK_SOURCE_ID = 'xieji-qing-month-break-v1';
const SCORE_MEANING = OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.scoreMeaning;

function dateOrdinal(date: ElectionGregorianDate): number {
  return Math.trunc(Date.UTC(date.year, date.month - 1, date.day) / 86_400_000);
}

function dateFromOrdinal(ordinal: number): ElectionGregorianDate {
  const date = new Date(ordinal * 86_400_000);
  return {
    calendar: 'gregorian',
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function dateKey(date: ElectionGregorianDate): string {
  return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(
    date.day,
  ).padStart(2, '0')}`;
}

function assertGregorianDate(
  value: unknown,
  path: readonly (string | number)[],
): asserts value is ElectionGregorianDate {
  if (!isRecord(value) || value.calendar !== 'gregorian') {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'Election dates must be explicit Gregorian date objects.',
      { path },
    );
  }
  const { year, month, day } = value;
  if (
    typeof year !== 'number' ||
    !Number.isInteger(year) ||
    typeof month !== 'number' ||
    !Number.isInteger(month) ||
    typeof day !== 'number' ||
    !Number.isInteger(day)
  ) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'Election date fields must be integers.',
      { path },
    );
  }
  if (
    year < ENGINE_MANIFEST.supportedRanges.sajuBirthYears.min ||
    year > ENGINE_MANIFEST.supportedRanges.sajuBirthYears.max
  ) {
    throw new TraditionalSystemError(
      'UNSUPPORTED_SYSTEM_DATE',
      `Election dates are supported from ${ENGINE_MANIFEST.supportedRanges.sajuBirthYears.min} through ${ENGINE_MANIFEST.supportedRanges.sajuBirthYears.max}.`,
      {
        path: [...path, 'year'],
        details: {
          minimumYear: ENGINE_MANIFEST.supportedRanges.sajuBirthYears.min,
          maximumYear: ENGINE_MANIFEST.supportedRanges.sajuBirthYears.max,
        },
      },
    );
  }
  const ordinal = dateOrdinal({ calendar: 'gregorian', year, month, day });
  const normalized = dateFromOrdinal(ordinal);
  if (normalized.year !== year || normalized.month !== month || normalized.day !== day) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'The Gregorian election date does not exist.',
      { path },
    );
  }
}

function assertCalculableNatalRequest(
  value: unknown,
): asserts value is ElectionParticipant['natalRequest'] {
  // calculateSaju validates untrusted JavaScript input at runtime even though
  // its public TypeScript signature intentionally accepts only SajuRequest.
  calculateSaju(value as ElectionParticipant['natalRequest']);
}

function assertParticipant(
  value: unknown,
  index: number,
  timeZone: string,
): asserts value is ElectionParticipant {
  const path = ['participants', index] as const;
  if (!isRecord(value)) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'Each election participant must be an object.',
      { path },
    );
  }
  if (typeof value.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(value.id)) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'Participant IDs must be 1-64 safe identifier characters.',
      { path: [...path, 'id'] },
    );
  }
  if (!isRecord(value.natalRequest) || !isRecord(value.natalRequest.birth)) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'Each participant must provide an exact natalRequest.',
      { path: [...path, 'natalRequest'] },
    );
  }
  const birth = value.natalRequest.birth;
  if (!isRecord(birth.time) || 'kind' in birth.time) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'Participant natalRequest must contain an exact birth time.',
      { path: [...path, 'natalRequest', 'birth', 'time'] },
    );
  }
  if (birth.timeZone !== timeZone) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'Every participant natalRequest time zone must match the election timeZone in v1.',
      {
        path: [...path, 'natalRequest', 'birth', 'timeZone'],
        details: { expectedTimeZone: timeZone },
      },
    );
  }
  try {
    assertCalculableNatalRequest(value.natalRequest);
  } catch (error) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'Participant natalRequest could not be calculated as an exact chart.',
      {
        path: [...path, 'natalRequest'],
        details: { coreErrorCode: isSajuError(error) ? error.code : 'UNKNOWN' },
      },
    );
  }
}

function assertElectionRequest(value: unknown): asserts value is ElectionRequest {
  if (!isRecord(value) || value.kind !== 'election') {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'The election request must be an object with kind election.',
      { path: ['kind'] },
    );
  }
  if (!['daily', 'wedding', 'moving'].includes(String(value.eventType))) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'eventType must be daily, wedding, or moving.',
      { path: ['eventType'] },
    );
  }
  if (typeof value.timeZone !== 'string' || value.timeZone.length === 0) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'timeZone must be a non-empty IANA time-zone identifier.',
      { path: ['timeZone'] },
    );
  }
  if (value.representativeInstantPolicy !== 'local-civil-noon') {
    throw new TraditionalSystemError(
      'MISSING_EXPLICIT_POLICY',
      'representativeInstantPolicy must explicitly select local-civil-noon.',
      { path: ['representativeInstantPolicy'] },
    );
  }
  if (
    !isRecord(value.rankingPolicy) ||
    value.rankingPolicy.id !== OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.id ||
    value.rankingPolicy.version !== OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.version
  ) {
    throw new TraditionalSystemError(
      'UNSUPPORTED_SYSTEM_PROFILE',
      'rankingPolicy must select oh-my-saju-election-ranking@1.0.0.',
      { path: ['rankingPolicy'] },
    );
  }
  if (!isRecord(value.dateRange)) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'dateRange must contain start and endInclusive Gregorian dates.',
      { path: ['dateRange'] },
    );
  }
  assertGregorianDate(value.dateRange.start, ['dateRange', 'start']);
  assertGregorianDate(value.dateRange.endInclusive, ['dateRange', 'endInclusive']);
  const startOrdinal = dateOrdinal(value.dateRange.start);
  const endOrdinal = dateOrdinal(value.dateRange.endInclusive);
  const spanDays = endOrdinal - startOrdinal + 1;
  if (spanDays <= 0) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'dateRange.endInclusive must not precede dateRange.start.',
      { path: ['dateRange'] },
    );
  }
  if (spanDays > MAX_ELECTION_DATE_SPAN_DAYS) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      `Election date ranges may contain at most ${MAX_ELECTION_DATE_SPAN_DAYS} civil dates.`,
      {
        path: ['dateRange'],
        details: { spanDays, maximumSpanDays: MAX_ELECTION_DATE_SPAN_DAYS },
      },
    );
  }
  if (
    !Array.isArray(value.participants) ||
    value.participants.length === 0 ||
    value.participants.length > MAX_PARTICIPANTS
  ) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      `participants must contain from 1 through ${MAX_PARTICIPANTS} exact requests.`,
      { path: ['participants'] },
    );
  }
  const participantValues: readonly unknown[] = value.participants;
  const timeZone = value.timeZone;
  const participants = participantValues.map((participant, index): ElectionParticipant => {
    assertParticipant(participant, index, timeZone);
    return participant;
  });
  const participantIds = participants.map(({ id }) => id);
  if (new Set(participantIds).size !== participantIds.length) {
    throw new TraditionalSystemError('INVALID_SYSTEM_INPUT', 'Participant IDs must be unique.', {
      path: ['participants'],
    });
  }
  if (value.eventType === 'daily' && participants.length !== 1) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'daily election requests require exactly one participant.',
      { path: ['participants'] },
    );
  }
  if (value.eventType === 'wedding' && participants.length !== 2) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'wedding election requests require exactly two symmetric participants.',
      { path: ['participants'] },
    );
  }
  if (value.eventType === 'moving') {
    if (
      typeof value.principalParticipantId !== 'string' ||
      !participantIds.includes(value.principalParticipantId)
    ) {
      throw new TraditionalSystemError(
        'INVALID_SYSTEM_INPUT',
        'moving election requests require a principalParticipantId from participants.',
        { path: ['principalParticipantId'] },
      );
    }
  } else if (value.principalParticipantId !== undefined) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'principalParticipantId is only valid for moving requests.',
      { path: ['principalParticipantId'] },
    );
  }
  if (value.scheduleConstraints !== undefined) {
    if (
      !isRecord(value.scheduleConstraints) ||
      !Array.isArray(value.scheduleConstraints.unavailableDates)
    ) {
      throw new TraditionalSystemError(
        'INVALID_SYSTEM_INPUT',
        'scheduleConstraints.unavailableDates must be an array.',
        { path: ['scheduleConstraints', 'unavailableDates'] },
      );
    }
    const keys = value.scheduleConstraints.unavailableDates.map((date, index) => {
      assertGregorianDate(date, ['scheduleConstraints', 'unavailableDates', index]);
      const ordinal = dateOrdinal(date);
      if (ordinal < startOrdinal || ordinal > endOrdinal) {
        throw new TraditionalSystemError(
          'INVALID_SYSTEM_INPUT',
          'Unavailable dates must fall inside dateRange.',
          { path: ['scheduleConstraints', 'unavailableDates', index] },
        );
      }
      return dateKey(date);
    });
    if (new Set(keys).size !== keys.length) {
      throw new TraditionalSystemError(
        'INVALID_SYSTEM_INPUT',
        'Unavailable dates must be unique.',
        { path: ['scheduleConstraints', 'unavailableDates'] },
      );
    }
  }
}

function pillarFact(pillar: PillarReport): ElectionCalendarFacts['yearPillar'] {
  return {
    korean: pillar.korean,
    hanja: pillar.hanja,
    stem: pillar.stem.korean,
    branch: pillar.branch.korean,
  };
}

function calendarFacts(transit: SajuDailyTransitReport): ElectionCalendarFacts {
  const selectionMonthBranch = transit.pillars.month.branch.korean;
  const dayBranch = transit.pillars.day.branch.korean;
  const dayOfficer = dayOfficerForBranches(selectionMonthBranch, dayBranch);
  const yellowBlackPath = yellowBlackPathForBranches(selectionMonthBranch, dayBranch);
  const evidence = transit.audit.evidence;
  return {
    date: transit.date,
    representative: {
      policy: transit.representative.policy,
      localTime: transit.representative.localTime,
      timeZone: transit.representative.timeZone,
      civilDateTime: transit.representative.civilDateTime,
      instantUtc: transit.representative.instantUtc,
      epochMilliseconds: transit.representative.epochMilliseconds,
    },
    yearPillar: pillarFact(transit.pillars.year),
    selectionMonthPillar: pillarFact(transit.pillars.month),
    dayPillar: pillarFact(transit.pillars.day),
    jieMonthInterval: {
      startInstantUtc: evidence.monthStart.instantUtc,
      startEpochMilliseconds: evidence.monthStart.epochMilliseconds,
      endInstantUtc: evidence.monthEnd.instantUtc,
      endEpochMilliseconds: evidence.monthEnd.epochMilliseconds,
      intervalSemantics: '[start,end)',
    },
    dayOfficer: {
      ...dayOfficer,
      selectionMonthBranch,
      dayBranch,
    },
    yellowBlackPath: {
      ...yellowBlackPath,
      selectionMonthBranch,
      dayBranch,
    },
  };
}

function officerClassification(
  eventType: ElectionEventType,
  amount: number,
): ElectionClassicalMatch['classification'] {
  if (eventType === 'daily' || amount === 0) return 'descriptive';
  return amount < 0 ? 'avoided' : 'recommended';
}

function relationshipClassicalMatches(
  date: ElectionGregorianDate,
  participant: ElectionParticipant,
  transit: SajuDailyTransitReport,
  coreParticipant: boolean,
): ElectionClassicalMatch[] {
  const key = dateKey(date);
  const matches: ElectionClassicalMatch[] = [];
  const relationshipSpecs = [
    {
      ruleId: 'election.transit-natal-branch-combination' as const,
      relationships: transit.relationships.branchCombinations,
      classification: 'descriptive' as const,
    },
    {
      ruleId: 'election.transit-natal-branch-clash' as const,
      relationships: transit.relationships.branchClashes,
      classification: coreParticipant ? ('avoided' as const) : ('descriptive' as const),
    },
    {
      ruleId: 'election.transit-natal-branch-harm' as const,
      relationships: transit.relationships.branchHarms,
      classification: coreParticipant ? ('avoided' as const) : ('descriptive' as const),
    },
  ];
  for (const spec of relationshipSpecs) {
    const relationship = spec.relationships.find(({ positions }) => positions[1] === 'natal-year');
    if (relationship === undefined) continue;
    matches.push({
      id: `${key}:${spec.ruleId}:${participant.id}`,
      profileId: 'nam-byeong-gil-electional',
      profileVersion: '1.0.0',
      ruleId: spec.ruleId,
      sourceReferenceIds: [SELECTION_SOURCE_ID],
      classification: spec.classification,
      participantId: participant.id,
      details: {
        transitDayBranch: relationship.members[0],
        natalYearBranch: relationship.members[1],
        direction: relationship.direction,
        scoringParticipant: coreParticipant,
      },
    });
  }
  const punishment = transit.relationships.branchPunishments.find(
    ({ positions }) => positions[1] === 'natal-year',
  );
  if (punishment !== undefined) {
    matches.push({
      id: `${key}:election.transit-natal-branch-punishment:${participant.id}`,
      profileId: 'nam-byeong-gil-electional',
      profileVersion: '1.0.0',
      ruleId: 'election.transit-natal-branch-punishment',
      sourceReferenceIds: [SELECTION_SOURCE_ID],
      classification: coreParticipant ? 'avoided' : 'descriptive',
      participantId: participant.id,
      details: {
        transitDayBranch: punishment.members[0],
        natalYearBranch: punishment.members[1],
        direction: punishment.direction,
        punishmentKind: punishment.kind,
        scoringParticipant: coreParticipant,
      },
    });
  }
  return matches;
}

function relationshipContributions(
  matches: readonly ElectionClassicalMatch[],
  participantId: string,
  coreParticipant: boolean,
): ElectionRankingContribution[] {
  if (!coreParticipant) return [];
  const weights = OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.weights.participantYearBranch;
  const specs = [
    {
      ruleId: 'election.transit-natal-branch-combination',
      policyRuleId: 'participant-year-branch-combination',
      amount: weights.combination,
      reason: '후보 일지와 핵심 참가자 연지의 합 원시 관계; 검증된 v1 숫자 없음',
    },
    {
      ruleId: 'election.transit-natal-branch-clash',
      policyRuleId: 'participant-year-branch-clash',
      amount: weights.clash,
      reason: '후보 일지와 핵심 참가자 연지의 충',
    },
    {
      ruleId: 'election.transit-natal-branch-harm',
      policyRuleId: 'participant-year-branch-harm',
      amount: weights.harm,
      reason: '후보 일지와 핵심 참가자 연지의 해',
    },
    {
      ruleId: 'election.transit-natal-branch-punishment',
      policyRuleId: 'participant-year-branch-punishment',
      amount: weights.punishment,
      reason: '후보 일지와 핵심 참가자 연지의 형',
    },
  ] as const;
  return specs.flatMap((spec) => {
    const match = matches.find(
      ({ ruleId, participantId: matchParticipantId }) =>
        ruleId === spec.ruleId && matchParticipantId === participantId,
    );
    return match === undefined
      ? []
      : [
          {
            id: `${match.id}:ranking`,
            policyRuleId: spec.policyRuleId,
            amount: spec.amount,
            reason: spec.reason,
            classicalMatchIds: [match.id],
            participantId,
          },
        ];
  });
}

function candidateForDate(
  request: ElectionRequest,
  date: ElectionGregorianDate,
  unavailableDateKeys: ReadonlySet<string>,
): Omit<ElectionCandidate, 'rank'> {
  const participantTransits = request.participants.map((participant) => {
    try {
      return calculateSajuDailyTransit({
        natalRequest: participant.natalRequest,
        date,
      });
    } catch (error) {
      throw new TraditionalSystemError(
        isSajuError(error) && error.code === 'UNSUPPORTED_DATE_RANGE'
          ? 'UNSUPPORTED_SYSTEM_DATE'
          : 'INVALID_SYSTEM_INPUT',
        'A candidate date could not be calculated from public Saju daily-transit facts.',
        {
          path: ['dateRange'],
          details: {
            date: dateKey(date),
            coreErrorCode: isSajuError(error) ? error.code : 'UNKNOWN',
          },
        },
      );
    }
  });
  const primaryTransit = participantTransits[0];
  if (primaryTransit === undefined) {
    throw new TraditionalSystemError(
      'SYSTEM_INVARIANT_VIOLATION',
      'Validated election request had no participant transit.',
    );
  }
  const facts = calendarFacts(primaryTransit);
  const key = dateKey(date);
  const officerAmount = officerWeight(request.eventType, facts.dayOfficer.id);
  const dayOfficerMatch: ElectionClassicalMatch = {
    id: `${key}:election.day-officer`,
    profileId: 'nam-byeong-gil-electional',
    profileVersion: '1.0.0',
    ruleId: 'election.day-officer',
    sourceReferenceIds: [SELECTION_SOURCE_ID],
    classification: officerClassification(request.eventType, officerAmount),
    details: {
      officerId: facts.dayOfficer.id,
      officerHanja: facts.dayOfficer.hanja,
      selectionMonthBranch: facts.dayOfficer.selectionMonthBranch,
      dayBranch: facts.dayOfficer.dayBranch,
    },
  };
  const yellowBlackMatch: ElectionClassicalMatch = {
    id: `${key}:election.yellow-black-path`,
    profileId: 'nam-byeong-gil-electional',
    profileVersion: '1.0.0',
    ruleId: 'election.yellow-black-path',
    sourceReferenceIds: [SELECTION_SOURCE_ID],
    classification:
      facts.yellowBlackPath.classification === 'yellow-path' ? 'recommended' : 'avoided',
    details: {
      deityId: facts.yellowBlackPath.deityId,
      deityHanja: facts.yellowBlackPath.hanja,
      pathClassification: facts.yellowBlackPath.classification,
      azureDragonStartBranch: facts.yellowBlackPath.azureDragonStartBranch,
    },
  };
  const monthBreak =
    facts.dayOfficer.id === 'break'
      ? ({
          id: `${key}:election.month-break`,
          profileId: 'nam-byeong-gil-electional',
          profileVersion: '1.0.0',
          ruleId: 'election.month-break',
          sourceReferenceIds: [MONTH_BREAK_SOURCE_ID, SELECTION_SOURCE_ID],
          classification: 'avoided',
          details: {
            selectionMonthBranch: facts.selectionMonthPillar.branch,
            dayBranch: facts.dayPillar.branch,
            relation: 'opposition',
          },
        } as const satisfies ElectionClassicalMatch)
      : null;
  const coreParticipantIds = new Set(
    request.eventType === 'moving'
      ? [request.principalParticipantId!]
      : request.participants.map(({ id }) => id),
  );
  const relationshipMatches = request.participants.flatMap((participant, index) =>
    relationshipClassicalMatches(
      date,
      participant,
      participantTransits[index]!,
      coreParticipantIds.has(participant.id),
    ),
  );
  const classicalMatches: ElectionClassicalMatch[] = [
    dayOfficerMatch,
    yellowBlackMatch,
    ...(monthBreak === null ? [] : [monthBreak]),
    ...relationshipMatches,
  ];
  const contributions: ElectionRankingContribution[] = [
    {
      id: `${key}:ranking:officer`,
      policyRuleId: 'officer',
      amount: officerAmount,
      reason: `${request.eventType} v1의 ${facts.dayOfficer.hanja} 건제 가중치`,
      classicalMatchIds: [dayOfficerMatch.id],
    },
    {
      id: `${key}:ranking:yellow-path`,
      policyRuleId: 'yellow-path',
      amount:
        facts.yellowBlackPath.classification === 'yellow-path'
          ? OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.weights.yellowPath
          : 0,
      reason:
        facts.yellowBlackPath.classification === 'yellow-path'
          ? '황도일 제품 가중치'
          : '흑도 분류에는 v1 황도 가산을 적용하지 않음',
      classicalMatchIds: [yellowBlackMatch.id],
    },
    ...(monthBreak === null
      ? []
      : [
          {
            id: `${key}:ranking:month-break`,
            policyRuleId: 'month-break' as const,
            amount: OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.weights.monthBreak,
            reason: '절월 월지와 후보 일지의 월파',
            classicalMatchIds: [monthBreak.id],
          },
        ]),
    ...request.participants.flatMap((participant) =>
      relationshipContributions(
        relationshipMatches,
        participant.id,
        coreParticipantIds.has(participant.id),
      ),
    ),
  ];
  const contributionTotal = contributions.reduce(
    (total, contribution) => total + contribution.amount,
    0,
  );
  const unclampedScore = OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.base + contributionTotal;
  const score = Math.max(
    OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.clamp.minimum,
    Math.min(OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.clamp.maximum, unclampedScore),
  );
  const negativeClassicalMatchCount = classicalMatches.filter(
    ({ classification }) => classification === 'avoided',
  ).length;
  const scheduleConstraintSatisfied = !unavailableDateKeys.has(key);

  return {
    calendarFacts: facts,
    classicalMatches,
    ranking: {
      policyId: OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.id,
      policyVersion: OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.version,
      base: OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.base,
      contributions,
      unclampedScore,
      score,
      clamp: {
        minimum: OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.clamp.minimum,
        maximum: OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.clamp.maximum,
        applied: unclampedScore !== score,
      },
      meaning: SCORE_MEANING,
      tieBreak: {
        scheduleConstraintSatisfied,
        negativeClassicalMatchCount,
        score,
        dateAscending: key,
      },
    },
  };
}

function compareCandidates(
  left: Omit<ElectionCandidate, 'rank'>,
  right: Omit<ElectionCandidate, 'rank'>,
): number {
  const leftTie = left.ranking.tieBreak;
  const rightTie = right.ranking.tieBreak;
  if (leftTie.scheduleConstraintSatisfied !== rightTie.scheduleConstraintSatisfied) {
    return leftTie.scheduleConstraintSatisfied ? -1 : 1;
  }
  if (leftTie.negativeClassicalMatchCount !== rightTie.negativeClassicalMatchCount) {
    return leftTie.negativeClassicalMatchCount - rightTie.negativeClassicalMatchCount;
  }
  if (leftTie.score !== rightTie.score) return rightTie.score - leftTie.score;
  return leftTie.dateAscending.localeCompare(rightTie.dateAscending);
}

export function rankElectionDates(request: ElectionRequest): ElectionResult {
  assertElectionRequest(request);
  const startOrdinal = dateOrdinal(request.dateRange.start);
  const endOrdinal = dateOrdinal(request.dateRange.endInclusive);
  const dates = Array.from({ length: endOrdinal - startOrdinal + 1 }, (_, index) =>
    dateFromOrdinal(startOrdinal + index),
  );
  const unavailableDateKeys = new Set(
    request.scheduleConstraints?.unavailableDates.map(dateKey) ?? [],
  );
  const rankedCandidates = dates
    .map((date) => candidateForDate(request, date, unavailableDateKeys))
    .sort(compareCandidates)
    .map((candidate, index) => ({ rank: index + 1, ...candidate }));
  if (rankedCandidates.length === 0) {
    throw new TraditionalSystemError(
      'NO_ELIGIBLE_DATES',
      'The validated date range produced no election candidates.',
    );
  }
  const coreParticipantIds = new Set(
    request.eventType === 'moving'
      ? [request.principalParticipantId!]
      : request.participants.map(({ id }) => id),
  );

  return deepFreeze({
    schemaVersion: '1',
    kind: 'election',
    value: {
      eventType: request.eventType,
      dateRange: {
        start: request.dateRange.start,
        endInclusive: request.dateRange.endInclusive,
        timeZone: request.timeZone,
        spanDays: dates.length,
        maximumSpanDays: MAX_ELECTION_DATE_SPAN_DAYS,
      },
      participants: request.participants.map(({ id }) => ({
        id,
        scoringRole: coreParticipantIds.has(id) ? 'core' : 'context-only',
      })),
      candidates: rankedCandidates,
    },
    audit: {
      module: ELECTION_MODULE_V1,
      profile: NAM_BYEONG_GIL_ELECTIONAL_PROFILE_V1,
      calculationCore: ENGINE_MANIFEST.engine,
      implementation: 'oh-my-saju-independent',
      policies: [
        {
          id: 'election-representative-instant',
          version: '1.0.0',
          value: request.representativeInstantPolicy,
        },
        {
          id: request.rankingPolicy.id,
          version: request.rankingPolicy.version,
          value: 'base-50-additive-clamp-0-100',
        },
        {
          id: 'election-participant-time-zone',
          version: '1.0.0',
          value: request.timeZone,
        },
      ],
      implicitAdjustments: [],
      predictiveValidity: 'not-established',
      interpretationScope: 'calculation-and-classical-classification-only',
      limitations: ELECTION_LIMITATIONS_V1,
      trace: {
        candidateCount: rankedCandidates.length,
        participantCount: request.participants.length,
        representativeInstantPolicy: request.representativeInstantPolicy,
        calendarFactMethod: 'saju-engine-daily-transit-public-facts-v1',
        relationshipScope: 'transit-day-to-natal-year-branch',
        scoreFormula: 'clamp-0-100-of-base-50-plus-contributions',
        sortOrder: [
          'schedule-constraint-satisfied-desc',
          'negative-classical-match-count-asc',
          'score-desc',
          'date-asc',
        ],
        scoreIsProbability: false,
        unverifiedSixVirtueTablesUsed: false,
      },
    },
  });
}
