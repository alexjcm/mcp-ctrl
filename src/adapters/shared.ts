import type {
  MCPServer,
  MCPServerCompatibility,
} from "../types/mcp.types.js";

export type RawObject = Record<string, unknown>;

const PORTABLE_KEYS = new Set(["command", "args", "env"]);

export function isRecord(value: unknown): value is RawObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function detectEol(text: string): string {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

export function ensureTrailingNewline(text: string, eol = "\n"): string {
  return text.endsWith(eol) ? text : `${text}${eol}`;
}

export function cloneRecord<T extends RawObject>(value: T): T {
  return { ...value };
}

export function toPortableServer(
  name: string,
  rawValue: unknown,
): { server?: MCPServer; compatibility: MCPServerCompatibility } {
  if (!isRecord(rawValue)) {
    return {
      compatibility: {
        name,
        portable: false,
        reasons: ["server entry is not an object"],
      },
    };
  }

  const reasons: string[] = [];
  const command = rawValue.command;
  const args = rawValue.args;
  const env = rawValue.env;

  if (typeof command !== "string" || command.trim() === "") {
    reasons.push("missing string command");
  }

  if (args !== undefined && !isStringArray(args)) {
    reasons.push("args must be an array of strings");
  }

  if (env !== undefined && !isStringRecord(env)) {
    reasons.push("env must be an object with string values");
  }

  const extraKeys = Object.keys(rawValue).filter((key) => !PORTABLE_KEYS.has(key));
  if (extraKeys.length > 0) {
    reasons.push(`additional fields will not be synced: ${extraKeys.join(", ")}`);
  }

  if (reasons.some((reason) => !reason.startsWith("additional fields"))) {
    return {
      compatibility: {
        name,
        portable: false,
        reasons,
      },
    };
  }

  return {
    server: {
      name,
      command: command as string,
      args: Array.isArray(args) ? [...args] : [],
      env: isRecord(env) ? { ...(env as Record<string, string>) } : {},
    },
    compatibility: {
      name,
      portable: true,
      reasons,
    },
  };
}

export function mergePortableServers(
  currentEntries: RawObject,
  compatibility: MCPServerCompatibility[],
  nextServers: MCPServer[],
): RawObject {
  const nextEntries = cloneRecord(currentEntries);
  const nextNames = new Set(nextServers.map((server) => server.name));

  for (const item of compatibility) {
    if (item.portable && !nextNames.has(item.name)) {
      delete nextEntries[item.name];
    }
  }

  for (const server of nextServers) {
    const currentValue = nextEntries[server.name];
    const base = isRecord(currentValue) ? cloneRecord(currentValue) : {};

    base.command = server.command;
    base.args = [...server.args];

    if (Object.keys(server.env).length > 0) {
      base.env = { ...server.env };
    } else {
      delete base.env;
    }

    nextEntries[server.name] = base;
  }

  return nextEntries;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}
