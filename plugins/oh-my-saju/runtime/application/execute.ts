/** Prepare, bind, and validate Pack-isolated narration. */
import { createHash } from 'node:crypto';
import { createAiKoreanSajuService } from '../reading/create-korean-service';
import {
  comparisonPackReadingInput,
  DEFAULT_COMPARISON_READING_OPTIONS,
} from '../reading/create-comparison-service';
import { prepareAiSajuNarrationRequest } from '../reading/create-reading';
import { isAiReadingError } from '../reading/errors';
import { assertSafeIdentifier } from '../reading/option-validation';
import type { AiSajuServiceRequest, SajuNarratorResponse } from '../reading/types';
import { isSajuError } from 'saju-engine';
import {
  calculateKoreanSajuAnalysis,
  KOREAN_SAJU_ANALYSIS_PRESET_V1,
} from '../traditions/calculate-korean-analysis';
import { listTraditionPacks } from '../traditions/catalog';
import { isSajuInterpretationError } from '../traditions/errors';
import type {
  KoreanSajuAnalysisPreset,
  TraditionPackRef,
  TraditionPackResult,
} from '../traditions/types';
import { deepFreeze } from '../internal/deep-freeze';
import { canonicalJsonStringify } from '../internal/canonical-json';
import { isRecord } from '../internal/guards';
import { OH_MY_SAJU_RUNTIME_MANIFEST } from '../manifest';
import { calculateSajuTiming } from 'saju-engine/timing';
import type { SajuTimingReport } from 'saju-engine/timing';
import type { Gender } from 'saju-engine';
import { OhMySajuApplicationError, isOhMySajuApplicationError } from './errors';
import type {
  OhMySajuCommand,
  OhMySajuFailure,
  OhMySajuNarrationDraft,
  OhMySajuNarrationTask,
  OhMySajuResponse,
  PrepareOhMySajuReadingCommand,
  PreparedOhMySajuReading,
  ValidatedOhMySajuReading,
  ValidateOhMySajuReadingCommand,
} from './types';

const MAXIMUM_DRAFT_COUNT = 16;

function assertOnlyKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
  field: string,
  code: 'INVALID_COMMAND' | 'INVALID_DRAFT_SET' = 'INVALID_COMMAND',
): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(value).filter((key) => !allowedSet.has(key));
  if (unexpected.length > 0) {
    throw new OhMySajuApplicationError(code, `${field} contains unsupported keys.`, {
      details: { unexpected },
    });
  }
}

function refKey(ref: TraditionPackRef): string {
  return `${ref.id}@${ref.version}`;
}

function profileResults(
  analysis: ReturnType<typeof calculateKoreanSajuAnalysis>,
): readonly TraditionPackResult[] {
  return [analysis.baseline, ...analysis.doctrines];
}

function narrationTasks(
  analysis: ReturnType<typeof calculateKoreanSajuAnalysis>,
  request: AiSajuServiceRequest,
): readonly OhMySajuNarrationTask[] {
  return profileResults(analysis).map((profileResult) => {
    const narrationRequest = prepareAiSajuNarrationRequest(
      comparisonPackReadingInput(DEFAULT_COMPARISON_READING_OPTIONS, request, profileResult),
    );
    return {
      packRef: profileResult.packRef,
      requiresDraft: narrationRequest.evidence.findings.length > 0,
      request: narrationRequest,
    };
  });
}

function assertServiceRequest(value: unknown): asserts value is AiSajuServiceRequest {
  if (
    !isRecord(value) ||
    !isRecord(value.calculation) ||
    (value.calculation.kind !== 'exact' && value.calculation.kind !== 'possibilities') ||
    !('request' in value.calculation)
  ) {
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      'request must contain an exact or possibilities calculation.',
    );
  }
  assertOnlyKeys(
    value,
    ['calculation', 'question', 'locale', 'purpose', 'audience', 'variantPolicy'],
    'request',
  );
  assertOnlyKeys(value.calculation, ['kind', 'request'], 'request.calculation');
}

function assertCommandVersion(value: unknown): void {
  if (value !== undefined && value !== '1') {
    throw new OhMySajuApplicationError('INVALID_COMMAND', 'schemaVersion must be "1".');
  }
}

