import { describe, expect, test } from 'vitest';
import { castIChing, getIChingTrigramArrangement } from './index';

describe('I Ching trigram arrangement profiles', () => {
  test('소옹 선천 배열을 남방상위 방위와 선천수로 조회한다', () => {
    const arrangement = getIChingTrigramArrangement({
      id: 'shaoyong-xiantian',
      version: '1.0.0',
    });

    expect(arrangement).toMatchObject({
      profile: {
        id: 'shaoyong-xiantian',
        version: '1.0.0',
        displayName: '소옹 선천 팔괘 배열',
      },
      orientation: 'south-at-top',
      lineOrder: 'bottom-to-top',
      numbering: 'xiantian-sequence',
      positions: [
        { direction: 'south', trigram: { id: 'qian', hanja: '乾', bits: '111' }, number: 1 },
        { direction: 'southeast', trigram: { id: 'dui', hanja: '兌', bits: '110' }, number: 2 },
        { direction: 'east', trigram: { id: 'li', hanja: '離', bits: '101' }, number: 3 },
        { direction: 'northeast', trigram: { id: 'zhen', hanja: '震', bits: '100' }, number: 4 },
        { direction: 'north', trigram: { id: 'kun', hanja: '坤', bits: '000' }, number: 8 },
        { direction: 'northwest', trigram: { id: 'gen', hanja: '艮', bits: '001' }, number: 7 },
        { direction: 'west', trigram: { id: 'kan', hanja: '坎', bits: '010' }, number: 6 },
        { direction: 'southwest', trigram: { id: 'xun', hanja: '巽', bits: '011' }, number: 5 },
      ],
    });
    expect(arrangement.profile.sourceIds).toContain('shuogua-base-text');
    expect(Object.isFrozen(arrangement)).toBe(true);
  });

  test('설괘 후천 배열을 낙서수와 섞지 않고 조회한다', () => {
    const arrangement = getIChingTrigramArrangement({
      id: 'shuogua-houtian',
      version: '1.0.0',
    });

    expect(arrangement).toMatchObject({
      profile: {
        id: 'shuogua-houtian',
        version: '1.0.0',
        displayName: '《설괘》 후천 팔괘 배열',
      },
      orientation: 'south-at-top',
      lineOrder: 'bottom-to-top',
      numbering: 'none',
      excludedConventions: ['luoshu-number'],
      positions: [
        { direction: 'east', trigram: { id: 'zhen', hanja: '震', bits: '100' } },
        { direction: 'southeast', trigram: { id: 'xun', hanja: '巽', bits: '011' } },
        { direction: 'south', trigram: { id: 'li', hanja: '離', bits: '101' } },
        { direction: 'southwest', trigram: { id: 'kun', hanja: '坤', bits: '000' } },
        { direction: 'west', trigram: { id: 'dui', hanja: '兌', bits: '110' } },
        { direction: 'northwest', trigram: { id: 'qian', hanja: '乾', bits: '111' } },
        { direction: 'north', trigram: { id: 'kan', hanja: '坎', bits: '010' } },
        { direction: 'northeast', trigram: { id: 'gen', hanja: '艮', bits: '001' } },
      ],
    });
    expect(arrangement.positions.every((position) => !('number' in position))).toBe(true);
    expect(Object.isFrozen(arrangement)).toBe(true);
  });

  test('점괘 요청에 명시한 배열 프로필만 결과 metadata에 결합한다', () => {
    const report = castIChing({
      kind: 'iching',
      method: 'manual-lines',
      lines: [7, 7, 7, 7, 7, 7],
      trigramArrangement: {
        id: 'shuogua-houtian',
        version: '1.0.0',
      },
    });

    expect(report.value.profiles.trigramArrangement).toEqual({
      id: 'shuogua-houtian',
      version: '1.0.0',
    });
    expect(report.value.trigramArrangement).toEqual(
      getIChingTrigramArrangement({
        id: 'shuogua-houtian',
        version: '1.0.0',
      }),
    );
  });

  test('배열을 선택하지 않은 기존 점괘에 임의의 선천·후천값을 넣지 않는다', () => {
    const report = castIChing({
      kind: 'iching',
      method: 'manual-lines',
      lines: [7, 7, 7, 7, 7, 7],
    });

    expect(report.value.profiles.trigramArrangement).toBeUndefined();
    expect(report.value.trigramArrangement).toBeUndefined();
  });

  test('알 수 없는 배열 프로필을 다른 배열로 추측하지 않는다', () => {
    expect(() =>
      getIChingTrigramArrangement({
        id: 'fuxi-xiantian',
        version: '1.0.0',
      } as never),
    ).toThrowError(
      expect.objectContaining({
        code: 'UNSUPPORTED_SYSTEM_PROFILE',
        path: ['trigramArrangement'],
      }),
    );
  });
});
