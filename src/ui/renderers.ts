import type {
  BackupEntry,
  MCPConfig,
  MCPServer,
  SyncPlan,
  ToolName,
} from "../types/mcp.types.js";
import { formatToolName } from "../utils/tool-names.js";
import { renderServerSummary } from "./parsers.js";

export function renderConfigList(configs: MCPConfig[]): string {
  return configs
    .map((config) => {
      const lines = [formatToolName(config.tool)];

      if (config.servers.length === 0) {
        lines.push("  (sin MCPs configurados)");
      } else {
        for (const server of config.servers) {
          lines.push(`  - ${server.name.padEnd(12)} ${renderServerSummary(server)}`);
        }
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

export function renderBackupList(tool: ToolName, backups: BackupEntry[]): string {
  const lines = [formatToolName(tool)];

  if (backups.length === 0) {
    lines.push("  (sin backups)");
    return lines.join("\n");
  }

  for (const backup of backups) {
    lines.push(
      `  - ${backup.fileName}  ${backup.size} bytes  ${backup.createdAt.toISOString()}`,
    );
  }

  return lines.join("\n");
}

export function renderSyncPlan(plan: SyncPlan): string {
  const lines = [
    `Origen: ${formatToolName(plan.sourceTool)}`,
    `Destino: ${formatToolName(plan.destinationTool)}`,
    "",
    "Nuevos en origen:",
    ...renderServerNames(plan.onlyInSource),
    "",
    "Solo en destino:",
    ...renderServerNames(plan.onlyInDestination),
    "",
    "Conflictos:",
    ...(plan.conflicts.length === 0
      ? ["  (sin conflictos)"]
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
    messages.push(`omitido "${item.name}": ${item.reasons.join("; ")}`);
  }

  for (const item of plan.warnings) {
    messages.push(`advertencia "${item.name}": ${item.reasons.join("; ")}`);
  }

  return messages;
}

function renderServerNames(servers: MCPServer[]): string[] {
  return servers.length === 0
    ? ["  (ninguno)"]
    : servers.map((server) => `  - ${server.name}`);
}
