import { readFile } from "node:fs/promises";

import * as TOML from "@iarna/toml";

import { BackupService } from "../services/backup-service.js";
import type { MCPAdapterState, MCPServer } from "../types/mcp.types.js";
import { resolveConfigPath } from "../utils/paths.js";
import {
  ensureTrailingNewline,
  isRecord,
  mergePortableServers,
  toPortableServer,
  type RawObject,
} from "./shared.js";

export class CodexAdapter {
  readonly tool = "codex";
  private readonly backupService: BackupService;

  constructor(backupService = new BackupService()) {
    this.backupService = backupService;
  }

  async read(path = resolveConfigPath(this.tool)): Promise<MCPAdapterState<RawObject>> {
    const rawText = await readTextIfExists(path);
    const document = rawText ? parseTomlDocument(rawText) : {};
    const entries = extractRecord(document, "mcp_servers");
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
    const currentEntries = extractRecord(nextDocument, "mcp_servers");
    const mergedEntries = mergePortableServers(currentEntries, state.compatibility, servers);
    nextDocument.mcp_servers = mergedEntries;

    const text = ensureTrailingNewline(
      TOML.stringify(nextDocument as TOML.JsonMap),
      "\n",
    );
    await this.backupService.writeWithBackup({
      tool: this.tool,
      targetPath: state.rawPath,
      content: text,
    });

    return this.read(state.rawPath);
  }
}

function parseTomlDocument(rawText: string): RawObject {
  const parsed = TOML.parse(rawText);

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
