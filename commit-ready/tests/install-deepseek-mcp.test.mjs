import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  DELEGATION_START,
  installDeepseekMcp,
  upsertManagedBlock,
} from '../scripts/install-deepseek-mcp.mjs';

test('upsertManagedBlock preserves surrounding content and replaces the managed block', () => {
  const existing = ['alpha', DELEGATION_START, 'old', '<!-- deepseek-mcp-delegation:end -->', 'omega'].join('\n');
  const next = upsertManagedBlock(existing, ['<!-- deepseek-mcp-delegation:start -->', 'new', '<!-- deepseek-mcp-delegation:end -->'].join('\n'));
  assert.match(next, /alpha/);
  assert.match(next, /new/);
  assert.match(next, /omega/);
});

test('default install writes the managed block into all target files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teamagent-install-'));
  const home = await mkdtemp(join(tmpdir(), 'teamagent-home-'));

  try {
    const result = await installDeepseekMcp({ workspaceRoot: root, codexHomeDir: home, dryRun: false });
    assert.equal(result.targets.length, 5);

    const expected = [
      join(root, 'AGENTS.md'),
      join(root, 'CLAUDE.md'),
      join(root, '.github', 'copilot-instructions.md'),
      join(root, '.cursor', 'rules', 'deepseek-harness.mdc'),
      join(home, '.codex', 'AGENTS.md'),
    ];

    for (const file of expected) {
      const content = await readFile(file, 'utf8');
      assert.match(content, /DeepSeek MCP Delegation Protocol/);
      assert.match(content, /Effective Harness Spec/);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  }
});

test('custom SOP is appended under Effective Harness Spec without removing hard rules', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teamagent-custom-'));
  const home = await mkdtemp(join(tmpdir(), 'teamagent-custom-home-'));

  try {
    await installDeepseekMcp({
      workspaceRoot: root,
      codexHomeDir: home,
      customSpec: 'Use project-specific review checkpoints and keep staged outputs small.',
    });

    const content = await readFile(join(root, 'AGENTS.md'), 'utf8');
    assert.match(content, /Do not call any `deepseek_agent\.\*` tool unless the user explicitly requests DeepSeek usage/);
    assert.match(content, /Use project-specific review checkpoints and keep staged outputs small\./);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  }
});
