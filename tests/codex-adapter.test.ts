import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import * as TOML from "@iarna/toml";
import { describe, expect, it } from "vitest";

import { CodexAdapter } from "../src/adapters/codex-adapter.js";
import { makeBackupService, makeTempDir } from "./test-helpers.js";

describe("CodexAdapter", () => {
  it("reads portable servers and preserves non-portable entries on write", async () => {
    const dir = await makeTempDir("mcp-ctrl-codex");
    const path = join(dir, "config.toml");

    await writeFile(
      path,
      [
        'model = "gpt-5.4"',
        "",
        '[mcp_servers.local]',
        'command = "npx"',
        'args = ["-y", "local-server"]',
        'disabled_tools = ["danger"]',
        "",
        "[mcp_servers.local.env]",
        'TOKEN = "abc"',
        "",
        "[mcp_servers.remote]",
        'url = "https://example.com/mcp"',
        "",
      ].join("\n"),
      "utf8",
    );

    const adapter = new CodexAdapter(await makeBackupService("mcp-ctrl-codex-service"));
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
        reasons: ["additional fields will not be synced: disabled_tools"],
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
        name: "local",
        command: "node",
        args: ["server.mjs"],
        env: {},
      },
      {
        name: "beta",
        command: "uvx",
        args: ["beta-mcp"],
        env: { PATH: "/tmp/bin" },
      },
    ]);

    const output = TOML.parse(await readFile(path, "utf8")) as Record<string, unknown>;
    const servers = output.mcp_servers as Record<string, Record<string, unknown>>;

    expect(output.model).toBe("gpt-5.4");
    expect(servers.remote.url).toBe("https://example.com/mcp");
    expect(servers.local.command).toBe("node");
    expect(servers.local.disabled_tools).toEqual(["danger"]);
    expect(servers.local.env).toBeUndefined();
    expect(servers.beta.args).toEqual(["beta-mcp"]);
    expect(servers.beta.env).toEqual({ PATH: "/tmp/bin" });
  });

  it("returns an empty state when the file does not exist", async () => {
    const dir = await makeTempDir("mcp-ctrl-codex-missing");
    const path = join(dir, "missing.toml");

    const adapter = new CodexAdapter(await makeBackupService("mcp-ctrl-codex-missing-service"));
    const state = await adapter.read(path);

    expect(state.servers).toEqual([]);
    expect(state.compatibility).toEqual([]);
    expect(state.document).toEqual({});
  });
});
