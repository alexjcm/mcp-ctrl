import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { BackupService } from "../src/services/backup-service.js";
import { makeTempDir } from "./test-helpers.js";

describe("BackupService", () => {
  it("creates exact backups and enforces retention per tool", async () => {
    const dir = await makeTempDir("mcp-ctrl-backups");
    const targetPath = join(dir, "config.toml");
    const backupRoot = join(dir, "backup-root");
    const service = new BackupService({ backupRoot, maxBackupsPerTool: 2 });

    await writeFile(targetPath, "v0\n", "utf8");

    for (const value of ["v1\n", "v2\n", "v3\n"]) {
      await service.writeWithBackup({
        tool: "codex",
        targetPath,
        content: value,
      });
      await delay(5);
    }

    const backups = await service.listBackups("codex");
    const backupContents = await Promise.all(backups.map((backup) => readFile(backup.path, "utf8")));

    expect(await readFile(targetPath, "utf8")).toBe("v3\n");
    expect(backups).toHaveLength(2);
    expect(backupContents).toEqual(expect.arrayContaining(["v1\n", "v2\n"]));
    expect(backupContents).not.toContain("v0\n");
  });
});

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
