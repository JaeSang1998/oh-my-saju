import type { EarthlyBranch, FiveElement, HeavenlyStem, TenGod } from 'saju-engine';
import { canonicalJsonStringify } from '../../runtime/internal/canonical-json';
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import { isRecord } from '../../runtime/internal/guards';
/** Deterministic helper for the Ziping Pack. */
import {
  EARTHLY_BRANCHES,
  HEAVENLY_STEMS,
  getHeavenlyStemElement,
  getTenGod,
} from '../../runtime/traditions/domain';
import type { InterpretationRuleId, JsonValue } from '../../runtime/traditions/types';
import {
  comparison,
  omittedPillars,
  PILLAR_POSITION_LABEL,
  visibleStemObservations,
  withAdverbialParticle,
  withObjectParticle,
  withSubjectParticle,
  withTopicParticle,
} from '../../runtime/traditions/rule-helpers';
import type {
  DoctrineRuleContext,
  DoctrineRuleMatch,
} from '../../runtime/traditions/rule-evaluator-types';
import monthCommandDayTable from './month-command-days-v1.json';
import patternIntegrityTable from './pattern-integrity-v1.json';

/**
 * 월지 지장간·상신 뿌리를 모두 이 팩의 월률분야표에서 읽으므로, 월령 계열 규칙은
 * 자평진전과 연해자평 월률분야표를 함께 근거로 든다.
 */
const ZIPING_SOURCE_IDS = [
  'ziping-zhenquan-month-command-v1',
  'yuanhai-ziping-yueling-fenye-v1',
  'oh-my-saju-ziping-reconstruction-v1',
] as const;

const ZIPING_GOVERNING_DAY_SOURCE_IDS = [
  'yuanhai-ziping-yueling-fenye-v1',
  'oh-my-saju-ziping-reconstruction-v1',
] as const;

const MILLISECONDS_PER_DAY = 86_400_000;

/** Heavenly-stem position labels used when reporting transparency. */
const STEM_POSITION_LABEL: Readonly<Record<'year' | 'month' | 'day' | 'hour', string>> = {
  year: '연간',
  month: '월간',
  day: '일간',
  hour: '시간',
};

/** 여기 → 중기 → 정기 ordering of one month branch's governing-day segments. */
export type ZipingMonthCommandRank = '여기' | '중기' | '정기';

export interface ZipingMonthCommandSegment {
  readonly stem: HeavenlyStem;
  readonly rank: ZipingMonthCommandRank;
  readonly days: number;
}

function requireMonthCommandSegment(
  value: unknown,
  monthBranch: EarthlyBranch,
): ZipingMonthCommandSegment {
  if (
    !isRecord(value) ||
    !HEAVENLY_STEMS.includes(value.stem as HeavenlyStem) ||
    (value.rank !== '여기' && value.rank !== '중기' && value.rank !== '정기') ||
    typeof value.days !== 'number' ||
    !Number.isFinite(value.days) ||
    value.days <= 0
  ) {
    throw new TypeError(`Invalid Ziping governing-day segment for month branch ${monthBranch}.`);
  }
  return { stem: value.stem as HeavenlyStem, rank: value.rank, days: value.days };
}

function requireMonthCommandSegments(
  value: unknown,
  monthBranch: EarthlyBranch,
): readonly ZipingMonthCommandSegment[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`Invalid Ziping governing-day table for month branch ${monthBranch}.`);
  }
  const segments = (value as readonly unknown[]).map((entry) =>
    requireMonthCommandSegment(entry, monthBranch),
  );
  if (segments[segments.length - 1]!.rank !== '정기') {
    throw new TypeError(`Ziping governing-day table for ${monthBranch} must end with 정기.`);
  }
  return segments;
}

/** Lineage tag of the governing-day table this Pack ships. */
export const ZIPING_MONTH_COMMAND_DAY_TABLE_ID_V1 = 'yueling-fenye-yuanhai-v1';

function parseMonthCommandDayTable(
  value: unknown,
): Readonly<Record<EarthlyBranch, readonly ZipingMonthCommandSegment[]>> {
  if (
    !isRecord(value) ||
    value.schemaVersion !== '1' ||
    value.profileId !== ZIPING_MONTH_COMMAND_DAY_TABLE_ID_V1 ||
    !isRecord(value.monthCommand)
  ) {
    throw new TypeError('Invalid Ziping governing-day table.');
  }
  const declared = value.monthCommand;
  return Object.fromEntries(
    EARTHLY_BRANCHES.map((branch) => [
      branch,
      requireMonthCommandSegments(declared[branch], branch),
    ]),
  ) as Readonly<Record<EarthlyBranch, readonly ZipingMonthCommandSegment[]>>;
}

/**
 * Pack-local 월률분야 governing-day table.  Governing-day counts differ between
 * lineages, so this Pack never derives them from the engine hidden-stem table.
 */
export const ZIPING_MONTH_COMMAND_DAYS_V1: Readonly<
  Record<EarthlyBranch, readonly ZipingMonthCommandSegment[]>
> = deepFreeze(parseMonthCommandDayTable(monthCommandDayTable));

/**
 * Segment holding `elapsedDays`.  Real solar-term spans run longer than the
 * table total, so anything past the last boundary stays with 정기.
 */
function governingSegment(
  segments: readonly ZipingMonthCommandSegment[],
  elapsedDays: number,
): ZipingMonthCommandSegment {
  let boundary = 0;
  for (const segment of segments) {
    boundary += segment.days;
    if (elapsedDays < boundary) return segment;
  }
  return segments[segments.length - 1]!;
}

function segmentSummary(segments: readonly ZipingMonthCommandSegment[]): string {
  return segments.map(({ stem, days }) => `${stem} ${days}일`).join(' · ');
}

function segmentValues(segments: readonly ZipingMonthCommandSegment[]): JsonValue {
  return segments.map(({ stem, rank, days }) => ({ stem, rank, days }));
}

/* ------------------- pattern integrity (격 확정·성패) table ------------------ */

/** Lineage tag of the 격 확정·상신·파격 table this Pack ships. */
export const ZIPING_PATTERN_INTEGRITY_TABLE_ID_V1 = 'ziping-pattern-integrity-v1';

export type ZipingReliefGroup =
  '재성' | '관성' | '관살' | '인성' | '식상' | '식신' | '양인' | '비겁';

const ZIPING_RELIEF_GROUPS: readonly ZipingReliefGroup[] = [
  '재성',
  '관성',
  '관살',
  '인성',
  '식상',
  '식신',
  '양인',
  '비겁',
];

export type ZipingPatternName =
  | '정관격'
  | '정재격'
  | '편재격'
  | '정인격'
  | '식신격'
  | '칠살격'
  | '상관격'
  | '편인격'
  | '양인격'
  | '건록격'
  | '월겁격';

const ZIPING_PATTERN_NAMES: readonly ZipingPatternName[] = [
  '정관격',
  '정재격',
  '편재격',
  '정인격',
  '식신격',
  '칠살격',
  '상관격',
  '편인격',
  '양인격',
  '건록격',
  '월겁격',
];

const TEN_GOD_NAMES: readonly TenGod[] = [
  '비견',
  '겁재',
  '식신',
  '상관',
  '편재',
  '정재',
  '편관',
  '정관',
  '편인',
  '정인',
];

