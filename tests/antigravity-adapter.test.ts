import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { AntigravityAdapter } from "../src/adapters/antigravity-adapter.js";
import { makeTempDir } from "./test-helpers.js";

describe("AntigravityAdapter", () => {
  it("reads portable servers and preserves non-portable entries on write", async () => {
    const dir = await makeTempDir("mcp-ctrl-gemini");
    const path = join(dir, "mcp_config.json");

    await writeFile(
      path,
      JSON.stringify(
        {
          mcpServers: {
            local: {
              command: "npx",
              args: ["-y", "local-server"],
              env: { TOKEN: "abc" },
              disabledTools: ["danger"],
            },
            remote: {
              url: "https://example.com/mcp",
            },
          },
          telemetry: {
            enabled: false,
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const adapter = new AntigravityAdapter();
    const state = await adapter.read(path);

    expect(state.servers).toEqual([
      {
        name: "local",
        command: "npx",
        args: ["-y", "local-server"],
        env: { TOKEN: "abc" },
      },
    ]);
    expect(state.compatibility).toEqual([
      {
        name: "local",
        portable: true,
        reasons: ["additional fields will not be synced: disabledTools"],
      },
      {
        name: "remote",
        portable: false,
        reasons: [
          "missing string command",
          "additional fields will not be synced: url",
        ],
      },
    ]);

    await adapter.write(state, [
      {
        name: "beta",
        command: "node",
        args: ["server.mjs"],
        env: {},
      },
    ]);

    const output = JSON.parse(await readFile(path, "utf8")) as {
      mcpServers: Record<string, Record<string, unknown>>;
      telemetry: { enabled: boolean };
    };

    expect(output.telemetry.enabled).toBe(false);
    expect(output.mcpServers.local).toBeUndefined();
    expect(output.mcpServers.remote.url).toBe("https://example.com/mcp");
    expect(output.mcpServers.beta.command).toBe("node");
    expect(output.mcpServers.beta.args).toEqual(["server.mjs"]);
  });

  it("creates the folder tree on first write", async () => {
    const dir = await makeTempDir("mcp-ctrl-gemini-create");
    const path = join(dir, "nested", "config", "mcp_config.json");

    const adapter = new AntigravityAdapter();
    const state = await adapter.read(path);
    await adapter.write(state, [
      {
        name: "local",
        command: "npx",
        args: ["-y", "server"],
        env: {},
      },
    ]);

    const output = JSON.parse(await readFile(path, "utf8")) as {
      mcpServers: Record<string, Record<string, unknown>>;
    };

    expect(output.mcpServers.local.command).toBe("npx");
  });
});
