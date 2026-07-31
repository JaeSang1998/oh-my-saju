/** Tradition runtime behavior tests. */
import { describe, expect, test } from 'vitest';
import { calculateSaju } from 'saju-engine';
import {
  COMMON_STRUCTURAL_PROFILE_V1,
  PROFILE_LIMITATIONS_V1,
  calculateSajuInterpretation,
} from '../traditions';
import { evaluateSajuInterpretation } from './evaluate';

const EXACT_REQUEST = {
  birth: {
    date: { calendar: 'gregorian' as const, year: 1992, month: 10, day: 24 },
    time: { hour: 5, minute: 30 },
    timeZone: 'Asia/Seoul',
  },
};

describe('evaluateSajuInterpretation — exact chart', () => {
  test('공개 API는 계산과 해석을 한 신뢰 경계 안에서 수행한다', () => {
    const result = calculateSajuInterpretation(
      { kind: 'exact', request: EXACT_REQUEST },
      { profile: COMMON_STRUCTURAL_PROFILE_V1 },
    );

    expect(result.schemaVersion).toBe('2');
    expect(result.calculationKind).toBe('exact');
    expect(result.calculation.pillars.day.korean).toBe('계유');
    expect(result.interpretation.subject).toMatchObject({
      kind: 'exact',
      hourPillar: 'known',
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  test('공개 API의 possibilities 경로는 생시 미상 삼주를 그대로 평가한다', () => {
    const result = calculateSajuInterpretation(
      {
        kind: 'possibilities',
        request: {
          birth: {
            date: EXACT_REQUEST.birth.date,
            time: { kind: 'unknown' },
            timeZone: 'Asia/Seoul',
          },
        },
      },
      { profile: COMMON_STRUCTURAL_PROFILE_V1 },
    );

    expect(result.schemaVersion).toBe('2');
    expect(result.calculationKind).toBe('possibilities');
    expect(result.calculation.hourPillar).toBe('omitted');
    expect(result.interpretation.subject.hourPillar).toBe('omitted');
    expect(
      result.interpretation.findings.some(
        ({ ruleId, coverage }) => ruleId === 'core.element-balance' && coverage === 'partial',
      ),
    ).toBe(true);
  });

  test('같은 보고서와 프로필은 근거가 연결된 동일한 평가를 만든다', () => {
    const report = calculateSaju(EXACT_REQUEST);
    const first = evaluateSajuInterpretation(report, {
      profile: COMMON_STRUCTURAL_PROFILE_V1,
    });
    const second = evaluateSajuInterpretation(report, {
      profile: COMMON_STRUCTURAL_PROFILE_V1,
    });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      schemaVersion: '2',
      profile: {
        id: 'common-structural',
        version: '1.1.0',
        school: 'cross-school-common',
      },
      subject: {
        kind: 'exact',
        candidateCount: 1,
        hourPillar: 'known',
      },
      audit: {
        evaluationMethod: 'candidate-set-intersection-v1',
        supportDurationsAreProbabilities: false,
      },
    });

    const dayMaster = first.findings.find((finding) => finding.ruleId === 'core.day-master');
    expect(dayMaster).toMatchObject({
      topic: 'day-master',
      category: 'structural-observation',
      stability: 'stable',
      values: {
        stem: '계',
        hanja: '癸',
        element: '수',
        yinYang: '음',
      },
      candidateIds: ['exact'],
      absentCandidateIds: [],
    });
    expect(dayMaster?.statement).toBe('일간은 계(癸)이며 음의 수입니다.');

    const relationships = first.findings.find((finding) => finding.ruleId === 'core.relationships');
    expect(relationships?.values.matches).toEqual(
      expect.arrayContaining([
        {
          relation: 'stem-combination',
          positions: ['month', 'hour'],
          members: ['경', '을'],
        },
        {
          relation: 'branch-combination',
          positions: ['month', 'hour'],
          members: ['술', '묘'],
        },
        {
          relation: 'branch-clash',
          positions: ['day', 'hour'],
          members: ['유', '묘'],
        },
        {
          relation: 'branch-harm',
          positions: ['month', 'day'],
          members: ['술', '유'],
        },
      ]),
    );
    expect(relationships?.statement).toContain('월-시 천간합:경을');
    expect(relationships?.statement).toContain('일-시 지지충:유묘');
    expect(relationships?.statement).toContain('합·충·형·파·해·삼합 표와 대조한 결과는');

    expect(PROFILE_LIMITATIONS_V1['raw-relationships-no-fortune']).toBe(
      '합·충·형·파·해·삼합 가운데 기둥 위치가 일치하는 관계만 보여 줍니다. 성립 강도와 길흉은 판단하지 않습니다.',
    );

    const sourceIds = new Set(first.profile.references.map((reference) => reference.id));
    for (const finding of first.findings) {
      expect(finding.id).toContain(`${first.profile.id}@${first.profile.version}`);
      expect(finding.evidence.length).toBeGreaterThan(0);
      expect(finding.sourceReferenceIds.length).toBeGreaterThan(0);
      expect(finding.sourceReferenceIds.every((id) => sourceIds.has(id))).toBe(true);
    }

    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.findings)).toBe(true);
    expect(Object.isFrozen(first.findings[0])).toBe(true);
  });
});
