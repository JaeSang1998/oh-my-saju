import { isRecord } from '../internal/guards';
import { rankElectionDates } from './election/rank-election-dates';
import { NAM_BYEONG_GIL_ELECTIONAL_PROFILE_V1 } from './election/profile';
import { castIChing } from './iching/mechanics';
import { ICHING_PROFILE } from './iching/profiles';
import { calculateLiurenChart } from './liuren/calculate';
import { LIUREN_QUANSHU_NINE_GATES_PROFILE } from './liuren/profile';
import { TraditionalSystemError } from './shared/errors';
import type { TraditionalSystemKind, TraditionalSystemProfile } from './shared/types';
import { calculateTojeong144 } from './tojeong/calculate';
import { TOJEONG_144_PROFILE } from './tojeong/profile';
import type { TraditionalSystemRequest, TraditionalSystemResult } from './types';
import { calculateZiweiChart } from './ziwei/calculate';
import { ZIWEI_QUANSHU_CORE_PROFILE } from './ziwei/profile';

type TraditionalSystemHandler = (request: unknown) => TraditionalSystemResult;

interface TraditionalSystemRegistryEntry {
  readonly evaluate: TraditionalSystemHandler;
  readonly profile: TraditionalSystemProfile;
}

const SYSTEM_REGISTRY = Object.freeze({
  election: Object.freeze({
    evaluate: (request: unknown) =>
      rankElectionDates(
        request as TraditionalSystemRequest & {
          readonly kind: 'election';
        },
      ),
    profile: NAM_BYEONG_GIL_ELECTIONAL_PROFILE_V1,
  }),
  'tojeong-144': Object.freeze({
    evaluate: (request: unknown) =>
      calculateTojeong144(request as TraditionalSystemRequest & { readonly kind: 'tojeong-144' }),
    profile: TOJEONG_144_PROFILE,
  }),
  iching: Object.freeze({
    evaluate: (request: unknown) =>
      castIChing(request as TraditionalSystemRequest & { readonly kind: 'iching' }),
    profile: ICHING_PROFILE,
  }),
  ziwei: Object.freeze({
    evaluate: (request: unknown) =>
      calculateZiweiChart(request as TraditionalSystemRequest & { readonly kind: 'ziwei' }),
    profile: ZIWEI_QUANSHU_CORE_PROFILE,
  }),
  liuren: Object.freeze({
    evaluate: (request: unknown) =>
      calculateLiurenChart(request as TraditionalSystemRequest & { readonly kind: 'liuren' }),
    profile: LIUREN_QUANSHU_NINE_GATES_PROFILE,
  }),
} satisfies Readonly<Record<TraditionalSystemKind, TraditionalSystemRegistryEntry>>);

function isTraditionalSystemKind(value: unknown): value is TraditionalSystemKind {
  return typeof value === 'string' && Object.hasOwn(SYSTEM_REGISTRY, value);
}

/**
 * Internal JSON-command dispatcher. TypeScript callers use the five explicit
 * system functions exported from `./index` instead.
 */
export function runTraditionalSystem(request: unknown): TraditionalSystemResult {
  if (!isRecord(request) || typeof request.kind !== 'string') {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'Traditional-system request.kind must identify a supported system.',
      { path: ['request', 'kind'] },
    );
  }
  if (!isTraditionalSystemKind(request.kind)) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'Unsupported traditional-system request.kind.',
      {
        path: ['request', 'kind'],
        details: {
          received: request.kind,
          supported: Object.keys(SYSTEM_REGISTRY),
        },
      },
    );
  }
  const entry = SYSTEM_REGISTRY[request.kind];
  const result = entry.evaluate(request);
  if (
    result.kind !== request.kind ||
    result.audit.profile.id !== entry.profile.id ||
    result.audit.profile.version !== entry.profile.version
  ) {
    throw new TraditionalSystemError(
      'SYSTEM_INVARIANT_VIOLATION',
      'Traditional-system registry result does not match its bound kind and profile.',
      {
        details: {
          requestedKind: request.kind,
          resultKind: result.kind,
          expectedProfileId: entry.profile.id,
          expectedProfileVersion: entry.profile.version,
          resultProfileId: result.audit.profile.id,
          resultProfileVersion: result.audit.profile.version,
        },
      },
    );
  }
  return result;
}
