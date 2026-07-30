/**
 * Generates compact DST-save metadata aligned with MomentZone transition
 * indexes. Run this only when the pinned IANA release changes:
 *
 *   node tools/gen-dst-offsets.mjs /absolute/path/to/compiled-tzif
 *
 * The directory must be produced by zic from the same IANA release embedded by
 * moment-timezone. This script parses TZif v1/v2/v3/v4 directly. In particular,
 * it must not use `zoneinfo`: its datetime-oriented lookup can select the wrong
 * local-time type when an isdst-only transition leaves UTC offset unchanged
 * (America/Ojinaga on 2022-10-30 is one real example).
 *
 * TZif stores total UTC offset and the authoritative isdst bit, but not the
 * daylight-saving amount separately. For a DST interval we therefore infer
 * the save from its nearest preceding/following standard intervals:
 *
 * 1. Equal standard offsets on both sides are unambiguous.
 * 2. A sole standard side is used directly.
 * 3. If the sides differ, prefer a candidate save independently established
 *    by unambiguous intervals in the same zone. If neither candidate has such
 *    evidence, use the preceding standard interval: this reconstructs zic
 *    source entries such as `STDOFF 7:00, SAVE 0:20` even if the next era
 *    permanently adopts the resulting 7:20 total offset.
 *
 * The deterministic fallbacks are reported as ambiguities after generation,
 * so a tzdb update cannot silently change the quality of the inference.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import momentTimezone from 'moment-timezone';

const TZIF_HEADER_BYTES = 44;
// Public local years are 1801–2100. A one-year UTC buffer on each side
// guarantees coverage after applying every historical IANA offset.
const minimumEpochSeconds = Date.UTC(1800, 0, 1) / 1_000;
const maximumEpochSeconds = Date.UTC(2102, 0, 1) / 1_000;

const tzifDirectory = process.argv[2];
if (!tzifDirectory) {
  throw new Error('Pass the absolute directory containing compiled TZif files.');
}

const outputPath = resolve(process.argv[3] ?? 'src/time/dst-offsets-data.ts');

function readCounts(buffer, headerOffset) {
  if (
    buffer.toString('ascii', headerOffset, headerOffset + 4) !== 'TZif' ||
    headerOffset + TZIF_HEADER_BYTES > buffer.length
  ) {
    throw new Error(`Invalid TZif header at byte ${headerOffset}.`);
  }

  const names = ['ttisgmtcnt', 'ttisstdcnt', 'leapcnt', 'timecnt', 'typecnt', 'charcnt'];
  const counts = {};
  names.forEach((name, index) => {
    counts[name] = buffer.readUInt32BE(headerOffset + 20 + index * 4);
  });
  if (counts.typecnt === 0 || counts.typecnt > 256) {
    throw new Error(`Invalid TZif local-time type count: ${counts.typecnt}.`);
  }
  return counts;
}

function blockBytes(counts, timeBytes) {
  return (
    counts.timecnt * timeBytes +
    counts.timecnt +
    counts.typecnt * 6 +
    counts.charcnt +
    counts.leapcnt * (timeBytes + 4) +
    counts.ttisstdcnt +
    counts.ttisgmtcnt
  );
}

function readEpochSeconds(buffer, offset, timeBytes) {
  if (timeBytes === 4) return buffer.readInt32BE(offset);

  const value = buffer.readBigInt64BE(offset);
  if (value < BigInt(Number.MIN_SAFE_INTEGER)) return -Infinity;
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return Infinity;
  return Number(value);
}

function parseDataBlock(buffer, offset, counts, timeBytes, name) {
  const requiredBytes = blockBytes(counts, timeBytes);
  if (offset + requiredBytes > buffer.length) {
    throw new Error(`${name}: truncated TZif data block.`);
  }

  const transitions = [];
  for (let index = 0; index < counts.timecnt; index += 1) {
    transitions.push(readEpochSeconds(buffer, offset + index * timeBytes, timeBytes));
  }
  offset += counts.timecnt * timeBytes;

  const transitionTypes = [...buffer.subarray(offset, offset + counts.timecnt)];
  offset += counts.timecnt;

  const rawTypes = [];
  for (let index = 0; index < counts.typecnt; index += 1) {
    const typeOffset = offset + index * 6;
    rawTypes.push({
      offsetSeconds: buffer.readInt32BE(typeOffset),
      isDaylightSavingTime: buffer[typeOffset + 4] !== 0,
      abbreviationIndex: buffer[typeOffset + 5],
    });
  }
  offset += counts.typecnt * 6;

  const abbreviations = buffer.subarray(offset, offset + counts.charcnt);
  const types = rawTypes.map((type) => {
    if (type.abbreviationIndex >= abbreviations.length) {
      throw new Error(`${name}: invalid TZif abbreviation index ${type.abbreviationIndex}.`);
    }
    const abbreviationEnd = abbreviations.indexOf(0, type.abbreviationIndex);
    return {
      offsetSeconds: type.offsetSeconds,
      isDaylightSavingTime: type.isDaylightSavingTime,
      abbreviation: abbreviations
        .subarray(
          type.abbreviationIndex,
          abbreviationEnd === -1 ? abbreviations.length : abbreviationEnd,
        )
        .toString('ascii'),
    };
  });

  transitionTypes.forEach((typeIndex) => {
    if (typeIndex >= types.length) {
      throw new Error(`${name}: transition refers to missing type ${typeIndex}.`);
    }
  });
  for (let index = 1; index < transitions.length; index += 1) {
    if (transitions[index] < transitions[index - 1]) {
      throw new Error(`${name}: TZif transitions are not sorted.`);
    }
  }

  return { transitions, transitionTypes, types };
}

function readPosixName(source, cursor, context) {
  if (source[cursor] === '<') {
    const end = source.indexOf('>', cursor + 1);
    if (end === -1) throw new Error(`${context}: unterminated POSIX TZ name.`);
    return { value: source.slice(cursor + 1, end), cursor: end + 1 };
  }

  const match = /^[A-Za-z]{3,}/.exec(source.slice(cursor));
  if (match === null) throw new Error(`${context}: invalid POSIX TZ name.`);
  return { value: match[0], cursor: cursor + match[0].length };
}

function readSignedClock(source, cursor, context) {
  const match = /^([+-]?)(\d{1,3})(?::(\d{1,2})(?::(\d{1,2}))?)?/.exec(source.slice(cursor));
  if (match === null) throw new Error(`${context}: invalid POSIX TZ offset/time.`);

  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  if (minutes > 59 || seconds > 59) {
    throw new Error(`${context}: invalid POSIX TZ offset/time component.`);
  }
  const sign = match[1] === '-' ? -1 : 1;
  return {
    value: sign * (hours * 3_600 + minutes * 60 + seconds),
    cursor: cursor + match[0].length,
  };
}

function parsePosixRule(source, context) {
  const slash = source.indexOf('/');
  const dateSource = slash === -1 ? source : source.slice(0, slash);
  const timeSource = slash === -1 ? null : source.slice(slash + 1);
  let date;

  let match = /^M(\d{1,2})\.(\d)\.(\d)$/.exec(dateSource);
  if (match !== null) {
    const month = Number(match[1]);
    const week = Number(match[2]);
    const weekday = Number(match[3]);
    if (month < 1 || month > 12 || week < 1 || week > 5 || weekday > 6) {
      throw new Error(`${context}: invalid POSIX M rule ${dateSource}.`);
    }
    date = { kind: 'month-weekday', month, week, weekday };
  } else {
    match = /^J(\d{1,3})$/.exec(dateSource);
    if (match !== null) {
      const day = Number(match[1]);
      if (day < 1 || day > 365) throw new Error(`${context}: invalid POSIX J rule.`);
      date = { kind: 'julian-no-leap', day };
    } else {
      match = /^(\d{1,3})$/.exec(dateSource);
      if (match === null || Number(match[1]) > 365) {
        throw new Error(`${context}: invalid POSIX day rule ${dateSource}.`);
      }
      date = { kind: 'julian', day: Number(match[1]) };
    }
  }

  if (timeSource === null) return { date, seconds: 7_200, basis: 'wall' };
  const clock = readSignedClock(timeSource, 0, context);
  let basis = 'wall';
  if (clock.cursor < timeSource.length) {
    const suffix = timeSource.slice(clock.cursor);
    if (suffix === 's') basis = 'standard';
    else if (['u', 'g', 'z'].includes(suffix)) basis = 'utc';
    else if (suffix !== 'w') throw new Error(`${context}: invalid POSIX rule suffix ${suffix}.`);
  }
  return { date, seconds: clock.value, basis };
}

function parsePosixTail(source, name) {
  if (source === '') return null;
  const context = `${name} POSIX tail`;
  const standardName = readPosixName(source, 0, context);
  const standardClock = readSignedClock(source, standardName.cursor, context);
  const standardOffsetSeconds = -standardClock.value;
  if (standardClock.cursor === source.length) {
    return {
      standardName: standardName.value,
      standardOffsetSeconds,
      daylight: null,
    };
  }

  const daylightName = readPosixName(source, standardClock.cursor, context);
  let cursor = daylightName.cursor;
  let daylightOffsetSeconds = standardOffsetSeconds + 3_600;
  if (source[cursor] !== ',') {
    const daylightClock = readSignedClock(source, cursor, context);
    daylightOffsetSeconds = -daylightClock.value;
    cursor = daylightClock.cursor;
  }
  if (source[cursor] !== ',') {
    throw new Error(`${context}: DST name is missing transition rules.`);
  }
  const secondComma = source.indexOf(',', cursor + 1);
  if (secondComma === -1) throw new Error(`${context}: DST tail has only one transition rule.`);
  const start = parsePosixRule(source.slice(cursor + 1, secondComma), context);
  const end = parsePosixRule(source.slice(secondComma + 1), context);

  return {
    standardName: standardName.value,
    standardOffsetSeconds,
    daylight: {
      name: daylightName.value,
      offsetSeconds: daylightOffsetSeconds,
      start,
      end,
    },
  };
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function ruleDateEpochSeconds(year, rule) {
  if (rule.date.kind === 'julian') {
    return Date.UTC(year, 0, 1 + rule.date.day) / 1_000;
  }
  if (rule.date.kind === 'julian-no-leap') {
    const leapAdjustment = isLeapYear(year) && rule.date.day >= 60 ? 1 : 0;
    return Date.UTC(year, 0, rule.date.day + leapAdjustment) / 1_000;
  }

  const firstWeekday = new Date(Date.UTC(year, rule.date.month - 1, 1)).getUTCDay();
  let day = 1 + ((rule.date.weekday - firstWeekday + 7) % 7) + (rule.date.week - 1) * 7;
  const daysInMonth = new Date(Date.UTC(year, rule.date.month, 0)).getUTCDate();
  if (day > daysInMonth) day -= 7;
  return Date.UTC(year, rule.date.month - 1, day) / 1_000;
}

function transitionEpochSeconds(year, rule, standardOffsetSeconds, priorOffsetSeconds) {
  const interpretationOffset =
    rule.basis === 'utc'
      ? 0
      : rule.basis === 'standard'
        ? standardOffsetSeconds
        : priorOffsetSeconds;
  return ruleDateEpochSeconds(year, rule) + rule.seconds - interpretationOffset;
}

function findOrAddType(types, desired) {
  const existing = types.findIndex(
    (type) =>
      type.offsetSeconds === desired.offsetSeconds &&
      type.isDaylightSavingTime === desired.isDaylightSavingTime &&
      type.abbreviation === desired.abbreviation,
  );
  if (existing !== -1) return existing;
  types.push(desired);
  return types.length - 1;
}

function expandPosixTail(tzif, posix) {
  if (posix === null || posix.daylight === null) return tzif;

  const standardType = findOrAddType(tzif.types, {
    offsetSeconds: posix.standardOffsetSeconds,
    isDaylightSavingTime: false,
    abbreviation: posix.standardName,
  });
  const daylightType = findOrAddType(tzif.types, {
    offsetSeconds: posix.daylight.offsetSeconds,
    isDaylightSavingTime: true,
    abbreviation: posix.daylight.name,
  });
  const lastExplicit = tzif.transitions.at(-1) ?? -Infinity;
  const firstYear = Number.isFinite(lastExplicit)
    ? new Date(lastExplicit * 1_000).getUTCFullYear() - 1
    : 1800;
  const finalYear = new Date(maximumEpochSeconds * 1_000).getUTCFullYear() + 1;
  const generated = [];

  for (let year = firstYear; year <= finalYear; year += 1) {
    generated.push({
      epochSeconds: transitionEpochSeconds(
        year,
        posix.daylight.start,
        posix.standardOffsetSeconds,
        posix.standardOffsetSeconds,
      ),
      typeIndex: daylightType,
    });
    generated.push({
      epochSeconds: transitionEpochSeconds(
        year,
        posix.daylight.end,
        posix.standardOffsetSeconds,
        posix.daylight.offsetSeconds,
      ),
      typeIndex: standardType,
    });
  }
  generated.sort((left, right) => left.epochSeconds - right.epochSeconds);
  generated.forEach((transition) => {
    if (transition.epochSeconds <= lastExplicit) return;
    tzif.transitions.push(transition.epochSeconds);
    tzif.transitionTypes.push(transition.typeIndex);
  });
  return tzif;
}

function parseTzif(path, name) {
  const buffer = readFileSync(path);
  if (buffer.length < TZIF_HEADER_BYTES) throw new Error(`${name}: TZif file is too short.`);

  const version = buffer.toString('ascii', 4, 5);
  const firstCounts = readCounts(buffer, 0);
  if (version === '\0') {
    return parseDataBlock(buffer, TZIF_HEADER_BYTES, firstCounts, 4, name);
  }
  if (!['2', '3', '4'].includes(version)) {
    throw new Error(`${name}: unsupported TZif version ${JSON.stringify(version)}.`);
  }

  const secondHeaderOffset = TZIF_HEADER_BYTES + blockBytes(firstCounts, 4);
  const secondCounts = readCounts(buffer, secondHeaderOffset);
  const secondVersion = buffer.toString('ascii', secondHeaderOffset + 4, secondHeaderOffset + 5);
  if (secondVersion !== version) {
    throw new Error(`${name}: TZif header versions disagree (${version}/${secondVersion}).`);
  }
  const dataOffset = secondHeaderOffset + TZIF_HEADER_BYTES;
  const tzif = parseDataBlock(buffer, dataOffset, secondCounts, 8, name);
  const tailOffset = dataOffset + blockBytes(secondCounts, 8);
  const tail = buffer.subarray(tailOffset).toString('ascii');
  if (!tail.startsWith('\n') || !tail.endsWith('\n')) {
    throw new Error(`${name}: malformed TZif POSIX tail.`);
  }
  return expandPosixTail(tzif, parsePosixTail(tail.slice(1, -1), name));
}

function upperBound(values, target) {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (values[middle] <= target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function typeAt(tzif, epochSeconds) {
  const segmentIndex = upperBound(tzif.transitions, epochSeconds);
  const typeIndex = segmentIndex === 0 ? 0 : tzif.transitionTypes[segmentIndex - 1];
  return { segmentIndex, type: tzif.types[typeIndex] };
}

function nearestStandardSide(tzif, segmentIndex, direction, sampleEpochSeconds) {
  const segmentCount = tzif.transitions.length + 1;
  for (
    let candidate = segmentIndex + direction;
    candidate >= 0 && candidate < segmentCount;
    candidate += direction
  ) {
    const typeIndex = candidate === 0 ? 0 : tzif.transitionTypes[candidate - 1];
    const type = tzif.types[typeIndex];
    if (!type.isDaylightSavingTime) {
      const boundary =
        direction < 0 ? tzif.transitions[candidate] : tzif.transitions[candidate - 1];
      return {
        offsetSeconds: type.offsetSeconds,
        transitionDistance: Math.abs(candidate - segmentIndex),
        temporalDistance: Math.abs(sampleEpochSeconds - boundary),
        direction,
      };
    }
  }
  return null;
}

function collectZoneIntervals(name, momentZone, tzif) {
  const intervals = [];
  momentZone.untils.forEach((untilMilliseconds, index) => {
    const previousUntilMilliseconds =
      index === 0 ? -Infinity : (momentZone.untils[index - 1] ?? Infinity);
    const intervalStart = Math.max(previousUntilMilliseconds / 1_000, minimumEpochSeconds);
    const intervalEnd = Math.min((untilMilliseconds ?? Infinity) / 1_000, maximumEpochSeconds);
    if (intervalEnd <= minimumEpochSeconds || intervalStart >= maximumEpochSeconds) return;

    const distance = intervalEnd - intervalStart;
    const sampleEpochSeconds = intervalStart + Math.min(43_200, Math.max(0.001, distance / 2));
    const resolved = typeAt(tzif, sampleEpochSeconds);
    const expectedOffsetSeconds = -Math.round(momentZone.offsets[index] * 60);
    if (resolved.type.offsetSeconds !== expectedOffsetSeconds) {
      throw new Error(
        `${name} transition ${index} offset differs at ${new Date(sampleEpochSeconds * 1_000).toISOString()}: ` +
          `TZif=${resolved.type.offsetSeconds}, Moment=${expectedOffsetSeconds}`,
      );
    }

    const before = resolved.type.isDaylightSavingTime
      ? nearestStandardSide(tzif, resolved.segmentIndex, -1, sampleEpochSeconds)
      : null;
    const after = resolved.type.isDaylightSavingTime
      ? nearestStandardSide(tzif, resolved.segmentIndex, 1, sampleEpochSeconds)
      : null;
    intervals.push({
      momentIndex: index,
      sampleEpochSeconds,
      offsetSeconds: resolved.type.offsetSeconds,
      isDaylightSavingTime: resolved.type.isDaylightSavingTime,
      before,
      after,
    });
  });
  return intervals;
}

function candidateSave(interval, side) {
  return interval.offsetSeconds - side.offsetSeconds;
}

function addCount(counts, value) {
  counts.set(value, (counts.get(value) ?? 0) + 1);
}

function inferDstSaves(name, intervals) {
  const establishedCounts = new Map();
  for (const interval of intervals) {
    if (!interval.isDaylightSavingTime) continue;
    if (
      interval.before !== null &&
      interval.after !== null &&
      interval.before.offsetSeconds === interval.after.offsetSeconds
    ) {
      addCount(establishedCounts, candidateSave(interval, interval.before));
    }
  }

  const ambiguities = [];
  const uninferable = [];
  const values = intervals.map((interval) => {
    if (!interval.isDaylightSavingTime) {
      return { isDaylightSavingTime: false, offsetSeconds: 0 };
    }
    const { before, after } = interval;
    if (before === null && after === null) {
      uninferable.push({
        zone: name,
        momentIndex: interval.momentIndex,
        instant: new Date(interval.sampleEpochSeconds * 1_000).toISOString(),
      });
      return { isDaylightSavingTime: true, offsetSeconds: null };
    }
    if (before === null || after === null) {
      return {
        isDaylightSavingTime: true,
        offsetSeconds: candidateSave(interval, before ?? after),
      };
    }
    if (before.offsetSeconds === after.offsetSeconds) {
      return {
        isDaylightSavingTime: true,
        offsetSeconds: candidateSave(interval, before),
      };
    }

    const candidates = [before, after].map((side) => ({
      side,
      save: candidateSave(interval, side),
      establishedCount: establishedCounts.get(candidateSave(interval, side)) ?? 0,
    }));
    candidates.sort((left, right) => {
      if (left.establishedCount !== right.establishedCount) {
        return right.establishedCount - left.establishedCount;
      }
      if (left.side.direction !== right.side.direction) {
        return left.side.direction - right.side.direction;
      }
      if (left.side.transitionDistance !== right.side.transitionDistance) {
        return left.side.transitionDistance - right.side.transitionDistance;
      }
      if (left.side.temporalDistance !== right.side.temporalDistance) {
        return left.side.temporalDistance - right.side.temporalDistance;
      }
      return 0;
    });
    const selected = candidates[0];
    const runnerUp = candidates[1];
    const resolution =
      selected.establishedCount > runnerUp.establishedCount
        ? 'zone-evidence'
        : 'preceding-standard';
    ambiguities.push({
      zone: name,
      momentIndex: interval.momentIndex,
      instant: new Date(interval.sampleEpochSeconds * 1_000).toISOString(),
      beforeSave: candidateSave(interval, before),
      afterSave: candidateSave(interval, after),
      selectedSave: selected.save,
      selectedEvidenceCount: selected.establishedCount,
      resolution,
    });
    return { isDaylightSavingTime: true, offsetSeconds: selected.save };
  });

  return { values, ambiguities, uninferable };
}

const samples = {};
const allAmbiguities = [];
const allUninferable = [];
let daylightIntervals = 0;
let standardIntervals = 0;
let zeroSaveDaylightIntervals = 0;
const zeroSaveDaylightExamples = [];

for (const name of momentTimezone.tz.names().sort()) {
  const zone = momentTimezone.tz.zone(name);
  if (zone === null) throw new Error(`Moment did not return its listed zone: ${name}`);

  const tzif = parseTzif(join(tzifDirectory, ...name.split('/')), name);
  const intervals = collectZoneIntervals(name, zone, tzif);
  const { values, ambiguities, uninferable } = inferDstSaves(name, intervals);
  allAmbiguities.push(...ambiguities);
  allUninferable.push(...uninferable);

  const byMomentIndex = Array.from({ length: zone.offsets.length }, () => null);
  intervals.forEach((interval, index) => {
    byMomentIndex[interval.momentIndex] = values[index];
    if (interval.isDaylightSavingTime) {
      daylightIntervals += 1;
      if (values[index].offsetSeconds === 0) {
        zeroSaveDaylightIntervals += 1;
        if (zeroSaveDaylightExamples.length < 10) {
          zeroSaveDaylightExamples.push({
            zone: name,
            momentIndex: interval.momentIndex,
            instant: new Date(interval.sampleEpochSeconds * 1_000).toISOString(),
          });
        }
      }
    } else standardIntervals += 1;
  });
  samples[name] = byMomentIndex;
}

const stateByKey = new Map([['null', null]]);
Object.values(samples).forEach((values) => {
  values.forEach((value) => {
    if (value === null) return;
    const key = `${value.isDaylightSavingTime ? 1 : 0}:${String(value.offsetSeconds)}`;
    stateByKey.set(key, value);
  });
});

const states = [...stateByKey.values()].sort((left, right) => {
  if (left === null) return -1;
  if (right === null) return 1;
  if (left.isDaylightSavingTime !== right.isDaylightSavingTime) {
    return left.isDaylightSavingTime ? 1 : -1;
  }
  if (left.offsetSeconds === null) return -1;
  if (right.offsetSeconds === null) return 1;
  return left.offsetSeconds - right.offsetSeconds;
});
if (states.length > 90) {
  throw new Error(`Too many distinct DST states to encode: ${states.length}`);
}
const stateKey = (value) =>
  value === null ? 'null' : `${value.isDaylightSavingTime ? 1 : 0}:${String(value.offsetSeconds)}`;
const codeByState = new Map(states.map((value, index) => [stateKey(value), index + 33]));
const profiles = [];
const profileIndex = new Map();
const zoneProfiles = {};

for (const name of Object.keys(samples).sort()) {
  const profile = samples[name]
    .map((value) => String.fromCharCode(codeByState.get(stateKey(value))))
    .join('');
  let index = profileIndex.get(profile);
  if (index === undefined) {
    index = profiles.length;
    profiles.push(profile);
    profileIndex.set(profile, index);
  }
  zoneProfiles[name] = index;
}

const source = `/**
 * Generated from IANA tzdb ${momentTimezone.tz.dataVersion} TZif files.
 * Do not edit by hand; see tools/gen-dst-offsets.mjs.
 */

