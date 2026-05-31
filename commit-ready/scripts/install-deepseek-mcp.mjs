#!/usr/bin/env node

import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const DELEGATION_START = '<!-- deepseek-mcp-delegation:start -->';
const DELEGATION_END = '<!-- deepseek-mcp-delegation:end -->';

const DEFAULT_HARNESS_SPEC = `### Default Harness Spec

Objective:
Deliver the requested change with minimal safe scope, explicit contracts, skeptical evaluation, and verified integration while preserving project constraints.

Design principles:
- Use the simplest harness that fits the task.
- Separate generation from evaluation so the same worker is not the only judge of correctness.
- Convert subjective goals into concrete criteria before implementation.
- Prefer structured artifacts over implicit chat state.
- Keep worker scopes independent and low-interference; the Main Agent is the coordinator.

Main Agent responsibilities:
- Clarify requirements, scope, acceptance criteria, and constraints with the user.
- Split work into bounded tasks and assign the right worker to the right task.
- Review staged outputs and request revisions until the result is acceptable.
- Apply final changes only after approval.

Worker rules:
- deepseek-coder handles implementation drafts and staged file output only when file-producing work is requested.
- deepseek-tester handles test matrices, edge cases, and staged test output only when test-producing work is requested.
- deepseek-reviewer handles review reports only after Main Agent approval.
- Workers do not bypass review gates or write final output directly without the Main Agent approval loop.

Verification:
- Prefer deterministic local checks.
- Verify format, unit tests, CLI smoke tests, and any project-specific acceptance criteria before completion.`;

const HARD_RULES = `## DeepSeek MCP Delegation Protocol

- Do not call any \`deepseek_agent.*\` tool unless the user explicitly requests DeepSeek usage in this conversation or the workspace explicitly mandates it.
- For implementation, test, review, or document production tasks, the relevant worker must return staged output in the agreed schema or file payload.
- The Main Agent reviews staged output, requests revision if needed, and applies final changes only after approval.
- Custom SOP/spec text, when provided, must be preserved under \`## Effective Harness Spec\` and must not replace these hard rules.

## Effective Harness Spec`;

function parseArgs(argv) {
  const result = {
    workspaceRoot: process.cwd(),
    codexHomeDir: homedir(),
    customSpec: '',
    customSpecFile: '',
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--workspace-root' && argv[i + 1]) {
      result.workspaceRoot = resolve(argv[++i]);
    } else if (arg === '--codex-home' && argv[i + 1]) {
      result.codexHomeDir = resolve(argv[++i]);
    } else if (arg === '--custom-sop-file' && argv[i + 1]) {
      result.customSpecFile = resolve(argv[++i]);
    } else if (arg === '--custom-sop' && argv[i + 1]) {
      result.customSpec = argv[++i];
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    }
  }

  return result;
}

function buildEffectiveHarnessSpec(customSpec) {
  const sections = [DEFAULT_HARNESS_SPEC];
  if (customSpec && customSpec.trim()) {
    sections.push('', '### Custom SOP / Workspace Spec', '', customSpec.trimEnd());
  }
  return sections.join('\n');
}

function buildInstructionFile(customSpec) {
  return [
    DELEGATION_START,
    '',
    HARD_RULES,
    '',
    buildEffectiveHarnessSpec(customSpec),
    '',
    DELEGATION_END,
    '',
  ].join('\n');
}

function upsertManagedBlock(existing, replacement) {
  const startIndex = existing.indexOf(DELEGATION_START);
  const endIndex = existing.indexOf(DELEGATION_END);

  if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
    const before = existing.slice(0, startIndex).trimEnd();
    const after = existing.slice(endIndex + DELEGATION_END.length).trimStart();
    const pieces = [];
    if (before) pieces.push(before);
    pieces.push(replacement.trimEnd());
    if (after) pieces.push(after);
    return `${pieces.join('\n\n')}\n`;
  }

  const trimmed = existing.trimEnd();
  if (!trimmed) {
    return `${replacement.trimEnd()}\n`;
  }

  return `${trimmed}\n\n${replacement.trimEnd()}\n`;
}

async function writeInstructionFile(targetPath, replacement, dryRun) {
  const current = await readFile(targetPath, 'utf8').catch(() => '');
  const next = upsertManagedBlock(current, replacement);
  if (!dryRun) {
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, next, 'utf8');
  }
  return { path: targetPath, created: current.length === 0, bytes: next.length };
}

async function installDeepseekMcp(options = {}) {
  const workspaceRoot = resolve(options.workspaceRoot ?? process.cwd());
  const codexHomeDir = resolve(options.codexHomeDir ?? homedir());
  const customSpec = options.customSpec ?? '';
  const dryRun = Boolean(options.dryRun);
  const instructionText = buildInstructionFile(customSpec);

  const targets = [
    join(workspaceRoot, 'AGENTS.md'),
    join(workspaceRoot, 'CLAUDE.md'),
    join(workspaceRoot, '.github', 'copilot-instructions.md'),
    join(workspaceRoot, '.cursor', 'rules', 'deepseek-harness.mdc'),
    join(codexHomeDir, '.codex', 'AGENTS.md'),
  ];

  const results = [];
  for (const target of targets) {
    results.push(await writeInstructionFile(target, instructionText, dryRun));
  }

  return {
    workspaceRoot,
    codexHomeDir,
    dryRun,
    targets: results,
  };
}

function printHelp() {
  process.stdout.write(
    [
      'Usage:',
      '  teamagent-deepseek-install --workspace-root <path> [--custom-sop-file <path>] [--custom-sop <text>] [--codex-home <path>] [--dry-run]',
      '',
      'Writes DeepSeek MCP delegation instructions into AGENTS.md, CLAUDE.md, .github/copilot-instructions.md, .cursor/rules/deepseek-harness.mdc,',
      'and ~/.codex/AGENTS.md unless --codex-home overrides the target.',
    ].join('\n') + '\n',
  );
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return 0;
  }

  let customSpec = args.customSpec;
  if (!customSpec && args.customSpecFile) {
    customSpec = await readFile(args.customSpecFile, 'utf8');
  }

  const result = await installDeepseekMcp({
    workspaceRoot: args.workspaceRoot,
    codexHomeDir: args.codexHomeDir,
    customSpec,
    dryRun: args.dryRun,
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return 0;
}

const isMain = fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '');
if (isMain) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

export {
  DEFAULT_HARNESS_SPEC,
  DELEGATION_END,
  DELEGATION_START,
  HARD_RULES,
  buildEffectiveHarnessSpec,
  buildInstructionFile,
  installDeepseekMcp,
  parseArgs,
  upsertManagedBlock,
};
