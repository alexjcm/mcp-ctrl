# mcp-ctrl

Interactive CLI for managing local `stdio` MCP configurations across `Codex`, `Devin`, `Codeium JetBrains (Windsurf Plugins)`, `Antigravity/Gemini`, and `VSCode`.

## Scope

`mcp-ctrl` edits only the portable subset:

- `name`
- `command`
- `args`
- `env`

Current limits:

- local `stdio` servers only
- no `Claude Code`
- no remote `http` servers
- no VSCode workspace settings
- no backup restore
- `add` and `edit` remain interactive-only

## Commands

```bash
mcp-ctrl list
mcp-ctrl add
mcp-ctrl edit [tool] [name]
mcp-ctrl remove [tool] [name] --yes
mcp-ctrl sync --from <tool> --to <tool> --mode <copy-new|overwrite> --yes
```

Example `list` output:

```txt
Codex
  config: /Users/you/.codex/config.toml
  - filesystem   npx -y @modelcontextprotocol/server-filesystem

Devin
  config: /Users/you/.codeium/windsurf/mcp_config.json
  (sin MCPs configurados)
```

## Local Testing

Recommended local flow:

```bash
npm install
npm run build
npm link
mcp-ctrl list
```

After source changes:

```bash
npm run build
```

Remove the global link:

```bash
npm unlink -g mcp-ctrl
```

## Non-Interactive Limits

- `list` is always allowed
- `remove` requires `<tool> <name> --yes`
- `sync` requires `--from`, `--to`, `--mode`, and `--yes`
- `add` and `edit` require a TTY

## Config Paths

| Tool | macOS / Linux | Windows |
|------|---------------|---------|
| `Codex` | `~/.codex/config.toml` | `~/.codex/config.toml` |
| `Devin` | `~/.codeium/windsurf/mcp_config.json` | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` |
| `Codeium JetBrains (Windsurf Plugins)` | `~/.codeium/mcp_config.json` | `%USERPROFILE%\.codeium\mcp_config.json` |
| `Antigravity/Gemini` | `~/.gemini/config/mcp_config.json` | `~/.gemini/config/mcp_config.json` |
| `VSCode` | `$HOME/Library/Application Support/Code/User/settings.json` on macOS, `$HOME/.config/Code/User/settings.json` on Linux | `%APPDATA%\Code\User\settings.json` |

## Sync And Safety

- only portable `stdio` entries are eligible for sync
- same `name` plus different `command`, `args`, or `env` is treated as a conflict
- `copy-new` adds only missing servers
- `overwrite` adds new servers and replaces conflicts with the source version
- entries outside MVP scope are skipped, not copied silently
- adapters preserve non-MCP content in the target file
- writes create a backup first
- configs are validated before write

## Environment Overrides

- `MCP_CTRL_CODEX_PATH`
- `MCP_CTRL_DEVIN_PATH`
- `MCP_CTRL_DEVIN_DESKTOP_PATH` (legacy alias)
- `MCP_CTRL_CODEIUM_JETBRAINS_PATH`
- `MCP_CTRL_ANTIGRAVITY_PATH`
- `MCP_CTRL_VSCODE_PATH`
- `MCP_CTRL_BACKUP_ROOT`

## Development

```bash
npm test
npm run typecheck
npm run build
```
