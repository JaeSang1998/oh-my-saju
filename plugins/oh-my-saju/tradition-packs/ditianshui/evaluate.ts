import type { EarthlyBranch, FiveElement, HeavenlyStem, TenGod } from 'saju-engine';
import { canonicalJsonStringify } from '../../runtime/internal/canonical-json';
import { deepFreeze } from '../../runtime/internal/deep-freeze';
/** Deterministic helper for the Ditianshui Pack. */
import {
  BRANCH_MAIN_STEM,
  EARTHLY_BRANCHES,
  ELEMENT_CONTROLS,
  ELEMENT_GENERATES,
  HEAVENLY_STEMS,
  getHeavenlyStemElement,
  getTenGod,
} from '../../runtime/traditions/domain';
import type { InterpretationRuleId, JsonValue } from '../../runtime/traditions/types';
import {
  comparison,
  hiddenStemObservations,
  omittedPillars,
  PILLAR_POSITIONS,
  visibleStemObservations,
  withAdverbialParticle,
  withComitativeParticle,
  withCopulaClause,
  withSubjectParticle,
  withTopicParticle,
  type PositionedStem,
} from '../../runtime/traditions/rule-helpers';
import type {
  DoctrineRuleContext,
  DoctrineRuleMatch,
} from '../../runtime/traditions/rule-evaluator-types';
import { isRecord } from '../../runtime/internal/guards';
import followTransformTable from './follow-transform-v1.json';
import rootRankTable from './root-rank-v1.json';
import seasonalStateTable from './seasonal-state-table.json';
import strengthScoreTable from './strength-score-v1.json';

const DITIANSHUI_SEASONAL_SOURCE_IDS = ['sanming-seasonal-state-table-v1'] as const;
const DITIANSHUI_LEDGER_SOURCE_IDS = [
  'ditianshui-strength-flow-v1',
  'oh-my-saju-ditianshui-evidence-v1',
] as const;

export type DitianshuiSeasonalState = '왕' | '상' | '휴' | '수' | '사';

function requireFiveElement(value: unknown, monthBranch: EarthlyBranch): FiveElement {
  if (value === '목' || value === '화' || value === '토' || value === '금' || value === '수') {
    return value;
  }
  throw new TypeError(`Invalid Ditianshui seasonal ruler for month branch ${monthBranch}.`);
}

function parseSeasonalRulerTable(value: unknown): Readonly<Record<EarthlyBranch, FiveElement>> {
  if (!isRecord(value) || value.schemaVersion !== '1' || !isRecord(value.monthRuler)) {
    throw new TypeError('Invalid Ditianshui seasonal-state table.');
  }
  const rulers = value.monthRuler;
  return {
    자: requireFiveElement(rulers['자'], '자'),
    축: requireFiveElement(rulers['축'], '축'),
    인: requireFiveElement(rulers['인'], '인'),
    묘: requireFiveElement(rulers['묘'], '묘'),
    진: requireFiveElement(rulers['진'], '진'),
    사: requireFiveElement(rulers['사'], '사'),
    오: requireFiveElement(rulers['오'], '오'),
    미: requireFiveElement(rulers['미'], '미'),
    신: requireFiveElement(rulers['신'], '신'),
    유: requireFiveElement(rulers['유'], '유'),
    술: requireFiveElement(rulers['술'], '술'),
    해: requireFiveElement(rulers['해'], '해'),
  };
}

export const DITIANSHUI_SEASONAL_RULER_BY_MONTH_V1: Readonly<Record<EarthlyBranch, FiveElement>> =
  deepFreeze(parseSeasonalRulerTable(seasonalStateTable));

type StrengthEvidenceRole =
  | 'resourceSupport'
  | 'peerSupport'
  | 'outputDrain'
  | 'wealthDrain'
  | 'officerControl';

type StrengthEvidenceLedger = Readonly<
  Record<
    StrengthEvidenceRole,
    readonly {
      readonly stem: HeavenlyStem;
      readonly position: PositionedStem['position'];
      readonly tenGod: TenGod;
    }[]
  >
>;

function seasonalState(ruler: FiveElement, subject: FiveElement): DitianshuiSeasonalState {
  if (subject === ruler) return '왕';
  if (ELEMENT_GENERATES[ruler] === subject) return '상';
  if (ELEMENT_GENERATES[subject] === ruler) return '휴';
  if (ELEMENT_CONTROLS[subject] === ruler) return '수';
  return '사';
}

/**
 * Deterministic 旺相休囚死 lookup under the explicit four-season-endings
 * month policy used by the Ditianshui Tradition Pack.
 */
export function getDitianshuiSeasonalState(
  subject: FiveElement,
  monthBranch: EarthlyBranch,
): {
  readonly rulerElement: FiveElement;
  readonly state: DitianshuiSeasonalState;
} {
  const rulerElement = DITIANSHUI_SEASONAL_RULER_BY_MONTH_V1[monthBranch];
  return deepFreeze({ rulerElement, state: seasonalState(rulerElement, subject) });
}

export function evaluateDitianshuiPackRule(
  ruleId: Extract<
    InterpretationRuleId,
    | 'ditianshui.seasonal-state'
    | 'ditianshui.support-ledger'
    | 'ditianshui.rooting-ledger'
    | 'ditianshui.command-position'
    | 'ditianshui.strength-verdict'
    | 'ditianshui.follow-transform-patterns'
  >,
  context: DoctrineRuleContext,
): DoctrineRuleMatch {
  if (ruleId === 'ditianshui.rooting-ledger') return evaluateRootingLedger(context);
  if (ruleId === 'ditianshui.command-position') return evaluateCommandPosition(context);
  if (ruleId === 'ditianshui.strength-verdict') return evaluateStrengthVerdict(context);
  if (ruleId === 'ditianshui.follow-transform-patterns') {
    return evaluateFollowTransformPatterns(context);
  }
  const dayStem = context.pillars.day.stem.korean;
  const dayElement = getHeavenlyStemElement(dayStem);
  const monthBranch = context.pillars.month.branch.korean;
  const { rulerElement, state } = getDitianshuiSeasonalState(dayElement, monthBranch);
  const subjectKey = `${dayStem}:${monthBranch}`;

  if (ruleId === 'ditianshui.seasonal-state') {
    const values = {
      dayMaster: dayStem,
      dayMasterElement: dayElement,
      monthBranch,
      seasonalRulerElement: rulerElement,
      seasonalState: state,
      earthTransitionPolicy: 'four-season-endings',
      status: 'seasonal-evidence-not-verdict',
    } as const;
    return {
      key: canonicalJsonStringify(values),
      statement:
        `이 관법에서는 ${monthBranch}월을 ${rulerElement} 사령으로 봅니다. ${dayStem}${dayElement}의 계절 상태는 ${state}입니다. ` +
        '이 값만으로 신강·신약을 정하지 않습니다.',
      topic: 'strength',
      values,
      evidencePaths: ['pillars.day.stem', 'pillars.month.branch'],
      sourceReferenceIds: DITIANSHUI_SEASONAL_SOURCE_IDS,
      comparison: comparison(
        'ditianshui.seasonal-state.four-season-endings.v1',
        'seasonal-strength-evidence',
        'ditianshui-strength-evidence',
        subjectKey,
        state,
      ),
    };
  }

  const evidenceRole = (tenGod: TenGod): StrengthEvidenceRole => {
    if (tenGod === '편인' || tenGod === '정인') return 'resourceSupport';
    if (tenGod === '비견' || tenGod === '겁재') return 'peerSupport';
    if (tenGod === '식신' || tenGod === '상관') return 'outputDrain';
    if (tenGod === '편재' || tenGod === '정재') return 'wealthDrain';
    return 'officerControl';
  };
  const groupEvidence = (observations: readonly PositionedStem[]): StrengthEvidenceLedger => {
    const grouped: Record<
      StrengthEvidenceRole,
      {
        readonly stem: HeavenlyStem;
        readonly position: PositionedStem['position'];
        readonly tenGod: TenGod;
      }[]
    > = {
      resourceSupport: [],
      peerSupport: [],
      outputDrain: [],
      wealthDrain: [],
      officerControl: [],
    };
    for (const { stem, position } of observations) {
      const tenGod = getTenGod(dayStem, stem);
      grouped[evidenceRole(tenGod)].push({ stem, position, tenGod });
    }
    return grouped;
  };
  // The day stem is the subject of the ledger, not evidence supporting itself.
  const visibleEvidence = groupEvidence(
    visibleStemObservations(context.pillars, { includeDay: false }),
  );
  const hiddenEvidence = groupEvidence(hiddenStemObservations(context.pillars));
  const omitted = omittedPillars(context.pillars);
  const ledgerCounts = (grouped: StrengthEvidenceLedger): string =>
    [
      `인성 ${grouped.resourceSupport.length}`,
      `비겁 ${grouped.peerSupport.length}`,
      `식상 ${grouped.outputDrain.length}`,
      `재성 ${grouped.wealthDrain.length}`,
      `관살 ${grouped.officerControl.length}`,
    ].join('·');
  const values = {
    dayMaster: dayStem,
    seasonalState: state,
    visibleEvidence,
    hiddenEvidence,
    excludedSubjectStem: {
      position: 'day',
      stem: dayStem,
      reason: 'day-master-is-ledger-subject-not-peer-evidence',
    },
    status: 'evidence-ledger-no-strength-verdict',
  } as const;
  return {
    key: canonicalJsonStringify(values),
    statement:
      `계절 상태는 ${state}입니다. 천간에 드러난 근거는 ${ledgerCounts(visibleEvidence)}, 지장간에 든 근거는 ${ledgerCounts(hiddenEvidence)}입니다. ` +
      '가중치를 매기거나 최종 신강·신약 이름을 붙이지 않습니다.',
    topic: 'strength',
    values,
    evidencePaths: ['pillars', 'facts.structure.hiddenStems'],
    sourceReferenceIds: DITIANSHUI_LEDGER_SOURCE_IDS,
    comparison: comparison(
      'ditianshui.strength-evidence-ledger.v1',
      'strength-evidence-ledger',
      'ditianshui-strength-evidence',
      subjectKey,
      canonicalJsonStringify(values),
    ),
    ...(omitted.length === 0 ? {} : { coverage: 'partial' as const, omittedPillars: omitted }),
  };
}

