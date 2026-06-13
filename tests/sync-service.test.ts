import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { parse as parseJsonc } from "jsonc-parser";
import * as TOML from "@iarna/toml";
import { describe, expect, it } from "vitest";

import { CodexAdapter } from "../src/adapters/codex-adapter.js";
import { VSCodeAdapter } from "../src/adapters/vscode-adapter.js";
import { MCPRegistry } from "../src/services/mcp-registry.js";
import { SyncService } from "../src/services/sync-service.js";
import { makeBackupService, makeTempDir } from "./test-helpers.js";

describe("SyncService", () => {
  it("builds a conservative plan and copy-new skips conflicts", async () => {
    const dir = await makeTempDir("mcp-ctrl-sync-copy-new");
    const codexPath = join(dir, "codex.toml");
    const vscodePath = join(dir, "settings.json");

    await writeFile(
      codexPath,
      [
        '[mcp_servers.filesystem]',
        'command = "npx"',
        'args = ["-y", "@modelcontextprotocol/server-filesystem"]',
        'disabled_tools = ["danger"]',
        "",
        "[mcp_servers.filesystem.env]",
        'ROOT = "/tmp"',
        "",
        '[mcp_servers.github]',
        'command = "npx"',
        'args = ["-y", "@modelcontextprotocol/server-github"]',
        "",
        '[mcp_servers.remote]',
        'url = "https://example.com/mcp"',
        "",
      ].join("\n"),
      "utf8",
    );

    await writeFile(
      vscodePath,
      [
        "{",
        '    "mcp.servers": {',
        '        "filesystem": {',
        '            "command": "uvx",',
        '            "args": ["different-server"]',
        "        },",
        '        "slack": {',
        '            "command": "npx",',
        '            "args": ["-y", "@modelcontextprotocol/server-slack"]',
        "        }",
        "    }",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );

    const registry = new MCPRegistry({
      adapters: {
        codex: new CodexAdapter(await makeBackupService("mcp-ctrl-sync-copy-codex")),
        vscode: new VSCodeAdapter(await makeBackupService("mcp-ctrl-sync-copy-vscode")),
      },
      paths: {
        codex: codexPath,
        vscode: vscodePath,
      },
    });
    const service = new SyncService({ registry });

    const plan = await service.createPlan("codex", "vscode");
    await service.apply("codex", "vscode", "copy-new");

    const output = parseJsonc(await readFile(vscodePath, "utf8")) as {
      "mcp.servers": Record<string, Record<string, unknown>>;
    };

    expect(plan.onlyInSource.map((server) => server.name)).toEqual(["github"]);
    expect(plan.onlyInDestination.map((server) => server.name)).toEqual(["slack"]);
    expect(plan.conflicts.map((conflict) => conflict.name)).toEqual(["filesystem"]);
    expect(plan.skipped).toEqual([
      {
        name: "remote",
        reasons: [
          "missing string command",
          "additional fields will not be synced: url",
        ],
      },
    ]);
    expect(plan.warnings).toEqual([
      {
        name: "filesystem",
        reasons: ["additional fields will not be synced: disabled_tools"],
      },
    ]);
    expect(output["mcp.servers"].filesystem.command).toBe("uvx");
    expect(output["mcp.servers"].github.command).toBe("npx");
    expect(output["mcp.servers"].slack.command).toBe("npx");
  });

  it("overwrite replaces conflicts with the source server", async () => {
    const dir = await makeTempDir("mcp-ctrl-sync-overwrite");
    const codexPath = join(dir, "codex.toml");
    const vscodePath = join(dir, "settings.json");

    await writeFile(
      codexPath,
      [
        '[mcp_servers.filesystem]',
        'command = "npx"',
        'args = ["-y", "@modelcontextprotocol/server-filesystem"]',
        "",
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      vscodePath,
      [
        "{",
        '    "mcp.servers": {',
        '        "filesystem": {',
        '            "command": "uvx",',
        '            "args": ["different-server"]',
        "        }",
        "    }",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );

    const registry = new MCPRegistry({
      adapters: {
        codex: new CodexAdapter(await makeBackupService("mcp-ctrl-sync-overwrite-codex")),
        vscode: new VSCodeAdapter(await makeBackupService("mcp-ctrl-sync-overwrite-vscode")),
      },
      paths: {
        codex: codexPath,
        vscode: vscodePath,
      },
    });
    const service = new SyncService({ registry });

    await service.apply("codex", "vscode", "overwrite");

    const output = parseJsonc(await readFile(vscodePath, "utf8")) as {
      "mcp.servers": Record<string, Record<string, unknown>>;
    };

    expect(output["mcp.servers"].filesystem.command).toBe("npx");
    expect(output["mcp.servers"].filesystem.args).toEqual([
      "-y",
      "@modelcontextprotocol/server-filesystem",
    ]);
  });
});
