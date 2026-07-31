/** Chart-first default-profile contract and renderer regression tests. */
import { describe, expect, test } from 'vitest';
import {
  executeOhMySaju,
  type OhMySajuDefaultProfileDraft,
  type OhMySajuNarrationDraft,
  type OhMySajuParagraphRef,
  type OhMySajuProfileParagraphRef,
  type OhMySajuResponse,
  type PreparedOhMySajuReading,
} from '../application';
import { profileTenGodTexts } from './broad-presentation';

const REQUEST = {
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
  question: '사주 좀 봐줘.',
  readingMode: 'broad' as const,
  locale: 'ko-KR' as const,
  purpose: 'general-reading',
  audience: 'adult' as const,
  variantPolicy: 'include-candidate-dependent' as const,
};

type Task = PreparedOhMySajuReading['narrationTasks'][number];

async function prepare(): Promise<PreparedOhMySajuReading> {
  const response = await executeOhMySaju({ command: 'prepare-reading', request: REQUEST });
  if (!response.ok || response.command !== 'prepare-reading') {
    throw new Error(`prepare failed: ${JSON.stringify(response)}`);
  }
  return response.result;
}

function finding(task: Task, topic: string): Task['request']['evidence']['findings'][number] {
  const match = task.request.evidence.findings.find((item) => item.topic === topic);
  if (match === undefined) throw new Error(`${task.packRef.id} requires ${topic}`);
  return match;
}

function defaultProfileDrafts(tasks: readonly Task[]): readonly OhMySajuNarrationDraft[] {
  return tasks
    .filter(({ requiresDraft }) => requiresDraft)
    .map((task): OhMySajuNarrationDraft => {
      const first = task.request.evidence.findings[0];
      if (first === undefined) throw new Error(`${task.packRef.id} requires a finding`);
      if (task.packRef.id === 'calculation-baseline') {
        const dayMaster = finding(task, 'day-master');
        const chartFindings = task.request.evidence.findings.filter(
          ({ topic }) => topic === 'chart-overview',
        );
        const month = chartFindings.find(({ statement }) => statement.includes('month 기둥'));
        const day = chartFindings.find(({ statement }) => statement.includes('day 기둥'));
        const tenGods = finding(task, 'ten-gods');
        if (month === undefined || day === undefined) {
          throw new Error('baseline requires month and day pillar findings');
        }
        return {
          packRef: task.packRef,
          output: {
            summary: {
              text: '자월의 임수 일간에 월주와 일주의 임자가 겹쳐 자기 기운이 두텁고, 그 힘을 어디로 내보내느냐가 삶의 중심이 되는 명식입니다.',
              findingIds: [dayMaster.id, month.id, day.id],
            },
            sections: [
              {
                topic: 'chart-overview',
                paragraphs: [
                  {
                    text: '월주와 일주가 모두 임자로 중첩됩니다. 같은 기둥이 사회 자리와 자기 자리에 반복되어 자기 기준이 명식의 중심축이 됩니다.',
                    findingIds: [month.id, day.id],
                  },
                  {
                    text: '연주의 정축과 시주의 을사가 양쪽에 놓이고 가운데 임자가 두 번 이어집니다. 모인 수 기운을 표현과 현실 결과 쪽으로 흘려보내는지가 구조의 관건입니다.',
                    findingIds: chartFindings.map(({ id }) => id),
                  },
                ],
              },
              {
                topic: 'ten-gods',
                paragraphs: [
                  {
                    text: '시주의 상관·편재는 생각을 표현과 현실 결과로 이어내는 통로입니다. 자율적으로 문제를 정리하고 결과물을 만들어야 하는 역할에서 이 축이 잘 살아납니다.',
                    findingIds: [tenGods.id],
                  },
                  {
                    text: '월주와 일주의 비견·겁재는 가까운 관계에서도 자기 판단권을 쉽게 넘기지 않는 쪽으로 작용합니다. 서로의 독립 영역이 분명할 때 편하지만, 조언이 통제로 느껴지면 힘겨루기가 생길 수 있습니다.',
                    findingIds: [tenGods.id],
                  },
                ],
              },
            ],
          },
        };
      }
      if (task.packRef.id === 'ditianshui') {
        const seasonal = finding(task, 'strength');
        const strengthFindings = task.request.evidence.findings.filter(
          ({ topic }) => topic === 'strength',
        );
        return {
          packRef: task.packRef,
          output: {
            summary: {
              text: '임수는 자월에서 계절적으로 왕하고 지장간에도 비겁 근거가 반복됩니다. 힘이 모자라 멈추는 명식보다 강한 자기 동력을 어디로 흘릴지가 중요한 명식입니다.',
              findingIds: strengthFindings.map(({ id }) => id),
            },
            sections: [
              {
                topic: 'strength',
                paragraphs: [
                  {
                    text: '자월의 임수가 계절 힘을 받고 비겁 근거가 거듭됩니다. 자기 기준이 선 뒤에는 쉽게 흔들리지 않고 긴 호흡으로 밀고 가는 힘이 있습니다.',
                    findingIds: strengthFindings.map(({ id }) => id),
                  },
                  {
                    text: '자월의 임수와 비겁 근거가 겹치는 힘이 과해지면, 외부의 제동을 참고 자료보다 간섭으로 받아들여 방향 수정이 늦어질 수 있습니다.',
                    findingIds: [seasonal.id, ...strengthFindings.slice(1).map(({ id }) => id)],
                  },
                ],
              },
            ],
          },
        };
      }
      if (task.packRef.id === 'ziping') {
        return {
          packRef: task.packRef,
          output: {
            summary: {
              text: '월지와 일간의 관계를 보면 자기 힘을 오래 유지하는 사람으로 읽힙니다.',
              findingIds: [first.id],
            },
            sections: [],
          },
        };
      }
      return {
        packRef: task.packRef,
        output: {
          summary: {
            text: '이 근거는 이번 기본 풀이의 중심 문장으로 사용하지 않습니다.',
            findingIds: [first.id],
          },
          sections: [],
        },
      };
    });
}

