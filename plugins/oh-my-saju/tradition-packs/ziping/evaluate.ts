import type { EarthlyBranch, HeavenlyStem, TenGod } from 'saju-engine';
import { canonicalJsonStringify } from '../../runtime/internal/canonical-json';
/** Deterministic helper for the Ziping Pack. */
import { BRANCH_MAIN_STEM, HIDDEN_STEMS, getTenGod } from '../../runtime/traditions/domain';
import type { InterpretationRuleId } from '../../runtime/traditions/types';
import {
  comparison,
  omittedPillars,
  PILLAR_POSITION_LABEL,
  visibleStemObservations,
} from '../../runtime/traditions/rule-helpers';
import type {
  DoctrineRuleContext,
  DoctrineRuleMatch,
} from '../../runtime/traditions/rule-evaluator-types';

const ZIPING_SOURCE_IDS = [
  'ziping-zhenquan-month-command-v1',
  'oh-my-saju-ziping-reconstruction-v1',
] as const;

const LU_BRANCH: Readonly<Record<HeavenlyStem, EarthlyBranch>> = {
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

const YANG_BLADE_BRANCH: Readonly<Partial<Record<HeavenlyStem, EarthlyBranch>>> = {
  갑: '묘',
  병: '오',
  무: '오',
  경: '유',
  임: '자',
};

const PATTERN_FOR_TEN_GOD: Readonly<Record<TenGod, string>> = {
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

function zipingPattern(dayStem: HeavenlyStem, sourceStem: HeavenlyStem): string {
  return PATTERN_FOR_TEN_GOD[getTenGod(dayStem, sourceStem)];
}

function zipingSpecialMonthPattern(
  dayStem: HeavenlyStem,
  monthBranch: EarthlyBranch,
): '건록격' | '양인격' | null {
  if (LU_BRANCH[dayStem] === monthBranch) return '건록격';
  if (YANG_BLADE_BRANCH[dayStem] === monthBranch) return '양인격';
  return null;
}

export function evaluateZipingPackRule(
  ruleId: Extract<InterpretationRuleId, 'ziping.month-command' | 'ziping.pattern-candidate'>,
  context: DoctrineRuleContext,
): DoctrineRuleMatch {
  const dayStem = context.pillars.day.stem.korean;
  const monthBranch = context.pillars.month.branch.korean;
  const monthHiddenStems = HIDDEN_STEMS[monthBranch].map(({ stem }) => stem);
  const mainHiddenStem = BRANCH_MAIN_STEM[monthBranch];
  const subjectKey = `${dayStem}:${monthBranch}`;
  const omitted = omittedPillars(context.pillars);

  if (ruleId === 'ziping.month-command') {
    const values = {
      dayMaster: dayStem,
      monthBranch,
      hiddenStems: monthHiddenStems,
      mainHiddenStem,
      governingStem: null,
      status: 'month-command-evidence-not-final',
    } as const;
    return {
      key: canonicalJsonStringify(values),
      statement:
        `월지 ${monthBranch}의 지장간은 ${monthHiddenStems.join('·')}이며 본기는 ${mainHiddenStem}입니다. ` +
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

  const exposed = visibleStemObservations(context.pillars, { includeDay: false });
  const patternCandidates = monthHiddenStems.map((sourceStem) => {
    const exposedStemRefs = exposed
      .filter(({ stem }) => stem === sourceStem)
      .map(({ position, stem }) => ({
        position,
        stem,
        evidencePath: `pillars.${position}.stem`,
      }));
    const unresolvedReasons = [
      'governing-day-not-implemented',
      'success-defeat-rescue-rules-not-implemented',
      ...(context.pillars.hour === null && exposedStemRefs.length === 0
        ? ['hour-transparency-unobserved']
        : []),
    ];
    return {
      sourceStem,
      tenGod: getTenGod(dayStem, sourceStem),
      pattern: zipingPattern(dayStem, sourceStem),
      isMainHiddenStem: sourceStem === mainHiddenStem,
      exposedStemRefs,
      status: exposedStemRefs.length > 0 ? 'candidate' : 'indeterminate',
      supportingConditions:
        exposedStemRefs.length > 0 ? ['month-hidden-stem-visible-in-heavenly-stems'] : [],
      defeatingConditions: [],
      rescueConditions: [],
      unresolvedReasons,
      rejectionReason: null,
    } as const;
  });
  const specialMonthPattern = zipingSpecialMonthPattern(dayStem, monthBranch);
  const basePatternCandidate =
    specialMonthPattern === null
      ? null
      : {
          pattern: specialMonthPattern,
          basis: 'day-stem-lu-or-yang-blade-month-branch',
          status: 'candidate',
          unresolvedReasons: ['success-defeat-rescue-rules-not-implemented'],
        };
  const candidatePatterns = [
    ...new Set([
      ...(specialMonthPattern === null ? [] : [specialMonthPattern]),
      ...patternCandidates.map(({ pattern }) => pattern),
    ]),
  ];
  const basePatternSummary =
    basePatternCandidate === null
      ? ''
      : `${basePatternCandidate.pattern}(월지·일간 관계의 기초 후보); `;
  const candidateSummary = patternCandidates
    .map(({ pattern, sourceStem, exposedStemRefs, status }) => {
      const transparency =
        exposedStemRefs.length === 0
          ? context.pillars.hour === null
            ? '삼주에서 투간을 찾지 못함·시주 미상'
            : '투간 없음'
          : `투간 ${exposedStemRefs.map(({ position }) => PILLAR_POSITION_LABEL[position]).join('·')}`;
      const statusLabel = status === 'candidate' ? '후보' : '미정';
      return `${pattern}(${sourceStem}, ${transparency}, ${statusLabel})`;
    })
    .join('; ');
  const values = {
    dayMaster: dayStem,
    monthBranch,
    mainHiddenStem,
    candidateSourceStems: monthHiddenStems,
    candidatePatterns,
    candidateOrderMeaning: 'hidden-stem-table-order-not-strength-or-priority',
    basePatternCandidate,
    patternCandidates,
    rejectedCandidates: [],
    finalPattern: null,
    status: 'candidates-with-explicit-indeterminacy',
  } as const;
  return {
    key: canonicalJsonStringify(values),
    statement:
      `자평 월령 규칙에서 나온 격국 후보는 ${basePatternSummary}${candidateSummary}이며 순위는 매기지 않았습니다. ` +
      '각 후보가 천간에 드러났는지는 기록했습니다. 다만 사령·회지·성패·구응 규칙을 모두 적용하지 않아 최종 격국은 정하지 않습니다.',
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