type ZipingBreakingKind =
  'stem-transparent' | 'mixed-officer' | 'month-branch-clash' | 'relief-absent';

type ZipingRescueStatus = 'modeled' | 'not-modeled' | 'absence-is-the-factor';

interface ZipingBreakingFactor {
  readonly id: string;
  readonly label: string;
  readonly kind: ZipingBreakingKind;
  readonly tenGods: readonly TenGod[];
  readonly rescueGroups: readonly ZipingReliefGroup[];
  readonly rescueStatus: ZipingRescueStatus;
}

interface ZipingPatternEntry {
  readonly track: 'inner-eight' | 'special';
  readonly direction: '순용' | '역용' | null;
  readonly reliefGods: readonly ZipingReliefGroup[];
  readonly breakingFactors: readonly ZipingBreakingFactor[];
}

interface ZipingPatternIntegrityTable {
  readonly profileId: string;
  readonly patternPriority: string;
  readonly patternPriorityAlternatives: readonly string[];
  readonly reliefTableStatus: string;
  readonly luBranch: Readonly<Record<HeavenlyStem, EarthlyBranch>>;
  readonly yangBladeBranch: Readonly<Partial<Record<HeavenlyStem, EarthlyBranch>>>;
  readonly tenGodGroups: Readonly<Record<ZipingReliefGroup, readonly TenGod[]>>;
  readonly patterns: Readonly<Record<ZipingPatternName, ZipingPatternEntry>>;
}

function requireStem(value: unknown, label: string): HeavenlyStem {
  if (!HEAVENLY_STEMS.includes(value as HeavenlyStem)) {
    throw new TypeError(`Invalid Ziping pattern-integrity stem at ${label}.`);
  }
  return value as HeavenlyStem;
}

function requireBranch(value: unknown, label: string): EarthlyBranch {
  if (!EARTHLY_BRANCHES.includes(value as EarthlyBranch)) {
    throw new TypeError(`Invalid Ziping pattern-integrity branch at ${label}.`);
  }
  return value as EarthlyBranch;
}

function requireTenGodList(value: unknown, label: string): readonly TenGod[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`Invalid Ziping pattern-integrity ten-god list at ${label}.`);
  }
  return (value as readonly unknown[]).map((entry) => {
    if (!TEN_GOD_NAMES.includes(entry as TenGod)) {
      throw new TypeError(`Invalid Ziping pattern-integrity ten god at ${label}.`);
    }
    return entry as TenGod;
  });
}

function requireReliefGroupList(value: unknown, label: string): readonly ZipingReliefGroup[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`Invalid Ziping relief-god list at ${label}.`);
  }
  return (value as readonly unknown[]).map((entry) => {
    if (!ZIPING_RELIEF_GROUPS.includes(entry as ZipingReliefGroup)) {
      throw new TypeError(`Invalid Ziping relief-god group at ${label}.`);
    }
    return entry as ZipingReliefGroup;
  });
}

function requireBreakingFactor(value: unknown, label: string): ZipingBreakingFactor {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.label !== 'string' ||
    (value.kind !== 'stem-transparent' &&
      value.kind !== 'mixed-officer' &&
      value.kind !== 'month-branch-clash' &&
      value.kind !== 'relief-absent') ||
    (value.rescueStatus !== 'modeled' &&
      value.rescueStatus !== 'not-modeled' &&
      value.rescueStatus !== 'absence-is-the-factor')
  ) {
    throw new TypeError(`Invalid Ziping breaking factor at ${label}.`);
  }
  return {
    id: value.id,
    label: value.label,
    kind: value.kind,
    tenGods: requireTenGodList(value.tenGods, `${label}.tenGods`),
    rescueGroups: requireReliefGroupList(value.rescueGroups, `${label}.rescueGroups`),
    rescueStatus: value.rescueStatus,
  };
}

function requirePatternEntry(value: unknown, label: string): ZipingPatternEntry {
  if (
    !isRecord(value) ||
    (value.track !== 'inner-eight' && value.track !== 'special') ||
    (value.direction !== '순용' && value.direction !== '역용' && value.direction !== null) ||
    !Array.isArray(value.breakingFactors)
  ) {
    throw new TypeError(`Invalid Ziping pattern entry at ${label}.`);
  }
  return {
    track: value.track,
    direction: value.direction,
    reliefGods: requireReliefGroupList(value.reliefGods, `${label}.reliefGods`),
    breakingFactors: (value.breakingFactors as readonly unknown[]).map((entry, index) =>
      requireBreakingFactor(entry, `${label}.breakingFactors[${index}]`),
    ),
  };
}

function parsePatternIntegrityTable(value: unknown): ZipingPatternIntegrityTable {
  if (
    !isRecord(value) ||
    value.schemaVersion !== '1' ||
    value.profileId !== ZIPING_PATTERN_INTEGRITY_TABLE_ID_V1 ||
    typeof value.patternPriority !== 'string' ||
    !Array.isArray(value.patternPriorityAlternatives) ||
    typeof value.reliefTableStatus !== 'string' ||
    !isRecord(value.luBranch) ||
    !isRecord(value.yangBladeBranch) ||
    !isRecord(value.tenGodGroups) ||
    !isRecord(value.patterns)
  ) {
    throw new TypeError('Invalid Ziping pattern-integrity table.');
  }
  const declaredLu = value.luBranch;
  const declaredBlade = value.yangBladeBranch;
  const declaredGroups = value.tenGodGroups;
  const declaredPatterns = value.patterns;
  return {
    profileId: value.profileId,
    patternPriority: value.patternPriority,
    patternPriorityAlternatives: (value.patternPriorityAlternatives as readonly unknown[]).map(
      (entry, index) => {
        if (typeof entry !== 'string') {
          throw new TypeError(`Invalid Ziping patternPriorityAlternatives[${index}].`);
        }
        return entry;
      },
    ),
    reliefTableStatus: value.reliefTableStatus,
    luBranch: Object.fromEntries(
      HEAVENLY_STEMS.map((stem) => [stem, requireBranch(declaredLu[stem], `luBranch.${stem}`)]),
    ) as Readonly<Record<HeavenlyStem, EarthlyBranch>>,
    yangBladeBranch: Object.fromEntries(
      Object.entries(declaredBlade).map(([stem, branch]) => [
        requireStem(stem, `yangBladeBranch.${stem}`),
        requireBranch(branch, `yangBladeBranch.${stem}`),
      ]),
    ) as Readonly<Partial<Record<HeavenlyStem, EarthlyBranch>>>,
    tenGodGroups: Object.fromEntries(
      ZIPING_RELIEF_GROUPS.map((group) => [
        group,
        requireTenGodList(declaredGroups[group], `tenGodGroups.${group}`),
      ]),
    ) as Readonly<Record<ZipingReliefGroup, readonly TenGod[]>>,
    patterns: Object.fromEntries(
      ZIPING_PATTERN_NAMES.map((pattern) => [
        pattern,
        requirePatternEntry(declaredPatterns[pattern], `patterns.${pattern}`),
      ]),
    ) as Readonly<Record<ZipingPatternName, ZipingPatternEntry>>,
  };
}

/**
 * Pack-local 격 확정·상신·파격 table.  Relief-god and breaking-factor lists
 * differ sharply between lineages, so this Pack keeps its own copy and never
 * reads another Pack's tables.
 */