function copyPackRef(value: unknown, field: string): TraditionPackRef {
  if (!isRecord(value)) {
    throw new OhMySajuApplicationError('INVALID_DRAFT_SET', `${field} must be an object.`);
  }
  assertOnlyKeys(value, ['id', 'version'], field, 'INVALID_DRAFT_SET');
  return {
    id: assertDraftIdentifier(value.id, `${field}.id`),
    version: assertDraftIdentifier(value.version, `${field}.version`),
  };
}

function assertDraftIdentifier(value: unknown, field: string, maximum = 160): string {
  try {
    return assertSafeIdentifier(value, field, maximum);
  } catch {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      `${field} must be a safe short identifier.`,
    );
  }
}

function copyDrafts(value: unknown): readonly OhMySajuNarrationDraft[] {
  if (!Array.isArray(value) || value.length > MAXIMUM_DRAFT_COUNT) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      `drafts must be an array with at most ${MAXIMUM_DRAFT_COUNT} entries.`,
    );
  }
  const seen = new Set<string>();
  return value.map((entry, index) => {
    if (!isRecord(entry) || !('output' in entry)) {
      throw new OhMySajuApplicationError(
        'INVALID_DRAFT_SET',
        `drafts[${index}] must contain packRef and output.`,
      );
    }
    assertOnlyKeys(
      entry,
      ['packRef', 'output', 'metadata'],
      `drafts[${index}]`,
      'INVALID_DRAFT_SET',
    );
    const packRef = copyPackRef(entry.packRef, `drafts[${index}].packRef`);
    const key = refKey(packRef);
    if (seen.has(key)) {
      throw new OhMySajuApplicationError(
        'INVALID_DRAFT_SET',
        `drafts contains the duplicate Tradition Pack ${key}.`,
      );
    }
    seen.add(key);
    if (entry.metadata !== undefined && !isRecord(entry.metadata)) {
      throw new OhMySajuApplicationError(
        'INVALID_DRAFT_SET',
        `drafts[${index}].metadata must be an object when supplied.`,
      );
    }
    const metadata = entry.metadata;
    if (metadata !== undefined) {
      assertOnlyKeys(
        metadata,
        ['actualModel', 'providerRequestId', 'finishReason'],
        `drafts[${index}].metadata`,
        'INVALID_DRAFT_SET',
      );
    }
    return {
      packRef,
      output: entry.output,
      ...(metadata === undefined
        ? {}
        : {
            metadata: {
              ...(metadata.actualModel === undefined
                ? {}
                : {
                    actualModel: assertDraftIdentifier(
                      metadata.actualModel,
                      `drafts[${index}].metadata.actualModel`,
                    ),
                  }),
              ...(metadata.providerRequestId === undefined
                ? {}
                : {
                    providerRequestId: assertDraftIdentifier(
                      metadata.providerRequestId,
                      `drafts[${index}].metadata.providerRequestId`,
                      500,
                    ),
                  }),
              ...(metadata.finishReason === undefined
                ? {}
                : {
                    finishReason: assertDraftIdentifier(
                      metadata.finishReason,
                      `drafts[${index}].metadata.finishReason`,
                    ),
                  }),
            },
          }),
    };
  });
}

function expectedDraftKeys(tasks: readonly OhMySajuNarrationTask[]): readonly string[] {
  return tasks.filter(({ requiresDraft }) => requiresDraft).map(({ packRef }) => refKey(packRef));
}

function assertExactDraftSet(
  drafts: readonly OhMySajuNarrationDraft[],
  tasks: readonly OhMySajuNarrationTask[],
): void {
  const expected = new Set(expectedDraftKeys(tasks));
  const actual = new Set(drafts.map(({ packRef }) => refKey(packRef)));
  const missing = [...expected].filter((key) => !actual.has(key));
  const unexpected = [...actual].filter((key) => !expected.has(key));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      'drafts must match exactly the narration tasks whose requiresDraft value is true.',
      { details: { missing, unexpected } },
    );
  }
}

function assertPresetIntegrity(preset: KoreanSajuAnalysisPreset): void {
  if (
    preset.id !== KOREAN_SAJU_ANALYSIS_PRESET_V1.id ||
    preset.schemaVersion !== KOREAN_SAJU_ANALYSIS_PRESET_V1.schemaVersion
  ) {
    throw new OhMySajuApplicationError(
      'INTERNAL_ERROR',
      'The plugin-owned Korean analysis preset changed during execution.',
    );
  }
}

