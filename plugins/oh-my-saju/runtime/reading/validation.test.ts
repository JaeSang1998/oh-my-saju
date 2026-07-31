/** Reading-layer trust-boundary tests. */
import { describe, expect, test, vi } from 'vitest';
import { calculateSaju } from 'saju-engine';
import { COMMON_STRUCTURAL_PROFILE_V1, type TraditionRuleProfile } from '../traditions';
import {
  AiReadingError,
  SAJU_NARRATIVE_JSON_SCHEMA,
  createAiSajuService,
  isAiReadingError,
  type SajuNarratorResponse,
} from '../reading';
import { evaluateSajuInterpretation } from '../traditions/evaluate';
import { createAiSajuReading } from './create-reading';
import type { CreateAiSajuReadingInput } from './types';

const EXACT_REQUEST = {
  birth: {
    date: { calendar: 'gregorian' as const, year: 1992, month: 10, day: 24 },
    time: { hour: 5, minute: 30 },
    timeZone: 'Asia/Seoul',
  },
};
const ASSESSMENT = evaluateSajuInterpretation(calculateSaju(EXACT_REQUEST), {
  profile: COMMON_STRUCTURAL_PROFILE_V1,
});
const FINDING = ASSESSMENT.findings[0]!;
const FIVE_ELEMENT_FINDING = ASSESSMENT.findings.find(({ topic }) => topic === 'five-elements')!;

function plan(
  findingIds: readonly string[] = [FINDING.id],
  text = '근거를 인용한 해설 문단입니다.',
): unknown {
  return { summary: { text, findingIds }, sections: [] };
}

function paragraph(
  findingIds: readonly string[] = [FINDING.id],
  text = '근거를 인용한 해설 문단입니다.',
): { readonly text: string; readonly findingIds: readonly string[] } {
  return { text, findingIds };
}

function response(output: unknown = plan()): SajuNarratorResponse {
  return { output, metadata: { actualModel: 'fixture-actual' } };
}

function inputReturning(output: unknown, question?: string): CreateAiSajuReadingInput {
  return {
    assessment: ASSESSMENT,
    ...(question === undefined ? {} : { question }),
    narrator: {
      id: 'validation-fixture',
      requestedModel: 'fixture',
      async narrate() {
        return response(output);
      },
    },
  };
}

