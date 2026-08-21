import type { EarthlyBranch, FiveElement, HeavenlyStem } from 'saju-engine';
import { canonicalJsonStringify } from '../../runtime/internal/canonical-json';
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import { isRecord } from '../../runtime/internal/guards';
import {
  BRANCH_MAIN_STEM,
  EARTHLY_BRANCHES,
  HEAVENLY_STEMS,
  getHeavenlyStemElement,
} from '../../runtime/traditions/domain';
import { getQiongtongClimateCandidates, getQiongtongClimateCellSource } from './qiongtong-table-v1';
import {
  comparison,
  hiddenStemObservations,
  omittedPillars,
  PILLAR_POSITION_LABEL,
  PILLAR_POSITIONS,
  visibleStemObservations,
  withAdverbialParticle,
  withObjectParticle,
  withTopicParticle,
} from '../../runtime/traditions/rule-helpers';
import type { PositionedStem } from '../../runtime/traditions/rule-helpers';
/** Deterministic lookup helper for the Qiongtong Pack. */
import type { InterpretationRuleId, JsonValue } from '../../runtime/traditions/types';
import type {
  DoctrineRuleContext,
  DoctrineRuleMatch,
} from '../../runtime/traditions/rule-evaluator-types';
import climateBaselineTable from './climate-baseline-v1.json';
import hiddenStemTable from './hidden-stems-v1.json';

const QIONGTONG_SOURCE_IDS = [
  'qiongtong-day-stem-month-climate-v1',
  'oh-my-saju-qiongtong-lookup-v1',
] as const;

export function evaluateQiongtongPackRule(
  ruleId: Extract<
    InterpretationRuleId,
    | 'qiongtong.climate-candidates'
    | 'qiongtong.climate-tendency'
    | 'qiongtong.candidate-condition'
    | 'qiongtong.pack-climate-priority'
  >,
  context: DoctrineRuleContext,
): DoctrineRuleMatch {
  if (ruleId === 'qiongtong.candidate-condition') return evaluateCandidateCondition(context);
  if (ruleId === 'qiongtong.pack-climate-priority') return evaluatePackClimatePriority(context);
  return ruleId === 'qiongtong.climate-tendency'
    ? evaluateClimateTendency(context)
    : evaluateClimateCandidates(context);
}

