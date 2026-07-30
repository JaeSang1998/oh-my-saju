/** Non-voting Pack comparison tests. */
import { describe, expect, test } from 'vitest';
import {
  DEFAULT_KOREAN_TRADITION_PACK_REFS_V1,
  QIONGTONG_CLIMATE_PROFILE_V1,
  calculateSajuInterpretation,
  calculateSajuSchoolComparison,
  listTraditionPacks,
  type TraditionPackRef,
} from '../traditions';
import { classifySchoolComparisonCoordinates } from './calculate-school-comparison';
import type { FindingComparisonCoordinate } from './types';

const EXACT_CALCULATION = {
  kind: 'exact' as const,
  request: {
    birth: {
      date: { calendar: 'gregorian' as const, year: 1996, month: 5, day: 27 },
      time: { hour: 6, minute: 50 },
      timeZone: 'Asia/Seoul',
    },
  },
};

const ZIPING: TraditionPackRef = { id: 'ziping', version: '1.0.0' };
const DITIANSHUI: TraditionPackRef = {
  id: 'ditianshui',
  version: '1.0.0',
};
const QIONGTONG: TraditionPackRef = { id: 'qiongtong', version: '1.0.0' };

function coordinate(
  outcomeKey: string,
  patch: Partial<FindingComparisonCoordinate> = {},
): FindingComparisonCoordinate {
  return {
    definitionId: 'same-definition.v1',
    conceptId: 'fixture-concept',
    methodId: 'fixture-method',
    subjectKey: 'same-subject',
    outcomeKey,
    ...patch,
  };
}

