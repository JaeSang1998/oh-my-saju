import type { TraditionalSystemProfile } from '../shared';

export const ZIWEI_QUANSHU_CORE_PROFILE: TraditionalSystemProfile = Object.freeze({
  id: 'ziwei-quanshu-core',
  version: '1.0.0',
  displayName: '《紫微斗數全書》 12궁·14주성 코어',
  outputBoundary: 'natal-chart-mechanics',
  sources: Object.freeze([
    Object.freeze({
      id: 'ziwei-doushu-quanshu-volume-2-fixed',
      title: '《紫微斗數全書》 권2',
      work: '紫微斗數全書',
      editionOrSnapshot: 'Wikisource 권2 revision oldid=1963110',
      url: 'https://zh.wikisource.org/w/index.php?title=%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C&oldid=1963110',
      locator: '安命身宮訣, 安十二宮天干訣, 五行寅首·納音, 安紫微天府諸星訣',
      textualLayer: 'public-transcription',
      verification: 'transcription-reviewed',
    }),
  ]),
});
