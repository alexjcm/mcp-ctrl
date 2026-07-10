import type { ToolName } from "../types/mcp.types.js";

export const TOOL_NAMES: ToolName[] = [
  "codex",
  "devin",
  "codeium-jetbrains",
  "antigravity",
  "claude-code",
  "vscode",
];

export function formatToolName(tool: ToolName): string {
  switch (tool) {
    case "codex":
      return "Codex";
    case "devin":
      return "Devin";
    case "codeium-jetbrains":
      return "Codeium JetBrains (Windsurf Plugins)";
    case "antigravity":
      return "Antigravity/Gemini";
    case "claude-code":
      return "Claude Code";
    case "vscode":
      return "VSCode";
  }
}
