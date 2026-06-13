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