export const ZIPING_PATTERN_INTEGRITY_V1: ZipingPatternIntegrityTable = deepFreeze(
  parsePatternIntegrityTable(patternIntegrityTable),
);

const LU_BRANCH: Readonly<Record<HeavenlyStem, EarthlyBranch>> =
  ZIPING_PATTERN_INTEGRITY_V1.luBranch;

const YANG_BLADE_BRANCH: Readonly<Partial<Record<HeavenlyStem, EarthlyBranch>>> =
  ZIPING_PATTERN_INTEGRITY_V1.yangBladeBranch;

const PATTERN_FOR_TEN_GOD: Readonly<Record<TenGod, ZipingPatternName>> = {
  비견: '월겁격',
  겁재: '월겁격',
  식신: '식신격',
  상관: '상관격',
  편재: '편재격',
  정재: '정재격',
  편관: '칠살격',
  정관: '정관격',
  편인: '편인격',
  정인: '정인격',
};

function zipingPattern(dayStem: HeavenlyStem, sourceStem: HeavenlyStem): ZipingPatternName {
  return PATTERN_FOR_TEN_GOD[getTenGod(dayStem, sourceStem)];
}

/** 월지 정기(본기) 글자를 이 팩의 월률분야표에서 읽는다. */
function zipingMonthMainStem(monthBranch: EarthlyBranch): HeavenlyStem {
  const segments = ZIPING_MONTH_COMMAND_DAYS_V1[monthBranch];
  return segments[segments.length - 1]!.stem;
}

export type ZipingSpecialMonthPattern = '건록격' | '양인격' | '월겁격';

/**
 * 월지가 일간의 록·양인이거나 본기가 비겁이면 내격 여덟 격에서 빼고 이 세 격으로
 * 본다.  이 세 격은 오직 월지 자체로만 서며, 지장간 투간으로는 세우지 않는다.
 */
function zipingSpecialMonthPattern(
  dayStem: HeavenlyStem,
  monthBranch: EarthlyBranch,
): ZipingSpecialMonthPattern | null {
  if (LU_BRANCH[dayStem] === monthBranch) return '건록격';
  if (YANG_BLADE_BRANCH[dayStem] === monthBranch) return '양인격';
  const mainTenGod = getTenGod(dayStem, zipingMonthMainStem(monthBranch));
  return mainTenGod === '비견' || mainTenGod === '겁재' ? '월겁격' : null;
}

function zipingSpecialMonthPatternBasis(
  pattern: ZipingSpecialMonthPattern,
): 'lu-month-branch' | 'yang-blade-month-branch' | 'peer-month-branch' {
  if (pattern === '건록격') return 'lu-month-branch';
  if (pattern === '양인격') return 'yang-blade-month-branch';
  return 'peer-month-branch';
}

