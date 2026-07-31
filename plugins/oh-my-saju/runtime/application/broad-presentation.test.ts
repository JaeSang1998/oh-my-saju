/** Broad-reading assembly and deterministic presentation regression tests. */
import { describe, expect, test } from 'vitest';
import {
  executeOhMySaju,
  type OhMySajuBroadPresentationDraft,
  type OhMySajuLivedPatternRef,
  type OhMySajuNarrationDraft,
  type OhMySajuParagraphRef,
  type OhMySajuResponse,
  type PreparedOhMySajuReading,
} from '../application';
import { escapeBroadPresentationMarkdownText } from './broad-presentation';

const BROAD_REQUEST = {
  calculation: {
    kind: 'exact' as const,
    request: {
      birth: {
        date: { calendar: 'gregorian' as const, year: 1998, month: 1, day: 5 },
        time: { hour: 9, minute: 51 },
        timeZone: 'Asia/Seoul',
      },
    },
  },
  question: '사주좀 봐줘.',
  readingMode: 'broad' as const,
};

interface BroadTaskFixture {
  readonly packRef: { readonly id: string; readonly version: string };
  readonly requiresDraft: boolean;
  readonly request: {
    readonly evidence: {
      readonly findings: readonly {
        readonly id: string;
        readonly topic: string;
      }[];
    };
  };
}

function draftFor(task: BroadTaskFixture): OhMySajuNarrationDraft {
  const finding = task.request.evidence.findings[0];
  if (finding === undefined) throw new Error('test task requires a finding');
  return {
    packRef: task.packRef,
    output: {
      summary: {
        text: '이 구조가 생활에서 드러나는 방식을 짧게 설명합니다.',
        findingIds: [finding.id],
      },
      sections: [],
    },
  };
}

async function prepareBroadReading(): Promise<PreparedOhMySajuReading> {
  const prepared = await executeOhMySaju({
    command: 'prepare-reading',
    request: BROAD_REQUEST,
  });
  if (!prepared.ok || prepared.command !== 'prepare-reading') {
    throw new Error(`prepare failed: ${JSON.stringify(prepared)}`);
  }
  return prepared.result;
}

const SUMMARY_TEXTS = {
  ziping: '마감과 기준이 선명하면 판단을 밀고 나가고, 결정 속도가 빨라져 실행이 분명해집니다.',
  ditianshui: '배울 범위와 마감이 정해진 과제에서는 자료를 구조화해 완성도를 높입니다.',
  qiongtong: '가까운 사이에서도 생각의 과정과 결론을 나누어 말하면 오해가 줄어듭니다.',
  'sanming-symbolic-curated':
    '넓게 보는 힘을 기준과 마감에 연결할 때 가장 안정적으로 강점이 살아납니다.',
} as const;

function broadDraftsFor(tasks: readonly BroadTaskFixture[]): readonly OhMySajuNarrationDraft[] {
  return tasks
    .filter(({ requiresDraft }) => requiresDraft)
    .map((task) => {
      const firstFinding = task.request.evidence.findings[0];
      if (firstFinding === undefined) throw new Error('broad fixture requires a finding');
      if (task.packRef.id !== 'calculation-baseline') {
        const text = SUMMARY_TEXTS[task.packRef.id as keyof typeof SUMMARY_TEXTS];
        if (text === undefined) throw new Error(`missing text for ${task.packRef.id}`);
        return {
          packRef: task.packRef,
          output: {
            summary: { text, findingIds: [firstFinding.id] },
            sections: [],
          },
        };
      }

      const chartFinding = task.request.evidence.findings.find(
        ({ topic }) => topic === 'chart-overview',
      );
      const relationshipFinding = task.request.evidence.findings.find(
        ({ topic }) => topic === 'relationships',
      );
      if (chartFinding === undefined || relationshipFinding === undefined) {
        throw new Error('baseline fixture requires chart and relationship findings');
      }
      return {
        packRef: task.packRef,
        output: {
          summary: {
            text: '상황을 넓게 살핀 뒤 자기 기준으로 방향을 잡는 사람입니다.',
            findingIds: [firstFinding.id],
          },
          sections: [
            {
              topic: 'chart-overview',
              paragraphs: [
                {
                  text: '정보가 많을수록 연결점을 찾아 문제를 정리하는 힘이 살아납니다.',
                  findingIds: [chartFinding.id],
                },
                {
                  text: '정답 기준이 없으면 비교를 계속해 결정과 마무리가 늦어질 수 있습니다.',
                  findingIds: [chartFinding.id],
                },
              ],
            },
            {
              topic: 'relationships',
              paragraphs: [
                {
                  text: '낯선 문제가 생기면 맥락부터 훑어 핵심 변수를 찾고, 빠뜨림을 줄입니다.',
                  findingIds: [relationshipFinding.id],
                },
                {
                  text: '의견이 다를 때 논리를 먼저 정리해 설명하고, 결론을 분명히 합니다.',
                  findingIds: [relationshipFinding.id],
                },
              ],
            },
          ],
        },
      };
    });
}

