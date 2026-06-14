#!/usr/bin/env node

import { Command } from "commander";

import { MCPRegistry } from "./services/mcp-registry.js";
import { SyncService } from "./services/sync-service.js";
import type { ToolName } from "./types/mcp.types.js";
import { TOOL_NAMES, formatToolName } from "./utils/tool-names.js";
import { canPrompt, writeStderr, writeStdout } from "./utils/terminal.js";
import {
  promptConfirmation,
  promptMode,
  promptServerDefinition,
  promptServerSelection,
  promptTool,
  PromptCancelledError,
  showIntro,
  showOutro,
} from "./ui/prompts.js";
import {
  renderConfigList,
  renderSyncPlan,
  renderSyncWarnings,
} from "./ui/renderers.js";

const registry = new MCPRegistry({
  paths: compactToolPaths({
    codex: process.env.MCP_CTRL_CODEX_PATH,
    devin: process.env.MCP_CTRL_DEVIN_PATH ?? process.env.MCP_CTRL_DEVIN_DESKTOP_PATH,
    "codeium-jetbrains": process.env.MCP_CTRL_CODEIUM_JETBRAINS_PATH,
    antigravity: process.env.MCP_CTRL_ANTIGRAVITY_PATH,
    vscode: process.env.MCP_CTRL_VSCODE_PATH,
  }),
});
const syncService = new SyncService({ registry });

const program = new Command();

program
  .name("mcp-ctrl")
  .description("Interactive CLI for managing local stdio MCP configurations")
  .version("0.1.0")
  .showHelpAfterError();

program.action(() => {
  program.outputHelp();
});

program
  .command("list")
  .description("List configured MCP servers")
  .action(wrapAction(async () => {
    const configs = await registry.list();
    writeStdout(renderConfigList(configs));
  }));

program
  .command("add")
  .description("Add a portable MCP server")
  .action(
    wrapAction(async () => {
      requireInteractive("add");

      showIntro("mcp-ctrl add");
      const tool = await promptTool("Tool");
      const server = await promptServerDefinition();
      const confirmed = await promptConfirmation(
        `Agregar "${server.name}" en ${formatToolName(tool)}?`,
      );

      if (!confirmed) {
        throw new PromptCancelledError();
      }

      await registry.add(tool, server);
      showOutro(`Servidor "${server.name}" agregado en ${formatToolName(tool)}.`);
    }),
  );

program
  .command("edit")
  .description("Edit a portable MCP server")
  .argument("[tool]", "tool name")
  .argument("[name]", "server name")
  .action(
    wrapAction(async (toolArg?: string, nameArg?: string) => {
      requireInteractive("edit");

      showIntro("mcp-ctrl edit");
      const tool = toolArg ? parseToolName(toolArg) : await promptTool("Tool");
      const state = await registry.readState(tool);

      if (state.servers.length === 0) {
        throw new Error(`no portable servers found in ${formatToolName(tool)}`);
      }

      const name =
        nameArg ??
        (await promptServerSelection("Servidor", state.servers));
      const current = state.servers.find((server) => server.name === name);

      if (!current) {
        throw new Error(`server "${name}" was not found in ${tool}`);
      }

      const next = await promptServerDefinition(current);
      const confirmed = await promptConfirmation(
        `Guardar cambios de "${name}" en ${formatToolName(tool)}?`,
      );

      if (!confirmed) {
        throw new PromptCancelledError();
      }

      await registry.update(tool, name, next);
      showOutro(`Servidor "${name}" actualizado en ${formatToolName(tool)}.`);
    }),
  );

program
  .command("remove")
  .description("Remove a portable MCP server")
  .argument("[tool]", "tool name")
  .argument("[name]", "server name")
  .option("-y, --yes", "skip confirmation")
  .action(
    wrapAction(async (toolArg?: string, nameArg?: string, options?: { yes?: boolean }) => {
      const interactive = canPrompt();
      let tool = toolArg ? parseToolName(toolArg) : undefined;
      let name = nameArg;

      if (!interactive && (!tool || !name || !options?.yes)) {
        throw new Error('remove without TTY requires "<tool> <name> --yes"');
      }

      if (interactive) {
        showIntro("mcp-ctrl remove");
      }

      tool = tool ?? (await promptTool("Tool"));
      const state = await registry.readState(tool);

      if (state.servers.length === 0) {
        throw new Error(`no portable servers found in ${formatToolName(tool)}`);
      }

      name = name ?? (await promptServerSelection("Servidor", state.servers));

      if (!options?.yes) {
        const confirmed = await promptConfirmation(
          `Eliminar "${name}" de ${formatToolName(tool)}?`,
          false,
        );

        if (!confirmed) {
          throw new PromptCancelledError();
        }
      }

      await registry.remove(tool, name);

      if (interactive) {
        showOutro(`Servidor "${name}" eliminado de ${formatToolName(tool)}.`);
      } else {
        writeStdout(`Removed "${name}" from ${tool}.`);
      }
    }),
  );

