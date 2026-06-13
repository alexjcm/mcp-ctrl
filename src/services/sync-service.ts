import { MCPRegistry } from "./mcp-registry.js";
import type {
  MCPServer,
  SyncConflict,
  SyncMode,
  SyncPlan,
  SyncResult,
  ToolName,
} from "../types/mcp.types.js";

export interface SyncServiceOptions {
  registry?: MCPRegistry;
}

export class SyncService {
  private readonly registry: MCPRegistry;

  constructor(options: SyncServiceOptions = {}) {
    this.registry = options.registry ?? new MCPRegistry();
  }

  async createPlan(sourceTool: ToolName, destinationTool: ToolName): Promise<SyncPlan> {
    const sourceState = await this.registry.readState(sourceTool);
    const destinationState = await this.registry.readState(destinationTool);

    const destinationByName = new Map(destinationState.servers.map((server) => [server.name, server]));
    const sourceByName = new Map(sourceState.servers.map((server) => [server.name, server]));

    const onlyInSource: MCPServer[] = [];
    const conflicts: SyncConflict[] = [];

    for (const server of sourceState.servers) {
      const destinationServer = destinationByName.get(server.name);

      if (!destinationServer) {
        onlyInSource.push(cloneServer(server));
        continue;
      }

      if (!areServersEquivalent(server, destinationServer)) {
        conflicts.push({
          name: server.name,
          source: cloneServer(server),
          destination: cloneServer(destinationServer),
        });
      }
    }

    const onlyInDestination = destinationState.servers
      .filter((server) => !sourceByName.has(server.name))
      .map(cloneServer);

    const skipped = sourceState.compatibility
      .filter((item) => !item.portable)
      .map((item) => ({
        name: item.name,
        reasons: [...item.reasons],
      }));

    const warnings = sourceState.compatibility
      .filter((item) => item.portable && item.reasons.length > 0)
      .map((item) => ({
        name: item.name,
        reasons: [...item.reasons],
      }));

    return {
      sourceTool,
      destinationTool,
      onlyInSource,
      onlyInDestination,
      conflicts,
      skipped,
      warnings,
    };
  }

  async apply(
    sourceTool: ToolName,
    destinationTool: ToolName,
    mode: SyncMode,
  ): Promise<SyncResult> {
    const plan = await this.createPlan(sourceTool, destinationTool);
    const destinationState = await this.registry.readState(destinationTool);
    let nextServers = destinationState.servers.map(cloneServer);

    for (const server of plan.onlyInSource) {
      nextServers.push(cloneServer(server));
    }

    if (mode === "overwrite") {
      for (const conflict of plan.conflicts) {
        nextServers = nextServers.map((server) =>
          server.name === conflict.name ? cloneServer(conflict.source) : server,
        );
      }
    }

    await this.registry.writeState(destinationTool, destinationState, nextServers);

    return {
      plan,
      appliedServers: nextServers,
    };
  }
}

function areServersEquivalent(left: MCPServer, right: MCPServer): boolean {
  return (
    left.name === right.name &&
    left.command === right.command &&
    arraysEqual(left.args, right.args) &&
    recordsEqual(left.env, right.env)
  );
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function recordsEqual(left: Record<string, string>, right: Record<string, string>): boolean {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();

  return (
    arraysEqual(leftKeys, rightKeys) &&
    leftKeys.every((key) => left[key] === right[key])
  );
}

function cloneServer(server: MCPServer): MCPServer {
  return {
    name: server.name,
    command: server.command,
    args: [...server.args],
    env: { ...server.env },
  };
}
