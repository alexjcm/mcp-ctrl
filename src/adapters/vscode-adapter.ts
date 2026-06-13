import { readFile } from "node:fs/promises";

import {
  applyEdits,
  modify,
  parse,
  type ModificationOptions,
} from "jsonc-parser";

import { BackupService } from "../services/backup-service.js";
import type { MCPAdapterState, MCPServer } from "../types/mcp.types.js";
import { resolveConfigPath } from "../utils/paths.js";
import {
  detectEol,
  isRecord,
  mergePortableServers,
  toPortableServer,
  type RawObject,
} from "./shared.js";

export class VSCodeAdapter {
  readonly tool = "vscode";
  private readonly backupService: BackupService;

  constructor(backupService = new BackupService()) {
    this.backupService = backupService;
  }

  async read(path = resolveConfigPath(this.tool)): Promise<MCPAdapterState<string>> {
    const rawText = (await readTextIfExists(path)) ?? "{}\n";
    const document = parse(rawText) as unknown;
    const root = isRecord(document) ? document : {};
    const entries = extractRecord(root, "mcp.servers");
    const { compatibility, servers } = collectServers(entries);

    return {
      tool: this.tool,
      servers,
      rawPath: path,
      document: rawText,
      compatibility,
    };
  }

  async write(
    state: MCPAdapterState<string>,
    servers: MCPServer[],
  ): Promise<MCPAdapterState<string>> {
    const currentRoot = parse(state.document) as unknown;
    const root = isRecord(currentRoot) ? currentRoot : {};
    const currentEntries = extractRecord(root, "mcp.servers");
    const mergedEntries = mergePortableServers(currentEntries, state.compatibility, servers);
    const eol = detectEol(state.document);

    const edits = modify(state.document, ["mcp.servers"], mergedEntries, formattingOptions(eol));
    const nextDocument = applyEdits(state.document, edits);

    await this.backupService.writeWithBackup({
      tool: this.tool,
      targetPath: state.rawPath,
      content: nextDocument,
    });

    return this.read(state.rawPath);
  }
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

function formattingOptions(eol: string): ModificationOptions {
  return {
    formattingOptions: {
      eol,
      insertSpaces: true,
      tabSize: 4,
    },
  };
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