program
  .command("sync")
  .description("Sync portable MCP servers between tools")
  .option("--from <tool>", "source tool")
  .option("--to <tool>", "destination tool")
  .option("--mode <mode>", "sync mode: copy-new | overwrite")
  .option("-y, --yes", "skip confirmation")
  .action(
    wrapAction(
      async (options: {
        from?: string;
        mode?: string;
        to?: string;
        yes?: boolean;
      }) => {
        const interactive = canPrompt();
        let sourceTool = options.from ? parseToolName(options.from) : undefined;
        let destinationTool = options.to ? parseToolName(options.to) : undefined;
        let mode = options.mode ? parseMode(options.mode) : undefined;

        if (!interactive && (!sourceTool || !destinationTool || !mode || !options.yes)) {
          throw new Error('sync without TTY requires "--from <tool> --to <tool> --mode <mode> --yes"');
        }

        if (interactive) {
          showIntro("mcp-ctrl sync");
        }

        sourceTool = sourceTool ?? (await promptTool("Origen"));
        destinationTool =
          destinationTool ?? (await promptTool("Destino", alternateTool(sourceTool)));

        if (sourceTool === destinationTool) {
          throw new Error("source and destination must be different tools");
        }

        mode = mode ?? (await promptMode());

        const plan = await syncService.createPlan(sourceTool, destinationTool);
        writeStdout(renderSyncPlan(plan));

        for (const warning of renderSyncWarnings(plan)) {
          writeStderr(warning);
        }

        if (!options.yes) {
          const confirmed = await promptConfirmation(
            `Aplicar sync ${mode} de ${formatToolName(sourceTool)} hacia ${formatToolName(destinationTool)}?`,
          );

          if (!confirmed) {
            throw new PromptCancelledError();
          }
        }

        await syncService.apply(sourceTool, destinationTool, mode);

        if (interactive) {
          showOutro("Sync completado.");
        } else {
          writeStdout("Sync completed.");
        }
      },
    ),
  );

void program.parseAsync(process.argv).catch((error: unknown) => {
  if (error instanceof PromptCancelledError) {
    process.exitCode = 0;
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  writeStderr(`Error: ${message}`);

  process.exitCode = 1;
});

function wrapAction<TArgs extends unknown[]>(
  action: (...args: TArgs) => Promise<void>,
): (...args: TArgs) => Promise<void> {
  return async (...args: TArgs) => {
    await action(...args);
  };
}

function parseToolName(value: string): ToolName {
  const normalized = normalizeToolAlias(value);

  if (TOOL_NAMES.includes(normalized)) {
    return normalized;
  }

  throw new Error(`unknown tool "${value}". Use one of: ${TOOL_NAMES.join(", ")}`);
}

function parseMode(value: string): "copy-new" | "overwrite" {
  if (value === "copy-new" || value === "overwrite") {
    return value;
  }

  throw new Error('invalid mode. Use "copy-new" or "overwrite"');
}

function requireInteractive(command: string): void {
  if (!canPrompt()) {
    throw new Error(`${command} is interactive-only in the MVP and requires a TTY`);
  }
}

function alternateTool(source: ToolName): ToolName {
  return TOOL_NAMES.find((tool) => tool !== source) ?? "vscode";
}

function compactToolPaths(
  paths: Partial<Record<ToolName, string | undefined>>,
): Partial<Record<ToolName, string>> {
  return Object.fromEntries(
    Object.entries(paths).filter(([, value]) => typeof value === "string" && value !== ""),
  ) as Partial<Record<ToolName, string>>;
}

function normalizeToolAlias(value: string): ToolName {
  switch (value) {
    case "devin":
    case "devin-desktop":
      return "devin";
    case "codeium":
    case "codeium-jetbrains":
    case "windsurf-jetbrains":
      return "codeium-jetbrains";
    default:
      return value as ToolName;
  }
}
