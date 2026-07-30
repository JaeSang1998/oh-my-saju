export interface SolarTermDescriptor {
  readonly name: string;
  readonly hanja: string;
}

const SOLAR_TERM_CATALOG: readonly SolarTermDescriptor[] = [
  { name: '소한', hanja: '小寒' },
  { name: '대한', hanja: '大寒' },
  { name: '입춘', hanja: '立春' },
  { name: '우수', hanja: '雨水' },
  { name: '경칩', hanja: '驚蟄' },
  { name: '춘분', hanja: '春分' },
  { name: '청명', hanja: '淸明' },
  { name: '곡우', hanja: '穀雨' },
  { name: '입하', hanja: '立夏' },
  { name: '소만', hanja: '小滿' },
  { name: '망종', hanja: '芒種' },
  { name: '하지', hanja: '夏至' },
  { name: '소서', hanja: '小暑' },
  { name: '대서', hanja: '大暑' },
  { name: '입추', hanja: '立秋' },
  { name: '처서', hanja: '處暑' },
  { name: '백로', hanja: '白露' },
  { name: '추분', hanja: '秋分' },
  { name: '한로', hanja: '寒露' },
  { name: '상강', hanja: '霜降' },
  { name: '입동', hanja: '立冬' },
  { name: '소설', hanja: '小雪' },
  { name: '대설', hanja: '大雪' },
  { name: '동지', hanja: '冬至' },
];

export function solarTermDescriptor(index: number): SolarTermDescriptor {
  const descriptor = SOLAR_TERM_CATALOG[index];
  if (descriptor === undefined) {
    throw new RangeError(`Solar-term index is outside the catalog: ${index}`);
  }
  return descriptor;
}
