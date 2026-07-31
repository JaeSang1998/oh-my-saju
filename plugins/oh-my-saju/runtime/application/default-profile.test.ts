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
        const month = chartFindings.find(({ ruleId }) => ruleId === 'core.pillar-month');
        const day = chartFindings.find(({ ruleId }) => ruleId === 'core.pillar-day');
        const tenGods = finding(task, 'ten-gods');
        if (month === undefined || day === undefined) {
          throw new Error('baseline requires month and day pillar findings');
        }
        return {
          packRef: task.packRef,
          output: {
            summary: {
              text: '자월의 임수 일간에 월주와 일주가 임자로 겹치고, 연주의 정축과 시주의 을사가 양 끝에 놓입니다. 이 명식은 생각과 감정을 오래 품었다가 말이나 작업으로 한꺼번에 꺼내는 성향이 두드러집니다.',
              findingIds: [dayMaster.id, month.id, day.id],
            },
            sections: [
              {
                topic: 'chart-overview',
                paragraphs: [
                  {
                    text: '월주와 일주가 모두 임자로 중첩되고 연주의 정축, 시주의 을사가 양 끝에 놓입니다. 한 번 붙든 문제를 오래 생각하고, 마무리할 때는 생각을 말이나 작업으로 분명히 내놓습니다.',
                    findingIds: [month.id, day.id],
                  },
                  {
                    text: '연주의 정축과 시주의 을사가 양쪽에 놓이고 가운데 임자가 두 번 이어집니다. 모인 수 기운을 말이나 실제 작업으로 어떻게 꺼내느냐가 중요합니다.',
                    findingIds: chartFindings.map(({ id }) => id),
                  },
                ],
              },
              {
                topic: 'ten-gods',
                paragraphs: [
                  {
                    text: '시주의 을목 상관과 사화 편재는 머릿속 판단을 밖으로 표현하고 기회를 붙드는 자리입니다. 정해진 답을 반복하는 업무보다 문제를 다시 정의하고 끝까지 완성하는 프로젝트에서 실력이 잘 드러납니다.',
                    findingIds: [tenGods.id],
                  },
                  {
                    text: '월주 비견·겁재와 일지 겁재가 나란히 있어 가까운 사람의 의견도 곧바로 내 결론으로 받아들이지 않는 배치입니다. 상대가 이유 없이 결론부터 밀면 말을 줄이거나 버팁니다. 충분히 설명을 나눈 뒤에는 서로 맡을 몫이 분명한 관계를 편하게 느낍니다.',
                    findingIds: [tenGods.id],
                  },
                  {
                    text: '연간의 정재와 시지의 편재가 함께 드러나고 시주의 상관이 편재와 맞닿습니다. 고정된 보상에만 머물기보다 아이디어나 기회로 돈을 벌려는 편입니다. 가능성이 보이면 여러 곳에 돈을 써 지출 기준이 흐려질 수 있습니다.',
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
              text: '임수는 자월의 계절 힘을 받고 월지·일지 자수에 두 번 뿌리를 둡니다. 처음 반짝하기보다 시간이 지나도 한 주제를 오래 붙드는 힘이 큽니다.',
              findingIds: strengthFindings.map(({ id }) => id),
            },
            sections: [
              {
                topic: 'strength',
                paragraphs: [
                  {
                    text: '자월의 계절 힘과 월지·일지의 자수 뿌리가 겹칩니다. 혼자 맡은 장기 과제에서 주변의 열기가 식어도 핵심 문제를 끝까지 붙들고 마칩니다.',
                    findingIds: strengthFindings.map(({ id }) => id),
                  },
                  {
                    text: '같은 자월의 힘과 두 자수 뿌리가 과해지면, 이미 깊이 들어간 문제에서 빠져나오는 속도가 늦어집니다. 다른 방향으로 고쳐 달라는 말을 들으면 내용보다 하던 일이 끊긴다는 불편함이 먼저 들어 수정할 때를 놓칠 수 있습니다.',
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
    paragraphIndex: 0 | 1 | 2,
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
        basis:
          '자월의 임수 일간에 월주와 일주가 임자로 겹치고, 연주의 정축과 시주의 을사가 양 끝에 놓입니다',
        portrait:
          '이 명식은 생각과 감정을 오래 품었다가 말이나 작업으로 한꺼번에 꺼내는 성향이 두드러집니다',
      },
    },
    core: [
      profile(
        summary('ditianshui'),
        'core',
        '임수는 자월의 계절 힘을 받고 월지·일지 자수에 두 번 뿌리를 둡니다',
        '처음 반짝하기보다 시간이 지나도 한 주제를 오래 붙드는 힘이 큽니다',
      ),
      profile(
        section('calculation-baseline', 'chart-overview', 0),
        'core',
        '월주와 일주가 모두 임자로 중첩되고 연주의 정축, 시주의 을사가 양 끝에 놓입니다',
        '한 번 붙든 문제를 오래 생각하고, 마무리할 때는 생각을 말이나 작업으로 분명히 내놓습니다',
      ),
    ],
    temperament: {
      strength: profile(
        section('ditianshui', 'strength', 0),
        'strength',
        '자월의 계절 힘과 월지·일지의 자수 뿌리가 겹칩니다',
        '혼자 맡은 장기 과제에서 주변의 열기가 식어도 핵심 문제를 끝까지 붙들고 마칩니다',
      ),
      blindSpot: profile(
        section('ditianshui', 'strength', 1),
        'blind-spot',
        '같은 자월의 힘과 두 자수 뿌리가 과해지면',
        '이미 깊이 들어간 문제에서 빠져나오는 속도가 늦어집니다. 다른 방향으로 고쳐 달라는 말을 들으면 내용보다 하던 일이 끊긴다는 불편함이 먼저 들어 수정할 때를 놓칠 수 있습니다',
      ),
    },
    work: [
      profile(
        section('calculation-baseline', 'ten-gods', 0),
        'work',
        '시주의 을목 상관과 사화 편재는 머릿속 판단을 밖으로 표현하고 기회를 붙드는 자리입니다',
        '정해진 답을 반복하는 업무보다 문제를 다시 정의하고 끝까지 완성하는 프로젝트에서 실력이 잘 드러납니다',
      ),
    ],
    money: [
      profile(
        section('calculation-baseline', 'ten-gods', 2),
        'money',
        '연간의 정재와 시지의 편재가 함께 드러나고 시주의 상관이 편재와 맞닿습니다',
        '고정된 보상에만 머물기보다 아이디어나 기회로 돈을 벌려는 편입니다. 가능성이 보이면 여러 곳에 돈을 써 지출 기준이 흐려질 수 있습니다',
      ),
    ],
    relationships: [
      profile(
        section('calculation-baseline', 'ten-gods', 1),
        'relationships',
        '월주 비견·겁재와 일지 겁재가 나란히 있어 가까운 사람의 의견도 곧바로 내 결론으로 받아들이지 않는 배치입니다',
        '상대가 이유 없이 결론부터 밀면 말을 줄이거나 버팁니다. 충분히 설명을 나눈 뒤에는 서로 맡을 몫이 분명한 관계를 편하게 느낍니다',
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
    expect(markdown).toContain('## 성격과 행동 방식');
    expect(markdown).toContain('## 강점과 주의점');
    expect(markdown).toContain('## 일·재능');
    expect(markdown).toContain('## 돈과 현실 감각');
    expect(markdown).toContain('## 관계');
    expect(markdown).toContain('_(근거:');
    expect(markdown).not.toContain('## 한눈에 보면');
    expect(markdown).not.toContain('한 줄 정리');
    expect(markdown).not.toContain('과학적 타당성');
    expect(markdown).not.toContain('최종 판정');

    const withoutMoney = await validate(
      prepared,
      { ...defaultProfileDraft(prepared.narrationTasks), money: undefined },
      defaultProfileDrafts(prepared.narrationTasks),
    );
    expect(withoutMoney).toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_PRESENTATION_DRAFT',
        details: { policy: 'default-profile-money-required' },
      },
    });
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

  test.each([
    '계획이 틀어져도 다른 길을 찾는 복원력으로 쓰일 수 있습니다',
    '생각을 표현과 현실적 결과로 흘려보내면 추진력이 커집니다',
    '돈과 자원을 빠르게 배치하는 이중 리듬이 있습니다',
    '한도를 미리 정하면 판단이 선명해집니다',
    '감정을 먼저 확인하면 거리가 빨리 회복됩니다',
  ])('번역체 해석 문장 %s을 거부한다', async (interpretation) => {
    const prepared = await prepare();
    const draft = defaultProfileDraft(prepared.narrationTasks);
    const basis = '자월의 계절 힘과 월지·일지의 자수 뿌리가 겹칩니다';
    const drafts = replaceDraftSectionParagraph(
      defaultProfileDrafts(prepared.narrationTasks),
      'ditianshui',
      'strength',
      0,
      `${basis}. ${interpretation}.`,
    );
    const response = await validate(
      prepared,
      {
        ...draft,
        temperament: {
          ...draft.temperament,
          strength: {
            ...draft.temperament.strength,
            structure: {
              ...draft.temperament.strength.structure,
              basis,
              interpretation,
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
        details: { policy: 'chart-to-interpretation-bridge', path: 'temperament.strength' },
      },
    });
  });

  test('자기 기준이라는 한 결론을 핵심·성격·관계에 반복하는 프로필을 거부한다', async () => {
    const prepared = await prepare();
    const draft = defaultProfileDraft(prepared.narrationTasks);
    let drafts = defaultProfileDrafts(prepared.narrationTasks);
    drafts = replaceDraftSummary(
      drafts,
      'calculation-baseline',
      '자월의 임수 일간에 월주와 일주가 임자로 겹칩니다. 자기 기준을 실제 행동으로 옮기는 모습이 이 명식의 핵심 성향입니다.',
    );
    drafts = replaceDraftSummary(
      drafts,
      'ditianshui',
      '임수는 자월의 계절 힘을 받고 월지와 일지의 자수에 뿌리를 둡니다. 강한 자기 동력을 오래 유지하는 구조입니다.',
    );
    drafts = replaceDraftSectionParagraph(
      drafts,
      'calculation-baseline',
      'chart-overview',
      0,
      '월주와 일주가 모두 임자로 반복됩니다. 자기 판단을 일과 생활에 똑같이 밀어 넣는 흐름입니다.',
    );
    drafts = replaceDraftSectionParagraph(
      drafts,
      'ditianshui',
      'strength',
      0,
      '자월의 계절 힘과 두 자수 뿌리가 겹칩니다. 자기 방식으로 한 일을 끝까지 붙드는 힘이 있습니다.',
    );
    const response = await validate(
      prepared,
      {
        ...draft,
        thesis: {
          ...draft.thesis,
          structure: {
            basis: '자월의 임수 일간에 월주와 일주가 임자로 겹칩니다',
            portrait: '자기 기준을 실제 행동으로 옮기는 모습이 이 명식의 핵심 성향입니다',
          },
        },
        core: [
          {
            ...draft.core[0],
            structure: {
              ...draft.core[0].structure,
              basis: '임수는 자월의 계절 힘을 받고 월지와 일지의 자수에 뿌리를 둡니다',
              interpretation: '강한 자기 동력을 오래 유지하는 구조입니다',
            },
          },
          {
            ...draft.core[1],
            structure: {
              ...draft.core[1].structure,
              basis: '월주와 일주가 모두 임자로 반복됩니다',
              interpretation: '자기 판단을 일과 생활에 똑같이 밀어 넣는 흐름입니다',
            },
          },
        ],
        temperament: {
          ...draft.temperament,
          strength: {
            ...draft.temperament.strength,
            structure: {
              ...draft.temperament.strength.structure,
              basis: '자월의 계절 힘과 두 자수 뿌리가 겹칩니다',
              interpretation: '자기 방식으로 한 일을 끝까지 붙드는 힘이 있습니다',
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
        details: { policy: 'recycled-profile-conclusion', concept: 'self-direction' },
      },
    });
  });

  test('정보와 선택지를 넓게 본다는 한 결론을 모든 영역에 재활용하지 못한다', async () => {
    const prepared = await prepare();
    const draft = defaultProfileDraft(prepared.narrationTasks);
    let drafts = defaultProfileDrafts(prepared.narrationTasks);
    drafts = replaceDraftSummary(
      drafts,
      'calculation-baseline',
      '자월의 임수 일간에 월주와 일주가 임자로 겹칩니다. 여러 선택지를 넓게 읽고 방향을 찾는 모습이 이 명식의 핵심 성향입니다.',
    );
    drafts = replaceDraftSummary(
      drafts,
      'ditianshui',
      '임수는 자월의 계절 힘을 받고 월지와 일지의 자수에 뿌리를 둡니다. 많은 정보를 한꺼번에 다루는 힘이 강약 구조의 핵심입니다.',
    );
    drafts = replaceDraftSectionParagraph(
      drafts,
      'calculation-baseline',
      'chart-overview',
      0,
      '월주와 일주가 모두 임자로 반복됩니다. 판단 범위를 넓혀 여러 가능성을 비교하는 흐름입니다.',
    );
    drafts = replaceDraftSectionParagraph(
      drafts,
      'ditianshui',
      'strength',
      0,
      '자월의 계절 힘과 두 자수 뿌리가 겹칩니다. 정보를 빠르게 흡수하고 오래 검토하는 힘이 있습니다.',
    );
    const response = await validate(
      prepared,
      {
        ...draft,
        thesis: {
          ...draft.thesis,
          structure: {
            basis: '자월의 임수 일간에 월주와 일주가 임자로 겹칩니다',
            portrait: '여러 선택지를 넓게 읽고 방향을 찾는 모습이 이 명식의 핵심 성향입니다',
          },
        },
        core: [
          {
            ...draft.core[0],
            structure: {
              ...draft.core[0].structure,
              basis: '임수는 자월의 계절 힘을 받고 월지와 일지의 자수에 뿌리를 둡니다',
              interpretation: '많은 정보를 한꺼번에 다루는 힘이 강약 구조의 핵심입니다',
            },
          },
          {
            ...draft.core[1],
            structure: {
              ...draft.core[1].structure,
              basis: '월주와 일주가 모두 임자로 반복됩니다',
              interpretation: '판단 범위를 넓혀 여러 가능성을 비교하는 흐름입니다',
            },
          },
        ],
        temperament: {
          ...draft.temperament,
          strength: {
            ...draft.temperament.strength,
            structure: {
              ...draft.temperament.strength.structure,
              basis: '자월의 계절 힘과 두 자수 뿌리가 겹칩니다',
              interpretation: '정보를 빠르게 흡수하고 오래 검토하는 힘이 있습니다',
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
        details: { policy: 'recycled-profile-conclusion', concept: 'expansive-processing' },
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

    const projectRelationshipText =
      '월주 비견·겁재와 일지 겁재가 나란히 있습니다. 공동 목표를 정하고 역할·기한·속도를 명확히 하면 프로젝트 협업이 안정됩니다.';
    const projectDrafts = replaceDraftSectionParagraph(
      defaultProfileDrafts(prepared.narrationTasks),
      'calculation-baseline',
      'ten-gods',
      1,
      projectRelationshipText,
    );
    const projectRelationship = await validate(
      prepared,
      {
        ...draft,
        relationships: [
          {
            ...draft.relationships[0],
            structure: {
              ...draft.relationships[0].structure,
              basis: '월주 비견·겁재와 일지 겁재가 나란히 있습니다',
              interpretation:
                '공동 목표를 정하고 역할·기한·속도를 명확히 하면 프로젝트 협업이 안정됩니다',
            },
          },
        ],
      },
      projectDrafts,
    );
    expect(projectRelationship).toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_PRESENTATION_DRAFT',
        details: { policy: 'default-profile-role', path: 'relationships[0]' },
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
      '월주와 일주가 모두 임자로 중첩됩니다. 혼자 맡은 장기 과제에서는 주변 관심이 줄어도 핵심 문제를 끝까지 붙들고 마칩니다.',
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
              basis: '자월의 계절 힘과 월지·일지의 자수 뿌리가 겹칩니다',
              interpretation:
                '혼자 맡은 장기 과제에서 주변의 열기가 식어도 핵심 문제를 끝까지 붙들고 마칩니다',
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
                '혼자 맡은 장기 과제에서는 주변 관심이 줄어도 핵심 문제를 끝까지 붙들고 마칩니다',
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
