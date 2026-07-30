/** Korean multi-Pack reading service tests. */
import { describe, expect, test, vi } from 'vitest';
import {
  createAiKoreanSajuService,
  type SajuNarrationRequest,
  type SajuNarratorResponse,
} from '../reading';

const REQUEST = {
  birth: {
    date: { calendar: 'gregorian' as const, year: 1996, month: 5, day: 27 },
    time: { hour: 6, minute: 50 },
    timeZone: 'Asia/Seoul',
  },
};

describe('createAiKoreanSajuService', () => {
  test('한국 기본 구조·세 계파를 격리해 실제 AI 해설문으로 반환한다', async () => {
    const captured: SajuNarrationRequest[] = [];
    const narrate = vi.fn(async (request: SajuNarrationRequest): Promise<SajuNarratorResponse> => {
      captured.push(request);
      const first = request.evidence.findings[0];
      if (first === undefined) throw new Error('fixture requires a finding');
      return {
        output: {
          summary: {
            text: `${request.evidence.profile.id}의 계산 근거를 바탕으로 질문에 답합니다.`,
            findingIds: [first.id],
          },
          sections: [],
        },
        metadata: { actualModel: 'fixture-actual' },
      };
    });
    const service = createAiKoreanSajuService({
      narrator: { id: 'korean-service', requestedModel: 'fixture', narrate },
    });

    const result = await service.read({
      calculation: { kind: 'exact', request: REQUEST },
      purpose: 'education-comparison',
      question: '수의대 vs 약대 어디에 진학하는 게 더 좋아? 사주로 봐줘.',
    });

    expect(service.preset.id).toBe('ko-KR-default-v1');
    expect(result.comparison.packResults.map(({ packRef }) => packRef.id)).toEqual([
      'calculation-baseline',
      'ziping',
      'ditianshui',
      'qiongtong',
      'sanming-symbolic-curated',
    ]);
    expect(result.packReadings).toHaveLength(5);
    expect(narrate).toHaveBeenCalledTimes(5);
    expect(
      captured.every(({ evidence }) =>
        evidence.findings.every(({ id }) =>
          id.startsWith(`${evidence.profile.id}@${evidence.profile.version}:`),
        ),
      ),
    ).toBe(true);
    expect(
      result.packReadings.every(({ reading }) => reading.generationMode === 'ai-interpreted'),
    ).toBe(true);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('제공하지 않습니다');
    expect(serialized).not.toContain('결정에 사용하지 마세요');
    expect(serialized).not.toContain('고위험 요청');
    expect(Object.isFrozen(service)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
  });
});
