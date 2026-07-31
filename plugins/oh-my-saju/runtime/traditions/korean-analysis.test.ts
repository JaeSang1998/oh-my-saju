/** Default installed-Pack assembly tests. */
import { describe, expect, test } from 'vitest';
import { calculateKoreanSajuAnalysis, isSajuInterpretationError } from '../traditions';

const DATE = { calendar: 'gregorian' as const, year: 1996, month: 5, day: 27 };

describe('calculateKoreanSajuAnalysis', () => {
  test('잘못된 facade 입력을 일관된 interpretation 도메인 오류로 변환한다', () => {
    for (const invalid of [null, {}, { kind: 'unknown', request: {} }]) {
      let caught: unknown;
      try {
        calculateKoreanSajuAnalysis(invalid as never);
      } catch (error) {
        caught = error;
      }
      expect(isSajuInterpretationError(caught)).toBe(true);
      expect(caught).toMatchObject({ code: 'INVALID_REQUEST' });
    }
  });

  test('한국 기본 preset으로 계산 사실과 세 계파·출전형 overlay를 분리해 반환한다', () => {
    const result = calculateKoreanSajuAnalysis({
      kind: 'exact',
      request: {
        birth: {
          date: DATE,
          time: { hour: 6, minute: 50 },
          timeZone: 'Asia/Seoul',
        },
      },
    });

    expect(result).toMatchObject({
      schemaVersion: '1',
      calculationKind: 'exact',
      calculation: {
        pillars: {
          year: { korean: '병자' },
          month: { korean: '계사' },
          day: { korean: '갑자' },
          hour: { korean: '정묘' },
        },
      },
      preset: {
        id: 'ko-KR-default-v1',
        baselinePackRef: { id: 'calculation-baseline', version: '1.1.0' },
        traditionPackRefs: [
          { id: 'ziping', version: '1.0.0' },
          { id: 'ditianshui', version: '1.0.0' },
          { id: 'qiongtong', version: '1.0.0' },
          { id: 'sanming-symbolic-curated', version: '1.1.0' },
        ],
        unsupportedDeterministicOutputs: [
          'final-pattern',
          'final-strength',
          'final-useful-god',
          'luck-cycles',
          'personality',
          'event-prediction',
        ],
        predictiveValidity: 'not-established',
      },
      baseline: {
        packRef: { id: 'calculation-baseline', version: '1.1.0' },
      },
    });
    expect(result.doctrines.map(({ packRef }) => packRef.id)).toEqual([
      'ziping',
      'ditianshui',
      'qiongtong',
      'sanming-symbolic-curated',
    ]);
    expect(
      result.preset.packMaturities.every(({ maturity }) => maturity.runtime === 'stable'),
    ).toBe(true);
    expect(result.comparison.winnerSelected).toBe(false);
    expect(result.comparison.majorityVoteApplied).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.preset.packMaturities)).toBe(true);
  });

  test('생시 미상 preset은 정오를 합성하지 않고 삼주·partial 결과를 보존한다', () => {
    const result = calculateKoreanSajuAnalysis({
      kind: 'possibilities',
      request: {
        birth: {
          date: DATE,
          time: { kind: 'unknown' },
          timeZone: 'Asia/Seoul',
        },
      },
    });

    expect(result.calculationKind).toBe('possibilities');
    expect(result.calculation.hourPillar).toBe('omitted');
    expect(result.baseline.interpretation.subject.hourPillar).toBe('omitted');
    expect(
      result.doctrines.every(
        ({ interpretation }) => interpretation.subject.hourPillar === 'omitted',
      ),
    ).toBe(true);
    expect(
      result.doctrines.every(({ interpretation }) =>
        interpretation.findings
          .filter(({ ruleId }) =>
            [
              'ziping.pattern-candidate',
              'ditianshui.support-ledger',
              'qiongtong.climate-candidates',
            ].includes(ruleId),
          )
          .every(
            ({ coverage, omittedPillars }) =>
              coverage === 'partial' && omittedPillars.includes('hour'),
          ),
      ),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toContain('"probability"');
    expect(JSON.stringify(result)).not.toContain('"confidence"');
  });

  test('출전형 신살 overlay를 길흉 해석 없이 기본 분석의 독립 Pack으로 반환한다', () => {
    const result = calculateKoreanSajuAnalysis({
      kind: 'exact',
      request: {
        birth: {
          date: DATE,
          time: { hour: 6, minute: 50 },
          timeZone: 'Asia/Seoul',
        },
      },
    });
    const symbolicPack = result.doctrines.find(
      ({ packRef }) => packRef.id === 'sanming-symbolic-curated',
    );
    const travelHorse = symbolicPack?.interpretation.findings.find(
      ({ ruleId }) => ruleId === 'sanming.travel-horse',
    );

    expect(symbolicPack?.interpretation.profile.knownLimitations).toContain(
      'sanming-symbolic-raw-observation-only',
    );
    expect(travelHorse).toMatchObject({
      topic: 'symbolic-stars',
      category: 'traditional-judgment',
      coverage: 'complete',
      values: {
        symbolicStar: 'travel-horse',
        anchorMethod: 'year-branch-source-literal',
        status: 'raw-absence',
      },
      sourceReferenceIds: ['sanming-tonghui-travel-horse-v1'],
    });
    expect(travelHorse?.statement).not.toMatch(/길|흉|이동|여행|사건|예측/u);
    expect(symbolicPack?.interpretation.findings.map(({ ruleId }) => ruleId)).toEqual([
      'sanming.travel-horse',
      'sanming.general-star',
      'sanming.canopy',
      'sanming.xianchi',
      'sanming.robbery',
      'sanming.lost-spirit',
      'sanming.disaster',
      'sanming.six-misfortune',
      'sanming.lonely',
      'sanming.widow',
      'sanming.heavenly-noble',
      'sanming.lu',
      'sanming.literary-star',
      'sanming.blade-after-lu-all-stems',
      'sanming.blade-yang-stems-only',
    ]);
    expect(result.preset.unsupportedDeterministicOutputs).not.toContain('symbolic-stars');
  });

  test('절입 경계 범위는 양쪽 월주와 계파별 후보를 candidate-dependent로 유지한다', () => {
    const result = calculateKoreanSajuAnalysis({
      kind: 'possibilities',
      request: {
        birth: {
          date: { calendar: 'gregorian', year: 2024, month: 2, day: 4 },
          time: {
            kind: 'range',
            startInclusive: { hour: 17, minute: 26, second: 49, millisecond: 629 },
            endExclusive: { hour: 17, minute: 26, second: 49, millisecond: 631 },
          },
          timeZone: 'Asia/Seoul',
        },
      },
    });

    expect(
      result.calculation.candidates.map(({ pillars }) => [
        pillars.year.korean,
        pillars.month.korean,
      ]),
    ).toEqual([
      ['계묘', '을축'],
      ['갑진', '병인'],
    ]);

    const expectedVariableRules = new Set([
      'ziping.month-command',
      'ziping.pattern-candidate',
      'ditianshui.seasonal-state',
      'ditianshui.support-ledger',
      'qiongtong.climate-candidates',
      'sanming.travel-horse',
    ]);
    for (const { interpretation } of result.doctrines) {
      const variableFindings = interpretation.findings.filter(({ ruleId }) =>
        expectedVariableRules.has(ruleId),
      );
      expect(variableFindings.length).toBeGreaterThan(0);
      expect(variableFindings.every(({ stability }) => stability === 'candidate-dependent')).toBe(
        true,
      );
    }
    expect(result.comparison.winnerSelected).toBe(false);
    expect(result.comparison.majorityVoteApplied).toBe(false);
  });
});
