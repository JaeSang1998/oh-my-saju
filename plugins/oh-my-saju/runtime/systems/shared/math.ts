/** Small deterministic cycle primitives shared by plugin-owned systems. */
import type { EarthlyBranch, HeavenlyStem } from 'saju-engine';

export const SYSTEM_HEAVENLY_STEMS: readonly HeavenlyStem[] = Object.freeze([
  '갑',
  '을',
  '병',
  '정',
  '무',
  '기',
  '경',
  '신',
  '임',
  '계',
]);

export const SYSTEM_EARTHLY_BRANCHES: readonly EarthlyBranch[] = Object.freeze([
  '자',
  '축',
  '인',
  '묘',
  '진',
  '사',
  '오',
  '미',
  '신',
  '유',
  '술',
  '해',
]);

export const SYSTEM_HEAVENLY_STEM_HANJA: Readonly<Record<HeavenlyStem, string>> = Object.freeze({
  갑: '甲',
  을: '乙',
  병: '丙',
  정: '丁',
  무: '戊',
  기: '己',
  경: '庚',
  신: '辛',
  임: '壬',
  계: '癸',
});

export const SYSTEM_EARTHLY_BRANCH_HANJA: Readonly<Record<EarthlyBranch, string>> = Object.freeze({
  자: '子',
  축: '丑',
  인: '寅',
  묘: '卯',
  진: '辰',
  사: '巳',
  오: '午',
  미: '未',
  신: '申',
  유: '酉',
  술: '戌',
  해: '亥',
});

export function systemModulo(value: number, modulus: number): number {
  if (!Number.isInteger(value) || !Number.isInteger(modulus) || modulus <= 0) {
    throw new RangeError('Cycle modulo requires integer input and a positive integer modulus.');
  }
  const remainder = value % modulus;
  return remainder < 0 ? remainder + modulus : remainder;
}

export function residueOneToModulus(value: number, modulus: number): number {
  return systemModulo(value - 1, modulus) + 1;
}

export function branchAt(index: number): EarthlyBranch {
  return SYSTEM_EARTHLY_BRANCHES[systemModulo(index, SYSTEM_EARTHLY_BRANCHES.length)]!;
}

export function stemAt(index: number): HeavenlyStem {
  return SYSTEM_HEAVENLY_STEMS[systemModulo(index, SYSTEM_HEAVENLY_STEMS.length)]!;
}

export function branchIndex(branch: EarthlyBranch): number {
  return SYSTEM_EARTHLY_BRANCHES.indexOf(branch);
}

export function stemIndex(stem: HeavenlyStem): number {
  return SYSTEM_HEAVENLY_STEMS.indexOf(stem);
}
