import { describe, expect, test } from 'vitest';
import { ganjiIndexOf, pillarFromGanji } from './ganji';

describe('60갑자 인덱스 산술', () => {
  test('60개 유효 조합을 정확히 왕복한다', () => {
    for (let index = 0; index < 60; index += 1) {
      expect(ganjiIndexOf(index % 10, index % 12)).toBe(index);
      expect(pillarFromGanji(index)).toBeDefined();
    }
  });

  test('10×12 조합에서 홀짝이 같은 조합만 허용한다', () => {
    for (let stem = 0; stem < 10; stem += 1) {
      for (let branch = 0; branch < 12; branch += 1) {
        if ((stem - branch) % 2 === 0) {
          expect(ganjiIndexOf(stem, branch)).toBeGreaterThanOrEqual(0);
        } else {
          expect(() => ganjiIndexOf(stem, branch)).toThrow(RangeError);
        }
      }
    }
  });

  test.each([
    [10, 0],
    [0, 12],
    [-1, 1],
    [1, -1],
    [0.5, 0.5],
    [Number.NaN, 0],
    [0, Number.POSITIVE_INFINITY],
  ])('범위 밖 또는 비정수 인덱스 (%s, %s)를 거부한다', (stem, branch) => {
    expect(() => ganjiIndexOf(stem, branch)).toThrow(RangeError);
  });
});
