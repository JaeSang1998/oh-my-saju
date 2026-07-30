import type { DayHourClock, SolarTimeCorrection } from '../auditable/types';
import { SajuError } from '../errors';
import { equationOfTimeMinutes } from './apparent-solar-clock';
import {
  localDateTimeFromNaiveEpochMilliseconds,
  localDateTimeToNaiveEpochMilliseconds,
  type LocalDateTime,
} from './local-date-time';

function roundMicroseconds(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function resolveDayHourClock(
  civilDateTime: LocalDateTime,
  instantEpochMilliseconds: number,
  clock: DayHourClock,
): {
  readonly dateTime: LocalDateTime;
  readonly correction: SolarTimeCorrection | null;
} {
  if (clock.kind === 'civil') return { dateTime: civilDateTime, correction: null };

  if (
    !Number.isFinite(clock.longitudeDegreesEast) ||
    clock.longitudeDegreesEast < -180 ||
    clock.longitudeDegreesEast > 180
  ) {
    throw new SajuError(
      'INVALID_COORDINATE',
      'longitudeDegreesEast must be a finite number from -180 through 180.',
      {
        path: ['rules', 'dayHourClock', 'longitudeDegreesEast'],
        details: { longitudeDegreesEast: clock.longitudeDegreesEast },
      },
    );
  }

  const longitudeSeconds = roundMicroseconds(clock.longitudeDegreesEast * 240);
  const equationOfTimeSeconds = roundMicroseconds(
    clock.equationOfTime === 'apply' ? equationOfTimeMinutes(instantEpochMilliseconds) * 60 : 0,
  );
  const apparentEpochMilliseconds = Math.round(
    instantEpochMilliseconds + (longitudeSeconds + equationOfTimeSeconds) * 1_000,
  );
  return {
    dateTime: localDateTimeFromNaiveEpochMilliseconds(apparentEpochMilliseconds),
    correction: {
      longitudeSeconds,
      equationOfTimeSeconds,
      totalDifferenceFromCivilSeconds:
        (apparentEpochMilliseconds - localDateTimeToNaiveEpochMilliseconds(civilDateTime)) / 1_000,
    },
  };
}
