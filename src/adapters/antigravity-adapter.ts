import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { MCPAdapterState, MCPServer } from "../types/mcp.types.js";
import { resolveConfigPath } from "../utils/paths.js";
import {
  detectEol,
  ensureTrailingNewline,
  isRecord,
  mergePortableServers,
  toPortableServer,
  type RawObject,
} from "./shared.js";

export class AntigravityAdapter {
  readonly tool = "antigravity";

  async read(path = resolveConfigPath(this.tool)): Promise<MCPAdapterState<RawObject>> {
    const rawText = await readTextIfExists(path);
    const document = rawText ? parseJsonDocument(rawText) : {};
    const entries = extractRecord(document, "mcpServers");
    const { compatibility, servers } = collectServers(entries);

    return {
      tool: this.tool,
      servers,
      rawPath: path,
      document,
      compatibility,
    };
  }

  async write(
    state: MCPAdapterState<RawObject>,
    servers: MCPServer[],
  ): Promise<MCPAdapterState<RawObject>> {
    const nextDocument = { ...state.document };
    const currentEntries = extractRecord(nextDocument, "mcpServers");
    const mergedEntries = mergePortableServers(currentEntries, state.compatibility, servers);
    nextDocument.mcpServers = mergedEntries;

    const eol = detectEolFromDocument(state.document);
    const text = ensureTrailingNewline(JSON.stringify(nextDocument, null, 2), eol);

    await mkdir(dirname(state.rawPath), { recursive: true });
    await writeFile(state.rawPath, text, "utf8");

    return this.read(state.rawPath);
  }
}

function parseJsonDocument(rawText: string): RawObject {
  const parsed = JSON.parse(rawText) as unknown;

  if (!isRecord(parsed)) {
    return {};
  }

  return parsed;
}

function extractRecord(document: RawObject, key: string): RawObject {
  const value = document[key];
  return isRecord(value) ? value : {};
}

function collectServers(entries: RawObject): Pick<MCPAdapterState, "servers" | "compatibility"> {
  const servers: MCPServer[] = [];
  const compatibility = [];

  for (const [name, value] of Object.entries(entries)) {
    const result = toPortableServer(name, value);
    compatibility.push(result.compatibility);

    if (result.server) {
      servers.push(result.server);
    }
  }

  return { servers, compatibility };
}

function detectEolFromDocument(document: RawObject): string {
  return "_eol" in document && typeof document._eol === "string" ? document._eol : "\n";
}

async function readTextIfExists(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined;
    }

    throw error;
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
