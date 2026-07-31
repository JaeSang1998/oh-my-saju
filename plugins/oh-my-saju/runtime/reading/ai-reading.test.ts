/** Grounded reading behavior tests. */
import { describe, expect, test, vi } from 'vitest';
import { calculateSaju, calculateSajuPossibilities } from 'saju-engine';
import { COMMON_STRUCTURAL_PROFILE_V1 } from '../traditions';
import {
  AiReadingError,
  createAiSajuService,
  type SajuNarrationRequest,
  type SajuNarratorResponse,
} from '../reading';
import { evaluateSajuInterpretation } from '../traditions/evaluate';
import { createAiSajuReading } from './create-reading';

const EXACT_REQUEST = {
  birth: {
    date: { calendar: 'gregorian' as const, year: 1992, month: 10, day: 24 },
    time: { hour: 5, minute: 30 },
    timeZone: 'Asia/Seoul',
  },
};

function dayMasterFinding(
  assessment: ReturnType<typeof evaluateSajuInterpretation>,
): ReturnType<typeof evaluateSajuInterpretation>['findings'][number] {
  const finding = assessment.findings.find(({ ruleId }) => ruleId === 'core.day-master');
  if (finding === undefined) throw new Error('test fixture has no day-master finding');
  return finding;
}

function narratorResponse(output: unknown): SajuNarratorResponse {
  return {
    output,
    metadata: {
      actualModel: 'fixture-actual',
      providerRequestId: 'request-123',
      finishReason: 'stop',
    },
  };
}

function paragraph(
  findingId: string,
  text = '제공된 명리 근거를 바탕으로 이 구조를 해석할 수 있습니다.',
): { readonly text: string; readonly findingIds: readonly string[] } {
  return { text, findingIds: [findingId] };
}