export function evaluateZipingPackRule(
  ruleId: Extract<
    InterpretationRuleId,
    | 'ziping.month-command'
    | 'ziping.pattern-candidate'
    | 'ziping.governing-day'
    | 'ziping.pattern-integrity'
    | 'ziping.pattern-relief-god'
  >,
  context: DoctrineRuleContext,
): DoctrineRuleMatch {
  if (ruleId === 'ziping.pattern-integrity') return evaluateZipingPatternIntegrity(context);
  if (ruleId === 'ziping.pattern-relief-god') return evaluateZipingPatternReliefGod(context);
  const dayStem = context.pillars.day.stem.korean;
  const monthBranch = context.pillars.month.branch.korean;
  // 월지 지장간은 이 팩의 월률분야표(여기 → 중기 → 정기)에서만 읽는다.  엔진의
  // 약식 지장간표를 섞어 쓰면 같은 응답 안에서 ziping.governing-day·
  // ziping.pattern-integrity 와 글자 구성이 어긋난다.
  const monthSegments = ZIPING_MONTH_COMMAND_DAYS_V1[monthBranch];
  const monthHiddenStems = monthSegments.map(({ stem }) => stem);
  const mainHiddenStem = monthSegments[monthSegments.length - 1]!.stem;
  const monthHiddenStemSummary = monthSegments
    .map(({ stem, rank }) => `${rank} ${stem}`)
    .join(' · ');
  const subjectKey = `${dayStem}:${monthBranch}`;
  const omitted = omittedPillars(context.pillars);

  if (ruleId === 'ziping.month-command') {
    const values = {
      dayMaster: dayStem,
      monthBranch,
      hiddenStems: monthHiddenStems,
      hiddenStemTable: ZIPING_MONTH_COMMAND_DAY_TABLE_ID_V1,
      hiddenStemOrder: '여기-중기-정기',
      segments: segmentValues(monthSegments),
      mainHiddenStem,
      governingStem: null,
      status: 'month-command-evidence-not-final',
    } as const;
    return {
      key: canonicalJsonStringify(values),
      statement:
        `월지 ${monthBranch}의 지장간은 월률분야 순서로 ${monthHiddenStemSummary}이며 본기는 ${mainHiddenStem}입니다. ` +
        '사령 일수와 격국 성패는 아직 정하지 않습니다.',
      topic: 'pattern',
      values,
      evidencePaths: ['pillars.day.stem', 'pillars.month.branch'],
      sourceReferenceIds: ZIPING_SOURCE_IDS,
      comparison: comparison(
        'ziping.month-command-evidence.v1',
        'month-command-evidence',
        'ziping-month-command',
        subjectKey,
        canonicalJsonStringify(values),
      ),
    };
  }

  if (ruleId === 'ziping.governing-day') {
    const segments = ZIPING_MONTH_COMMAND_DAYS_V1[monthBranch];
    const tableSummary = segmentSummary(segments);
    const tableCaveat = '사령 일수는 유파마다 달라 이 표는 연해자평 계열 통용본입니다.';
    if (context.solarTerm === null) {
      const values = {
        monthBranch,
        elapsedDays: null,
        commandingStem: null,
        commandingRank: null,
        commandingElement: null,
        transparent: false,
        transparentPositions: [],
        table: ZIPING_MONTH_COMMAND_DAY_TABLE_ID_V1,
        segments: segmentValues(segments),
        status: 'governing-day-undetermined-without-birth-instant',
      } as const;
      return {
        key: canonicalJsonStringify(values),
        statement:
          `${monthBranch}월의 월률분야는 ${withAdverbialParticle(tableSummary)} 나뉩니다. ` +
          `절입 경과일이 확정되지 않아 사령 글자는 정하지 않습니다. ${tableCaveat}`,
        topic: 'season-climate',
        values,
        evidencePaths: ['pillars.month.branch'],
        sourceReferenceIds: ZIPING_GOVERNING_DAY_SOURCE_IDS,
        comparison: comparison(
          'ziping.governing-day.v1',
          'ziping.governing-day',
          'ziping-month-command',
          monthBranch,
          'undetermined',
        ),
        coverage: 'partial' as const,
        omittedPillars: omitted,
      };
    }
    const elapsedDays =
      Math.round(
        ((context.solarTerm.birthEpochMilliseconds -
          context.solarTerm.monthStart.epochMilliseconds) /
          MILLISECONDS_PER_DAY) *
          100,
      ) / 100;
    const commanding = governingSegment(segments, elapsedDays);
    const commandingElement: FiveElement = getHeavenlyStemElement(commanding.stem);
    const transparentPositions = visibleStemObservations(context.pillars, { includeDay: true })
      .filter(({ stem }) => stem === commanding.stem)
      .map(({ position }) => position);
    const values = {
      monthBranch,
      elapsedDays,
      commandingStem: commanding.stem,
      commandingRank: commanding.rank,
      commandingElement,
      transparent: transparentPositions.length > 0,
      transparentPositions,
      table: ZIPING_MONTH_COMMAND_DAY_TABLE_ID_V1,
      segments: segmentValues(segments),
      status: 'governing-day-from-month-command-day-table',
    } as const;
    const transparencySentence =
      transparentPositions.length === 0
        ? `사령 글자 ${withTopicParticle(commanding.stem)} 천간에 드러나지 않았습니다.`
        : `사령 글자 ${withTopicParticle(commanding.stem)} ${transparentPositions
            .map((position) => STEM_POSITION_LABEL[position])
            .join('·')}에 드러나 있습니다.`;
    return {
      key: canonicalJsonStringify(values),
      statement:
        `${monthBranch}월의 월률분야에서 절입 ${elapsedDays}일째는 ${commanding.stem} 사령 구간입니다(${tableSummary}). ` +
        `${transparencySentence} ${tableCaveat}`,
      topic: 'season-climate',
      values,
      evidencePaths: ['pillars', 'chronology.epochMilliseconds', 'audit.evidence.monthStart'],
      sourceReferenceIds: ZIPING_GOVERNING_DAY_SOURCE_IDS,
      comparison: comparison(
        'ziping.governing-day.v1',
        'ziping.governing-day',
        'ziping-month-command',
        monthBranch,
        `${commanding.stem}:${commanding.rank}`,
      ),
    };
  }

  const exposed = visibleStemObservations(context.pillars, { includeDay: false });
  const patternCandidates = monthSegments.map(({ stem: sourceStem, rank: sourceRank }) => {
    const exposedStemRefs = exposed
      .filter(({ stem }) => stem === sourceStem)
      .map(({ position, stem }) => ({
        position,
        stem,
        evidencePath: `pillars.${position}.stem`,
      }));
    const unresolvedReasons =
      context.pillars.hour === null && exposedStemRefs.length === 0
        ? ['hour-transparency-unobserved']
        : [];
    const tenGod = getTenGod(dayStem, sourceStem);
    // 비견·겁재는 투간하더라도 내격을 세우지 못한다(월겁격·건록격·양인격은 월지
    // 자체로만 선다).  후보 목록에서 미리 제외해 두어야 뒤의 격 확정과 어긋나지
    // 않는다.
    const peer = tenGod === '비견' || tenGod === '겁재';
    return {
      sourceStem,
      sourceRank,
      tenGod,
      pattern: zipingPattern(dayStem, sourceStem),
      isMainHiddenStem: sourceStem === mainHiddenStem,
      exposedStemRefs,
      status: peer ? 'rejected' : exposedStemRefs.length > 0 ? 'candidate' : 'indeterminate',
      supportingConditions:
        !peer && exposedStemRefs.length > 0 ? ['month-hidden-stem-visible-in-heavenly-stems'] : [],
      defeatingConditions: [],
      rescueConditions: [],
      unresolvedReasons: peer ? [] : unresolvedReasons,
      rejectionReason: peer ? 'peer-ten-god-not-established-by-transparency' : null,
    } as const;
  });
  const specialMonthPattern = zipingSpecialMonthPattern(dayStem, monthBranch);
  const basePatternCandidate =
    specialMonthPattern === null
      ? null
      : {
          pattern: specialMonthPattern,
          basis: zipingSpecialMonthPatternBasis(specialMonthPattern),
          status: 'candidate',
          unresolvedReasons: [],
        };
  const candidatePatterns = [
    ...new Set([
      ...(specialMonthPattern === null ? [] : [specialMonthPattern]),
      ...patternCandidates
        .filter(({ rejectionReason }) => rejectionReason === null)
        .map(({ pattern }) => pattern),
    ]),
  ];
  const basePatternSummary =
    basePatternCandidate === null
      ? ''
      : `${basePatternCandidate.pattern}(월지·일간 관계의 기초 후보); `;
  const candidateSummary = patternCandidates
    .map(({ pattern, sourceStem, sourceRank, exposedStemRefs, status }) => {
      const transparency =
        exposedStemRefs.length === 0
          ? context.pillars.hour === null
            ? '삼주에서 투간을 찾지 못함·시주 미상'
            : '투간 없음'
          : `투간 ${exposedStemRefs.map(({ position }) => PILLAR_POSITION_LABEL[position]).join('·')}`;
      const statusLabel =
        status === 'rejected' ? '비겁이라 제외' : status === 'candidate' ? '후보' : '미정';
      return `${pattern}(${sourceRank} ${sourceStem}, ${transparency}, ${statusLabel})`;
    })
    .join('; ');
  const values = {
    dayMaster: dayStem,
    monthBranch,
    mainHiddenStem,
    candidateSourceStems: monthHiddenStems,
    hiddenStemTable: ZIPING_MONTH_COMMAND_DAY_TABLE_ID_V1,
    candidatePatterns,
    candidateOrderMeaning: 'yueling-fenye-table-order-not-strength-or-priority',
    basePatternCandidate,
    patternCandidates,
    rejectedCandidates: patternCandidates
      .filter(({ rejectionReason }) => rejectionReason !== null)
      .map(({ sourceStem, sourceRank, tenGod, rejectionReason }) => ({
        sourceStem,
        sourceRank,
        tenGod,
        rejectionReason,
      })),
    finalPattern: null,
    finalPatternResolvedBy: 'ziping.pattern-integrity',
    status: 'candidates-resolved-by-pattern-integrity-rule',
  } as const;
  return {
    key: canonicalJsonStringify(values),
    statement:
      `자평 월령 규칙에서 나온 격국 후보는 ${basePatternSummary}${candidateSummary}이며 이 목록에는 순위를 매기지 않았습니다. ` +
      '각 후보가 천간에 드러났는지는 기록했습니다. 이 가운데 어느 것을 격으로 세우고 성패를 어떻게 보는지는 이 팩의 ziping.pattern-integrity 규칙에서 정합니다.',
    topic: 'pattern',
    values,
    evidencePaths: ['pillars'],
    sourceReferenceIds: ZIPING_SOURCE_IDS,
    comparison: comparison(
      'ziping.month-command-pattern-candidate.v1',
      'pattern-candidates',
      'ziping-month-command',
      subjectKey,
      candidatePatterns.join('|'),
    ),
    ...(omitted.length === 0 ? {} : { coverage: 'partial' as const, omittedPillars: omitted }),
  };
}

/* ------------------------ 격 확정과 성패 (pattern integrity) ----------------- */

type ZipingStemPosition = 'year' | 'month' | 'day' | 'hour';

const ZIPING_STEM_POSITIONS: readonly ZipingStemPosition[] = ['year', 'month', 'day', 'hour'];

const ZIPING_RANK_ORDER: Readonly<Record<ZipingMonthCommandRank, number>> = {
  정기: 0,
  중기: 1,
  여기: 2,
};