function preparationBinding(
  analysis: ReturnType<typeof calculateKoreanSajuAnalysis>,
  timing: SajuTimingReport | null,
  tasks: readonly OhMySajuNarrationTask[],
): PreparedOhMySajuReading['binding'] {
  const engine = analysis.calculation.audit.engine;
  const provenance = {
    core: {
      name: engine.name,
      version: engine.version,
      schemaVersion: engine.schemaVersion,
      sourceRevision: engine.sourceRevision,
    },
    runtime: OH_MY_SAJU_RUNTIME_MANIFEST.runtime,
    packs: listTraditionPacks().map(({ packRef, profileRef, contract }) => ({
      packRef,
      profileRef,
      contractSchemaVersion: contract.schemaVersion,
      rulesArtifactDigest: contract.reproducibility.rulesArtifact.digest,
      fixturesArtifactDigest: contract.reproducibility.fixturesArtifact.digest,
      contractDigest: createHash('sha256')
        .update(canonicalJsonStringify(contract), 'utf8')
        .digest('hex'),
      knowledgeSnapshot: contract.reproducibility.knowledgeSnapshot,
    })),
    reading: OH_MY_SAJU_RUNTIME_MANIFEST.reading,
  } as const;
  const canonical = canonicalJsonStringify({
    schemaVersion: '2',
    provenance,
    analysis,
    timing,
    narrationTasks: tasks,
  });
  return deepFreeze({
    algorithm: 'sha256',
    canonicalization: 'oh-my-saju-preparation-v2',
    digest: createHash('sha256').update(canonical, 'utf8').digest('hex'),
    engineSourceRevision: engine.sourceRevision,
    ...provenance,
  });
}

function calculateRequestedTiming(
  request: AiSajuServiceRequest,
  value: unknown,
): SajuTimingReport | null {
  if (value === undefined) return null;
  if (!isRecord(value)) {
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      'timing must be an object when supplied.',
    );
  }
  assertOnlyKeys(value, ['fromYear', 'throughYear', 'gender', 'luckPillarCount'], 'timing');
  if (request.calculation.kind !== 'exact') {
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      'timing is available only for an exact birth-time calculation.',
    );
  }
  return calculateSajuTiming({
    natalRequest: request.calculation.request,
    fromYear: value.fromYear as number,
    throughYear: value.throughYear as number,
    ...(value.gender === undefined ? {} : { gender: value.gender as Gender }),
    ...(value.luckPillarCount === undefined
      ? {}
      : { luckPillarCount: value.luckPillarCount as number }),
  });
}

export function prepareOhMySajuReading(
  command: PrepareOhMySajuReadingCommand,
): PreparedOhMySajuReading {
  if (!isRecord(command) || command.command !== 'prepare-reading') {
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      'command must be a prepare-reading object.',
    );
  }
  assertOnlyKeys(command, ['schemaVersion', 'command', 'request', 'timing'], 'command');
  assertCommandVersion(command.schemaVersion);
  assertServiceRequest(command.request);
  const analysis = calculateKoreanSajuAnalysis(command.request.calculation);
  assertPresetIntegrity(analysis.preset);
  const timing = calculateRequestedTiming(command.request, command.timing);
  const tasks = narrationTasks(analysis, command.request);
  return deepFreeze({
    schemaVersion: '1',
    calculationKind: analysis.calculationKind,
    analysis,
    timing,
    narrationTasks: tasks,
    binding: preparationBinding(analysis, timing, tasks),
  });
}