/** Lineage tag of the hidden-stem rank table this Pack ships. */
export const DITIANSHUI_ROOT_RANK_TABLE_ID_V1 = 'ditianshui-root-rank-v1';

export type DitianshuiRootRank = '정기' | '중기' | '여기';

export interface DitianshuiRootRankEntry {
  readonly stem: HeavenlyStem;
  readonly rank: DitianshuiRootRank;
}

function requireRootRankEntry(value: unknown, branch: EarthlyBranch): DitianshuiRootRankEntry {
  if (
    !isRecord(value) ||
    !HEAVENLY_STEMS.includes(value.stem as HeavenlyStem) ||
    (value.rank !== '정기' && value.rank !== '중기' && value.rank !== '여기')
  ) {
    throw new TypeError(`Invalid Ditianshui root rank entry for branch ${branch}.`);
  }
  return { stem: value.stem as HeavenlyStem, rank: value.rank };
}

function requireRootRankEntries(
  value: unknown,
  branch: EarthlyBranch,
): readonly DitianshuiRootRankEntry[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`Invalid Ditianshui root rank table for branch ${branch}.`);
  }
  return (value as readonly unknown[]).map((entry) => requireRootRankEntry(entry, branch));
}

function parseRootRankTable(
  value: unknown,
): Readonly<Record<EarthlyBranch, readonly DitianshuiRootRankEntry[]>> {
  if (
    !isRecord(value) ||
    value.schemaVersion !== '1' ||
    value.profileId !== DITIANSHUI_ROOT_RANK_TABLE_ID_V1 ||
    !isRecord(value.branchRank)
  ) {
    throw new TypeError('Invalid Ditianshui root rank table.');
  }
  const declared = value.branchRank;
  return Object.fromEntries(
    EARTHLY_BRANCHES.map((branch) => [branch, requireRootRankEntries(declared[branch], branch)]),
  ) as Readonly<Record<EarthlyBranch, readonly DitianshuiRootRankEntry[]>>;
}

/**
 * Pack-local 지장간 rank table.  The engine hidden-stem table orders 축·진·미·술·사
 * with 중기 and 여기 swapped and gives 왕지 no 여기 at all, so rank can never be
 * inferred from it; this Pack keeps its own explicit table instead.
 */
export const DITIANSHUI_ROOT_RANK_V1: Readonly<
  Record<EarthlyBranch, readonly DitianshuiRootRankEntry[]>
> = deepFreeze(parseRootRankTable(rootRankTable));

const ROOT_RANK_STRENGTH: Readonly<Record<DitianshuiRootRank, number>> = {
  정기: 0.85,
  중기: 0.45,
  여기: 0.25,
};

const ROOT_RANK_ORDER: Readonly<Record<DitianshuiRootRank, number>> = {
  정기: 3,
  중기: 2,
  여기: 1,
};

const ROOT_LU_BRANCH: Readonly<Record<HeavenlyStem, EarthlyBranch>> = {
  갑: '인',
  을: '묘',
  병: '사',
  정: '오',
  무: '사',
  기: '오',
  경: '신',
  신: '유',
  임: '해',
  계: '자',
};

const ROOT_BLADE_BRANCH: Readonly<Record<HeavenlyStem, EarthlyBranch>> = {
  갑: '묘',
  을: '인',
  병: '오',
  정: '사',
  무: '오',
  기: '사',
  경: '유',
  신: '신',
  임: '자',
  계: '해',
};

const ROOT_POSITION_FACTOR: Readonly<Record<PositionedStem['position'], number>> = {
  year: 0.6,
  month: 1.2,
  day: 1.0,
  hour: 0.8,
};

const BRANCH_POSITION_LABEL: Readonly<Record<PositionedStem['position'], string>> = {
  year: '연지',
  month: '월지',
  day: '일지',
  hour: '시지',
};

const SUPPORT_TEN_GODS: ReadonlySet<TenGod> = new Set<TenGod>(['비견', '겁재', '정인', '편인']);

function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * 뿌리 구절을 나열한다. 마지막 항목 앞의 공동격 조사는 바로 앞 구절의 받침을 따르는데,
 * 구절이 `일지 인의 갑(정기·건록)` 처럼 괄호로 끝나므로 괄호를 건너뛴 앞말(`갑`)로 판정한다.
 */
function joinRootPhrases(phrases: readonly string[]): string {
  if (phrases.length <= 1) return phrases.join('');
  const head = phrases.slice(0, -1);
  return `${head
    .slice(0, -1)
    .concat(withComitativeParticle(head[head.length - 1]!))
    .join(', ')} ${phrases[phrases.length - 1]!}`;
}

/** 충·형 같은 손상 사유를 `과/와` 로 잇는다. 사유는 `형(사·인)` 처럼 괄호로 끝날 수 있다. */
function joinDamageReasons(reasons: readonly string[]): string {
  return reasons
    .map((reason, index) =>
      index === reasons.length - 1 ? reason : withComitativeParticle(reason),
    )
    .join(' ');
}

interface DitianshuiRoot {
  readonly position: PositionedStem['position'];
  readonly branch: EarthlyBranch;
  readonly stem: HeavenlyStem;
  readonly rank: DitianshuiRootRank;
  readonly kind: '건록' | '왕지' | null;
  readonly base: number;
  readonly positionFactor: number;
  readonly damageFactor: number;
  readonly damageReasons: readonly string[];
  readonly score: number;
}

/**
 * Damage coefficients for a branch that carries a root.  Clash and punishment
 * multiply, so a branch caught by both keeps 0.4 of its weight.  Element
 * substitution by 합화 stays out of scope here: this Pack does not own the
 * combination-resolution doctrine.
 */
