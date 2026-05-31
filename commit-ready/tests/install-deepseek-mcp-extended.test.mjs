import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  CLIENT_MCP_SERVER_NAME,
  installDeepseekMcp,
  upsertManagedBlock,
} from '../scripts/install-deepseek-mcp-extended.mjs';

test('upsertManagedBlock replaces the managed section and keeps surrounding text', () => {
  const existing = ['alpha', '<!-- deepseek-mcp-delegation:start -->', 'old', '<!-- deepseek-mcp-delegation:end -->', 'omega'].join('\n');
  const replacement = ['<!-- deepseek-mcp-delegation:start -->', 'new', '<!-- deepseek-mcp-delegation:end -->'].join('\n');
  const next = upsertManagedBlock(existing, replacement);
  assert.match(next, /alpha/);
  assert.match(next, /new/);
  assert.match(next, /omega/);
});

test('installDeepseekMcp writes workspace instructions and user-scope MCP configs', async () => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'teamagent-workspace-'));
  const codexHome = await mkdtemp(join(tmpdir(), 'teamagent-home-'));

  try {
    const result = await installDeepseekMcp({
      workspaceRoot,
      codexHomeDir: codexHome,
      mcpUrl: 'http://127.0.0.1:8791/mcp',
      mcpName: CLIENT_MCP_SERVER_NAME,
    });

    assert.ok(result.targets.length >= 10);

    const workspaceAgents = await readFile(join(workspaceRoot, 'AGENTS.md'), 'utf8');
    assert.match(workspaceAgents, /DeepSeek MCP Delegation Protocol/);
    assert.match(workspaceAgents, /Effective Harness Spec/);

    const codexConfig = await readFile(join(codexHome, '.codex', 'config.toml'), 'utf8');
    assert.match(codexConfig, /\[mcp_servers\.deepseek_agent\]/);
    assert.match(codexConfig, /http:\/\/127\.0\.0\.1:8791\/mcp/);

    const copilotConfig = await readFile(join(codexHome, '.copilot', 'mcp-config.json'), 'utf8');
    assert.match(copilotConfig, /"mcpServers"/);
    assert.match(copilotConfig, /deepseek_agent/);

    const cursorConfig = await readFile(join(codexHome, '.cursor', 'mcp.json'), 'utf8');
    assert.match(cursorConfig, /"mcpServers"/);
    assert.match(cursorConfig, /deepseek_agent/);

    const claudeBootstrap = await readFile(join(codexHome, '.claude', 'deepseek-mcp-bootstrap.md'), 'utf8');
    assert.match(claudeBootstrap, /claude mcp add --scope user --transport http deepseek_agent http:\/\/127\.0\.0\.1:8791\/mcp/);

    const claudeUserInstructions = await readFile(join(codexHome, '.claude', 'CLAUDE.md'), 'utf8');
    assert.match(claudeUserInstructions, /DeepSeek MCP Delegation Protocol/);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
    await rm(codexHome, { recursive: true, force: true });
  }
});

test('custom SOP text is appended without removing the hard gates', async () => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'teamagent-custom-workspace-'));
  const codexHome = await mkdtemp(join(tmpdir(), 'teamagent-custom-home-'));

  try {
    await installDeepseekMcp({
      workspaceRoot,
      codexHomeDir: codexHome,
      customSpec: 'Use project-specific review checkpoints and keep staged outputs small.',
      mcpUrl: 'http://127.0.0.1:8791/mcp',
    });

    const content = await readFile(join(workspaceRoot, 'AGENTS.md'), 'utf8');
    assert.match(content, /Do not call any `deepseek_agent\.\*` tool unless the user explicitly requests DeepSeek usage/);
    assert.match(content, /Use project-specific review checkpoints and keep staged outputs small\./);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
    await rm(codexHome, { recursive: true, force: true });
  }
});