describe('createAiSajuReading', () => {
  test('진학·직업·성격 질문을 내용으로 차단하지 않고 근거 참조를 가진 AI 문단을 반환한다', async () => {
    const assessment = evaluateSajuInterpretation(calculateSaju(EXACT_REQUEST), {
      profile: COMMON_STRUCTURAL_PROFILE_V1,
    });
    const finding = dayMasterFinding(assessment);
    const narrate = vi.fn(async () =>
      narratorResponse({
        summary: paragraph(
          finding.id,
          '전통 명리 관점에서는 이 구조를 진학 선택의 참고 관점으로 풀어볼 수 있습니다.',
        ),
        sections: [],
      }),
    );

    const reading = await createAiSajuReading({
      assessment,
      purpose: 'education-comparison',
      question: '수의대와 약대 중 어느 쪽이 더 맞는지 사주로 풀어줘.',
      narrator: { id: 'interpretive', requestedModel: 'fixture', narrate },
    });

    expect(narrate).toHaveBeenCalledOnce();
    expect(narrate.mock.calls[0]?.[0]).toMatchObject({
      schemaVersion: '3',
      task: {
        mode: 'grounded-interpretation',
        answerUserQuestionDirectly: true,
        responseOrder: ['direct-answer', 'lived-patterns', 'applications', 'concise-conclusion'],
        keepCalculationAndInterpretationDistinct: true,
        topicNeutral: true,
        omitCalendarAndGanzhiClaimsWithoutEvidence: true,
        presentation: {
          mode: 'chart-first-profile',
          format: 'chart-and-short-sections',
          maxParagraphSentences: 3,
          maxSections: 4,
          maxParagraphsPerSection: 2,
          maxNarrativeCharacters: 3_200,
          maxParagraphCharacters: 900,
          advancedDoctrine: 'only-when-explicitly-requested',
          neverEndWithLimitations: true,
          broadReading: {
            finalSelectionRequired: true,
            minimumDistinctParagraphs: 7,
            legacyMinimumDistinctParagraphs: 9,
            maxSelectedParagraphCharacters: 420,
            maxPresentationCharacters: 2_200,
            structuredLivedPatternRequired: false,
            structuredEvidenceBridgeRequired: true,
          },
        },
        readingPolicy: {
          mode: 'focused',
          structuredBroadPresentation: false,
          requestedDoctrineIds: [],
          scienceMetaRequested: false,
          uncertaintyMetaRequested: false,
          auditMetaRequested: false,
        },
      },
      template: {
        id: 'saju-grounded-narration',
        version: '4.0.0',
      },
    });
    expect(reading).toMatchObject({
      schemaVersion: '2',
      generatedByAI: true,
      generationMode: 'ai-interpreted',
      narrative: {
        title: '사주 해석',
        summary: {
          text: '전통 명리 관점에서는 이 구조를 진학 선택의 참고 관점으로 풀어볼 수 있습니다.',
          findingIds: [finding.id],
          certainty: 'grounded',
        },
      },
      notice: {
        displayPolicy: 'audit-only',
        defaultDisplay: false,
      },
      audit: {
        promptTemplate: { id: 'saju-grounded-narration', version: '4.0.0' },
        grounding: { id: 'saju-finding-references', variantPolicy: 'include-candidate-dependent' },
        validation: {
          everyAiParagraphHasFindingReferences: true,
          findingReferencesValidated: true,
          providerTextAccepted: true,
          plainTextValidated: true,
          compactPresentationValidated: true,
          unrequestedAdvancedDoctrineRejected: true,
        },
      },
    });
  });

  test('원출생정보·연표·원래 시각 텍스트를 보내지 않고 하나의 Pack finding allowlist만 보낸다', async () => {
    const assessment = evaluateSajuInterpretation(calculateSaju(EXACT_REQUEST), {
      profile: COMMON_STRUCTURAL_PROFILE_V1,
    });
    const finding = dayMasterFinding(assessment);
    let captured: SajuNarrationRequest | undefined;

    const reading = await createAiSajuReading({
      assessment,
      question: '핵심 구조를 쉽게 설명해줘.',
      narrator: {
        id: 'test-narrator',
        requestedModel: 'fixture-requested',
        async narrate(request) {
          captured = request;
          return narratorResponse({ summary: paragraph(finding.id), sections: [] });
        },
      },
    });

    const serializedRequest = JSON.stringify(captured);
    expect(serializedRequest).not.toContain('"birth"');
    expect(serializedRequest).not.toContain('"chronology"');
    expect(serializedRequest).not.toContain('"originalText"');
    expect(serializedRequest).not.toContain('"values"');
    expect(captured?.evidence.profile).toEqual({ id: 'common-structural', version: '1.1.0' });
    expect(captured?.evidence.nonDisplayGuardrails).toMatchObject({
      neverQuoteOrParaphrase: true,
      profileLimitations: expect.any(Array),
      unavailableRules: expect.any(Array),
    });
    expect(captured?.evidence.nonDisplayGuardrails.profileLimitations.length).toBeGreaterThan(0);
    expect(
      captured?.evidence.findings.every(({ id }) => id.startsWith('common-structural@1.1.0:')),
    ).toBe(true);
    expect(reading.audit.privacy).toMatchObject({
      structuredBirthRequestSentToNarrator: false,
      chronologySentToNarrator: false,
      originalTimeEvidenceSentToNarrator: false,
      userQuestionSentToNarrator: true,
    });
  });

  test('알 수 없는 finding 인용, 비어 있는 인용, HTML·URL·제어문자 prose를 거부한다', async () => {
    const assessment = evaluateSajuInterpretation(calculateSaju(EXACT_REQUEST), {
      profile: COMMON_STRUCTURAL_PROFILE_V1,
    });
    const finding = dayMasterFinding(assessment);
    const invalidOutputs = [
      { summary: paragraph('invented-finding'), sections: [] },
      { summary: { text: '근거가 없습니다.', findingIds: [] }, sections: [] },
      { summary: paragraph(finding.id, '<b>근거</b>'), sections: [] },
      { summary: paragraph(finding.id, 'https://example.com'), sections: [] },
      { summary: paragraph(finding.id, '보이지 않는\u200b제어 문자'), sections: [] },
    ];

    for (const output of invalidOutputs) {
      await expect(
        createAiSajuReading({
          assessment,
          narrator: {
            id: 'invalid-narrator',
            requestedModel: 'fixture',
            async narrate() {
              return narratorResponse(output);
            },
          },
        }),
      ).rejects.toBeInstanceOf(AiReadingError);
    }
  });

  test('후보 의존 finding은 모델 prose를 유지하되 로컬 불확실성 라벨을 붙인다', async () => {
    const assessment = evaluateSajuInterpretation(
      calculateSajuPossibilities({
        birth: {
          date: EXACT_REQUEST.birth.date,
          time: { kind: 'day-period', period: 'am' },
          timeZone: 'Asia/Seoul',
        },
      }),
      { profile: COMMON_STRUCTURAL_PROFILE_V1 },
    );
    const conditional = assessment.findings.find(
      ({ stability }) => stability === 'candidate-dependent',
    );
    if (conditional === undefined) throw new Error('test fixture has no conditional finding');

    const reading = await createAiSajuReading({
      assessment,
      variantPolicy: 'include-candidate-dependent',
      narrator: {
        id: 'conditional',
        requestedModel: 'fixture',
        async narrate() {
          return narratorResponse({
            summary: paragraph(conditional.id, '이 조건에서만 나타나는 해석 단서입니다.'),
            sections: [],
          });
        },
      },
    });

    expect(reading.narrative.summary).toEqual({
      text: '생시 후보에 따라 달라질 수 있습니다. 이 조건에서만 나타나는 해석 단서입니다.',
      findingIds: [conditional.id],
      certainty: 'conditional',
    });
  });

  test('생시 미상의 partial finding도 모델 prose와 별도로 부분 근거임을 라벨링한다', async () => {
    const assessment = evaluateSajuInterpretation(
      calculateSajuPossibilities({
        birth: {
          date: EXACT_REQUEST.birth.date,
          time: { kind: 'unknown' },
          timeZone: 'Asia/Seoul',
        },
      }),
      { profile: COMMON_STRUCTURAL_PROFILE_V1 },
    );
    const partial = assessment.findings.find(({ coverage }) => coverage === 'partial');
    if (partial === undefined) throw new Error('test fixture has no partial finding');

    const reading = await createAiSajuReading({
      assessment,
      narrator: {
        id: 'partial',
        requestedModel: 'fixture',
        async narrate() {
          return narratorResponse({
            summary: paragraph(partial.id, '확인된 원국 구조를 질문에 맞게 해석합니다.'),
            sections: [],
          });
        },
      },
    });

    expect(reading.narrative.summary).toEqual({
      text: '확인된 기둥 범위의 부분 결과입니다. 확인된 원국 구조를 질문에 맞게 해석합니다.',
      findingIds: [partial.id],
      certainty: 'conditional',
    });
  });

  test('stable-only 옵션은 후보 의존 finding을 narrator allowlist에서 제외하고 제한사항을 남긴다', async () => {
    const assessment = evaluateSajuInterpretation(
      calculateSajuPossibilities({
        birth: {
          date: EXACT_REQUEST.birth.date,
          time: { kind: 'day-period', period: 'am' },
          timeZone: 'Asia/Seoul',
        },
      }),
      { profile: COMMON_STRUCTURAL_PROFILE_V1 },
    );
    let captured: SajuNarrationRequest | undefined;

    const reading = await createAiSajuReading({
      assessment,
      variantPolicy: 'stable-only',
      narrator: {
        id: 'stable-only',
        requestedModel: 'fixture',
        async narrate(request) {
          captured = request;
          const finding = request.evidence.findings[0];
          if (finding === undefined) throw new Error('fixture needs a stable finding');
          return narratorResponse({ summary: paragraph(finding.id), sections: [] });
        },
      },
    });

    expect(captured?.grounding.variantPolicy).toBe('stable-only');
    expect(captured?.evidence.findings.every(({ stability }) => stability === 'stable')).toBe(true);
    expect(reading.notice.limitations.map(({ code }) => code)).toContain(
      'CANDIDATE_DEPENDENT_EXCLUDED',
    );
  });

  test('안정 결과와 서로 다른 후보 집합을 한 문단에 섞는 것을 거부한다', async () => {
    const assessment = evaluateSajuInterpretation(
      calculateSajuPossibilities({
        birth: {
          date: EXACT_REQUEST.birth.date,
          time: { kind: 'day-period', period: 'am' },
          timeZone: 'Asia/Seoul',
        },
      }),
      { profile: COMMON_STRUCTURAL_PROFILE_V1 },
    );
    const stable = assessment.findings.find(({ stability }) => stability === 'stable');
    const conditional = assessment.findings.find(
      ({ stability }) => stability === 'candidate-dependent',
    );
    if (stable === undefined || conditional === undefined)
      throw new Error('fixture needs both kinds');

    await expect(
      createAiSajuReading({
        assessment,
        narrator: {
          id: 'mixed-stability',
          requestedModel: 'fixture',
          async narrate() {
            return narratorResponse({
              summary: {
                text: '서로 다른 조건을 섞었습니다.',
                findingIds: [stable.id, conditional.id],
              },
              sections: [],
            });
          },
        },
      }),
    ).rejects.toMatchObject({ code: 'UNCERTAINTY_VIOLATION' });
  });

  test('서로 다른 생시 후보 집합의 결과를 한 문단에 섞는 것을 거부한다', async () => {
    const assessment = evaluateSajuInterpretation(
      calculateSajuPossibilities({
        birth: {
          date: EXACT_REQUEST.birth.date,
          time: { kind: 'day-period', period: 'am' },
          timeZone: 'Asia/Seoul',
        },
      }),
      { profile: COMMON_STRUCTURAL_PROFILE_V1 },
    );
    const conditionalFindings = assessment.findings.filter(
      ({ stability }) => stability === 'candidate-dependent',
    );
    const first = conditionalFindings.find((left) =>
      conditionalFindings.some(
        (right) =>
          right.id !== left.id &&
          [...right.candidateIds].sort().join('|') !== [...left.candidateIds].sort().join('|'),
      ),
    );
    const second = conditionalFindings.find(
      (right) =>
        first !== undefined &&
        right.id !== first.id &&
        [...right.candidateIds].sort().join('|') !== [...first.candidateIds].sort().join('|'),
    );
    if (first === undefined || second === undefined) {
      throw new Error('fixture needs different candidate support sets');
    }

    await expect(
      createAiSajuReading({
        assessment,
        narrator: {
          id: 'mixed-candidates',
          requestedModel: 'fixture',
          async narrate() {
            return narratorResponse({
              summary: {
                text: '서로 다른 조건의 결과를 섞었습니다.',
                findingIds: [first.id, second.id],
              },
              sections: [],
            });
          },
        },
      }),
    ).rejects.toMatchObject({ code: 'UNCERTAINTY_VIOLATION' });
  });

  test.each([
    '수의대 vs 약대 어디에 진학하는 게 더 좋아? 사주로 봐줘.',
    '내 성격과 직업 적성을 사주로 풀어줘.',
    '궁합과 관계 흐름을 봐줘.',
    '대운과 앞으로의 사건 흐름을 해석해줘.',
  ])(
    '실제 해설 질문 %j을 주제 때문에 차단하거나 엔진 면책문으로 치환하지 않는다',
    async (question) => {
      const assessment = evaluateSajuInterpretation(calculateSaju(EXACT_REQUEST), {
        profile: COMMON_STRUCTURAL_PROFILE_V1,
      });
      const finding = dayMasterFinding(assessment);
      const narrate = vi.fn(async () =>
        narratorResponse({
          summary: paragraph(
            finding.id,
            '계산된 근거를 바탕으로 질문의 맥락에서 전통적으로 해석합니다.',
          ),
          sections: [],
        }),
      );

      const reading = await createAiSajuReading({
        assessment,
        question,
        narrator: { id: 'acceptance-narrator', requestedModel: 'fixture', narrate },
      });

      expect(narrate).toHaveBeenCalledOnce();
      expect(reading.generatedByAI).toBe(true);
      expect(reading.narrative.summary.text).toContain('질문의 맥락');
      const serializedReading = JSON.stringify(reading);
      expect(serializedReading).not.toContain('제공하지 않습니다');
      expect(serializedReading).not.toContain('결정에 사용하지 마세요');
      expect(serializedReading).not.toContain('고위험 요청');
    },
  );
});

