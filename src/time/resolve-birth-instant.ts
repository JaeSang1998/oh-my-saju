import momentTimezone from 'moment-timezone';
import { SajuError } from '../errors';
import { isRecord } from '../internal/guards';
import { ENGINE_MANIFEST } from '../manifest';
import { daylightSavingAt, type DaylightSavingMetadata } from './daylight-saving';
import { localDateTimeToNaiveEpochMilliseconds, type LocalDateTime } from './local-date-time';

export type { LocalDateTime } from './local-date-time';

const TIMEZONE_ENGINE = ENGINE_MANIFEST.timezone.engine;
const TZDB_VERSION = ENGINE_MANIFEST.timezone.ianaVersion;

export type LocalTimeDisambiguation = 'reject' | 'earlier' | 'later';

export interface ResolveBirthInstantInput {
  readonly localDateTime: LocalDateTime;
  readonly timeZone: string;
  readonly disambiguation?: LocalTimeDisambiguation;
  readonly expectedOffsetSeconds?: number;
}

export interface ResolvedBirthInstant {
  readonly instantUtc: string;
  readonly epochMilliseconds: number;
  readonly timeZone: string;
  readonly offsetSeconds: number;
  readonly abbreviation: string;
  readonly daylightSaving: DaylightSavingMetadata;
  readonly disambiguation: 'exact' | 'earlier' | 'later';
  readonly timezoneEngine: string;
  readonly tzdbVersion: string;
}

function assertIntegerInRange(
  value: number,
  min: number,
  max: number,
  path: readonly (string | number)[],
): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new SajuError(
      'INVALID_TIME',
      `${path.join('.')} must be an integer from ${min} to ${max}.`,
      {
        path,
        details: { value, min, max },
      },
    );
  }
}

function localEpochMilliseconds(value: LocalDateTime): number {
  assertIntegerInRange(value.year, 1000, 9999, ['localDateTime', 'year']);
  assertIntegerInRange(value.month, 1, 12, ['localDateTime', 'month']);
  assertIntegerInRange(value.day, 1, 31, ['localDateTime', 'day']);
  assertIntegerInRange(value.hour, 0, 23, ['localDateTime', 'hour']);
  assertIntegerInRange(value.minute, 0, 59, ['localDateTime', 'minute']);
  assertIntegerInRange(value.second, 0, 59, ['localDateTime', 'second']);
  assertIntegerInRange(value.millisecond, 0, 999, ['localDateTime', 'millisecond']);

  const epochMilliseconds = localDateTimeToNaiveEpochMilliseconds(value);
  const date = new Date(epochMilliseconds);

  if (
    date.getUTCFullYear() !== value.year ||
    date.getUTCMonth() + 1 !== value.month ||
    date.getUTCDate() !== value.day
  ) {
    throw new SajuError('INVALID_DATE', 'The local Gregorian date does not exist.', {
      path: ['localDateTime'],
      details: { ...value },
    });
  }
  return epochMilliseconds;
}

function possibleInstants(
  zone: NonNullable<ReturnType<typeof momentTimezone.tz.zone>>,
  localEpochMs: number,
): number[] {
  const offsets = new Set(zone.offsets.map((minutes) => Math.round(minutes * 60_000)));
  const candidates = new Set<number>();
  for (const offsetMs of offsets) {
    // MomentZone follows the POSIX convention: offsets west of UTC are
    // positive, so UTC = local + offset.
    const candidate = localEpochMs + offsetMs;
    const actualOffsetMs = Math.round(zone.utcOffset(candidate) * 60_000);
    if (candidate - actualOffsetMs === localEpochMs) candidates.add(candidate);
  }
  return [...candidates].sort((left, right) => left - right);
}

/**
 * Resolves an IANA wall-clock timestamp without consulting the host time zone.
 *
 * Gap and fold times are rejected by default. `earlier` and `later` only choose
 * between real instants in a fold; they never normalize a nonexistent time.
 */
