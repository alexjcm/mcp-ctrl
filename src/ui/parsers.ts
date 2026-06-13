import type { MCPServer } from "../types/mcp.types.js";

export function formatArgs(args: string[]): string {
  return args.map(quoteIfNeeded).join(" ");
}

export function parseArgsInput(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed === "") {
    return [];
  }

  const matches = trimmed.match(/"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|[^\s]+/g) ?? [];
  return matches.map(unquote);
}

export function formatEnv(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

export function parseEnvInput(value: string): Record<string, string> {
  const trimmed = value.trim();
  if (trimmed === "") {
    return {};
  }

  return Object.fromEntries(
    trimmed
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf("=");
        if (separator <= 0) {
          throw new Error(`invalid env entry "${entry}". Use KEY=VALUE.`);
        }

        const key = entry.slice(0, separator).trim();
        const rawValue = entry.slice(separator + 1).trim();

        if (!key) {
          throw new Error(`invalid env entry "${entry}". Use KEY=VALUE.`);
        }

        return [key, unquote(rawValue)];
      }),
  );
}

export function renderServerSummary(server: MCPServer): string {
  const args = server.args.length > 0 ? ` ${formatArgs(server.args)}` : "";
  return `${server.command}${args}`;
}

function quoteIfNeeded(value: string): string {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