const DITIANSHUI_ROOT_DAMAGE_V1 = { clash: 0.5, punishment: 0.8 } as const;

export const DITIANSHUI_DAMAGE_ADJUSTMENT_ID_V1 = 'clash-0.5-punishment-0.8';

interface DitianshuiRootDamage {
  readonly factor: number;
  readonly reasons: readonly string[];
}

function relationshipPartners(
  relationships: readonly {
    readonly positions: readonly [PositionedStem['position'], PositionedStem['position']];
    readonly members: readonly [EarthlyBranch, EarthlyBranch];
  }[],
  position: PositionedStem['position'],
): readonly EarthlyBranch[] {
  return [
    ...new Set(
      relationships
        .filter(({ positions }) => positions.includes(position))
        .map(({ positions, members }) => members[positions[0] === position ? 1 : 0]),
    ),
  ];
}

/** Damage the engine-computed clash and punishment tables put on one pillar. */
function rootDamageAt(
  context: DoctrineRuleContext,
  position: PositionedStem['position'],
): DitianshuiRootDamage {
  const { branchClashes, branchPunishments } = context.structure.relationships;
  const clashed = relationshipPartners(branchClashes, position);
  const punished = relationshipPartners(branchPunishments, position);
  return {
    factor: roundToHundredths(
      (clashed.length === 0 ? 1 : DITIANSHUI_ROOT_DAMAGE_V1.clash) *
        (punished.length === 0 ? 1 : DITIANSHUI_ROOT_DAMAGE_V1.punishment),
    ),
    reasons: [
      ...(clashed.length === 0 ? [] : [`충(${clashed.join('·')})`]),
      ...(punished.length === 0 ? [] : [`형(${punished.join('·')})`]),
    ],
  };
}

interface DitianshuiRootingLedger {
  readonly roots: readonly DitianshuiRoot[];
  readonly rootScore: number;
  readonly rootGrade: '미통근' | '약근' | '유근';
}

function computeRootingLedger(context: DoctrineRuleContext): DitianshuiRootingLedger {
  const dayStem = context.pillars.day.stem.korean;
  const dayElement = getHeavenlyStemElement(dayStem);
  const roots: readonly DitianshuiRoot[] = PILLAR_POSITIONS.flatMap((position) => {
    const pillar = context.pillars[position];
    if (pillar === null) return [];
    const branch = pillar.branch.korean;
    const sameElement = DITIANSHUI_ROOT_RANK_V1[branch].filter(
      ({ stem }) => getHeavenlyStemElement(stem) === dayElement,
    );
    if (sameElement.length === 0) return [];
    // One branch contributes one root: its strongest same-element hidden stem.
    const strongest = sameElement.reduce((best, entry) =>
      ROOT_RANK_ORDER[entry.rank] > ROOT_RANK_ORDER[best.rank] ? entry : best,
    );
    const kind =
      ROOT_LU_BRANCH[dayStem] === branch
        ? ('건록' as const)
        : ROOT_BLADE_BRANCH[dayStem] === branch
          ? ('왕지' as const)
          : null;
    const base =
      kind === '건록' ? 1.0 : kind === '왕지' ? 0.95 : ROOT_RANK_STRENGTH[strongest.rank];
    const positionFactor = ROOT_POSITION_FACTOR[position];
    const damage = rootDamageAt(context, position);
    return [
      {
        position,
        branch,
        stem: strongest.stem,
        rank: strongest.rank,
        kind,
        base,
        positionFactor,
        damageFactor: damage.factor,
        damageReasons: damage.reasons,
        score: roundToHundredths(base * positionFactor * damage.factor),
      },
    ];
  });
  const rootScore = roundToHundredths(
    roots.reduce(
      (total, { base, positionFactor, damageFactor }) =>
        total + base * positionFactor * damageFactor,
      0,
    ),
  );
  return {
    roots,
    rootScore,
    rootGrade: rootScore === 0 ? '미통근' : rootScore < 0.85 ? '약근' : '유근',
  };
}

function evaluateRootingLedger(context: DoctrineRuleContext): DoctrineRuleMatch {
  const dayStem = context.pillars.day.stem.korean;
  const dayElement = getHeavenlyStemElement(dayStem);
  const monthBranch = context.pillars.month.branch.korean;
  const { roots, rootScore, rootGrade } = computeRootingLedger(context);
  const gradePhrase =
    rootGrade === '미통근'
      ? '뿌리가 없습니다'
      : rootGrade === '약근'
        ? '뿌리가 있으나 약한 쪽입니다'
        : '뿌리가 뚜렷한 쪽입니다';
  const rootSummary = joinRootPhrases(
    roots.map(
      ({ position, branch, stem, rank, kind }) =>
        `${BRANCH_POSITION_LABEL[position]} ${branch}의 ${stem}(${kind === null ? rank : `${rank}·${kind}`})`,
    ),
  );
  const damagedRoots = roots.filter(({ damageReasons }) => damageReasons.length > 0);
  const damagePhrase =
    damagedRoots.length === 0
      ? '충이나 형에 걸린 뿌리는 없습니다.'
      : damagedRoots
          .map(
            ({ position, branch, damageReasons, damageFactor }) =>
              `${BRANCH_POSITION_LABEL[position]} ${withTopicParticle(branch)} ${joinDamageReasons(damageReasons)}에 걸려 ${damageFactor}배로 봅니다.`,
          )
          .join(' ');
  const omitted = omittedPillars(context.pillars);
  const values = {
    dayMaster: dayStem,
    dayMasterElement: dayElement,
    roots: roots.map(
      ({
        position,
        branch,
        stem,
        rank,
        kind,
        base,
        positionFactor,
        damageFactor,
        damageReasons,
        score,
      }) =>
        ({
          position,
          branch,
          stem,
          rank,
          kind,
          base,
          positionFactor,
          damageFactor,
          damageReasons,
          score,
        }) as JsonValue,
    ),
    rootScore,
    rootGrade,
    table: DITIANSHUI_ROOT_RANK_TABLE_ID_V1,
    damageAdjustment: DITIANSHUI_DAMAGE_ADJUSTMENT_ID_V1,
    damageBasis: 'engine-computed-branch-clashes-and-punishments',
    transformedElementAdjustment: 'not-applied',
  } as const;
  return {
    key: canonicalJsonStringify(values),
    statement:
      (roots.length === 0
        ? `${dayStem}${dayElement} 일간은 어느 지지에서도 같은 기운의 뿌리를 찾지 못했습니다. `
        : `${dayStem}${dayElement} 일간은 ${rootSummary}에 뿌리를 둡니다. `) +
      `${damagePhrase} 손상 보정을 적용한 뿌리 점수는 ${rootScore}, ${gradePhrase}. ` +
      '충은 0.5배, 형은 0.8배로 곱해 적용하며 합화로 지지 오행이 바뀌는 경우는 아직 반영하지 않습니다.',
    topic: 'strength',
    values,
    evidencePaths: ['pillars', 'facts.structure.hiddenStems', 'facts.structure.relationships'],
    sourceReferenceIds: DITIANSHUI_LEDGER_SOURCE_IDS,
    comparison: comparison(
      'ditianshui.rooting-ledger.v1',
      'ditianshui.rooting-ledger',
      'ditianshui-strength-evidence',
      `${dayStem}:${monthBranch}`,
      `${rootGrade}:${rootScore}`,
    ),
    ...(omitted.length === 0 ? {} : { coverage: 'partial' as const, omittedPillars: omitted }),
  };
}

type DitianshuiStrengthFamily = 'strong' | 'medium' | 'weak';

interface DitianshuiStrengthGrade {
  readonly grade: string;
  readonly family: DitianshuiStrengthFamily;
}

