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
  test('uses Korean civil-time defaults without a blocking confirmation', () => {
    const skill = readSkillFile('SKILL.md');
    const inputReference = readSkillFile('references/input-and-runtime.md');

    for (const policy of [skill, inputReference]) {
      expect(policy).toContain('Korean civil-time defaults');
      expect(policy).toContain('`calendar: "gregorian"`');
      expect(policy).toContain('`timeZone: "Asia/Seoul"`');
      expect(policy).toContain('Do not ask a blocking confirmation');
      expect(policy).toContain('born outside Korea');
      expect(policy).toMatch(/whether the birth time is\s+supplied or unknown/u);
      expect(policy).toContain('`time: { "kind": "unknown" }`');
    }
  });

  test('treats an open-ended request as a useful broad interpretation', () => {
    const skill = readSkillFile('SKILL.md');
    const style = readSkillFile('references/korean-interpretation-style.md');

    for (const policy of [skill, style]) {
      expect(policy).toContain('Broad interpretation default');
      expect(policy).toContain('personality and decision style');
      expect(policy).toContain('work, study, and execution');
      expect(policy).toContain('relationships and communication');
      expect(policy).toMatch(/three concrete, recognizable\s+manifestations/u);
      expect(policy).toContain('Default broad-reading display contract');
      expect(policy).toMatch(/`?핵심 구조`?/u);
      expect(policy).toMatch(/`?어떤 사람인가`?/u);
      expect(policy).toMatch(/`?오행 분포\(지장간 포함\)`?/u);
      expect(policy).toMatch(/one to three connected sentences/u);
    }
    expect(style).toContain('Prefer bullets and small tables');
    expect(skill).toContain(
      'Do not force every paragraph into a situation-behavior-result grammar',
    );
  });

  test('keeps advanced doctrine behind progressive disclosure', () => {
    const skill = readSkillFile('SKILL.md');
    const style = readSkillFile('references/korean-interpretation-style.md');

    for (const policy of [skill, style]) {
      expect(policy).toContain('Progressive disclosure');
      for (const term of ['격국', '조후', '용신', '신살', '공망']) {
        expect(policy).toContain(`\`${term}\``);
      }
      expect(policy).toMatch(/unless the user(?: explicitly)? asks/u);
      expect(policy).toContain(
        'Never end a broad reading with a limitations or unresolved-doctrine paragraph',
      );
      expect(policy).toContain(
        'If a finding cannot support a plain-language implication, omit the finding entirely',
      );
    }
  });

  test('keeps generic validity and audit disclaimers out of ordinary readings', () => {
    const skill = readSkillFile('SKILL.md');
    const style = readSkillFile('references/korean-interpretation-style.md');
    const interfaceMetadata = readSkillFile('agents/openai.yaml');

    for (const policy of [skill, style]) {
      expect(policy).toContain('Do not append a generic scientific-validity disclaimer');
      expect(policy).toContain('`displayPolicy: "audit-only"`');
      expect(policy).toContain('`defaultDisplay: false`');
    }
    expect(interfaceMetadata).not.toContain('explicit limits');
    expect(interfaceMetadata).toContain('natural Korean interpretation');
    expect(interfaceMetadata).toContain('short, sectioned, and layperson-first');
    expect(interfaceMetadata).toContain('omit advanced doctrine unless the user asks for it');
  });

  test('requires the validated deterministic presentation for a broad reading', () => {
    const skill = readSkillFile('SKILL.md');
    const inputReference = readSkillFile('references/input-and-runtime.md');

    expect(skill).toContain('Set `request.readingMode` explicitly');
    expect(skill).toContain('For `readingMode: "broad"`, the v2 `presentationDraft` is required');
    expect(skill).toContain('output `result.presentation.markdown` exactly');
    expect(skill).toMatch(/Do not\s+rephrase it/u);
    expect(inputReference).toMatch(/seven or\s+more distinct validated paragraphs/u);
    expect(inputReference).toMatch(/quotes exact ordered `basis` and\s+`portrait` spans/u);
    expect(inputReference).toMatch(
      /declares its `role` and quotes exact ordered `basis` and\s+`interpretation` spans/u,
    );
    expect(inputReference).toContain('replaces repeated uncertainty prose with a local `△` marker');
    expect(inputReference).toContain('one legend near the basis line');
    expect(inputReference).toContain('already passed the Pack claim gate');
    expect(inputReference).toContain(
      '이 근거는 기본 성향 프로필의 해석 문장으로 선택하지 않습니다.',
    );
    expect(skill).toContain('only protocol filler');
    expect(inputReference).toMatch(/show\s+that Markdown as-is/u);
  });

  test('ships the conversation-policy improvement as a new plugin patch version', () => {
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

    expect(portable.version).toBe('0.4.4');
    expect(codex.version).toBe(portable.version);
    expect(claude.version).toBe(portable.version);
    expect(versions.plugin).toBe(portable.version);
    expect(versions.skills['oh-my-saju']).toBe(portable.version);
  });
});
