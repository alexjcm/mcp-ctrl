# mcp-ctrl

Interactive CLI for managing local `stdio` MCP configurations across `Codex`, `Devin`, `Codeium JetBrains (Windsurf Plugins)`, `Antigravity/Gemini`, and `VSCode`.

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

## Config Paths

| Tool | macOS/Linux | Windows |
|------|---------------|---------|
| `Codex` | `~/.codex/config.toml` | `~/.codex/config.toml` |
| `Devin` | `~/.codeium/windsurf/mcp_config.json` | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` |
| `Codeium JetBrains (Windsurf Plugins)` | `~/.codeium/mcp_config.json` | `%USERPROFILE%\.codeium\mcp_config.json` |
| `Antigravity/Gemini` | `~/.gemini/config/mcp_config.json` | `~/.gemini/config/mcp_config.json` |
| `VSCode` | `$HOME/Library/Application Support/Code/User/settings.json` on macOS, `$HOME/.config/Code/User/settings.json` on Linux | `%APPDATA%\Code\User\settings.json` |

# References

- https://modelcontextprotocol.io/docs/getting-started/intro