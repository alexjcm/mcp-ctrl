import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BackupService } from "../src/services/backup-service.js";

export async function makeTempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), `${prefix}-`));
}

export async function makeBackupService(prefix: string): Promise<BackupService> {
  const dir = await makeTempDir(prefix);
  return new BackupService({ backupRoot: join(dir, "backups") });
}
