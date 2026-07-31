import { describe, expect, test } from 'vitest';
import {
  executeOhMySaju,
  type OhMySajuCompatibilityDraft,
  type OhMySajuCompatibilityFinding,
  type OhMySajuCompatibilityRequest,
  type PreparedOhMySajuCompatibility,
} from '../application';

const MALE_CALCULATION = {
  kind: 'exact' as const,
  request: {
    birth: {
      date: { calendar: 'gregorian' as const, year: 1998, month: 1, day: 5 },
      time: { hour: 9, minute: 51 },
      timeZone: 'Asia/Seoul',
    },
  },
};

const FEMALE_CALCULATION = {
  kind: 'exact' as const,
  request: {
    birth: {
      date: { calendar: 'gregorian' as const, year: 1996, month: 5, day: 27 },
      time: { hour: 6, minute: 50 },
      timeZone: 'Asia/Seoul',
    },
  },
};

const REQUEST: OhMySajuCompatibilityRequest = {
  participants: [
    { id: 'male', label: '남성', calculation: MALE_CALCULATION },
    { id: 'female', label: '여성', calculation: FEMALE_CALCULATION },
  ],
  question: '두 사람 궁합을 봐줘.',
  locale: 'ko-KR',
  variantPolicy: 'include-candidate-dependent',
};

async function prepare(
  request: OhMySajuCompatibilityRequest = REQUEST,
): Promise<PreparedOhMySajuCompatibility> {
  const response = await executeOhMySaju({
    command: 'prepare-compatibility',
    request,
  });
  if (!response.ok || response.command !== 'prepare-compatibility') {
    throw new Error(`prepare failed: ${JSON.stringify(response)}`);
  }
  return response.result;
}

function one(
  prepared: PreparedOhMySajuCompatibility,
  predicate: (finding: OhMySajuCompatibilityFinding) => boolean,
): OhMySajuCompatibilityFinding {
  const finding = prepared.findings.find(predicate);
  if (finding === undefined) throw new Error('required compatibility finding was not prepared');
  return finding;
}

function draftFor(prepared: PreparedOhMySajuCompatibility): OhMySajuCompatibilityDraft {
  const firstToSecond = one(
    prepared,
    ({ kind, direction }) => kind === 'day-master-ten-god' && direction === 'first-to-second',
  );
  const secondToFirst = one(
    prepared,
    ({ kind, direction }) => kind === 'day-master-ten-god' && direction === 'second-to-first',
  );
  const stemCombination = one(prepared, ({ kind }) => kind === 'stem-combination');
  const branchCombination = one(prepared, ({ kind }) => kind === 'branch-combination');
  const punishments = prepared.findings.filter(({ kind }) => kind === 'branch-punishment');
  const punishment = punishments[0];
  if (punishment === undefined || punishments.length < 2) {
    throw new Error('required repeated punishment findings were not prepared');
  }
  const sharedDayBranch = one(
    prepared,
    ({ kind, positions }) =>
      kind === 'shared-branch' && positions?.[0] === 'day' && positions[1] === 'day',
  );
  return {
    schemaVersion: '1',
    kind: 'compatibility',
    summary: {
      text: '남성 임수와 여성 갑목은 식신·편인으로 서로를 다르게 보고, 교차한 정임합과 자묘형이 함께 나타납니다. 이 궁합은 서로 북돋는 면이 크지만 표현 방식이 달라 긴장도 함께 생깁니다.',
      findingIds: [firstToSecond.id, secondToFirst.id, stemCombination.id, punishment.id],
      structure: {
        basis:
          '남성 임수와 여성 갑목은 식신·편인으로 서로를 다르게 보고, 교차한 정임합과 자묘형이 함께 나타납니다.',
        interpretation: '이 궁합은 서로 북돋는 면이 크지만 표현 방식이 달라 긴장도 함께 생깁니다.',
      },
    },
    connection: {
      text: '임수와 갑목 사이에는 식신·편인 관계가 있고, 정임 천간합과 자축 지지합도 겹칩니다. 남성이 먼저 생각을 꺼내면 여성이 자기 방식으로 다듬어 되돌려 주는 식이라, 서로 말을 주고받을수록 대화가 빠르게 깊어집니다.',
      findingIds: [firstToSecond.id, secondToFirst.id, stemCombination.id, branchCombination.id],
      structure: {
        basis: '임수와 갑목 사이에는 식신·편인 관계가 있고, 정임 천간합과 자축 지지합도 겹칩니다.',
        interpretation:
          '남성이 먼저 생각을 꺼내면 여성이 자기 방식으로 다듬어 되돌려 주는 식이라, 서로 말을 주고받을수록 대화가 빠르게 깊어집니다.',
      },
    },
    interaction: {
      text: '남성→여성은 식신이고 여성→남성은 편인 관계입니다. 남성은 생각을 먼저 말하고, 여성은 그 말을 자기 방식으로 해석해 되돌려 줍니다. 서로 말을 잘 받으면 아이디어가 곧 행동으로 이어집니다.',
      findingIds: [firstToSecond.id, secondToFirst.id],
      structure: {
        basis: '남성→여성은 식신이고 여성→남성은 편인 관계입니다.',
        interpretation:
          '남성은 생각을 먼저 말하고, 여성은 그 말을 자기 방식으로 해석해 되돌려 줍니다. 서로 말을 잘 받으면 아이디어가 곧 행동으로 이어집니다.',
      },
    },
    friction: {
      text: '남성의 자와 여성의 묘 사이에는 자묘형이 두 자리에서 반복됩니다. 남성이 설명을 더 밀어붙일수록 여성은 자기 방식으로 받아들일 시간을 요구할 수 있어 결론을 재촉하면 대화가 힘겨루기와 긴장으로 바뀌기 쉽습니다.',
      findingIds: [...punishments, sharedDayBranch].map(({ id }) => id),
      structure: {
        basis: '남성의 자와 여성의 묘 사이에는 자묘형이 두 자리에서 반복됩니다.',
        interpretation:
          '남성이 설명을 더 밀어붙일수록 여성은 자기 방식으로 받아들일 시간을 요구할 수 있어 결론을 재촉하면 대화가 힘겨루기와 긴장으로 바뀌기 쉽습니다.',
      },
    },
    durability: {
      text: '정임합·자축합으로 가까워지는 면과 자묘형으로 부딪히는 면이 함께 있습니다. 오래 지내려면 끌림 자체보다 다툰 뒤 어떻게 풀어 내는지가 더 중요합니다. 남성이 결론을 한 번에 밀어붙이지 않고 여성이 생각할 시간을 가진 뒤 분명히 답하면 오해가 오래 끌리지 않습니다.',
      findingIds: [stemCombination.id, branchCombination.id, punishment.id],
      structure: {
        basis: '정임합·자축합으로 가까워지는 면과 자묘형으로 부딪히는 면이 함께 있습니다.',
        interpretation:
          '오래 지내려면 끌림 자체보다 다툰 뒤 어떻게 풀어 내는지가 더 중요합니다. 남성이 결론을 한 번에 밀어붙이지 않고 여성이 생각할 시간을 가진 뒤 분명히 답하면 오해가 오래 끌리지 않습니다.',
      },
    },
  };
}

