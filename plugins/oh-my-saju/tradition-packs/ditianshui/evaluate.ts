import type { EarthlyBranch, FiveElement, HeavenlyStem, TenGod } from 'saju-engine';
import { canonicalJsonStringify } from '../../runtime/internal/canonical-json';
import { deepFreeze } from '../../runtime/internal/deep-freeze';
/** Deterministic helper for the Ditianshui Pack. */
import {
  ELEMENT_CONTROLS,
  ELEMENT_GENERATES,
  getHeavenlyStemElement,
  getTenGod,
} from '../../runtime/traditions/domain';
import type { InterpretationRuleId } from '../../runtime/traditions/types';
import {
  comparison,
  hiddenStemObservations,
  omittedPillars,
  visibleStemObservations,
  type PositionedStem,
} from '../../runtime/traditions/rule-helpers';
import type {
  DoctrineRuleContext,
  DoctrineRuleMatch,
} from '../../runtime/traditions/rule-evaluator-types';
import seasonalStateTable from './seasonal-state-table.json';

const DITIANSHUI_SEASONAL_SOURCE_IDS = ['sanming-seasonal-state-table-v1'] as const;
const DITIANSHUI_LEDGER_SOURCE_IDS = [
  'ditianshui-strength-flow-v1',
  'oh-my-saju-ditianshui-evidence-v1',
] as const;

export type DitianshuiSeasonalState = '왕' | '상' | '휴' | '수' | '사';

export const DITIANSHUI_SEASONAL_RULER_BY_MONTH_V1: Readonly<Record<EarthlyBranch, FiveElement>> =
  deepFreeze(
    seasonalStateTable.monthRuler as unknown as Readonly<Record<EarthlyBranch, FiveElement>>,
  );

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
  ruleId: Extract<InterpretationRuleId, 'ditianshui.seasonal-state' | 'ditianshui.support-ledger'>,
  context: DoctrineRuleContext,
): DoctrineRuleMatch {
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
        `${monthBranch}월을 ${rulerElement} 사령으로 보는 명시적 프로필에서 ${dayStem}${dayElement}의 계절 상태는 ${state}입니다. ` +
        '이는 신강·신약의 최종 판정이 아닙니다.',
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
      `계절 상태는 ${state}이고, 표면 장부는 ${ledgerCounts(visibleEvidence)}, 지장간 장부는 ${ledgerCounts(hiddenEvidence)}입니다. ` +
      '가중치나 최종 신강·신약 라벨은 적용하지 않습니다.',
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