/** Candidate grade for the 득령·득지·득세 flag triple; never a final verdict. */
function strengthGradeFor(
  hasMonthCommand: boolean,
  hasDayGround: boolean,
  hasForce: boolean,
): DitianshuiStrengthGrade {
  if (hasMonthCommand && hasDayGround && hasForce) {
    return { grade: '매우 강한 쪽', family: 'strong' };
  }
  if (hasMonthCommand && hasDayGround) return { grade: '강한 쪽', family: 'strong' };
  if (hasMonthCommand && hasForce) return { grade: '강한 쪽', family: 'strong' };
  if (hasDayGround && hasForce) return { grade: '중간에서 강한 쪽', family: 'strong' };
  if (hasMonthCommand) return { grade: '중간', family: 'medium' };
  if (hasDayGround) return { grade: '약한 쪽', family: 'weak' };
  if (hasForce) return { grade: '약한 쪽', family: 'weak' };
  return { grade: '매우 약한 쪽', family: 'weak' };
}

function strengthLeaningFor(
  family: DitianshuiStrengthFamily,
  counts: {
    readonly support: number;
    readonly drain: number;
    readonly wealth: number;
    readonly officer: number;
  },
): string {
  if (family === 'weak') {
    if (counts.officer >= 2 && counts.support >= 1) return '인성으로 눌린 힘을 받아 쓰는 쪽';
    if (counts.officer >= 2) return '기대는 자리가 없어 관성에 그대로 눌리는 쪽';
    if (counts.wealth >= 3) return '비겁으로 재성을 나눠 감당하는 쪽';
    if (counts.drain >= 3) return '인성으로 내보낸 힘을 되받는 쪽';
    return '인성과 비겁 어느 쪽에 기대는지 원국만으로는 한쪽으로 좁혀지지 않는 쪽';
  }
  if (family === 'strong') {
    if (counts.officer >= 1) return '관성으로 먼저 방향을 잡는 쪽';
    if (counts.drain >= 2) return '식상으로 먼저 내보내는 쪽';
    if (counts.wealth >= 2) return '재성으로 먼저 내보내는 쪽';
    return '내보낼 자리가 뚜렷하지 않아 힘이 안에 머무는 쪽';
  }
  return '한쪽으로 크게 기울지 않아 계절과 배치를 함께 봐야 하는 쪽';
}

function evaluateCommandPosition(context: DoctrineRuleContext): DoctrineRuleMatch {
  const dayStem = context.pillars.day.stem.korean;
  const dayElement = getHeavenlyStemElement(dayStem);
  const monthBranch = context.pillars.month.branch.korean;
  const dayBranch = context.pillars.day.branch.korean;
  const monthMainStem = BRANCH_MAIN_STEM[monthBranch];
  const dayMainStem = BRANCH_MAIN_STEM[dayBranch];
  const monthTenGod = getTenGod(dayStem, monthMainStem);
  const dayTenGod = getTenGod(dayStem, dayMainStem);
  const hasMonthCommand = SUPPORT_TEN_GODS.has(monthTenGod);
  const hasDayGround = SUPPORT_TEN_GODS.has(dayTenGod);
  // The day stem is the subject; branches enter through their 정기 only.
  const forceCharacters = [
    ...visibleStemObservations(context.pillars, { includeDay: false }).map(
      ({ position, stem }) => ({ position, stem, origin: 'stem' as const }),
    ),
    ...PILLAR_POSITIONS.flatMap((position) => {
      const pillar = context.pillars[position];
      return pillar === null
        ? []
        : [
            {
              position,
              stem: BRANCH_MAIN_STEM[pillar.branch.korean],
              origin: 'branch-main-stem' as const,
            },
          ];
    }),
  ].map(({ position, stem, origin }) => ({
    position,
    stem,
    origin,
    tenGod: getTenGod(dayStem, stem),
  }));
  const countOf = (predicate: (tenGod: TenGod) => boolean): number =>
    forceCharacters.filter(({ tenGod }) => predicate(tenGod)).length;
  const supportCount = countOf((tenGod) => SUPPORT_TEN_GODS.has(tenGod));
  const drainCount = countOf((tenGod) => tenGod === '식신' || tenGod === '상관');
  const wealthCount = countOf((tenGod) => tenGod === '편재' || tenGod === '정재');
  const officerCount = countOf((tenGod) => tenGod === '정관' || tenGod === '편관');
  const hasForce = supportCount >= 3;
  const { grade, family } = strengthGradeFor(hasMonthCommand, hasDayGround, hasForce);
  const leaning = strengthLeaningFor(family, {
    support: supportCount,
    drain: drainCount,
    wealth: wealthCount,
    officer: officerCount,
  });
  const filledFlags = [hasMonthCommand, hasDayGround, hasForce].filter(Boolean).length;
  const flagSummary =
    filledFlags === 3
      ? '세 자리를 모두 채워'
      : filledFlags === 2
        ? '세 자리 가운데 둘을 채워'
        : filledFlags === 1
          ? '세 자리 가운데 하나만 채워'
          : '세 자리 모두 비어';
  const omitted = omittedPillars(context.pillars);
  const values = {
    hasMonthCommand,
    hasDayGround,
    hasForce,
    supportCount,
    drainCount,
    wealthCount,
    officerCount,
    grade,
    leaning,
    basisPositions: {
      monthCommand: { branch: monthBranch, mainStem: monthMainStem, tenGod: monthTenGod },
      dayGround: { branch: dayBranch, mainStem: dayMainStem, tenGod: dayTenGod },
      force: {
        characterCount: forceCharacters.length,
        characters: forceCharacters.map(({ position, stem, origin, tenGod }) => ({
          position,
          stem,
          origin,
          tenGod,
        })),
      },
    },
    status: 'strength-grade-candidate-not-final-verdict',
  } as const;
  return {
    key: canonicalJsonStringify(values),
    statement:
      `월지 ${monthBranch}의 정기 ${withTopicParticle(monthMainStem)} 일간 ${dayStem}${dayElement}에게 ${withCopulaClause(monthTenGod)} 월령을 ${hasMonthCommand ? '얻었고' : '얻지 못했고'}, ` +
      `일지 ${dayBranch}의 정기 ${withTopicParticle(dayMainStem)} ${withCopulaClause(dayTenGod)} 일지${hasDayGround ? '는 얻었습니다' : hasMonthCommand ? '는 얻지 못했습니다' : '도 얻지 못했습니다'}. ` +
      `일간을 뺀 나머지 ${forceCharacters.length}글자에서 인성·비겁은 ${supportCount}개로 세력${hasForce ? '은 얻었습니다' : hasMonthCommand || hasDayGround ? '은 얻지 못했습니다' : '도 얻지 못했습니다'}. ` +
      `같은 글자에서 식상은 ${drainCount}개, 재성은 ${wealthCount}개, 관성은 ${officerCount}개입니다. ` +
      `${flagSummary} ${grade} 후보이며, ${withAdverbialParticle(leaning)} 봅니다. ` +
      '이 값은 득령·득지·득세 세 자리만 세는 후보 등급이며, 같은 팩의 위치 배점 판정과는 척도가 달라 강약 표현이 어긋날 수 있습니다. ' +
      '유파 간 최종 확정은 하지 않습니다.',
    topic: 'strength',
    values,
    evidencePaths: ['pillars', 'facts.structure.hiddenStems'],
    sourceReferenceIds: DITIANSHUI_LEDGER_SOURCE_IDS,
    comparison: comparison(
      'ditianshui.command-position.v1',
      'ditianshui.command-position',
      'ditianshui-strength-evidence',
      `${dayStem}:${monthBranch}:${dayBranch}`,
      grade,
    ),
    ...(omitted.length === 0 ? {} : { coverage: 'partial' as const, omittedPillars: omitted }),
  };
}

/* -------------------------------------------------------------------------
 * Pack-local strength score model and follow/transform pattern conditions.
 * Both tables below are this Pack's profile, not a cross-school consensus.
 * ---------------------------------------------------------------------- */

export type DitianshuiTenGodGroup = '비겁' | '인성' | '식상' | '재성' | '관살';