export async function validateOhMySajuReading(
  command: ValidateOhMySajuReadingCommand,
): Promise<ValidatedOhMySajuReading> {
  if (!isRecord(command) || command.command !== 'validate-reading') {
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      'command must be a validate-reading object.',
    );
  }
  assertOnlyKeys(
    command,
    ['schemaVersion', 'command', 'request', 'timing', 'preparedDigest', 'narrator', 'drafts'],
    'command',
  );
  assertCommandVersion(command.schemaVersion);
  assertServiceRequest(command.request);
  if (!isRecord(command.narrator)) {
    throw new OhMySajuApplicationError('INVALID_COMMAND', 'narrator must be an object.');
  }
  assertOnlyKeys(command.narrator, ['id', 'requestedModel'], 'narrator');
  const narrator = {
    id: assertSafeIdentifier(command.narrator.id, 'narrator.id'),
    requestedModel: assertSafeIdentifier(
      command.narrator.requestedModel,
      'narrator.requestedModel',
    ),
  };
  const prepared = prepareOhMySajuReading({
    schemaVersion: '1',
    command: 'prepare-reading',
    request: command.request,
    ...(command.timing === undefined ? {} : { timing: command.timing }),
  });
  if (
    typeof command.preparedDigest !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(command.preparedDigest) ||
    command.preparedDigest !== prepared.binding.digest
  ) {
    throw new OhMySajuApplicationError(
      'PREPARATION_MISMATCH',
      'preparedDigest does not match this request, timing selection, and narration task set.',
      {
        details: {
          expectedDigest: prepared.binding.digest,
          receivedDigest:
            typeof command.preparedDigest === 'string' ? command.preparedDigest : null,
        },
      },
    );
  }
  const drafts = copyDrafts(command.drafts);
  assertExactDraftSet(drafts, prepared.narrationTasks);
  const draftByPack = new Map(drafts.map((draft) => [refKey(draft.packRef), draft] as const));
  const draftByProfile = new Map<string, OhMySajuNarrationDraft | undefined>(
    prepared.narrationTasks.map((task) => {
      const profile = task.request.evidence.profile;
      return [`${profile.id}@${profile.version}`, draftByPack.get(refKey(task.packRef))] as const;
    }),
  );

  const service = createAiKoreanSajuService({
    narrator: {
      ...narrator,
      async narrate(request): Promise<SajuNarratorResponse> {
        const key = `${request.evidence.profile.id}@${request.evidence.profile.version}`;
        const draft = draftByProfile.get(key);
        if (draft === undefined) {
          throw new OhMySajuApplicationError(
            'INTERNAL_ERROR',
            `No validated draft is available for ${key}.`,
          );
        }
        return {
          output: draft.output,
          metadata: {
            actualModel: draft.metadata?.actualModel ?? narrator.requestedModel,
            ...(draft.metadata?.providerRequestId === undefined
              ? {}
              : { providerRequestId: draft.metadata.providerRequestId }),
            ...(draft.metadata?.finishReason === undefined
              ? {}
              : { finishReason: draft.metadata.finishReason }),
          },
        };
      },
    },
  });
  const reading = await service.read(command.request);
  return deepFreeze({
    schemaVersion: '1',
    calculationKind: reading.calculationKind,
    binding: prepared.binding,
    reading,
    timing: prepared.timing,
  });
}

function commandName(value: unknown): OhMySajuCommand['command'] | 'unknown' {
  if (
    isRecord(value) &&
    (value.command === 'prepare-reading' || value.command === 'validate-reading')
  ) {
    return value.command;
  }
  return 'unknown';
}

function failure(command: unknown, error: unknown): OhMySajuFailure {
  const known =
    isOhMySajuApplicationError(error) ||
    isAiReadingError(error) ||
    isSajuInterpretationError(error) ||
    isSajuError(error);
  const name = known ? error.name : 'OhMySajuApplicationError';
  const code = known ? error.code : 'INTERNAL_ERROR';
  const message = known ? error.message : 'Oh My Saju could not complete the command.';
  const path = isSajuError(error) ? error.path : undefined;
  const details =
    isOhMySajuApplicationError(error) ||
    isAiReadingError(error) ||
    isSajuInterpretationError(error) ||
    isSajuError(error)
      ? error.details
      : undefined;
  return deepFreeze({
    schemaVersion: '1',
    ok: false,
    command: commandName(command),
    error: {
      name,
      code,
      message,
      ...(path === undefined ? {} : { path }),
      ...(details === undefined ? {} : { details }),
    },
  });
}

/**
 * JSON-safe host boundary. Expected input, calculation, and narration failures
 * become data so CLI, MCP, Claude, and Codex adapters share one protocol.
 */
export async function executeOhMySaju(command: unknown): Promise<OhMySajuResponse> {
  try {
    if (!isRecord(command)) {
      throw new OhMySajuApplicationError('INVALID_COMMAND', 'command must be an object.');
    }
    if (command.command === 'prepare-reading') {
      return deepFreeze({
        schemaVersion: '1',
        ok: true,
        command: 'prepare-reading',
        result: prepareOhMySajuReading(command as unknown as PrepareOhMySajuReadingCommand),
      });
    }
    if (command.command === 'validate-reading') {
      return deepFreeze({
        schemaVersion: '1',
        ok: true,
        command: 'validate-reading',
        result: await validateOhMySajuReading(command as unknown as ValidateOhMySajuReadingCommand),
      });
    }
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      'command must be prepare-reading or validate-reading.',
    );
  } catch (error) {
    return failure(command, error);
  }
}
