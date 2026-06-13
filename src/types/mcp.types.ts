export interface MCPServer {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

export type ToolName = "codex" | "antigravity" | "vscode";

export interface MCPConfig {
  tool: ToolName;
  servers: MCPServer[];
  rawPath: string;
}

export interface MCPServerCompatibility {
  name: string;
  portable: boolean;
  reasons: string[];
}

export interface MCPAdapterState<TDocument = unknown> extends MCPConfig {
  document: TDocument;
  compatibility: MCPServerCompatibility[];
}

export interface BackupEntry {
  tool: ToolName;
  fileName: string;
  path: string;
  size: number;
  createdAt: Date;
}

export interface ValidationIssue {
  code: string;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface MCPAdapter<TDocument = unknown> {
  readonly tool: ToolName;
  read(path?: string): Promise<MCPAdapterState<TDocument>>;
  write(
    state: MCPAdapterState<TDocument>,
    servers: MCPServer[],
  ): Promise<MCPAdapterState<TDocument>>;
}

export type SyncMode = "copy-new" | "overwrite";

export interface SyncConflict {
  name: string;
  source: MCPServer;
  destination: MCPServer;
}

export interface SyncSkippedServer {
  name: string;
  reasons: string[];
}

export interface SyncWarning {
  name: string;
  reasons: string[];
}

export interface SyncPlan {
  sourceTool: ToolName;
  destinationTool: ToolName;
  onlyInSource: MCPServer[];
  onlyInDestination: MCPServer[];
  conflicts: SyncConflict[];
  skipped: SyncSkippedServer[];
  warnings: SyncWarning[];
}

export interface SyncResult {
  plan: SyncPlan;
  appliedServers: MCPServer[];
}
