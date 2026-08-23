import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const SKILL_ROOT = resolve('plugins/oh-my-saju/skills/oh-my-saju');

function readSkillFile(path: string): string {
  return readFileSync(resolve(SKILL_ROOT, path), 'utf8');
}

function readProjectFile(path: string): string {
  return readFileSync(resolve(path), 'utf8');
}

describe('Oh My Saju agent-skill conversation policy', () => {
  test('uses one direct fast path for ordinary Korean readings', () => {
    const skill = readSkillFile('SKILL.md');
    const inputReference = readSkillFile('references/input-and-runtime.md');
    const fastReference = readSkillFile('references/fast-reading.md');

    expect(skill).toContain('Normal Korean reading: use the fast path');
    expect(skill).toContain('`analyze-reading` command');
    expect(skill).toContain('Do not create `preparedDigest`, Pack-by-Pack drafts');
    expect(skill).toContain('or validation JSON for this path');
    expect(inputReference).toContain('For an ordinary user-facing reading, use `analyze-reading`');
    expect(fastReference).toContain('한 번의 `analyze-reading` 계산');
    expect(fastReference).toContain('`prepare-reading`, `validate-reading`, `preparedDigest`');
    expect(fastReference).toContain('이 경로는 검증 JSON을 작성하지 않는다.');
  });

  test('keeps Korean civil-time defaults and the detailed 0–7 protocol', () => {
    const skill = readSkillFile('SKILL.md');
    const inputReference = readSkillFile('references/input-and-runtime.md');
    const deepProtocol = readSkillFile('references/deep-traditional-analysis.md');

    expect(skill).toContain('Default `inferenceDepth` is `deep-traditional`');
    expect(skill).toContain('For Korean civil-time requests with an unqualified numbered date');
    expect(inputReference).toContain('`deep-traditional` (default)');
    expect(inputReference).toContain('at most 60 Saju years');
    expect(inputReference).toContain('`calendar: "gregorian"`');
    expect(inputReference).toContain('`timeZone: "Asia/Seoul"`');
    expect(inputReference).toContain('Do not ask a blocking confirmation');
    expect(inputReference).toContain('`time: { "kind": "unknown" }`');
    for (const stage of ['0', '0.5', '5.1', '5.2', '6.1', '6.2', '7']) {
      expect(deepProtocol).toMatch(new RegExp(`\\| ${stage}\\s+\\|`, 'u'));
    }
    expect(deepProtocol).toContain('무엇에 끌려 먼저 가까워지는지');
    expect(deepProtocol).toContain('어떤 제안이 그 강점을 쓰게 해 장기적으로 맞는지');
  });

  test('requires the full Fluent Korean pass for every Korean delivery', () => {
    const skill = readSkillFile('SKILL.md');
    const style = readSkillFile('references/korean-interpretation-style.md');
    const fluentReference = readSkillFile('references/fluent-korean-output-pass.md');

    expect(skill).toContain('The Fluent Korean pass is mandatory');
    expect(skill).toContain('the entire `result.task.writing` policy');
    expect(skill).toMatch(/a colon or a natural connective\s+instead of an em dash/u);
    expect(style).toMatch(/The full Fluent\s+Korean pass is mandatory/u);
    expect(fluentReference).toMatch(/몇 개의\s+금지어만 확인하는 축약 절차로 바꾸지 않는다\./u);
    expect(fluentReference).toContain('명사구, 부사구, 연결어미로 끝내지 않는다.');
    expect(fluentReference).toContain('엠대시(`—`)는');
    expect(fluentReference).toMatch(/한국어로 다른 에이전트에게 초안을 요청하거나\s+그 결과/u);
  });

  test('reserves strict drafts and validation JSON for audit requests', () => {
    const skill = readSkillFile('SKILL.md');
    const inputReference = readSkillFile('references/input-and-runtime.md');
    const fastReference = readSkillFile('references/fast-reading.md');

    expect(skill).toContain('Strict audit path: use only when requested');
    expect(skill).toContain('`prepare-reading` → independent Pack drafts → `validate-reading`');
    expect(inputReference).toContain(
      '`prepare-reading` and `validate-reading` are the strict audit path',
    );
    expect(fastReference).toContain('사용자가 Pack별 출처, finding ID, 초안의 재현성');
    expect(inputReference).toContain('`presentationDraft`');
  });

  test('routes two-person compatibility through one validated pair protocol', () => {
    const skill = readSkillFile('SKILL.md');
    const inputReference = readSkillFile('references/input-and-runtime.md');

    expect(skill).toContain('For two-person 궁합');
    expect(skill).toContain('A→B and B→A together');
    expect(skill).toContain('`prepare-compatibility`');
    expect(skill).toContain('`validate-compatibility`');
    expect(inputReference).toContain('"command": "prepare-compatibility"');
    expect(inputReference).toContain('"command": "validate-compatibility"');
    expect(inputReference).toContain(
      'Do not run two unrelated `prepare-reading` commands and manually',
    );
    expect(inputReference).toContain('join their conclusions');
  });

  test('ships the conversation-policy improvement as a new plugin minor version', () => {
    const portable = JSON.parse(readProjectFile('plugins/oh-my-saju/plugin.json')) as {
      version: string;
    };
    const codex = JSON.parse(readProjectFile('plugins/oh-my-saju/.codex-plugin/plugin.json')) as {
      version: string;
    };
    const claude = JSON.parse(readProjectFile('plugins/oh-my-saju/.claude-plugin/plugin.json')) as {
      version: string;
    };
    const versions = JSON.parse(readProjectFile('release/versions.json')) as {
      plugin: string;
      skills: { 'oh-my-saju': string };
    };

    expect(portable.version).toBe('0.8.0');
    expect(codex.version).toBe(portable.version);
    expect(claude.version).toBe(portable.version);
    expect(versions.plugin).toBe(portable.version);
    expect(versions.skills['oh-my-saju']).toBe(portable.version);
  });
});