function evaluateClimateCandidates(context: DoctrineRuleContext): DoctrineRuleMatch {
  const dayStem = context.pillars.day.stem.korean;
  const monthBranch = context.pillars.month.branch.korean;
  const candidates = getQiongtongClimateCandidates(dayStem, monthBranch);
  const cellSource = getQiongtongClimateCellSource(dayStem, monthBranch);
  const candidateElements = candidates.map(getHeavenlyStemElement);
  const visible = visibleStemObservations(context.pillars, { includeDay: true });
  const hidden = hiddenStemObservations(context.pillars);
  const candidateEvidence = candidates.map((stem, index) => {
    const sourceCandidate = cellSource?.candidates.find((candidate) => candidate.stem === stem);
    return {
      stem,
      element: getHeavenlyStemElement(stem),
      transcribedOrder: index + 1,
      priority: sourceCandidate?.priority ?? null,
      function: sourceCandidate?.function ?? {
        tag: null,
        evidence: null,
        status: 'not-source-reviewed',
      },
      conditions: sourceCandidate?.conditions ?? {
        satisfied: [],
        unresolved: ['cell-source-review-pending'],
        status: 'not-source-reviewed',
      },
      visibleLocations: visible
        .filter((observation) => observation.stem === stem)
        .map(({ position }) => ({ position, evidencePath: `pillars.${position}.stem` })),
      hiddenLocations: hidden
        .filter((observation) => observation.stem === stem)
        .map(({ position }) => ({
          position,
          evidencePath: `facts.structure.hiddenStems.${position}`,
        })),
    };
  });
  const source = {
    sourceRuleId:
      cellSource?.sourceRuleId ?? `qiongtong.experimental-table.${dayStem}.${monthBranch}.v1`,
    sourceReferenceId: 'qiongtong-day-stem-month-climate-v1',
    sourceLocator:
      cellSource?.sourceLocator ?? `${dayStem} 일간 ${monthBranch}월 항목(판면 대조 대기)`,
    fixtureId: cellSource?.fixtureId ?? null,
    verification: cellSource?.verification ?? ('experimental-transcription-only' as const),
    functionAndConditionTranscription:
      cellSource === null
        ? 'not-source-reviewed'
        : 'source-explicit-functions-and-unresolved-conditions',
    edition: {
      work: '窮通寶鑑',
      transcriptionUrl:
        'https://zh.wikisource.org/w/index.php?oldid=2294674&title=%E7%A9%B7%E9%80%9A%E5%AE%9D%E9%89%B4',
      revision: 'Wikisource oldid 2294674',
      scanCatalogUrl:
        'https://commons.wikimedia.org/wiki/File:NLC416-12jh004238-48608_%E7%AA%AE%E9%80%9A%E5%AF%B6%E9%91%91%E8%A9%95%E8%A8%BB.pdf',
      scanEdition: '1937 《窮通寶鑑評註》',
      scanChecksumSha256: null,
      scanStatus: 'checksum-pending',
    },
  } as const;
  const omitted = omittedPillars(context.pillars);
  const presenceSummary = candidateEvidence
    .map(({ stem, visibleLocations, hiddenLocations }) => {
      const visibleLabel =
        visibleLocations.length === 0
          ? '천간 없음'
          : `천간 ${visibleLocations
              .map(({ position }) => PILLAR_POSITION_LABEL[position])
              .join('·')}`;
      const hiddenLabel =
        hiddenLocations.length === 0
          ? '지장간 없음'
          : `지장간 ${hiddenLocations
              .map(({ position }) => PILLAR_POSITION_LABEL[position])
              .join('·')}`;
      return `${stem}(${visibleLabel}, ${hiddenLabel})`;
    })
    .join('; ');
  const values = {
    dayMaster: dayStem,
    monthBranch,
    candidateStems: candidates,
    candidateElements,
    candidateEvidence,
    source,
    status:
      cellSource === null
        ? 'experimental-transcription-not-source-reviewed'
        : 'source-checked-candidates-functions-conditions-not-final',
  } as const;
  return {
    key: canonicalJsonStringify(values),
    statement:
      `${dayStem} 일간·${monthBranch}월의 궁통보감 조후 후보가 원국에 나타난 위치는 ${presenceSummary}입니다. ` +
      `${
        cellSource === null
          ? '아직 기준 판면과 대조하지 않은 실험용 전사입니다.'
          : '원문에서 후보의 순서와 기능 표기, 조건을 대조했습니다. 조건 판정은 아직 끝나지 않았습니다.'
      } 후보가 실제로 어디에 있는지는 따로 기록합니다. 이 자료만으로 최종 용신을 정하지 않습니다.`,
    topic: 'useful-god',
    values,
    evidencePaths: ['pillars', 'facts.structure.hiddenStems'],
    sourceReferenceIds: QIONGTONG_SOURCE_IDS,
    comparison: comparison(
      'qiongtong.climate-candidate-stems.v1',
      'useful-god-candidates',
      'qiongtong-climate',
      `${dayStem}:${monthBranch}`,
      candidates.join('|'),
    ),
    ...(omitted.length === 0 ? {} : { coverage: 'partial' as const, omittedPillars: omitted }),
  };
}

/** Lineage tag of the 한난조습 baseline table this Pack ships. */
export const QIONGTONG_CLIMATE_BASELINE_TABLE_ID_V1 = 'qiongtong-climate-baseline-v1';

const SUMMER_HOUR_BRANCHES: readonly EarthlyBranch[] = ['사', '오', '미'];
const WINTER_HOUR_BRANCHES: readonly EarthlyBranch[] = ['해', '자', '축'];

interface QiongtongClimateBaseline {
  /** -3 (한) … +3 (난). */
  readonly temperature: number;
  /** -3 (습) … +3 (조). */
  readonly moisture: number;
}

