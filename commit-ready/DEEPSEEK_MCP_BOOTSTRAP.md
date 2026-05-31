# DeepSeek MCP bootstrap

Use the extended installer when you want both the instruction files and the client-side MCP config written in one pass.

```bash
node scripts/install-deepseek-mcp-extended.mjs --workspace-root . --mcp-url http://127.0.0.1:8791/mcp
```

What it writes:

- Workspace instruction files:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `.github/copilot-instructions.md`
  - `.cursor/rules/deepseek-harness.mdc`
- User-scope instruction files:
  - `~/.codex/AGENTS.md`
  - `~/.claude/CLAUDE.md`
  - `~/.copilot/copilot-instructions.md`
- User-scope MCP config:
  - `~/.codex/config.toml`
  - `~/.copilot/mcp-config.json`
  - `~/.cursor/mcp.json`
  - `~/.claude/deepseek-mcp-bootstrap.md`

The `--custom-sop` and `--custom-sop-file` flags append your project-specific SOP under `## Effective Harness Spec` while preserving the hard DeepSeek delegation rules.