describe('AI request and error validation v3', () => {
  test('별도 오류 타입을 유지하되 provider 원인은 공개 오류에서 제거한다', async () => {
    const error = new AiReadingError('INVALID_REQUEST', 'invalid', {
      details: { field: 'locale' },
    });
    expect(isAiReadingError(error)).toBe(true);
    expect(isAiReadingError(new Error('ordinary'))).toBe(false);

    await expect(
      createAiSajuReading({
        assessment: ASSESSMENT,
        narrator: {
          id: 'failing-provider',
          requestedModel: 'fixture',
          async narrate() {
            throw new Error('API_KEY=provider-secret');
          },
        },
      }),
    ).rejects.toMatchObject({
      code: 'NARRATOR_FAILURE',
      message: 'The narrator failed to generate a response.',
    });
  });

  test.each([
    { name: '긴 question', patch: { question: 'x'.repeat(1_001) } },
    { name: '빈 locale', patch: { locale: '' } },
    { name: '공백 purpose', patch: { purpose: 'education comparison' } },
    { name: '지원하지 않는 audience', patch: { audience: 'employer' } },
    { name: '지원하지 않는 variant policy', patch: { variantPolicy: 'random-candidate' } },
    { name: '지원하지 않는 reading mode', patch: { readingMode: 'generic' } },
    { name: 'zero-width question', patch: { question: '핵\u200b심' } },
  ])('$name 입력을 모델 호출 전에 거부한다', async ({ patch }) => {
    const narrate = vi.fn(async () => response());
    await expect(
      createAiSajuReading({
        assessment: ASSESSMENT,
        narrator: { id: 'unused', requestedModel: 'unused', narrate },
        ...(patch as object),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(narrate).not.toHaveBeenCalled();
  });

  test.each([
    '이 사주를 보고 항암치료를 중단해도 되는지 결정해줘.',
    'Should I discontinue chemotherapy based on this reading?',
    '암이 있나요?',
    '언제 죽는지 알려줘.',
    '임신운 봐줘.',
    '사고수 있나요?',
    '범죄자가 될 사주인가요?',
    '수명 봐줘.',
    '몇 살까지 살 수 있나요?',
    '단명할 사주인가요?',
    '교통사고가 날까요?',
    '암 이 있나요?',
    '간암인가요?',
    '치매인가요?',
    '병에 걸릴까요?',
    '제가 암 환자인가요?',
    '죽을 사주인가요?',
    '사망할 운명인가요?',
    '수술하면 좋을까요?',
    '약을 먹어도 될까요?',
    '약 먹어도 될까요?',
    '장수할 사주인가요?',
    '당뇨병인가요?',
    '우울증인가요?',
    '조현병인가요?',
    'Do I have cancer?',
    'Will I die young?',
    'Am I pregnant?',
    'Should I take this pill?',
    '투자할 종목을 추천해줘.',
  ])('질문 주제 %j 자체로는 거절하지 않고 untrusted data로 전달한다', async (question) => {
    let capturedQuestion: string | null = null;
    await expect(
      createAiSajuReading({
        assessment: ASSESSMENT,
        purpose: 'education-comparison',
        question,
        narrator: {
          id: 'topic-neutral',
          requestedModel: 'fixture',
          async narrate(request) {
            capturedQuestion = request.user.question;
            return response();
          },
        },
      }),
    ).resolves.toMatchObject({ generatedByAI: true });
    expect(capturedQuestion).toBe(question);
  });

  test('minor audience도 성격·적성·미래라는 주제만으로 차단하지 않는다', async () => {
    let capturedAudience: string | null = null;
    await expect(
      createAiSajuReading({
        assessment: ASSESSMENT,
        audience: 'minor',
        question: '내 성격과 직업 적성, 앞으로의 흐름을 사주로 풀어줘.',
        narrator: {
          id: 'minor-topic-neutral',
          requestedModel: 'fixture',
          async narrate(request) {
            capturedAudience = request.user.audience;
            return response();
          },
        },
      }),
    ).resolves.toMatchObject({ generatedByAI: true });
    expect(capturedAudience).toBe('minor');
  });

  test('조작하거나 역직렬화한 assessment는 provider 호출 전에 거부한다', async () => {
    const forged = {
      ...ASSESSMENT,
      subject: { ...ASSESSMENT.subject, birth: { date: '1992-10-24' } },
      findings: [{ ...FINDING, id: 'invented', values: { birth: { originalText: '민감정보' } } }],
    };
    const narrate = vi.fn(async () => response());

    await expect(
      createAiSajuReading({
        assessment: forged as unknown as typeof ASSESSMENT,
        narrator: { id: 'unused', requestedModel: 'unused', narrate },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(narrate).not.toHaveBeenCalled();
  });

  test('서비스 생성 시 profile·narrator 옵션을 snapshot한다', async () => {
    const mutableProfile = JSON.parse(
      JSON.stringify(COMMON_STRUCTURAL_PROFILE_V1),
    ) as TraditionRuleProfile;
    const mutableNarrator = {
      id: 'before',
      requestedModel: 'requested-before',
      async narrate() {
        return response();
      },
    };
    const service = createAiSajuService({ profile: mutableProfile, narrator: mutableNarrator });
    (mutableProfile as { id: string }).id = 'after';
    mutableNarrator.id = 'after';

    const result = await service.read({ calculation: { kind: 'exact', request: EXACT_REQUEST } });
    expect(result.interpretation.profile.id).toBe('common-structural');
    expect(result.reading.audit.narrator).toMatchObject({
      id: 'before',
      requestedModel: 'requested-before',
    });
  });

  test('provider용 JSON Schema는 prose와 finding IDs를 요구하고 재귀 동결되어 있다', () => {
    expect(Object.isFrozen(SAJU_NARRATIVE_JSON_SCHEMA)).toBe(true);
    expect(Object.isFrozen(SAJU_NARRATIVE_JSON_SCHEMA.properties.sections)).toBe(true);
    expect(SAJU_NARRATIVE_JSON_SCHEMA.$defs.paragraph.required).toEqual(['text', 'findingIds']);
    expect(SAJU_NARRATIVE_JSON_SCHEMA.$defs.paragraph.properties.findingIds.minItems).toBe(1);
    expect(
      SAJU_NARRATIVE_JSON_SCHEMA.properties.sections.items.properties.paragraphs.minItems,
    ).toBe(1);
    expect(SAJU_NARRATIVE_JSON_SCHEMA.properties.sections.maxItems).toBe(4);
    expect(
      SAJU_NARRATIVE_JSON_SCHEMA.properties.sections.items.properties.paragraphs.maxItems,
    ).toBe(2);
    expect(SAJU_NARRATIVE_JSON_SCHEMA.$defs.paragraph.properties.text.maxLength).toBe(900);
  });
});

describe('AI output validation v3', () => {
  test.each([
    { name: '객체가 아닌 출력', raw: 'plain text', code: 'INVALID_NARRATOR_OUTPUT' },
    {
      name: '추가 최상위 속성',
      raw: { ...(plan() as object), injected: true },
      code: 'INVALID_NARRATOR_OUTPUT',
    },
    {
      name: '누락된 prose',
      raw: { summary: { findingIds: [FINDING.id] }, sections: [] },
      code: 'INVALID_NARRATOR_OUTPUT',
    },
    {
      name: '중복 finding ID',
      raw: plan([FINDING.id, FINDING.id]),
      code: 'INVALID_NARRATOR_OUTPUT',
    },
    {
      name: '잘못된 section topic',
      raw: {
        summary: paragraph(),
        sections: [{ topic: 'personality', paragraphs: [paragraph()] }],
      },
      code: 'INVALID_NARRATOR_OUTPUT',
    },
    {
      name: 'section과 finding topic 불일치',
      raw: {
        summary: paragraph(),
        sections: [
          {
            topic: FINDING.topic === 'timing' ? 'day-master' : 'timing',
            paragraphs: [paragraph()],
          },
        ],
      },
      code: 'UNGROUNDED_OUTPUT',
    },
  ])('$name을 거부한다', async ({ raw, code }) => {
    await expect(createAiSajuReading(inputReturning(raw))).rejects.toMatchObject({ code });
  });

  test('알 수 없는 finding ID를 공개 오류에 반사하지 않는다', async () => {
    const secretId = 'SECRET_TOKEN_123456';
    let caught: unknown;
    try {
      await createAiSajuReading(inputReturning(plan([secretId])));
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({
      code: 'UNGROUNDED_OUTPUT',
      details: { path: 'summary', unknownCount: 1 },
    });
    expect(JSON.stringify(caught)).not.toContain(secretId);
  });

  test('provider getter 예외와 메타데이터 개행을 불투명한 출력 오류로 바꾼다', async () => {
    const getterResponse = Object.defineProperty(
      { metadata: { actualModel: 'fixture' } },
      'output',
      {
        enumerable: true,
        get() {
          throw new Error('API_KEY=getter-secret');
        },
      },
    );
    await expect(
      createAiSajuReading({
        assessment: ASSESSMENT,
        narrator: {
          id: 'getter-provider',
          requestedModel: 'fixture',
          async narrate() {
            return getterResponse as unknown as SajuNarratorResponse;
          },
        },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_NARRATOR_OUTPUT' });

    await expect(
      createAiSajuReading({
        assessment: ASSESSMENT,
        narrator: {
          id: 'metadata-injection',
          requestedModel: 'fixture',
          async narrate() {
            return { output: plan(), metadata: { actualModel: 'model\r\nforged' } };
          },
        },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_NARRATOR_OUTPUT' });
  });

  test('좁은 질문의 평문 prose는 참조 계약만 충족하면 한 문단으로 유지한다', async () => {
    const text = '이 구조를 직업 선택의 참고 관점으로 설명할 수 있습니다.';
    const reading = await createAiSajuReading(
      inputReturning(plan([FINDING.id], text), '직업 선택을 간단히 설명해줘.'),
    );
    expect(reading.narrative.summary.text).toBe(text);
  });

  test('세 문장을 넘는 줄글과 지나치게 긴 문단을 compact 출력 경계에서 거부한다', async () => {
    await expect(
      createAiSajuReading(
        inputReturning(
          plan(
            [FINDING.id],
            '첫 번째 설명입니다. 두 번째 설명입니다. 세 번째 설명입니다. 네 번째 설명까지 이어집니다.',
          ),
          '사주 봐줘.',
        ),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_NARRATOR_OUTPUT',
      details: {
        path: 'summary',
        policy: 'compact-presentation',
        sentenceCount: 4,
        maximumSentenceCount: 3,
      },
    });

    await expect(
      createAiSajuReading(inputReturning(plan([FINDING.id], '가'.repeat(901)), '사주 봐줘.')),
    ).rejects.toMatchObject({
      code: 'INVALID_NARRATOR_OUTPUT',
    });
  });

  test.each([
    '전통 규칙상 양인격과 월겁격이 격국 후보로 표시됩니다.',
    '조후 후보가 있지만 최종 용신 판정은 아닙니다.',
    '신살에는 화개와 천을귀인이 잡힙니다.',
    '공망은 아직 확정할 수 없는 자료입니다.',
    '현실 예측의 과학적 타당성은 확립돼 있지 않습니다.',
  ])('요청하지 않은 전문 교리·방어 문구 %j을 기본 해석에서 거부한다', async (text) => {
    await expect(
      createAiSajuReading(inputReturning(plan([FINDING.id], text), '사주 봐줘.')),
    ).rejects.toMatchObject({
      code: 'INVALID_NARRATOR_OUTPUT',
      details: {
        path: 'summary',
        policy: 'advanced-doctrine-explicit-opt-in',
      },
    });
  });

  test('일반 동사인 “기준을 세운 뒤”를 세운(歲運) 교리로 오탐하지 않는다', async () => {
    const text =
      '월주와 일주의 반복은 스스로 납득한 기준을 세운 뒤 움직이려는 성향으로 이어집니다.';
    await expect(
      createAiSajuReading(inputReturning(plan([FINDING.id], text), '사주 봐줘.')),
    ).resolves.toMatchObject({
      narrative: { summary: { text } },
    });
  });

  test('기본 broad에서는 오행을 보여주고 focused·audit에서는 명시적으로 물을 때만 연다', async () => {
    const output = {
      summary: paragraph([FIVE_ELEMENT_FINDING.id], '오행 분포를 중심으로 설명합니다.'),
      sections: [
        {
          topic: 'five-elements',
          paragraphs: [
            paragraph(
              [FIVE_ELEMENT_FINDING.id],
              '오행 비율은 구조를 보여주는 보조 자료로 읽습니다.',
            ),
          ],
        },
      ],
    };

    await expect(createAiSajuReading(inputReturning(output, '사주 봐줘.'))).resolves.toMatchObject({
      narrative: { sections: [{ id: 'five-elements' }] },
    });

    await expect(
      createAiSajuReading(inputReturning(output, '오행 분포를 자세히 설명해줘.')),
    ).resolves.toMatchObject({
      narrative: {
        sections: [{ id: 'five-elements' }],
      },
    });

    await expect(
      createAiSajuReading(inputReturning(output, '학파별 전통 규칙을 기술 용어로 검증해줘.')),
    ).rejects.toMatchObject({
      code: 'INVALID_NARRATOR_OUTPUT',
      details: {
        doctrine: 'five-elements',
        policy: 'advanced-doctrine-explicit-opt-in',
      },
    });

    await expect(
      createAiSajuReading(
        inputReturning(output, '오행을 학파별 전통 규칙과 함께 기술적으로 검증해줘.'),
      ),
    ).resolves.toMatchObject({
      narrative: { sections: [{ id: 'five-elements' }] },
    });
  });

  test.each([
    '현실 예측의 과학적 타당성은 확립돼 있지 않습니다.',
    '전통 규칙상 아직 확정할 수 없는 자료입니다.',
    '이 프로필의 한계 때문에 최종 결론을 단정할 수 없습니다.',
  ])('오행 질문에서도 관련 없는 방어 문구 %j을 거부한다', async (text) => {
    await expect(
      createAiSajuReading(
        inputReturning(plan([FIVE_ELEMENT_FINDING.id], text), '오행 분포를 알려줘.'),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_NARRATOR_OUTPUT',
      details: {
        path: 'summary',
        policy: 'advanced-doctrine-explicit-opt-in',
      },
    });
  });

  test('명리 이론이라는 포괄어만으로 모든 전문 교리를 열지 않는다', async () => {
    await expect(
      createAiSajuReading(
        inputReturning(
          plan([FIVE_ELEMENT_FINDING.id], '오행 분포를 중심으로 설명합니다.'),
          '명리 이론으로 봐줘.',
        ),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_NARRATOR_OUTPUT',
      details: {
        doctrine: 'five-elements',
        policy: 'advanced-doctrine-explicit-opt-in',
      },
    });
  });

  test('과학적 타당성을 직접 물었을 때만 과학성 문구를 허용한다', async () => {
    const output = plan(
      [FINDING.id],
      '사주 해석의 현실 예측에 관한 과학적 타당성은 확립돼 있지 않습니다.',
    );

    await expect(createAiSajuReading(inputReturning(output, '사주 봐줘.'))).rejects.toMatchObject({
      code: 'INVALID_NARRATOR_OUTPUT',
      details: {
        doctrine: 'science-meta',
        policy: 'advanced-doctrine-explicit-opt-in',
      },
    });

    await expect(
      createAiSajuReading(inputReturning(output, '사주의 과학적 타당성은 어때?')),
    ).resolves.toMatchObject({
      narrative: {
        summary: {
          text: '사주 해석의 현실 예측에 관한 과학적 타당성은 확립돼 있지 않습니다.',
        },
      },
    });

    await expect(
      createAiSajuReading(inputReturning(output, '과학적으로 사주가 맞는지 검증해줘.')),
    ).resolves.toMatchObject({
      narrative: {
        summary: {
          text: '사주 해석의 현실 예측에 관한 과학적 타당성은 확립돼 있지 않습니다.',
        },
      },
    });
  });

  test.each([
    '이 해석은 과학적으로 검증된 내용은 아니므로 참고용으로만 보세요.',
    '명리는 과학이 아닙니다.',
    '이 결과는 참고용으로만 확인하세요.',
    '객관적으로 입증된 사실이 아니니 재미로만 보세요.',
    '정확성을 보장하지 않으니 참고 정도로만 보세요.',
  ])('자연어로 바꾼 과학성 방어 문구 %j도 기본 해석에서 거부한다', async (text) => {
    await expect(
      createAiSajuReading(inputReturning(plan([FINDING.id], text), '사주 봐줘.')),
    ).rejects.toMatchObject({
      code: 'INVALID_NARRATOR_OUTPUT',
      details: {
        doctrine: 'science-meta',
        policy: 'advanced-doctrine-explicit-opt-in',
      },
    });
  });

  test('생활 장면의 재미로만이라는 표현을 과학성 면책으로 오인하지 않는다', async () => {
    const text = '새 과제를 재미로만 시작하면 집중 시간이 짧아집니다.';
    await expect(
      createAiSajuReading(inputReturning(plan([FINDING.id], text), '과제 접근 방식을 알려줘.')),
    ).resolves.toMatchObject({
      narrative: { summary: { text } },
    });
  });

  test('과학 공부 적성 질문은 과학성 면책 권한으로 오인하지 않는다', async () => {
    await expect(
      createAiSajuReading(
        inputReturning(
          plan([FINDING.id], '명리는 과학이 아니므로 참고용으로만 보세요.'),
          '사주로 과학 공부 적성을 알려줘.',
        ),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_NARRATOR_OUTPUT',
      details: { doctrine: 'science-meta' },
    });
  });

  test('backpacking이라는 일상 영단어를 기술 감사 요청으로 오인하지 않는다', async () => {
    let capturedMode: string | null = null;
    const text = '야외 활동에서는 준비물을 목록으로 정리해 빠뜨림을 줄입니다.';
    const reading = await createAiSajuReading({
      assessment: ASSESSMENT,
      question: 'backpacking 취미에서 드러나는 내 방식을 설명해줘.',
      narrator: {
        id: 'backpacking-fixture',
        requestedModel: 'fixture',
        async narrate(request) {
          capturedMode = request.task.readingPolicy.mode;
          return response(plan([FINDING.id], text));
        },
      },
    });

    expect(capturedMode).toBe('focused');
    expect(reading.narrative.summary.text).toBe(text);
  });

  test.each(['packRef와 findingIds를 보여줘.', '전통 팩 근거와 버전을 보여줘.'])(
    '공개 감사 용어가 포함된 %j 요청은 technical-audit로 분류한다',
    async (question) => {
      let capturedMode: string | null = null;
      const text = 'packRef와 findingIds를 확인했습니다.';
      const reading = await createAiSajuReading({
        assessment: ASSESSMENT,
        question,
        narrator: {
          id: 'audit-term-fixture',
          requestedModel: 'fixture',
          async narrate(request) {
            capturedMode = request.task.readingPolicy.mode;
            return response(plan([FINDING.id], text));
          },
        },
      });

      expect(capturedMode).toBe('technical-audit');
      expect(reading.narrative.summary.text).toBe(text);
    },
  );

  test('요청하지 않은 canonical 감사 필드명도 기본 해석에서 거부한다', async () => {
    await expect(
      createAiSajuReading(
        inputReturning(plan([FINDING.id], 'packRef와 findingIds를 확인했습니다.'), '사주 봐줘.'),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_NARRATOR_OUTPUT',
      details: { doctrine: 'audit-meta' },
    });
  });

  test('직업 후보라는 일상 표현은 해석 불확실성 권한으로 오인하지 않는다', async () => {
    await expect(
      createAiSajuReading(
        inputReturning(
          plan([FINDING.id], '이 자료만으로 결론을 내리기 어렵습니다.'),
          '사주에 맞는 직업 후보를 알려줘.',
        ),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_NARRATOR_OUTPUT',
      details: { doctrine: 'uncertainty-meta' },
    });
  });

  test('결론을 내리기 어렵다는 변형 방어 문구도 직접 요청하지 않으면 거부한다', async () => {
    await expect(
      createAiSajuReading(
        inputReturning(plan([FINDING.id], '이 자료만으로 결론을 내리기 어렵습니다.'), '사주 봐줘.'),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_NARRATOR_OUTPUT',
      details: { doctrine: 'uncertainty-meta' },
    });
  });

  test('technical-audit mode 자체는 요청하지 않은 교리를 열지 않는다', async () => {
    await expect(
      createAiSajuReading({
        ...inputReturning(
          plan([FIVE_ELEMENT_FINDING.id], '오행 분포를 중심으로 설명합니다.'),
          'Pack 근거 ID와 감사 로그만 보여줘.',
        ),
        readingMode: 'technical-audit',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_NARRATOR_OUTPUT',
      details: {
        doctrine: 'five-elements',
        policy: 'advanced-doctrine-explicit-opt-in',
      },
    });
  });

  test('성격 프로필이라는 일상 표현은 기술 감사 요청으로 오인하지 않는다', async () => {
    const text = '성격 프로필을 구체적인 생활 장면으로 정리합니다.';
    const reading = await createAiSajuReading(
      inputReturning(plan([FINDING.id], text), '내 성격 프로필을 알려줘.'),
    );
    expect(reading.narrative.summary.text).toBe(text);
  });

  test('일상어 목욕은 십이운성 권한으로 오인하지 않는다', async () => {
    const text = '목욕 습관처럼 일상 루틴을 정리하는 방식으로 설명합니다.';
    await expect(
      createAiSajuReading(inputReturning(plan([FINDING.id], text), '목욕 습관은 어때?')),
    ).resolves.toMatchObject({
      narrative: { summary: { text } },
    });
  });

  test('용신의 후보·확정 여부를 직접 물어도 과학성 문구까지 열리지는 않는다', async () => {
    await expect(
      createAiSajuReading(
        inputReturning(
          plan([FINDING.id], '용신 후보는 이 규칙에서 하나로 확정할 수 없습니다.'),
          '용신 후보가 왜 확정이 아닌지 설명해줘.',
        ),
      ),
    ).resolves.toMatchObject({
      narrative: {
        summary: {
          text: '용신 후보는 이 규칙에서 하나로 확정할 수 없습니다.',
        },
      },
    });

    await expect(
      createAiSajuReading(
        inputReturning(
          plan([FINDING.id], '현실 예측의 과학적 타당성은 확립돼 있지 않습니다.'),
          '용신 후보가 왜 확정이 아닌지 설명해줘.',
        ),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_NARRATOR_OUTPUT',
      details: {
        doctrine: 'science-meta',
        policy: 'advanced-doctrine-explicit-opt-in',
      },
    });
  });

  test.each([
    {
      name: '틀린 연도 간지',
      text: '2026년은 을묘년입니다.',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
    {
      name: '맞는 연도 간지',
      text: '2026년은 병오년입니다.',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
    {
      name: '날짜 일진',
      text: '2026년 2월 4일은 경인일입니다.',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
    {
      name: '달력 연도 대응 없이 단정한 간지',
      text: '병오년에는 새로운 흐름이 시작됩니다.',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
    {
      name: '60갑자에 속하지 않는 조합',
      text: '2026년은 갑축년입니다.',
      validSexagenaryPairCount: 0,
      invalidSexagenaryPairCount: 1,
    },
    {
      name: '질문을 인용해 반박한 문장',
      text: '질문의 “2026년은 을묘년”이라는 주장은 사실이 아닙니다.',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
    {
      name: '한자 연도 간지',
      text: '2026年은 丙午年입니다.',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
    {
      name: '한글과 한자를 병기한 연도 간지',
      text: '2026년은 병오(丙午)년입니다.',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
    {
      name: '연도 간지 서술어 뒤의 한글 간지',
      text: '2026년의 간지는 을묘입니다.',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
    {
      name: '따옴표 안의 한자 간지',
      text: '2026년의 간지는 “丙午”라고 합니다.',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
    {
      name: '따옴표 속 한글 간지를 반박한 문장',
      text: '“2026년 간지가 ‘을묘’라는 말은 틀렸습니다.”',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
    {
      name: '한자 연도와 간지 키워드',
      text: '2026年干支는 乙卯입니다.',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
    {
      name: '상대 연도 간지',
      text: '올해는 병오입니다.',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
    {
      name: '연도와 간지 사이에 부사가 있는 문장',
      text: '2026년은 결과적으로 을묘입니다.',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
    {
      name: '연도 대응을 풀어 쓴 문장',
      text: '2026년에 해당하는 것은 을묘입니다.',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
    {
      name: '오늘 일진 계산을 풀어 쓴 문장',
      text: '오늘의 일진을 계산하면 경인입니다.',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
    {
      name: '점으로 구분한 날짜의 간지',
      text: '2026.02.04의 간지는 경인입니다.',
      validSexagenaryPairCount: 1,
      invalidSexagenaryPairCount: 0,
    },
  ])(
    'chronology evidence가 없으면 unrelated finding을 붙인 $name 주장도 fail-closed 거부한다',
    async ({ text, validSexagenaryPairCount, invalidSexagenaryPairCount }) => {
      await expect(
        createAiSajuReading(inputReturning(plan([FINDING.id], text))),
      ).rejects.toMatchObject({
        code: 'UNGROUNDED_OUTPUT',
        message: 'Calendar-date and sexagenary-cycle claims require chronology or timing evidence.',
        details: {
          path: 'summary',
          policy: 'calendar-ganzhi-evidence-required',
          chronologyOrTimingEvidenceProvided: false,
          quotedOrRefutedClaimsExempted: false,
          claimCount: 1,
          validSexagenaryPairCount,
          invalidSexagenaryPairCount,
        },
      });
    },
  );

  test.each([
    '2026개의 예시를 들지 않고 이 구조만 설명합니다.',
    '60갑자라는 분류 이름은 달력 연도 판정이 아닙니다.',
    '갑자와 병오를 전통 분류 용어로 비교합니다.',
    '갑자일주와 병자년주를 분류명으로 비교합니다.',
    '일주는 갑자입니다.',
    '연주는 병자입니다.',
    '간지는 갑자와 병오를 포함합니다.',
    '2026년에는 질문의 맥락을 신중히 살핍니다.',
    '그 사람은 진짜 신사일 뿐입니다.',
    '간지라는 용어를 갑자기 떠올렸습니다.',
  ])('달력-간지 단정이 아닌 일반 문장 %j은 통과시킨다', async (text) => {
    const reading = await createAiSajuReading(inputReturning(plan([FINDING.id], text)));
    expect(reading.narrative.summary.text).toBe(text);
  });

  test('provider prompt와 audit에 fail-closed 달력·간지 근거 계약을 명시한다', async () => {
    let capturedGrounding: unknown;
    const reading = await createAiSajuReading({
      assessment: ASSESSMENT,
      narrator: {
        id: 'grounding-contract',
        requestedModel: 'fixture',
        async narrate(request) {
          capturedGrounding = request.grounding;
          return response();
        },
      },
    });

    expect(capturedGrounding).toMatchObject({
      chronologyOrTimingEvidenceProvided: false,
      calendarGanzhiClaimsAllowed: false,
      quotedOrRefutedClaimsExempted: false,
    });
    expect(reading.audit.validation).toMatchObject({
      unsupportedCalendarGanzhiClaimsRejected: true,
    });
  });
});