function replaceBaselineSectionParagraph(
  drafts: readonly OhMySajuNarrationDraft[],
  topic: 'chart-overview' | 'relationships',
  paragraphIndex: 0 | 1,
  text: string,
): readonly OhMySajuNarrationDraft[] {
  return drafts.map((draft) => {
    if (draft.packRef.id !== 'calculation-baseline') return draft;
    const output = draft.output as {
      readonly summary: unknown;
      readonly sections: readonly {
        readonly topic: string;
        readonly paragraphs: readonly {
          readonly text: string;
          readonly findingIds: readonly string[];
        }[];
      }[];
    };
    return {
      ...draft,
      output: {
        ...output,
        sections: output.sections.map((section) =>
          section.topic === topic
            ? {
                ...section,
                paragraphs: section.paragraphs.map((paragraph, index) =>
                  index === paragraphIndex ? { ...paragraph, text } : paragraph,
                ),
              }
            : section,
        ),
      },
    };
  });
}

function presentationDraft(tasks: readonly BroadTaskFixture[]): OhMySajuBroadPresentationDraft {
  const task = (id: string): BroadTaskFixture => {
    const match = tasks.find(({ packRef }) => packRef.id === id);
    if (match === undefined) throw new Error(`presentation fixture task ${id} is missing`);
    return match;
  };
  const summary = (id: string): OhMySajuParagraphRef => ({
    packRef: task(id).packRef,
    source: { kind: 'summary' as const },
  });
  const section = (
    topic: 'chart-overview' | 'relationships',
    paragraphIndex: 0 | 1,
  ): OhMySajuParagraphRef => ({
    packRef: task('calculation-baseline').packRef,
    source: { kind: 'section', topic, paragraphIndex },
  });
  const lived = (
    paragraph: ReturnType<typeof summary> | ReturnType<typeof section>,
    domain: OhMySajuLivedPatternRef['structure']['domain'],
    direction: OhMySajuLivedPatternRef['structure']['direction'],
    situation: string,
    behavior: string,
    result: string,
  ): OhMySajuLivedPatternRef => ({
    paragraph,
    structure: { domain, direction, situation, behavior, result },
  });
  return {
    schemaVersion: '1' as const,
    kind: 'broad-reading' as const,
    portrait: {
      paragraph: summary('calculation-baseline'),
      structure: {
        process: '상황을 넓게 살핀 뒤 자기 기준으로 방향을 잡는',
        identity: '사람입니다',
      },
    },
    atAGlance: {
      disposition: lived(
        section('relationships', 0),
        'disposition',
        'descriptive',
        '낯선 문제가 생기면',
        '맥락부터 훑어 핵심 변수를 찾고',
        '빠뜨림을 줄입니다',
      ),
      execution: lived(
        summary('ziping'),
        'execution',
        'descriptive',
        '마감과 기준이 선명하면',
        '판단을 밀고 나가고',
        '결정 속도가 빨라져 실행이 분명해집니다',
      ),
      relationships: lived(
        section('relationships', 1),
        'relationships',
        'descriptive',
        '의견이 다를 때',
        '논리를 먼저 정리해 설명하고',
        '결론을 분명히 합니다',
      ),
    },
    doubleEdge: {
      strength: lived(
        section('chart-overview', 0),
        'disposition',
        'benefit',
        '정보가 많을수록',
        '연결점을 찾아 문제를 정리하는',
        '힘이 살아납니다',
      ),
      friction: lived(
        section('chart-overview', 1),
        'disposition',
        'cost',
        '정답 기준이 없으면',
        '비교를 계속해',
        '결정과 마무리가 늦어질 수 있습니다',
      ),
    },
    workStudy: [
      lived(
        summary('ditianshui'),
        'work-study',
        'descriptive',
        '배울 범위와 마감이 정해진 과제에서는',
        '자료를 구조화해',
        '완성도를 높입니다',
      ),
    ],
    relationships: [
      lived(
        summary('qiongtong'),
        'relationships',
        'descriptive',
        '가까운 사이에서도',
        '생각의 과정과 결론을 나누어 말하면',
        '오해가 줄어듭니다',
      ),
    ],
    conclusion: {
      paragraph: summary('sanming-symbolic-curated'),
      structure: {
        condition: '기준과 마감에 연결할 때',
        payoff: '안정적으로 강점이 살아납니다',
      },
    },
  };
}

