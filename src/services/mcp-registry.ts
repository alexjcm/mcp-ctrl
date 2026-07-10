import { AntigravityAdapter } from "../adapters/antigravity-adapter.js";
import { ClaudeCodeAdapter } from "../adapters/claude-code-adapter.js";
import { CodeiumJetBrainsAdapter } from "../adapters/codeium-jetbrains-adapter.js";
import { CodexAdapter } from "../adapters/codex-adapter.js";
import { DevinAdapter } from "../adapters/devin-adapter.js";
import { VSCodeAdapter } from "../adapters/vscode-adapter.js";
import { ConfigValidator } from "./config-validator.js";
import type {
  MCPAdapter,
  MCPAdapterState,
  MCPConfig,
  MCPServer,
  ToolName,
} from "../types/mcp.types.js";

export interface MCPRegistryOptions {
  adapters?: Partial<Record<ToolName, MCPAdapter>>;
  paths?: Partial<Record<ToolName, string>>;
  validator?: ConfigValidator;
}

export class MCPRegistry {
  private readonly adapters: Record<ToolName, MCPAdapter>;
  private readonly paths: Partial<Record<ToolName, string>>;
  private readonly validator: ConfigValidator;

  constructor(options: MCPRegistryOptions = {}) {
    this.adapters = {
      codex: options.adapters?.codex ?? new CodexAdapter(),
      devin: options.adapters?.devin ?? new DevinAdapter(),
      "codeium-jetbrains":
        options.adapters?.["codeium-jetbrains"] ?? new CodeiumJetBrainsAdapter(),
      antigravity: options.adapters?.antigravity ?? new AntigravityAdapter(),
      "claude-code": options.adapters?.["claude-code"] ?? new ClaudeCodeAdapter(),
      vscode: options.adapters?.vscode ?? new VSCodeAdapter(),
    };
    this.paths = options.paths ?? {};
    this.validator = options.validator ?? new ConfigValidator();
  }

  async add(tool: ToolName, server: MCPServer): Promise<void> {
    await this.assertValidServer(server);

    const state = await this.readState(tool);
    if (state.servers.some((item) => item.name === server.name)) {
      throw new Error(`server "${server.name}" already exists in ${tool}`);
    }

    await this.adapters[tool].write(state, [...state.servers, cloneServer(server)]);
  }

  async remove(tool: ToolName, name: string): Promise<void> {
    const state = await this.readState(tool);
    const nextServers = state.servers.filter((server) => server.name !== name);

    if (nextServers.length === state.servers.length) {
      throw new Error(`server "${name}" was not found in ${tool}`);
    }

    await this.adapters[tool].write(state, nextServers);
  }

  async update(tool: ToolName, name: string, patch: Partial<MCPServer>): Promise<void> {
    const state = await this.readState(tool);
    const index = state.servers.findIndex((server) => server.name === name);

    if (index === -1) {
      throw new Error(`server "${name}" was not found in ${tool}`);
    }

    const current = state.servers[index];
    if (!current) {
      throw new Error(`server "${name}" was not found in ${tool}`);
    }
    const next = normalizeServerPatch(current, patch);

    if (
      next.name !== name &&
      state.servers.some((server, serverIndex) => serverIndex !== index && server.name === next.name)
    ) {
      throw new Error(`server "${next.name}" already exists in ${tool}`);
    }

    await this.assertValidServer(next);

    const nextServers = [...state.servers];
    nextServers[index] = next;
    await this.adapters[tool].write(state, nextServers);
  }

  async list(tool?: ToolName): Promise<MCPConfig[]> {
    if (tool) {
      const state = await this.readState(tool);
      return [toConfig(state)];
    }

    const tools: ToolName[] = [
      "codex",
      "devin",
      "codeium-jetbrains",
      "antigravity",
      "claude-code",
      "vscode",
    ];
    const states = await Promise.all(tools.map((item) => this.readState(item)));

    return states.map((state) => toConfig(state));
  }

  async readState(tool: ToolName): Promise<MCPAdapterState> {
    return this.adapters[tool].read(this.paths[tool]);
  }

  async writeState(tool: ToolName, state: MCPAdapterState, servers: MCPServer[]): Promise<void> {
    await this.assertValidServers(servers);
    await this.adapters[tool].write(state, servers.map(cloneServer));
  }

  private async assertValidServer(server: MCPServer): Promise<void> {
    const result = await this.validator.validateServer(server);

    if (!result.valid) {
      throw new Error(result.errors.map((issue) => issue.message).join("; "));
    }
  }

  private async assertValidServers(servers: MCPServer[]): Promise<void> {
    const result = await this.validator.validateServers(servers);

    if (!result.valid) {
      throw new Error(result.errors.map((issue) => issue.message).join("; "));
    }
  }
}

function toConfig(state: MCPAdapterState): MCPConfig {
  return {
    tool: state.tool,
    servers: state.servers.map(cloneServer),
    rawPath: state.rawPath,
  };
}

function cloneServer(server: MCPServer): MCPServer {
  return {
    name: server.name,
    command: server.command,
    args: [...server.args],
    env: { ...server.env },
  };
}

function normalizeServerPatch(current: MCPServer, patch: Partial<MCPServer>): MCPServer {
  return {
    name: patch.name ?? current.name,
    command: patch.command ?? current.command,
    args: patch.args ?? current.args,
    env: patch.env ?? current.env,
  };
}
