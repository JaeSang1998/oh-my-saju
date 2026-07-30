const MINUTES_PER_RADIAN_OF_HOUR_ANGLE = 229.18;

function daysInGregorianYear(year: number): 365 | 366 {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
}

function utcDayOfYear(date: Date): number {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - yearStart) / 86_400_000) + 1;
}

/**
 * Returns apparent-solar minus mean-solar time in minutes.
 *
 * This is the five-term Fourier approximation published with NOAA's solar
 * calculator. The input is an absolute instant; host locale and time zone do
 * not participate in the calculation.
 */
export function equationOfTimeMinutes(epochMilliseconds: number): number {
  const instant = new Date(epochMilliseconds);
  const utcHour =
    instant.getUTCHours() +
    instant.getUTCMinutes() / 60 +
    instant.getUTCSeconds() / 3_600 +
    instant.getUTCMilliseconds() / 3_600_000;
  const fractionalYear =
    ((2 * Math.PI) / daysInGregorianYear(instant.getUTCFullYear())) *
    (utcDayOfYear(instant) - 1 + (utcHour - 12) / 24);

  return (
    MINUTES_PER_RADIAN_OF_HOUR_ANGLE *
    (0.000075 +
      0.001868 * Math.cos(fractionalYear) -
      0.032077 * Math.sin(fractionalYear) -
      0.014615 * Math.cos(2 * fractionalYear) -
      0.040849 * Math.sin(2 * fractionalYear))
  );
}