export function resolveBirthInstant(input: ResolveBirthInstantInput): ResolvedBirthInstant {
  if (!isRecord(input)) {
    throw new SajuError('INVALID_REQUEST', 'The time-resolution input must be an object.');
  }
  if (!isRecord(input.localDateTime)) {
    throw new SajuError('INVALID_TIME', 'localDateTime must be an object.', {
      path: ['localDateTime'],
    });
  }
  if (typeof input.timeZone !== 'string' || input.timeZone.length === 0) {
    throw new SajuError('UNKNOWN_TIME_ZONE', 'timeZone must be a non-empty IANA identifier.', {
      path: ['timeZone'],
    });
  }

  if (
    input.disambiguation !== undefined &&
    !['reject', 'earlier', 'later'].includes(input.disambiguation)
  ) {
    throw new SajuError('INVALID_REQUEST', 'disambiguation must be reject, earlier, or later.', {
      path: ['disambiguation'],
      details: { value: input.disambiguation },
    });
  }
  if (
    input.expectedOffsetSeconds !== undefined &&
    (!Number.isInteger(input.expectedOffsetSeconds) ||
      input.expectedOffsetSeconds < -86_400 ||
      input.expectedOffsetSeconds > 86_400)
  ) {
    throw new SajuError(
      'INVALID_REQUEST',
      'expectedOffsetSeconds must be an integer from -86400 through 86400.',
      {
        path: ['expectedOffsetSeconds'],
        details: { value: input.expectedOffsetSeconds },
      },
    );
  }

  const zone = momentTimezone.tz.zone(input.timeZone);
  if (zone === null) {
    throw new SajuError('UNKNOWN_TIME_ZONE', `Unknown IANA time zone: ${input.timeZone}`, {
      path: ['timeZone'],
      details: { timeZone: input.timeZone, tzdbVersion: TZDB_VERSION },
    });
  }

  const localEpochMs = localEpochMilliseconds(input.localDateTime);
  const candidates = possibleInstants(zone, localEpochMs);
  if (candidates.length === 0) {
    throw new SajuError(
      'NONEXISTENT_LOCAL_TIME',
      `The local time does not exist in ${input.timeZone} because of an offset transition.`,
      {
        path: ['localDateTime'],
        details: { localDateTime: input.localDateTime, timeZone: input.timeZone },
      },
    );
  }

  const disambiguation = input.disambiguation ?? 'reject';
  if (candidates.length > 1 && disambiguation === 'reject') {
    throw new SajuError(
      'AMBIGUOUS_LOCAL_TIME',
      `The local time occurs more than once in ${input.timeZone}; choose earlier or later.`,
      {
        path: ['localDateTime'],
        details: {
          localDateTime: input.localDateTime,
          timeZone: input.timeZone,
          candidateInstantsUtc: candidates.map((candidate) => new Date(candidate).toISOString()),
        },
      },
    );
  }

  const epochMilliseconds =
    candidates.length === 1 || disambiguation === 'earlier'
      ? candidates[0]
      : candidates[candidates.length - 1];
  if (epochMilliseconds === undefined) {
    throw new SajuError(
      'DATA_INTEGRITY_FAILURE',
      'A resolved local time had no candidate instant.',
    );
  }

  const offsetSeconds = -Math.round(zone.utcOffset(epochMilliseconds) * 60);
  if (input.expectedOffsetSeconds !== undefined && input.expectedOffsetSeconds !== offsetSeconds) {
    throw new SajuError(
      'OFFSET_MISMATCH',
      'The expected UTC offset does not match the IANA data.',
      {
        path: ['expectedOffsetSeconds'],
        details: {
          expectedOffsetSeconds: input.expectedOffsetSeconds,
          actualOffsetSeconds: offsetSeconds,
          timeZone: input.timeZone,
          instantUtc: new Date(epochMilliseconds).toISOString(),
        },
      },
    );
  }

  const resolvedDisambiguation: ResolvedBirthInstant['disambiguation'] =
    candidates.length === 1 ? 'exact' : disambiguation === 'later' ? 'later' : 'earlier';

  return {
    instantUtc: new Date(epochMilliseconds).toISOString(),
    epochMilliseconds,
    timeZone: zone.name,
    offsetSeconds,
    abbreviation: zone.abbr(epochMilliseconds),
    daylightSaving: daylightSavingAt(zone, epochMilliseconds),
    disambiguation: resolvedDisambiguation,
    timezoneEngine: TIMEZONE_ENGINE,
    tzdbVersion: TZDB_VERSION,
  };
}
