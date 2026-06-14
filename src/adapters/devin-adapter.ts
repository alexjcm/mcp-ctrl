import { BackupService } from "../services/backup-service.js";
import { JsonMCPAdapter } from "./json-mcp-adapter.js";

export class DevinAdapter extends JsonMCPAdapter {
  constructor(backupService = new BackupService()) {
    super({
      backupService,
      tool: "devin",
    });
  }
}