describe('createAiSajuService', () => {
  test('계산 → 단일 Pack 평가 → AI prose + finding references를 한 호출로 수행한다', async () => {
    const narrate = vi.fn(async (request: SajuNarrationRequest) => {
      const first = request.evidence.findings[0];
      if (first === undefined) throw new Error('test fixture has no findings');
      return narratorResponse({ summary: paragraph(first.id), sections: [] });
    });
    const service = createAiSajuService({
      profile: COMMON_STRUCTURAL_PROFILE_V1,
      narrator: { id: 'service-fixture', requestedModel: 'fixture', narrate },
    });

    const result = await service.read({
      calculation: { kind: 'exact', request: EXACT_REQUEST },
      question: '핵심만 알려줘.',
    });

    expect(result.schemaVersion).toBe('2');
    expect(result.calculation.pillars.day.korean).toBe('계유');
    expect(result.interpretation.profile.id).toBe('common-structural');
    expect(result.reading.narrative.title).toBe('사주 해석');
    expect(narrate).toHaveBeenCalledOnce();
  });

  test('생시 미상에서도 개인정보 없이 삼주 부분 결과와 제한사항을 보존한다', async () => {
    let serializedNarrationRequest = '';
    const service = createAiSajuService({
      profile: COMMON_STRUCTURAL_PROFILE_V1,
      narrator: {
        id: 'redaction-fixture',
        requestedModel: 'fixture',
        async narrate(request) {
          serializedNarrationRequest = JSON.stringify(request);
          const first = request.evidence.findings[0];
          if (first === undefined) throw new Error('test fixture has no findings');
          return narratorResponse({ summary: paragraph(first.id), sections: [] });
        },
      },
    });

    const result = await service.read({
      calculation: {
        kind: 'possibilities',
        request: {
          birth: {
            date: EXACT_REQUEST.birth.date,
            time: { kind: 'unknown', reason: 'asked-unknown' },
            timeZone: 'Asia/Seoul',
            timeEvidence: { source: 'family-memory', originalText: '민감한 가족 기록 원문' },
          },
        },
      },
    });

    expect(result.interpretation.subject.hourPillar).toBe('omitted');
    expect(result.reading.notice.limitations.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['UNKNOWN_BIRTH_TIME', 'PARTIAL_FINDINGS', 'UNAVAILABLE_RULES']),
    );
    expect(serializedNarrationRequest).not.toContain('민감한 가족 기록 원문');
    expect(serializedNarrationRequest).not.toContain('"timeEvidence"');
    expect(serializedNarrationRequest).not.toContain('"birth"');
  });

  test('인용 가능한 finding이 없으면 모델을 호출하지 않고 제한사항만 반환한다', async () => {
    const narrate = vi.fn(async () => narratorResponse({}));
    const service = createAiSajuService({
      profile: {
        ...COMMON_STRUCTURAL_PROFILE_V1,
        id: 'hour-only',
        enabledRuleIds: ['core.pillar-hour'],
        supportedTopics: ['chart-overview'],
        references: COMMON_STRUCTURAL_PROFILE_V1.references.slice(0, 1),
        knownLimitations: ['structural-profile-no-doctrine'],
      },
      narrator: { id: 'not-called', requestedModel: 'fixture', narrate },
    });

    const result = await service.read({
      calculation: {
        kind: 'possibilities',
        request: {
          birth: {
            date: EXACT_REQUEST.birth.date,
            time: { kind: 'unknown' },
            timeZone: 'Asia/Seoul',
          },
        },
      },
    });

    expect(narrate).not.toHaveBeenCalled();
    expect(result.reading).toMatchObject({
      generatedByAI: false,
      generationMode: 'deterministic-limitations-only',
      narrative: { summary: { findingIds: [], certainty: 'grounded' }, sections: [] },
      audit: {
        narrator: { invoked: false, actualModel: null },
        validation: {
          everyAiParagraphHasFindingReferences: true,
          providerTextAccepted: false,
        },
      },
    });
  });
});
