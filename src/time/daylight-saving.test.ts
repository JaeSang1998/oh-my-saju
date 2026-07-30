import momentTimezone from 'moment-timezone';
import { describe, expect, test } from 'vitest';
import { DST_OFFSET_PROFILE_BY_ZONE, DST_OFFSET_PROFILES } from './dst-offsets-data';
import { daylightSavingAt } from './daylight-saving';

const MINIMUM_EPOCH_MILLISECONDS = Date.UTC(1800, 0, 1);
const MAXIMUM_EPOCH_MILLISECONDS = Date.UTC(2102, 0, 1);

describe('generated daylight-saving metadata', () => {
  test('Moment 2026c의 모든 zone/지원 interval과 인덱스가 일치한다', () => {
    const failures: string[] = [];
    let decodedIntervals = 0;

    for (const name of momentTimezone.tz.names()) {
      const zone = momentTimezone.tz.zone(name);
      if (zone === null) {
        failures.push(`${name}: missing MomentZone`);
        continue;
      }
      const profileIndex = DST_OFFSET_PROFILE_BY_ZONE[zone.name];
      const profile = profileIndex === undefined ? undefined : DST_OFFSET_PROFILES[profileIndex];
      if (profile === undefined || profile.length !== zone.offsets.length) {
        failures.push(
          `${name}: profile=${profile?.length ?? 'missing'}, zone=${zone.offsets.length}`,
        );
        continue;
      }

      zone.untils.forEach((until, index) => {
        const previousUntil = index === 0 ? -Infinity : (zone.untils[index - 1] ?? Infinity);
        const start = Math.max(previousUntil, MINIMUM_EPOCH_MILLISECONDS);
        const end = Math.min(until ?? Infinity, MAXIMUM_EPOCH_MILLISECONDS);
        if (end <= MINIMUM_EPOCH_MILLISECONDS || start >= MAXIMUM_EPOCH_MILLISECONDS) return;

        const epochMilliseconds = start + Math.min(43_200_000, Math.max(1, (end - start) / 2));
        const metadata = daylightSavingAt(zone, epochMilliseconds);
        decodedIntervals += 1;
        if (metadata.isDaylightSavingTime === null || metadata.offsetSeconds === null) {
          failures.push(`${name}/${index}: unexpectedly unavailable`);
        }
      });
    }

    expect(decodedIntervals).toBe(65_958);
    expect(failures).toEqual([]);
  });
});
