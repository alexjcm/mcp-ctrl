import {
  cancel,
  confirm,
  intro,
  isCancel,
  outro,
  select,
  text,
} from "@clack/prompts";

import type { MCPServer, ToolName } from "../types/mcp.types.js";
import { TOOL_NAMES, formatToolName } from "../utils/tool-names.js";
import { formatArgs, formatEnv, parseArgsInput, parseEnvInput } from "./parsers.js";

export class PromptCancelledError extends Error {
  constructor() {
    super("operation cancelled");
  }
}

export function showIntro(message: string): void {
  intro(message);
}

export function showOutro(message: string): void {
  outro(message);
}

export function showCancel(message: string): never {
  cancel(message);
  throw new PromptCancelledError();
}

export async function promptTool(message: string, initialValue?: ToolName): Promise<ToolName> {
  const result = await select<ToolName>({
    message,
    ...(initialValue ? { initialValue } : {}),
    options: TOOL_NAMES.map((tool) => ({
      value: tool,
      label: formatToolName(tool),
    })),
  });

  return requirePromptValue(result);
}

export async function promptServerName(
  message: string,
  initialValue = "",
): Promise<string> {
  const result = await text({
    message,
    initialValue,
    validate(value) {
      const nextValue = value ?? "";
      return nextValue.trim() === "" ? "name is required" : undefined;
    },
  });

  return requirePromptValue(result).trim();
}

export async function promptServerCommand(
  message: string,
  initialValue = "",
): Promise<string> {
  const result = await text({
    message,
    initialValue,
    validate(value) {
      const nextValue = value ?? "";
      return nextValue.trim() === "" ? "command is required" : undefined;
    },
  });

  return requirePromptValue(result).trim();
}

export async function promptServerArgs(initialValue: string): Promise<string[]> {
  const result = await text({
    message: "Args",
    initialValue,
    placeholder: '-y "@modelcontextprotocol/server-filesystem"',
  });

  return parseArgsInput(requirePromptValue(result));
}

export async function promptServerEnv(initialValue: string): Promise<Record<string, string>> {
  const result = await text({
    message: "Env",
    initialValue,
    placeholder: "KEY=VALUE, OTHER=value",
    validate(value) {
      try {
        parseEnvInput(value ?? "");
        return undefined;
      } catch (error) {
        return error instanceof Error ? error.message : "invalid env format";
      }
    },
  });

  return parseEnvInput(requirePromptValue(result));
}

export async function promptServerDefinition(
  initial?: Partial<MCPServer>,
): Promise<MCPServer> {
  const name = await promptServerName("Name", initial?.name ?? "");
  const command = await promptServerCommand("Command", initial?.command ?? "");
  const args = await promptServerArgs(formatArgs(initial?.args ?? []));
  const env = await promptServerEnv(formatEnv(initial?.env ?? {}));

  return {
    name,
    command,
    args,
    env,
  };
}

export async function promptServerSelection(
  message: string,
  servers: MCPServer[],
  initialName?: string,
): Promise<string> {
  const result = await select<string>({
    message,
    ...(initialName ? { initialValue: initialName } : {}),
    options: servers.map((server) => ({
      value: server.name,
      label: server.name,
      hint: `${server.command}${server.args.length > 0 ? ` ${server.args.join(" ")}` : ""}`,
    })),
  });

  return requirePromptValue(result);
}

export async function promptMode(): Promise<"copy-new" | "overwrite"> {
  const result = await select<"copy-new" | "overwrite">({
    message: "Sync mode",
    initialValue: "copy-new",
    options: [
      {
        value: "copy-new",
        label: "copy-new",
        hint: "adds new servers only",
      },
      {
        value: "overwrite",
        label: "overwrite",
        hint: "overwrites conflicts",
      },
    ],
  });

  return requirePromptValue(result);
}

export async function promptConfirmation(message: string, initialValue = true): Promise<boolean> {
  const result = await confirm({
    message,
    initialValue,
  });

  return requirePromptValue(result);
}

function requirePromptValue<T>(value: T | symbol): T {
  if (isCancel(value)) {
    showCancel("Operation cancelled.");
  }

  return value;
}
