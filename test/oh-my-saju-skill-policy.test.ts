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
    }
  });

  test('keeps generic validity and audit disclaimers out of ordinary readings', () => {
    const skill = readSkillFile('SKILL.md');
    const style = readSkillFile('references/korean-interpretation-style.md');
    const interfaceMetadata = readSkillFile('agents/openai.yaml');

    for (const policy of [skill, style]) {
      expect(policy).toContain('Do not append a generic scientific-validity disclaimer');
      expect(policy).toContain('audit metadata');
    }
    expect(interfaceMetadata).not.toContain('explicit limits');
    expect(interfaceMetadata).toContain('natural Korean interpretation');
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

    expect(portable.version).toBe('0.4.1');
    expect(codex.version).toBe(portable.version);
    expect(claude.version).toBe(portable.version);
    expect(versions.plugin).toBe(portable.version);
    expect(versions.skills['oh-my-saju']).toBe(portable.version);
  });
});
