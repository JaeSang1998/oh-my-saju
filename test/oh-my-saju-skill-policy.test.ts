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
      expect(policy).toContain('`한눈에 보면`');
      expect(policy).toContain('`강점이 살아날 때 / 꼬일 때`');
      expect(policy).toContain('Prefer bullets and small tables');
      expect(policy).toContain('Each broad-reading paragraph is one atomic sentence');
    }
  });

  test('keeps advanced doctrine behind progressive disclosure', () => {
    const skill = readSkillFile('SKILL.md');
    const style = readSkillFile('references/korean-interpretation-style.md');

    for (const policy of [skill, style]) {
      expect(policy).toContain('Progressive disclosure');
      expect(policy).toContain('Do not mention these terms in a broad reading');
      for (const term of ['격국', '조후', '용신', '신살', '공망']) {
        expect(policy).toContain(`\`${term}\``);
      }
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
    expect(skill).toContain('For `readingMode: "broad"`, `presentationDraft` is required');
    expect(skill).toContain('output `result.presentation.markdown` exactly');
    expect(skill).toMatch(/Do not\s+rephrase it/u);
    expect(inputReference).toContain('nine distinct atomic paragraphs');
    expect(inputReference).toMatch(/`situation`, `behavior`, and\s+`result`/u);
    expect(inputReference).toContain('declares a matching `domain` and `direction`');
    expect(inputReference).toContain('replaces repeated uncertainty prose with a local `△` marker');
    expect(inputReference).toContain('one legend near the basis line');
    expect(inputReference).toContain('already passed the Pack claim gate');
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

    expect(portable.version).toBe('0.4.3');
    expect(codex.version).toBe(portable.version);
    expect(claude.version).toBe(portable.version);
    expect(versions.plugin).toBe(portable.version);
    expect(versions.skills['oh-my-saju']).toBe(portable.version);
  });
});