interface ZipingPatternDetermination {
  readonly pattern: ZipingPatternName;
  readonly track: 'inner-eight' | 'special';
  readonly basis:
    | 'lu-month-branch'
    | 'yang-blade-month-branch'
    | 'peer-month-branch'
    | 'transparent-month-hidden-stem'
    | 'hidden-only-main-qi';
  readonly via: 'transparent' | 'hidden-only';
  readonly sourceStem: HeavenlyStem;
  readonly sourceRank: ZipingMonthCommandRank;
  readonly transparentPositions: readonly ZipingStemPosition[];
}

/** 월지 지장간을 본기 → 중기 → 여기 순으로 훑는다(`main-qi-first`). */
function mainQiFirstSegments(monthBranch: EarthlyBranch): readonly ZipingMonthCommandSegment[] {
  return [...ZIPING_MONTH_COMMAND_DAYS_V1[monthBranch]].sort(
    (left, right) => ZIPING_RANK_ORDER[left.rank] - ZIPING_RANK_ORDER[right.rank],
  );
}

function determineZipingPattern(context: DoctrineRuleContext): ZipingPatternDetermination {
  const dayStem = context.pillars.day.stem.korean;
  const monthBranch = context.pillars.month.branch.korean;
  const segments = mainQiFirstSegments(monthBranch);
  const mainSegment = segments[0]!;
  const exposed = visibleStemObservations(context.pillars, { includeDay: false });
  const positionsOf = (stem: HeavenlyStem): readonly ZipingStemPosition[] =>
    exposed.filter((observation) => observation.stem === stem).map(({ position }) => position);

  // 1) 월지가 일간의 록·양인·그 밖의 비겁이면 내격 여덟 격에서 제외한다.
  const mainTenGod = getTenGod(dayStem, mainSegment.stem);
  const specialPattern = zipingSpecialMonthPattern(dayStem, monthBranch);
  if (specialPattern !== null) {
    const transparentPositions = positionsOf(mainSegment.stem);
    return {
      pattern: specialPattern,
      track: 'special',
      basis: zipingSpecialMonthPatternBasis(specialPattern),
      via: transparentPositions.length > 0 ? 'transparent' : 'hidden-only',
      sourceStem: mainSegment.stem,
      sourceRank: mainSegment.rank,
      transparentPositions,
    };
  }

  // 2) 본기 → 중기 → 여기 순으로 투간을 확인하고 최초 일치를 격으로 삼는다.
  //    비견·겁재 투간은 내격을 세우지 않는다.  월겁격·건록격·양인격은 월지 자체가
  //    록·양인·비겁일 때(1단계)에만 서는 격이므로, 투간 순회에서는 건너뛰고
  //    다음 지장간을 본다.  전부 비겁이면 3단계 암격으로 내려간다.
  for (const segment of segments) {
    const segmentTenGod = getTenGod(dayStem, segment.stem);
    if (segmentTenGod === '비견' || segmentTenGod === '겁재') continue;
    const transparentPositions = positionsOf(segment.stem);
    if (transparentPositions.length === 0) continue;
    return {
      pattern: PATTERN_FOR_TEN_GOD[segmentTenGod],
      track: 'inner-eight',
      basis: 'transparent-month-hidden-stem',
      via: 'transparent',
      sourceStem: segment.stem,
      sourceRank: segment.rank,
      transparentPositions,
    };
  }

  // 3) 하나도 투출하지 않으면 월지 본기 십신을 격으로 세운다(암격).
  return {
    pattern: PATTERN_FOR_TEN_GOD[mainTenGod],
    track: 'inner-eight',
    basis: 'hidden-only-main-qi',
    via: 'hidden-only',
    sourceStem: mainSegment.stem,
    sourceRank: mainSegment.rank,
    transparentPositions: [],
  };
}

interface ZipingStemReference {
  readonly position: ZipingStemPosition;
  readonly stem: HeavenlyStem;
  readonly tenGod: TenGod;
  readonly evidencePath: string;
}

interface ZipingRootReference {
  readonly position: ZipingStemPosition;
  readonly branch: EarthlyBranch;
  readonly stem: HeavenlyStem;
  readonly rank: ZipingMonthCommandRank;
  readonly tenGod: TenGod;
  readonly evidencePath: string;
}

interface ZipingReliefAssessment {
  readonly group: ZipingReliefGroup;
  readonly tenGods: readonly TenGod[];
  readonly transparentStems: readonly ZipingStemReference[];
  readonly rootedBranches: readonly ZipingRootReference[];
  readonly transparent: boolean;
  readonly rooted: boolean;
}

interface ZipingBreakingAssessment {
  readonly id: string;
  readonly label: string;
  readonly kind: ZipingBreakingKind;
  readonly present: boolean;
  readonly evidence: readonly string[];
  readonly rescueGroups: readonly ZipingReliefGroup[];
  readonly rescueStatus: ZipingRescueStatus;
  readonly rescuedBy: readonly string[];
  readonly rescued: boolean;
}

export type ZipingPatternIntegrityVerdict =
  | '파격'
  | '성격'
  | '성격이지만 상신이 허약함'
  | '격은 서지만 상신이 없어 격국으로는 결론이 나지 않음';

interface ZipingPatternIntegrity {
  readonly determination: ZipingPatternDetermination;
  readonly entry: ZipingPatternEntry;
  /** 이 일간에게 실제로 적용되는 상신 후보(음간이면 양인을 뺀다). */
  readonly effectiveReliefGods: readonly ZipingReliefGroup[];
  readonly excludedReliefGods: readonly ZipingReliefGroup[];
  readonly reliefAssessments: readonly ZipingReliefAssessment[];
  readonly presentReliefGods: readonly ZipingReliefGroup[];
  readonly rootedReliefGods: readonly ZipingReliefGroup[];
  readonly hiddenOnlyReliefGods: readonly ZipingReliefGroup[];
  readonly breakingAssessments: readonly ZipingBreakingAssessment[];
  readonly presentBreakingFactors: readonly string[];
  readonly unrescuedBreakingFactors: readonly string[];
  readonly integrity: ZipingPatternIntegrityVerdict;
  readonly unresolvedReasons: readonly string[];
}

/** 네 지지의 지장간을 이 팩의 월률분야표로만 읽는다. */
function zipingRootReferences(context: DoctrineRuleContext): readonly ZipingRootReference[] {
  const dayStem = context.pillars.day.stem.korean;
  return ZIPING_STEM_POSITIONS.flatMap((position) => {
    const pillar = context.pillars[position];
    if (pillar === null) return [];
    const branch = pillar.branch.korean;
    return ZIPING_MONTH_COMMAND_DAYS_V1[branch].map(({ stem, rank }) => ({
      position,
      branch,
      stem,
      rank,
      tenGod: getTenGod(dayStem, stem),
      evidencePath: `pillars.${position}.branch`,
    }));
  });
}

function zipingVisibleReferences(context: DoctrineRuleContext): readonly ZipingStemReference[] {
  const dayStem = context.pillars.day.stem.korean;
  return visibleStemObservations(context.pillars, { includeDay: false }).map(
    ({ stem, position }) => ({
      position,
      stem,
      tenGod: getTenGod(dayStem, stem),
      evidencePath: `pillars.${position}.stem`,
    }),
  );
}

