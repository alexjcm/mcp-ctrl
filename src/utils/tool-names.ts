import type { ToolName } from "../types/mcp.types.js";

export const TOOL_NAMES: ToolName[] = ["codex", "antigravity", "vscode"];

export function formatToolName(tool: ToolName): string {
  switch (tool) {
    case "codex":
      return "Codex";
    case "antigravity":
      return "Antigravity/Gemini";
    case "vscode":
      return "VSCode";
  }
}
