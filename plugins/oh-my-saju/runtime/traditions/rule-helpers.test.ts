import { describe, expect, it } from 'vitest';
import {
  hasFinalConsonant,
  joinWithComitativeParticle,
  withAdverbialParticle,
  withComitativeParticle,
  withCopulaClause,
  withObjectParticle,
  withSubjectParticle,
  withTopicParticle,
} from './rule-helpers';

describe('조사 헬퍼 — 받침 판정', () => {
  it.each([
    ['갑', true],
    ['을', true],
    ['병', true],
    ['정', true],
    ['무', false],
    ['기', false],
    ['경', true],
    ['신', true],
    ['임', true],
    ['계', false],
  ])('천간 %s 의 받침 유무를 읽는다', (stem, expected) => {
    expect(hasFinalConsonant(stem)).toBe(expected);
  });

  it.each([
    ['자', false],
    ['축', true],
    ['인', true],
    ['묘', false],
    ['진', true],
    ['사', false],
    ['오', false],
    ['미', false],
    ['신', true],
    ['유', false],
    ['술', true],
    ['해', false],
  ])('지지 %s 의 받침 유무를 읽는다', (branch, expected) => {
    expect(hasFinalConsonant(branch)).toBe(expected);
  });

  it.each([
    ['목', true],
    ['화', false],
    ['토', false],
    ['금', true],
    ['수', false],
  ])('오행 %s 의 받침 유무를 읽는다', (element, expected) => {
    expect(hasFinalConsonant(element)).toBe(expected);
  });
});

describe('조사 헬퍼 — 괄호와 따옴표', () => {
  it('괄호는 통째로 건너뛰고 앞말의 받침으로 판정한다', () => {
    expect(withAdverbialParticle('화격(목)')).toBe('화격(목)으로');
    expect(withAdverbialParticle('화격(화)')).toBe('화격(화)으로');
    expect(withSubjectParticle('재성(연간 계 투출, 지지 뿌리 없음)')).toBe(
      '재성(연간 계 투출, 지지 뿌리 없음)이',
    );
    expect(withSubjectParticle('재성 투출(시간 신 편재)')).toBe('재성 투출(시간 신 편재)이');
  });

  it('중첩 괄호도 통째로 건너뛴다', () => {
    expect(withTopicParticle('상신 후보(재성(정재))')).toBe('상신 후보(재성(정재))는');
  });

  it('괄호가 열린 채 끝나면 남은 앞말로 판정한다', () => {
    expect(withTopicParticle('일지 인의 갑(정기·건록')).toBe('일지 인의 갑(정기·건록은');
  });

  it('따옴표는 부호만 건너뛰고 안쪽 글자로 판정한다', () => {
    expect(withTopicParticle("'양인'")).toBe("'양인'은");
    expect(withSubjectParticle('“정재”')).toBe('“정재”가');
  });

  it('꼬리 공백은 무시한다', () => {
    expect(withTopicParticle('갑 ')).toBe('갑 은');
  });
});

describe('조사 헬퍼 — 숫자 독음', () => {
  it.each([
    ['0', '0으로'],
    ['1', '1로'],
    ['2', '2로'],
    ['3', '3으로'],
    ['4', '4로'],
    ['5', '5로'],
    ['6', '6으로'],
    ['7', '7로'],
    ['8', '8로'],
    ['9', '9로'],
  ])('%s 뒤의 부사격 조사를 한글 독음으로 고른다', (value, expected) => {
    expect(withAdverbialParticle(value)).toBe(expected);
  });

  it('ㄹ 받침 숫자는 으로가 아니라 로를 쓴다', () => {
    expect(withAdverbialParticle('11')).toBe('11로');
    expect(withAdverbialParticle('7')).toBe('7로');
    expect(withAdverbialParticle('8')).toBe('8로');
  });

  it('소수는 마지막 자릿수로 판정한다', () => {
    expect(withAdverbialParticle('0.69')).toBe('0.69로');
    expect(withAdverbialParticle('3.06')).toBe('3.06으로');
    expect(withAdverbialParticle('-7.5')).toBe('-7.5로');
    expect(withAdverbialParticle('1.3')).toBe('1.3으로');
  });

  it('숫자 뒤 주격·목적격은 ㄹ 받침도 받침형을 쓴다', () => {
    expect(withSubjectParticle('1')).toBe('1이');
    expect(withObjectParticle('8')).toBe('8을');
    expect(withTopicParticle('0')).toBe('0은');
    expect(withTopicParticle('2')).toBe('2는');
  });

  it('숫자 뒤에 단위가 붙으면 단위로 판정한다', () => {
    expect(withAdverbialParticle('0.5배')).toBe('0.5배로');
    expect(withTopicParticle('3점')).toBe('3점은');
  });
});

describe('조사 헬퍼 — 격별 형태', () => {
  it('주제 보조사', () => {
    expect(withTopicParticle('갑')).toBe('갑은');
    expect(withTopicParticle('무')).toBe('무는');
    expect(withTopicParticle('술')).toBe('술은');
  });

  it('주격 조사', () => {
    expect(withSubjectParticle('신')).toBe('신이');
    expect(withSubjectParticle('계')).toBe('계가');
  });

  it('목적격 조사', () => {
    expect(withObjectParticle('축')).toBe('축을');
    expect(withObjectParticle('오')).toBe('오를');
  });

  it('공동격 조사', () => {
    expect(withComitativeParticle('갑')).toBe('갑과');
    expect(withComitativeParticle('자')).toBe('자와');
    expect(withComitativeParticle('일지 인의 갑(정기·건록)')).toBe('일지 인의 갑(정기·건록)과');
  });

  it('부사격 조사는 ㄹ 받침에서 로를 쓴다', () => {
    expect(withAdverbialParticle('목')).toBe('목으로');
    expect(withAdverbialParticle('술')).toBe('술로');
    expect(withAdverbialParticle('정재')).toBe('정재로');
    expect(withAdverbialParticle('편관')).toBe('편관으로');
  });

  it('계사 연결어미', () => {
    expect(withCopulaClause('정관')).toBe('정관이라');
    expect(withCopulaClause('정재')).toBe('정재라');
  });

  it('나열 뒤 공동격 조사는 마지막 항목으로 판정한다', () => {
    expect(joinWithComitativeParticle(['인', '오', '술'])).toBe('인·오·술과');
    expect(joinWithComitativeParticle(['해', '묘', '미'])).toBe('해·묘·미와');
    expect(joinWithComitativeParticle(['갑'])).toBe('갑과');
  });

  it('한글이 아닌 꼬리와 빈 문자열은 받침 없음으로 본다', () => {
    expect(hasFinalConsonant('')).toBe(false);
    expect(hasFinalConsonant('()')).toBe(false);
    expect(withTopicParticle('unknown')).toBe('unknown는');
  });
});
