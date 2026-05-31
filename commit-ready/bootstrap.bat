@echo off
setlocal

set WORKSPACE_ROOT=%CD%
set MCP_URL=http://127.0.0.1:8791/mcp

if not "%~1"=="" set WORKSPACE_ROOT=%~1
if not "%~2"=="" set MCP_URL=%~2

node scripts\install-deepseek-mcp-extended.mjs --workspace-root "%WORKSPACE_ROOT%" --mcp-url "%MCP_URL%"
endlocal