export const DST_OFFSET_CODE_BASE = 33;
export const DST_METADATA_MINIMUM_EPOCH_MILLISECONDS = ${minimumEpochSeconds * 1_000};
export const DST_METADATA_MAXIMUM_EPOCH_MILLISECONDS = ${maximumEpochSeconds * 1_000};
export const DST_IS_DAYLIGHT_SAVING_TIME_VALUES: readonly (boolean | null)[] = ${JSON.stringify(
  states.map((state) => state?.isDaylightSavingTime ?? null),
)};
export const DST_OFFSET_VALUES: readonly (number | null)[] = ${JSON.stringify(
  states.map((state) => state?.offsetSeconds ?? null),
)};
export const DST_OFFSET_PROFILES: readonly string[] = ${JSON.stringify(profiles)};
export const DST_OFFSET_PROFILE_BY_ZONE: Readonly<Record<string, number>> = ${JSON.stringify(zoneProfiles)};
`;

writeFileSync(outputPath, source);
console.log(
  `Wrote ${outputPath}: ${Object.keys(zoneProfiles).length} zones, ${profiles.length} profiles, ` +
    `${states.length} states; ${daylightIntervals} DST and ${standardIntervals} standard intervals ` +
    `(${zeroSaveDaylightIntervals} zero-save DST).`,
);
if (allAmbiguities.length === 0) {
  console.log('DST-save inference: 0 ambiguous intervals.');
} else {
  const resolutions = new Map();
  allAmbiguities.forEach((entry) => addCount(resolutions, entry.resolution));
  const resolutionSummary = [...resolutions.entries()]
    .map(([resolution, count]) => `${resolution}=${count}`)
    .join(', ');
  console.warn(
    `DST-save inference: ${allAmbiguities.length} intervals had differing surrounding standard offsets ` +
      `(${resolutionSummary}).`,
  );
  const reportOrder = [...allAmbiguities].sort((left, right) => {
    const leftUsesFallback = left.resolution === 'zone-evidence' ? 1 : 0;
    const rightUsesFallback = right.resolution === 'zone-evidence' ? 1 : 0;
    return leftUsesFallback - rightUsesFallback;
  });
  reportOrder.slice(0, 25).forEach((ambiguity) => {
    console.warn(`  ${JSON.stringify(ambiguity)}`);
  });
  if (reportOrder.length > 25) {
    console.warn(`  ... ${allAmbiguities.length - 25} more`);
  }
}
if (zeroSaveDaylightExamples.length > 0) {
  console.log(`Zero-save DST examples: ${JSON.stringify(zeroSaveDaylightExamples)}`);
}
if (allUninferable.length === 0) {
  console.log('DST-save inference: 0 uninferable DST intervals.');
} else {
  console.warn(`DST-save inference: ${allUninferable.length} DST intervals are uninferable.`);
  allUninferable.slice(0, 25).forEach((entry) => {
    console.warn(`  ${JSON.stringify(entry)}`);
  });
}