async function validateBroad(
  prepared: Awaited<ReturnType<typeof prepareBroadReading>>,
  drafts: readonly OhMySajuNarrationDraft[] = broadDraftsFor(prepared.narrationTasks),
  draft: unknown = presentationDraft(prepared.narrationTasks),
): Promise<OhMySajuResponse> {
  return executeOhMySaju({
    command: 'validate-reading',
    request: BROAD_REQUEST,
    preparedDigest: prepared.binding.digest,
    narrator: { id: 'test-host', requestedModel: 'fixture-model' },
    drafts,
    presentationDraft: draft,
  });
}

describe('broad-reading presentation contract', () => {
  test('명시적 broad 요청은 최종 presentationDraft 없이는 검증을 통과하지 않는다', async () => {
    const prepared = await prepareBroadReading();
    const result = await executeOhMySaju({
      command: 'validate-reading',
      request: BROAD_REQUEST,
      preparedDigest: prepared.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'fixture-model' },
      drafts: broadDraftsFor(prepared.narrationTasks),
    });

    expect(result).toMatchObject({
      ok: false,
      command: 'validate-reading',
      error: {
        code: 'INVALID_COMMAND',
        details: { policy: 'broad-presentation-required' },
      },
    });
  });

  test('stable-only 근거가 7개 기본 프로필 슬롯을 만들 수 없으면 prepare에서 일찍 설명한다', async () => {
    const sparseRequest = {
      calculation: {
        kind: 'possibilities' as const,
        request: {
          birth: {
            date: { calendar: 'gregorian' as const, year: 1996, month: 5, day: 27 },
            time: {
              kind: 'range' as const,
              startInclusive: { hour: 22, minute: 30 },
              endExclusive: { hour: 1, minute: 30 },
              crossesMidnight: true,
            },
            timeZone: 'Asia/Seoul',
          },
        },
      },
      question: '사주 좀 봐줘.',
      readingMode: 'broad' as const,
      variantPolicy: 'stable-only' as const,
    };
    const result = await executeOhMySaju({
      command: 'prepare-reading',
      request: sparseRequest,
    });

    expect(result).toMatchObject({
      ok: false,
      command: 'prepare-reading',
      error: {
        code: 'INVALID_COMMAND',
        details: {
          policy: 'insufficient-broad-presentation-capacity',
          requiredParagraphSlots: 7,
          recommendation: 'use-include-candidate-dependent-or-focused',
        },
      },
    });
    expect(
      await executeOhMySaju({
        command: 'prepare-reading',
        request: {
          ...sparseRequest,
          question: '직업 적성만 봐줘.',
          readingMode: 'focused',
        },
      }),
    ).toMatchObject({
      ok: true,
      command: 'prepare-reading',
    });
  });

  test('검증된 broad 구조를 고정 제목·불릿·표의 Markdown으로 렌더링한다', async () => {
    const prepared = await prepareBroadReading();
    const result = await validateBroad(prepared);

    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok || result.command !== 'validate-reading') return;
    expect(result.result.presentation?.markdown).toBe(
      [
        '기준: 양력 1998.01.05 09:51, 한국 표준시',
        '',
        '| 년주 | 월주 | 일주 | 시주 |',
        '| --- | --- | --- | --- |',
        '| 정축 | 임자 | 임자 | 을사 |',
        '',
        '상황을 넓게 살핀 뒤 자기 기준으로 방향을 잡는 사람입니다.',
        '',
        '## 한눈에 보면',
        '',
        '- **중심 성향:** 낯선 문제가 생기면 맥락부터 훑어 핵심 변수를 찾고, 빠뜨림을 줄입니다.',
        '- **결정과 실행:** 마감과 기준이 선명하면 판단을 밀고 나가고, 결정 속도가 빨라져 실행이 분명해집니다.',
        '- **사람을 대할 때:** 의견이 다를 때 논리를 먼저 정리해 설명하고, 결론을 분명히 합니다.',
        '',
        '## 강점이 살아날 때 / 꼬일 때',
        '',
        '| 잘 풀릴 때 | 꼬일 때 |',
        '| --- | --- |',
        '| 정보가 많을수록 연결점을 찾아 문제를 정리하는 힘이 살아납니다. | 정답 기준이 없으면 비교를 계속해 결정과 마무리가 늦어질 수 있습니다. |',
        '',
        '## 일·공부',
        '',
        '- 배울 범위와 마감이 정해진 과제에서는 자료를 구조화해 완성도를 높입니다.',
        '',
        '## 관계',
        '',
        '- 가까운 사이에서도 생각의 과정과 결론을 나누어 말하면 오해가 줄어듭니다.',
        '',
        '**한 줄 정리:** 넓게 보는 힘을 기준과 마감에 연결할 때 가장 안정적으로 강점이 살아납니다.',
      ].join('\n'),
    );
    expect(result.result.presentation?.markdown).not.toContain('과학적 타당성');
    expect(result.result.presentation?.markdown).not.toContain('확정할 수');
  });

  test('role 누락을 거부한다', async () => {
    const prepared = await prepareBroadReading();
    const invalid = presentationDraft(prepared.narrationTasks);
    const result = await validateBroad(prepared, undefined, {
      ...invalid,
      atAGlance: {
        disposition: invalid.atAGlance.disposition,
        execution: invalid.atAGlance.execution,
      },
    });

    expect(result).toMatchObject({
      ok: false,
      command: 'validate-reading',
      error: { code: 'INVALID_PRESENTATION_DRAFT' },
    });
  });

  test('서로 다른 근거로 만든 양면 표를 거부한다', async () => {
    const prepared = await prepareBroadReading();
    const drafts = broadDraftsFor(prepared.narrationTasks).map((draft) => {
      if (draft.packRef.id === 'qiongtong') {
        return {
          ...draft,
          output: {
            ...draft.output,
            summary: {
              ...draft.output.summary,
              text: '정답 기준이 없으면 비교를 계속해 결정과 마무리가 늦어질 수 있습니다.',
            },
          },
        };
      }
      if (draft.packRef.id !== 'calculation-baseline') return draft;
      const output = draft.output as {
        readonly summary: unknown;
        readonly sections: readonly {
          readonly topic: string;
          readonly paragraphs: readonly {
            readonly text: string;
            readonly findingIds: readonly string[];
          }[];
        }[];
      };
      return {
        ...draft,
        output: {
          ...output,
          sections: output.sections.map((section) =>
            section.topic === 'chart-overview'
              ? {
                  ...section,
                  paragraphs: [
                    section.paragraphs[0],
                    {
                      ...section.paragraphs[1],
                      text: SUMMARY_TEXTS.qiongtong,
                    },
                  ],
                }
              : section,
          ),
        },
      };
    });
    const invalid = presentationDraft(prepared.narrationTasks);
    const result = await validateBroad(prepared, drafts, {
      ...invalid,
      doubleEdge: {
        ...invalid.doubleEdge,
        friction: {
          paragraph: invalid.relationships[0].paragraph,
          structure: {
            domain: 'disposition',
            direction: 'cost',
            situation: '정답 기준이 없으면',
            behavior: '비교를 계속해',
            result: '결정과 마무리가 늦어질 수 있습니다',
          },
        },
      },
      relationships: [
        {
          paragraph: invalid.doubleEdge.friction.paragraph,
          structure: {
            domain: 'relationships',
            direction: 'descriptive',
            situation: '가까운 사이에서도',
            behavior: '생각의 과정과 결론을 나누어 말하면',
            result: '오해가 줄어듭니다',
          },
        },
      ],
    });

    expect(result).toMatchObject({
      ok: false,
      command: 'validate-reading',
      error: {
        code: 'INVALID_PRESENTATION_DRAFT',
        details: { policy: 'shared-double-edge-mechanism' },
      },
    });
  });

  test('선택 문단에 Pack 식별자가 새면 최종 표시에서 거부한다', async () => {
    const prepared = await prepareBroadReading();
    const drafts = broadDraftsFor(prepared.narrationTasks).map((draft) =>
      draft.packRef.id === 'ziping'
        ? {
            ...draft,
            output: {
              ...draft.output,
              summary: {
                text: `${draft.packRef.id} 관점에서 마감과 기준이 선명하면 판단을 밀고 나가고, 결정 속도가 빨라져 실행이 분명해집니다.`,
                findingIds: draft.output.summary.findingIds,
              },
            },
          }
        : draft,
    );
    const result = await validateBroad(prepared, drafts);

    expect(result).toMatchObject({
      ok: false,
      command: 'validate-reading',
      error: {
        code: 'INVALID_PRESENTATION_DRAFT',
        details: { policy: 'no-internal-identities' },
      },
    });
  });

  test('같은 검증 문단을 여러 표시 슬롯에 재사용하지 못한다', async () => {
    const prepared = await prepareBroadReading();
    const invalid = presentationDraft(prepared.narrationTasks);
    const result = await validateBroad(prepared, undefined, {
      ...invalid,
      atAGlance: {
        ...invalid.atAGlance,
        execution: invalid.atAGlance.disposition,
      },
    });

    expect(result).toMatchObject({
      ok: false,
      command: 'validate-reading',
      error: { code: 'INVALID_PRESENTATION_DRAFT' },
    });
  });

  test('서로 다른 source에 복제한 같은 문단도 재사용하지 못한다', async () => {
    const prepared = await prepareBroadReading();
    const drafts = broadDraftsFor(prepared.narrationTasks).map((draft) =>
      draft.packRef.id === 'ziping'
        ? {
            ...draft,
            output: {
              ...draft.output,
              summary: {
                ...draft.output.summary,
                text: SUMMARY_TEXTS.ditianshui,
              },
            },
          }
        : draft,
    );
    const invalid = presentationDraft(prepared.narrationTasks);
    const result = await validateBroad(prepared, drafts, {
      ...invalid,
      atAGlance: {
        ...invalid.atAGlance,
        execution: {
          paragraph: invalid.atAGlance.execution.paragraph,
          structure: {
            ...invalid.atAGlance.execution.structure,
            situation: '배울 범위와 마감이 정해진 과제에서는',
            behavior: '자료를 구조화해',
            result: '완성도를 높입니다',
          },
        },
      },
    });

    expect(result).toMatchObject({
      ok: false,
      command: 'validate-reading',
      error: {
        code: 'INVALID_PRESENTATION_DRAFT',
        details: { policy: 'distinct-presentation-prose' },
      },
    });
  });

  test('상황·행동·결과가 분리되지 않은 일반론을 거부한다', async () => {
    const prepared = await prepareBroadReading();
    const drafts = broadDraftsFor(prepared.narrationTasks).map((draft) => {
      if (draft.packRef.id !== 'ziping') return draft;
      return {
        ...draft,
        output: {
          ...draft.output,
          summary: {
            ...draft.output.summary,
            text: '새로운 상황에서는 충분히 생각하고 더 좋은 선택을 합니다.',
          },
        },
      };
    });
    const invalid = presentationDraft(prepared.narrationTasks);
    const result = await validateBroad(prepared, drafts, {
      ...invalid,
      atAGlance: {
        ...invalid.atAGlance,
        execution: {
          paragraph: invalid.atAGlance.execution.paragraph,
          structure: {
            ...invalid.atAGlance.execution.structure,
            situation: '새로운 상황에서는',
            behavior: '충분히 생각하고',
            result: '더 좋은 선택을 합니다',
          },
        },
      },
    });

    expect(result).toMatchObject({
      ok: false,
      command: 'validate-reading',
      error: {
        code: 'INVALID_PRESENTATION_DRAFT',
        details: { policy: 'structured-lived-pattern' },
      },
    });
  });

  test('schema 1 호환 입력도 두 문장의 연결된 해석을 유지한다', async () => {
    const prepared = await prepareBroadReading();
    const drafts = broadDraftsFor(prepared.narrationTasks).map((draft) =>
      draft.packRef.id === 'ziping'
        ? {
            ...draft,
            output: {
              ...draft.output,
              summary: {
                ...draft.output.summary,
                text: `${draft.output.summary.text} 보조 설명입니다.`,
              },
            },
          }
        : draft,
    );
    const result = await validateBroad(prepared, drafts);

    expect(result).toMatchObject({
      ok: true,
      command: 'validate-reading',
      result: { presentation: { kind: 'broad-reading' } },
    });
  });

  test('섹션 역할을 서로 바꾼 presentationDraft를 거부한다', async () => {
    const prepared = await prepareBroadReading();
    const invalid = presentationDraft(prepared.narrationTasks);
    const result = await validateBroad(prepared, undefined, {
      ...invalid,
      workStudy: invalid.relationships,
      relationships: invalid.workStudy,
    });

    expect(result).toMatchObject({
      ok: false,
      command: 'validate-reading',
      error: {
        code: 'INVALID_PRESENTATION_DRAFT',
        details: { policy: 'structured-lived-pattern-role' },
      },
    });
  });

  test.each([
    {
      packId: 'ditianshui',
      slot: 'workStudy' as const,
      text: '가까운 사이에서도 상대의 일을 먼저 확인하고 오해를 줄입니다.',
      structure: {
        domain: 'work-study' as const,
        direction: 'descriptive' as const,
        situation: '가까운 사이에서도',
        behavior: '상대의 일을 먼저 확인하고',
        result: '오해를 줄입니다',
      },
    },
    {
      packId: 'qiongtong',
      slot: 'relationships' as const,
      text: '마감이 다가오면 자료를 정리해 업무 설명이 분명해집니다.',
      structure: {
        domain: 'relationships' as const,
        direction: 'descriptive' as const,
        situation: '마감이 다가오면',
        behavior: '자료를 정리해',
        result: '업무 설명이 분명해집니다',
      },
    },
  ])(
    '$slot 슬롯의 단어 하나만 빌린 다른 생활영역 문장을 거부한다',
    async ({ packId, slot, text, structure }) => {
      const prepared = await prepareBroadReading();
      const drafts = broadDraftsFor(prepared.narrationTasks).map((draft) =>
        draft.packRef.id === packId
          ? {
              ...draft,
              output: {
                ...draft.output,
                summary: { ...draft.output.summary, text },
              },
            }
          : draft,
      );
      const invalid = presentationDraft(prepared.narrationTasks);
      const result = await validateBroad(prepared, drafts, {
        ...invalid,
        [slot]: [
          {
            paragraph: invalid[slot][0].paragraph,
            structure,
          },
        ],
      });

      expect(result).toMatchObject({
        ok: false,
        command: 'validate-reading',
        error: {
          code: 'INVALID_PRESENTATION_DRAFT',
          details: { policy: 'structured-lived-pattern-role' },
        },
      });
    },
  );

  test('양면 표의 꼬일 때 칸에 이득 문장을 넣으면 거부한다', async () => {
    const prepared = await prepareBroadReading();
    const drafts = replaceBaselineSectionParagraph(
      broadDraftsFor(prepared.narrationTasks),
      'chart-overview',
      1,
      '정보가 복잡할수록 비교 기준을 먼저 정리해 선택 속도가 빨라집니다.',
    );
    const invalid = presentationDraft(prepared.narrationTasks);
    const result = await validateBroad(prepared, drafts, {
      ...invalid,
      doubleEdge: {
        ...invalid.doubleEdge,
        friction: {
          ...invalid.doubleEdge.friction,
          structure: {
            ...invalid.doubleEdge.friction.structure,
            situation: '정보가 복잡할수록',
            behavior: '비교 기준을 먼저 정리해',
            result: '선택 속도가 빨라집니다',
          },
        },
      },
    });

    expect(result).toMatchObject({
      ok: false,
      command: 'validate-reading',
      error: {
        code: 'INVALID_PRESENTATION_DRAFT',
        details: { policy: 'structured-lived-pattern-direction' },
      },
    });
  });

  test('성과가 줄어드는 비용 문장을 strength로 선언하면 거부한다', async () => {
    const prepared = await prepareBroadReading();
    const drafts = replaceBaselineSectionParagraph(
      broadDraftsFor(prepared.narrationTasks),
      'chart-overview',
      0,
      '정보가 많을수록 연결점을 찾아 문제를 정리하고 성과가 줄어듭니다.',
    );
    const invalid = presentationDraft(prepared.narrationTasks);
    const result = await validateBroad(prepared, drafts, {
      ...invalid,
      doubleEdge: {
        ...invalid.doubleEdge,
        strength: {
          ...invalid.doubleEdge.strength,
          structure: {
            ...invalid.doubleEdge.strength.structure,
            situation: '정보가 많을수록',
            behavior: '연결점을 찾아 문제를 정리하고',
            result: '성과가 줄어듭니다',
          },
        },
      },
    });

    expect(result).toMatchObject({
      ok: false,
      command: 'validate-reading',
      error: {
        code: 'INVALID_PRESENTATION_DRAFT',
        details: { policy: 'structured-lived-pattern-direction' },
      },
    });
  });

  test('집중력이 낮아지는 비용 문장은 friction으로 올바르게 분류한다', async () => {
    const prepared = await prepareBroadReading();
    const drafts = replaceBaselineSectionParagraph(
      broadDraftsFor(prepared.narrationTasks),
      'chart-overview',
      1,
      '정답 기준이 없으면 비교를 계속해 집중력이 낮아집니다.',
    );
    const valid = presentationDraft(prepared.narrationTasks);
    const result = await validateBroad(prepared, drafts, {
      ...valid,
      doubleEdge: {
        ...valid.doubleEdge,
        friction: {
          ...valid.doubleEdge.friction,
          structure: {
            ...valid.doubleEdge.friction.structure,
            situation: '정답 기준이 없으면',
            behavior: '비교를 계속해',
            result: '집중력이 낮아집니다',
          },
        },
      },
    });

    expect(result.ok, JSON.stringify(result)).toBe(true);
  });

  test.each([
    {
      slot: 'strength' as const,
      paragraphIndex: 0 as const,
      text: '정보가 많을수록 연결점을 찾아 문제를 정리해 오해를 줄이지 못합니다.',
      situation: '정보가 많을수록',
      behavior: '연결점을 찾아 문제를 정리해',
      result: '오해를 줄이지 못합니다',
    },
    {
      slot: 'friction' as const,
      paragraphIndex: 1 as const,
      text: '정답 기준이 없으면 비교를 계속해 오해가 늘지 않습니다.',
      situation: '정답 기준이 없으면',
      behavior: '비교를 계속해',
      result: '오해가 늘지 않습니다',
    },
    {
      slot: 'friction' as const,
      paragraphIndex: 1 as const,
      text: '정답 기준이 없으면 비교를 계속해 집중력이 낮지 않습니다.',
      situation: '정답 기준이 없으면',
      behavior: '비교를 계속해',
      result: '집중력이 낮지 않습니다',
    },
    {
      slot: 'strength' as const,
      paragraphIndex: 0 as const,
      text: '정보가 많을수록 연결점을 찾아 문제를 정리해 오해가 안 줄어듭니다.',
      situation: '정보가 많을수록',
      behavior: '연결점을 찾아 문제를 정리해',
      result: '오해가 안 줄어듭니다',
    },
    {
      slot: 'strength' as const,
      paragraphIndex: 0 as const,
      text: '정보가 많을수록 연결점을 찾아 문제를 정리해 오해가 줄어드는 것은 아닙니다.',
      situation: '정보가 많을수록',
      behavior: '연결점을 찾아 문제를 정리해',
      result: '오해가 줄어드는 것은 아닙니다',
    },
  ])(
    '방향 술어를 부정한 $result 문장은 benefit/cost 칸에서 거부한다',
    async ({ slot, paragraphIndex, text, situation, behavior, result: resultText }) => {
      const prepared = await prepareBroadReading();
      const drafts = replaceBaselineSectionParagraph(
        broadDraftsFor(prepared.narrationTasks),
        'chart-overview',
        paragraphIndex,
        text,
      );
      const invalid = presentationDraft(prepared.narrationTasks);
      const selected = invalid.doubleEdge[slot];
      const result = await validateBroad(prepared, drafts, {
        ...invalid,
        doubleEdge: {
          ...invalid.doubleEdge,
          [slot]: {
            ...selected,
            structure: {
              ...selected.structure,
              situation,
              behavior,
              result: resultText,
            },
          },
        },
      });

      expect(result).toMatchObject({
        ok: false,
        command: 'validate-reading',
        error: {
          code: 'INVALID_PRESENTATION_DRAFT',
          details: { policy: 'structured-lived-pattern-direction' },
        },
      });
    },
  );

  test.each([
    { prefix: '#', escaped: '\\#' },
    { prefix: '-', escaped: '\\-' },
    { prefix: '+', escaped: '\\+' },
  ])(
    '선택된 평문의 행 시작 제어 문자 $prefix는 고정 레이아웃을 바꾸지 못한다',
    async ({ prefix, escaped }) => {
      const prepared = await prepareBroadReading();
      const drafts = broadDraftsFor(prepared.narrationTasks).map((draft) =>
        draft.packRef.id === 'calculation-baseline'
          ? {
              ...draft,
              output: {
                ...draft.output,
                summary: {
                  ...draft.output.summary,
                  text: `${prefix} 상황을 넓게 살피며 *핵심*과 | 변수를 정리하는 사람입니다.`,
                },
              },
            }
          : draft,
      );
      const invalid = presentationDraft(prepared.narrationTasks);
      const result = await validateBroad(prepared, drafts, {
        ...invalid,
        portrait: {
          ...invalid.portrait,
          structure: {
            process: '상황을 넓게 살피며 *핵심*과 | 변수를 정리하는',
            identity: '사람입니다',
          },
        },
      });

      expect(result.ok, JSON.stringify(result)).toBe(true);
      if (!result.ok || result.command !== 'validate-reading') return;
      expect(result.result.presentation?.markdown).toContain(
        `${escaped} 상황을 넓게 살피며 \\*핵심\\*과 \\| 변수를 정리하는 사람입니다.`,
      );
      expect(result.result.presentation?.markdown.match(/^## /gmu)).toHaveLength(4);
    },
  );

  test('행 시작의 순서 목록 표기도 Markdown 목록으로 해석되지 않게 이스케이프한다', () => {
    expect(escapeBroadPresentationMarkdownText('1. 첫 번째 설명입니다.')).toBe(
      '1\\. 첫 번째 설명입니다.',
    );
  });

  test('생시 미상 조건을 문단마다 반복하지 않고 표식과 한 번의 범례로 보존한다', async () => {
    const request = {
      ...BROAD_REQUEST,
      calculation: {
        kind: 'possibilities' as const,
        request: {
          birth: {
            date: { calendar: 'gregorian' as const, year: 1996, month: 5, day: 27 },
            time: { kind: 'unknown' as const },
            timeZone: 'Asia/Seoul',
          },
        },
      },
    };
    const prepared = await executeOhMySaju({ command: 'prepare-reading', request });
    if (!prepared.ok || prepared.command !== 'prepare-reading') {
      throw new Error(`prepare failed: ${JSON.stringify(prepared)}`);
    }
    const tasks = prepared.result.narrationTasks;
    const result = await executeOhMySaju({
      command: 'validate-reading',
      request,
      preparedDigest: prepared.result.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'fixture-model' },
      drafts: broadDraftsFor(tasks),
      presentationDraft: presentationDraft(tasks),
    });

    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok || result.command !== 'validate-reading') return;
    const markdown = result.result.presentation?.markdown ?? '';
    expect(markdown.match(/조건 표시:/gu)).toHaveLength(1);
    expect(markdown).toContain('◇ 확인된 기둥 범위만 반영한 부분');
    expect(markdown).not.toContain('조건 표시: ·');
    expect(markdown).toContain('◇ ');
    expect(markdown).not.toContain('확인된 기둥 범위의 부분 결과입니다.');
  });

  test('focused 요청은 broad presentation 없이 기존 검증 흐름을 유지한다', async () => {
    const request = {
      ...BROAD_REQUEST,
      question: '오행 분포만 알려줘.',
      readingMode: 'focused' as const,
    };
    const prepared = await executeOhMySaju({ command: 'prepare-reading', request });
    if (!prepared.ok || prepared.command !== 'prepare-reading') {
      throw new Error(`prepare failed: ${JSON.stringify(prepared)}`);
    }
    const result = await executeOhMySaju({
      command: 'validate-reading',
      request,
      preparedDigest: prepared.result.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'fixture-model' },
      drafts: prepared.result.narrationTasks
        .filter(({ requiresDraft }) => requiresDraft)
        .map(draftFor),
    });

    expect(result).toMatchObject({
      ok: true,
      command: 'validate-reading',
      result: { presentation: null },
    });
  });

  test('legacy auto broad 요청에는 새 presentationDraft를 강제하지 않는다', async () => {
    const request = { ...BROAD_REQUEST, readingMode: undefined };
    const prepared = await executeOhMySaju({ command: 'prepare-reading', request });
    if (!prepared.ok || prepared.command !== 'prepare-reading') {
      throw new Error(`prepare failed: ${JSON.stringify(prepared)}`);
    }
    const result = await executeOhMySaju({
      command: 'validate-reading',
      request,
      preparedDigest: prepared.result.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'fixture-model' },
      drafts: prepared.result.narrationTasks
        .filter(({ requiresDraft }) => requiresDraft)
        .map(draftFor),
    });

    expect(result).toMatchObject({
      ok: true,
      command: 'validate-reading',
      result: { presentation: null },
    });
  });

  test('명시적 focused 분류는 자유문 추정보다 caller 의도를 우선한다', async () => {
    const result = await executeOhMySaju({
      command: 'prepare-reading',
      request: { ...BROAD_REQUEST, question: '사주 좀 봐줘.', readingMode: 'focused' },
    });

    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok || result.command !== 'prepare-reading') return;
    expect(
      result.result.narrationTasks.map(({ request }) => request.task.readingPolicy.mode),
    ).toEqual(['focused', 'focused', 'focused', 'focused', 'focused']);
  });

  test('명시적 technical-audit 분류도 질문 주제로 사전 거부하지 않는다', async () => {
    const result = await executeOhMySaju({
      command: 'prepare-reading',
      request: { ...BROAD_REQUEST, question: '사주 좀 봐줘.', readingMode: 'technical-audit' },
    });

    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok || result.command !== 'prepare-reading') return;
    expect(result.result.narrationTasks[0]?.request.task.readingPolicy).toMatchObject({
      mode: 'technical-audit',
      auditMetaRequested: false,
      structuredBroadPresentation: false,
    });
  });

  test('전체 풀이에 직업·연애 관심사가 함께 있어도 auto는 broad로 분류한다', async () => {
    const result = await executeOhMySaju({
      command: 'prepare-reading',
      request: {
        ...BROAD_REQUEST,
        question: '사주 전체적으로 봐줘. 직업과 연애도 궁금해.',
        readingMode: 'auto',
      },
    });

    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok || result.command !== 'prepare-reading') return;
    expect(result.result.narrationTasks[0]?.request.task.readingPolicy).toMatchObject({
      mode: 'broad',
      structuredBroadPresentation: false,
    });
  });
});
