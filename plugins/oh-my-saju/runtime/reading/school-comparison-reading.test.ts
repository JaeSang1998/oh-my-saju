/** Isolated Pack narration comparison tests. */
import { describe, expect, test } from 'vitest';
import { createAiSajuComparisonService } from '../reading';
import { isAiReadingError } from './errors';
import type { SajuNarrationRequest } from './types';

const PACK_REFS = [
  { id: 'ziping', version: '1.0.0' },
  { id: 'qiongtong', version: '1.0.0' },
] as const;

describe('createAiSajuComparisonService', () => {
  test('각 학파를 별도 근거 요청과 별도 문단으로 렌더링한다', async () => {
    const requests: SajuNarrationRequest[] = [];
    const service = createAiSajuComparisonService({
      packRefs: PACK_REFS,
      purpose: 'education-comparison',
      narrator: {
        id: 'fixture-selector',
        requestedModel: 'fixture-model',
        async narrate(request) {
          requests.push(request);
          return {
            output: {
              summary: {
                text: '이 학파의 finding을 독립적으로 해석합니다.',
                findingIds: [request.evidence.findings[0]!.id],
              },
              sections: [],
            },
            metadata: {
              actualModel: 'fixture-model-2026-07-28',
              providerRequestId: `req-${request.evidence.profile.id}`,
              finishReason: 'stop',
            },
          };
        },
      },
    });

    const result = await service.read({
      calculation: {
        kind: 'exact',
        request: {
          birth: {
            date: { calendar: 'gregorian', year: 1996, month: 5, day: 27 },
            time: { hour: 6, minute: 50 },
            timeZone: 'Asia/Seoul',
          },
        },
      },
      question: '각 방법의 계산된 구조만 나눠서 보여줘.',
    });

    expect(requests.map(({ evidence }) => evidence.profile.id)).toEqual([
      'ziping-month-command',
      'qiongtong-climate',
    ]);
    expect(
      requests.every((request) =>
        request.evidence.findings.every(({ id }) =>
          id.startsWith(`${request.evidence.profile.id}@`),
        ),
      ),
    ).toBe(true);
    expect(result.packReadings.map(({ packRef }) => packRef)).toEqual(PACK_REFS);
    expect(
      result.packReadings.every(
        ({ reading }) => reading.audit.validation.everyAiParagraphHasFindingReferences,
      ),
    ).toBe(true);
    expect(
      result.packReadings.every(({ profileRef, reading }) =>
        reading.narrative.summary.findingIds.every((id) => id.startsWith(`${profileRef.id}@`)),
      ),
    ).toBe(true);
    expect(result.comparison.comparison.winnerSelected).toBe(false);
  });

  test('생시 미상에서도 삼주 기반 finding과 partial 표시를 Pack별로 유지한다', async () => {
    const requests: SajuNarrationRequest[] = [];
    const service = createAiSajuComparisonService({
      packRefs: [PACK_REFS[1], { id: 'ditianshui', version: '1.0.0' }],
      narrator: {
        id: 'fixture-selector',
        requestedModel: 'fixture-model',
        async narrate(request) {
          requests.push(request);
          return {
            output: {
              summary: {
                text: '확인된 삼주 finding을 바탕으로 해석합니다.',
                findingIds: [request.evidence.findings[0]!.id],
              },
              sections: [],
            },
            metadata: { actualModel: 'fixture-model-2026-07-28' },
          };
        },
      },
    });

    const result = await service.read({
      calculation: {
        kind: 'possibilities',
        request: {
          birth: {
            date: { calendar: 'gregorian', year: 1996, month: 5, day: 27 },
            time: { kind: 'unknown' },
            timeZone: 'Asia/Seoul',
          },
        },
      },
      audience: 'adult',
    });

    expect(result.calculationKind).toBe('possibilities');
    expect(requests).toHaveLength(2);
    expect(
      requests.every(({ grounding }) => grounding.variantPolicy === 'include-candidate-dependent'),
    ).toBe(true);
    expect(result.packReadings).toHaveLength(2);
    expect(
      requests
        .flatMap(({ evidence }) => evidence.findings)
        .some(
          ({ coverage, omittedPillars }) =>
            coverage === 'partial' && omittedPillars.includes('hour'),
        ),
    ).toBe(true);
    expect(result.packReadings.every(({ reading }) => reading.audit.narrator.invoked)).toBe(true);
  });

  test('단일·비교 서비스가 같은 safe identifier 정규화를 사용한다', async () => {
    const purposes: string[] = [];
    const service = createAiSajuComparisonService({
      packRefs: [PACK_REFS[0]],
      purpose: ' education-comparison ',
      narrator: {
        id: 'ｆixture-selector',
        requestedModel: 'ｆixture-model',
        async narrate(request) {
          purposes.push(request.user.purpose);
          return {
            output: {
              summary: {
                text: '정규화된 옵션으로 생성한 해설입니다.',
                findingIds: [request.evidence.findings[0]!.id],
              },
              sections: [],
            },
            metadata: { actualModel: 'fixture-model' },
          };
        },
      },
    });

    const result = await service.read({
      calculation: {
        kind: 'exact',
        request: {
          birth: {
            date: { calendar: 'gregorian', year: 1996, month: 5, day: 27 },
            time: { hour: 6, minute: 50 },
            timeZone: 'Asia/Seoul',
          },
        },
      },
    });

    expect(purposes).toEqual(['education-comparison']);
    expect(result.packReadings[0]?.reading.audit.narrator).toMatchObject({
      id: 'fixture-selector',
      requestedModel: 'fixture-model',
    });
  });

  test('잘못된 Pack·narrator·정책·요청은 provider 호출 전에 거부한다', async () => {
    const narrator = {
      id: 'fixture-selector',
      requestedModel: 'fixture-model',
      async narrate() {
        throw new Error('must not be called');
      },
    };
    const invalidOptions: unknown[] = [
      null,
      { packRefs: [], narrator },
      { packRefs: [null], narrator },
      { packRefs: [{ id: 'bad pack', version: '1.0.0' }], narrator },
      { packRefs: [PACK_REFS[0], PACK_REFS[0]], narrator },
      {
        packRefs: [{ id: 'unknown-pack', version: '1.0.0' }],
        narrator,
      },
      { packRefs: PACK_REFS, narrator: null },
      {
        packRefs: PACK_REFS,
        narrator: { id: 'bad narrator', requestedModel: 'model', narrate() {} },
      },
      {
        packRefs: PACK_REFS,
        narrator: { id: 'narrator', requestedModel: 'model' },
      },
      { packRefs: PACK_REFS, narrator, locale: 'en-US' },
      { packRefs: PACK_REFS, narrator, purpose: 'bad purpose' },
      { packRefs: PACK_REFS, narrator, audience: 'employer' },
      { packRefs: PACK_REFS, narrator, variantPolicy: 'invent-hour' },
    ];

    for (const options of invalidOptions) {
      let caught: unknown;
      try {
        createAiSajuComparisonService(options as never);
      } catch (error) {
        caught = error;
      }
      expect(isAiReadingError(caught)).toBe(true);
      expect(caught).toMatchObject({ code: 'INVALID_REQUEST' });
    }

    const service = createAiSajuComparisonService({
      packRefs: PACK_REFS,
      narrator,
    });
    await expect(service.read({} as never)).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    });
  });
});
