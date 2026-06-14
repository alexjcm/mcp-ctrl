import { BackupService } from "../services/backup-service.js";
import { JsonMCPAdapter } from "./json-mcp-adapter.js";

export class CodeiumJetBrainsAdapter extends JsonMCPAdapter {
  constructor(backupService = new BackupService()) {
    super({
      backupService,
      tool: "codeium-jetbrains",
    });
  }
}