describe('Tradition Pack catalog', () => {
  test('한국 기본 순서를 예측 정확도가 아닌 출전·재현성·채택 근거 축으로 공개한다', () => {
    const catalog = listTraditionPacks();

    expect(catalog.map(({ packRef }) => packRef)).toEqual(DEFAULT_KOREAN_TRADITION_PACK_REFS_V1);
    expect(catalog.map(({ packRef }) => packRef.id)).toEqual([
      'calculation-baseline',
      'ziping',
      'ditianshui',
      'qiongtong',
      'sanming-symbolic-curated',
    ]);
    expect(catalog.every(({ assurance }) => assurance.release === 'stable')).toBe(true);
    expect(
      catalog.every(({ assurance }) => assurance.predictiveValidity === 'not-established'),
    ).toBe(true);
    expect(catalog.map(({ maturity }) => maturity)).toEqual([
      {
        runtime: 'stable',
        implementation: 'complete-for-declared-output',
        doctrineCoverage: 'not-applicable',
        outputBoundary: 'chart-observation',
        sourceCoverage: {
          status: 'complete',
          verifiedUnits: 11,
          totalUnits: 11,
          unit: 'rules',
        },
        implementedCapabilityIds: [
          'core.day-master',
          'core.pillar-year',
          'core.pillar-month',
          'core.pillar-day',
          'core.pillar-hour',
          'core.element-balance',
          'core.yin-yang-balance',
          'core.ten-gods',
          'core.relationships',
          'core.growth-stages',
          'core.void-branches',
        ],
        unresolvedCapabilityIds: [],
      },
      {
        runtime: 'stable',
        implementation: 'complete-for-declared-output',
        doctrineCoverage: 'partial',
        outputBoundary: 'traditional-candidates',
        sourceCoverage: {
          status: 'partial',
          verifiedUnits: 1,
          totalUnits: 2,
          unit: 'rules',
        },
        implementedCapabilityIds: [
          'ziping.month-hidden-stems',
          'ziping.main-hidden-stem',
          'ziping.surface-transparency',
          'ziping.unranked-pattern-candidates',
          'ziping.lu-yang-blade-base-candidate',
        ],
        unresolvedCapabilityIds: [
          'ziping.governing-days',
          'ziping.success-defeat-rescue',
          'ziping.final-pattern',
          'ziping.useful-god',
        ],
      },
      {
        runtime: 'stable',
        implementation: 'complete-for-declared-output',
        doctrineCoverage: 'partial',
        outputBoundary: 'traditional-evidence',
        sourceCoverage: {
          status: 'partial',
          verifiedUnits: 1,
          totalUnits: 2,
          unit: 'rules',
        },
        implementedCapabilityIds: [
          'sanming.seasonal-state-table',
          'ditianshui.visible-hidden-evidence-ledger',
        ],
        unresolvedCapabilityIds: [
          'ditianshui.evidence-weighting',
          'ditianshui.final-strength',
          'ditianshui.follow-transform-patterns',
        ],
      },
      {
        runtime: 'stable',
        implementation: 'complete-for-declared-output',
        doctrineCoverage: 'partial',
        outputBoundary: 'traditional-candidates',
        sourceCoverage: {
          status: 'partial',
          verifiedUnits: 7,
          totalUnits: 120,
          unit: 'cells',
        },
        implementedCapabilityIds: [
          'qiongtong.120-cell-candidate-table',
          'qiongtong.candidate-presence',
          'qiongtong.7-cell-source-audit',
        ],
        unresolvedCapabilityIds: [
          'qiongtong.113-cell-source-audit',
          'qiongtong.condition-evaluation',
          'qiongtong.final-climate-useful-god',
        ],
      },
      {
        runtime: 'stable',
        implementation: 'complete-for-declared-output',
        doctrineCoverage: 'partial',
        outputBoundary: 'traditional-evidence',
        sourceCoverage: {
          status: 'complete',
          verifiedUnits: 15,
          totalUnits: 15,
          unit: 'rules',
        },
        implementedCapabilityIds: [
          'sanming.eight-triad-stars.raw-branch-match',
          'sanming.lonely-widow.raw-branch-match',
          'sanming.heavenly-noble.unsplit-pair',
          'sanming.lu.raw-branch-match',
          'sanming.literary-star.raw-branch-match',
          'sanming.blade-after-lu-all-stems.raw-branch-match',
          'sanming.blade-yang-stems-only.raw-branch-match',
          'sanming.unknown-hour-partial-observation',
        ],
        unresolvedCapabilityIds: [
          'sanming.xianchi-heavenly-stem-nayin-qualification',
          'sanming.blade-variant-selection',
          'sanming.symbolic-star-meaning',
        ],
      },
    ]);
    expect(catalog.every((entry) => !('reliabilityScore' in entry))).toBe(true);
    expect(
      catalog.every(
        ({ contract }) =>
          contract.missingInputBehavior === 'return-unavailable-rule' &&
          contract.fixtureSetIds.length > 0 &&
          /^[a-f0-9]{64}$/.test(contract.reproducibility.rulesArtifact.digest) &&
          /^[a-f0-9]{64}$/.test(contract.reproducibility.fixturesArtifact.digest) &&
          contract.schemaVersion === '1' &&
          !('prohibitedClaims' in contract),
      ),
    ).toBe(true);
    expect(
      catalog
        .slice(1)
        .every(({ contract }) => contract.aiPromptTemplate?.findingsFromOnePackOnly === true),
    ).toBe(true);
    expect(
      catalog
        .slice(1)
        .every(
          ({ execution }) =>
            execution.deterministicGrounding &&
            execution.aiSynthesis === 'optional' &&
            execution.crossPackRawFindingMixing === 'forbidden',
        ),
    ).toBe(true);
    expect(catalog.every((entry) => Object.isFrozen(entry))).toBe(true);
  });
});

