import { SajuError } from '../errors';
import { isRecord } from '../internal/guards';
import type { SajuBirthDate, SajuRequest } from './types';

export function assertBirthDateShape(value: unknown): asserts value is SajuBirthDate {
  if (!isRecord(value)) {
    throw new SajuError('INVALID_REQUEST', 'request.birth.date must be an object.', {
      path: ['birth', 'date'],
    });
  }
  if (value.calendar !== 'gregorian' && value.calendar !== 'korean-lunar') {
    throw new SajuError('INVALID_DATE', 'birth.date.calendar must be gregorian or korean-lunar.', {
      path: ['birth', 'date', 'calendar'],
      details: { value: value.calendar },
    });
  }
  if (
    value.calendar === 'korean-lunar' &&
    value.monthKind !== 'regular' &&
    value.monthKind !== 'leap'
  ) {
    throw new SajuError(
      'INVALID_LEAP_MONTH',
      'A Korean lunar date requires monthKind regular or leap.',
      {
        path: ['birth', 'date', 'monthKind'],
        details: { value: value.monthKind },
      },
    );
  }
}

export function assertDayHourClockShape(value: unknown): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    throw new SajuError('INVALID_RULE', 'dayHourClock must be an object.', {
      path: ['rules', 'dayHourClock'],
    });
  }
  if (value.kind === 'civil') return;
  if (value.kind !== 'local-apparent-solar') {
    throw new SajuError(
      'INVALID_RULE',
      'dayHourClock.kind must be civil or local-apparent-solar.',
      {
        path: ['rules', 'dayHourClock', 'kind'],
        details: { value: value.kind },
      },
    );
  }
  if (
    typeof value.longitudeDegreesEast !== 'number' ||
    !Number.isFinite(value.longitudeDegreesEast) ||
    value.longitudeDegreesEast < -180 ||
    value.longitudeDegreesEast > 180
  ) {
    throw new SajuError(
      'INVALID_RULE',
      'longitudeDegreesEast must be a finite number from -180 through 180.',
      {
        path: ['rules', 'dayHourClock', 'longitudeDegreesEast'],
        details: { value: value.longitudeDegreesEast },
      },
    );
  }
  if (value.equationOfTime !== 'apply' && value.equationOfTime !== 'omit') {
    throw new SajuError(
      'INVALID_RULE',
      'equationOfTime must be apply or omit for local apparent solar time.',
      {
        path: ['rules', 'dayHourClock', 'equationOfTime'],
        details: { value: value.equationOfTime },
      },
    );
  }
}

export function assertRequestShape(value: unknown): asserts value is SajuRequest {
  if (!isRecord(value)) {
    throw new SajuError('INVALID_REQUEST', 'The Saju request must be an object.');
  }
  if (!isRecord(value.birth)) {
    throw new SajuError('INVALID_REQUEST', 'request.birth must be an object.', {
      path: ['birth'],
    });
  }

  const birth = value.birth;
  assertBirthDateShape(birth.date);
  if (!isRecord(birth.time)) {
    throw new SajuError('INVALID_REQUEST', 'request.birth.time must be an object.', {
      path: ['birth', 'time'],
    });
  }

  if (value.rules === undefined) return;
  if (!isRecord(value.rules)) {
    throw new SajuError('INVALID_RULE', 'request.rules must be an object.', {
      path: ['rules'],
    });
  }
  if (
    value.rules.ziHourPolicy !== undefined &&
    !['civilMidnight', 'ziStart', 'splitZi'].includes(value.rules.ziHourPolicy as string)
  ) {
    throw new SajuError(
      'INVALID_RULE',
      'ziHourPolicy must be civilMidnight, ziStart, or splitZi.',
      {
        path: ['rules', 'ziHourPolicy'],
        details: { value: value.rules.ziHourPolicy },
      },
    );
  }
  assertDayHourClockShape(value.rules.dayHourClock);
}