function computeZipingPatternIntegrity(context: DoctrineRuleContext): ZipingPatternIntegrity {
  const dayStem = context.pillars.day.stem.korean;
  const determination = determineZipingPattern(context);
  const entry = ZIPING_PATTERN_INTEGRITY_V1.patterns[determination.pattern];
  const visible = zipingVisibleReferences(context);
  const roots = zipingRootReferences(context);
  const monthClashed = context.structure.relationships.branchClashes.some(({ positions }) =>
    positions.includes('month'),
  );

  // 이 팩은 양인을 양간에만 세운다(음인 불채택).  음간 일간의 겁재를 양인이라
  // 부르지 않으므로 상신 후보에서 뺀다.
  const dayStemHasYangBlade = YANG_BLADE_BRANCH[dayStem] !== undefined;
  const excludedReliefGods = entry.reliefGods.filter(
    (group) => group === '양인' && !dayStemHasYangBlade,
  );
  const effectiveReliefGods = entry.reliefGods.filter(
    (group) => !excludedReliefGods.includes(group),
  );

  const reliefAssessments = effectiveReliefGods.map((group) => {
    const tenGods = ZIPING_PATTERN_INTEGRITY_V1.tenGodGroups[group];
    const transparentStems = visible.filter(({ tenGod }) => tenGods.includes(tenGod));
    const rootedBranches = roots.filter(({ tenGod }) => tenGods.includes(tenGod));
    return {
      group,
      tenGods,
      transparentStems,
      rootedBranches,
      transparent: transparentStems.length > 0,
      rooted: rootedBranches.length > 0,
    };
  });
  const presentReliefGods = reliefAssessments
    .filter(({ transparent }) => transparent)
    .map(({ group }) => group);
  const rootedReliefGods = reliefAssessments
    .filter(({ transparent, rooted }) => transparent && rooted)
    .map(({ group }) => group);
  const hiddenOnlyReliefGods = reliefAssessments
    .filter(({ transparent, rooted }) => !transparent && rooted)
    .map(({ group }) => group);

  const breakingAssessments = entry.breakingFactors.map((factor) => {
    const matchedStems = visible.filter(({ tenGod }) => factor.tenGods.includes(tenGod));
    const present =
      factor.kind === 'stem-transparent'
        ? matchedStems.length > 0
        : factor.kind === 'mixed-officer'
          ? factor.tenGods.every((tenGod) =>
              visible.some((reference) => reference.tenGod === tenGod),
            )
          : factor.kind === 'month-branch-clash'
            ? monthClashed
            : // relief-absent(칠살무제·양인무제): 제복은 천간에 드러나야 인정한다.
              // 지장간에만 있는 글자는 상신 문장에서도 상신으로 세우지 않으므로
              // 여기서도 제복으로 세지 않는다.
              presentReliefGods.length === 0;
    const evidence =
      factor.kind === 'month-branch-clash'
        ? monthClashed
          ? [`월지 ${context.pillars.month.branch.korean} 충`]
          : []
        : factor.kind === 'relief-absent'
          ? present
            ? [
                `${effectiveReliefGods.join('·')} 천간 투출 없음`,
                ...(hiddenOnlyReliefGods.length === 0
                  ? []
                  : [`${hiddenOnlyReliefGods.join('·')} 지장간에만 있음`]),
              ]
            : []
          : present
            ? matchedStems.map(
                ({ position, stem, tenGod }) =>
                  `${STEM_POSITION_LABEL[position]} ${stem} ${tenGod}`,
              )
            : [];
    const rescuedBy =
      !present || factor.rescueStatus !== 'modeled'
        ? []
        : factor.rescueGroups.filter((group) =>
            visible.some(({ tenGod }) =>
              ZIPING_PATTERN_INTEGRITY_V1.tenGodGroups[group].includes(tenGod),
            ),
          );
    return {
      id: factor.id,
      label: factor.label,
      kind: factor.kind,
      present,
      evidence,
      rescueGroups: factor.rescueGroups,
      rescueStatus: factor.rescueStatus,
      rescuedBy,
      rescued: present && rescuedBy.length > 0,
    };
  });
  const presentBreakingFactors = breakingAssessments
    .filter(({ present }) => present)
    .map(({ id }) => id);
  const unrescuedBreakingFactors = breakingAssessments
    .filter(({ present, rescued }) => present && !rescued)
    .map(({ id }) => id);

  const integrity: ZipingPatternIntegrityVerdict =
    unrescuedBreakingFactors.length > 0
      ? '파격'
      : rootedReliefGods.length > 0
        ? '성격'
        : presentReliefGods.length > 0
          ? '성격이지만 상신이 허약함'
          : '격은 서지만 상신이 없어 격국으로는 결론이 나지 않음';

  const unresolvedReasons = [
    ...new Set(
      breakingAssessments
        .filter(({ present, rescueStatus }) => present && rescueStatus === 'not-modeled')
        .map(({ id }) => `rescue-not-modeled-for-${id}`),
    ),
    ...(entry.direction === null ? ['direction-not-declared-for-peer-pattern'] : []),
    ...(omittedPillars(context.pillars).length > 0 ? ['hour-pillar-unobserved'] : []),
  ];

  return {
    determination,
    entry,
    effectiveReliefGods,
    excludedReliefGods,
    reliefAssessments,
    presentReliefGods,
    rootedReliefGods,
    hiddenOnlyReliefGods,
    breakingAssessments,
    presentBreakingFactors,
    unrescuedBreakingFactors,
    integrity,
    unresolvedReasons,
  };
}

function reliefAssessmentValues(assessment: ZipingReliefAssessment): JsonValue {
  return {
    group: assessment.group,
    tenGods: [...assessment.tenGods],
    transparent: assessment.transparent,
    rooted: assessment.rooted,
    transparentStems: assessment.transparentStems.map(
      ({ position, stem, tenGod, evidencePath }) => ({ position, stem, tenGod, evidencePath }),
    ),
    rootedBranches: assessment.rootedBranches.map(
      ({ position, branch, stem, rank, tenGod, evidencePath }) => ({
        position,
        branch,
        stem,
        rank,
        tenGod,
        evidencePath,
      }),
    ),
  };
}

function breakingAssessmentValues(assessment: ZipingBreakingAssessment): JsonValue {
  return {
    id: assessment.id,
    label: assessment.label,
    kind: assessment.kind,
    present: assessment.present,
    evidence: [...assessment.evidence],
    rescueGroups: [...assessment.rescueGroups],
    rescueStatus: assessment.rescueStatus,
    rescuedBy: [...assessment.rescuedBy],
    rescued: assessment.rescued,
  };
}

