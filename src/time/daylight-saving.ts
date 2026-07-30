import momentTimezone from 'moment-timezone';
import { SajuError } from '../errors';
import { ENGINE_MANIFEST } from '../manifest';
import {
  DST_IS_DAYLIGHT_SAVING_TIME_VALUES,
  DST_METADATA_MAXIMUM_EPOCH_MILLISECONDS,
  DST_METADATA_MINIMUM_EPOCH_MILLISECONDS,
  DST_OFFSET_CODE_BASE,
  DST_OFFSET_PROFILE_BY_ZONE,
  DST_OFFSET_PROFILES,
  DST_OFFSET_VALUES,
} from './dst-offsets-data';

type MomentZone = NonNullable<ReturnType<typeof momentTimezone.tz.zone>>;

export interface DaylightSavingMetadata {
  readonly representation: typeof ENGINE_MANIFEST.timezone.daylightSavingRepresentation;
  readonly isDaylightSavingTime: boolean | null;
  /** Seasonal adjustment relative to the selected surrounding standard-time type. */
  readonly offsetSeconds: number | null;
}

function transitionIndex(zone: MomentZone, epochMilliseconds: number): number {
  let low = 0;
  let high = zone.untils.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const until = zone.untils[middle] ?? Infinity;
    if (epochMilliseconds < until) high = middle;
    else low = middle + 1;
  }
  return low;
}

function integrityFailure(message: string, details: Readonly<Record<string, unknown>>): never {
  throw new SajuError('DATA_INTEGRITY_FAILURE', message, { details });
}

/**
 * Decodes the IANA TZif `isdst` state aligned to the pinned MomentZone interval.
 *
 * The generated table deliberately stores the authoritative state separately
 * from the derived save amount, because tzdb can contain a DST type whose
 * offset change is zero.
 */
export function daylightSavingAt(
  zone: MomentZone,
  epochMilliseconds: number,
): DaylightSavingMetadata {
  if (
    epochMilliseconds < DST_METADATA_MINIMUM_EPOCH_MILLISECONDS ||
    epochMilliseconds >= DST_METADATA_MAXIMUM_EPOCH_MILLISECONDS
  ) {
    return {
      representation: ENGINE_MANIFEST.timezone.daylightSavingRepresentation,
      isDaylightSavingTime: null,
      offsetSeconds: null,
    };
  }

  const profileIndex = DST_OFFSET_PROFILE_BY_ZONE[zone.name];
  if (profileIndex === undefined) {
    return integrityFailure('The DST metadata does not contain the resolved IANA zone.', {
      timeZone: zone.name,
    });
  }
  const profile = DST_OFFSET_PROFILES[profileIndex];
  if (profile === undefined) {
    return integrityFailure('The DST metadata refers to a missing profile.', {
      timeZone: zone.name,
      profileIndex,
    });
  }

  const index = transitionIndex(zone, epochMilliseconds);
  if (index >= zone.offsets.length || index >= profile.length) {
    return integrityFailure('The DST metadata is not aligned with the time-zone transitions.', {
      timeZone: zone.name,
      transitionIndex: index,
      zoneIntervalCount: zone.offsets.length,
      profileLength: profile.length,
    });
  }

  const stateIndex = profile.charCodeAt(index) - DST_OFFSET_CODE_BASE;
  const isDaylightSavingTime = DST_IS_DAYLIGHT_SAVING_TIME_VALUES[stateIndex];
  const offsetSeconds = DST_OFFSET_VALUES[stateIndex];
  if (isDaylightSavingTime === undefined || offsetSeconds === undefined) {
    return integrityFailure('The DST metadata contains an invalid encoded state.', {
      timeZone: zone.name,
      transitionIndex: index,
      stateIndex,
    });
  }

  return {
    representation: ENGINE_MANIFEST.timezone.daylightSavingRepresentation,
    isDaylightSavingTime,
    offsetSeconds,
  };
}