const DITIANSHUI_TEN_GOD_GROUPS: readonly DitianshuiTenGodGroup[] = [
  '비겁',
  '인성',
  '식상',
  '재성',
  '관살',
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

function ditianshuiTenGodGroup(tenGod: TenGod): DitianshuiTenGodGroup {
  if (tenGod === '비견' || tenGod === '겁재') return '비겁';
  if (tenGod === '정인' || tenGod === '편인') return '인성';
  if (tenGod === '식신' || tenGod === '상관') return '식상';
  if (tenGod === '정재' || tenGod === '편재') return '재성';
  return '관살';
}

type DitianshuiScoreSlotId =
  | 'yearStem'
  | 'monthStem'
  | 'hourStem'
  | 'yearBranch'
  | 'monthBranch'
  | 'dayBranch'
  | 'hourBranch';

const DITIANSHUI_SCORE_SLOT_IDS: readonly DitianshuiScoreSlotId[] = [
  'yearStem',
  'monthStem',
  'hourStem',
  'yearBranch',
  'monthBranch',
  'dayBranch',
  'hourBranch',
];

// The day stem is the subject of the verdict and carries no score of its own.
const STEM_SLOT_BY_POSITION: Readonly<
  Partial<Record<PositionedStem['position'], DitianshuiScoreSlotId>>
> = {
  year: 'yearStem',
  month: 'monthStem',
  hour: 'hourStem',
};

const BRANCH_SLOT_BY_POSITION: Readonly<Record<PositionedStem['position'], DitianshuiScoreSlotId>> =
  {
    year: 'yearBranch',
    month: 'monthBranch',
    day: 'dayBranch',
    hour: 'hourBranch',
  };

const STEM_POSITION_LABEL: Readonly<Record<PositionedStem['position'], string>> = {
  year: '연간',
  month: '월간',
  day: '일간',
  hour: '시간',
};

function requireFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Invalid Ditianshui numeric entry for ${label}.`);
  }
  return value;
}

function requireStemValue(value: unknown, label: string): HeavenlyStem {
  if (!HEAVENLY_STEMS.includes(value as HeavenlyStem)) {
    throw new TypeError(`Invalid Ditianshui stem entry for ${label}.`);
  }
  return value as HeavenlyStem;
}

function requireBranchValue(value: unknown, label: string): EarthlyBranch {
  if (!EARTHLY_BRANCHES.includes(value as EarthlyBranch)) {
    throw new TypeError(`Invalid Ditianshui branch entry for ${label}.`);
  }
  return value as EarthlyBranch;
}

function requireElementValue(value: unknown, label: string): FiveElement {
  if (value === '목' || value === '화' || value === '토' || value === '금' || value === '수') {
    return value;
  }
  throw new TypeError(`Invalid Ditianshui element entry for ${label}.`);
}

function requireGroupValue(value: unknown, label: string): DitianshuiTenGodGroup {
  if (!DITIANSHUI_TEN_GOD_GROUPS.includes(value as DitianshuiTenGodGroup)) {
    throw new TypeError(`Invalid Ditianshui ten-god group entry for ${label}.`);
  }
  return value as DitianshuiTenGodGroup;
}

function requireRankValue(value: unknown, label: string): DitianshuiRootRank {
  if (value !== '정기' && value !== '중기' && value !== '여기') {
    throw new TypeError(`Invalid Ditianshui rank entry for ${label}.`);
  }
  return value;
}

interface DitianshuiStrengthThreshold {
  readonly minimum: number;
  readonly grade: string;
}

interface DitianshuiStrengthScoreTable {
  readonly profileId: string;
  readonly positionPoints: Readonly<Record<DitianshuiScoreSlotId, number>>;
  /** Hidden-stem share by branch entry count, ordered from 정기 downwards. */
  readonly rankShareByCount: Readonly<Record<number, readonly number[]>>;
  readonly supportTenGods: readonly TenGod[];
  readonly thresholds: readonly DitianshuiStrengthThreshold[];
}

function parseRankShare(value: unknown, label: string): readonly number[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`Invalid Ditianshui rank share list for ${label}.`);
  }
  return (value as readonly unknown[])
    .map((entry) => {
      if (!isRecord(entry)) throw new TypeError(`Invalid Ditianshui rank share for ${label}.`);
      return {
        rank: requireRankValue(entry.rank, label),
        share: requireFiniteNumber(entry.share, label),
      };
    })
    .sort((left, right) => ROOT_RANK_ORDER[right.rank] - ROOT_RANK_ORDER[left.rank])
    .map(({ share }) => share);
}

/**
 * Grade lookup takes the first entry whose minimum is met, so the table must be
 * strictly descending and must bottom out at 0; otherwise a table edit would
 * silently return the wrong grade instead of failing.
 */
function parseStrengthThresholds(
  value: readonly unknown[],
): readonly { readonly minimum: number; readonly grade: string }[] {
  const thresholds = value.map((entry) => {
    if (!isRecord(entry) || typeof entry.grade !== 'string') {
      throw new TypeError('Invalid Ditianshui strength threshold entry.');
    }
    return { minimum: requireFiniteNumber(entry.minimum, entry.grade), grade: entry.grade };
  });
  if (thresholds.length === 0) {
    throw new TypeError('Ditianshui strength thresholds must not be empty.');
  }
  thresholds.forEach((entry, index) => {
    const previous = thresholds[index - 1];
    if (previous !== undefined && previous.minimum <= entry.minimum) {
      throw new TypeError(
        `Ditianshui strength thresholds must be strictly descending (${previous.grade} → ${entry.grade}).`,
      );
    }
  });
  if (thresholds[thresholds.length - 1]!.minimum !== 0) {
    throw new TypeError('Ditianshui strength thresholds must end at minimum 0.');
  }
  return thresholds;
}

function parseStrengthScoreTable(value: unknown): DitianshuiStrengthScoreTable {
  if (
    !isRecord(value) ||
    value.schemaVersion !== '1' ||
    typeof value.profileId !== 'string' ||
    !isRecord(value.positionPoints) ||
    !isRecord(value.rankShare) ||
    !Array.isArray(value.supportTenGods) ||
    !Array.isArray(value.thresholds)
  ) {
    throw new TypeError('Invalid Ditianshui strength score table.');
  }
  const positionPoints = value.positionPoints;
  const rankShare = value.rankShare;
  return {
    profileId: value.profileId,
    positionPoints: Object.fromEntries(
      DITIANSHUI_SCORE_SLOT_IDS.map((slot) => [
        slot,
        requireFiniteNumber(positionPoints[slot], slot),
      ]),
    ) as Readonly<Record<DitianshuiScoreSlotId, number>>,
    rankShareByCount: {
      1: parseRankShare(rankShare.one, 'one'),
      2: parseRankShare(rankShare.two, 'two'),
      3: parseRankShare(rankShare.three, 'three'),
    },
    supportTenGods: (value.supportTenGods as readonly unknown[]).map((entry) => {
      if (!TEN_GOD_NAMES.includes(entry as TenGod)) {
        throw new TypeError('Invalid Ditianshui support ten-god entry.');
      }
      return entry as TenGod;
    }),
    thresholds: parseStrengthThresholds(value.thresholds),
  };
}

/** Position-weighted 100-point strength profile owned by this Pack. */
export const DITIANSHUI_STRENGTH_SCORE_V1: DitianshuiStrengthScoreTable = deepFreeze(
  parseStrengthScoreTable(strengthScoreTable),
);

export const DITIANSHUI_STRENGTH_SCORE_PROFILE_ID_V1 = DITIANSHUI_STRENGTH_SCORE_V1.profileId;

export interface DitianshuiStrengthEntry {
  readonly slot: DitianshuiScoreSlotId;
  readonly position: PositionedStem['position'];
  readonly origin: 'stem' | 'hidden-stem';
  readonly stem: HeavenlyStem;
  readonly rank: DitianshuiRootRank | null;
  readonly tenGod: TenGod;
  readonly group: DitianshuiTenGodGroup;
  readonly points: number;
}

export interface DitianshuiStrengthScore {
  readonly entries: readonly DitianshuiStrengthEntry[];
  readonly declaredTotal: number;
  readonly normalizationFactor: number;
  readonly supportScore: number;
  readonly groupScores: Readonly<Record<DitianshuiTenGodGroup, number>>;
  readonly grade: string;
  readonly coverage: 'complete' | 'partial';
}

function computeStrengthScore(context: DoctrineRuleContext): DitianshuiStrengthScore {
  const table = DITIANSHUI_STRENGTH_SCORE_V1;
  const dayStem = context.pillars.day.stem.korean;
  const raw = PILLAR_POSITIONS.flatMap((position) => {
    const pillar = context.pillars[position];
    if (pillar === null) return [];
    const branchSlot = BRANCH_SLOT_BY_POSITION[position];
    const branch = pillar.branch.korean;
    const rankEntries = [...DITIANSHUI_ROOT_RANK_V1[branch]].sort(
      (left, right) => ROOT_RANK_ORDER[right.rank] - ROOT_RANK_ORDER[left.rank],
    );
    const shares = table.rankShareByCount[rankEntries.length];
    if (shares === undefined || shares.length !== rankEntries.length) {
      throw new TypeError(`No Ditianshui rank share declared for branch ${branch}.`);
    }
    const stemSlot = STEM_SLOT_BY_POSITION[position];
    const stemEntries =
      stemSlot === undefined
        ? []
        : [
            {
              slot: stemSlot,
              position,
              origin: 'stem' as const,
              stem: pillar.stem.korean,
              rank: null,
              points: table.positionPoints[stemSlot],
            },
          ];
    return [
      ...stemEntries,
      ...rankEntries.map(({ stem, rank }, index) => ({
        slot: branchSlot,
        position,
        origin: 'hidden-stem' as const,
        stem,
        rank,
        points: table.positionPoints[branchSlot] * shares[index]!,
      })),
    ];
  });
  const declaredTotal = [...new Set(raw.map(({ slot }) => slot))].reduce(
    (total, slot) => total + table.positionPoints[slot],
    0,
  );
  if (declaredTotal <= 0) throw new TypeError('Ditianshui strength score has no declared slots.');
  const normalizationFactor = 100 / declaredTotal;
  const entries: readonly DitianshuiStrengthEntry[] = raw.map((entry) => {
    const tenGod = getTenGod(dayStem, entry.stem);
    return {
      slot: entry.slot,
      position: entry.position,
      origin: entry.origin,
      stem: entry.stem,
      rank: entry.rank,
      tenGod,
      group: ditianshuiTenGodGroup(tenGod),
      points: roundToHundredths(entry.points * normalizationFactor),
    };
  });
  const rawPointsOf = (index: number): number => raw[index]!.points * normalizationFactor;
  const supportScore = roundToHundredths(
    entries.reduce(
      (total, { tenGod }, index) =>
        table.supportTenGods.includes(tenGod) ? total + rawPointsOf(index) : total,
      0,
    ),
  );
  const groupScores = Object.fromEntries(
    DITIANSHUI_TEN_GOD_GROUPS.map((group) => [
      group,
      roundToHundredths(
        entries.reduce(
          (total, entry, index) => (entry.group === group ? total + rawPointsOf(index) : total),
          0,
        ),
      ),
    ]),
  ) as Readonly<Record<DitianshuiTenGodGroup, number>>;
  const threshold = table.thresholds.find(({ minimum }) => supportScore >= minimum);
  return {
    entries,
    declaredTotal,
    normalizationFactor: roundToHundredths(normalizationFactor),
    supportScore,
    groupScores,
    grade: threshold?.grade ?? table.thresholds[table.thresholds.length - 1]!.grade,
    coverage: omittedPillars(context.pillars).length === 0 ? 'complete' : 'partial',
  };
}

function groupScorePhrase(groupScores: Readonly<Record<DitianshuiTenGodGroup, number>>): string {
  return DITIANSHUI_TEN_GOD_GROUPS.map((group) => `${group} ${groupScores[group]}`).join('·');
}

function evaluateStrengthVerdict(context: DoctrineRuleContext): DoctrineRuleMatch {
  const dayStem = context.pillars.day.stem.korean;
  const dayElement = getHeavenlyStemElement(dayStem);
  const monthBranch = context.pillars.month.branch.korean;
  const score = computeStrengthScore(context);
  const omitted = omittedPillars(context.pillars);
  const values = {
    dayMaster: dayStem,
    dayMasterElement: dayElement,
    strengthScoreProfile: DITIANSHUI_STRENGTH_SCORE_PROFILE_ID_V1,
    positionPoints: DITIANSHUI_STRENGTH_SCORE_V1.positionPoints as unknown as JsonValue,
    thresholds: DITIANSHUI_STRENGTH_SCORE_V1.thresholds as unknown as JsonValue,
    supportTenGods: DITIANSHUI_STRENGTH_SCORE_V1.supportTenGods as unknown as JsonValue,
    supportScore: score.supportScore,
    grade: score.grade,
    groupScores: score.groupScores as unknown as JsonValue,
    declaredTotal: score.declaredTotal,
    normalizationFactor: score.normalizationFactor,
    entries: score.entries as unknown as JsonValue,
    profileDivergence: 'position-weights-and-thresholds-differ-by-school',
    status: 'pack-local-strength-verdict-not-cross-school-final',
  } as const;
  return {
    key: canonicalJsonStringify(values),
    statement:
      `적천수 관법의 위치 배점으로 계산하면 일간 ${dayStem}${dayElement}에게 힘을 보태는 자리는 100점 가운데 ${score.supportScore}점입니다. ` +
      `그룹별로는 ${groupScorePhrase(score.groupScores)}점입니다. ` +
      `이 팩 기준으로는 ${withAdverbialParticle(score.grade)} 봅니다. ` +
      (score.coverage === 'partial'
        ? '시주를 몰라 시지와 시간 배점을 빼고 나머지를 100으로 환산했습니다. '
        : '') +
      '배점표와 임계값은 이 팩의 프로파일이며 유파마다 다릅니다. 유파 간 최종 신강·신약은 확정하지 않습니다.',
    topic: 'strength',
    values,
    evidencePaths: ['pillars', 'facts.structure.hiddenStems'],
    sourceReferenceIds: DITIANSHUI_LEDGER_SOURCE_IDS,
    comparison: comparison(
      'ditianshui.strength-verdict.v1',
      'ditianshui.strength-verdict',
      'ditianshui-strength-evidence',
      `${dayStem}:${monthBranch}`,
      `${score.grade}:${score.supportScore}`,
    ),
    ...(omitted.length === 0 ? {} : { coverage: 'partial' as const, omittedPillars: omitted }),
  };
}

/* ---------------------- follow / transform patterns --------------------- */

type DitianshuiRootingCondition = 'rooted' | 'rootless' | 'any';

interface DitianshuiFollowPattern {
  readonly name: string;
  readonly dominantGroup: DitianshuiTenGodGroup;
  readonly blockingGroups: readonly DitianshuiTenGodGroup[];
  readonly rooting: DitianshuiRootingCondition;
}

interface DitianshuiStemTransform {
  readonly pair: readonly [HeavenlyStem, HeavenlyStem];
  readonly element: FiveElement;
  readonly monthBranches: readonly EarthlyBranch[];
}

interface DitianshuiDominantElementPattern {
  readonly name: string;
  readonly element: FiveElement;
  readonly bureaus: readonly (readonly EarthlyBranch[])[];
}

interface DitianshuiFollowTransformTable {
  readonly profileId: string;
  readonly dominantGroupMinimum: number;
  readonly rootedMinimum: number;
  readonly pseudoFollowObstructionMaximum: number;
  /**
   * 일행득기격의 관살 상한. 국을 이루는 지지(진술축미·사유축·신자진 …)는 그 자체가
   * 관살 지장간을 품기 때문에 지장간까지 합산한 관살 점수는 결코 0이 되지 않는다.
   * 그래서 관살은 '천간에 투출한 글자'만 세고, 그 점수를 이 상한과 비교한다.
   */
  readonly revealedOfficerMaximum: number;
  readonly followPatterns: readonly DitianshuiFollowPattern[];
  readonly stemTransforms: readonly DitianshuiStemTransform[];
  /** 년간과의 합은 다수설이 화격으로 인정하지 않아 표에서 제외한다. */
  readonly transformPartnerPositions: readonly ('month' | 'hour')[];
  readonly dominantElementPatterns: readonly DitianshuiDominantElementPattern[];
}

function parseFollowTransformTable(value: unknown): DitianshuiFollowTransformTable {
  if (
    !isRecord(value) ||
    value.schemaVersion !== '1' ||
    typeof value.profileId !== 'string' ||
    !isRecord(value.thresholds) ||
    !Array.isArray(value.followPatterns) ||
    !Array.isArray(value.stemTransforms) ||
    !Array.isArray(value.transformPartnerPositions) ||
    !Array.isArray(value.dominantElementPatterns)
  ) {
    throw new TypeError('Invalid Ditianshui follow-transform table.');
  }
  const thresholds = value.thresholds;
  return {
    profileId: value.profileId,
    dominantGroupMinimum: requireFiniteNumber(
      thresholds.dominantGroupMinimum,
      'dominantGroupMinimum',
    ),
    rootedMinimum: requireFiniteNumber(thresholds.rootedMinimum, 'rootedMinimum'),
    pseudoFollowObstructionMaximum: requireFiniteNumber(
      thresholds.pseudoFollowObstructionMaximum,
      'pseudoFollowObstructionMaximum',
    ),
    revealedOfficerMaximum: requireFiniteNumber(
      thresholds.revealedOfficerMaximum,
      'revealedOfficerMaximum',
    ),
    followPatterns: (value.followPatterns as readonly unknown[]).map((entry) => {
      if (
        !isRecord(entry) ||
        typeof entry.name !== 'string' ||
        !Array.isArray(entry.blockingGroups) ||
        (entry.rooting !== 'rooted' && entry.rooting !== 'rootless' && entry.rooting !== 'any')
      ) {
        throw new TypeError('Invalid Ditianshui follow pattern entry.');
      }
      const name = entry.name;
      return {
        name,
        dominantGroup: requireGroupValue(entry.dominantGroup, name),
        blockingGroups: (entry.blockingGroups as readonly unknown[]).map((group) =>
          requireGroupValue(group, name),
        ),
        rooting: entry.rooting,
      };
    }),
    stemTransforms: (value.stemTransforms as readonly unknown[]).map((entry) => {
      if (!isRecord(entry) || !Array.isArray(entry.pair) || !Array.isArray(entry.monthBranches)) {
        throw new TypeError('Invalid Ditianshui stem transform entry.');
      }
      const pair = entry.pair as readonly unknown[];
      if (pair.length !== 2) throw new TypeError('Invalid Ditianshui stem transform pair.');
      return {
        pair: [requireStemValue(pair[0], 'pair'), requireStemValue(pair[1], 'pair')] as const,
        element: requireElementValue(entry.element, 'stemTransform'),
        monthBranches: (entry.monthBranches as readonly unknown[]).map((branch) =>
          requireBranchValue(branch, 'stemTransform'),
        ),
      };
    }),
    transformPartnerPositions: (value.transformPartnerPositions as readonly unknown[]).map(
      (position) => {
        if (position !== 'month' && position !== 'hour') {
          throw new TypeError('Invalid Ditianshui transform partner position.');
        }
        return position;
      },
    ),
    dominantElementPatterns: (value.dominantElementPatterns as readonly unknown[]).map((entry) => {
      if (!isRecord(entry) || typeof entry.name !== 'string' || !Array.isArray(entry.bureaus)) {
        throw new TypeError('Invalid Ditianshui dominant-element pattern entry.');
      }
      const name = entry.name;
      return {
        name,
        element: requireElementValue(entry.element, name),
        bureaus: (entry.bureaus as readonly unknown[]).map((bureau) => {
          if (!Array.isArray(bureau)) throw new TypeError('Invalid Ditianshui bureau entry.');
          return (bureau as readonly unknown[]).map((branch) => requireBranchValue(branch, name));
        }),
      };
    }),
  };
}

/** 종격·화격·일행득기격 conditions owned by this Pack. */
export const DITIANSHUI_FOLLOW_TRANSFORM_V1: DitianshuiFollowTransformTable = deepFreeze(
  parseFollowTransformTable(followTransformTable),
);

interface DitianshuiSpecialPattern {
  readonly kind: 'dominant-element' | 'transform' | 'follow';
  readonly name: string;
  readonly state: '성립' | '가종';
  readonly basis: string;
  readonly details: Readonly<Record<string, JsonValue>>;
}

function followPatternMatches(
  table: DitianshuiFollowTransformTable,
  groupScores: Readonly<Record<DitianshuiTenGodGroup, number>>,
  rootScore: number,
): readonly DitianshuiSpecialPattern[] {
  return table.followPatterns.flatMap((pattern) => {
    const dominant = groupScores[pattern.dominantGroup];
    if (dominant < table.dominantGroupMinimum) return [];
    const rooted = rootScore > table.rootedMinimum;
    const rootingMet =
      pattern.rooting === 'any' ? true : pattern.rooting === 'rooted' ? rooted : !rooted;
    if (!rootingMet) return [];
    const blockingScore = roundToHundredths(
      pattern.blockingGroups.reduce((total, group) => total + groupScores[group], 0),
    );
    if (blockingScore > table.pseudoFollowObstructionMaximum) return [];
    const blockingPhrase = pattern.blockingGroups
      .map((group) => `${group} ${groupScores[group]}점`)
      .join('·');
    const rootingPhrase =
      pattern.rooting === 'any'
        ? ` 일간 뿌리 점수는 ${rootScore}이며, 이 격은 뿌리 유무를 조건으로 따지지 않습니다.`
        : pattern.rooting === 'rooted'
          ? ` 일간 뿌리 점수는 ${rootScore}이며 이 관법의 유근 기준(${table.rootedMinimum} 초과)에 듭니다.`
          : ` 일간 뿌리 점수는 ${rootScore}이며 이 관법의 무근 기준(${table.rootedMinimum} 이하)에 듭니다.`;
    return [
      {
        kind: 'follow' as const,
        name: pattern.name,
        state: blockingScore === 0 ? ('성립' as const) : ('가종' as const),
        basis:
          `${pattern.dominantGroup} 그룹이 100점 가운데 ${dominant}점이고 막는 자리는 ${blockingPhrase}입니다.` +
          rootingPhrase,
        details: {
          dominantGroup: pattern.dominantGroup,
          dominantScore: dominant,
          blockingGroups: [...pattern.blockingGroups],
          blockingScore,
          rooting: pattern.rooting,
          rootScore,
        },
      },
    ];
  });
}

interface DitianshuiTransformCheck {
  readonly partnerPosition: 'month' | 'hour';
  readonly partnerStem: HeavenlyStem;
  readonly combination: string;
  readonly transformElement: FiveElement;
  readonly monthBranchQualified: boolean;
  readonly dayMasterRootless: boolean;
  readonly opposingStems: readonly string[];
  readonly formed: boolean;
}

function transformChecks(
  context: DoctrineRuleContext,
  table: DitianshuiFollowTransformTable,
  rootScore: number,
): readonly DitianshuiTransformCheck[] {
  const dayStem = context.pillars.day.stem.korean;
  const monthBranch = context.pillars.month.branch.korean;
  return table.transformPartnerPositions.flatMap((partnerPosition) => {
    const pillar = context.pillars[partnerPosition];
    if (pillar === null) return [];
    const partnerStem = pillar.stem.korean;
    const transform = table.stemTransforms.find(
      ({ pair }) =>
        (pair[0] === dayStem && pair[1] === partnerStem) ||
        (pair[1] === dayStem && pair[0] === partnerStem),
    );
    if (transform === undefined) return [];
    const monthBranchQualified = transform.monthBranches.includes(monthBranch);
    const dayMasterRootless = rootScore <= table.rootedMinimum;
    // The two combining stems are bound by the combination itself, so only the
    // remaining visible stems can break the transformed element.
    const opposingStems = visibleStemObservations(context.pillars, { includeDay: false })
      .filter(({ position }) => position !== partnerPosition)
      .filter(({ stem }) => ELEMENT_CONTROLS[getHeavenlyStemElement(stem)] === transform.element)
      .map(({ position, stem }) => `${STEM_POSITION_LABEL[position]} ${stem}`);
    return [
      {
        partnerPosition,
        partnerStem,
        combination: `${transform.pair[0]}${transform.pair[1]}합`,
        transformElement: transform.element,
        monthBranchQualified,
        dayMasterRootless,
        opposingStems,
        formed: monthBranchQualified && dayMasterRootless && opposingStems.length === 0,
      },
    ];
  });
}

function transformPatternMatches(
  checks: readonly DitianshuiTransformCheck[],
  monthBranch: EarthlyBranch,
  dayStem: HeavenlyStem,
  rootScore: number,
  rootedMinimum: number,
): readonly DitianshuiSpecialPattern[] {
  return checks
    .filter(({ formed }) => formed)
    .map((check) => ({
      kind: 'transform' as const,
      name: `화격(${check.transformElement})`,
      state: '성립' as const,
      basis:
        `일간 ${withComitativeParticle(dayStem)} ${STEM_POSITION_LABEL[check.partnerPosition]} ${withSubjectParticle(check.partnerStem)} ${check.combination}이고 화신은 ${check.transformElement}입니다. ` +
        `월지 ${withSubjectParticle(monthBranch)} 화신이 설 자리에 들고, 일간 뿌리 점수는 ${rootScore}이며 이 관법의 무근 기준(${rootedMinimum} 이하)에 듭니다. ` +
        '화신을 극하는 천간도 투출하지 않았습니다.',
      details: {
        partnerPosition: check.partnerPosition,
        partnerStem: check.partnerStem,
        combination: check.combination,
        transformElement: check.transformElement,
        monthBranch,
      },
    }));
}

function dominantElementMatches(
  table: DitianshuiFollowTransformTable,
  branches: readonly EarthlyBranch[],
  rootBranches: readonly EarthlyBranch[],
  dayElement: FiveElement,
  officerScore: number,
  revealedOfficerScore: number,
): readonly DitianshuiSpecialPattern[] {
  return table.dominantElementPatterns.flatMap((pattern) => {
    if (pattern.element !== dayElement) return [];
    // 국을 이루는 지지가 관살 지장간을 품는 것은 구조상 피할 수 없으므로,
    // 국을 깨는지는 천간에 투출한 관살만으로 따진다.
    if (revealedOfficerScore > table.revealedOfficerMaximum) return [];
    const bureau = pattern.bureaus.find((members) =>
      members.every((member) => branches.includes(member)),
    );
    if (bureau === undefined) return [];
    if (!rootBranches.some((branch) => bureau.includes(branch))) return [];
    return [
      {
        kind: 'dominant-element' as const,
        name: pattern.name,
        state: '성립' as const,
        basis:
          `지지에 ${withSubjectParticle(bureau.join('·'))} 모두 모여 ${pattern.element} 국을 이루고, 일간 오행도 ${pattern.element}입니다. ` +
          `천간에 투출한 관살은 ${revealedOfficerScore}점으로 이 관법의 상한(${table.revealedOfficerMaximum}점 이하)에 들고, ` +
          `국을 이루는 지지가 품은 지장간 관살(관살 그룹 합계 ${officerScore}점)은 국을 깨는 것으로 보지 않습니다. ` +
          '일간은 그 국의 지지에 통근합니다.',
        details: {
          element: pattern.element,
          bureau: [...bureau],
          officerScore,
          revealedOfficerScore,
          revealedOfficerMaximum: table.revealedOfficerMaximum,
        },
      },
    ];
  });
}

function evaluateFollowTransformPatterns(context: DoctrineRuleContext): DoctrineRuleMatch {
  const table = DITIANSHUI_FOLLOW_TRANSFORM_V1;
  const dayStem = context.pillars.day.stem.korean;
  const dayElement = getHeavenlyStemElement(dayStem);
  const monthBranch = context.pillars.month.branch.korean;
  const { roots, rootScore } = computeRootingLedger(context);
  const { groupScores, entries } = computeStrengthScore(context);
  const revealedOfficerScore = roundToHundredths(
    entries
      .filter(({ origin, group }) => origin === 'stem' && group === '관살')
      .reduce((total, { points }) => total + points, 0),
  );
  const branches = PILLAR_POSITIONS.flatMap((position) => {
    const pillar = context.pillars[position];
    return pillar === null ? [] : [pillar.branch.korean];
  });
  const checks = transformChecks(context, table, rootScore);
  // Declared precedence: the most restrictive shape is named first.
  const patterns: readonly DitianshuiSpecialPattern[] = [
    ...dominantElementMatches(
      table,
      branches,
      roots.map(({ branch }) => branch),
      dayElement,
      groupScores['관살'],
      revealedOfficerScore,
    ),
    ...transformPatternMatches(checks, monthBranch, dayStem, rootScore, table.rootedMinimum),
    ...followPatternMatches(table, groupScores, rootScore),
  ];
  const primary = patterns[0];
  const others = patterns.slice(1);
  const omitted = omittedPillars(context.pillars);
  const values = {
    dayMaster: dayStem,
    dayMasterElement: dayElement,
    rootScore,
    groupScores: groupScores as unknown as JsonValue,
    patterns: patterns.map(
      ({ kind, name, state, basis, details }) =>
        ({ kind, name, state, basis, details }) as unknown as JsonValue,
    ),
    primaryPattern: primary === undefined ? null : primary.name,
    verdict: primary === undefined ? '정격' : primary.state === '가종' ? '가종' : '성립',
    transformChecks: checks as unknown as JsonValue,
    thresholds: {
      dominantGroupMinimum: table.dominantGroupMinimum,
      rootedMinimum: table.rootedMinimum,
      pseudoFollowObstructionMaximum: table.pseudoFollowObstructionMaximum,
      revealedOfficerMaximum: table.revealedOfficerMaximum,
    },
    revealedOfficerScore,
    followTransformProfile: table.profileId,
    transformPartnerPositions: [...table.transformPartnerPositions],
    patternPrecedence: 'dominant-element-then-transform-then-follow',
    status: 'pack-local-pattern-no-fortune-meaning',
  } as const;
  return {
    key: canonicalJsonStringify(values),
    statement:
      `${dayStem}${dayElement} 일간의 그룹 점수는 ${groupScorePhrase(groupScores)}점이고 손상 보정을 적용한 뿌리 점수는 ${rootScore}입니다. ` +
      (primary === undefined
        ? '이 관법의 종격·화격·일행득기격 조건에는 어느 것도 닿지 않아 정격으로 봅니다. '
        : `${withAdverbialParticle(primary.state === '가종' ? `${primary.name} 가종 후보` : primary.name)} 봅니다. ${primary.basis} ` +
          (others.length === 0
            ? ''
            : `같은 조건에서 ${others.map(({ name }) => name).join('·')}도 함께 잡힙니다. `)) +
      '조건과 임계값은 이 팩의 프로파일이며 유파마다 다릅니다. 길흉이나 사건 의미는 붙이지 않습니다.',
    topic: 'strength',
    values,
    evidencePaths: ['pillars', 'facts.structure.hiddenStems', 'facts.structure.relationships'],
    sourceReferenceIds: DITIANSHUI_LEDGER_SOURCE_IDS,
    comparison: comparison(
      'ditianshui.follow-transform-patterns.v1',
      'ditianshui.follow-transform-patterns',
      'ditianshui-strength-evidence',
      `${dayStem}:${monthBranch}`,
      primary === undefined ? '정격' : `${primary.name}:${primary.state}`,
    ),
    ...(omitted.length === 0 ? {} : { coverage: 'partial' as const, omittedPillars: omitted }),
  };
}
