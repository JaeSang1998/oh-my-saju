import type { TraditionalSystemProfile } from '../shared';

export const LIUREN_QUANSHU_NINE_GATES_PROFILE: TraditionalSystemProfile = Object.freeze({
  id: 'liuren-quanshu-nine-gates',
  version: '1.0.0',
  displayName: '《六壬指南》·《六壬大全》 월장·사과·구종법 기본 계산',
  outputBoundary: 'divination-chart-mechanics',
  sources: Object.freeze([
    Object.freeze({
      id: 'liuren-zhinan-volume-1',
      title: '《六壬指南》 권1',
      work: '六壬指南',
      editionOrSnapshot: 'Wikisource 권1 공개 전사 profile-1.0.0 snapshot',
      url: 'https://zh.wikisource.org/zh-hant/%E5%85%AD%E5%A3%AC%E6%8C%87%E5%8D%97/1',
      locator: '月將, 天地盤, 四課, 九宗門',
      textualLayer: 'public-transcription',
      verification: 'transcription-reviewed',
    }),
    Object.freeze({
      id: 'liuren-daquan-volume-1-fixed',
      title: '《六壬大全》 권1',
      work: '六壬大全',
      editionOrSnapshot: 'Wikisource 권1 revision oldid=854569',
      url: 'https://zh.wikisource.org/w/index.php?title=%E5%85%AD%E5%A3%AC%E5%A4%A7%E5%85%A8/1&oldid=854569',
      locator: '十干寄宮, 起例',
      textualLayer: 'public-transcription',
      verification: 'transcription-reviewed',
    }),
    Object.freeze({
      id: 'liuren-daquan-volume-7-shehai',
      title: '《六壬大全》 권7',
      work: '六壬大全',
      editionOrSnapshot: 'Chinese Text Project Wiki chapter=350312 profile-1.0.0 snapshot',
      url: 'https://ctext.org/wiki.pl?chapter=350312&if=en',
      locator: '正月丁卯日丑時亥將 涉害 example',
      textualLayer: 'public-transcription',
      verification: 'partially-verified',
    }),
  ]),
});
