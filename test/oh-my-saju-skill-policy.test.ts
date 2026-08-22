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
      expect(policy).toMatch(/`?성격과 행동 방식`?/u);
      expect(policy).toMatch(/`?강점과 주의점`?/u);
      expect(policy).toMatch(/`?오행 분포\(지장간 포함\)`?/u);
      expect(policy).toMatch(/one to three connected sentences/u);
    }
    expect(style).toContain('Prefer bullets and small tables');
    expect(skill).toContain(
      'Do not force every paragraph into a situation-behavior-result grammar',
    );
  });

  test('uses supported advanced doctrine in the default deep protocol', () => {
    const skill = readSkillFile('SKILL.md');
    const style = readSkillFile('references/korean-interpretation-style.md');

    for (const policy of [skill, style]) {
      expect(policy).toContain('Progressive disclosure');
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
    expect(skill).toContain('`deep-traditional` mode, use supported');
    expect(style).toContain('default `deep-traditional` reading, also use supported');
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
    expect(interfaceMetadata).toContain('자연스럽게 풀이합니다');
    expect(interfaceMetadata).toContain('근거는 짧게 밝히며');
    expect(interfaceMetadata).toContain('조사와 어미를 갖춘 일상적인 한국어로 써 주세요');
  });

  test('requires complete Korean prose before a validated reading is rendered', () => {
    const skill = readSkillFile('SKILL.md');
    const style = readSkillFile('references/korean-interpretation-style.md');
    const inputReference = readSkillFile('references/input-and-runtime.md');

    expect(skill).toMatch(/make one Korean clarity pass on\s+every user-facing sentence/u);
    expect(skill).toMatch(
      /Never rewrite the validated\s+`result\.presentation\.markdown` afterward/u,
    );
    expect(style).toContain('Complete the sentence before making it elegant');
    expect(style).toContain('noun string, a label, or a connective ending');
    expect(inputReference).toContain('Each `text` value must\nbe complete Korean prose');
    expect(inputReference).toContain('read the finished\nKorean line aloud');
  });

  test('uses the detailed traditional 0–7 protocol by default', () => {
    const skill = readSkillFile('SKILL.md');
    const inputReference = readSkillFile('references/input-and-runtime.md');
    const deepProtocol = readSkillFile('references/deep-traditional-analysis.md');

    expect(skill).toContain('`request.inferenceDepth` to `deep-traditional`');
    expect(inputReference).toContain('`deep-traditional` (default)');
    expect(inputReference).toContain('at most 60 Saju years');
    for (const stage of ['0', '0.5', '5.1', '5.2', '6.1', '6.2', '7']) {
      expect(deepProtocol).toMatch(new RegExp(`\\| ${stage}\\s+\\|`, 'u'));
    }
    expect(deepProtocol).toContain('무엇에 끌려 먼저 가까워지는지');
    expect(deepProtocol).toContain('어떤 제안이 그 강점을 쓰게 해 장기적으로 맞는지');
  });

  test('requires the validated deterministic presentation for a broad reading', () => {
    const skill = readSkillFile('SKILL.md');
    const inputReference = readSkillFile('references/input-and-runtime.md');

    expect(skill).toContain('Set `request.readingMode` explicitly');
    expect(skill).toContain('For `readingMode: "broad"`, the v3 `presentationDraft` is required');
    expect(skill).toContain('output `result.presentation.markdown` exactly');
    expect(skill).toMatch(/Do not\s+rephrase it/u);
    expect(inputReference).toMatch(/ten or\s+more distinct validated paragraphs/u);
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
    expect(inputReference).toContain('validation-only protocol filler');
    expect(inputReference).toMatch(/show\s+that Markdown as-is/u);
  });

  test('routes two-person compatibility through one validated pair protocol', () => {
    const skill = readSkillFile('SKILL.md');
    const inputReference = readSkillFile('references/input-and-runtime.md');

    for (const policy of [skill, inputReference]) {
      expect(policy).toContain('Two-person compatibility');
      expect(policy).toContain('A→B');
      expect(policy).toContain('B→A');
      expect(policy).toContain('`result.presentation.markdown` exactly');
    }
    expect(skill).toContain('`prepare-compatibility`');
    expect(skill).toContain('`validate-compatibility`');
    expect(inputReference).toContain('"command": "prepare-compatibility"');
    expect(inputReference).toContain('"command": "validate-compatibility"');
    expect(skill).toMatch(
      /never place the second\s+person's birth data only inside the first person's `question`/u,
    );
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

    expect(portable.version).toBe('0.7.0');
    expect(codex.version).toBe(portable.version);
    expect(claude.version).toBe(portable.version);
    expect(versions.plugin).toBe(portable.version);
    expect(versions.skills['oh-my-saju']).toBe(portable.version);
  });
});
