import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CodeiumJetBrainsAdapter } from "../src/adapters/codeium-jetbrains-adapter.js";
import { DevinAdapter } from "../src/adapters/devin-adapter.js";
import { makeBackupService, makeTempDir } from "./test-helpers.js";

describe("JSON MCP hosts", () => {
  it("reads and writes Devin config while preserving extra fields", async () => {
    const dir = await makeTempDir("mcp-ctrl-devin");
    const path = join(dir, "mcp_config.json");

    await writeFile(
      path,
      JSON.stringify(
        {
          mcpServers: {
            local: {
              command: "npx",
              args: ["-y", "local-server"],
              disabled: true,
              env: { TOKEN: "abc" },
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const adapter = new DevinAdapter(await makeBackupService("mcp-ctrl-devin-service"));
    const state = await adapter.read(path);

    expect(state.servers).toEqual([
      {
        name: "local",
        command: "npx",
        args: ["-y", "local-server"],
        env: { TOKEN: "abc" },
      },
    ]);

    await adapter.write(state, [
      {
        name: "local",
        command: "node",
        args: ["server.mjs"],
        env: {},
      },
    ]);

    const output = JSON.parse(await readFile(path, "utf8")) as {
      mcpServers: Record<string, Record<string, unknown>>;
    };

    expect(output.mcpServers.local.command).toBe("node");
    expect(output.mcpServers.local.disabled).toBe(true);
  });

  it("reads and writes Codeium JetBrains config while preserving extra fields", async () => {
    const dir = await makeTempDir("mcp-ctrl-codeium");
    const path = join(dir, "mcp_config.json");

    await writeFile(
      path,
      JSON.stringify(
        {
          mcpServers: {
            remote: {
              headers: { API_KEY: "secret" },
              serverUrl: "https://example.com/mcp",
            },
            local: {
              command: "uvx",
              disabledTools: ["danger"],
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const adapter = new CodeiumJetBrainsAdapter(
      await makeBackupService("mcp-ctrl-codeium-service"),
    );
    const state = await adapter.read(path);

    expect(state.servers).toEqual([
      {
        name: "local",
        command: "uvx",
        args: [],
        env: {},
      },
    ]);
    expect(state.compatibility).toEqual([
      {
        name: "remote",
        portable: false,
        reasons: [
          "missing string command",
          "additional fields will not be synced: headers, serverUrl",
        ],
      },
      {
        name: "local",
        portable: true,
        reasons: ["additional fields will not be synced: disabledTools"],
      },
    ]);
  });
});