interface QiongtongClimateAdjustmentParameters {
  readonly fireCharacterTemperatureDelta: number;
  readonly waterCharacterTemperatureDelta: number;
  readonly earthCharacterThreshold: number;
  readonly earthCharacterMoistureDelta: number;
  readonly summerHourBranchTemperatureDelta: number;
  readonly winterHourBranchTemperatureDelta: number;
  readonly shallowEntryDepthPercent: number;
  readonly shallowEntryTemperatureDelta: number;
}

interface QiongtongClimateGradeParameters {
  readonly urgentAbsoluteTemperature: number;
  readonly tiltedAbsoluteTemperature: number;
  readonly urgentLabel: string;
  readonly tiltedLabel: string;
  readonly balancedLabel: string;
}

interface QiongtongClimateBaselineTable {
  readonly monthBaseline: Readonly<Record<EarthlyBranch, QiongtongClimateBaseline>>;
  readonly adjustments: QiongtongClimateAdjustmentParameters;
  readonly grades: QiongtongClimateGradeParameters;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Invalid Qiongtong climate baseline field ${field}.`);
  }
  return value;
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`Invalid Qiongtong climate baseline field ${field}.`);
  }
  return value;
}

function requireClimateBaseline(value: unknown, branch: EarthlyBranch): QiongtongClimateBaseline {
  if (!isRecord(value)) {
    throw new TypeError(`Invalid Qiongtong climate baseline for month branch ${branch}.`);
  }
  return {
    temperature: requireNumber(value.temperature, `${branch}.temperature`),
    moisture: requireNumber(value.moisture, `${branch}.moisture`),
  };
}

function parseClimateBaselineTable(value: unknown): QiongtongClimateBaselineTable {
  if (
    !isRecord(value) ||
    value.schemaVersion !== '1' ||
    value.profileId !== QIONGTONG_CLIMATE_BASELINE_TABLE_ID_V1 ||
    !isRecord(value.monthBaseline) ||
    !isRecord(value.adjustments) ||
    !isRecord(value.grades)
  ) {
    throw new TypeError('Invalid Qiongtong climate baseline table.');
  }
  const declaredBaseline = value.monthBaseline;
  const declaredAdjustments = value.adjustments;
  const declaredGrades = value.grades;
  return {
    monthBaseline: Object.fromEntries(
      EARTHLY_BRANCHES.map((branch) => [
        branch,
        requireClimateBaseline(declaredBaseline[branch], branch),
      ]),
    ) as Readonly<Record<EarthlyBranch, QiongtongClimateBaseline>>,
    adjustments: {
      fireCharacterTemperatureDelta: requireNumber(
        declaredAdjustments.fireCharacterTemperatureDelta,
        'fireCharacterTemperatureDelta',
      ),
      waterCharacterTemperatureDelta: requireNumber(
        declaredAdjustments.waterCharacterTemperatureDelta,
        'waterCharacterTemperatureDelta',
      ),
      earthCharacterThreshold: requireNumber(
        declaredAdjustments.earthCharacterThreshold,
        'earthCharacterThreshold',
      ),
      earthCharacterMoistureDelta: requireNumber(
        declaredAdjustments.earthCharacterMoistureDelta,
        'earthCharacterMoistureDelta',
      ),
      summerHourBranchTemperatureDelta: requireNumber(
        declaredAdjustments.summerHourBranchTemperatureDelta,
        'summerHourBranchTemperatureDelta',
      ),
      winterHourBranchTemperatureDelta: requireNumber(
        declaredAdjustments.winterHourBranchTemperatureDelta,
        'winterHourBranchTemperatureDelta',
      ),
      shallowEntryDepthPercent: requireNumber(
        declaredAdjustments.shallowEntryDepthPercent,
        'shallowEntryDepthPercent',
      ),
      shallowEntryTemperatureDelta: requireNumber(
        declaredAdjustments.shallowEntryTemperatureDelta,
        'shallowEntryTemperatureDelta',
      ),
    },
    grades: {
      urgentAbsoluteTemperature: requireNumber(
        declaredGrades.urgentAbsoluteTemperature,
        'urgentAbsoluteTemperature',
      ),
      tiltedAbsoluteTemperature: requireNumber(
        declaredGrades.tiltedAbsoluteTemperature,
        'tiltedAbsoluteTemperature',
      ),
      urgentLabel: requireText(declaredGrades.urgentLabel, 'urgentLabel'),
      tiltedLabel: requireText(declaredGrades.tiltedLabel, 'tiltedLabel'),
      balancedLabel: requireText(declaredGrades.balancedLabel, 'balancedLabel'),
    },
  };
}

/**
 * Pack-local 한난조습 baseline.  It is a modern reconstruction owned by this
 * Pack, not a transcription of the base text, and it never selects a remedy.
 */
export const QIONGTONG_CLIMATE_BASELINE_V1: QiongtongClimateBaselineTable = deepFreeze(
  parseClimateBaselineTable(climateBaselineTable),
);

function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

function signedIndex(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function previousMonthBranch(branch: EarthlyBranch): EarthlyBranch {
  const index = EARTHLY_BRANCHES.indexOf(branch);
  return EARTHLY_BRANCHES[(index + EARTHLY_BRANCHES.length - 1) % EARTHLY_BRANCHES.length]!;
}

function evaluateClimateTendency(context: DoctrineRuleContext): DoctrineRuleMatch {
  const dayStem = context.pillars.day.stem.korean;
  const monthBranch = context.pillars.month.branch.korean;
  const hourBranch = context.pillars.hour?.branch.korean ?? null;
  const baseline = QIONGTONG_CLIMATE_BASELINE_V1.monthBaseline[monthBranch];
  const { adjustments: parameters, grades } = QIONGTONG_CLIMATE_BASELINE_V1;
  // Branches contribute through their main hidden stem, so one chart character
  // is one element vote regardless of whether it is a stem or a branch.
  const characterElements = PILLAR_POSITIONS.flatMap((position) => {
    const pillar = context.pillars[position];
    return pillar === null
      ? []
      : [
          getHeavenlyStemElement(pillar.stem.korean),
          getHeavenlyStemElement(BRANCH_MAIN_STEM[pillar.branch.korean]),
        ];
  });
  const fireCount = characterElements.filter((element) => element === '화').length;
  const waterCount = characterElements.filter((element) => element === '수').length;
  const earthCount = characterElements.filter((element) => element === '토').length;

  const adjustments: JsonValue[] = [];
  let temperatureIndex = baseline.temperature;
  let moistureIndex = baseline.moisture;
  if (fireCount > 0) {
    const delta = parameters.fireCharacterTemperatureDelta * fireCount;
    temperatureIndex += delta;
    adjustments.push({
      id: 'fire-characters',
      axis: 'temperature',
      delta,
      basis: `화 ${fireCount}`,
    });
  }
  if (waterCount > 0) {
    const delta = parameters.waterCharacterTemperatureDelta * waterCount;
    temperatureIndex += delta;
    adjustments.push({
      id: 'water-characters',
      axis: 'temperature',
      delta,
      basis: `수 ${waterCount}`,
    });
  }
  if (earthCount >= parameters.earthCharacterThreshold) {
    const delta = parameters.earthCharacterMoistureDelta;
    moistureIndex += delta;
    adjustments.push({
      id: 'earth-characters',
      axis: 'moisture',
      delta,
      basis: `토 ${earthCount}`,
    });
  }
  if (hourBranch !== null && SUMMER_HOUR_BRANCHES.includes(hourBranch)) {
    const delta = parameters.summerHourBranchTemperatureDelta;
    temperatureIndex += delta;
    adjustments.push({
      id: 'summer-hour-branch',
      axis: 'temperature',
      delta,
      basis: `시지 ${hourBranch}`,
    });
  }
  if (hourBranch !== null && WINTER_HOUR_BRANCHES.includes(hourBranch)) {
    const delta = parameters.winterHourBranchTemperatureDelta;
    temperatureIndex += delta;
    adjustments.push({
      id: 'winter-hour-branch',
      axis: 'temperature',
      delta,
      basis: `시지 ${hourBranch}`,
    });
  }
  if (context.solarTerm !== null) {
    const depthPercent = Math.round(
      ((context.solarTerm.birthEpochMilliseconds - context.solarTerm.monthStart.epochMilliseconds) /
        (context.solarTerm.monthEnd.epochMilliseconds -
          context.solarTerm.monthStart.epochMilliseconds)) *
        100,
    );
    if (depthPercent < parameters.shallowEntryDepthPercent) {
      const previousBranch = previousMonthBranch(monthBranch);
      const direction = Math.sign(
        QIONGTONG_CLIMATE_BASELINE_V1.monthBaseline[previousBranch].temperature -
          baseline.temperature,
      );
      const delta = direction * parameters.shallowEntryTemperatureDelta;
      temperatureIndex += delta;
      adjustments.push({
        id: 'shallow-solar-term-entry',
        axis: 'temperature',
        delta,
        basis: `절입 ${depthPercent}% · 직전 ${previousBranch}월`,
      });
    }
  }
  temperatureIndex = roundToHundredths(temperatureIndex);
  moistureIndex = roundToHundredths(moistureIndex);

  const absoluteTemperature = Math.abs(temperatureIndex);
  const grade =
    absoluteTemperature >= grades.urgentAbsoluteTemperature
      ? grades.urgentLabel
      : absoluteTemperature >= grades.tiltedAbsoluteTemperature
        ? grades.tiltedLabel
        : grades.balancedLabel;
  const tilt =
    temperatureIndex > 0
      ? '따뜻한 쪽으로 기웁니다'
      : temperatureIndex < 0
        ? '찬 쪽으로 기웁니다'
        : '어느 쪽으로도 기울지 않습니다';
  const omitted = omittedPillars(context.pillars);
  const values = {
    monthBranch,
    baseTemperature: baseline.temperature,
    baseMoisture: baseline.moisture,
    temperatureIndex,
    moistureIndex,
    grade,
    gradeAxis: 'temperature-only',
    fireCount,
    waterCount,
    earthCount,
    hourBranch,
    adjustments,
    status: 'climate-observation-not-prescription',
  } as const;
  return {
    key: canonicalJsonStringify(values),
    statement:
      `${monthBranch}월은 한난 기준값 ${signedIndex(baseline.temperature)}, 조습 기준값 ${signedIndex(baseline.moisture)}인 자리입니다. ` +
      `${withObjectParticle(`원국의 화 ${fireCount}·수 ${waterCount} 배치${hourBranch === null ? '' : `와 시지 ${hourBranch}`}`)} 반영하면 한난 지표는 ${withAdverbialParticle(signedIndex(temperatureIndex))} ${tilt}. ` +
      `${grade}입니다. ` +
      `조습 지표는 ${signedIndex(moistureIndex)}이며, 이 지표는 등급 판정에 쓰지 않고 참고로만 적습니다. ` +
      `${context.solarTerm === null ? '절입 심천은 생시가 확정되어야 반영합니다. ' : ''}` +
      '이 관법의 현대 재구성 지표이며 최종 처방을 정하지 않습니다.',
    topic: 'season-climate',
    values,
    evidencePaths:
      context.solarTerm === null
        ? ['pillars']
        : [
            'pillars',
            'chronology.epochMilliseconds',
            'audit.evidence.monthStart',
            'audit.evidence.monthEnd',
          ],
    sourceReferenceIds: QIONGTONG_SOURCE_IDS,
    comparison: comparison(
      'qiongtong.climate-tendency.v1',
      'qiongtong.climate-tendency',
      'qiongtong-climate',
      `${dayStem}:${monthBranch}`,
      `${signedIndex(temperatureIndex)}|${signedIndex(moistureIndex)}`,
    ),
    ...(context.solarTerm === null || omitted.length > 0
      ? { coverage: 'partial' as const, omittedPillars: omitted }
      : {}),
  };
}

/* ------------------- 조후 후보 성립 평가 (candidate condition) ------------------ */

/** Lineage tag of the pack-local 지장간 table used for root checks. */
export const QIONGTONG_HIDDEN_STEM_TABLE_ID_V1 = 'qiongtong-hidden-stems-v1';

function requireHiddenStemList(value: unknown, branch: EarthlyBranch): readonly HeavenlyStem[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`Invalid Qiongtong hidden-stem list for branch ${branch}.`);
  }
  return (value as readonly unknown[]).map((entry) => {
    if (!HEAVENLY_STEMS.includes(entry as HeavenlyStem)) {
      throw new TypeError(`Invalid Qiongtong hidden stem for branch ${branch}.`);
    }
    return entry as HeavenlyStem;
  });
}

function parseHiddenStemTable(
  value: unknown,
): Readonly<Record<EarthlyBranch, readonly HeavenlyStem[]>> {
  if (
    !isRecord(value) ||
    value.schemaVersion !== '1' ||
    value.profileId !== QIONGTONG_HIDDEN_STEM_TABLE_ID_V1 ||
    !isRecord(value.branchHiddenStems)
  ) {
    throw new TypeError('Invalid Qiongtong hidden-stem table.');
  }
  const declared = value.branchHiddenStems;
  return Object.fromEntries(
    EARTHLY_BRANCHES.map((branch) => [branch, requireHiddenStemList(declared[branch], branch)]),
  ) as Readonly<Record<EarthlyBranch, readonly HeavenlyStem[]>>;
}

/**
 * Pack-local 지장간 table.  Root checks for climate candidates read this copy
 * only, so the Pack never depends on another Pack's branch table.
 */
export const QIONGTONG_HIDDEN_STEMS_V1: Readonly<Record<EarthlyBranch, readonly HeavenlyStem[]>> =
  deepFreeze(parseHiddenStemTable(hiddenStemTable));

type QiongtongCandidateState =
  'transparent-and-rooted' | 'transparent-only' | 'rooted-only' | 'absent';

const QIONGTONG_CANDIDATE_STATE_LABEL: Readonly<Record<QiongtongCandidateState, string>> = {
  'transparent-and-rooted': '드러나고 뿌리도 있어 바로 쓸 수 있는 자리',
  'transparent-only': '드러났으나 뿌리가 없어 힘이 약한 자리',
  'rooted-only': '지장간에만 있어 드러나지 않은 자리',
  absent: '원국에 없어 이 명식에서는 쓸 수 없는 자리',
};

const QIONGTONG_CANDIDATE_STATE_RANK: Readonly<Record<QiongtongCandidateState, number>> = {
  'transparent-and-rooted': 3,
  'transparent-only': 2,
  'rooted-only': 1,
  absent: 0,
};

interface QiongtongCandidateCondition {
  readonly stem: HeavenlyStem;
  readonly element: FiveElement;
  readonly transcribedOrder: number;
  readonly transparentPositions: readonly PositionedStem['position'][];
  readonly rootBranches: readonly {
    readonly position: PositionedStem['position'];
    readonly branch: EarthlyBranch;
    readonly stem: HeavenlyStem;
    readonly evidencePath: string;
  }[];
  readonly transparent: boolean;
  readonly rooted: boolean;
  readonly state: QiongtongCandidateState;
  readonly label: string;
}

function candidateConditions(context: DoctrineRuleContext): readonly QiongtongCandidateCondition[] {
  const dayStem = context.pillars.day.stem.korean;
  const monthBranch = context.pillars.month.branch.korean;
  const candidates = getQiongtongClimateCandidates(dayStem, monthBranch);
  const visible = visibleStemObservations(context.pillars, { includeDay: true });
  return candidates.map((stem, index) => {
    const element = getHeavenlyStemElement(stem);
    const transparentPositions = visible
      .filter((observation) => observation.stem === stem)
      .map(({ position }) => position);
    const rootBranches = PILLAR_POSITIONS.flatMap((position) => {
      const pillar = context.pillars[position];
      if (pillar === null) return [];
      const branch = pillar.branch.korean;
      return QIONGTONG_HIDDEN_STEMS_V1[branch]
        .filter((hidden) => getHeavenlyStemElement(hidden) === element)
        .map((hidden) => ({
          position,
          branch,
          stem: hidden,
          evidencePath: `pillars.${position}.branch`,
        }));
    });
    const transparent = transparentPositions.length > 0;
    const rooted = rootBranches.length > 0;
    const state: QiongtongCandidateState = transparent
      ? rooted
        ? 'transparent-and-rooted'
        : 'transparent-only'
      : rooted
        ? 'rooted-only'
        : 'absent';
    return {
      stem,
      element,
      transcribedOrder: index + 1,
      transparentPositions,
      rootBranches,
      transparent,
      rooted,
      state,
      label: QIONGTONG_CANDIDATE_STATE_LABEL[state],
    };
  });
}

/**
 * 이 셀이 큐레이트 7칸(판면 대조 완료)인지, 아직 대조하지 않은 실험 전사인지.
 *
 * 후보 표 자체는 120칸이 모두 채워져 있지만 판면 대조는 7칸뿐이다. 조후 후보를
 * 문장으로 단언하는 규칙은 이 구분을 반드시 함께 밝힌다.
 */
interface QiongtongCellVerification {
  readonly verified: boolean;
  readonly verification:
    'source-checked-candidate-order-and-explicit-functions' | 'experimental-transcription-only';
  readonly notice: string;
}

function cellVerification(
  dayStem: HeavenlyStem,
  monthBranch: EarthlyBranch,
): QiongtongCellVerification {
  const cellSource = getQiongtongClimateCellSource(dayStem, monthBranch);
  return cellSource === null
    ? {
        verified: false,
        verification: 'experimental-transcription-only',
        notice:
          '이 칸은 아직 기준 판면과 대조하지 않은 실험용 전사입니다(120칸 중 7칸만 대조 완료). ',
      }
    : {
        verified: true,
        verification: cellSource.verification,
        notice: '이 칸은 기준 판면과 대조한 7칸에 속합니다. ',
      };
}

function conditionValues(condition: QiongtongCandidateCondition): JsonValue {
  return {
    stem: condition.stem,
    element: condition.element,
    transcribedOrder: condition.transcribedOrder,
    transparent: condition.transparent,
    rooted: condition.rooted,
    transparentPositions: [...condition.transparentPositions],
    rootBranches: condition.rootBranches.map(({ position, branch, stem, evidencePath }) => ({
      position,
      branch,
      stem,
      evidencePath,
    })),
    state: condition.state,
    label: condition.label,
  };
}

function conditionPhrase(condition: QiongtongCandidateCondition): string {
  const transparency =
    condition.transparentPositions.length === 0
      ? '투간 없음'
      : `투간 ${condition.transparentPositions
          .map((position) => PILLAR_POSITION_LABEL[position])
          .join('·')}`;
  const roots =
    condition.rootBranches.length === 0
      ? '지지 뿌리 없음'
      : `지지 ${[...new Set(condition.rootBranches.map(({ branch }) => branch))].join('·')}에 뿌리`;
  return `${condition.stem}(${transparency}, ${roots} → ${condition.label})`;
}

function evaluateCandidateCondition(context: DoctrineRuleContext): DoctrineRuleMatch {
  const dayStem = context.pillars.day.stem.korean;
  const monthBranch = context.pillars.month.branch.korean;
  const conditions = candidateConditions(context);
  const cell = cellVerification(dayStem, monthBranch);
  const omitted = omittedPillars(context.pillars);
  const values = {
    dayMaster: dayStem,
    monthBranch,
    cellVerification: cell.verification,
    cellSourceReviewed: cell.verified,
    hiddenStemTable: QIONGTONG_HIDDEN_STEM_TABLE_ID_V1,
    rootBasis: 'same-element-in-branch-hidden-stems',
    transparencyBasis: 'year-month-day-hour-visible-stems',
    candidateConditions: conditions.map(conditionValues),
    usableCandidateStems: conditions
      .filter(({ state }) => state !== 'absent')
      .map(({ stem }) => stem),
    status: 'pack-local-candidate-condition-not-final',
  } as const;
  return {
    key: canonicalJsonStringify(values),
    statement:
      `${dayStem} 일간·${monthBranch}월의 조후 후보를 투간과 지지 뿌리로 따지면 ${conditions
        .map(conditionPhrase)
        .join('; ')}입니다. ` +
      cell.notice +
      '투간과 뿌리만 보는 이 관법의 성립 평가이며, 원문이 단 조건절은 아직 판정하지 않습니다. 길흉이나 최종 용신도 여기서 정하지 않습니다.',
    topic: 'useful-god',
    values,
    evidencePaths: ['pillars'],
    sourceReferenceIds: QIONGTONG_SOURCE_IDS,
    comparison: comparison(
      'qiongtong.candidate-condition.v1',
      'qiongtong.candidate-condition',
      'qiongtong-climate',
      `${dayStem}:${monthBranch}`,
      conditions.map(({ stem, state }) => `${stem}:${state}`).join('|'),
    ),
    ...(omitted.length === 0 ? {} : { coverage: 'partial' as const, omittedPillars: omitted }),
  };
}

function evaluatePackClimatePriority(context: DoctrineRuleContext): DoctrineRuleMatch {
  const dayStem = context.pillars.day.stem.korean;
  const monthBranch = context.pillars.month.branch.korean;
  const conditions = candidateConditions(context);
  const cell = cellVerification(dayStem, monthBranch);
  const ranked = [...conditions].sort((left, right) => {
    const byState =
      QIONGTONG_CANDIDATE_STATE_RANK[right.state] - QIONGTONG_CANDIDATE_STATE_RANK[left.state];
    return byState !== 0 ? byState : left.transcribedOrder - right.transcribedOrder;
  });
  const primary = ranked[0]!;
  const usable = primary.state !== 'absent';
  const omitted = omittedPillars(context.pillars);
  const values = {
    dayMaster: dayStem,
    monthBranch,
    priorityStem: primary.stem,
    priorityElement: primary.element,
    priorityState: primary.state,
    priorityLabel: primary.label,
    usable,
    cellVerification: cell.verification,
    cellSourceReviewed: cell.verified,
    tieBreak: 'candidate-state-then-transcribed-order',
    rankedCandidates: ranked.map(({ stem, state, transcribedOrder }) => ({
      stem,
      state,
      transcribedOrder,
    })),
    candidateConditions: conditions.map(conditionValues),
    scope: 'pack-local-climate-priority-not-plugin-final-useful-god',
    status: usable
      ? 'pack-local-climate-priority-selected'
      : 'pack-local-climate-priority-not-present-in-chart',
  } as const;
  return {
    key: canonicalJsonStringify(values),
    statement:
      (usable
        ? `이 팩의 성립 평가에서 가장 쓸 수 있는 조후 후보는 ${primary.stem}(${primary.element})이며 ${primary.label}입니다. ` +
          cell.notice +
          (cell.verified
            ? '궁통보감 조후용신으로는 이 자리를 1순위로 봅니다. '
            : '그래서 궁통보감이 매긴 1순위가 아니라 이 팩 전사 기준의 1순위로만 적습니다. ')
        : `이 팩의 조후 후보 ${withTopicParticle(
            conditions.map(({ stem }) => stem).join('·'),
          )} 원국의 천간에도 지장간에도 없어, 조후로 쓸 수 있는 자리가 이 명식에는 없습니다. 이 팩 전사 순서 기준 1순위인 ${primary.stem}의 자리만 적어 둡니다. ` +
          cell.notice) +
      '순위는 이 팩의 조후 기준일 뿐이며, 격국·억부를 합친 플러그인의 최종 용신이 아닙니다.',
    topic: 'useful-god',
    values,
    evidencePaths: ['pillars'],
    sourceReferenceIds: QIONGTONG_SOURCE_IDS,
    comparison: comparison(
      'qiongtong.pack-climate-priority.v1',
      'qiongtong.pack-climate-priority',
      'qiongtong-climate',
      `${dayStem}:${monthBranch}`,
      `${primary.stem}:${primary.state}`,
    ),
    ...(omitted.length === 0 ? {} : { coverage: 'partial' as const, omittedPillars: omitted }),
  };
}
