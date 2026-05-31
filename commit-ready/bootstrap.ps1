param(
  [string]$WorkspaceRoot = (Get-Location).Path,
  [string]$McpUrl = "http://127.0.0.1:8791/mcp",
  [string]$CustomSopFile = "",
  [string]$CustomSop = ""
)

$ErrorActionPreference = 'Stop'

$args = @(
  'scripts/install-deepseek-mcp-extended.mjs',
  '--workspace-root', $WorkspaceRoot,
  '--mcp-url', $McpUrl
)

if ($CustomSopFile) {
  $args += @('--custom-sop-file', $CustomSopFile)
}

if ($CustomSop) {
  $args += @('--custom-sop', $CustomSop)
}

node @args
