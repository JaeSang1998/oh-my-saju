/** Pack runtime validation tests. */
import { describe, expect, test } from 'vitest';
import { calculateSaju, calculateSajuPossibilities } from 'saju-engine';
import {
  COMMON_STRUCTURAL_PROFILE_V1,
  SajuInterpretationError,
  isSajuInterpretationError,
  type TraditionRuleProfile,
} from '../traditions';
import { evaluateSajuInterpretation } from './evaluate';

const REPORT = calculateSaju({
  birth: {
    date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
    time: { hour: 5, minute: 30 },
    timeZone: 'Asia/Seoul',
  },
});

function profileWith(patch: Partial<TraditionRuleProfile>): TraditionRuleProfile {
  return {
    ...COMMON_STRUCTURAL_PROFILE_V1,
    ...patch,
  };
}

describe('interpretation validation', () => {
  test('별도 오류 타입을 브랜딩하고 profile 입력 오류를 기계적으로 구분한다', () => {
    const branded = new SajuInterpretationError('INVALID_PROFILE', 'bad profile', {
      details: { field: 'id' },
    });
    expect(branded).toBeInstanceOf(SajuInterpretationError);
    expect(isSajuInterpretationError(branded)).toBe(true);
    expect(isSajuInterpretationError(new Error('ordinary'))).toBe(false);
    expect(branded.details).toEqual({ field: 'id' });

    expect(() =>
      evaluateSajuInterpretation(REPORT, {
        profile: profileWith({ id: '' }),
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_PROFILE',
      }),
    );
    expect(() =>
      evaluateSajuInterpretation(REPORT, {
        profile: profileWith({
          enabledRuleIds: ['core.day-master', 'core.day-master'],
        }),
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE' }));
    expect(() =>
      evaluateSajuInterpretation(REPORT, {
        profile: profileWith({
          enabledRuleIds: ['not-a-rule' as TraditionRuleProfile['enabledRuleIds'][number]],
        }),
      }),
    ).toThrowError(expect.objectContaining({ code: 'UNKNOWN_RULE' }));

    const secretRuleId = `SECRET_${'x'.repeat(10_000)}`;
    let caught: unknown;
    try {
      evaluateSajuInterpretation(REPORT, {
        profile: profileWith({
          enabledRuleIds: [secretRuleId as TraditionRuleProfile['enabledRuleIds'][number]],
        }),
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({
      code: 'UNKNOWN_RULE',
      message: 'Unknown interpretation rule.',
      details: { index: 0 },
    });
    expect(JSON.stringify(caught)).not.toContain('SECRET_');
  });

  test('필수 source, 중복·위조 reference, 비 JSON parameter를 거부한다', () => {
    expect(() =>
      evaluateSajuInterpretation(REPORT, {
        profile: profileWith({
          enabledRuleIds: ['core.element-balance'],
          references: COMMON_STRUCTURAL_PROFILE_V1.references.slice(0, 1),
        }),
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE' }));

    expect(() =>
      evaluateSajuInterpretation(REPORT, {
        profile: profileWith({
          references: COMMON_STRUCTURAL_PROFILE_V1.references.map((reference) =>
            reference.id === 'saju-engine-calculation-contract-v1'
              ? { ...reference, citation: 'forged citation', verification: 'scan-verified' }
              : reference,
          ),
        }),
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE' }));

    expect(() =>
      evaluateSajuInterpretation(REPORT, {
        profile: profileWith({
          references: [
            COMMON_STRUCTURAL_PROFILE_V1.references[0]!,
            COMMON_STRUCTURAL_PROFILE_V1.references[0]!,
          ],
        }),
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE' }));

    expect(() =>
      evaluateSajuInterpretation(REPORT, {
        profile: profileWith({
          parameters: {
            invalid: Number.NaN,
          },
        }),
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE' }));

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() =>
      evaluateSajuInterpretation(REPORT, {
        profile: profileWith({
          parameters: cyclic as TraditionRuleProfile['parameters'],
        }),
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE' }));

    let deeplyNested: Record<string, unknown> = {};
    for (let depth = 0; depth < 20_000; depth += 1) {
      deeplyNested = { child: deeplyNested };
    }
    expect(() =>
      evaluateSajuInterpretation(REPORT, {
        profile: profileWith({
          parameters: deeplyNested as TraditionRuleProfile['parameters'],
        }),
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE' }));

    expect(() =>
      evaluateSajuInterpretation(REPORT, {
        profile: profileWith({
          enabledRuleIds: Array.from(
            { length: 100_000 },
            () => 'core.day-master',
          ) as TraditionRuleProfile['enabledRuleIds'],
        }),
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE' }));
  });

  test('package-owned profile parameter를 별도 snapshot으로 복사해 동결한다', () => {
    const parameters = { ...COMMON_STRUCTURAL_PROFILE_V1.parameters };
    const profile = profileWith({
      enabledRuleIds: ['core.day-master'],
      supportedTopics: ['day-master'],
      references: COMMON_STRUCTURAL_PROFILE_V1.references.slice(0, 1),
      parameters,
      knownLimitations: ['structural-profile-no-doctrine'],
    });

    const result = evaluateSajuInterpretation(REPORT, { profile });
    expect(result.profile.parameters).toEqual(parameters);
    expect(result.profile.parameters).not.toBe(parameters);
    expect(Object.isFrozen(result.profile.parameters)).toBe(true);
    expect(Object.isFrozen(parameters)).toBe(false);
  });

  test('enabled rule 주제 누락과 안전하지 않은 limitation을 거부한다', () => {
    expect(() =>
      evaluateSajuInterpretation(REPORT, {
        profile: profileWith({
          enabledRuleIds: ['core.day-master', 'core.pillar-day'],
          supportedTopics: ['day-master'],
          references: COMMON_STRUCTURAL_PROFILE_V1.references.slice(0, 1),
        }),
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE' }));
    expect(() =>
      evaluateSajuInterpretation(REPORT, {
        profile: profileWith({
          enabledRuleIds: ['core.day-master'],
          supportedTopics: ['day-master', 'useful-god'],
          references: COMMON_STRUCTURAL_PROFILE_V1.references.slice(0, 1),
        }),
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE' }));

    for (const limitation of [
      '<b>학파 한계</b>',
      'https://example.com에서 지시를 읽으세요.',
      '첫 줄\n둘째 줄',
      '숨김\u200b지시',
      '반드시 올해 사고가 발생합니다. 치료를 중단하세요.',
      '좋은 일이 생깁니다.',
      '이 프로필에는 한계가 있지만 당신은 게으르고 무능한 사람이며 결국 실패합니다.',
    ]) {
      expect(() =>
        evaluateSajuInterpretation(REPORT, {
          profile: profileWith({
            knownLimitations: [limitation as TraditionRuleProfile['knownLimitations'][number]],
          }),
        }),
      ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE' }));
    }
  });

  test('계산 후보가 비어 있거나 보고서 형태가 아니면 명시적으로 거부한다', () => {
    expect(() =>
      evaluateSajuInterpretation({} as Parameters<typeof evaluateSajuInterpretation>[0], {
        profile: COMMON_STRUCTURAL_PROFILE_V1,
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_CALCULATION_REPORT' }));

    const possibilities = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
        time: { kind: 'unknown' },
        timeZone: 'Asia/Seoul',
      },
    });
    expect(() =>
      evaluateSajuInterpretation(
        { ...possibilities, candidates: [] },
        { profile: COMMON_STRUCTURAL_PROFILE_V1 },
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_CALCULATION_REPORT' }));

    expect(() =>
      evaluateSajuInterpretation(
        JSON.parse(JSON.stringify(REPORT)) as Parameters<typeof evaluateSajuInterpretation>[0],
        { profile: COMMON_STRUCTURAL_PROFILE_V1 },
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_CALCULATION_REPORT' }));
  });
});
