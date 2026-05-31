# Portable DeepSeek MCP bundle

This folder is the portable install bundle for the DeepSeek MCP workflow.

## Prerequisites

- Node.js 18 or newer
- The target machine must already have the client apps installed if you want the installer to write their user-scope configs
- An MCP HTTP endpoint URL, for example `http://127.0.0.1:8791/mcp`

## One-command install

```bash
node scripts/install-deepseek-mcp-extended.mjs --workspace-root . --mcp-url http://127.0.0.1:8791/mcp
```

## With custom SOP

```bash
node scripts/install-deepseek-mcp-extended.mjs --workspace-root . --mcp-url http://127.0.0.1:8791/mcp --custom-sop-file ./my-sop.md
```

## What it installs

- Workspace instruction files:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `.github/copilot-instructions.md`
  - `.cursor/rules/deepseek-harness.mdc`
- User-scope instruction files:
  - `~/.codex/AGENTS.md`
  - `~/.claude/CLAUDE.md`
  - `~/.copilot/copilot-instructions.md`
- User-scope MCP configs:
  - `~/.codex/config.toml`
  - `~/.copilot/mcp-config.json`
  - `~/.cursor/mcp.json`
  - `~/.claude/deepseek-mcp-bootstrap.md`

## Notes

- The installer preserves the hard DeepSeek MCP delegation rules.
- Custom SOP/spec text is appended only under `## Effective Harness Spec`.
- If `claude` is not available, the installer writes a bootstrap note instead of failing hard.
