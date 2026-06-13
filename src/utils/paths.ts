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
      return join(homeDir, ".codex", "config.toml");
    case "antigravity":
      return join(homeDir, ".gemini", "config", "mcp_config.json");
    case "vscode":
      return resolveVSCodeSettingsPath(platform, homeDir, appDataDir);
  }
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