function patternIntegrityValues(
  context: DoctrineRuleContext,
  integrity: ZipingPatternIntegrity,
): Readonly<Record<string, JsonValue>> {
  const { determination, entry } = integrity;
  return {
    dayMaster: context.pillars.day.stem.korean,
    monthBranch: context.pillars.month.branch.korean,
    pattern: determination.pattern,
    track: determination.track,
    basis: determination.basis,
    via: determination.via,
    sourceStem: determination.sourceStem,
    sourceRank: determination.sourceRank,
    transparentPositions: [...determination.transparentPositions],
    direction: entry.direction,
    reliefGods: [...entry.reliefGods],
    effectiveReliefGods: [...integrity.effectiveReliefGods],
    excludedReliefGods: [...integrity.excludedReliefGods],
    reliefGodExclusionBasis:
      integrity.excludedReliefGods.length === 0 ? null : 'yang-blade-only-for-yang-day-stems',
    presentReliefGods: [...integrity.presentReliefGods],
    rootedReliefGods: [...integrity.rootedReliefGods],
    hiddenOnlyReliefGods: [...integrity.hiddenOnlyReliefGods],
    reliefAssessments: integrity.reliefAssessments.map(reliefAssessmentValues),
    breakingFactors: entry.breakingFactors.map(({ id }) => id),
    presentBreakingFactors: [...integrity.presentBreakingFactors],
    unrescuedBreakingFactors: [...integrity.unrescuedBreakingFactors],
    breakingAssessments: integrity.breakingAssessments.map(breakingAssessmentValues),
    integrity: integrity.integrity,
    patternPriority: ZIPING_PATTERN_INTEGRITY_V1.patternPriority,
    patternPriorityAlternatives: [...ZIPING_PATTERN_INTEGRITY_V1.patternPriorityAlternatives],
    reliefTableStatus: ZIPING_PATTERN_INTEGRITY_V1.reliefTableStatus,
    unresolvedReasons: [...integrity.unresolvedReasons],
    status: 'pack-local-pattern-integrity-not-cross-school-final',
  };
}

const ZIPING_RELIEF_FALLBACK_SENTENCE =
  '상신이 서지 않으면 격국만으로는 결론이 나지 않으므로, 이때는 억부로 축을 옮겨 봅니다.';

const ZIPING_PATTERN_SCOPE_SENTENCE =
  '격 확정과 성패는 이 팩의 표와 순서를 따른 판정이며 유파마다 다릅니다.';

function patternBasisSentence(
  context: DoctrineRuleContext,
  determination: ZipingPatternDetermination,
): string {
  const monthBranch = context.pillars.month.branch.korean;
  const dayStem = context.pillars.day.stem.korean;
  const positions = determination.transparentPositions
    .map((position) => STEM_POSITION_LABEL[position])
    .join('·');
  if (determination.basis === 'lu-month-branch') {
    return `월지 ${withTopicParticle(monthBranch)} 일간 ${dayStem}의 록이라 내격 여덟 격에서 빼고 ${withAdverbialParticle(determination.pattern)} 봅니다.`;
  }
  if (determination.basis === 'yang-blade-month-branch') {
    return `월지 ${withTopicParticle(monthBranch)} 일간 ${dayStem}의 양인이라 내격 여덟 격에서 빼고 ${withAdverbialParticle(determination.pattern)} 봅니다.`;
  }
  if (determination.basis === 'peer-month-branch') {
    return `월지 ${monthBranch}의 본기 ${withSubjectParticle(determination.sourceStem)} 일간 ${dayStem}의 비겁이라 내격 여덟 격에서 빼고 ${withAdverbialParticle(determination.pattern)} 봅니다.`;
  }
  if (determination.basis === 'transparent-month-hidden-stem') {
    return `월지 ${monthBranch}의 ${determination.sourceRank} ${withSubjectParticle(determination.sourceStem)} ${positions}에 투출해 ${withAdverbialParticle(determination.pattern)} 봅니다.`;
  }
  return `월지 ${monthBranch}의 지장간이 천간에 하나도 투출하지 않아 본기 ${determination.sourceStem} 기준의 암격으로 ${withObjectParticle(determination.pattern)} 세웁니다.`;
}

function directionSentence(pattern: ZipingPatternName, direction: '순용' | '역용' | null): string {
  if (direction === '순용') {
    return `${withTopicParticle(pattern)} 사길신이라 순용으로 봅니다.`;
  }
  if (direction === '역용') {
    return `${withTopicParticle(pattern)} 사흉신이라 역용으로 봅니다.`;
  }
  return `${withTopicParticle(pattern)} 사길신에도 사흉신에도 들지 않아 순용·역용을 정하지 않습니다.`;
}

function reliefSentence(integrity: ZipingPatternIntegrity): string {
  const declared = integrity.effectiveReliefGods.join('·');
  const exclusion =
    integrity.excludedReliefGods.length === 0
      ? ''
      : ` 이 관법은 양인을 양간에만 세우므로 음간인 이 일간에게는 ${withObjectParticle(integrity.excludedReliefGods.join('·'))} 상신 후보에서 뺍니다.`;
  if (integrity.rootedReliefGods.length > 0) {
    const rooted = integrity.reliefAssessments.filter(({ group }) =>
      integrity.rootedReliefGods.includes(group),
    );
    const evidence = rooted
      .map((assessment) => {
        const stems = assessment.transparentStems
          .map(({ position, stem }) => `${STEM_POSITION_LABEL[position]} ${stem}`)
          .join('·');
        const branches = [...new Set(assessment.rootedBranches.map(({ branch }) => branch))].join(
          '·',
        );
        return `${assessment.group}(${stems} 투출, 지지 ${branches}에 뿌리)`;
      })
      .join('; ');
    return `이 격의 상신 후보는 ${declared}이고, 그 가운데 ${withSubjectParticle(evidence)} 실제로 서 있습니다.${exclusion}`;
  }
  if (integrity.presentReliefGods.length > 0) {
    const shallow = integrity.reliefAssessments.filter(({ group }) =>
      integrity.presentReliefGods.includes(group),
    );
    const evidence = shallow
      .map((assessment) => {
        const stems = assessment.transparentStems
          .map(({ position, stem }) => `${STEM_POSITION_LABEL[position]} ${stem}`)
          .join('·');
        return `${assessment.group}(${stems} 투출, 지지 뿌리 없음)`;
      })
      .join('; ');
    return `이 격의 상신 후보는 ${declared}이고, ${withAdverbialParticle(evidence)} 드러났습니다.${exclusion}`;
  }
  const hidden =
    integrity.hiddenOnlyReliefGods.length === 0
      ? ''
      : ` ${withTopicParticle(integrity.hiddenOnlyReliefGods.join('·'))} 지장간에만 있어 상신으로 세우지 않습니다.`;
  return `이 격의 상신 후보는 ${declared}이지만 천간에 하나도 드러나지 않았습니다.${hidden}${exclusion}`;
}

/**
 * 파격 요인 한 건을 문장의 주어로 만든다.  label 과 evidence 를 그대로 이어
 * 붙이면 '없음' 이 겹치거나 괄호가 이중으로 나오므로 종류별로 따로 쓴다.
 */
function breakingFactorSubject(
  assessment: ZipingBreakingAssessment,
  monthBranch: EarthlyBranch,
): string {
  if (assessment.kind === 'month-branch-clash') return `월지 ${monthBranch} 충`;
  if (assessment.evidence.length === 0) return assessment.label;
  return `${assessment.label}(${assessment.evidence.join('·')})`;
}

function breakingSentence(integrity: ZipingPatternIntegrity, monthBranch: EarthlyBranch): string {
  const present = integrity.breakingAssessments.filter(({ present: found }) => found);
  if (present.length === 0) {
    return '이 격의 파격 요인 표에서는 걸리는 자리가 없습니다.';
  }
  return present
    .map((assessment) => {
      if (assessment.kind === 'relief-absent') {
        // 지장간에만 있는 제복은 앞의 상신 문장에서 이미 밝히므로 여기서 되풀이하지 않는다.
        return `제복할 ${withSubjectParticle(integrity.effectiveReliefGods.join('·'))} 천간에 드러나지 않아 ${withAdverbialParticle(assessment.id)} 봅니다.`;
      }
      const subject = breakingFactorSubject(assessment, monthBranch);
      return assessment.rescued
        ? `${withSubjectParticle(subject)} 있으나 ${withSubjectParticle(assessment.rescuedBy.join('·'))} 막아 파격으로 보지 않습니다.`
        : `${withSubjectParticle(subject)} 있고 막는 글자가 없습니다.`;
    })
    .join(' ');
}

