/** Unknown-time Pack evaluation tests. */
import { describe, expect, test } from 'vitest';
import { calculateSajuPossibilities } from 'saju-engine';
import { COMMON_STRUCTURAL_PROFILE_V1 } from '../traditions';
import { evaluateSajuInterpretation } from './evaluate';

const DATE = { calendar: 'gregorian' as const, year: 1992, month: 10, day: 24 };

describe('evaluateSajuInterpretation — uncertain birth time', () => {
  test('생시 미상은 시주를 만들지 않고 삼주 소계와 시주 미정을 함께 반환한다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: DATE,
        time: { kind: 'unknown', reason: 'asked-unknown' },
        timeZone: 'Asia/Seoul',
      },
    });
    const assessment = evaluateSajuInterpretation(report, {
      profile: COMMON_STRUCTURAL_PROFILE_V1,
    });

    expect(assessment.subject).toMatchObject({
      kind: 'possibilities',
      hourPillar: 'omitted',
    });
    expect(assessment.findings.some((finding) => finding.ruleId === 'core.pillar-hour')).toBe(
      false,
    );
    expect(assessment.unavailableRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'core.pillar-hour',
          reason: 'missing-required-pillar',
          missingPillars: ['hour'],
        }),
      ]),
    );
    expect(
      assessment.unavailableRules.some(({ ruleId }) => ruleId === 'core.element-balance'),
    ).toBe(false);
    for (const ruleId of [
      'core.element-balance',
      'core.yin-yang-balance',
      'core.ten-gods',
      'core.relationships',
    ] as const) {
      expect(assessment.findings.find((finding) => finding.ruleId === ruleId)).toMatchObject({
        stability: 'stable',
        coverage: 'partial',
        omittedPillars: ['hour'],
      });
    }
    expect(
      assessment.findings.find((finding) => finding.ruleId === 'core.element-balance')?.statement,
    ).toMatch(
      /^확인된 연주·월주·일주에서 지장간 가중치를 반영한 오행 소계는 .+입니다\. 시주는 포함하지 않았습니다\.$/u,
    );

    const dayMaster = assessment.findings.find((finding) => finding.ruleId === 'core.day-master');
    expect(dayMaster).toMatchObject({
      stability: 'stable',
      coverage: 'complete',
      omittedPillars: [],
    });
    expect(
      assessment.findings
        .flatMap(({ evidence }) => evidence)
        .filter(({ source }) => source === 'derived-from-candidate-pillars')
        .every(({ path }) => path.startsWith('pillars.')),
    ).toBe(true);
  });

  test('오전 후보의 서로 다른 시주는 확정값이 아니라 candidate-dependent로 남긴다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: DATE,
        time: { kind: 'day-period', period: 'am' },
        timeZone: 'Asia/Seoul',
      },
    });
    const assessment = evaluateSajuInterpretation(report, {
      profile: COMMON_STRUCTURAL_PROFILE_V1,
    });

    const hourFindings = assessment.findings.filter(
      (finding) => finding.ruleId === 'core.pillar-hour',
    );
    expect(assessment.subject.candidateCount).toBeGreaterThan(1);
    expect(hourFindings.length).toBeGreaterThan(1);
    expect(hourFindings.every((finding) => finding.stability === 'candidate-dependent')).toBe(true);
    expect(
      assessment.findings.find((finding) => finding.ruleId === 'core.day-master')?.stability,
    ).toBe('stable');
    expect(JSON.stringify(assessment)).not.toContain('"probability"');
    expect(JSON.stringify(assessment)).not.toContain('"confidence"');
  });
});
