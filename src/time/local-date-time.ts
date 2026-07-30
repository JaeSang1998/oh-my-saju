export interface LocalDateTime {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
}

/**
 * Treats local date-time fields as a timezone-free Gregorian coordinate.
 *
 * This is not a UTC conversion. It creates a numeric coordinate that is useful
 * for offset arithmetic without consulting the host timezone.
 */
export function localDateTimeToNaiveEpochMilliseconds(value: LocalDateTime): number {
  const date = new Date(0);
  date.setUTCFullYear(value.year, value.month - 1, value.day);
  date.setUTCHours(value.hour, value.minute, value.second, value.millisecond);
  return date.getTime();
}

export function localDateTimeFromNaiveEpochMilliseconds(epochMilliseconds: number): LocalDateTime {
  const date = new Date(epochMilliseconds);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    millisecond: date.getUTCMilliseconds(),
  };
}

function pad(value: number, width: number): string {
  return value.toString().padStart(width, '0');
}

export function formatLocalDateTime(value: LocalDateTime): string {
  return `${pad(value.year, 4)}-${pad(value.month, 2)}-${pad(value.day, 2)}T${pad(value.hour, 2)}:${pad(value.minute, 2)}:${pad(value.second, 2)}.${pad(value.millisecond, 3)}`;
}
