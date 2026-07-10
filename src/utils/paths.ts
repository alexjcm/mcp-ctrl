import { homedir } from "node:os";
import { join, win32 } from "node:path";

import type { ToolName } from "../types/mcp.types.js";

export interface PathResolverOptions {
  appDataDir?: string;
  homeDir?: string;
  platform?: NodeJS.Platform;
}

export function resolveConfigPath(
  tool: ToolName,
  options: PathResolverOptions = {},
): string {
  const platform = options.platform ?? process.platform;
  const homeDir = options.homeDir ?? homedir();
  const appDataDir =
    options.appDataDir ?? process.env.APPDATA ?? join(homeDir, "AppData", "Roaming");

  switch (tool) {
    case "codex":
      return joinForPlatform(platform, homeDir, ".codex", "config.toml");
    case "devin":
      return joinForPlatform(platform, homeDir, ".codeium", "windsurf", "mcp_config.json");
    case "codeium-jetbrains":
      return joinForPlatform(platform, homeDir, ".codeium", "mcp_config.json");
    case "antigravity":
      return joinForPlatform(platform, homeDir, ".gemini", "config", "mcp_config.json");
    case "claude-code":
      return joinForPlatform(platform, homeDir, ".claude.json");
    case "vscode":
      return resolveVSCodeSettingsPath(platform, homeDir, appDataDir);
  }
}

function joinForPlatform(platform: NodeJS.Platform, ...segments: string[]): string {
  return platform === "win32" ? win32.join(...segments) : join(...segments);
}

function resolveVSCodeSettingsPath(
  platform: NodeJS.Platform,
  homeDir: string,
  appDataDir: string,
): string {
  switch (platform) {
    case "win32":
      return win32.join(appDataDir, "Code", "User", "settings.json");
    case "darwin":
      return join(
        homeDir,
        "Library",
        "Application Support",
        "Code",
        "User",
        "settings.json",
      );
    default:
      return join(homeDir, ".config", "Code", "User", "settings.json");
  }
}
