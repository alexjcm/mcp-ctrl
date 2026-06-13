import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { parse } from "jsonc-parser";
import { describe, expect, it } from "vitest";

import { VSCodeAdapter } from "../src/adapters/vscode-adapter.js";
import { makeBackupService, makeTempDir } from "./test-helpers.js";

describe("VSCodeAdapter", () => {
  it("preserves comments and non-MCP settings while updating mcp.servers", async () => {
    const dir = await makeTempDir("mcp-ctrl-vscode");
    const path = join(dir, "settings.json");

    await writeFile(
      path,
      [
        "{",
        '    // keep this comment',
        '    "editor.minimap.enabled": false,',
        '    "mcp.servers": {',
        '        "local": {',
        '            "command": "npx",',
        '            "args": ["-y", "local-server"],',
        '            "env": {',
        '                "TOKEN": "abc"',
        "            },",
        '            "disabledTools": ["danger"]',
        "        },",
        '        "remote": {',
        '            "url": "https://example.com/mcp"',
        "        }",
        "    }",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );

    const adapter = new VSCodeAdapter(await makeBackupService("mcp-ctrl-vscode-service"));
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

    const outputText = await readFile(path, "utf8");
    const output = parse(outputText) as {
      "editor.minimap.enabled": boolean;
      "mcp.servers": Record<string, Record<string, unknown>>;
    };

    expect(outputText).toContain("// keep this comment");
    expect(output["editor.minimap.enabled"]).toBe(false);
    expect(output["mcp.servers"].remote.url).toBe("https://example.com/mcp");
    expect(output["mcp.servers"].local.command).toBe("node");
    expect(output["mcp.servers"].local.disabledTools).toEqual(["danger"]);
    expect(output["mcp.servers"].beta.args).toEqual(["beta-mcp"]);
  });

  it("returns an empty state when settings.json does not exist", async () => {
    const dir = await makeTempDir("mcp-ctrl-vscode-missing");
    const path = join(dir, "settings.json");

    const adapter = new VSCodeAdapter(await makeBackupService("mcp-ctrl-vscode-missing-service"));
    const state = await adapter.read(path);

    expect(state.servers).toEqual([]);
    expect(state.compatibility).toEqual([]);
    expect(state.document).toBe("{}\n");
  });
});