function integritySentence(integrity: ZipingPatternIntegrity): string {
  if (integrity.integrity === '파격') {
    return `그래서 이 관법에서는 ${withAdverbialParticle(integrity.determination.pattern)} 세우되 파격으로 봅니다.`;
  }
  if (integrity.integrity === '성격') {
    return `그래서 이 관법에서는 성격으로 봅니다.`;
  }
  if (integrity.integrity === '성격이지만 상신이 허약함') {
    return '그래서 성격으로 보되 상신이 뿌리가 없어 허약한 자리로 봅니다.';
  }
  return `그래서 ${withTopicParticle(integrity.determination.pattern)} 서지만 상신이 없어 격국으로는 결론이 나지 않습니다. ${ZIPING_RELIEF_FALLBACK_SENTENCE}`;
}

function evaluateZipingPatternIntegrity(context: DoctrineRuleContext): DoctrineRuleMatch {
  const integrity = computeZipingPatternIntegrity(context);
  const values = patternIntegrityValues(context, integrity);
  const omitted = omittedPillars(context.pillars);
  const dayStem = context.pillars.day.stem.korean;
  const monthBranch = context.pillars.month.branch.korean;
  return {
    key: canonicalJsonStringify(values),
    statement:
      `${patternBasisSentence(context, integrity.determination)} ` +
      `${directionSentence(integrity.determination.pattern, integrity.entry.direction)} ` +
      `${reliefSentence(integrity)} ` +
      `${breakingSentence(integrity, monthBranch)} ` +
      `${integritySentence(integrity)} ` +
      ZIPING_PATTERN_SCOPE_SENTENCE,
    topic: 'pattern',
    values,
    evidencePaths: ['pillars', 'facts.structure.relationships.branchClashes'],
    sourceReferenceIds: ZIPING_SOURCE_IDS,
    comparison: comparison(
      'ziping.pattern-integrity.v1',
      'ziping.pattern-integrity',
      'ziping-month-command',
      `${dayStem}:${monthBranch}`,
      `${integrity.determination.pattern}:${integrity.integrity}`,
    ),
    ...(omitted.length === 0 ? {} : { coverage: 'partial' as const, omittedPillars: omitted }),
  };
}

const ZIPING_RELIEF_SCOPE_SENTENCE =
  '이 팩은 자기 관법 안에서만 상신을 정합니다. 조후나 억부 기준의 용신과는 다를 수 있으며, 이 상신은 플러그인이 정한 최종 용신이 아닙니다.';

function evaluateZipingPatternReliefGod(context: DoctrineRuleContext): DoctrineRuleMatch {
  const integrity = computeZipingPatternIntegrity(context);
  const dayStem = context.pillars.day.stem.korean;
  const monthBranch = context.pillars.month.branch.korean;
  const selected =
    integrity.rootedReliefGods.length > 0
      ? integrity.rootedReliefGods
      : integrity.presentReliefGods;
  const omitted = omittedPillars(context.pillars);
  const values = {
    dayMaster: dayStem,
    monthBranch,
    pattern: integrity.determination.pattern,
    direction: integrity.entry.direction,
    integrity: integrity.integrity,
    reliefGods: [...integrity.entry.reliefGods],
    effectiveReliefGods: [...integrity.effectiveReliefGods],
    excludedReliefGods: [...integrity.excludedReliefGods],
    presentReliefGods: [...integrity.presentReliefGods],
    rootedReliefGods: [...integrity.rootedReliefGods],
    hiddenOnlyReliefGods: [...integrity.hiddenOnlyReliefGods],
    selectedReliefGods: [...selected],
    reliefAssessments: integrity.reliefAssessments.map(reliefAssessmentValues),
    reliefTableStatus: ZIPING_PATTERN_INTEGRITY_V1.reliefTableStatus,
    fallbackWhenAbsent: 'strength-balancing-useful-god-second-step',
    scope: 'pack-local-pattern-relief-god-not-plugin-final-useful-god',
    status:
      selected.length === 0
        ? 'relief-god-absent-fallback-to-strength-balancing'
        : integrity.integrity === '파격'
          ? 'pack-local-relief-god-selected-but-pattern-broken'
          : 'pack-local-relief-god-selected',
  } as const;
  const evidence =
    selected.length === 0
      ? ''
      : integrity.reliefAssessments
          .filter(({ group }) => selected.includes(group))
          .map((assessment) => {
            const stems = assessment.transparentStems
              .map(
                ({ position, stem, tenGod }) =>
                  `${STEM_POSITION_LABEL[position]} ${stem} ${tenGod}`,
              )
              .join('·');
            const branches = [
              ...new Set(assessment.rootedBranches.map(({ branch }) => branch)),
            ].join('·');
            return `${assessment.group}${branches.length === 0 ? `(${stems})` : `(${stems}, 지지 ${branches}에 뿌리)`}`;
          })
          .join('; ');
  return {
    key: canonicalJsonStringify(values),
    statement:
      selected.length === 0
        ? `자평 격국 기준으로 이 명식의 ${withTopicParticle(integrity.determination.pattern)} 상신이 천간에 드러나지 않아 격국만으로는 용신을 정하지 못합니다. ` +
          `${ZIPING_RELIEF_FALLBACK_SENTENCE} ${ZIPING_RELIEF_SCOPE_SENTENCE}`
        : integrity.integrity === '파격'
          ? // 파격이면 상신이 서 있어도 격을 살리지 못한다.  같은 응답의
            // ziping.pattern-integrity 가 파격이라고 한 것과 어긋나지 않게
            // '상신'이 아니라 '상신 후보'로 적는다.
            `자평 격국 기준으로 이 명식의 상신 후보는 ${selected.join('·')}입니다. ${withSubjectParticle(evidence)} ${withObjectParticle(integrity.determination.pattern)} 돕는 자리이지만, 이 격은 파격이라 상신이 격을 살리지 못합니다. ` +
            `${ZIPING_RELIEF_FALLBACK_SENTENCE} ${ZIPING_RELIEF_SCOPE_SENTENCE}`
          : `자평 격국 기준으로 이 명식의 상신은 ${selected.join('·')}입니다. ${withSubjectParticle(evidence)} ${withObjectParticle(integrity.determination.pattern)} 돕는 자리로 봅니다. ` +
            `${ZIPING_RELIEF_SCOPE_SENTENCE}`,
    topic: 'useful-god',
    values,
    evidencePaths: ['pillars', 'facts.structure.relationships.branchClashes'],
    sourceReferenceIds: ZIPING_SOURCE_IDS,
    comparison: comparison(
      'ziping.pattern-relief-god.v1',
      'ziping.pattern-relief-god',
      'ziping-month-command',
      `${dayStem}:${monthBranch}`,
      selected.length === 0 ? 'none' : selected.join('|'),
    ),
    ...(omitted.length === 0 ? {} : { coverage: 'partial' as const, omittedPillars: omitted }),
  };
}
