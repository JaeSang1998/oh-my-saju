/** End-to-end application protocol tests. */
import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { canonicalJsonStringify } from '../internal/canonical-json';
import { executeOhMySaju } from '../application';
import type { OhMySajuNarrationDraft } from './types';

const REQUEST = {
  calculation: {
    kind: 'exact' as const,
    request: {
      birth: {
        date: { calendar: 'gregorian' as const, year: 1996, month: 5, day: 27 },
        time: { hour: 6, minute: 50 },
        timeZone: 'Asia/Seoul',
      },
    },
  },
  question: '핵심 구조를 근거와 함께 설명해줘.',
};

function draftFor(task: {
  readonly packRef: { readonly id: string; readonly version: string };
  readonly request: {
    readonly evidence: { readonly findings: readonly { readonly id: string }[] };
  };
}): OhMySajuNarrationDraft {
  const finding = task.request.evidence.findings[0];
  if (finding === undefined) throw new Error('test task requires a finding');
  return {
    packRef: task.packRef,
    output: {
      summary: {
        text: `${task.packRef.id}의 판정 근거를 구분해 설명합니다.`,
        findingIds: [finding.id],
      },
      sections: [],
    },
  };
}

describe('executeOhMySaju', () => {
  test('하나의 traditional-system 명령이 타입별 결정론 모듈을 JSON envelope로 실행한다', async () => {
    const response = await executeOhMySaju({
      schemaVersion: '1',
      command: 'run-traditional-system',
      request: {
        kind: 'iching',
        method: 'manual-lines',
        lines: [9, 7, 7, 7, 7, 7],
      },
    });

    expect(response).toMatchObject({
      schemaVersion: '1',
      ok: true,
      command: 'run-traditional-system',
      result: {
        schemaVersion: '1',
        kind: 'iching',
        value: {
          baseHexagram: { number: 1, hanja: '乾' },
          changedHexagram: { number: 44, hanja: '姤' },
          movingLines: [1],
        },
        audit: {
          implementation: 'oh-my-saju-independent',
          predictiveValidity: 'not-established',
          implicitAdjustments: [],
        },
      },
    });
  });

  test('traditional-system 오류를 구조화하고 다른 점법으로 추측하지 않는다', async () => {
    const response = await executeOhMySaju({
      command: 'run-traditional-system',
      request: { kind: 'tarot' },
    });

    expect(response).toEqual({
      schemaVersion: '1',
      ok: false,
      command: 'run-traditional-system',
      error: {
        name: 'TraditionalSystemError',
        code: 'INVALID_SYSTEM_INPUT',
        message: 'Unsupported traditional-system request.kind.',
        path: ['request', 'kind'],
        details: {
          received: 'tarot',
          supported: ['election', 'tojeong-144', 'iching', 'ziwei', 'liuren'],
        },
      },
    });
  });

  test('한 번의 계산에서 완전한 분석과 격리된 provider-neutral narration task를 준비한다', async () => {
    const response = await executeOhMySaju({
      schemaVersion: '1',
      command: 'prepare-reading',
      request: REQUEST,
    });

    expect(response.ok).toBe(true);
    if (!response.ok || response.command !== 'prepare-reading') return;
    expect(response.result.analysis.preset.id).toBe('ko-KR-default-v1');
    expect(response.result.binding).toMatchObject({
      algorithm: 'sha256',
      canonicalization: 'oh-my-saju-preparation-v2',
      core: {
        name: 'saju-engine',
        version: '0.9.0',
        schemaVersion: '5',
      },
      runtime: {
        name: 'oh-my-saju',
        version: '0.4.5',
        schemaVersion: '1',
      },
      reading: {
        promptTemplate: {
          id: 'saju-grounded-narration',
          version: '4.3.0',
        },
        outputSchemaVersion: '3',
        claimGateVersion: '3',
      },
    });
    expect(response.result.binding.packs.map(({ packRef }) => packRef.id)).toEqual([
      'calculation-baseline',
      'ziping',
      'ditianshui',
      'qiongtong',
      'sanming-symbolic-curated',
    ]);
    for (const pack of response.result.binding.packs) {
      expect(pack.rulesArtifactDigest).toMatch(/^[a-f0-9]{64}$/u);
      expect(pack.fixturesArtifactDigest).toMatch(/^[a-f0-9]{64}$/u);
      expect(pack.contractDigest).toMatch(/^[a-f0-9]{64}$/u);
      expect(pack.knowledgeSnapshot).toMatchObject({
        providerContract: 'tradition-knowledge-provider-v1',
        adapter: 'static-files',
        kind: 'static-file-snapshot',
        version: '1.0.0',
        immutability: 'content-addressed',
        provenanceContract: 'tradition-provenance-v1',
        queryContract: 'static-resource-query-v1',
      });
      expect(pack.knowledgeSnapshot.digest).toMatch(/^[a-f0-9]{64}$/u);
      expect(pack.knowledgeSnapshot.paths.length).toBeGreaterThan(0);
    }
    expect(response.result.narrationTasks.map(({ packRef }) => packRef.id)).toEqual([
      'calculation-baseline',
      'ziping',
      'ditianshui',
      'qiongtong',
      'sanming-symbolic-curated',
    ]);
    for (const task of response.result.narrationTasks) {
      expect(task.request.evidence.profile).toEqual(
        response.result.analysis.baseline.packRef.id === task.packRef.id
          ? response.result.analysis.baseline.profileRef
          : response.result.analysis.doctrines.find(({ packRef }) => packRef.id === task.packRef.id)
              ?.profileRef,
      );
      expect(task.request.user).toMatchObject({
        locale: 'ko-KR',
        purpose: 'school-comparison',
        audience: 'general',
      });
      expect(task.request.grounding.variantPolicy).toBe('include-candidate-dependent');
      expect(task.request.task.presentation).toEqual({
        mode: 'chart-first-profile',
        format: 'chart-and-short-sections',
        maxParagraphSentences: 3,
        maxSections: 4,
        maxParagraphsPerSection: 3,
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
      });
      expect(task.request.evidence.nonDisplayGuardrails.neverQuoteOrParaphrase).toBe(true);
      expect(
        task.request.evidence.findings.every(({ id }) =>
          id.startsWith(
            `${task.request.evidence.profile.id}@${task.request.evidence.profile.version}:`,
          ),
        ),
      ).toBe(true);
      expect(JSON.stringify(task.request)).not.toContain('"birth"');
      expect(JSON.stringify(task.request)).not.toContain('"chronology"');
    }
    expect(Object.isFrozen(response)).toBe(true);
  });

  test('Pack knowledge, rules, fixtures, contract digests all participate in the preparation binding', async () => {
    const response = await executeOhMySaju({
      schemaVersion: '1',
      command: 'prepare-reading',
      request: REQUEST,
    });
    if (!response.ok || response.command !== 'prepare-reading') {
      throw new Error('prepare fixture failed');
    }
    const { binding, analysis, timing, narrationTasks } = response.result;
    const { algorithm, canonicalization, digest, engineSourceRevision, ...provenance } = binding;
    const calculateDigest = (value: unknown): string =>
      createHash('sha256').update(canonicalJsonStringify(value), 'utf8').digest('hex');
    const payload = {
      schemaVersion: '2',
      provenance,
      analysis,
      timing,
      narrationTasks,
    };

    expect(algorithm).toBe('sha256');
    expect(canonicalization).toBe('oh-my-saju-preparation-v2');
    expect(engineSourceRevision).toBe(provenance.core.sourceRevision);
    expect(calculateDigest(payload)).toBe(digest);

    const [firstPack, ...remainingPacks] = provenance.packs;
    if (firstPack === undefined) throw new Error('Pack fixture is empty');
    const withChangedFirstPack = (changedPack: typeof firstPack): unknown => ({
      ...payload,
      provenance: {
        ...provenance,
        packs: [changedPack, ...remainingPacks],
      },
    });
    for (const changedPack of [
      { ...firstPack, rulesArtifactDigest: 'f'.repeat(64) },
      { ...firstPack, fixturesArtifactDigest: 'f'.repeat(64) },
      { ...firstPack, contractDigest: 'f'.repeat(64) },
      {
        ...firstPack,
        knowledgeSnapshot: {
          ...firstPack.knowledgeSnapshot,
          digest: 'f'.repeat(64),
        },
      },
    ]) {
      expect(calculateDigest(withChangedFirstPack(changedPack))).not.toBe(digest);
    }
  });

  test('host 초안을 동일 계산으로 재검증해 school reading과 감사 정보를 반환한다', async () => {
    const prepared = await executeOhMySaju({
      command: 'prepare-reading',
      request: REQUEST,
    });
    if (!prepared.ok || prepared.command !== 'prepare-reading') {
      throw new Error('prepare fixture failed');
    }
    const drafts = prepared.result.narrationTasks
      .filter(({ requiresDraft }) => requiresDraft)
      .map(draftFor);
    const validated = await executeOhMySaju({
      command: 'validate-reading',
      request: REQUEST,
      preparedDigest: prepared.result.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'fixture-model' },
      drafts,
    });

    expect(validated.ok).toBe(true);
    if (!validated.ok || validated.command !== 'validate-reading') return;
    expect(validated.result.binding).toEqual(prepared.result.binding);
    expect(validated.result.reading.packReadings).toHaveLength(5);
    expect(
      validated.result.reading.packReadings.every(
        ({ reading }) =>
          reading.generatedByAI &&
          reading.audit.validation.findingReferencesValidated &&
          reading.audit.narrator.id === 'test-host',
      ),
    ).toBe(true);
  });

  test('정확한 명식에만 입춘 사주년·12절월 timing을 같은 envelope로 준비하고 검증한다', async () => {
    const timing = { fromYear: 2026, throughYear: 2027, gender: 'female' as const };
    const prepared = await executeOhMySaju({
      command: 'prepare-reading',
      request: REQUEST,
      timing,
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok || prepared.command !== 'prepare-reading') return;
    expect(prepared.result.timing).toMatchObject({
      range: { fromSajuYear: 2026, throughSajuYear: 2027, yearCount: 2 },
      audit: { timingMethod: 'exact-lichun-jie-intervals-v1' },
      luckPillars: { gender: 'female' },
    });
    expect(prepared.result.timing?.years.every(({ months }) => months.length === 12)).toBe(true);

    const drafts = prepared.result.narrationTasks
      .filter(({ requiresDraft }) => requiresDraft)
      .map(draftFor);
    const validated = await executeOhMySaju({
      command: 'validate-reading',
      request: REQUEST,
      timing,
      preparedDigest: prepared.result.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'fixture-model' },
      drafts,
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok || validated.command !== 'validate-reading') return;
    expect(validated.result.timing).toEqual(prepared.result.timing);
  });

  test('생시 가능성 요청에 timing을 붙이면 명시적으로 거부한다', async () => {
    const response = await executeOhMySaju({
      command: 'prepare-reading',
      request: {
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
      },
      timing: { fromYear: 2026, throughYear: 2026 },
    });
    expect(response).toMatchObject({
      ok: false,
      command: 'prepare-reading',
      error: { code: 'INVALID_COMMAND' },
    });
  });

  test('누락 draft와 존재하지 않는 finding 인용을 오류 envelope로 만든다', async () => {
    const preparedForMissing = await executeOhMySaju({
      command: 'prepare-reading',
      request: REQUEST,
    });
    if (!preparedForMissing.ok || preparedForMissing.command !== 'prepare-reading') {
      throw new Error('prepare fixture failed');
    }
    const missing = await executeOhMySaju({
      command: 'validate-reading',
      request: REQUEST,
      preparedDigest: preparedForMissing.result.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'fixture-model' },
      drafts: [],
    });
    expect(missing).toMatchObject({
      ok: false,
      command: 'validate-reading',
      error: { code: 'INVALID_DRAFT_SET' },
    });

    const prepared = await executeOhMySaju({
      command: 'prepare-reading',
      request: REQUEST,
    });
    if (!prepared.ok || prepared.command !== 'prepare-reading') {
      throw new Error('prepare fixture failed');
    }
    const drafts = prepared.result.narrationTasks
      .filter(({ requiresDraft }) => requiresDraft)
      .map((task) => ({
        packRef: task.packRef,
        output: {
          summary: { text: '검증되지 않은 주장입니다.', findingIds: ['invented-finding'] },
          sections: [],
        },
      }));
    const ungrounded = await executeOhMySaju({
      command: 'validate-reading',
      request: REQUEST,
      preparedDigest: prepared.result.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'fixture-model' },
      drafts,
    });
    expect(ungrounded).toMatchObject({
      ok: false,
      command: 'validate-reading',
      error: { code: 'UNGROUNDED_OUTPUT' },
    });
  });

  test('알 수 없는 명령과 계산 오류도 process crash 대신 기계 판독 오류로 반환한다', async () => {
    await expect(executeOhMySaju({ command: 'wat' })).resolves.toMatchObject({
      ok: false,
      command: 'unknown',
      error: { code: 'INVALID_COMMAND' },
    });
    await expect(
      executeOhMySaju({
        command: 'prepare-reading',
        request: {
          calculation: {
            kind: 'exact',
            request: {
              birth: {
                date: { calendar: 'gregorian', year: 2024, month: 2, day: 31 },
                time: { hour: 12, minute: 0 },
                timeZone: 'Asia/Seoul',
              },
            },
          },
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      command: 'prepare-reading',
      error: { code: 'INVALID_DATE' },
    });
  });

  test('command typo와 지원하지 않는 top-level key를 조용히 무시하지 않는다', async () => {
    await expect(
      executeOhMySaju({
        command: 'prepare-reading',
        request: REQUEST,
        timimg: { fromYear: 2026, throughYear: 2026 },
      }),
    ).resolves.toMatchObject({
      ok: false,
      command: 'prepare-reading',
      error: {
        code: 'INVALID_COMMAND',
        details: { unexpected: ['timimg'] },
      },
    });
  });

  test('다른 question 또는 timing에서 만든 draft는 preparation digest로 결합해 거부한다', async () => {
    const prepared = await executeOhMySaju({
      command: 'prepare-reading',
      request: REQUEST,
    });
    if (!prepared.ok || prepared.command !== 'prepare-reading') {
      throw new Error('prepare fixture failed');
    }
    const drafts = prepared.result.narrationTasks
      .filter(({ requiresDraft }) => requiresDraft)
      .map(draftFor);
    const mismatched = await executeOhMySaju({
      command: 'validate-reading',
      request: { ...REQUEST, question: '연애 질문으로 바꿔서 검증해줘.' },
      preparedDigest: prepared.result.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'fixture-model' },
      drafts,
    });
    expect(mismatched).toMatchObject({
      ok: false,
      command: 'validate-reading',
      error: { code: 'PREPARATION_MISMATCH' },
    });
  });

  test('형식이 잘못된 draft 식별자를 INVALID_DRAFT_SET으로 정규화한다', async () => {
    const prepared = await executeOhMySaju({
      command: 'prepare-reading',
      request: REQUEST,
    });
    if (!prepared.ok || prepared.command !== 'prepare-reading') {
      throw new Error('prepare fixture failed');
    }
    const drafts = prepared.result.narrationTasks
      .filter(({ requiresDraft }) => requiresDraft)
      .map(draftFor);
    const malformed = await executeOhMySaju({
      command: 'validate-reading',
      request: REQUEST,
      preparedDigest: prepared.result.binding.digest,
      narrator: { id: 'test-host', requestedModel: 'fixture-model' },
      drafts: [
        {
          ...drafts[0],
          packRef: { id: '!', version: drafts[0]?.packRef.version ?? '1.0.0' },
        },
        ...drafts.slice(1),
      ],
    });
    expect(malformed).toMatchObject({
      ok: false,
      command: 'validate-reading',
      error: { code: 'INVALID_DRAFT_SET' },
    });
  });
});
