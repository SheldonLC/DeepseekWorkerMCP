# DeepSeek MCP npm installer

This repository now includes a standalone installer at `scripts/install-deepseek-mcp.mjs`.

## Direct usage

```bash
node scripts/install-deepseek-mcp.mjs --workspace-root .
```

## With custom SOP/spec text

```bash
node scripts/install-deepseek-mcp.mjs --workspace-root . --custom-sop-file ./my-sop.md
```

## What it installs

- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `.cursor/rules/deepseek-harness.mdc`
- `~/.codex/AGENTS.md`

The installer preserves the hard DeepSeek MCP delegation rules and appends any custom SOP/spec text only under `## Effective Harness Spec`.

## npm entrypoint

If `package.json` maps `teamagent-deepseek-install` to `scripts/install-deepseek-mcp.mjs`, the same installer can be invoked with the npm binary name.
