import { deepFreeze } from '../../internal/deep-freeze';
import type {
  TraditionalSystemLimitation,
  TraditionalSystemPolicySelection,
  TraditionalSystemProfile,
} from '../shared';
import type { IChingProfiles } from './types';

export function ichingProfiles(castingProfileId: string): IChingProfiles {
  return {
    mechanics: { id: 'zhouyi-mechanics', version: '1.0.0' },
    casting: { id: castingProfileId, version: '1.0.0' },
    hexagramOrder: { id: 'received-king-wen-sequence', version: '1.0.0' },
  };
}

export const ICHING_PROFILE = deepFreeze({
  id: 'zhouyi-mechanics',
  version: '1.0.0',
  displayName: 'Zhouyi casting mechanics',
  outputBoundary: 'casting-mechanics',
  sources: [
    {
      id: 'zhouyi-xici-shang',
      title: '周易・繫辭上',
      work: '周易',
      editionOrSnapshot:
        'Chinese Text Project received text page xi-ci-shang profile-1.0.0 snapshot',
      url: 'https://ctext.org/book-of-changes/xi-ci-shang',
      locator: '大衍之數五十，其用四十有九',
      textualLayer: 'base-text',
      verification: 'transcription-reviewed',
    },
    {
      id: 'zhouyi-yijing-order',
      title: '周易・易經 received hexagram order',
      work: '周易',
      editionOrSnapshot: 'Chinese Text Project received text page yi-jing profile-1.0.0 snapshot',
      url: 'https://ctext.org/book-of-changes/yi-jing',
      locator: 'hexagrams 1–64',
      textualLayer: 'base-text',
      verification: 'transcription-reviewed',
    },
    {
      id: 'shuogua-base-text',
      title: '《易傳・說卦》',
      work: '易傳',
      editionOrSnapshot: 'Chinese Wikisource 說卦 public transcription profile-1.0.0 snapshot',
      url: 'https://zh.wikisource.org/zh/%E6%98%93%E5%82%B3/%E8%AA%AA%E5%8D%A6',
      locator: '天地定位…水火不相射; 帝出乎震…成言乎艮',
      textualLayer: 'base-text',
      verification: 'transcription-reviewed',
    },
    {
      id: 'shaoyong-xiantian-commentary',
      title: '《易經蒙引》 권12상',
      work: '易經蒙引',
      editionOrSnapshot: 'Chinese Text Project Wiki chapter=760403 profile-1.0.0 snapshot',
      url: 'https://ctext.org/wiki.pl?chapter=760403',
      locator: '선천 팔괘 도설 및 乾一兌二離三震四巽五坎六艮七坤八 차서',
      textualLayer: 'commentary',
      verification: 'transcription-reviewed',
    },
    {
      id: 'yiyin-coins',
      title: '易隱・以錢代蓍說',
      work: '易隱',
      editionOrSnapshot: 'Chinese Text Project Wiki chapter=436217 profile-1.0.0 snapshot',
      url: 'https://ctext.org/wiki.pl?chapter=436217',
      locator: '以錢代蓍說',
      textualLayer: 'base-text',
      verification: 'transcription-reviewed',
    },
    {
      id: 'zhuxi-zhouyi-benyi-shiyi',
      title: '周易本義・筮儀',
      work: '周易本義',
      editionOrSnapshot: 'Chinese Text Project Wiki chapter=815572 profile-1.0.0 snapshot',
      url: 'https://ctext.org/wiki.pl?chapter=815572',
      locator: '筮儀, three changes per line and 36/32/28/24 stalk outcomes',
      textualLayer: 'commentary',
      verification: 'transcription-reviewed',
    },
    {
      id: 'unicode-yijing-symbols',
      title: 'Unicode Yijing Hexagram Symbols',
      work: 'Unicode Standard 17.0',
      editionOrSnapshot: 'Unicode Standard 17.0 names list n_4DC0',
      url: 'https://www.unicode.org/charts/nameslist/n_4DC0.html',
      locator: 'U+4DC0–U+4DFF',
      textualLayer: 'modern-research',
      verification: 'transcription-reviewed',
    },
  ],
} satisfies TraditionalSystemProfile);

export const ICHING_POLICIES = deepFreeze([
  {
    id: 'line-order',
    version: '1.0.0',
    value: 'bottom-to-top',
  },
  {
    id: 'moving-lines',
    version: '1.0.0',
    value: 'only-6-and-9-change',
  },
  {
    id: 'randomness',
    version: '1.0.0',
    value: 'caller-supplied-evidence-only',
  },
] satisfies readonly TraditionalSystemPolicySelection[]);

export const ICHING_LIMITATIONS = deepFreeze([
  {
    id: 'no-interpretation',
    message:
      'The report contains casting mechanics only; it does not select or provide hexagram or line interpretations.',
  },
  {
    id: 'predictive-validity-not-established',
    message: 'No predictive validity for real-world events has been established.',
  },
] satisfies readonly TraditionalSystemLimitation[]);