describe('two-person compatibility protocol', () => {
  test('두 명식을 교차 계산해 방향 십신과 합·형을 별도 finding으로 준비한다', async () => {
    const prepared = await prepare();

    expect(prepared.candidatePairCount).toBe(1);
    expect(prepared.participants.map(({ pillars }) => pillars.day.values)).toEqual([
      ['임자'],
      ['갑자'],
    ]);
    expect(
      prepared.findings
        .filter(({ kind }) => kind === 'day-master-ten-god')
        .map(({ direction, tenGod }) => [direction, tenGod]),
    ).toEqual([
      ['first-to-second', '식신'],
      ['second-to-first', '편인'],
    ]);
    expect(prepared.findings.filter(({ kind }) => kind === 'stem-combination')).toHaveLength(2);
    expect(prepared.findings.filter(({ kind }) => kind === 'branch-combination')).toHaveLength(2);
    expect(prepared.findings.filter(({ kind }) => kind === 'branch-punishment')).toHaveLength(2);
    expect(
      prepared.findings
        .filter(({ kind }) => kind === 'branch-punishment')
        .every(
          ({ punishment }) => punishment?.kind === 'mutual' && punishment.direction === 'mutual',
        ),
    ).toBe(true);
    expect(prepared.findings.filter(({ kind }) => kind === 'branch-clash')).toHaveLength(0);
    expect(prepared.findings.filter(({ kind }) => kind === 'branch-break')).toHaveLength(0);
    expect(prepared.findings.filter(({ kind }) => kind === 'branch-harm')).toHaveLength(0);
    expect(prepared.narrationTask.mode).toBe('grounded-compatibility');
    expect(JSON.stringify(prepared)).not.toMatch(/compatibility[^"]*unsupported/iu);
  });

  test('검증된 궁합 초안을 두 원국·방향 관계·장단점 섹션으로 렌더링한다', async () => {
    const prepared = await prepare();
    const response = await executeOhMySaju({
      command: 'validate-compatibility',
      request: REQUEST,
      preparedDigest: prepared.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: draftFor(prepared),
    });

    expect(response.ok).toBe(true);
    if (!response.ok || response.command !== 'validate-compatibility') return;
    expect(response.result.presentation.markdown).toContain('**궁합 총평:**');
    expect(response.result.presentation.markdown).toContain('남성 → 여성');
    expect(response.result.presentation.markdown).toContain('식신에 해당');
    expect(response.result.presentation.markdown).toContain('여성 → 남성');
    expect(response.result.presentation.markdown).toContain('편인에 해당');
    expect(response.result.presentation.markdown).toContain('## 서로 끌리고 맞는 지점');
    expect(response.result.presentation.markdown).toContain('## 부딪히기 쉬운 지점');
    expect(response.result.presentation.markdown).not.toContain('제공하지 않습니다');
  });

  test('기능 부재·점수·일반 관계 체크리스트로 궁합을 회피하는 초안을 거절한다', async () => {
    const prepared = await prepare();
    const valid = draftFor(prepared);
    const response = await executeOhMySaju({
      command: 'validate-compatibility',
      request: REQUEST,
      preparedDigest: prepared.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...valid,
        summary: {
          ...valid.summary,
          text: '현재 사용한 규칙은 검증된 궁합 점수를 제공하지 않습니다. 사주보다 실제 관계를 확인하는 편이 좋습니다.',
          structure: {
            basis: '현재 사용한 규칙은 검증된 궁합 점수를 제공하지 않습니다.',
            interpretation: '사주보다 실제 관계를 확인하는 편이 좋습니다.',
          },
        },
      },
    });

    expect(response).toMatchObject({
      ok: false,
      command: 'validate-compatibility',
      error: { code: 'INVALID_DRAFT_SET' },
    });
  });

  test('번역체 궁합 유형과 회복 리듬 표현을 거절한다', async () => {
    const prepared = await prepare();
    const valid = draftFor(prepared);
    for (const interpretation of [
      '이 궁합은 표현 방식이 다른 조건부 보완 관계입니다.',
      '이 궁합은 충돌 뒤의 회복 리듬이 중요한 관계입니다.',
    ]) {
      const response = await executeOhMySaju({
        command: 'validate-compatibility',
        request: REQUEST,
        preparedDigest: prepared.binding.digest,
        narrator: { id: 'test-host', requestedModel: 'host-unknown' },
        draft: {
          ...valid,
          summary: {
            ...valid.summary,
            text: `${valid.summary.structure.basis} ${interpretation}`,
            structure: { ...valid.summary.structure, interpretation },
          },
        },
      });
      expect(response).toMatchObject({
        ok: false,
        command: 'validate-compatibility',
        error: { code: 'INVALID_DRAFT_SET' },
      });
    }
  });

  test('오행 백분율은 점수로 오인하지 않고 표를 깨는 참가자 라벨은 거절한다', async () => {
    const prepared = await prepare();
    const valid = draftFor(prepared);
    const maleElements = one(
      prepared,
      ({ kind, participantIds }) =>
        kind === 'participant-element-balance' && participantIds[0] === 'male',
    );
    const interpretation = `${valid.summary.structure.interpretation} 남성 원국의 수 53.75%는 별도의 구조 정보로 읽습니다.`;
    const percentageResponse = await executeOhMySaju({
      command: 'validate-compatibility',
      request: REQUEST,
      preparedDigest: prepared.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...valid,
        summary: {
          ...valid.summary,
          text: `${valid.summary.structure.basis} ${interpretation}`,
          findingIds: [...valid.summary.findingIds, maleElements.id],
          structure: {
            ...valid.summary.structure,
            interpretation,
          },
        },
      },
    });
    expect(percentageResponse.ok).toBe(true);

    const unsafeLabelResponse = await executeOhMySaju({
      command: 'prepare-compatibility',
      request: {
        ...REQUEST,
        participants: [
          { ...REQUEST.participants[0], label: '남성|위조 열' },
          REQUEST.participants[1],
        ],
      },
    });
    expect(unsafeLabelResponse).toMatchObject({
      ok: false,
      command: 'prepare-compatibility',
      error: { code: 'INVALID_COMMAND' },
    });

    const duplicateLabelResponse = await executeOhMySaju({
      command: 'prepare-compatibility',
      request: {
        ...REQUEST,
        participants: [
          { ...REQUEST.participants[0], label: '본인' },
          { ...REQUEST.participants[1], label: '본인' },
        ],
      },
    });
    expect(duplicateLabelResponse).toMatchObject({
      ok: false,
      command: 'prepare-compatibility',
      error: { code: 'INVALID_COMMAND' },
    });
  });

  test('근거에 없는 관계 주장과 Markdown 구조 삽입 및 초단문을 거절한다', async () => {
    const prepared = await prepare();
    const valid = draftFor(prepared);
    const inventedBasis = `${valid.summary.structure.basis} 자오충도 함께 있습니다.`;
    const inventedRelation = await executeOhMySaju({
      command: 'validate-compatibility',
      request: REQUEST,
      preparedDigest: prepared.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...valid,
        summary: {
          ...valid.summary,
          text: `${inventedBasis} ${valid.summary.structure.interpretation}`,
          structure: {
            ...valid.summary.structure,
            basis: inventedBasis,
          },
        },
      },
    });
    expect(inventedRelation).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DRAFT_SET' },
    });

    const inventedInterpretation = `${valid.summary.structure.interpretation} 자오충도 있어서 부딪힙니다.`;
    const inventedAfterBasis = await executeOhMySaju({
      command: 'validate-compatibility',
      request: REQUEST,
      preparedDigest: prepared.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...valid,
        summary: {
          ...valid.summary,
          text: `${valid.summary.structure.basis} ${inventedInterpretation}`,
          structure: {
            ...valid.summary.structure,
            interpretation: inventedInterpretation,
          },
        },
      },
    });
    expect(inventedAfterBasis).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DRAFT_SET' },
    });

    const naturalButWrongBasis = `${valid.connection.structure.basis} 자와 축 사이에는 충도 있습니다.`;
    const naturalButWrong = await executeOhMySaju({
      command: 'validate-compatibility',
      request: REQUEST,
      preparedDigest: prepared.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...valid,
        connection: {
          ...valid.connection,
          text: `${naturalButWrongBasis} ${valid.connection.structure.interpretation}`,
          structure: {
            ...valid.connection.structure,
            basis: naturalButWrongBasis,
          },
        },
      },
    });
    expect(naturalButWrong).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DRAFT_SET' },
    });

    const participantNaturalBasis =
      '남성의 자와 여성의 축 사이에는 충이 있습니다. 두 사람의 생활 리듬도 맞부딪힙니다.';
    const participantNaturalWrong = await executeOhMySaju({
      command: 'validate-compatibility',
      request: REQUEST,
      preparedDigest: prepared.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...valid,
        connection: {
          ...valid.connection,
          text: `${participantNaturalBasis} 서로 익숙함을 느끼면서도 연결 방식을 다시 확인하게 됩니다.`,
          structure: {
            basis: participantNaturalBasis,
            interpretation: '서로 익숙함을 느끼면서도 연결 방식을 다시 확인하게 됩니다.',
          },
        },
      },
    });
    expect(participantNaturalWrong).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DRAFT_SET' },
    });

    const swappedDirectionBasis =
      '남성→여성은 편인이고 여성→남성은 식신 관계입니다. 두 방향의 반응이 다릅니다.';
    const swappedDirection = await executeOhMySaju({
      command: 'validate-compatibility',
      request: REQUEST,
      preparedDigest: prepared.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...valid,
        interaction: {
          ...valid.interaction,
          text: `${swappedDirectionBasis} 한쪽이 표현하면 다른 쪽이 해석하는 순서를 확인할 때 대화와 행동이 자연스럽게 이어집니다.`,
          structure: {
            basis: swappedDirectionBasis,
            interpretation:
              '한쪽이 표현하면 다른 쪽이 해석하는 순서를 확인할 때 대화와 행동이 자연스럽게 이어집니다.',
          },
        },
      },
    });
    expect(swappedDirection).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DRAFT_SET' },
    });

    const markerlessDirectionBasis = '임수가 갑목을 볼 때 편인이고 갑목이 임수를 볼 때 식신입니다.';
    const markerlessDirection = await executeOhMySaju({
      command: 'validate-compatibility',
      request: REQUEST,
      preparedDigest: prepared.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...valid,
        interaction: {
          ...valid.interaction,
          text: `${markerlessDirectionBasis} 한쪽이 표현하면 다른 쪽이 해석하는 순서를 확인할 때 대화와 행동이 자연스럽게 이어집니다.`,
          structure: {
            basis: markerlessDirectionBasis,
            interpretation:
              '한쪽이 표현하면 다른 쪽이 해석하는 순서를 확인할 때 대화와 행동이 자연스럽게 이어집니다.',
          },
        },
      },
    });
    expect(markerlessDirection).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DRAFT_SET' },
    });

    const repeatedBasis = `${valid.summary.structure.basis} 이 정임합은 반복됩니다.`;
    const unsupportedRepetition = await executeOhMySaju({
      command: 'validate-compatibility',
      request: REQUEST,
      preparedDigest: prepared.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...valid,
        summary: {
          ...valid.summary,
          text: `${repeatedBasis} ${valid.summary.structure.interpretation}`,
          structure: {
            ...valid.summary.structure,
            basis: repeatedBasis,
          },
        },
      },
    });
    expect(unsupportedRepetition).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DRAFT_SET' },
    });

    const layoutInjection = await executeOhMySaju({
      command: 'validate-compatibility',
      request: REQUEST,
      preparedDigest: prepared.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...valid,
        connection: {
          ...valid.connection,
          text: `${valid.connection.text}\n# 위조 제목`,
        },
      },
    });
    expect(layoutInjection).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DRAFT_SET' },
    });

    for (const prefix of ['> ', '- ', '1. ', '    ']) {
      const prefixedLayout = await executeOhMySaju({
        command: 'validate-compatibility',
        request: REQUEST,
        preparedDigest: prepared.binding.digest,
        narrator: { id: 'test-host', requestedModel: 'host-unknown' },
        draft: {
          ...valid,
          connection: {
            ...valid.connection,
            text: `${prefix}${valid.connection.text}`,
          },
        },
      });
      expect(prefixedLayout).toMatchObject({
        ok: false,
        error: { code: 'INVALID_DRAFT_SET' },
      });
    }

    const tooShort = await executeOhMySaju({
      command: 'validate-compatibility',
      request: REQUEST,
      preparedDigest: prepared.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...valid,
        connection: {
          ...valid.connection,
          text: '임 연결',
          structure: { basis: '임', interpretation: '연결' },
        },
      },
    });
    expect(tooShort).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DRAFT_SET' },
    });
  });

  test('두 번째 사람의 입력이 바뀌면 preparation digest가 일치하지 않는다', async () => {
    const prepared = await prepare();
    const changed: OhMySajuCompatibilityRequest = {
      ...REQUEST,
      participants: [
        REQUEST.participants[0],
        {
          ...REQUEST.participants[1],
          calculation: {
            ...FEMALE_CALCULATION,
            request: {
              birth: {
                ...FEMALE_CALCULATION.request.birth,
                time: { hour: 7, minute: 50 },
              },
            },
          },
        },
      ],
    };
    const response = await executeOhMySaju({
      command: 'validate-compatibility',
      request: changed,
      preparedDigest: prepared.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: draftFor(prepared),
    });

    expect(response).toMatchObject({
      ok: false,
      command: 'validate-compatibility',
      error: { code: 'PREPARATION_MISMATCH' },
    });
  });

  test('사람 순서를 바꾸면 대칭 관계 개수는 같고 방향 십신만 뒤집힌다', async () => {
    const original = await prepare();
    const swapped = await prepare({
      ...REQUEST,
      participants: [REQUEST.participants[1], REQUEST.participants[0]],
    });
    const symmetricCounts = (prepared: PreparedOhMySajuCompatibility): Map<string, number> => {
      const counts = new Map<string, number>();
      for (const finding of prepared.findings.filter(
        ({ direction }) => direction === 'symmetric',
      )) {
        counts.set(finding.kind, (counts.get(finding.kind) ?? 0) + 1);
      }
      return counts;
    };

    expect(symmetricCounts(swapped)).toEqual(symmetricCounts(original));
    expect(
      swapped.findings
        .filter(({ kind }) => kind === 'day-master-ten-god')
        .map(({ direction, tenGod }) => [direction, tenGod]),
    ).toEqual([
      ['first-to-second', '편인'],
      ['second-to-first', '식신'],
    ]);
  });

  test('방향형은 참가자 순서를 바꿔도 실제 작용 방향을 보존한다', async () => {
    const partner = {
      kind: 'exact' as const,
      request: {
        birth: {
          date: { calendar: 'gregorian' as const, year: 1994, month: 3, day: 12 },
          time: { hour: 8, minute: 30 },
          timeZone: 'Asia/Seoul',
        },
      },
    };
    const request: OhMySajuCompatibilityRequest = {
      ...REQUEST,
      participants: [
        REQUEST.participants[0],
        { id: 'partner', label: '상대', calculation: partner },
      ],
    };
    const original = await prepare(request);
    const directed = one(
      original,
      ({ kind, members }) =>
        kind === 'branch-punishment' && members.includes('축') && members.includes('술'),
    );
    expect(directed).toMatchObject({
      direction: 'first-to-second',
      punishment: { kind: 'directed-cycle', direction: 'left-to-right' },
    });

    const swapped = await prepare({
      ...request,
      participants: [request.participants[1], request.participants[0]],
    });
    const swappedDirected = one(
      swapped,
      ({ kind, members }) =>
        kind === 'branch-punishment' && members.includes('축') && members.includes('술'),
    );
    expect(swappedDirected).toMatchObject({
      direction: 'second-to-first',
      punishment: { kind: 'directed-cycle', direction: 'right-to-left' },
    });

    const firstDirection = one(
      original,
      ({ kind, direction }) => kind === 'day-master-ten-god' && direction === 'first-to-second',
    );
    const secondDirection = one(
      original,
      ({ kind, direction }) => kind === 'day-master-ten-god' && direction === 'second-to-first',
    );
    const connection = one(
      original,
      ({ tone, participantIds }) => tone === 'connection' && participantIds.length === 2,
    );
    const relationName = (finding: OhMySajuCompatibilityFinding): string => {
      const suffix =
        finding.kind === 'stem-combination'
          ? '천간합'
          : finding.kind === 'branch-combination'
            ? '지지합'
            : '형';
      const members =
        finding.kind === 'branch-punishment' && finding.punishment?.direction === 'right-to-left'
          ? [...finding.members].reverse()
          : finding.members;
      return `${members.join('')}${suffix}`;
    };
    const connectionName = relationName(connection);
    const directedName = relationName(directed);
    const directedDraft: OhMySajuCompatibilityDraft = {
      schemaVersion: '1',
      kind: 'compatibility',
      summary: {
        text: `남성→상대는 ${firstDirection.tenGod}, 상대→남성은 ${secondDirection.tenGod} 관계입니다. 이 궁합은 서로 반응하는 방향이 달라 조건을 맞추면 서로 보완하는 조합입니다.`,
        findingIds: [firstDirection.id, secondDirection.id],
        structure: {
          basis: `남성→상대는 ${firstDirection.tenGod}, 상대→남성은 ${secondDirection.tenGod} 관계입니다.`,
          interpretation:
            '이 궁합은 서로 반응하는 방향이 달라 조건을 맞추면 서로 보완하는 조합입니다.',
        },
      },
      connection: {
        text: `${connectionName}이 두 명식 사이에 나타납니다. 서로 다른 반응 사이에서도 다시 대화를 잇는 연결점이 됩니다.`,
        findingIds: [connection.id],
        structure: {
          basis: `${connectionName}이 두 명식 사이에 나타납니다.`,
          interpretation: '서로 다른 반응 사이에서도 다시 대화를 잇는 연결점이 됩니다.',
        },
      },
      interaction: {
        text: `남성→상대는 ${firstDirection.tenGod}, 상대→남성은 ${secondDirection.tenGod} 관계입니다. 한쪽의 표현을 다른 쪽이 받아들이는 방식이 달라 반응을 확인할 때 대화가 행동으로 이어집니다.`,
        findingIds: [firstDirection.id, secondDirection.id],
        structure: {
          basis: `남성→상대는 ${firstDirection.tenGod}, 상대→남성은 ${secondDirection.tenGod} 관계입니다.`,
          interpretation:
            '한쪽의 표현을 다른 쪽이 받아들이는 방식이 달라 반응을 확인할 때 대화가 행동으로 이어집니다.',
        },
      },
      friction: {
        text: `${directedName}이 두 명식 사이에서 드러납니다. 작용 방향을 거꾸로 전제하면 누가 먼저 압박을 느끼는지 놓쳐 갈등과 긴장이 커질 수 있습니다.`,
        findingIds: [directed.id],
        structure: {
          basis: `${directedName}이 두 명식 사이에서 드러납니다.`,
          interpretation:
            '작용 방향을 거꾸로 전제하면 누가 먼저 압박을 느끼는지 놓쳐 갈등과 긴장이 커질 수 있습니다.',
        },
      },
      durability: {
        text: `${connectionName}과 ${directedName}이 함께 있습니다. 장기 관계에서는 연결을 유지하되 압박이 향하는 순서를 확인하고 조율해야 관계가 오래갑니다.`,
        findingIds: [connection.id, directed.id],
        structure: {
          basis: `${connectionName}과 ${directedName}이 함께 있습니다.`,
          interpretation:
            '장기 관계에서는 연결을 유지하되 압박이 향하는 순서를 확인하고 조율해야 관계가 오래갑니다.',
        },
      },
    };
    const validDirected = await executeOhMySaju({
      command: 'validate-compatibility',
      request,
      preparedDigest: original.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: directedDraft,
    });
    expect(validDirected.ok).toBe(true);

    const reversedName = `${[...directed.members].reverse().join('')}형`;
    const wrongDirection = await executeOhMySaju({
      command: 'validate-compatibility',
      request,
      preparedDigest: original.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...directedDraft,
        friction: {
          ...directedDraft.friction,
          text: `${reversedName}이 두 명식 사이에서 드러납니다. 작용 방향을 거꾸로 전제하면 누가 먼저 압박을 느끼는지 놓쳐 갈등과 긴장이 커질 수 있습니다.`,
          structure: {
            ...directedDraft.friction.structure,
            basis: `${reversedName}이 두 명식 사이에서 드러납니다.`,
          },
        },
      },
    });
    expect(wrongDirection).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DRAFT_SET' },
    });

    const [wrongFirst, wrongSecond] = [...directed.members].reverse();
    const participantWrongBasis = `남성의 ${wrongFirst}과 상대의 ${wrongSecond} 사이에는 형이 있습니다.`;
    const participantWrongDirection = await executeOhMySaju({
      command: 'validate-compatibility',
      request,
      preparedDigest: original.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...directedDraft,
        friction: {
          ...directedDraft.friction,
          text: `${participantWrongBasis} 작용 방향을 거꾸로 전제하면 누가 먼저 압박을 느끼는지 놓쳐 갈등과 긴장이 커질 수 있습니다.`,
          structure: {
            ...directedDraft.friction.structure,
            basis: participantWrongBasis,
          },
        },
      },
    });
    expect(participantWrongDirection).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DRAFT_SET' },
    });
  });

  test('자정을 넘는 후보 범위는 stable-only에서도 양방향 후보 전체를 한 범위로 렌더링한다', async () => {
    const rangedRequest: OhMySajuCompatibilityRequest = {
      ...REQUEST,
      variantPolicy: 'stable-only',
      participants: [
        {
          ...REQUEST.participants[0],
          calculation: {
            kind: 'possibilities',
            request: {
              birth: {
                date: { calendar: 'gregorian', year: 1998, month: 1, day: 5 },
                time: {
                  kind: 'range',
                  startInclusive: { hour: 22, minute: 30 },
                  endExclusive: { hour: 1, minute: 30 },
                  crossesMidnight: true,
                },
                timeZone: 'Asia/Seoul',
              },
            },
          },
        },
        REQUEST.participants[1],
      ],
    };
    const prepared = await prepare(rangedRequest);
    const firstRange = one(
      prepared,
      ({ kind, direction }) =>
        kind === 'day-master-ten-god-range' && direction === 'first-to-second',
    );
    const secondRange = one(
      prepared,
      ({ kind, direction }) =>
        kind === 'day-master-ten-god-range' && direction === 'second-to-first',
    );
    const combinations = prepared.findings.filter(({ kind }) => kind === 'branch-combination');
    const sharedStem = one(prepared, ({ kind }) => kind === 'shared-stem');
    expect(firstRange).toMatchObject({
      stability: 'stable',
      tenGods: ['상관', '식신'],
    });
    expect(secondRange).toMatchObject({
      stability: 'stable',
      tenGods: ['정인', '편인'],
    });
    expect(combinations).toHaveLength(2);

    const draft: OhMySajuCompatibilityDraft = {
      schemaVersion: '1',
      kind: 'compatibility',
      summary: {
        text: '남성→여성은 상관·식신, 여성→남성은 정인·편인 후보이고 축자합도 나타납니다. 이 궁합은 생시 후보에 따라 표현 방식은 달라져도 서로를 잇는 힘은 남는 조건부 조합입니다.',
        findingIds: [firstRange.id, secondRange.id, combinations[0]!.id],
        structure: {
          basis: '남성→여성은 상관·식신, 여성→남성은 정인·편인 후보이고 축자합도 나타납니다.',
          interpretation:
            '이 궁합은 생시 후보에 따라 표현 방식은 달라져도 서로를 잇는 힘은 남는 조건부 조합입니다.',
        },
      },
      connection: {
        text: '남성의 축과 여성의 자 사이에는 축자합이 두 자리에서 반복됩니다. 출생 시각 범위와 무관하게 서로에게 익숙함과 연결감을 주는 접점으로 남습니다.',
        findingIds: combinations.map(({ id }) => id),
        structure: {
          basis: '남성의 축과 여성의 자 사이에는 축자합이 두 자리에서 반복됩니다.',
          interpretation:
            '출생 시각 범위와 무관하게 서로에게 익숙함과 연결감을 주는 접점으로 남습니다.',
        },
      },
      interaction: {
        text: '남성→여성은 상관·식신, 여성→남성은 정인·편인 후보로 달라집니다. 어느 쪽이 먼저 표현하고 어느 쪽이 해석하는지가 생시 후보마다 달라지므로, 반응 순서를 하나로 단정하지 않는 대화가 필요합니다.',
        findingIds: [firstRange.id, secondRange.id],
        structure: {
          basis: '남성→여성은 상관·식신, 여성→남성은 정인·편인 후보로 달라집니다.',
          interpretation:
            '어느 쪽이 먼저 표현하고 어느 쪽이 해석하는지가 생시 후보마다 달라지므로, 반응 순서를 하나로 단정하지 않는 대화가 필요합니다.',
        },
      },
      friction: {
        text: '상관·식신과 정인·편인 후보가 양방향으로 갈리고 두 사람의 정 천간도 겹칩니다. 한쪽 반응만 정답으로 정하면 상대의 실제 속도와 엇갈려 대화가 긴장으로 바뀔 수 있습니다.',
        findingIds: [firstRange.id, secondRange.id, sharedStem.id],
        structure: {
          basis: '상관·식신과 정인·편인 후보가 양방향으로 갈리고 두 사람의 정 천간도 겹칩니다.',
          interpretation:
            '한쪽 반응만 정답으로 정하면 상대의 실제 속도와 엇갈려 대화가 긴장으로 바뀔 수 있습니다.',
        },
      },
      durability: {
        text: '축자합의 연결과 상관·식신, 정인·편인의 양방향 후보가 함께 있습니다. 장기 관계에서는 누가 먼저 말하고 누가 받아들이는지 그날의 리듬을 확인하며 조율할 때 관계가 오래갑니다.',
        findingIds: [combinations[0]!.id, firstRange.id, secondRange.id],
        structure: {
          basis: '축자합의 연결과 상관·식신, 정인·편인의 양방향 후보가 함께 있습니다.',
          interpretation:
            '장기 관계에서는 누가 먼저 말하고 누가 받아들이는지 그날의 리듬을 확인하며 조율할 때 관계가 오래갑니다.',
        },
      },
    };
    const response = await executeOhMySaju({
      command: 'validate-compatibility',
      request: rangedRequest,
      preparedDigest: prepared.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft,
    });

    expect(response.ok).toBe(true);
    if (!response.ok || response.command !== 'validate-compatibility') return;
    expect(response.result.presentation.markdown).toContain(
      '남성의 일간을 기준으로 본 여성의 일간 십신은 상관·식신 가운데 하나',
    );
    expect(response.result.presentation.markdown).toContain(
      '여성의 일간을 기준으로 본 남성의 일간 십신은 정인·편인 가운데 하나',
    );

    const includeRequest: OhMySajuCompatibilityRequest = {
      ...rangedRequest,
      variantPolicy: 'include-candidate-dependent',
    };
    const included = await prepare(includeRequest);
    const narrowFirst = one(
      included,
      ({ kind, direction }) => kind === 'day-master-ten-god' && direction === 'first-to-second',
    );
    const narrowSecond = one(
      included,
      ({ kind, direction }) => kind === 'day-master-ten-god' && direction === 'second-to-first',
    );
    const narrowBasis = `남성→여성은 ${narrowFirst.tenGod}, 여성→남성은 ${narrowSecond.tenGod} 관계입니다.`;
    const narrowed = await executeOhMySaju({
      command: 'validate-compatibility',
      request: includeRequest,
      preparedDigest: included.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...draft,
        interaction: {
          ...draft.interaction,
          text: `${narrowBasis} 두 반응을 비교하면 대화와 행동의 순서를 구체적으로 읽을 수 있습니다.`,
          findingIds: [narrowFirst.id, narrowSecond.id],
          structure: {
            basis: narrowBasis,
            interpretation: '두 반응을 비교하면 대화와 행동의 순서를 구체적으로 읽을 수 있습니다.',
          },
        },
      },
    });
    expect(narrowed).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DRAFT_SET' },
    });

    const includedCombinations = included.findings.filter(
      ({ kind }) => kind === 'branch-combination',
    );
    const uncitedRangeBasis = `남성의 축과 여성의 자 사이에는 축자합이 두 자리에서 반복되고, 남성→여성은 ${narrowFirst.tenGod}, 여성→남성은 ${narrowSecond.tenGod} 관계입니다.`;
    const uncitedRangeSummary = await executeOhMySaju({
      command: 'validate-compatibility',
      request: includeRequest,
      preparedDigest: included.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...draft,
        summary: {
          text: `${uncitedRangeBasis} 이 궁합은 익숙한 연결과 서로 다른 반응이 함께 있는 조건부 조합입니다.`,
          findingIds: includedCombinations.map(({ id }) => id),
          structure: {
            basis: uncitedRangeBasis,
            interpretation: '이 궁합은 익숙한 연결과 서로 다른 반응이 함께 있는 조건부 조합입니다.',
          },
        },
      },
    });
    expect(uncitedRangeSummary).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DRAFT_SET' },
    });

    const swappedRangeBasis =
      '남성→여성은 정인·편인 후보이고, 여성→남성은 상관·식신 후보로 달라집니다.';
    const swappedRangeDirection = await executeOhMySaju({
      command: 'validate-compatibility',
      request: includeRequest,
      preparedDigest: included.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'host-unknown' },
      draft: {
        ...draft,
        interaction: {
          text: `${swappedRangeBasis} 어느 쪽이 먼저 표현하고 받아들이는지 후보마다 달라져 반응 순서를 하나로 고정하지 않는 대화가 필요합니다.`,
          findingIds: [firstRange.id, secondRange.id],
          structure: {
            basis: swappedRangeBasis,
            interpretation:
              '어느 쪽이 먼저 표현하고 받아들이는지 후보마다 달라져 반응 순서를 하나로 고정하지 않는 대화가 필요합니다.',
          },
        },
      },
    });
    expect(swappedRangeDirection).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DRAFT_SET' },
    });
  });

  test('생시 미상은 후보 Cartesian product와 조건부 finding을 보존한다', async () => {
    const unknownTime: OhMySajuCompatibilityRequest = {
      ...REQUEST,
      participants: [
        {
          ...REQUEST.participants[0],
          calculation: {
            kind: 'possibilities',
            request: {
              birth: {
                date: { calendar: 'gregorian', year: 1998, month: 1, day: 5 },
                time: { kind: 'unknown' },
                timeZone: 'Asia/Seoul',
              },
            },
          },
        },
        REQUEST.participants[1],
      ],
    };
    const prepared = await prepare(unknownTime);

    expect(prepared.candidatePairCount).toBe(
      prepared.participants[0].candidateCount * prepared.participants[1].candidateCount,
    );
    expect(prepared.participants[0].pillars.hour.values).toEqual([]);
    expect(prepared.findings.some(({ stability }) => stability === 'candidate-dependent')).toBe(
      true,
    );
  });
});
