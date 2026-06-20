import { homedir } from "node:os";

import type {
  MCPConfig,
  MCPServer,
  SyncPlan,
  ToolName,
  ValidationResult,
} from "../types/mcp.types.js";
import { formatToolName } from "../utils/tool-names.js";
import {
  boldIfInteractiveOutput,
  cyanBoldIfInteractiveOutput,
  dimIfInteractiveOutput,
  greenIfInteractiveOutput,
  hasInteractiveOutput,
  redIfInteractiveOutput,
  yellowIfInteractiveOutput,
} from "../utils/terminal.js";
import { renderServerSummary } from "./parsers.js";

export interface ServerCheckResult {
  serverName: string;
  result: ValidationResult;
}

export interface ToolCheckResult {
  tool: ToolName;
  rawPath: string;
  servers: ServerCheckResult[];
}

export function renderConfigList(configs: MCPConfig[]): string {
  const home = homedir();
  return configs
    .map((config) => {
      const displayPath = config.rawPath.replace(home, "~");
      const lines = [
        cyanBoldIfInteractiveOutput(formatToolName(config.tool)),
        dimIfInteractiveOutput(`  config: ${displayPath}`),
      ];

      if (config.servers.length === 0) {
        lines.push(dimIfInteractiveOutput("  (no MCPs configured)"));
      } else {
        const bullet = hasInteractiveOutput() ? "\u001B[36m●\u001B[0m" : "-";
        for (const server of config.servers) {
          const summary = renderServerSummary(server);
          const cleanedSummary = summary.replace(home, "~");
          const indentSize = 16;
          const wrappedSummary = hasInteractiveOutput()
            ? wrapText(cleanedSummary, indentSize)
            : cleanedSummary;
          const formattedSummary = dimIfInteractiveOutput(wrappedSummary);
          const formattedName = boldIfInteractiveOutput(server.name.padEnd(12));
          lines.push(`  ${bullet} ${formattedName} ${formattedSummary}`);
        }
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

export function wrapText(text: string, indent: number): string {
  const cols = process.stdout.columns || 80;
  const availableWidth = cols - indent;

  if (availableWidth <= 10 || text.length <= availableWidth) {
    return text;
  }

  const lines: string[] = [];
  const words = text.split(" ");
  let currentLine = "";

  for (const word of words) {
    if (word.length > availableWidth) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      lines.push(word);
    } else if (currentLine.length + word.length + (currentLine ? 1 : 0) <= availableWidth) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join("\n" + " ".repeat(indent));
}

export function renderCheckResults(toolResults: ToolCheckResult[]): string {
  const home = homedir();
  let totalOk = 0;
  let totalWarnings = 0;
  let totalErrors = 0;

  const sections = toolResults.map((toolResult) => {
    const displayPath = toolResult.rawPath.replace(home, "~");
    const lines = [
      cyanBoldIfInteractiveOutput(formatToolName(toolResult.tool)),
      dimIfInteractiveOutput(`  config: ${displayPath}`),
    ];

    if (toolResult.servers.length === 0) {
      lines.push(dimIfInteractiveOutput("  (no servers to check)"));
      return lines.join("\n");
    }

    for (const { serverName, result } of toolResult.servers) {
      const hasErrors = result.errors.length > 0;
      const hasWarnings = result.warnings.length > 0;

      if (hasErrors) {
        totalErrors++;
        lines.push(`  ${redIfInteractiveOutput("✖")} ${boldIfInteractiveOutput(serverName)}`);
        for (const issue of result.errors) {
          lines.push(dimIfInteractiveOutput(`       ${issue.message}`));
        }
      } else if (hasWarnings) {
        totalWarnings++;
        lines.push(`  ${yellowIfInteractiveOutput("⚠")} ${boldIfInteractiveOutput(serverName)}`);
        for (const issue of result.warnings) {
          lines.push(dimIfInteractiveOutput(`      ${issue.message}`));
        }
      } else {
        totalOk++;
        lines.push(`  ${greenIfInteractiveOutput("✔")} ${boldIfInteractiveOutput(serverName)}`);
      }
    }

    return lines.join("\n");
  });

  const summaryParts = [
    greenIfInteractiveOutput(`${totalOk} ok`),
    yellowIfInteractiveOutput(`${totalWarnings} ${totalWarnings === 1 ? "warning" : "warnings"}`),
    redIfInteractiveOutput(`${totalErrors} ${totalErrors === 1 ? "error" : "errors"}`),
  ];

  sections.push(`\nSummary: ${summaryParts.join(" · ")}`);
  return sections.join("\n\n");
}

export function renderSyncPlan(plan: SyncPlan): string {
  const lines = [
    `Source: ${formatToolName(plan.sourceTool)}`,
    `Destination: ${formatToolName(plan.destinationTool)}`,
    "",
    "New in source:",
    ...renderServerNames(plan.onlyInSource),
    "",
    "Only in destination:",
    ...renderServerNames(plan.onlyInDestination),
    "",
    "Conflicts:",
    ...(plan.conflicts.length === 0
      ? ["  (no conflicts)"]
      : plan.conflicts.map(
          (conflict) =>
            `  - ${conflict.name}: ${renderServerSummary(conflict.destination)} -> ${renderServerSummary(conflict.source)}`,
        )),
  ];

  return lines.join("\n");
}

export function renderSyncWarnings(plan: SyncPlan): string[] {
  const messages: string[] = [];

  for (const item of plan.skipped) {
    messages.push(`skipped "${item.name}": ${item.reasons.join("; ")}`);
  }

  for (const item of plan.warnings) {
    messages.push(`warning "${item.name}": ${item.reasons.join("; ")}`);
  }

  return messages;
}

function renderServerNames(servers: MCPServer[]): string[] {
  return servers.length === 0
    ? ["  (none)"]
    : servers.map((server) => `  - ${server.name}`);
}