describe('calculateSajuSchoolComparison', () => {
  test('동일 원국을 세 문헌 방법으로 독립 평가하고 방법별 결과를 합치지 않는다', () => {
    const result = calculateSajuSchoolComparison(EXACT_CALCULATION, {
      packRefs: [ZIPING, DITIANSHUI, QIONGTONG],
    });

    expect(result.calculation.pillars).toMatchObject({
      year: { korean: '병자' },
      month: { korean: '계사' },
      day: { korean: '갑자' },
      hour: { korean: '정묘' },
    });
    expect(result.packResults.map(({ packRef }) => packRef)).toEqual([
      ZIPING,
      DITIANSHUI,
      QIONGTONG,
    ]);

    const ziping = result.packResults[0]!.interpretation.findings.find(
      ({ ruleId }) => ruleId === 'ziping.pattern-candidate',
    );
    expect(ziping).toMatchObject({
      category: 'traditional-judgment',
      topic: 'pattern',
      stability: 'stable',
      values: {
        monthBranch: '사',
        mainHiddenStem: '병',
        candidateSourceStems: ['병', '무', '경'],
        candidatePatterns: ['식신격', '편재격', '칠살격'],
        candidateOrderMeaning: 'hidden-stem-table-order-not-strength-or-priority',
        patternCandidates: [
          expect.objectContaining({
            sourceStem: '병',
            pattern: '식신격',
            status: 'candidate',
            exposedStemRefs: [
              {
                position: 'year',
                stem: '병',
                evidencePath: 'pillars.year.stem',
              },
            ],
          }),
          expect.objectContaining({
            sourceStem: '무',
            pattern: '편재격',
            status: 'indeterminate',
          }),
          expect.objectContaining({
            sourceStem: '경',
            pattern: '칠살격',
            status: 'indeterminate',
          }),
        ],
        finalPattern: null,
        status: 'candidates-with-explicit-indeterminacy',
      },
      comparison: {
        definitionId: 'ziping.month-command-pattern-candidate.v1',
        methodId: 'ziping-month-command',
      },
    });

    const ditianshui = result.packResults[1]!.interpretation.findings.find(
      ({ ruleId }) => ruleId === 'ditianshui.seasonal-state',
    );
    expect(ditianshui).toMatchObject({
      topic: 'strength',
      values: {
        dayMasterElement: '목',
        monthBranch: '사',
        seasonalState: '휴',
      },
    });
    const supportLedger = result.packResults[1]!.interpretation.findings.find(
      ({ ruleId }) => ruleId === 'ditianshui.support-ledger',
    );
    expect(supportLedger).toMatchObject({
      values: {
        visibleEvidence: {
          resourceSupport: [{ stem: '계', position: 'month', tenGod: '정인' }],
          peerSupport: [],
        },
        excludedSubjectStem: {
          position: 'day',
          stem: '갑',
          reason: 'day-master-is-ledger-subject-not-peer-evidence',
        },
        status: 'evidence-ledger-no-strength-verdict',
      },
    });

    const qiongtong = result.packResults[2]!.interpretation.findings.find(
      ({ ruleId }) => ruleId === 'qiongtong.climate-candidates',
    );
    expect(qiongtong).toMatchObject({
      topic: 'useful-god',
      values: {
        dayMaster: '갑',
        monthBranch: '사',
        candidateStems: ['계', '정'],
        candidateElements: ['수', '화'],
        candidateEvidence: [
          expect.objectContaining({
            stem: '계',
            priority: 'primary',
            visibleLocations: [
              {
                position: 'month',
                evidencePath: 'pillars.month.stem',
              },
            ],
          }),
          expect.objectContaining({
            stem: '정',
            priority: 'secondary',
            visibleLocations: [
              {
                position: 'hour',
                evidencePath: 'pillars.hour.stem',
              },
            ],
          }),
        ],
        source: expect.objectContaining({
          fixtureId: 'climate.jia-si',
          verification: 'source-checked-candidate-order-and-explicit-functions',
          functionAndConditionTranscription: 'source-explicit-functions-and-unresolved-conditions',
        }),
        status: 'source-checked-candidates-functions-conditions-not-final',
      },
      comparison: {
        definitionId: 'qiongtong.climate-candidate-stems.v1',
        methodId: 'qiongtong-climate',
      },
    });

    const usefulGodComparison = result.comparison.rows.find(
      ({ conceptId }) => conceptId === 'useful-god-candidates',
    );
    expect(usefulGodComparison).toMatchObject({
      status: 'insufficient-evidence',
      resolution: 'reported-unresolved',
    });
    expect(usefulGodComparison?.definitionIds).toEqual(['qiongtong.climate-candidate-stems.v1']);
    expect(result.comparison.majorityVoteApplied).toBe(false);
    expect(result.comparison.winnerSelected).toBe(false);
  });

  test('생시 미상에서는 삼주로 계산하고 시주를 보는 규칙은 partial·indeterminate로 둔다', () => {
    const result = calculateSajuSchoolComparison(
      {
        kind: 'possibilities',
        request: {
          birth: {
            date: { calendar: 'gregorian', year: 1996, month: 5, day: 27 },
            time: { kind: 'unknown' },
            timeZone: 'Asia/Seoul',
          },
        },
      },
      { packRefs: [ZIPING, DITIANSHUI, QIONGTONG] },
    );

    const [ziping, ditianshui, qiongtong] = result.packResults;
    const zipingCandidate = ziping?.interpretation.findings.find(
      ({ ruleId }) => ruleId === 'ziping.pattern-candidate',
    );
    expect(zipingCandidate).toMatchObject({
      coverage: 'partial',
      omittedPillars: ['hour'],
      values: {
        patternCandidates: expect.arrayContaining([
          expect.objectContaining({
            sourceStem: '무',
            status: 'indeterminate',
            unresolvedReasons: expect.arrayContaining(['hour-transparency-unobserved']),
          }),
        ]),
      },
    });
    expect(
      ditianshui?.interpretation.findings.find(
        ({ ruleId }) => ruleId === 'ditianshui.support-ledger',
      ),
    ).toMatchObject({
      coverage: 'partial',
      omittedPillars: ['hour'],
      values: {
        excludedSubjectStem: {
          position: 'day',
          stem: '갑',
          reason: 'day-master-is-ledger-subject-not-peer-evidence',
        },
      },
    });
    expect(
      qiongtong?.interpretation.findings.find(
        ({ ruleId }) => ruleId === 'qiongtong.climate-candidates',
      ),
    ).toMatchObject({
      coverage: 'partial',
      omittedPillars: ['hour'],
      values: {
        candidateEvidence: [
          expect.objectContaining({ stem: '계', visibleLocations: [expect.any(Object)] }),
          expect.objectContaining({ stem: '정', visibleLocations: [] }),
        ],
      },
    });
    expect(
      result.packResults.every(
        ({ interpretation }) => interpretation.unavailableRules.length === 0,
      ),
    ).toBe(true);
    expect(result.comparison.supportDurationsAreProbabilities).toBe(false);
  });

  test('중복·미등록·빈 profile ref 집합을 명시적으로 거부한다', () => {
    expect(() => calculateSajuSchoolComparison(EXACT_CALCULATION, { packRefs: [] })).toThrowError(
      expect.objectContaining({ code: 'INVALID_PROFILE_SET' }),
    );
    expect(() =>
      calculateSajuSchoolComparison(EXACT_CALCULATION, { packRefs: [ZIPING, ZIPING] }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE_SET' }));
    expect(() =>
      calculateSajuSchoolComparison(EXACT_CALCULATION, {
        packRefs: [{ id: 'unknown-school', version: '1.0.0' }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'UNKNOWN_PROFILE' }));
  });

  test('Pack 소유 프로필의 출전·규칙·파라미터 위조를 거부한다', () => {
    expect(() =>
      calculateSajuInterpretation(EXACT_CALCULATION, {
        profile: {
          ...QIONGTONG_CLIMATE_PROFILE_V1,
          parameters: {
            ...QIONGTONG_CLIMATE_PROFILE_V1.parameters,
            outputStatus: 'final-useful-god',
          },
        },
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE' }));
  });
});

describe('comparison-coordinate classifier', () => {
  test('근거 부족·완전 일치·부분 일치·불일치·의미 불일치를 구분한다', () => {
    expect(classifySchoolComparisonCoordinates([[coordinate('a')]])).toBe('insufficient-evidence');
    expect(classifySchoolComparisonCoordinates([[coordinate('a')], [coordinate('a')]])).toBe(
      'unanimous-agreement',
    );
    expect(
      classifySchoolComparisonCoordinates([
        [coordinate('a'), coordinate('b')],
        [coordinate('b'), coordinate('c')],
      ]),
    ).toBe('partial-agreement');
    expect(classifySchoolComparisonCoordinates([[coordinate('a')], [coordinate('b')]])).toBe(
      'disagreement',
    );
    expect(
      classifySchoolComparisonCoordinates([
        [coordinate('a')],
        [coordinate('a', { definitionId: 'other-definition.v1' })],
      ]),
    ).toBe('semantic-mismatch');
    expect(
      classifySchoolComparisonCoordinates([
        [coordinate('a')],
        [coordinate('a', { subjectKey: 'other-subject' })],
      ]),
    ).toBe('semantic-mismatch');
  });
});
