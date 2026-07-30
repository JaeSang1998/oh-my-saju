import type { EarthlyBranch, HeavenlyStem, SajuRequest } from 'saju-engine';
import type { TraditionalSystemReport } from '../shared';

export type ElectionEventType = 'daily' | 'wedding' | 'moving';

export interface ElectionGregorianDate {
  readonly calendar: 'gregorian';
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface ElectionParticipant {
  readonly id: string;
  /** Exact-time calculation request; possibility requests are not accepted. */
  readonly natalRequest: SajuRequest;
}

export interface ElectionRequest {
  readonly kind: 'election';
  readonly eventType: ElectionEventType;
  readonly dateRange: {
    readonly start: ElectionGregorianDate;
    readonly endInclusive: ElectionGregorianDate;
  };
  /**
   * Candidate civil dates and the declared representative instant use this
   * IANA zone. V1 requires it to match every exact participant request.
   */
  readonly timeZone: string;
  readonly representativeInstantPolicy: 'local-civil-noon';
  readonly rankingPolicy: {
    readonly id: 'oh-my-saju-election-ranking';
    readonly version: '1.0.0';
  };
  readonly participants: readonly ElectionParticipant[];
  /** Required for moving; only this resident affects the V1 product score. */
  readonly principalParticipantId?: string;
  readonly scheduleConstraints?: {
    /** Dates remain visible but sort after dates that satisfy the constraint. */
    readonly unavailableDates: readonly ElectionGregorianDate[];
  };
}

export type ElectionDayOfficerId =
  | 'establish'
  | 'remove'
  | 'full'
  | 'balance'
  | 'settle'
  | 'hold'
  | 'break'
  | 'danger'
  | 'complete'
  | 'receive'
  | 'open'
  | 'close';

export type ElectionYellowBlackDeityId =
  | 'azure-dragon'
  | 'bright-hall'
  | 'heavenly-punishment'
  | 'vermilion-bird'
  | 'golden-cabinet'
  | 'heavenly-virtue'
  | 'white-tiger'
  | 'jade-hall'
  | 'heavenly-prison'
  | 'dark-warrior'
  | 'life-command'
  | 'hook-array';

export interface ElectionPillarFact {
  readonly korean: string;
  readonly hanja: string;
  readonly stem: HeavenlyStem;
  readonly branch: EarthlyBranch;
}

export interface ElectionCalendarFacts {
  readonly date: ElectionGregorianDate;
  readonly representative: {
    readonly policy: 'local-civil-noon';
    readonly localTime: '12:00:00.000';
    readonly timeZone: string;
    readonly civilDateTime: string;
    readonly instantUtc: string;
    readonly epochMilliseconds: number;
  };
  readonly yearPillar: ElectionPillarFact;
  readonly selectionMonthPillar: ElectionPillarFact;
  readonly dayPillar: ElectionPillarFact;
  readonly jieMonthInterval: {
    readonly startInstantUtc: string;
    readonly startEpochMilliseconds: number;
    readonly endInstantUtc: string;
    readonly endEpochMilliseconds: number;
    readonly intervalSemantics: '[start,end)';
  };
  readonly dayOfficer: {
    readonly id: ElectionDayOfficerId;
    readonly index: number;
    readonly hanja: string;
    readonly selectionMonthBranch: EarthlyBranch;
    readonly dayBranch: EarthlyBranch;
  };
  readonly yellowBlackPath: {
    readonly deityId: ElectionYellowBlackDeityId;
    readonly deityIndex: number;
    readonly hanja: string;
    readonly classification: 'yellow-path' | 'black-path';
    readonly azureDragonStartBranch: EarthlyBranch;
    readonly selectionMonthBranch: EarthlyBranch;
    readonly dayBranch: EarthlyBranch;
  };
}

export type ElectionClassicalRuleId =
  | 'election.day-officer'
  | 'election.yellow-black-path'
  | 'election.month-break'
  | 'election.transit-natal-branch-combination'
  | 'election.transit-natal-branch-clash'
  | 'election.transit-natal-branch-harm'
  | 'election.transit-natal-branch-punishment';

export interface ElectionClassicalMatch {
  readonly id: string;
  readonly profileId: 'nam-byeong-gil-electional';
  readonly profileVersion: '1.0.0';
  readonly ruleId: ElectionClassicalRuleId;
  readonly sourceReferenceIds: readonly string[];
  readonly classification: 'recommended' | 'avoided' | 'descriptive';
  readonly participantId?: string;
  readonly details: Readonly<Record<string, string | number | boolean>>;
}

export interface ElectionRankingContribution {
  readonly id: string;
  readonly policyRuleId:
    | 'officer'
    | 'yellow-path'
    | 'month-break'
    | 'participant-year-branch-combination'
    | 'participant-year-branch-clash'
    | 'participant-year-branch-harm'
    | 'participant-year-branch-punishment';
  readonly amount: number;
  readonly reason: string;
  readonly classicalMatchIds: readonly string[];
  readonly participantId?: string;
}

export interface ElectionCandidate {
  readonly rank: number;
  readonly calendarFacts: ElectionCalendarFacts;
  readonly classicalMatches: readonly ElectionClassicalMatch[];
  readonly ranking: {
    readonly policyId: 'oh-my-saju-election-ranking';
    readonly policyVersion: '1.0.0';
    readonly base: 50;
    readonly contributions: readonly ElectionRankingContribution[];
    readonly unclampedScore: number;
    readonly score: number;
    readonly clamp: {
      readonly minimum: 0;
      readonly maximum: 100;
      readonly applied: boolean;
    };
    readonly meaning: string;
    readonly tieBreak: {
      readonly scheduleConstraintSatisfied: boolean;
      readonly negativeClassicalMatchCount: number;
      readonly score: number;
      readonly dateAscending: string;
    };
  };
}

export interface ElectionResultValue {
  readonly eventType: ElectionEventType;
  readonly dateRange: {
    readonly start: ElectionGregorianDate;
    readonly endInclusive: ElectionGregorianDate;
    readonly timeZone: string;
    readonly spanDays: number;
    readonly maximumSpanDays: number;
  };
  readonly participants: readonly {
    readonly id: string;
    readonly scoringRole: 'core' | 'context-only';
  }[];
  readonly candidates: readonly ElectionCandidate[];
}

export interface ElectionTrace {
  readonly candidateCount: number;
  readonly participantCount: number;
  readonly representativeInstantPolicy: 'local-civil-noon';
  readonly calendarFactMethod: 'saju-engine-daily-transit-public-facts-v1';
  readonly relationshipScope: 'transit-day-to-natal-year-branch';
  readonly scoreFormula: 'clamp-0-100-of-base-50-plus-contributions';
  readonly sortOrder: readonly [
    'schedule-constraint-satisfied-desc',
    'negative-classical-match-count-asc',
    'score-desc',
    'date-asc',
  ];
  readonly scoreIsProbability: false;
  readonly unverifiedSixVirtueTablesUsed: false;
}

export type ElectionResult = TraditionalSystemReport<ElectionResultValue, ElectionTrace> & {
  readonly kind: 'election';
};
