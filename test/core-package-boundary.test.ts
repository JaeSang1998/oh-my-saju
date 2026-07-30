import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { describe, expect, test } from 'vitest';

interface PackageManifest {
  readonly description: string;
  readonly exports: Readonly<Record<string, unknown>>;
}

const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageManifest;

describe('saju-engine package interface', () => {
  test('계산 사실 subpath만 공개하고 전통·리딩·에이전트 workflow는 노출하지 않는다', () => {
    expect(Object.keys(manifest.exports).sort()).toEqual([
      '.',
      './advanced',
      './calendar',
      './package.json',
      './timing',
    ]);
    expect(manifest.exports).not.toHaveProperty('./legacy');
    expect(manifest.description).not.toMatch(/\bAI\b|interpretation|profile|narration/iu);
  });
});