function replaceDraftSummary(
  drafts: readonly OhMySajuNarrationDraft[],
  packId: string,
  text: string,
): readonly OhMySajuNarrationDraft[] {
  return drafts.map((draft) => {
    if (draft.packRef.id !== packId) return draft;
    const output = draft.output as {
      readonly summary: { readonly text: string; readonly findingIds: readonly string[] };
      readonly sections: readonly unknown[];
    };
    return {
      ...draft,
      output: {
        ...output,
        summary: { ...output.summary, text },
      },
    };
  });
}

function replaceDraftSectionParagraph(
  drafts: readonly OhMySajuNarrationDraft[],
  packId: string,
  topic: string,
  paragraphIndex: number,
  text: string,
): readonly OhMySajuNarrationDraft[] {
  return drafts.map((draft) => {
    if (draft.packRef.id !== packId) return draft;
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

function defaultProfileDraft(tasks: readonly Task[]): OhMySajuDefaultProfileDraft {
  const task = (id: string): Task => {
    const match = tasks.find(({ packRef }) => packRef.id === id);
    if (match === undefined) throw new Error(`${id} task missing`);
    return match;
  };
  const summary = (id: string): OhMySajuParagraphRef => ({
    packRef: task(id).packRef,
    source: { kind: 'summary' },
  });
  const section = (
    id: string,
    topic: 'chart-overview' | 'ten-gods' | 'strength',
    paragraphIndex: 0 | 1,
  ): OhMySajuParagraphRef => ({
    packRef: task(id).packRef,
    source: { kind: 'section', topic, paragraphIndex },
  });
  const profile = (
    paragraph: OhMySajuParagraphRef,
    role: OhMySajuProfileParagraphRef['structure']['role'],
    basis: string,
    interpretation: string,
  ): OhMySajuProfileParagraphRef => ({
    paragraph,
    structure: { role, basis, interpretation },
  });
  return {
    schemaVersion: '2',
    kind: 'default-profile',
    thesis: {
      paragraph: summary('calculation-baseline'),
      structure: {
        basis: '자월의 임수 일간에 월주와 일주의 임자가 겹쳐',
        portrait: '자기 기운이 두텁고, 그 힘을 어디로 내보내느냐가 삶의 중심이 되는 명식입니다',
      },
    },
    core: [
      profile(
        summary('ditianshui'),
        'core',
        '임수는 자월에서 계절적으로 왕하고 지장간에도 비겁 근거가 반복됩니다',
        '힘이 모자라 멈추는 명식보다 강한 자기 동력을 어디로 흘릴지가 중요한 명식입니다',
      ),
      profile(
        section('calculation-baseline', 'chart-overview', 0),
        'core',
        '월주와 일주가 모두 임자로 중첩됩니다',
        '같은 기둥이 사회 자리와 자기 자리에 반복되어 자기 기준이 명식의 중심축이 됩니다',
      ),
    ],
    temperament: {
      strength: profile(
        section('ditianshui', 'strength', 0),
        'strength',
        '자월의 임수가 계절 힘을 받고 비겁 근거가 거듭됩니다',
        '자기 기준이 선 뒤에는 쉽게 흔들리지 않고 긴 호흡으로 밀고 가는 힘이 있습니다',
      ),
      blindSpot: profile(
        section('ditianshui', 'strength', 1),
        'blind-spot',
        '자월의 임수와 비겁 근거가 겹치는 힘이 과해지면',
        '외부의 제동을 참고 자료보다 간섭으로 받아들여 방향 수정이 늦어질 수 있습니다',
      ),
    },
    work: [
      profile(
        section('calculation-baseline', 'ten-gods', 0),
        'work',
        '시주의 상관·편재는 생각을 표현과 현실 결과로 이어내는 통로입니다',
        '자율적으로 문제를 정리하고 결과물을 만들어야 하는 역할에서 이 축이 잘 살아납니다',
      ),
    ],
    relationships: [
      profile(
        section('calculation-baseline', 'ten-gods', 1),
        'relationships',
        '월주와 일주의 비견·겁재는 가까운 관계에서도 자기 판단권을 쉽게 넘기지 않는 쪽으로 작용합니다',
        '서로의 독립 영역이 분명할 때 편하지만, 조언이 통제로 느껴지면 힘겨루기가 생길 수 있습니다',
      ),
    ],
  };
}

async function validate(
  prepared: PreparedOhMySajuReading,
  presentationDraft: unknown = defaultProfileDraft(prepared.narrationTasks),
  drafts: readonly OhMySajuNarrationDraft[] = defaultProfileDrafts(prepared.narrationTasks),
): Promise<OhMySajuResponse> {
  return executeOhMySaju({
    command: 'validate-reading',
    request: REQUEST,
    preparedDigest: prepared.binding.digest,
    narrator: { id: 'test-host', requestedModel: 'fixture-model' },
    drafts,
    presentationDraft,
  });
}

describe('default-profile v2', () => {
  test('생시 미상이어도 확인된 삼주의 십신은 표시하고 시주만 미상으로 둔다', () => {
    const reading = {
      calculationKind: 'possibilities',
      calculation: {
        hourPillar: 'omitted',
        stablePillars: {
          year: { stem: { korean: '신' }, branch: { korean: '사' } },
          month: { stem: { korean: '정' }, branch: { korean: '유' } },
          day: { stem: { korean: '경' }, branch: { korean: '진' } },
          hour: null,
        },
      },
    } as unknown as Parameters<typeof profileTenGodTexts>[0];

    expect(profileTenGodTexts(reading)).toEqual(['겁재·편관', '정관·겁재', '일간·편인', '미상']);
  });

  test('원국·십신·오행을 먼저 보이고 중심 구조로 성향·일·관계를 이어 쓴다', async () => {
    const prepared = await prepare();
    const response = await validate(prepared);
    expect(response.ok, JSON.stringify(response)).toBe(true);
    if (!response.ok || response.command !== 'validate-reading') return;
    expect(response.result.presentation).toMatchObject({
      schemaVersion: '2',
      kind: 'default-profile',
      sourceRefs: { schemaVersion: '2', kind: 'default-profile' },
    });
    const markdown = response.result.presentation?.markdown ?? '';
    expect(markdown).toContain('| 간지 | 정축(丁丑) | 임자(壬子) | 임자(壬子) | 을사(乙巳) |');
    expect(markdown).toContain('| 십신 | 정재·정관 | 비견·겁재 | 일간·겁재 | 상관·편재 |');
    expect(markdown).toContain('**오행 분포(지장간 포함)**');
    expect(markdown).toContain('## 핵심 구조');
    expect(markdown).toContain('## 어떤 사람인가');
    expect(markdown).toContain('## 일·재능');
    expect(markdown).toContain('## 관계');
    expect(markdown).not.toContain('## 한눈에 보면');
    expect(markdown).not.toContain('한 줄 정리');
    expect(markdown).not.toContain('과학적 타당성');
    expect(markdown).not.toContain('최종 판정');
  });

  test('계절을 현실의 환경으로 오역한 profile 문장을 거부한다', async () => {
    const prepared = await prepare();
    const draft = defaultProfileDraft(prepared.narrationTasks);
    const text =
      '겨울 기운이 강한 환경에서는 주변의 독려가 없어도 한 방향으로 오래 밀고 가는 힘이 생깁니다.';
    const drafts = replaceDraftSummary(
      defaultProfileDrafts(prepared.narrationTasks),
      'ditianshui',
      text,
    );
    const response = await validate(
      prepared,
      {
        ...draft,
        core: [
          {
            ...draft.core[0],
            structure: {
              ...draft.core[0].structure,
              basis: '겨울 기운이 강한 환경에서는',
              interpretation: '주변의 독려가 없어도 한 방향으로 오래 밀고 가는 힘이 생깁니다',
            },
          },
          draft.core[1],
        ],
      },
      drafts,
    );
    expect(response).toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_PRESENTATION_DRAFT',
        details: { policy: 'chart-to-interpretation-bridge', path: 'core[0]' },
      },
    });
  });

  test('일반 한국어 음절을 합·파·해 근거처럼 이용한 문장을 거부한다', async () => {
    const prepared = await prepare();
    const draft = defaultProfileDraft(prepared.narrationTasks);
    const text = '여러 조건을 빠르게 파악해 업무의 핵심을 정리하고 결과물을 만듭니다.';
    const drafts = replaceDraftSectionParagraph(
      defaultProfileDrafts(prepared.narrationTasks),
      'calculation-baseline',
      'ten-gods',
      0,
      text,
    );
    const response = await validate(
      prepared,
      {
        ...draft,
        work: [
          {
            ...draft.work[0],
            structure: {
              ...draft.work[0].structure,
              basis: '여러 조건을 빠르게 파악해',
              interpretation: '업무의 핵심을 정리하고 결과물을 만듭니다',
            },
          },
        ],
      },
      drafts,
    );
    expect(response).toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_PRESENTATION_DRAFT',
        details: { policy: 'chart-to-interpretation-bridge', path: 'work[0]' },
      },
    });
  });

  test('명식 근거 뒤에 사용자가 지적한 일반 코칭 문장을 붙여도 거부한다', async () => {
    const prepared = await prepare();
    const draft = defaultProfileDraft(prepared.narrationTasks);
    const text =
      '시주의 상관·편재는 표현과 결과의 통로입니다. 여러 조건을 빠르게 읽어 업무의 핵심을 정리합니다.';
    const drafts = replaceDraftSectionParagraph(
      defaultProfileDrafts(prepared.narrationTasks),
      'calculation-baseline',
      'ten-gods',
      0,
      text,
    );
    const response = await validate(
      prepared,
      {
        ...draft,
        work: [
          {
            ...draft.work[0],
            structure: {
              ...draft.work[0].structure,
              basis: '시주의 상관·편재는 표현과 결과의 통로입니다',
              interpretation: '여러 조건을 빠르게 읽어 업무의 핵심을 정리합니다',
            },
          },
        ],
      },
      drafts,
    );
    expect(response).toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_PRESENTATION_DRAFT',
        details: { policy: 'generic-profile-coaching', path: 'work[0]' },
      },
    });
  });

  test('관계 문장과 일 문장의 role만 바꿔 붙이는 것을 거부한다', async () => {
    const prepared = await prepare();
    const draft = defaultProfileDraft(prepared.narrationTasks);
    const response = await validate(prepared, {
      ...draft,
      work: [
        {
          ...draft.relationships[0],
          structure: {
            ...draft.relationships[0].structure,
            role: 'work',
          },
        },
      ],
      relationships: [
        {
          ...draft.work[0],
          structure: {
            ...draft.work[0].structure,
            role: 'relationships',
          },
        },
      ],
    });
    expect(response).toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_PRESENTATION_DRAFT',
        details: { policy: 'default-profile-role', path: 'work[0]', role: 'work' },
      },
    });
  });

  test('서로 다른 두 핵심 구조를 같은 finding 묶음의 말바꾸기로 채우지 못한다', async () => {
    const prepared = await prepare();
    const draft = defaultProfileDraft(prepared.narrationTasks);
    let drafts = defaultProfileDrafts(prepared.narrationTasks);
    drafts = replaceDraftSectionParagraph(
      drafts,
      'calculation-baseline',
      'chart-overview',
      0,
      '월주와 일주가 모두 임자로 중첩됩니다. 자기 기준이 선 뒤에는 쉽게 흔들리지 않고 긴 호흡으로 밀고 가는 힘이 있습니다.',
    );
    drafts = replaceDraftSectionParagraph(
      drafts,
      'calculation-baseline',
      'chart-overview',
      1,
      '월주와 일주의 임자 반복이 과해지면, 외부의 제동을 간섭으로 받아들여 방향 수정이 늦어질 수 있습니다.',
    );
    const response = await validate(
      prepared,
      {
        ...draft,
        core: [
          draft.core[0],
          {
            paragraph: draft.temperament.strength.paragraph,
            structure: {
              role: 'core',
              basis: '자월의 임수가 계절 힘을 받고 비겁 근거가 거듭됩니다',
              interpretation:
                '자기 기준이 선 뒤에는 쉽게 흔들리지 않고 긴 호흡으로 밀고 가는 힘이 있습니다',
            },
          },
        ],
        temperament: {
          strength: {
            paragraph: draft.core[1].paragraph,
            structure: {
              role: 'strength',
              basis: '월주와 일주가 모두 임자로 중첩됩니다',
              interpretation:
                '자기 기준이 선 뒤에는 쉽게 흔들리지 않고 긴 호흡으로 밀고 가는 힘이 있습니다',
            },
          },
          blindSpot: {
            paragraph: {
              packRef: draft.core[1].paragraph.packRef,
              source: { kind: 'section', topic: 'chart-overview', paragraphIndex: 1 },
            },
            structure: {
              role: 'blind-spot',
              basis: '월주와 일주의 임자 반복이 과해지면',
              interpretation: '외부의 제동을 간섭으로 받아들여 방향 수정이 늦어질 수 있습니다',
            },
          },
        },
      },
      drafts,
    );
    expect(response).toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_PRESENTATION_DRAFT',
        details: { policy: 'distinct-central-mechanisms' },
      },
    });
  });

  test('격국·용신·신살 summary를 기본 프로필 근거로 세탁하지 못한다', async () => {
    const prepared = await prepare();
    const draft = defaultProfileDraft(prepared.narrationTasks);
    const response = await validate(prepared, {
      ...draft,
      thesis: {
        paragraph: {
          packRef: prepared.narrationTasks.find(({ packRef }) => packRef.id === 'ziping')?.packRef,
          source: { kind: 'summary' },
        },
        structure: {
          basis: '월지와 일간의 관계를 보면',
          portrait: '자기 힘을 오래 유지하는 사람으로 읽힙니다',
        },
      },
    });
    expect(response).toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_PRESENTATION_DRAFT',
        details: { policy: 'default-profile-topic-boundary' },
      },
    });
  });
});
