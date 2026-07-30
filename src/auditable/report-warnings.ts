import { localDateTimeToNaiveEpochMilliseconds } from '../time/local-date-time';

export const SEOUL_STANDARD_TIME_START_INSTANT_MS = Date.parse('1908-03-31T15:32:08.000Z');

export const SEOUL_STANDARD_TIME_START_LOCAL_MS = localDateTimeToNaiveEpochMilliseconds({
  year: 1908,
  month: 4,
  day: 1,
  hour: 0,
  minute: 0,
  second: 0,
  millisecond: 0,
});

export const PRE_STANDARD_TIME_LOCAL_MEAN_WARNING = Object.freeze({
  code: 'PRE_STANDARD_TIME_LOCAL_MEAN_APPROXIMATION' as const,
  message:
    'Asia/Seoul before standard time represents Seoul local mean time and may not match the birthplace longitude.',
});
