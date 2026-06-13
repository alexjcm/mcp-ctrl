import { copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { randomBytes } from "node:crypto";

import type { BackupEntry, ToolName } from "../types/mcp.types.js";

const DEFAULT_MAX_BACKUPS = 10;

export interface BackupServiceOptions {
  backupRoot?: string;
  maxBackupsPerTool?: number;
}

export interface WriteWithBackupInput {
  tool: ToolName;
  targetPath: string;
  content: string | Uint8Array;
  encoding?: BufferEncoding;
}

export class BackupService {
  private readonly backupRoot: string;
  private readonly maxBackupsPerTool: number;

  constructor(options: BackupServiceOptions = {}) {
    this.backupRoot =
      options.backupRoot ??
      process.env.MCP_CTRL_BACKUP_ROOT ??
      join(homedir(), ".mcp-ctrl", "backups");
    this.maxBackupsPerTool = options.maxBackupsPerTool ?? DEFAULT_MAX_BACKUPS;
  }

  async writeWithBackup(input: WriteWithBackupInput): Promise<{ backupPath?: string }> {
    await mkdir(dirname(input.targetPath), { recursive: true });

    let backupPath: string | undefined;

    if (await pathExists(input.targetPath)) {
      backupPath = await this.createBackup(input.tool, input.targetPath);
    }

    if (typeof input.content === "string") {
      await writeFile(input.targetPath, input.content, input.encoding ?? "utf8");
    } else {
      await writeFile(input.targetPath, input.content);
    }

    if (backupPath) {
      await this.pruneBackups(input.tool);
    }

    return backupPath ? { backupPath } : {};
  }

  async listBackups(tool: ToolName): Promise<BackupEntry[]> {
    const toolDir = this.getToolBackupDir(tool);

    if (!(await pathExists(toolDir))) {
      return [];
    }

    const entries = await readdir(toolDir, { withFileTypes: true });
    const backups = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const path = join(toolDir, entry.name);
          const metadata = await stat(path);

          return {
            tool,
            fileName: entry.name,
            path,
            size: metadata.size,
            createdAt: metadata.mtime,
          } satisfies BackupEntry;
        }),
    );

    return backups.sort(compareBackupsDesc);
  }

  private async createBackup(tool: ToolName, targetPath: string): Promise<string> {
    const toolDir = this.getToolBackupDir(tool);
    await mkdir(toolDir, { recursive: true });

    const backupPath = join(toolDir, createBackupFileName(targetPath));
    await copyFile(targetPath, backupPath);

    return backupPath;
  }

  private async pruneBackups(tool: ToolName): Promise<void> {
    const backups = await this.listBackups(tool);
    const overflow = backups.slice(this.maxBackupsPerTool);

    await Promise.all(overflow.map((backup) => rm(backup.path, { force: true })));
  }

  private getToolBackupDir(tool: ToolName): string {
    return join(this.backupRoot, tool);
  }
}

function createBackupFileName(targetPath: string): string {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
  const suffix = randomBytes(4).toString("hex");
  return `${timestamp}-${suffix}-${basename(targetPath)}.bak`;
}

function compareBackupsDesc(left: BackupEntry, right: BackupEntry): number {
  return (
    right.createdAt.getTime() - left.createdAt.getTime() ||
    right.fileName.localeCompare(left.fileName)
  );
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }

    throw error;
  }
}
